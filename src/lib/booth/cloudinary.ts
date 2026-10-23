const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  process.env.VITE_CLOUDINARY_CLOUD_NAME ||
  '';

const UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
  process.env.VITE_CLOUDINARY_UPLOAD_PRESET ||
  '';

const FOLDER =
  process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER ||
  process.env.VITE_CLOUDINARY_FOLDER ||
  'mingle-booth';

const BASE_URL = () => `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

export interface CloudinaryResult {
  secure_url: string;
  url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  asset_id: string;
}

export interface SessionUploadResult {
  strip?: CloudinaryResult;
  gif?: CloudinaryResult;
  originals?: CloudinaryResult[];
}

export function isCloudinaryConfigured(): boolean {
  return (
    !!CLOUD_NAME &&
    !!UPLOAD_PRESET &&
    CLOUD_NAME !== 'your_cloud_name' &&
    UPLOAD_PRESET !== 'your_upload_preset'
  );
}

export async function uploadBlob(
  blob: Blob | File,
  opts: {
    subfolder?: string;
    publicIdHint?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    tags?: string[];
    onProgress?: (pct: number) => void;
  } = {}
): Promise<CloudinaryResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary not configured.');
  }

  const {
    subfolder = '',
    publicIdHint = `photo_${Date.now()}`,
    tags = [],
    onProgress,
  } = opts;

  const folder = subfolder ? `${FOLDER}/${subfolder}` : FOLDER;

  const form = new FormData();
  form.append('file', blob);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', folder);
  form.append('public_id', publicIdHint);
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
        try {
          msg = JSON.parse(xhr.responseText)?.error?.message || msg;
        } catch {
          // fallback
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during Cloudinary upload'));
    xhr.send(form);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function uploadDataUrl(dataUrl: string, opts = {}) {
  const blob = dataUrlToBlob(dataUrl);
  return uploadBlob(blob, opts);
}

export function uploadCanvas(canvas: HTMLCanvasElement, opts = {}, quality = 0.92): Promise<CloudinaryResult> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null'));
          return;
        }
        try {
          resolve(await uploadBlob(blob, opts));
        } catch (e) {
          reject(e);
        }
      },
      'image/jpeg',
      quality
    );
  });
}

function slugify(str: string): string {
  return (str || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export async function uploadSession(assets: {
  stripCanvas: HTMLCanvasElement;
  gifBlob: Blob | null;
  originalPhotos: HTMLCanvasElement[];
  sessionId: string;
  eventTitle: string;
  onStepUpdate?: (step: 'strip' | 'gif' | 'originals', pct: number) => void;
}): Promise<SessionUploadResult> {
  const {
    stripCanvas,
    gifBlob,
    originalPhotos = [],
    sessionId = Date.now().toString(),
    eventTitle = 'mingle-booth',
    onStepUpdate = () => {},
  } = assets;

  const slug = slugify(eventTitle);
  const sessionTag = `session_${sessionId}`;
  const commonTags = [slug, sessionTag];
  const results: SessionUploadResult = {};

  onStepUpdate('strip', 0);
  results.strip = await uploadCanvas(stripCanvas, {
    subfolder: 'strips',
    publicIdHint: `${slug}_strip_${sessionId}`,
    tags: [...commonTags, 'strip'],
    onProgress: (p: number) => onStepUpdate('strip', p),
  });

  if (gifBlob) {
    onStepUpdate('gif', 0);
    results.gif = await uploadBlob(gifBlob, {
      subfolder: 'gifs',
      publicIdHint: `${slug}_gif_${sessionId}`,
      resourceType: 'image',
      tags: [...commonTags, 'gif'],
      onProgress: (p: number) => onStepUpdate('gif', p),
    });
  }

  if (originalPhotos.length > 0) {
    results.originals = [];
    for (let i = 0; i < originalPhotos.length; i++) {
      onStepUpdate('originals', Math.round((i / originalPhotos.length) * 100));
      const res = await uploadCanvas(originalPhotos[i], {
        subfolder: `originals/${sessionId}`,
        publicIdHint: `${slug}_photo_${sessionId}_${i + 1}`,
        tags: [...commonTags, 'original', `shot_${i + 1}`],
      });
      results.originals.push(res);
    }
    onStepUpdate('originals', 100);
  }

  return results;
}
