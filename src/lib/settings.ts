import { prisma } from './db';
import { BoothSettings, Frame, Slot } from '@/types';

export async function getBoothSettings(): Promise<BoothSettings> {
  try {
    const activeEvent = await prisma.event.findFirst({
      where: { isActive: true },
    });

    // Shared frames library - all frames available across events
    const framesRecords = await prisma.frame.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const frames: Frame[] = framesRecords.map((f) => ({
      id: f.id,
      name: f.name,
      dataUrl: f.dataUrl,
      width: f.width,
      height: f.height,
      slots: (Array.isArray(f.slots) ? f.slots : []) as unknown as Slot[],
      isActive: f.isActive,
    }));

    const activeFrame = frames.find((f) => f.isActive) || null;

    if (!activeEvent) {
      return {
        eventId: null,
        hasActiveEvent: false,
        cameraDeviceId: null,
        cameraResolution: '1920x1080',
        mirrorCamera: true,
        mirrorResult: true,
        eventTitle: 'No Active Event',
        eventSubtitle: 'Please activate an event in Admin',
        brandLogoDataUrl: null,
        stripLayout: '3v',
        stripBgColor: '#1a1a28',
        stripTextColor: '#ffffff',
        stripShowTitle: true,
        stripShowDate: true,
        activeFrame,
        frames,
      };
    }

    return {
      eventId: activeEvent.id,
      hasActiveEvent: true,
      cameraDeviceId: activeEvent.cameraDeviceId,
      cameraResolution: activeEvent.cameraResolution,
      mirrorCamera: activeEvent.mirrorCamera,
      mirrorResult: activeEvent.mirrorResult ?? true,
      eventTitle: activeEvent.title,
      eventSubtitle: activeEvent.subtitle,
      brandLogoDataUrl: activeEvent.brandLogoUrl,
      stripLayout: activeEvent.defaultLayout,
      stripBgColor: activeEvent.stripBgColor,
      stripTextColor: activeEvent.stripTextColor,
      stripShowTitle: activeEvent.stripShowTitle,
      stripShowDate: activeEvent.stripShowDate,
      activeFrame,
      frames,
    };
  } catch (err) {
    console.error('Failed to load settings from DB:', err);
    return {
      eventId: null,
      hasActiveEvent: false,
      cameraDeviceId: null,
      cameraResolution: '1920x1080',
      mirrorCamera: true,
      mirrorResult: true,
      eventTitle: 'Mingle Booth',
      eventSubtitle: 'by Kala Kini',
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
