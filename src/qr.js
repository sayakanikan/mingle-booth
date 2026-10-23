/**
 * qr.js — QR Code generation using the 'qrcode' npm package
 */
import QRCode from 'qrcode';

/**
 * Draw QR code onto a canvas element
 * @param {HTMLCanvasElement} canvas
 * @param {string} text - the data to encode
 * @param {Object} opts
 */
export async function drawQRCode(canvas, text, opts = {}) {
  const {
    width      = 220,
    darkColor  = '#1a1a28',
    lightColor = '#ffffff',
    margin     = 1,
  } = opts;

  await QRCode.toCanvas(canvas, text, {
    width,
    margin,
    color: { dark: darkColor, light: lightColor },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Generate a QR code as a data URL
 */
export async function qrToDataUrl(text, opts = {}) {
  const { width = 220, margin = 1 } = opts;
  return QRCode.toDataURL(text, {
    width,
    margin,
    color: { dark: '#1a1a28', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}
