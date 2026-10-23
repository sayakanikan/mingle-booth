import { Slot } from '@/types';

const ALPHA_THRESHOLD = 10;
const MIN_SLOT_PX = 40;
const MAX_DIM = 1000;

async function loadToCanvas(dataUrl: string) {
  return new Promise<{
    ctx: CanvasRenderingContext2D;
    w: number;
    h: number;
    origW: number;
    origH: number;
    scale: number;
  }>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const origW = img.naturalWidth;
      const origH = img.naturalHeight;
      const scale = Math.min(1, MAX_DIM / Math.max(origW, origH));
      const w = Math.round(origW * scale);
      const h = Math.round(origH * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ ctx, w, h, origW, origH, scale });
    };
    img.onerror = () => reject(new Error('Failed to load frame PNG'));
    img.src = dataUrl;
  });
}

export async function detectSlots(dataUrl: string): Promise<Slot[]> {
  const { ctx, w, h, origW, origH, scale } = await loadToCanvas(dataUrl);
  const { data } = ctx.getImageData(0, 0, w, h);

  const transp = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    transp[i] = data[i * 4 + 3] < ALPHA_THRESHOLD ? 1 : 0;
  }

  const visited = new Uint8Array(w * h);
  const slots: Omit<Slot, 'slot_index'>[] = [];
  const minScaledPx = Math.max(12, Math.round(MIN_SLOT_PX * scale));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!transp[idx] || visited[idx]) continue;

      const queue = [idx];
      visited[idx] = 1;
      let minX = x,
        maxX = x,
        minY = y,
        maxY = y;
      let head = 0;

      while (head < queue.length) {
        const curr = queue[head++];
        const cy = Math.floor(curr / w);
        const cx = curr % w;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        if (cx > 0) {
          const n = curr - 1;
          if (!visited[n] && transp[n]) {
            visited[n] = 1;
            queue.push(n);
          }
        }
        if (cx < w - 1) {
          const n = curr + 1;
          if (!visited[n] && transp[n]) {
            visited[n] = 1;
            queue.push(n);
          }
        }
        if (cy > 0) {
          const n = curr - w;
          if (!visited[n] && transp[n]) {
            visited[n] = 1;
            queue.push(n);
          }
        }
        if (cy < h - 1) {
          const n = curr + w;
          if (!visited[n] && transp[n]) {
            visited[n] = 1;
            queue.push(n);
          }
        }
      }

      const slotW = maxX - minX + 1;
      const slotH = maxY - minY + 1;

      if (slotW < minScaledPx || slotH < minScaledPx) continue;
      if (slotW >= w * 0.96 && slotH >= h * 0.96) continue;

      const nativeX = Math.round(minX / scale);
      const nativeY = Math.round(minY / scale);
      const nativeW = Math.min(origW - nativeX, Math.round(slotW / scale));
      const nativeH = Math.min(origH - nativeY, Math.round(slotH / scale));

      if (nativeW >= MIN_SLOT_PX && nativeH >= MIN_SLOT_PX) {
        slots.push({ x: nativeX, y: nativeY, w: nativeW, h: nativeH });
      }
    }
  }

  const rowDiffThreshold = Math.round(MIN_SLOT_PX * 0.5);
  slots.sort((a, b) => {
    const rowDiff = a.y - b.y;
    return Math.abs(rowDiff) > rowDiffThreshold ? rowDiff : a.x - b.x;
  });

  return slots.map((s, i) => ({ slot_index: i, ...s }));
}
