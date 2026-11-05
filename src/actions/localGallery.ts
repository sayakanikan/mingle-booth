'use server';

import fs from 'node:fs/promises';
import path from 'node:path';

function sanitizeSlug(str: string): string {
  return (str || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'event';
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return Buffer.from(base64Data, 'base64');
}

export async function saveToLocalGalleryAction(params: {
  sessionId: string;
  eventTitle: string;
  stripDataUrl: string;
  gifDataUrl?: string | null;
  photosDataUrls: string[];
}): Promise<{ success: boolean; dirPath?: string; error?: string }> {
  try {
    const slug = sanitizeSlug(params.eventTitle);
    const targetDir = path.join(process.cwd(), 'gallery', slug, params.sessionId);
    await fs.mkdir(targetDir, { recursive: true });

    // 1. Save Photo Strip
    if (params.stripDataUrl) {
      await fs.writeFile(path.join(targetDir, 'strip.jpg'), dataUrlToBuffer(params.stripDataUrl));
    }

    // 2. Save Animated GIF
    if (params.gifDataUrl) {
      await fs.writeFile(path.join(targetDir, 'animated.gif'), dataUrlToBuffer(params.gifDataUrl));
    }

    // 3. Save Original Photos
    if (Array.isArray(params.photosDataUrls)) {
      for (let i = 0; i < params.photosDataUrls.length; i++) {
        const photoUrl = params.photosDataUrls[i];
        if (photoUrl) {
          await fs.writeFile(
            path.join(targetDir, `photo_${i + 1}.jpg`),
            dataUrlToBuffer(photoUrl)
          );
        }
      }
    }

    return { success: true, dirPath: targetDir };
  } catch (err: unknown) {
    console.error('Failed to save to local gallery:', err);
    return { success: false, error: (err as Error).message };
  }
}

