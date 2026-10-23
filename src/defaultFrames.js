/**
 * defaultFrames.js — Programmatic built-in frame generator
 *
 * Generates high-resolution PNG frames with transparent photo cutouts
 * so the booth is immediately usable even before custom artwork is uploaded.
 */

/**
 * Generate a built-in frame PNG with transparent cutouts.
 *
 * @param {'3-strip-dark' | '3-strip-white' | '4-strip-dark' | '2x2-dark'} type
 * @param {string} [title='MINGLE BOOTH']
 * @returns {{ name: string, dataUrl: string, width: number, height: number, slots: Array }}
 */
export function generateDefaultFrame(type = '3-strip-dark', title = 'MINGLE BOOTH') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (type === '3-strip-white') {
    canvas.width  = 1200;
    canvas.height = 3600;

    // Elegant crisp white/cream background
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, 1200, 3600);

    // Warm rose gold border
    ctx.strokeStyle = '#e0a96d';
    ctx.lineWidth = 14;
    ctx.strokeRect(36, 36, 1128, 3528);

    const slots = [
      { slot_index: 0, x: 100, y: 160,  w: 1000, h: 860 },
      { slot_index: 1, x: 100, y: 1120, w: 1000, h: 860 },
      { slot_index: 2, x: 100, y: 2080, w: 1000, h: 860 },
    ];

    // Punch transparent cutouts with subtle inner border
    slots.forEach(s => {
      ctx.strokeStyle = 'rgba(224, 169, 109, 0.45)';
      ctx.lineWidth = 4;
      ctx.strokeRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4);
      ctx.clearRect(s.x, s.y, s.w, s.h);
    });

    // Branding text
    ctx.fillStyle = '#1c1917';
    ctx.font = "bold 52px 'Outfit', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(title.toUpperCase(), 600, 3240);

    ctx.fillStyle = '#a89f91';
    ctx.font = "30px 'Outfit', sans-serif";
    ctx.fillText('CAPTURE YOUR MEMORIES', 600, 3310);

    return {
      name: 'Wedding White 3-Strip',
      dataUrl: canvas.toDataURL('image/png'),
      width: 1200,
      height: 3600,
      slots,
    };
  }

  if (type === '4-strip-dark') {
    canvas.width  = 1200;
    canvas.height = 3600;

    ctx.fillStyle = '#10101a';
    ctx.fillRect(0, 0, 1200, 3600);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 14;
    ctx.strokeRect(36, 36, 1128, 3528);

    const slots = [
      { slot_index: 0, x: 100, y: 120,  w: 1000, h: 680 },
      { slot_index: 1, x: 100, y: 880,  w: 1000, h: 680 },
      { slot_index: 2, x: 100, y: 1640, w: 1000, h: 680 },
      { slot_index: 3, x: 100, y: 2400, w: 1000, h: 680 },
    ];

    slots.forEach(s => {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4);
      ctx.clearRect(s.x, s.y, s.w, s.h);
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 52px 'Outfit', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(title.toUpperCase(), 600, 3320);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
    ctx.font = "30px 'Outfit', sans-serif";
    ctx.fillText('CAPTURE YOUR MEMORIES', 600, 3385);

    return {
      name: 'Neon Blue 4-Strip',
      dataUrl: canvas.toDataURL('image/png'),
      width: 1200,
      height: 3600,
      slots,
    };
  }

  if (type === '2x2-dark') {
    canvas.width  = 2400;
    canvas.height = 2400;

    ctx.fillStyle = '#12121e';
    ctx.fillRect(0, 0, 2400, 2400);

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 18;
    ctx.strokeRect(40, 40, 2320, 2320);

    const slots = [
      { slot_index: 0, x: 120,  y: 120,  w: 1040, h: 960 },
      { slot_index: 1, x: 1240, y: 120,  w: 1040, h: 960 },
      { slot_index: 2, x: 120,  y: 1160, w: 1040, h: 960 },
      { slot_index: 3, x: 1240, y: 1160, w: 1040, h: 960 },
    ];

    slots.forEach(s => {
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4);
      ctx.clearRect(s.x, s.y, s.w, s.h);
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 64px 'Outfit', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(title.toUpperCase(), 1200, 2260);

    return {
      name: 'Retro 2×2 Grid',
      dataUrl: canvas.toDataURL('image/png'),
      width: 2400,
      height: 2400,
      slots,
    };
  }

  // Default: '3-strip-dark'
  canvas.width  = 1200;
  canvas.height = 3600;

  const grad = ctx.createLinearGradient(0, 0, 0, 3600);
  grad.addColorStop(0, '#161626');
  grad.addColorStop(1, '#0c0c16');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 3600);

  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 14;
  ctx.strokeRect(36, 36, 1128, 3528);

  const slots = [
    { slot_index: 0, x: 100, y: 160,  w: 1000, h: 860 },
    { slot_index: 1, x: 100, y: 1120, w: 1000, h: 860 },
    { slot_index: 2, x: 100, y: 2080, w: 1000, h: 860 },
  ];

  slots.forEach(s => {
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4);
    ctx.clearRect(s.x, s.y, s.w, s.h);
  });

  ctx.fillStyle = '#ffffff';
  ctx.font = "bold 52px 'Outfit', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(title.toUpperCase(), 600, 3240);

  ctx.fillStyle = 'rgba(192, 132, 252, 0.9)';
  ctx.font = "30px 'Outfit', sans-serif";
  ctx.fillText('CAPTURE YOUR MEMORIES', 600, 3310);

  return {
    name: 'Classic Dark 3-Strip',
    dataUrl: canvas.toDataURL('image/png'),
    width: 1200,
    height: 3600,
    slots,
  };
}
