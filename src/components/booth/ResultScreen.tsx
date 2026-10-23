'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BoothSettings } from '@/types';
import { drawQRCode } from '@/lib/booth/qr';
import { downloadDataUrl } from '@/lib/booth/composite';
import { useToast } from '@/components/ui/Toast';

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

export function ResultScreen({ settings, result, onRetake, onHome }: ResultScreenProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const { toast } = useToast();

  const finalViewerUrl =
    result.viewerUrl ||
    (typeof window !== 'undefined' ? `${window.location.origin}/s/${result.sessionId}` : '');

  // Auto-return timer to keep booth ready for next guest
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, onHome]);

  useEffect(() => {
    if (qrCanvasRef.current && finalViewerUrl) {
      drawQRCode(qrCanvasRef.current, finalViewerUrl, {
        width: 200,
        darkColor: '#12121a',
        lightColor: '#ffffff',
      }).catch(console.warn);
    }
  }, [finalViewerUrl]);

  const handleDownloadStrip = () => {
    if (result.cloudStripUrl) {
      window.open(result.cloudStripUrl, '_blank');
      toast('Opening strip in new tab — save or share!', 'success');
    } else {
      downloadDataUrl(result.stripDataUrl, `mingle-booth-strip-${result.sessionId}.jpg`);
      toast('Photo strip downloaded!', 'success');
    }
  };

  const handleDownloadGif = () => {
    if (result.cloudGifUrl) {
      window.open(result.cloudGifUrl, '_blank');
      toast('Opening GIF in new tab!', 'success');
    } else if (result.gifBlob) {
      const url = URL.createObjectURL(result.gifBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mingle-booth-${result.sessionId}.gif`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast('GIF downloaded!', 'success');
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between p-4 md:p-8 z-20 overflow-y-auto">
      {/* Header */}
      <div className="text-center my-2">
        <h2 className="text-3xl md:text-4xl font-bold font-sans text-hero-gradient">
          Your Photos Are Ready! 🎉
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Scan the QR code to view & download on your mobile device
        </p>
        {result.cloudStripUrl && (
          <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300">
            ☁️ Stored securely in cloud
          </span>
        )}
      </div>

      {/* Main Content Showcase */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 max-w-5xl w-full my-auto">
        {/* Strip preview */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Photo Strip</span>
          <div className="max-h-[55vh] md:max-h-[62vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.stripDataUrl}
              alt="Photo Strip"
              className="h-full w-auto max-h-[55vh] md:max-h-[62vh] object-contain"
            />
          </div>
        </div>

        {/* Side Column: GIF + QR Code */}
        <div className="flex flex-col items-center gap-6">
          {/* GIF Preview */}
          {result.gifDataUrl && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Animated GIF</span>
              <div className="w-56 h-40 md:w-64 md:h-48 rounded-2xl overflow-hidden shadow-xl border border-white/10 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.gifDataUrl}
                  alt="Animated GIF"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* QR Code Card */}
          <div className="glass p-5 rounded-3xl flex flex-col items-center text-center shadow-xl border border-white/10">
            <span className="text-xs font-semibold text-purple-300 mb-2">📱 Scan to Download</span>
            <div className="bg-white p-2.5 rounded-2xl shadow-inner">
              <canvas ref={qrCanvasRef} width={200} height={200} className="w-40 h-40 block" />
            </div>
            <p className="text-[11px] text-zinc-400 max-w-[180px] mt-2">
              Point phone camera at the QR code to open your photos
            </p>
            <div className="flex gap-2 mt-3 w-full">
              <button onClick={handleDownloadStrip} className="btn btn-secondary btn-sm flex-1 text-xs">
                ⬇ Strip
              </button>
              {result.gifDataUrl && (
                <button onClick={handleDownloadGif} className="btn btn-secondary btn-sm flex-1 text-xs">
                  ⬇ GIF
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 mb-2">
        <button onClick={onRetake} className="btn btn-primary btn-lg shadow-xl w-full sm:w-auto">
          Take More Photos 📸
        </button>
        <button onClick={onHome} className="btn btn-secondary btn-lg w-full sm:w-auto">
          Back to Start 🏠
        </button>
      </div>

      {/* Auto-return timer note */}
      <div className="text-[11px] text-zinc-400 flex items-center gap-2 mb-2">
        <span>Returning to start in {secondsLeft}s</span>
        <button
          type="button"
          onClick={() => setIsPaused((p) => !p)}
          className="text-purple-300 hover:text-purple-200 underline font-medium"
        >
          {isPaused ? 'Resume timer' : 'Pause timer'}
        </button>
      </div>
    </div>
  );
}
