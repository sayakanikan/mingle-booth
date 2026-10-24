'use client';

import React, { useEffect, useRef } from 'react';
import { BoothSettings } from '@/types';
import { drawQRCode } from '@/lib/booth/qr';

interface ResultScreenProps {
  settings: BoothSettings;
  result: {
    stripCanvas: HTMLCanvasElement;
    stripDataUrl: string;
    gifDataUrl: string | null;
    gifBlob: Blob | null;
    sessionId: string;
    cloudStripUrl?: string | null;
    cloudGifUrl?: string | null;
    viewerUrl?: string | null;
  };
  onRetake: () => void;
  onHome: () => void;
}

export function ResultScreen({ result, onRetake, onHome }: ResultScreenProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const finalViewerUrl =
    result.viewerUrl ||
    (typeof window !== 'undefined' ? `${window.location.origin}/s/${result.sessionId}` : '');

  useEffect(() => {
    if (qrCanvasRef.current && finalViewerUrl) {
      drawQRCode(qrCanvasRef.current, finalViewerUrl, {
        width: 200,
        darkColor: '#12121a',
        lightColor: '#ffffff',
      }).catch(console.warn);
    }
  }, [finalViewerUrl]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between p-3 sm:p-5 z-20 overflow-hidden select-none w-full h-full">
      {/* Header */}
      <div className="text-center pt-1 pb-1 shrink-0 w-full">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-sans text-hero-gradient">
          Your Photos Are Ready! 🎉
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
          Scan the QR code with your phone camera to view &amp; save your memories
        </p>
      </div>

      {/* Main Content Showcase: 3-column balanced grid with QR Code as the absolute center hero */}
      <div className="w-full max-w-[1440px] flex-1 grid grid-cols-3 items-center gap-4 sm:gap-6 lg:gap-8 min-h-0 px-2 sm:px-6 my-auto">
        {/* Left Column: Photo Strip Preview */}
        <div className="flex flex-col items-center justify-center gap-2 h-full min-h-0 w-full">
          <span className="text-xs uppercase tracking-wider text-zinc-300 font-semibold shrink-0 flex items-center gap-1.5">
            🎞️ Photo Strip
          </span>
          <div className="h-full max-h-[66vh] rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black flex items-center justify-center p-1.5 ring-1 ring-purple-500/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.stripDataUrl}
              alt="Photo Strip"
              className="max-h-full max-w-full w-auto object-contain rounded-xl block"
            />
          </div>
        </div>

        {/* Center Column: The Hero QR Code Card (Dead Center) */}
        <div className="flex flex-col items-center justify-center gap-2 h-full min-h-0 w-full z-10">
          <div className="glass p-6 sm:p-7 rounded-3xl flex flex-col items-center text-center shadow-2xl border border-purple-500/30 ring-1 ring-purple-400/20 w-full max-w-sm">
            <span className="text-base sm:text-lg font-bold text-hero-gradient mb-3 flex items-center gap-2">
              📱 Scan to Download
            </span>
            <div className="bg-white p-3 rounded-2xl shadow-2xl ring-4 ring-purple-400/30">
              <canvas
                ref={qrCanvasRef}
                width={200}
                height={200}
                className="w-40 h-40 sm:w-48 sm:h-48 md:w-52 md:h-52 block"
              />
            </div>
            <p className="text-xs text-zinc-300 max-w-[240px] mt-4 leading-relaxed font-medium">
              Point your phone camera here to download your strip, GIF, and photos
            </p>
          </div>
        </div>

        {/* Right Column: Animated GIF Preview (if available) */}
        <div className="flex flex-col items-center justify-center gap-2 h-full min-h-0 w-full">
          {result.gifDataUrl ? (
            <>
              <span className="text-xs uppercase tracking-wider text-zinc-300 font-semibold shrink-0 flex items-center gap-1.5">
                🎬 Animated GIF
              </span>
              <div className="w-full max-h-[66vh] flex items-center justify-center">
                <div className="w-full max-w-[320px] sm:max-w-[360px] aspect-4/3 rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black ring-1 ring-pink-500/20 p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.gifDataUrl}
                    alt="Animated GIF"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-center gap-4 pt-2 pb-1 shrink-0 w-full">
        <button
          type="button"
          onClick={onRetake}
          className="btn btn-primary btn-md shadow-xl px-8 py-2.5 text-xs sm:text-sm font-semibold"
        >
          Take More Photos 📸
        </button>
        <button
          type="button"
          onClick={onHome}
          className="btn btn-secondary btn-md px-7 py-2.5 text-xs sm:text-sm font-semibold"
        >
          Back to Start 🏠
        </button>
      </div>
    </div>
  );
}
