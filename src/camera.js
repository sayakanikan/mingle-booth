/**
 * camera.js — Camera stream management
 * Supports webcams, HDMI capture cards (Sony A6400, etc.), and virtual cameras.
 *
 * HOW CAPTURE CARDS WORK IN BROWSERS
 * ─────────────────────────────────────
 * An HDMI-to-USB capture card (e.g. Elgato, Magewell, generic UVC) registers
 * itself as a standard USB Video Class (UVC) device.  The browser sees it as a
 * normal video input — the same API as a webcam.
 *
 * REQUIREMENTS FOR ACCESS:
 *  1. The page must be served over HTTPS *or* localhost.
 *     → localhost:3000  ✓   ngrok https://...  ✓   plain http:// over LAN  ✗
 *  2. The user/browser must grant camera permission.
 *  3. No other app (OBS, Teams, Zoom) may hold an exclusive lock on the device.
 *     → Close OBS / disable OBS Virtual Camera before testing the direct feed.
 *  4. The correct deviceId must be selected in Admin → Camera.
 *
 * TROUBLESHOOTING:
 *  • If you see only "OBS Virtual Camera" and not the capture card itself,
 *    close OBS completely and refresh.
 *  • If the device list is empty, click "Allow" on the browser permission prompt.
 *  • On Chrome: chrome://settings/content/camera to verify site permission.
 *  • The capture card usually appears labelled "USB Video" or the brand name.
 */

let currentStream = null;

/* ----------------------------------------------------------------
   Device enumeration
   ---------------------------------------------------------------- */

/**
 * Get all available video input devices.
 * Triggers a temporary permission request so device labels are revealed.
 *
 * @returns {Promise<MediaDeviceInfo[]>}
 */
export async function getCameraDevices() {
  // First: trigger permission so labels are populated
  try {
    const temp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    temp.getTracks().forEach(t => t.stop());
  } catch (e) {
    // Ignore — device might not exist on this machine
  }

  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter(d => d.kind === 'videoinput');
}

/**
 * Returns a friendly display name for a device, annotated with type hints.
 * Useful for the Admin camera picker.
 */
export function getDeviceLabel(device, index) {
  const raw = device.label || `Camera ${index + 1}`;
  const lower = raw.toLowerCase();

  if (lower.includes('obs') || lower.includes('virtual'))
    return `🎬 ${raw}  [Virtual / OBS]`;
  if (lower.includes('usb video') || lower.includes('capture') || lower.includes('hdmi') || lower.includes('elgato') || lower.includes('magewell') || lower.includes('cam link') || lower.includes('4k capture'))
    return `📡 ${raw}  [Capture Card]`;
  if (lower.includes('integrated') || lower.includes('facetime') || lower.includes('built-in'))
    return `💻 ${raw}  [Built-in]`;

  return `📷 ${raw}`;
}

/* ----------------------------------------------------------------
   Stream management
   ---------------------------------------------------------------- */

/**
 * Parse resolution string "WxH" → { width, height }
 */
function parseResolution(res) {
  const [w, h] = (res || '1920x1080').split('x').map(Number);
  return { width: w || 1920, height: h || 1080 };
}

/**
 * Start a camera stream with progressive constraint fallback.
 *
 * Strategy:
 *  1. Try exact deviceId + ideal resolution + 30fps
 *  2. Try exact deviceId only (let browser pick resolution)
 *  3. Try with deviceId as "ideal" instead of "exact" (more compatible)
 *  4. Fall back to any available camera
 *
 * @param {string|null} deviceId
 * @param {string} resolution  e.g. "1920x1080"
 * @returns {Promise<MediaStream>}
 */
export async function startCamera(deviceId, resolution) {
  stopCamera();

  const { width, height } = parseResolution(resolution);
  const errors = [];

  // Attempt 1: exact device + ideal resolution
  if (deviceId) {
    try {
      currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width:    { ideal: width },
          height:   { ideal: height },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      console.info('[Camera] Connected (attempt 1):', getStreamInfo(currentStream));
      return currentStream;
    } catch (e) {
      errors.push(`Attempt 1 (exact+resolution): ${e.message}`);
    }

    // Attempt 2: exact device, no resolution constraint
    try {
      currentStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
      console.info('[Camera] Connected (attempt 2):', getStreamInfo(currentStream));
      return currentStream;
    } catch (e) {
      errors.push(`Attempt 2 (exact only): ${e.message}`);
    }

    // Attempt 3: ideal device (less strict — some capture cards need this)
    try {
      currentStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { ideal: deviceId } },
        audio: false,
      });
      console.info('[Camera] Connected (attempt 3 – ideal):', getStreamInfo(currentStream));
      return currentStream;
    } catch (e) {
      errors.push(`Attempt 3 (ideal deviceId): ${e.message}`);
    }
  }

  // Attempt 4: any camera (ignore deviceId)
  try {
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width:  { ideal: width },
        height: { ideal: height },
      },
      audio: false,
    });
    console.info('[Camera] Connected (attempt 4 – any device):', getStreamInfo(currentStream));
    console.warn('[Camera] Fallback used. Errors from earlier attempts:', errors);
    return currentStream;
  } catch (e) {
    errors.push(`Attempt 4 (any camera): ${e.message}`);
  }

  // All failed
  const msg = [
    'Could not access any camera.',
    'Check that:',
    '  • The page is served from localhost or HTTPS (not plain http://)',
    '  • The browser has camera permission (click Allow)',
    '  • No other app is locking the capture card (close OBS, Teams, etc.)',
    '  • The correct device is selected in Admin → Camera',
    '',
    'Errors: ' + errors.join(' | '),
  ].join('\n');

  throw new Error(msg);
}

/** Stop all tracks on the current stream */
export function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
    currentStream = null;
  }
}

/* ----------------------------------------------------------------
   Frame capture
   ---------------------------------------------------------------- */

/**
 * Capture a still frame from a <video> element into a canvas.
 * @param {HTMLVideoElement} video
 * @param {boolean} mirror  - flip horizontally (default: true for webcam selfie mode)
 * @returns {HTMLCanvasElement}
 */
export function captureFrame(video, mirror = true) {
  const canvas = document.createElement('canvas');
  canvas.width  = video.videoWidth  || 1920;
  canvas.height = video.videoHeight || 1080;
  const ctx = canvas.getContext('2d');

  if (mirror) {
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  if (mirror) ctx.restore();

  return canvas;
}

/* ----------------------------------------------------------------
   Helpers
   ---------------------------------------------------------------- */

function getStreamInfo(stream) {
  const track = stream.getVideoTracks()[0];
  if (!track) return 'no video track';
  const s = track.getSettings();
  return `"${track.label}" @ ${s.width}×${s.height} ${s.frameRate?.toFixed(0)}fps`;
}
