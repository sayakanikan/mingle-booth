'use server';

import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { EventData, SessionData } from '@/types';
import { clearSessionsAction } from './sessions';

export async function getEventsAction(): Promise<EventData[]> {
  await requireAdmin();

  try {
    const events = await prisma.event.findMany({
      select: {
        id: true,
        title: true,
        subtitle: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return events.map((e) => ({
      id: e.id,
      title: e.title,
      subtitle: e.subtitle,
      isActive: Boolean(e.isActive),
      createdAt: e.createdAt.toISOString(),
      sessionCount: e._count?.sessions ?? 0,
    }));
  } catch (err) {
    console.error('Failed to get events:', err);
    return [];
  }
}

export async function createEventAction(params: {
  title: string;
  subtitle: string;
  setActive?: boolean;
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  await requireAdmin();

  try {
    const title = params.title.trim();
    const subtitle = params.subtitle.trim() || 'by Kala Kini';

    if (!title) {
      return { success: false, error: 'Event title is required' };
    }

    const count = await prisma.event.count();
    const shouldActivate = params.setActive || count === 0;

    const result = await prisma.$transaction(async (tx) => {
      if (shouldActivate) {
        await tx.event.updateMany({
          data: { isActive: false },
        });
      }

      const newEvent = await tx.event.create({
        data: {
          id: crypto.randomUUID(),
          title,
          subtitle,
          isActive: shouldActivate,
        },
      });

      return newEvent;
    });

    revalidatePath('/');
    revalidatePath('/admin/events');
    revalidatePath('/admin/gallery');
    return { success: true, eventId: result.id };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function activateEventAction(eventId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await prisma.$transaction([
      prisma.event.updateMany({
        data: { isActive: false },
      }),
      prisma.event.update({
        where: { id: eventId },
        data: { isActive: true },
      }),
    ]);

    revalidatePath('/');
    revalidatePath('/admin/events');
    revalidatePath('/admin/gallery');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateEventAction(
  eventId: string,
  patch: { title: string; subtitle: string }
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    const title = patch.title.trim();
    const subtitle = patch.subtitle.trim();

    if (!title) {
      return { success: false, error: 'Event title cannot be empty' };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        subtitle,
      },
    });

    revalidatePath('/');
    revalidatePath('/admin/events');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteEventAction(eventId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    // Clean up all Cloudinary assets and sessions for this event
    await clearSessionsAction(eventId);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    await prisma.event.delete({
      where: { id: eventId },
    });

    // If the deleted event was active, activate the most recent event if available
    if (event?.isActive) {
      const nextEvent = await prisma.event.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      if (nextEvent) {
        await prisma.event.update({
          where: { id: nextEvent.id },
          data: { isActive: true },
        });
      }
    }

    revalidatePath('/');
    revalidatePath('/admin/events');
    revalidatePath('/admin/gallery');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getEventWithSessionsAction(eventId: string): Promise<{
  event: EventData | null;
  sessions: SessionData[];
}> {
  await requireAdmin();

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        sessions: {
          include: {
            photos: {
              orderBy: { slotIndex: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!event) {
      return { event: null, sessions: [] };
    }

    const eventData: EventData = {
      id: event.id,
      title: event.title,
      subtitle: event.subtitle,
      isActive: Boolean(event.isActive),
      createdAt: event.createdAt.toISOString(),
      sessionCount: event.sessions.length,
    };

    const sessions: SessionData[] = event.sessions.map((s) => ({
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

    return { event: eventData, sessions };
  } catch (err) {
    console.error('Failed to get event with sessions:', err);
    return { event: null, sessions: [] };
  }
}
