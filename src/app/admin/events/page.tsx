import { getEventsAction } from '@/actions/events';
import { EventsManager } from '@/components/admin/EventsManager';

export default async function AdminEventsPage() {
  const events = await getEventsAction();
  return <EventsManager initialEvents={events} />;
}
