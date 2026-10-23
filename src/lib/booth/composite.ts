import { Slot } from '@/types';

export interface ComposeOpts {
  frameDataUrl?: string;
  frameWidth: number;
  frameHeight: number;
  slots?: Slot[];
  bgColor?: string;
  textColor?: string;
  showTitle?: boolean;
  eventTitle?: string;
  showDate?: boolean;
}

export async function composeStripFromFrame(
  photos: HTMLCanvasElement[],
  opts: ComposeOpts
): Promise<HTMLCanvasElement> {
  const {
    frameDataUrl,
    frameWidth,
    frameHeight,
    slots = [],
    bgColor = '#1a1a28',
    textColor = '#ffffff',
    showTitle = true,
    eventTitle = 'Mingle Booth',
    showDate = true,
  } = opts;

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d')!;

  /* Background */
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, frameWidth, frameHeight);

  /* Draw photos into slots */
  const sorted = [...slots].sort((a, b) => a.slot_index - b.slot_index);

  for (let i = 0; i < sorted.length; i++) {
    const slot = sorted[i];
    const photo = photos[i];
    if (!photo) continue;

    ctx.save();
    ctx.beginPath();
    ctx.rect(slot.x, slot.y, slot.w, slot.h);
    ctx.clip();

    const pAspect = photo.width / photo.height;
    const sAspect = slot.w / slot.h;
    let sx = 0,
      sy = 0,
      sw = photo.width,
      sh = photo.height;

    if (pAspect > sAspect) {
      sw = photo.height * sAspect;
      sx = (photo.width - sw) / 2;
    } else {
      sh = photo.width / sAspect;
      sy = (photo.height - sh) / 2;
    }

    ctx.drawImage(photo, sx, sy, sw, sh, slot.x, slot.y, slot.w, slot.h);

    const vg = ctx.createRadialGradient(
      slot.x + slot.w / 2,
      slot.y + slot.h / 2,
      Math.min(slot.w, slot.h) * 0.3,
      slot.x + slot.w / 2,
      slot.y + slot.h / 2,
      Math.max(slot.w, slot.h) * 0.75
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = vg;
    ctx.fillRect(slot.x, slot.y, slot.w, slot.h);

    ctx.restore();
  }

  /* Overlay frame PNG */
  if (frameDataUrl) {
    await new Promise<void>((resolve, reject) => {
      const fi = new Image();
      fi.crossOrigin = 'anonymous';
      fi.onload = () => {
        ctx.drawImage(fi, 0, 0, frameWidth, frameHeight);
        resolve();
      };
      fi.onerror = reject;
      fi.src = frameDataUrl;
    });
  }

  /* Branding bar */
  if (showTitle || showDate) {
    const BAR_H = Math.max(50, Math.round(frameHeight * (showTitle && showDate ? 0.045 : 0.03)));
    const textY = frameHeight - BAR_H;

    ctx.fillStyle = bgColor;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(0, textY, frameWidth, BAR_H);
    ctx.globalAlpha = 1;

    const sep = ctx.createLinearGradient(0, textY, frameWidth, textY);
    sep.addColorStop(0, 'rgba(192,132,252,0)');
    sep.addColorStop(0.5, 'rgba(192,132,252,0.6)');
    sep.addColorStop(1, 'rgba(192,132,252,0)');
    ctx.strokeStyle = sep;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, textY + 1);
    ctx.lineTo(frameWidth, textY + 1);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (showTitle && showDate) {
      ctx.fillStyle = textColor;
      ctx.font = `bold ${Math.round(frameWidth * 0.038)}px 'Outfit', sans-serif`;
      ctx.fillText(eventTitle, frameWidth / 2, textY + BAR_H * 0.36);

      const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `${Math.round(frameWidth * 0.024)}px 'Outfit', sans-serif`;
      ctx.fillText(dateStr, frameWidth / 2, textY + BAR_H * 0.72);
    } else if (showTitle) {
      ctx.fillStyle = textColor;
      ctx.font = `bold ${Math.round(frameWidth * 0.04)}px 'Outfit', sans-serif`;
      ctx.fillText(eventTitle, frameWidth / 2, textY + BAR_H * 0.5);
    } else if (showDate) {
      const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `${Math.round(frameWidth * 0.028)}px 'Outfit', sans-serif`;
      ctx.fillText(dateStr, frameWidth / 2, textY + BAR_H * 0.5);
    }
  }

  return canvas;
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, quality = 0.92): string {
  return canvas.toDataURL('image/jpeg', quality);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
