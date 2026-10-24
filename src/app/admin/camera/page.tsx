import { getBoothSettings } from '@/lib/settings';
import { CameraForm } from '@/components/admin/CameraForm';

export default async function AdminCameraPage() {
  const settings = await getBoothSettings();
  return <CameraForm settings={settings} />;
}
