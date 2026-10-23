/**
 * gifmaker.js — Animated GIF generation using gif.js
 * Uses the npm gif.js package (Worker-based encoder)
 */

/**
 * Build an animated GIF from an array of photo canvases
 * @param {HTMLCanvasElement[]} photos
 * @param {Object} opts
 * @param {number} opts.width   - output GIF width
 * @param {number} opts.height  - output GIF height
 * @param {number} opts.delay   - ms per frame (default 600)
 * @param {number} opts.quality - gif.js quality 1-30 (lower = better, default 8)
 * @returns {Promise<{ dataUrl: string, blob: Blob }>}
 */
export async function buildGif(photos, opts = {}) {
  const {
    width   = 480,
    height  = 360,
    delay   = 700,
    quality = 8,
  } = opts;

  // Dynamically import gif.js
  const { default: GIF } = await import('gif.js');

  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality,
      width,
      height,
      workerScript: '/gif.worker.js',
    });

    for (const photo of photos) {
      // Scale each photo down to GIF dimensions
      const scaled = document.createElement('canvas');
      scaled.width  = width;
      scaled.height = height;
      const ctx = scaled.getContext('2d');

      // cover-fit
      const photoAspect = photo.width / photo.height;
      const gifAspect   = width / height;
      let sx = 0, sy = 0, sw = photo.width, sh = photo.height;
      if (photoAspect > gifAspect) {
        sw = photo.height * gifAspect;
        sx = (photo.width - sw) / 2;
      } else {
        sh = photo.width / gifAspect;
        sy = (photo.height - sh) / 2;
      }
      ctx.drawImage(photo, sx, sy, sw, sh, 0, 0, width, height);

      gif.addFrame(scaled, { delay, copy: true });
    }

    // Add a pause frame (repeat last photo longer)
    const lastScaled = document.createElement('canvas');
    lastScaled.width  = width;
    lastScaled.height = height;
    const lctx = lastScaled.getContext('2d');
    const last = photos[photos.length - 1];
    const photoAspect = last.width / last.height;
    const gifAspect   = width / height;
    let sx = 0, sy = 0, sw = last.width, sh = last.height;
    if (photoAspect > gifAspect) {
      sw = last.height * gifAspect;
      sx = (last.width - sw) / 2;
    } else {
      sh = last.width / gifAspect;
      sy = (last.height - sh) / 2;
    }
    lctx.drawImage(last, sx, sy, sw, sh, 0, 0, width, height);
    gif.addFrame(lastScaled, { delay: delay * 3, copy: true });

    gif.on('finished', (blob) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: reader.result, blob });
      reader.readAsDataURL(blob);
    });

    gif.on('error', reject);
    gif.render();
  });
}

/**
 * Fallback: build a simple GIF-like preview using a CSS-animated image element
 * (used when gif.js fails or worker is unavailable)
 */
export function buildAnimatedPreviewEl(photos, delayMs = 700) {
  const container = document.createElement('div');
  container.style.cssText = 'position:relative;display:inline-block;';

  const imgs = photos.map((canvas, i) => {
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/jpeg', 0.85);
    img.style.cssText = `display:${i===0?'block':'none'};max-height:35vh;width:auto;border-radius:12px;`;
    container.appendChild(img);
    return img;
  });

  let current = 0;
  setInterval(() => {
    imgs[current].style.display = 'none';
    current = (current + 1) % imgs.length;
    imgs[current].style.display = 'block';
  }, delayMs);

  return container;
}
