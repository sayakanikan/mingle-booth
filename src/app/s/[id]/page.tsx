import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { SessionViewer } from '@/components/SessionViewer';

interface ViewerPageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewerPage({ params }: ViewerPageProps) {
  const { id } = await params;

  const session = await prisma.photoSession.findUnique({
    where: { id },
    include: {
      photos: {
        orderBy: { slotIndex: 'asc' },
      },
      event: {
        select: { title: true },
      },
    },
  });

  if (!session) {
    notFound();
  }

  return (
    <SessionViewer
      title={session.event.title}
      stripUrl={session.stripUrl}
      gifUrl={session.gifUrl}
      originalUrls={session.photos.map((p) => p.url)}
      isCloud={session.stripUrl.startsWith('http')}
    />
  );
}
