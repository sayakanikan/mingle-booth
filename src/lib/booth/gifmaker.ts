export async function buildGif(
  photos: HTMLCanvasElement[],
  opts: {
    width?: number;
    height?: number;
    delay?: number;
    quality?: number;
  } = {}
): Promise<{ dataUrl: string; blob: Blob }> {
  const { width = 480, height = 360, delay = 700, quality = 8 } = opts;

  // @ts-expect-error gif.js does not provide native TS types
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
      const scaled = document.createElement('canvas');
      scaled.width = width;
      scaled.height = height;
      const ctx = scaled.getContext('2d')!;

      const photoAspect = photo.width / photo.height;
      const gifAspect = width / height;
      let sx = 0,
        sy = 0,
        sw = photo.width,
        sh = photo.height;
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

    const lastScaled = document.createElement('canvas');
    lastScaled.width = width;
    lastScaled.height = height;
    const lctx = lastScaled.getContext('2d')!;
    const last = photos[photos.length - 1];
    const photoAspect = last.width / last.height;
    const gifAspect = width / height;
    let sx = 0,
      sy = 0,
      sw = last.width,
      sh = last.height;
    if (photoAspect > gifAspect) {
      sw = last.height * gifAspect;
      sx = (last.width - sw) / 2;
    } else {
      sh = last.width / gifAspect;
      sy = (last.height - sh) / 2;
    }
    lctx.drawImage(last, sx, sy, sw, sh, 0, 0, width, height);
    gif.addFrame(lastScaled, { delay: delay * 3, copy: true });

    gif.on('finished', (blob: Blob) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: reader.result as string, blob });
      reader.readAsDataURL(blob);
    });

    gif.on('error', reject);
    gif.render();
  });
}
