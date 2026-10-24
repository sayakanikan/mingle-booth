import { notFound } from 'next/navigation';
import { getEventWithSessionsAction } from '@/actions/events';
import { GalleryGrid } from '@/components/admin/GalleryGrid';

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const { event, sessions } = await getEventWithSessionsAction(id);

  if (!event) {
    notFound();
  }

  return (
    <GalleryGrid
      initialSessions={sessions}
      eventId={event.id}
      eventName={event.title}
      eventSubtitle={event.subtitle}
    />
  );
}
