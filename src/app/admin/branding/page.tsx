import { getBoothSettings } from '@/lib/settings';
import { BrandingForm } from '@/components/admin/BrandingForm';

export default async function AdminBrandingPage() {
  const settings = await getBoothSettings();
  return <BrandingForm settings={settings} />;
}
