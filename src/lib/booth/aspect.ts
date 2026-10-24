export function formatAspectRatio(w?: number | null, h?: number | null): string {
  if (!w || !h) return '';
  const ratio = w / h;
  let label = '';
  if (Math.abs(ratio - 1) < 0.04) label = 'Square (1:1)';
  else if (Math.abs(ratio - 4 / 3) < 0.04) label = 'Landscape (4:3)';
  else if (Math.abs(ratio - 3 / 4) < 0.04) label = 'Portrait (3:4)';
  else if (Math.abs(ratio - 16 / 9) < 0.04) label = 'Widescreen (16:9)';
  else if (Math.abs(ratio - 9 / 16) < 0.04) label = 'Story (9:16)';
  else if (Math.abs(ratio - 3 / 2) < 0.04) label = 'Classic (3:2)';
  else if (Math.abs(ratio - 2 / 3) < 0.04) label = 'Portrait (2:3)';
  else {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const d = gcd(w, h);
    const rw = Math.round(w / d);
    const rh = Math.round(h / d);
    label = rw < 20 && rh < 20 ? `${rw}:${rh}` : 'Custom Crop';
  }
  return `${label} · ${w}×${h}px`;
}
