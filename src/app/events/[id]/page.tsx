import { redirect } from 'next/navigation';

interface EventsRedirectProps {
  params: Promise<{ id: string }>;
}

export default async function EventsRedirectPage({ params }: EventsRedirectProps) {
  const { id } = await params;
  redirect(`/e/${id}`);
}
