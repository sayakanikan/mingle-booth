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

    await prisma.photoSession.create({
      data: {
        id: session.id,
        eventId: 'default',
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

    revalidatePath('/admin/gallery');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteSessionAction(sessionId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await prisma.photoSession.delete({
      where: { id: sessionId },
    });

    revalidatePath('/admin/gallery');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function clearSessionsAction(): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await prisma.photoSession.deleteMany({
      where: { eventId: 'default' },
    });

    revalidatePath('/admin/gallery');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getSessionsAction(limit = 100): Promise<SessionData[]> {
  try {
    const list = await prisma.photoSession.findMany({
      where: { eventId: 'default' },
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
