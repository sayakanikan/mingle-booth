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
      {/* Background warm ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 65% 65% at 35% 35%, rgba(226,74,33,0.22) 0%, transparent 65%), radial-gradient(ellipse 55% 55% at 68% 65%, rgba(241,123,84,0.16) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 50% 85%, rgba(229,169,60,0.12) 0%, transparent 60%)',
          animation: 'bgPulse 8s ease-in-out infinite alternate',
        }}
      />

      {/* Floating decorative photo strip silhouettes referencing Kala Kini logo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { w: 125, h: 230, x: 7, y: 14, rot: -12, delay: '0s', grad: 'from-[#e24a21]/15 to-[#f17b54]/5' },
          { w: 145, h: 270, x: 80, y: 8, rot: 14, delay: '1.2s', grad: 'from-[#f17b54]/15 to-[#e5a93c]/5' },
          { w: 115, h: 210, x: 10, y: 64, rot: 9, delay: '2.4s', grad: 'from-[#e5a93c]/15 to-[#e24a21]/5' },
          { w: 155, h: 290, x: 76, y: 56, rot: -10, delay: '0.8s', grad: 'from-[#e24a21]/15 to-[#f17b54]/5' },
        ].map((item, i) => (
          <div
            key={i}
            className={`absolute rounded-2xl border border-[#faf6ee]/15 bg-gradient-to-b ${item.grad} backdrop-blur-md p-2 shadow-2xl flex flex-col gap-1.5`}
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
            {/* Faux photo frames inside strip matching retro strip icon */}
            <div className="flex-1 rounded-lg bg-[#faf6ee]/5 border border-[#faf6ee]/10" />
            <div className="flex-1 rounded-lg bg-[#faf6ee]/5 border border-[#faf6ee]/10" />
            <div className="flex-1 rounded-lg bg-[#faf6ee]/5 border border-[#faf6ee]/10" />
            <div className="h-3 rounded-full bg-[#faf6ee]/10 mx-auto w-10" />
          </div>
        ))}
      </div>

      {/* Brand logo & titles */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl">
        {/* Logo presentation */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={settings.brandLogoDataUrl || '/mingle-booth-logo.png'}
          alt="Mingle Booth by Kala Kini"
          className="max-w-[280px] sm:max-w-[500px] max-h-[500px] object-contain drop-shadow-[0_12px_40px_rgba(226,74,33,0.35)]"
          style={{ animation: 'floatText 4s ease-in-out infinite' }}
        />

        {/* <h1
          className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold font-display text-[#faf6ee] drop-shadow-[0_4px_30px_rgba(226,74,33,0.45)] tracking-tight leading-tight py-2"
          style={{ animation: 'floatText 4s ease-in-out infinite' }}
        >
          {settings.eventTitle || 'Mingle Booth'}
        </h1>

        <p className="text-xs sm:text-sm md:text-base tracking-[0.25em] uppercase font-light text-[#c8beb7] mt-1">
          {settings.eventSubtitle || 'by Kala Kini'}
        </p> */}

        {/* Start Tap prompt */}
        <div className="flex flex-col items-center">
          <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-[#e24a21]/20 border border-[#e24a21]/40 shadow-[0_0_25px_rgba(226,74,33,0.3)] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#e24a21]" />
            <span className="text-xs sm:text-sm font-semibold text-[#faf6ee] tracking-widest uppercase">
              Touch Anywhere to Start
            </span>
          </div>
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
