/**
 * composite.js — Frame-driven photo strip compositor
 *
 * The frame PNG defines the strip layout.
 * Transparent holes in the frame = photo slots.
 * The strip canvas matches the frame PNG dimensions exactly (1:1 px).
 */

/**
 * Compose a photo strip using a frame PNG with admin-defined slots.
 *
 * Process:
 *   1. Create canvas at exact frame dimensions
 *   2. Fill background colour
 *   3. Draw each photo into its slot using cover-fit crop
 *   4. Overlay the frame PNG (opaque parts mask everything outside slots)
 *   5. Optionally draw branding text at the bottom
 *
 * @param {HTMLCanvasElement[]} photos - captured canvases ordered by slot_index (photos[0] → slot 0)
 * @param {Object}  opts
 * @param {string}  opts.frameDataUrl  - PNG frame as data URL
 * @param {number}  opts.frameWidth    - native frame width in px
 * @param {number}  opts.frameHeight   - native frame height in px
 * @param {Array}   opts.slots         - [{slot_index, x, y, w, h}] as defined in slot editor
 * @param {string}  opts.bgColor       - strip background colour (shows behind photos)
 * @param {string}  opts.textColor     - branding text colour
 * @param {boolean} opts.showTitle     - overlay event title at bottom
 * @param {string}  opts.eventTitle    - event title text
 * @param {boolean} opts.showDate      - overlay date at bottom
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function composeStripFromFrame(photos, opts = {}) {
  const {
    frameDataUrl,
    frameWidth,
    frameHeight,
    slots      = [],
    bgColor    = '#1a1a28',
    textColor  = '#ffffff',
    showTitle  = true,
    eventTitle = 'Mingle Booth',
    showDate   = true,
  } = opts;

  const canvas = document.createElement('canvas');
  canvas.width  = frameWidth;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d');

  /* ── 1. Background ──────────────────────────────────────────── */
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, frameWidth, frameHeight);

  /* ── 2. Draw photos into their slots (cover-fit) ────────────── */
  const sorted = [...slots].sort((a, b) => a.slot_index - b.slot_index);

  for (let i = 0; i < sorted.length; i++) {
    const slot  = sorted[i];
    const photo = photos[i];
    if (!photo) continue;

    // Clip to slot rectangle
    ctx.save();
    ctx.beginPath();
    ctx.rect(slot.x, slot.y, slot.w, slot.h);
    ctx.clip();

    // Cover-fit: scale photo so it fills slot without gaps
    const pAspect = photo.width  / photo.height;
    const sAspect = slot.w / slot.h;
    let sx = 0, sy = 0, sw = photo.width, sh = photo.height;

    if (pAspect > sAspect) {
      // Photo is wider — crop left & right
      sw = photo.height * sAspect;
      sx = (photo.width - sw) / 2;
    } else {
      // Photo is taller — crop top & bottom
      sh = photo.width / sAspect;
      sy = (photo.height - sh) / 2;
    }

    ctx.drawImage(photo, sx, sy, sw, sh, slot.x, slot.y, slot.w, slot.h);

    // Subtle vignette on each photo
    const vg = ctx.createRadialGradient(
      slot.x + slot.w / 2, slot.y + slot.h / 2, Math.min(slot.w, slot.h) * 0.3,
      slot.x + slot.w / 2, slot.y + slot.h / 2, Math.max(slot.w, slot.h) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = vg;
    ctx.fillRect(slot.x, slot.y, slot.w, slot.h);

    ctx.restore();
  }

  /* ── 3. Overlay frame PNG (masks everything outside slots) ───── */
  if (frameDataUrl) {
    await new Promise((resolve, reject) => {
      const fi = new Image();
      fi.onload  = () => { ctx.drawImage(fi, 0, 0, frameWidth, frameHeight); resolve(); };
      fi.onerror = reject;
      fi.src = frameDataUrl;
    });
  }

  /* ── 4. Optional branding text at bottom of canvas ───────────── */
  if (showTitle || showDate) {
    const BAR_H  = Math.max(50, Math.round(frameHeight * (showTitle && showDate ? 0.045 : 0.03)));
    const textY  = frameHeight - BAR_H;

    // Semi-transparent bar
    ctx.fillStyle   = bgColor;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(0, textY, frameWidth, BAR_H);
    ctx.globalAlpha = 1;

    // Gradient separator
    const sep = ctx.createLinearGradient(0, textY, frameWidth, textY);
    sep.addColorStop(0,   'rgba(192,132,252,0)');
    sep.addColorStop(0.5, 'rgba(192,132,252,0.6)');
    sep.addColorStop(1,   'rgba(192,132,252,0)');
    ctx.strokeStyle = sep;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(0, textY + 1); ctx.lineTo(frameWidth, textY + 1);
    ctx.stroke();

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    if (showTitle && showDate) {
      ctx.fillStyle = textColor;
      ctx.font = `bold ${Math.round(frameWidth * 0.038)}px 'Outfit',sans-serif`;
      ctx.fillText(eventTitle, frameWidth / 2, textY + BAR_H * 0.36);

      const dateStr = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
      ctx.fillStyle  = 'rgba(255,255,255,0.7)';
      ctx.font = `${Math.round(frameWidth * 0.024)}px 'Outfit',sans-serif`;
      ctx.fillText(dateStr, frameWidth / 2, textY + BAR_H * 0.72);
    } else if (showTitle) {
      ctx.fillStyle = textColor;
      ctx.font = `bold ${Math.round(frameWidth * 0.04)}px 'Outfit',sans-serif`;
      ctx.fillText(eventTitle, frameWidth / 2, textY + BAR_H * 0.5);
    } else if (showDate) {
      const dateStr = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
      ctx.fillStyle  = 'rgba(255,255,255,0.85)';
      ctx.font = `${Math.round(frameWidth * 0.028)}px 'Outfit',sans-serif`;
      ctx.fillText(dateStr, frameWidth / 2, textY + BAR_H * 0.5);
    }
  }

  return canvas;
}

/**
 * Convert canvas to a JPEG data URL.
 * @param {HTMLCanvasElement} canvas
 * @param {number} [quality=0.92]
 * @returns {string}
 */
export function canvasToDataUrl(canvas, quality = 0.92) {
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Trigger a browser download of a data URL.
 * @param {string} dataUrl
 * @param {string} filename
 */
export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href     = dataUrl;
  a.download = filename;
  a.click();
}
