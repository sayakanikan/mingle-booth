'use client';

import React from 'react';
import { BoothSettings } from '@/types';
import Link from 'next/link';

interface ScreenSaverProps {
  settings: BoothSettings;
  onStart: () => void;
}

export function ScreenSaver({ settings, onStart }: ScreenSaverProps) {
  const hasActiveEvent = settings.hasActiveEvent !== false;
  const hasActiveSlots = (settings.activeFrame?.slots?.length ?? 0) > 0;

  const handleStart = () => {
    if (!hasActiveEvent) {
      window.location.href = '/admin/events';
      return;
    }
    onStart();
  };

  return (
    <div
      onClick={handleStart}
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

      {/* Floating decorative photo strip silhouettes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { w: 120, h: 220, x: 8, y: 15, rot: -12, delay: '0s', grad: 'from-purple-500/10 to-pink-500/5' },
          { w: 140, h: 260, x: 78, y: 10, rot: 15, delay: '1.2s', grad: 'from-pink-500/10 to-amber-500/5' },
          { w: 110, h: 200, x: 12, y: 62, rot: 8, delay: '2.4s', grad: 'from-sky-500/10 to-purple-500/5' },
          { w: 150, h: 280, x: 75, y: 55, rot: -9, delay: '0.8s', grad: 'from-purple-500/10 to-sky-500/5' },
        ].map((item, i) => (
          <div
            key={i}
            className={`absolute rounded-2xl border border-white/10 bg-gradient-to-b ${item.grad} backdrop-blur-md p-2 shadow-2xl flex flex-col gap-1.5`}
            style={{
              width: `${item.w}px`,
              height: `${item.h}px`,
              left: `${item.x}%`,
              top: `${item.y}%`,
              animation: `floatSlow 7s ease-in-out infinite alternate ${item.delay}`,
              // @ts-expect-error CSS variable for keyframes
              '--rot': `${item.rot}deg`,
            }}
          >
            {/* Faux photo frames inside strip */}
            <div className="flex-1 rounded-lg bg-white/5 border border-white/5" />
            <div className="flex-1 rounded-lg bg-white/5 border border-white/5" />
            <div className="flex-1 rounded-lg bg-white/5 border border-white/5" />
            <div className="h-4 rounded bg-white/5 mx-auto w-12" />
          </div>
        ))}
      </div>

      {/* Brand logo & titles */}
      <div className="relative z-10 flex flex-col items-center text-center gap-3 px-6 max-w-4xl">
        {settings.brandLogoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.brandLogoDataUrl}
            alt="Brand Logo"
            className="max-w-[200px] max-h-[100px] object-contain drop-shadow-[0_0_30px_rgba(192,132,252,0.6)] mb-2"
          />
        )}

        <h1
          className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold font-display text-hero-gradient drop-shadow-[0_0_40px_rgba(192,132,252,0.55)] tracking-tight leading-tight py-2"
          style={{ animation: 'floatText 4s ease-in-out infinite' }}
        >
          {settings.eventTitle || 'Mingle Booth'}
        </h1>

        <p className="text-xs sm:text-sm md:text-base tracking-[0.25em] uppercase font-light text-zinc-300/90 mt-1">
          {settings.eventSubtitle || 'by Kala Kini'}
        </p>

        {/* Start Tap prompt */}
        <div className="mt-8 sm:mt-12 flex flex-col items-center">
          <span className="text-xs sm:text-sm font-medium text-purple-200 tracking-widest uppercase animate-pulse">
            Touch Anywhere to Start
          </span>
        </div>

        {/* Warning pill if no event is active or no frame has slots */}
        {!hasActiveEvent ? (
          <Link
            href="/admin/events"
            onClick={(e) => e.stopPropagation()}
            className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition-all shadow-lg"
          >
            <span>⚠️ No active event selected · Click for Admin Events</span>
          </Link>
        ) : !hasActiveSlots ? (
          <Link
            href="/admin/frames"
            onClick={(e) => e.stopPropagation()}
            className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition-all shadow-lg"
          >
            <span>⚠️ No active frame with slots · Click for Admin Frames</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
