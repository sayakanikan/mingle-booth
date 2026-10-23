import QRCode from 'qrcode';

export async function drawQRCode(
  canvas: HTMLCanvasElement,
  text: string,
  opts: {
    width?: number;
    darkColor?: string;
    lightColor?: string;
    margin?: number;
  } = {}
) {
  const {
    width = 220,
    darkColor = '#1a1a28',
    lightColor = '#ffffff',
    margin = 1,
  } = opts;

  await QRCode.toCanvas(canvas, text, {
    width,
    margin,
    color: { dark: darkColor, light: lightColor },
    errorCorrectionLevel: 'M',
  });
}

export async function qrToDataUrl(text: string, opts: { width?: number; margin?: number } = {}) {
  const { width = 220, margin = 1 } = opts;
  return QRCode.toDataURL(text, {
    width,
    margin,
    color: { dark: '#1a1a28', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}
