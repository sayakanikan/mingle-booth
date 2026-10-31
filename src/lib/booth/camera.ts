let currentStream: MediaStream | null = null;

export async function getCameraDevices(): Promise<MediaDeviceInfo[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) return [];
  try {
    const temp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    temp.getTracks().forEach(t => t.stop());
  } catch {
    // Ignore error if permission already handled
  }

  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter(d => d.kind === 'videoinput');
}

export function getDeviceLabel(device: MediaDeviceInfo, index: number): string {
  const raw = device.label || `Camera ${index + 1}`;
  const lower = raw.toLowerCase();

  if (lower.includes('sony') || lower.includes('ilce'))
    return `📸 ${raw}  [Sony Mirrorless]`;
  if (lower.includes('obs') || lower.includes('virtual'))
    return `🎬 ${raw}  [Virtual / OBS]`;
  if (lower.includes('usb video') || lower.includes('capture') || lower.includes('hdmi') || lower.includes('elgato') || lower.includes('magewell') || lower.includes('cam link') || lower.includes('4k capture'))
    return `📡 ${raw}  [Capture Card]`;
  if (lower.includes('integrated') || lower.includes('facetime') || lower.includes('built-in'))
    return `💻 ${raw}  [Built-in]`;

  return `📷 ${raw}`;
}

function parseResolution(res: string): { width: number; height: number } {
  const [w, h] = (res || '1920x1080').split('x').map(Number);
  return { width: w || 1920, height: h || 1080 };
}

export async function startCamera(deviceId: string | null, resolution: string): Promise<MediaStream> {
  stopCamera();

  const { width, height } = parseResolution(resolution);
  const errors: string[] = [];

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
      return currentStream;
    } catch (e: unknown) {
      errors.push(`Exact + Resolution: ${(e as Error).message}`);
    }

    try {
      currentStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
      return currentStream;
    } catch (e: unknown) {
      errors.push(`Exact: ${(e as Error).message}`);
    }

    try {
      currentStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { ideal: deviceId } },
        audio: false,
      });
      return currentStream;
    } catch (e: unknown) {
      errors.push(`Ideal: ${(e as Error).message}`);
    }
  }

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width:  { ideal: width },
        height: { ideal: height },
      },
      audio: false,
    });
    return currentStream;
  } catch (e: unknown) {
    errors.push(`Any Camera: ${(e as Error).message}`);
  }

  throw new Error('Camera access failed:\n' + errors.join('\n'));
}

export function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
    currentStream = null;
  }
}

export function captureFrame(video: HTMLVideoElement, mirror = true): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width  = video.videoWidth  || 1920;
  canvas.height = video.videoHeight || 1080;
  const ctx = canvas.getContext('2d')!;

  if (mirror) {
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  if (mirror) ctx.restore();

  return canvas;
}
