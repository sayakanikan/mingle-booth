'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';

export interface GallerySessionPhoto {
  slotIndex: number;
  url: string;
}

export interface GallerySessionItem {
  id: string;
  layout: string;
  photoCount: number;
  stripUrl: string;
  gifUrl: string | null;
  viewerUrl: string | null;
  stripW: number;
  stripH: number;
  createdAt: string;
  photos: GallerySessionPhoto[];
}

export interface EventGalleryProps {
  event: {
    id: string;
    title: string;
    subtitle: string;
    brandLogoUrl?: string | null;
  };
  sessions: GallerySessionItem[];
}

export function EventGallery({ event, sessions }: EventGalleryProps) {
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'strip' | 'gif' | 'photos'>('all');

  const selectedIndex = useMemo(() => {
    if (!selectedSessionId) return -1;
    return sessions.findIndex((s) => s.id === selectedSessionId);
  }, [selectedSessionId, sessions]);

  const selectedSession = selectedIndex >= 0 ? sessions[selectedIndex] : null;

  // Navigate between sessions
  const goToNext = useCallback(() => {
    if (selectedIndex < sessions.length - 1) {
      setSelectedSessionId(sessions[selectedIndex + 1].id);
    }
  }, [selectedIndex, sessions]);

  const goToPrev = useCallback(() => {
    if (selectedIndex > 0) {
      setSelectedSessionId(sessions[selectedIndex - 1].id);
    }
  }, [selectedIndex, sessions]);

  // Keyboard navigation & escape listener
  useEffect(() => {
    if (!selectedSession) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedSessionId(null);
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSession, goToNext, goToPrev]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (selectedSession) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedSession]);

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

  const handleShare = async (url: string, title: string) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Check out our photo booth session from ${title}!`,
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

  return (
    <div className="min-h-screen bg-[#14100e] text-[#faf6ee] flex flex-col items-center py-6 px-3 sm:px-6 md:px-8 font-sans selection:bg-[#e24a21]/30">
      {/* Header */}
      <header className="flex flex-col items-center text-center max-w-2xl w-full mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.brandLogoUrl || '/mingle-booth-logo.png'}
          alt={event.title}
          className="w-32 sm:w-40 h-auto object-contain drop-shadow-[0_4px_20px_rgba(226,74,33,0.3)] mb-2"
        />
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-sans tracking-tight text-[#faf6ee]">
          {event.title}
        </h1>
        <p className="text-sm text-[#c8beb7] mt-1 font-medium tracking-wide">
          {event.subtitle || 'Photo Session Gallery'}
        </p>

        {/* Counter Badge */}
        <div className="flex items-center gap-3 mt-4 flex-wrap justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-[#faf6ee]">
            <span>📸</span>
            <span>
              {sessions.length} {sessions.length === 1 ? 'Photo Strip' : 'Photo Strips'}
            </span>
          </span>
        </div>
      </header>

      {/* Empty State */}
      {sessions.length === 0 ? (
        <div className="my-auto text-center p-10 glass rounded-3xl max-w-md w-full border border-white/10 flex flex-col items-center gap-3">
          <span className="text-4xl">📷</span>
          <h2 className="text-lg font-bold text-[#faf6ee]">No Photos Yet</h2>
          <p className="text-xs text-[#c8beb7] leading-relaxed">
            No photo sessions have been captured for this event yet. Visit the photo booth to take the first photos!
          </p>
        </div>
      ) : (
        /* Grid of Photostrips */
        <div className="w-full max-w-7xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
          {sessions.map((session) => {
            const formattedDate = session.createdAt
              ? new Date(session.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

            return (
              <div
                key={session.id}
                onClick={() => {
                  setSelectedSessionId(session.id);
                  setActiveTab('all');
                }}
                className="group relative rounded-2xl bg-white/5 border border-white/10 hover:border-[#e24a21]/50 p-2 sm:p-2.5 flex flex-col justify-between gap-2.5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(226,74,33,0.15)] shadow-md overflow-hidden"
              >
                {/* Strip thumbnail container */}
                <div className="relative w-full aspect-1/2 sm:aspect-9/16 rounded-xl overflow-hidden bg-black/90 flex items-center justify-center p-1 border border-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={session.stripUrl}
                    alt="Photo strip"
                    loading="lazy"
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Hover Overlay Hint */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center gap-1.5 backdrop-blur-[2px]">
                    <span className="w-9 h-9 rounded-full bg-[#e24a21] text-white flex items-center justify-center text-sm shadow-lg">
                      🔍
                    </span>
                    <span className="text-[11px] font-semibold text-white drop-shadow">
                      View Photos &amp; GIF
                    </span>
                  </div>

                  {/* Badges on top */}
                  <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-black/70 text-white backdrop-blur-sm border border-white/10">
                      {session.photoCount} shots
                    </span>
                    {session.gifUrl && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#e24a21]/80 text-white backdrop-blur-sm shadow-sm">
                        GIF
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer / Time info */}
                <div className="flex items-center justify-between px-1 text-[11px] text-[#c8beb7]">
                  <span className="font-medium text-white/90">{formattedDate}</span>
                  <span className="text-[10px] text-[#8e8179] group-hover:text-[#f17b54] transition-colors font-medium">
                    View ➔
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Full Strip, GIF, and Raw Photos */}
      {selectedSession && (
        <div
          onClick={() => setSelectedSessionId(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl max-h-[92vh] bg-[#1a1411] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[#faf6ee]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 shrink-0 bg-[#14100e]/70">
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm font-bold text-white">
                  Photo Session ({selectedIndex + 1} of {sessions.length})
                </span>
                <span className="text-[11px] text-[#8e8179] hidden sm:inline">
                  {selectedSession.createdAt
                    ? new Date(selectedSession.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : ''}
                </span>
              </div>

              {/* Controls: Prev, Next, Standalone Link, Close */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedIndex <= 0}
                  onClick={goToPrev}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors text-xs flex items-center gap-1 px-2.5"
                  title="Previous session (Left arrow)"
                >
                  <span>←</span>
                  <span className="hidden sm:inline">Prev</span>
                </button>
                <button
                  type="button"
                  disabled={selectedIndex >= sessions.length - 1}
                  onClick={goToNext}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors text-xs flex items-center gap-1 px-2.5"
                  title="Next session (Right arrow)"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span>→</span>
                </button>

                <Link
                  href={`/s/${selectedSession.id}`}
                  target="_blank"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white text-xs px-2.5 transition-colors hidden md:inline-flex items-center gap-1"
                  title="Open standalone viewer page"
                >
                  <span>🔗</span>
                  <span>Share Page</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setSelectedSessionId(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm w-8 h-8 flex items-center justify-center transition-colors ml-1"
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Mobile / Screen Tab Switcher */}
            <div className="flex items-center gap-1 px-4 py-2 bg-black/40 border-b border-white/5 shrink-0 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'all'
                    ? 'bg-[#e24a21] text-white shadow'
                    : 'text-[#c8beb7] hover:text-white hover:bg-white/5'
                }`}
              >
                All Assets
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('strip')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  activeTab === 'strip'
                    ? 'bg-[#e24a21] text-white shadow'
                    : 'text-[#c8beb7] hover:text-white hover:bg-white/5'
                }`}
              >
                <span>🎞️</span>
                <span>Photo Strip</span>
              </button>
              {selectedSession.gifUrl && (
                <button
                  type="button"
                  onClick={() => setActiveTab('gif')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                    activeTab === 'gif'
                      ? 'bg-[#e24a21] text-white shadow'
                      : 'text-[#c8beb7] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>🎬</span>
                  <span>GIF</span>
                </button>
              )}
              {selectedSession.photos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('photos')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                    activeTab === 'photos'
                      ? 'bg-[#e24a21] text-white shadow'
                      : 'text-[#c8beb7] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>📷</span>
                  <span>Raw Photos ({selectedSession.photos.length})</span>
                </button>
              )}
            </div>

            {/* Modal Body: Scrollable area showcasing Strip, GIF & Raw Photos */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
              <div
                className={`w-full ${
                  activeTab === 'all'
                    ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'
                    : 'flex flex-col items-center gap-6 max-w-2xl mx-auto'
                }`}
              >
                {/* 1. Photostrip Showcase */}
                {(activeTab === 'all' || activeTab === 'strip') && (
                  <div
                    className={`flex flex-col items-center gap-3 w-full ${
                      activeTab === 'all' ? 'lg:col-span-5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between w-full px-1">
                      <span className="text-xs uppercase tracking-wider text-[#faf6ee] font-semibold flex items-center gap-1.5">
                        🎞️ Full Photostrip
                      </span>
                    </div>

                    <div className="w-full rounded-2xl overflow-hidden bg-black/95 p-2 border border-white/15 shadow-2xl flex items-center justify-center ring-1 ring-[#e24a21]/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedSession.stripUrl}
                        alt="Full Photo Strip"
                        className="max-h-[60vh] w-auto max-w-full object-contain rounded-xl"
                      />
                    </div>

                    <div className="flex gap-2 w-full">
                      <button
                        type="button"
                        disabled={downloadingUrl === selectedSession.stripUrl}
                        onClick={() =>
                          downloadAsset(
                            selectedSession.stripUrl,
                            `photostrip-${selectedSession.id}.jpg`
                          )
                        }
                        className="btn btn-primary btn-sm flex-1 text-xs py-2.5 font-semibold"
                      >
                        {downloadingUrl === selectedSession.stripUrl
                          ? '⏳ Downloading…'
                          : '⬇ Download Strip'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleShare(
                            selectedSession.stripUrl,
                            `${event.title} Photo Strip`
                          )
                        }
                        className="btn btn-secondary btn-sm px-4 text-xs font-semibold"
                      >
                        ↗ Share
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. GIF and Raw Photos Showcase */}
                {(activeTab === 'all' || activeTab === 'gif' || activeTab === 'photos') && (
                  <div
                    className={`flex flex-col gap-6 w-full ${
                      activeTab === 'all' ? 'lg:col-span-7' : ''
                    }`}
                  >
                    {/* Animated GIF Card */}
                    {(activeTab === 'all' || activeTab === 'gif') && selectedSession.gifUrl && (
                      <div className="flex flex-col gap-2.5 w-full">
                        <span className="text-xs uppercase tracking-wider text-[#faf6ee] font-semibold flex items-center gap-1.5">
                          🎬 Animated GIF
                        </span>
                        <div className="w-full rounded-2xl overflow-hidden bg-black/95 p-2 border border-white/15 shadow-xl flex items-center justify-center ring-1 ring-[#f17b54]/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedSession.gifUrl}
                            alt="Animated GIF"
                            className="max-h-[36vh] w-auto max-w-full object-contain rounded-xl"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={downloadingUrl === selectedSession.gifUrl}
                          onClick={() =>
                            downloadAsset(
                              selectedSession.gifUrl!,
                              `animated-gif-${selectedSession.id}.gif`
                            )
                          }
                          className="btn btn-primary btn-sm w-full text-xs py-2.5 font-semibold"
                        >
                          {downloadingUrl === selectedSession.gifUrl
                            ? '⏳ Downloading…'
                            : '⬇ Download Animated GIF'}
                        </button>
                      </div>
                    )}

                    {/* Raw Photos Grid */}
                    {(activeTab === 'all' || activeTab === 'photos') &&
                      selectedSession.photos.length > 0 && (
                        <div className="flex flex-col gap-2.5 w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wider text-[#faf6ee] font-semibold flex items-center gap-1.5">
                              📷 Raw Camera Photos ({selectedSession.photos.length})
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                            {selectedSession.photos.map((photo, i) => (
                              <div
                                key={photo.slotIndex ?? i}
                                className="flex flex-col gap-1.5 p-2 rounded-2xl bg-white/5 border border-white/10 shadow-sm"
                              >
                                <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-black">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={photo.url}
                                    alt={`Raw photo ${i + 1}`}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <button
                                  type="button"
                                  disabled={downloadingUrl === photo.url}
                                  onClick={() =>
                                    downloadAsset(
                                      photo.url,
                                      `photo-${selectedSession.id}-${i + 1}.jpg`
                                    )
                                  }
                                  className="btn btn-secondary btn-sm text-[11px] py-1.5 w-full hover:border-[#e24a21]"
                                >
                                  {downloadingUrl === photo.url
                                    ? '⏳ Saving…'
                                    : `⬇ Save Photo ${i + 1}`}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 border-t border-white/10 bg-[#14100e]/80 flex items-center justify-between text-xs text-[#8e8179]">
              <span>Use ← and → arrow keys to switch sessions</span>
              <button
                type="button"
                onClick={() => setSelectedSessionId(null)}
                className="text-xs text-white hover:text-[#f17b54] font-medium"
              >
                Close ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Footer */}
      <footer className="mt-12 pb-6 text-xs text-[#8e8179] text-center tracking-wider">
        Mingle Booth by Kala Kini
      </footer>
    </div>
  );
}
