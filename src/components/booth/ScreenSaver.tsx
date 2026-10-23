'use client';

import React from 'react';
import { BoothSettings } from '@/types';
import Link from 'next/link';

interface ScreenSaverProps {
  settings: BoothSettings;
  onStart: () => void;
}

export function ScreenSaver({ settings, onStart }: ScreenSaverProps) {
  const hasActiveSlots = (settings.activeFrame?.slots?.length ?? 0) > 0;

  return (
    <div
      onClick={onStart}
      className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden z-10"
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 30% 40%, rgba(192,132,252,0.22) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 70% 60%, rgba(244,114,182,0.18) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 50% 80%, rgba(56,189,248,0.14) 0%, transparent 60%)',
          animation: 'bgPulse 8s ease-in-out infinite alternate',
        }}
      />

      {/* Floating decorative frames */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm pointer-events-none animate-pulse"
            style={{
              width: `${100 + i * 20}px`,
              height: `${(100 + i * 20) * 1.35}px`,
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 22}%`,
              transform: `rotate(${((i % 2 === 0 ? 1 : -1) * (i * 7)) % 30}deg)`,
              opacity: 0.25,
            }}
          />
        ))}
      </div>

      {/* Brand logo & titles */}
      <div className="relative z-10 flex flex-col items-center text-center gap-4 px-6 max-w-4xl">
        {settings.brandLogoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.brandLogoDataUrl}
            alt="Brand Logo"
            className="max-w-[220px] max-h-[110px] object-contain drop-shadow-[0_0_30px_rgba(192,132,252,0.6)] mb-2"
          />
        )}

        <h1
          className="text-6xl md:text-8xl lg:text-9xl font-bold font-display text-hero-gradient drop-shadow-[0_0_35px_rgba(192,132,252,0.5)] tracking-tight leading-none"
          style={{ animation: 'floatText 4s ease-in-out infinite' }}
        >
          {settings.eventTitle || 'Mingle Booth'}
        </h1>

        <p className="text-sm md:text-lg tracking-[0.2em] uppercase font-light text-zinc-400 mt-1">
          {settings.eventSubtitle || 'Capture Your Memories'}
        </p>

        {/* Start Tap prompt */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <div
            className="w-28 h-28 rounded-full border-2 border-purple-400/50 flex items-center justify-center bg-purple-500/10 backdrop-blur-md"
            style={{ animation: 'ringPulse 2.5s ease-in-out infinite' }}
          >
            <span className="text-4xl">📸</span>
          </div>
          <span className="text-sm md:text-base font-medium text-purple-200/90 tracking-wide">
            Touch Anywhere to Start
          </span>
        </div>

        {/* Warning pill if no frame or frame has no slots */}
        {!hasActiveSlots && (
          <Link
            href="/admin/frames"
            onClick={(e) => e.stopPropagation()}
            className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition-all shadow-lg"
          >
            <span>⚠️ No active frame with slots · Click for Admin</span>
          </Link>
        )}
      </div>
    </div>
  );
}
