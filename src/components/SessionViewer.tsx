'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/Toast';

interface SessionViewerProps {
  title?: string;
  stripUrl?: string | null;
  gifUrl?: string | null;
  originalUrls?: string[];
  isCloud?: boolean;
}

export function SessionViewer({
  title = 'Mingle Booth by Kala Kini',
  stripUrl,
  gifUrl,
  originalUrls = [],
}: SessionViewerProps) {
  const { toast } = useToast();
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  const downloadAsset = async (url: string, filename: string) => {
    try {
      setDownloadingUrl(url);
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast('Download started!', 'success');
    } catch {
      window.open(url, '_blank');
    } finally {
      setDownloadingUrl(null);
    }
  };

  const handleShare = async (urlToShare?: string) => {
    const url = urlToShare || stripUrl;
    if (!url) return;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Check out our photobooth photos from ${title}!`,
          url,
        });
      } catch {
        // Share dismissed
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast('Link copied to clipboard!', 'success');
    }
  };

  const hasPhotos = !!stripUrl || !!gifUrl || originalUrls.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f0ff] flex flex-col items-center py-6 px-3 sm:px-6 font-sans overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-1.5 max-w-md w-full mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-hero-gradient font-sans">
          📸 {title}
        </h1>
        <p className="text-xs text-zinc-400">
          Your photo session memories
        </p>
      </div>

      {!hasPhotos && (
        <div className="my-auto text-center p-8 glass rounded-3xl max-w-sm mt-8">
          <p className="text-zinc-400 text-sm">
            No photos found in this session yet. Visit the booth to take some photos!
          </p>
        </div>
      )}

      {hasPhotos && (
        <div className="w-full max-w-4xl flex flex-col md:flex-row items-center md:items-start justify-center gap-6">
          {/* Column 1: Photo Strip */}
          {stripUrl && (
            <div className="w-full max-w-sm flex flex-col items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold self-start sm:self-center">
                🎞️ Photo Strip
              </span>
              <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black flex items-center justify-center p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stripUrl}
                  alt="Photo Strip"
                  className="w-full h-auto max-h-[70vh] object-contain rounded-xl block"
                />
              </div>
              <div className="flex gap-2.5 w-full">
                <button
                  type="button"
                  disabled={downloadingUrl === stripUrl}
                  onClick={() => downloadAsset(stripUrl, `photo-strip.jpg`)}
                  className="btn btn-primary btn-sm flex-1 text-center text-xs py-2.5"
                >
                  {downloadingUrl === stripUrl ? '⏳ Downloading…' : '⬇ Download Strip'}
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(stripUrl)}
                  className="btn btn-secondary btn-sm px-4 text-xs"
                >
                  ↗ Share
                </button>
              </div>
            </div>
          )}

          {/* Column 2: Animated GIF & Single Photos */}
          <div className="w-full max-w-md flex flex-col gap-6">
            {/* Animated GIF Card */}
            {gifUrl && (
              <div className="w-full flex flex-col gap-2.5">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                  🎬 Animated GIF
                </span>
                <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-white/10 bg-black flex items-center justify-center p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gifUrl}
                    alt="Animated GIF"
                    className="w-full h-auto max-h-[40vh] object-contain rounded-xl block"
                  />
                </div>
                <button
                  type="button"
                  disabled={downloadingUrl === gifUrl}
                  onClick={() => downloadAsset(gifUrl, `animated-photo.gif`)}
                  className="btn btn-secondary btn-sm w-full text-xs py-2"
                >
                  {downloadingUrl === gifUrl ? '⏳ Downloading…' : '⬇ Download GIF'}
                </button>
              </div>
            )}

            {/* Single Photos Grid */}
            {originalUrls.length > 0 && (
              <div className="w-full flex flex-col gap-2.5">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                  📷 Individual Photos ({originalUrls.length})
                </span>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {originalUrls.map((url, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-1.5 p-2 rounded-2xl bg-white/5 border border-white/10 shadow-sm"
                    >
                      <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Photo ${i + 1}`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={downloadingUrl === url}
                        onClick={() => downloadAsset(url, `photo-${i + 1}.jpg`)}
                        className="btn btn-secondary btn-sm text-[11px] py-1.5 w-full"
                      >
                        {downloadingUrl === url ? '⏳ Saving…' : `⬇ Save Photo ${i + 1}`}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="mt-10 pb-4 text-[11px] text-zinc-500 text-center">
        Powered by Mingle Booth by Kala Kini
      </footer>
    </div>
  );
}
