import { SessionData, Frame, Slot } from '@/types';
import { composeStripFromFrame, canvasToDataUrl } from './composite';
import { buildGif } from './gifmaker';
import { isCloudinaryConfigured, uploadSession } from './cloudinary';
import { updateSessionMediaAction } from '@/actions/sessions';
import { saveToLocalGalleryAction } from '@/actions/localGallery';

export interface RegenerateEventConfig {
  stripBgColor?: string;
  stripTextColor?: string;
  stripShowTitle?: boolean;
  stripShowDate?: boolean;
  frames?: Frame[];
}

export async function regenerateSessionMedia(
  session: SessionData,
  eventName: string,
  eventConfig?: RegenerateEventConfig,
  saveToLocal?: boolean,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; stripUrl?: string; gifUrl?: string | null; error?: string }> {
  if (!session.photos || session.photos.length === 0) {
    return { success: false, error: 'No raw photos available for this session.' };
  }

  onProgress?.('Loading raw photos…');

  // 1. Load raw photos into HTMLCanvasElement
  const photoCanvases = await Promise.all(
    session.photos.map((p) => {
      return new Promise<HTMLCanvasElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || img.width;
          c.height = img.naturalHeight || img.height;
          const ctx = c.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          resolve(c);
        };
        img.onerror = () => reject(new Error(`Failed to load photo shot: ${p.url}`));
        img.src = p.url;
      });
    })
  );

  // 2. Resolve frame template and slots
  const frames = eventConfig?.frames || [];
  const targetFrameId = session.layout.replace(/^frame:/, '');
  const matchingFrame =
    frames.find((f) => f.id === targetFrameId) ||
    frames.find((f) => f.isActive) ||
    frames[0] ||
    null;

  const frameDataUrl = matchingFrame?.dataUrl || session.frameUrl || undefined;
  const frameWidth = matchingFrame?.width || session.stripW || 800;
  const frameHeight = matchingFrame?.height || session.stripH || 2400;

  const slots: Slot[] =
    matchingFrame?.slots && matchingFrame.slots.length > 0
      ? matchingFrame.slots
      : session.photos.map((p) => ({
          slot_index: p.slotIndex,
          x: p.slotX,
          y: p.slotY,
          w: p.slotW,
          h: p.slotH,
        }));

  // 3. Compose Photo Strip
  onProgress?.('Composing high-quality strip…');
  const stripCanvas = await composeStripFromFrame(photoCanvases, {
    frameDataUrl,
    frameWidth,
    frameHeight,
    slots,
    bgColor: eventConfig?.stripBgColor || '#1a1a28',
    textColor: eventConfig?.stripTextColor || '#ffffff',
    showTitle: eventConfig?.stripShowTitle !== false,
    eventTitle: eventName || 'Mingle Booth',
    showDate: eventConfig?.stripShowDate !== false,
  });

  const stripDataUrl = canvasToDataUrl(stripCanvas, 0.95);

  // 4. Build Animated GIF
  onProgress?.('Generating high-res animated GIF…');
  let gifDataUrl: string | null = null;
  let gifBlob: Blob | null = null;
  try {
    const gifResult = await buildGif(photoCanvases, {
      width: 640,
      height: 480,
      delay: 650,
      quality: 5,
    });
    gifDataUrl = gifResult.dataUrl;
    gifBlob = gifResult.blob;
  } catch (err) {
    console.warn('GIF regeneration warning:', err);
  }

  // 5. Cloud Upload (if configured)
  onProgress?.('Uploading to cloud…');
  let finalStripUrl = stripDataUrl;
  let finalGifUrl = gifDataUrl;

  if (isCloudinaryConfigured()) {
    try {
      const uploadResults = await uploadSession({
        stripCanvas,
        gifBlob,
        originalPhotos: [], // keep existing raw photos in cloud
        sessionId: session.id,
        eventTitle: eventName || 'Mingle Booth',
        onStepUpdate: (step, pct) => {
          onProgress?.(`Uploading ${step}: ${pct}%`);
        },
      });

      if (uploadResults.strip?.secure_url) {
        finalStripUrl = uploadResults.strip.secure_url;
      }
      if (uploadResults.gif?.secure_url) {
        finalGifUrl = uploadResults.gif.secure_url;
      }
    } catch (err) {
      console.warn('Cloudinary upload warning:', err);
    }
  }

  // 6. Local Gallery Save (if enabled)
  if (saveToLocal) {
    saveToLocalGalleryAction({
      sessionId: session.id,
      eventTitle: eventName || 'Mingle Booth',
      stripDataUrl,
      gifDataUrl,
      photosDataUrls: photoCanvases.map((c) => c.toDataURL('image/jpeg', 0.92)),
    }).catch((err) => console.warn('Local gallery save notice:', err));
  }

  // 7. Update Database
  onProgress?.('Updating database…');
  const updateRes = await updateSessionMediaAction({
    sessionId: session.id,
    stripUrl: finalStripUrl,
    gifUrl: finalGifUrl,
  });

  if (!updateRes.success) {
    return { success: false, error: updateRes.error };
  }

  return {
    success: true,
    stripUrl: finalStripUrl,
    gifUrl: finalGifUrl,
  };
}
