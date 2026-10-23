import { getSessionsAction } from '@/actions/sessions';
import { GalleryGrid } from '@/components/admin/GalleryGrid';

export default async function AdminGalleryPage() {
  const sessions = await getSessionsAction(100);
  return <GalleryGrid initialSessions={sessions} />;
}
