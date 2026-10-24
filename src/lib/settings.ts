import { prisma } from './db';
import { BoothSettings, Frame, Slot } from '@/types';

export async function getBoothSettings(): Promise<BoothSettings> {
  try {
    let event = await prisma.event.findUnique({
      where: { id: 'default' },
      include: {
        frames: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!event) {
      event = await prisma.event.create({
        data: { id: 'default' },
        include: {
          frames: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    const frames: Frame[] = (event.frames || []).map((f) => ({
      id: f.id,
      name: f.name,
      dataUrl: f.dataUrl,
      width: f.width,
      height: f.height,
      slots: (Array.isArray(f.slots) ? f.slots : []) as unknown as Slot[],
      isActive: f.isActive,
    }));

    const activeFrame = frames.find((f) => f.isActive) || null;

    return {
      cameraDeviceId: event.cameraDeviceId,
      cameraResolution: event.cameraResolution,
      mirrorCamera: event.mirrorCamera,
      eventTitle: event.title,
      eventSubtitle: event.subtitle,
      brandLogoDataUrl: event.brandLogoUrl,
      stripLayout: event.defaultLayout,
      stripBgColor: event.stripBgColor,
      stripTextColor: event.stripTextColor,
      stripShowTitle: event.stripShowTitle,
      stripShowDate: event.stripShowDate,
      activeFrame,
      frames,
    };
  } catch (err) {
    console.error('Failed to load settings from DB:', err);
    return {
      cameraDeviceId: null,
      cameraResolution: '1920x1080',
      mirrorCamera: true,
      eventTitle: 'Mingle Booth',
      eventSubtitle: 'Capture Your Memories',
      brandLogoDataUrl: null,
      stripLayout: '3v',
      stripBgColor: '#1a1a28',
      stripTextColor: '#ffffff',
      stripShowTitle: true,
      stripShowDate: true,
      activeFrame: null,
      frames: [],
    };
  }
}
