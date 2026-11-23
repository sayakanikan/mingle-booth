import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';

export default async function ActiveEventRedirectPage() {
  // If user visits /e without ID, find the currently active event
  const activeEvent = await prisma.event.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (activeEvent) {
    redirect(`/e/${activeEvent.id}`);
  }

  // Fallback to most recent event
  const latestEvent = await prisma.event.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (latestEvent) {
    redirect(`/e/${latestEvent.id}`);
  }

  notFound();
}
