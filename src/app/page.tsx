import { getBoothSettings } from '@/lib/settings';
import { Booth } from '@/components/booth/Booth';
import { SessionViewer } from '@/components/SessionViewer';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  // Backward compatibility with legacy QR format: ?view=latest&strip=...
  if (params.view === 'latest') {
    const strip = typeof params.strip === 'string' ? params.strip : undefined;
    const gif = typeof params.gif === 'string' ? params.gif : undefined;
    const title = typeof params.title === 'string' ? params.title : 'Mingle Booth';
    const originalsRaw = typeof params.originals === 'string' ? params.originals : '';

    let originals: string[] = [];
    try {
      originals = JSON.parse(originalsRaw);
    } catch {
      originals = originalsRaw ? originalsRaw.split(',') : [];
    }

    return (
      <SessionViewer
        title={title}
        stripUrl={strip}
        gifUrl={gif}
        originalUrls={originals}
        isCloud={!!strip}
      />
    );
  }

  const settings = await getBoothSettings();

  return <Booth initialSettings={settings} />;
}
