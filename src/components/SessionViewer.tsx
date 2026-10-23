'use client';

import React from 'react';
import { useToast } from '@/components/ui/Toast';

interface SessionViewerProps {
  title?: string;
  stripUrl?: string | null;
  gifUrl?: string | null;
  originalUrls?: string[];
  isCloud?: boolean;
}

export function SessionViewer({
  title = 'Mingle Booth',
  stripUrl,
  gifUrl,
  originalUrls = [],
  isCloud = true,
}: SessionViewerProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share && stripUrl) {
      try {
        await navigator.share({
          title,
          text: `Check out our photobooth photos from ${title}!`,
          url: stripUrl,
        });
      } catch {
        // Share dismissed
      }
    } else if (stripUrl) {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(stripUrl);
        toast('Link copied to clipboard!', 'success');
      }
    }
  };

  const hasPhotos = !!stripUrl || !!gifUrl || originalUrls.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f0ff] flex flex-col items-center py-10 px-4 md:px-8 gap-8 font-sans overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-2 max-w-lg">
        <h1 className="text-3xl md:text-5xl font-bold text-hero-gradient font-sans">
          📸 {title}
        </h1>
        <p className="text-xs md:text-sm text-zinc-400 tracking-wide">
          Your photo session memories
        </p>
        {isCloud && (
          <span className="mt-1 text-xs px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 font-medium">
            ☁️ Stored in Cloud
          </span>
        )}
      </div>

      {!hasPhotos && (
        <div className="my-auto text-center p-8 glass rounded-3xl max-w-sm">
          <p className="text-zinc-400 text-sm">
            No photos found in this session yet. Visit the booth to take some photos!
          </p>
        </div>
      )}

      {/* Photo Strip Section */}
      {stripUrl && (
        <section className="w-full max-w-md flex flex-col items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">
            Photo Strip
          </span>
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stripUrl} alt="Photo Strip" className="w-full h-auto block" />
          </div>
          <div className="flex gap-3 w-full mt-2">
            <a
              href={stripUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={!isCloud ? `${title}-strip.jpg` : undefined}
              className="btn btn-primary btn-sm flex-1 text-center"
            >
              ⬇ Download Strip
            </a>
            <button onClick={handleShare} className="btn btn-secondary btn-sm px-4">
              ↗ Share
            </button>
          </div>
        </section>
      )}

      {/* Animated GIF Section */}
      {gifUrl && (
        <section className="w-full max-w-md flex flex-col items-center gap-3 mt-4">
          <div className="w-full h-px bg-white/10 mb-4" />
          <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">
            Animated GIF
          </span>
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gifUrl} alt="Animated GIF" className="w-full h-auto block" />
          </div>
          <a
            href={gifUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={!isCloud ? `${title}-animated.gif` : undefined}
            className="btn btn-secondary btn-sm w-full text-center mt-2"
          >
            ⬇ Download GIF
          </a>
        </section>
      )}

      {/* Originals Grid */}
      {originalUrls.length > 0 && (
        <section className="w-full max-w-xl flex flex-col items-center gap-3 mt-4">
          <div className="w-full h-px bg-white/10 mb-4" />
          <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">
            Original Photos ({originalUrls.length})
          </span>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
            {originalUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-4/3 rounded-xl overflow-hidden border border-white/10 shadow-md bg-black transition-transform hover:scale-[1.02]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-semibold">
                  Open ↗
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-8 text-xs text-zinc-600">
        Powered by Mingle Booth
      </footer>
    </div>
  );
}
