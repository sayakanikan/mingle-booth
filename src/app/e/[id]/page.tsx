import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { EventGallery, GallerySessionItem } from '@/components/EventGallery';
import type { Metadata } from 'next';

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { title: true, subtitle: true },
  });

  if (!event) {
    return { title: 'Event Gallery | Mingle Booth' };
  }

  return {
    title: `${event.title} — Photo Gallery | Mingle Booth`,
    description: `Browse and download photo strips, GIFs, and photos from ${event.title}`,
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      subtitle: true,
      brandLogoUrl: true,
      sessions: {
        select: {
          id: true,
          layout: true,
          photoCount: true,
          stripUrl: true,
          gifUrl: true,
          viewerUrl: true,
          stripW: true,
          stripH: true,
          createdAt: true,
          photos: {
            select: {
              slotIndex: true,
              url: true,
            },
            orderBy: { slotIndex: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const sessions: GallerySessionItem[] = event.sessions.map((s) => ({
    id: s.id,
    layout: s.layout,
    photoCount: s.photoCount,
    stripUrl: s.stripUrl,
    gifUrl: s.gifUrl,
    viewerUrl: s.viewerUrl,
    stripW: s.stripW,
    stripH: s.stripH,
    createdAt: s.createdAt.toISOString(),
    photos: s.photos.map((p) => ({
      slotIndex: p.slotIndex,
      url: p.url,
    })),
  }));

  return (
    <EventGallery
      event={{
        id: event.id,
        title: event.title,
        subtitle: event.subtitle,
        brandLogoUrl: event.brandLogoUrl,
      }}
      sessions={sessions}
    />
  );
}
