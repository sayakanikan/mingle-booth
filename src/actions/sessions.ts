'use server';

import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { SessionData, SessionPhotoData } from '@/types';

export async function saveSessionAction(params: {
  session: {
    id: string;
    layout: string;
    photoCount: number;
    stripUrl: string;
    gifUrl: string | null;
    viewerUrl: string | null;
    stripW: number;
    stripH: number;
    frameUrl?: string | null;
  };
  photos: SessionPhotoData[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { session, photos } = params;

    const activeEvent = await prisma.event.findFirst({
      where: { isActive: true },
    });
    const targetEventId = activeEvent?.id || 'default';

    await prisma.photoSession.create({
      data: {
        id: session.id,
        eventId: targetEventId,
        layout: session.layout,
        photoCount: session.photoCount,
        stripUrl: session.stripUrl,
        gifUrl: session.gifUrl,
        viewerUrl: session.viewerUrl,
        stripW: session.stripW,
        stripH: session.stripH,
        frameUrl: session.frameUrl ?? null,
        photos: {
          create: photos.map((p) => ({
            slotIndex: p.slotIndex,
            url: p.url,
            slotX: p.slotX,
            slotY: p.slotY,
            slotW: p.slotW,
            slotH: p.slotH,
          })),
        },
      },
    });

    revalidatePath('/admin/events');
    revalidatePath('/admin/gallery');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

function extractCloudinaryPublicId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[a-zA-Z0-9]+)?$/);
  return match && match[1] ? match[1] : null;
}

async function destroyCloudinaryAsset(publicId: string, cloudName: string, apiKey: string, apiSecret: string) {
  const { createHash } = await import('node:crypto');
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash('sha1')
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: timestamp.toString(),
    api_key: apiKey,
    signature,
  });

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body,
    });
    return await res.json();
  } catch (e) {
    console.warn(`Failed to destroy Cloudinary asset ${publicId}:`, e);
    return null;
  }
}

async function deleteCloudinaryAssets(urls: (string | null | undefined)[]) {
  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn(
      '[Cloudinary] Deletion skipped: CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET not set in .env'
    );
    return;
  }

  const publicIds = Array.from(
    new Set(urls.map(extractCloudinaryPublicId).filter((id): id is string => Boolean(id)))
  );

  if (publicIds.length > 0) {
    await Promise.allSettled(
      publicIds.map((id) => destroyCloudinaryAsset(id, cloudName, apiKey, apiSecret))
    );
  }
}

export async function deleteSessionAction(sessionId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    const session = await prisma.photoSession.findUnique({
      where: { id: sessionId },
      include: { photos: true },
    });

    if (session) {
      const urls = [
        session.stripUrl,
        session.gifUrl,
        ...session.photos.map((p) => p.url),
      ];

      try {
        await deleteCloudinaryAssets(urls);
      } catch (cloudErr) {
        console.warn('Cloudinary deletion warning (non-blocking):', cloudErr);
      }

      await prisma.photoSession.delete({
        where: { id: sessionId },
      });
    }

    revalidatePath('/admin/events');
    revalidatePath('/admin/events/[id]', 'page');
    revalidatePath('/admin/gallery');
    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function clearSessionsAction(eventId?: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    const whereClause: { eventId?: string } = {};
    if (eventId) {
      whereClause.eventId = eventId;
    }

    const sessions = await prisma.photoSession.findMany({
      where: whereClause,
      include: { photos: true },
    });

    const urls: (string | null)[] = [];
    for (const s of sessions) {
      urls.push(s.stripUrl);
      urls.push(s.gifUrl);
      for (const p of s.photos) {
        urls.push(p.url);
      }
    }

    try {
      await deleteCloudinaryAssets(urls);
    } catch (cloudErr) {
      console.warn('Cloudinary clear warning (non-blocking):', cloudErr);
    }

    await prisma.photoSession.deleteMany({
      where: whereClause,
    });

    revalidatePath('/admin/events');
    revalidatePath('/admin/events/[id]', 'page');
    revalidatePath('/admin/gallery');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getSessionsAction(limit = 100, eventId?: string): Promise<SessionData[]> {
  try {
    const whereClause: { eventId?: string } = {};
    if (eventId) {
      whereClause.eventId = eventId;
    }

    const list = await prisma.photoSession.findMany({
      where: whereClause,
      include: {
        photos: {
          orderBy: { slotIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return list.map((s) => ({
      id: s.id,
      layout: s.layout,
      photoCount: s.photoCount,
      stripUrl: s.stripUrl,
      gifUrl: s.gifUrl,
      viewerUrl: s.viewerUrl,
      stripW: s.stripW,
      stripH: s.stripH,
      frameUrl: s.frameUrl,
      createdAt: s.createdAt.toISOString(),
      photos: s.photos.map((p) => ({
        slotIndex: p.slotIndex,
        url: p.url,
        slotX: p.slotX,
        slotY: p.slotY,
        slotW: p.slotW,
        slotH: p.slotH,
      })),
    }));
  } catch (err) {
    console.error('Failed to get sessions:', err);
    return [];
  }
}
