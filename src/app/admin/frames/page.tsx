import { getBoothSettings } from '@/lib/settings';
import { FrameManager } from '@/components/admin/FrameManager';

export default async function AdminFramesPage() {
  const settings = await getBoothSettings();
  return <FrameManager settings={settings} />;
}
