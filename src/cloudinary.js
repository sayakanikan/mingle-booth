/**
 * cloudinary.js — Unsigned upload to Cloudinary
 *
 * Uses Cloudinary's unsigned upload API — no backend/server required.
 * Credentials come from .env (VITE_ prefix exposes them to the browser).
 *
 * HOW TO SET UP:
 *  1. Sign up / log in at https://cloudinary.com
 *  2. Dashboard → Settings → Upload → Upload Presets → "Add upload preset"
 *     - Signing Mode: Unsigned
 *     - Folder: mingle-booth  (or any name you like)
 *     - Save the preset name
 *  3. Copy your Cloud Name from the Dashboard home
 *  4. Fill .env:
 *       VITE_CLOUDINARY_CLOUD_NAME=xxxxx
 *       VITE_CLOUDINARY_UPLOAD_PRESET=yyyyy
 *       VITE_CLOUDINARY_FOLDER=mingle-booth
 */

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME    || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
const FOLDER        = import.meta.env.VITE_CLOUDINARY_FOLDER        || 'mingle-booth';

const BASE_URL = () =>
  `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

/** Returns true when credentials look valid (not placeholder) */
export function isCloudinaryConfigured() {
  return (
    !!CLOUD_NAME &&
    !!UPLOAD_PRESET &&
    CLOUD_NAME     !== 'your_cloud_name' &&
    UPLOAD_PRESET  !== 'your_upload_preset'
  );
}

/**
 * Upload a Blob or File to Cloudinary.
 *
 * @param {Blob|File} blob
 * @param {Object} opts
 * @param {string} opts.subfolder    - sub-folder inside FOLDER  (e.g. "strips")
 * @param {string} opts.publicIdHint - base filename (without extension)
 * @param {string} opts.resourceType - "image" | "video" | "raw" | "auto"
 * @param {string[]} opts.tags       - extra Cloudinary tags
 * @param {Function} opts.onProgress - (pct 0-100) => void
 * @returns {Promise<CloudinaryResult>}
 */
export async function uploadBlob(blob, opts = {}) {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary not configured. Fill VITE_CLOUDINARY_CLOUD_NAME and ' +
      'VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.'
    );
  }

  const {
    subfolder    = '',
    publicIdHint = `photo_${Date.now()}`,
    resourceType = 'image',
    tags         = [],
    onProgress   = null,
  } = opts;

  const folder = subfolder ? `${FOLDER}/${subfolder}` : FOLDER;

  const form = new FormData();
  form.append('file',          blob);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder',        folder);
  form.append('public_id',     publicIdHint);
  if (tags.length) form.append('tags', ['mingle-booth', ...tags].join(','));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', BASE_URL(), true);

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        let msg = `Cloudinary upload failed (${xhr.status})`;
        try { msg = JSON.parse(xhr.responseText)?.error?.message || msg; } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during Cloudinary upload'));
    xhr.send(form);
  });
}

/**
 * Upload a data URL (base64) string to Cloudinary.
 * Converts it to a Blob first for efficient transfer.
 */
export async function uploadDataUrl(dataUrl, opts = {}) {
  const blob = dataUrlToBlob(dataUrl);
  return uploadBlob(blob, opts);
}

/**
 * Upload a canvas element as JPEG to Cloudinary.
 */
export function uploadCanvas(canvas, opts = {}, quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) { reject(new Error('Canvas toBlob returned null')); return; }
        try { resolve(await uploadBlob(blob, opts)); }
        catch (e) { reject(e); }
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Upload all session assets: strip, GIF, and individual original photos.
 *
 * @param {Object} assets
 * @param {HTMLCanvasElement}   assets.stripCanvas   - final composed strip canvas
 * @param {Blob|null}           assets.gifBlob       - animated GIF blob
 * @param {HTMLCanvasElement[]} assets.originalPhotos - raw captured frames
 * @param {string}              assets.sessionId     - unique session identifier
 * @param {string}              assets.eventTitle    - event name for tagging
 * @param {Function}            assets.onStepUpdate  - (step, pct) => void
 *
 * @returns {Promise<SessionUploadResult>}
 */
export async function uploadSession(assets) {
  const {
    stripCanvas,
    gifBlob,
    originalPhotos = [],
    sessionId      = Date.now().toString(),
    eventTitle     = 'mingle-booth',
    onStepUpdate   = () => {},
  } = assets;

  const slug        = slugify(eventTitle);
  const sessionTag  = `session_${sessionId}`;
  const commonTags  = [slug, sessionTag];
  const results     = {};

  // ── Strip ────────────────────────────────────────────────────
  onStepUpdate('strip', 0);
  results.strip = await uploadCanvas(stripCanvas, {
    subfolder:    'strips',
    publicIdHint: `${slug}_strip_${sessionId}`,
    tags:         [...commonTags, 'strip'],
    onProgress:   (p) => onStepUpdate('strip', p),
  });

  // ── GIF ─────────────────────────────────────────────────────
  if (gifBlob) {
    onStepUpdate('gif', 0);
    results.gif = await uploadBlob(gifBlob, {
      subfolder:    'gifs',
      publicIdHint: `${slug}_gif_${sessionId}`,
      resourceType: 'image',   // Cloudinary treats animated GIFs as images
      tags:         [...commonTags, 'gif'],
      onProgress:   (p) => onStepUpdate('gif', p),
    });
  }

  // ── Original photos ─────────────────────────────────────────
  if (originalPhotos.length > 0) {
    results.originals = [];
    for (let i = 0; i < originalPhotos.length; i++) {
      onStepUpdate('originals', Math.round((i / originalPhotos.length) * 100));
      const res = await uploadCanvas(originalPhotos[i], {
        subfolder:    `originals/${sessionId}`,
        publicIdHint: `${slug}_photo_${sessionId}_${i + 1}`,
        tags:         [...commonTags, 'original', `shot_${i + 1}`],
      });
      results.originals.push(res);
    }
    onStepUpdate('originals', 100);
  }

  return results;
}

/* ── Helpers ─────────────────────────────────────────────────── */

function dataUrlToBlob(dataUrl) {
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function slugify(str) {
  return (str || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

/**
 * @typedef {Object} CloudinaryResult
 * @property {string} secure_url  - HTTPS URL of the uploaded asset
 * @property {string} url         - HTTP URL
 * @property {string} public_id   - Cloudinary public ID
 * @property {string} format      - file format (e.g. "jpg", "gif")
 * @property {number} width
 * @property {number} height
 * @property {number} bytes       - file size in bytes
 * @property {string} asset_id
 *
 * @typedef {Object} SessionUploadResult
 * @property {CloudinaryResult}   strip
 * @property {CloudinaryResult}   [gif]
 * @property {CloudinaryResult[]} [originals]
 */
