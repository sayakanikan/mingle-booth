/**
 * slotDetector.js — Auto-detect transparent rectangular slots in a PNG frame
 *
 * Algorithm:
 *   1. Render PNG onto an offscreen canvas (scaled down if > MAX_DIM for speed)
 *   2. Build a transparent pixel mask (alpha < ALPHA_THRESHOLD)
 *   3. BFS flood-fill each connected transparent region
 *   4. Compute bounding box of each region
 *   5. Filter out tiny regions (< MIN_SLOT_PX) and outer full-canvas regions
 *   6. Scale coordinates back to original native frame resolution
 *   7. Sort top-to-bottom then left-to-right
 *   8. Assign default slot_index values
 */

const ALPHA_THRESHOLD = 10;   // pixel is "transparent" when alpha < this
const MIN_SLOT_PX     = 40;   // minimum native width AND height to qualify as a slot
const MAX_DIM         = 1000; // max width/height for detection canvas to ensure 60fps responsiveness

/**
 * Load a dataURL image onto an offscreen canvas.
 * Scales down proportionally if larger than MAX_DIM.
 * @param {string} dataUrl
 * @returns {Promise<{ctx: CanvasRenderingContext2D, w: number, h: number, origW: number, origH: number, scale: number}>}
 */
async function loadToCanvas(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const origW = img.naturalWidth;
      const origH = img.naturalHeight;
      const scale = Math.min(1, MAX_DIM / Math.max(origW, origH));
      const w = Math.round(origW * scale);
      const h = Math.round(origH * scale);

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ ctx, w, h, origW, origH, scale });
    };
    img.onerror = () => reject(new Error('Failed to load frame PNG'));
    img.src = dataUrl;
  });
}

/**
 * Detect transparent slot regions in a PNG frame.
 *
 * @param {string} dataUrl - PNG data URL
 * @returns {Promise<Array<{slot_index:number, x:number, y:number, w:number, h:number}>>}
 *          Sorted top-to-bottom then left-to-right; slot_index is the capture order.
 */
export async function detectSlots(dataUrl) {
  const { ctx, w, h, origW, origH, scale } = await loadToCanvas(dataUrl);
  const { data } = ctx.getImageData(0, 0, w, h);

  // Build transparent mask (1 = transparent, 0 = opaque)
  const transp = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    transp[i] = data[i * 4 + 3] < ALPHA_THRESHOLD ? 1 : 0;
  }

  const visited = new Uint8Array(w * h);
  const slots   = [];
  const minScaledPx = Math.max(12, Math.round(MIN_SLOT_PX * scale));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!transp[idx] || visited[idx]) continue;

      // BFS: find all connected transparent pixels
      const queue = [idx];
      visited[idx] = 1;
      let minX = x, maxX = x, minY = y, maxY = y;
      let head = 0;

      while (head < queue.length) {
        const curr = queue[head++];
        const cy   = Math.floor(curr / w);
        const cx   = curr % w;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // 4-connected neighbours (avoid allocations)
        if (cx > 0) {
          const n = curr - 1;
          if (!visited[n] && transp[n]) { visited[n] = 1; queue.push(n); }
        }
        if (cx < w - 1) {
          const n = curr + 1;
          if (!visited[n] && transp[n]) { visited[n] = 1; queue.push(n); }
        }
        if (cy > 0) {
          const n = curr - w;
          if (!visited[n] && transp[n]) { visited[n] = 1; queue.push(n); }
        }
        if (cy < h - 1) {
          const n = curr + w;
          if (!visited[n] && transp[n]) { visited[n] = 1; queue.push(n); }
        }
      }

      const slotW = maxX - minX + 1;
      const slotH = maxY - minY + 1;

      // Filter: ignore if smaller than minimum threshold
      if (slotW < minScaledPx || slotH < minScaledPx) continue;

      // Filter: ignore if it covers almost the whole image (canvas background transparency)
      if (slotW >= w * 0.96 && slotH >= h * 0.96) continue;

      // Convert back to native image pixel coordinates
      const nativeX = Math.round(minX / scale);
      const nativeY = Math.round(minY / scale);
      const nativeW = Math.min(origW - nativeX, Math.round(slotW / scale));
      const nativeH = Math.min(origH - nativeY, Math.round(slotH / scale));

      if (nativeW >= MIN_SLOT_PX && nativeH >= MIN_SLOT_PX) {
        slots.push({ x: nativeX, y: nativeY, w: nativeW, h: nativeH });
      }
    }
  }

  // Sort: top-to-bottom (threshold = MIN_SLOT_PX * 0.5), then left-to-right
  const rowDiffThreshold = Math.round(MIN_SLOT_PX * 0.5);
  slots.sort((a, b) => {
    const rowDiff = a.y - b.y;
    return Math.abs(rowDiff) > rowDiffThreshold ? rowDiff : a.x - b.x;
  });

  // Assign default capture order
  return slots.map((s, i) => ({ slot_index: i, ...s }));
}
