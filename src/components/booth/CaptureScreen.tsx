'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BoothSettings, Slot } from '@/types';
import { startCamera, stopCamera, captureFrame } from '@/lib/booth/camera';
import { playCountdownBeep, playGoBeep, playShutter, playSuccess } from '@/lib/booth/audio';
import { formatAspectRatio } from '@/lib/booth/aspect';
import Link from 'next/link';

interface CaptureScreenProps {
  settings: BoothSettings;
  onComplete: (photos: HTMLCanvasElement[]) => void;
  onCancel: () => void;
}

const COUNTDOWN_SECONDS = 5;
const RING_CIRCUMFERENCE = 314; // 2 * π * 50

export function CaptureScreen({ settings, onComplete, onCancel }: CaptureScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);

  const [currentShot, setCurrentShot] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedThumbs, setCapturedThumbs] = useState<string[]>([]);
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const activeSlots = settings.activeFrame?.slots || [];
  const sortedSlots = [...activeSlots].sort((a, b) => a.slot_index - b.slot_index);
  const totalShots = sortedSlots.length;

  const capturedCanvasesRef = useRef<HTMLCanvasElement[]>([]);
  const isRunningRef = useRef(false);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const runSequence = useCallback(async () => {
    if (isRunningRef.current || totalShots === 0) return;
    isRunningRef.current = true;
    capturedCanvasesRef.current = [];

    await sleep(600);

    for (let shot = 0; shot < totalShots; shot++) {
      if (!isRunningRef.current) return;

      const slot = sortedSlots[shot];
      setActiveSlot(slot);
      setCurrentShot(shot);

      for (let n = COUNTDOWN_SECONDS; n >= 1; n--) {
        if (!isRunningRef.current) return;
        setCountdown(n);
        if (n > 1) {
          playCountdownBeep();
        } else {
          playGoBeep();
        }
        await sleep(1000);
      }

      if (!isRunningRef.current) return;

      // Smile state
      setCountdown(0);
      await sleep(350);

      if (!isRunningRef.current || !videoRef.current) return;

      // Capture frame
      const canvas = captureFrame(videoRef.current, settings.mirrorCamera !== false);
      capturedCanvasesRef.current.push(canvas);

      // Flash & shutter sound
      playShutter();
      if (flashRef.current) {
        flashRef.current.classList.add('active');
        setTimeout(() => flashRef.current?.classList.remove('active'), 350);
      }

      setCapturedThumbs((prev) => [...prev, canvas.toDataURL('image/jpeg', 0.5)]);

      if (shot < totalShots - 1) {
        setCountdown(null);
        await sleep(1200);
      }
    }

    if (!isRunningRef.current) return;

    playSuccess();
    await sleep(600);
    isRunningRef.current = false;
    onComplete(capturedCanvasesRef.current);
  }, [totalShots, sortedSlots, settings.mirrorCamera, onComplete]);

  useEffect(() => {
    let active = true;

    async function init() {
      if (totalShots === 0) return;
      try {
        const stream = await startCamera(settings.cameraDeviceId, settings.cameraResolution);
        if (!active || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        runSequence();
      } catch (err: unknown) {
        if (active) {
          setCameraError((err as Error).message);
        }
      }
    }

    init();

    return () => {
      active = false;
      isRunningRef.current = false;
      stopCamera();
    };
  }, [settings.cameraDeviceId, settings.cameraResolution, totalShots, runSequence]);

  const handleCancel = () => {
    isRunningRef.current = false;
    stopCamera();
    onCancel();
  };

  if (totalShots === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6 z-20">
        <div className="glass-card max-w-md w-full p-8 rounded-3xl text-center flex flex-col items-center gap-4">
          <span className="text-5xl">🖼️</span>
          <h2 className="text-2xl font-bold">Frame Setup Required</h2>
          <p className="text-zinc-400 text-sm">
            No active frame is selected, or the frame has no photo slots defined.
          </p>
          <div className="flex gap-3 mt-4">
            <Link href="/admin/frames" className="btn btn-primary btn-sm">
              ⚙ Open Admin
            </Link>
            <button onClick={handleCancel} className="btn btn-secondary btn-sm">
              🏠 Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = countdown !== null && countdown > 0 ? (COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS : 1;
  const strokeOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div className="absolute inset-0 flex flex-col md:flex-row items-center justify-between p-4 md:p-8 z-20 gap-6">
      {/* Video Viewport Stage */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        <div
          className="relative max-w-full max-h-[82vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black flex items-center justify-center"
          style={{
            aspectRatio: activeSlot ? `${activeSlot.w} / ${activeSlot.h}` : '4 / 3',
            width: 'auto',
            height: '100%',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{
              transform: settings.mirrorCamera !== false ? 'scaleX(-1)' : 'none',
            }}
          />

          {/* Shutter flash overlay */}
          <div ref={flashRef} className="camera-flash-overlay" />

          {/* Aspect ratio badge */}
          {activeSlot && (
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-medium text-white/80 border border-white/10">
              {formatAspectRatio(activeSlot.w, activeSlot.h)}
            </div>
          )}

          {/* Countdown timer overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-black/20">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 108 108">
                  <circle
                    cx="54"
                    cy="54"
                    r="50"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="54"
                    cy="54"
                    r="50"
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="6"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <span className="absolute font-bold text-5xl text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                  {countdown === 0 ? '😊' : countdown}
                </span>
              </div>
              <div className="mt-3 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-sm font-semibold text-purple-200">
                {countdown === 0 ? 'SMILE! 📸' : 'Get ready...'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar with Shot Tracker & Cancel */}
      <div className="flex md:flex-col items-center justify-between gap-4 md:w-56 glass p-4 md:p-6 rounded-3xl shrink-0">
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
            Shot {currentShot + 1} of {totalShots}
          </div>
        </div>

        {/* Shot thumbnails */}
        <div className="flex md:flex-col gap-3.5 my-auto overflow-x-auto md:overflow-visible">
          {sortedSlots.map((s, idx) => {
            const thumb = capturedThumbs[idx];
            const isCurrent = idx === currentShot;
            return (
              <div
                key={idx}
                className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center ${
                  thumb
                    ? 'border-purple-400/80 shadow-md'
                    : isCurrent
                    ? 'border-sky-400 bg-sky-500/10 shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                    : 'border-white/10 bg-white/5 opacity-50'
                }`}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt={`Shot ${idx + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-lg text-zinc-400">{idx + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={handleCancel} className="btn btn-secondary btn-sm w-full">
          🏠 Cancel
        </button>
      </div>

      {/* Error state */}
      {cameraError && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-6 z-50">
          <div className="glass-card max-w-md p-6 rounded-3xl text-center">
            <h3 className="text-xl font-bold text-red-400 mb-2">Camera Error</h3>
            <p className="text-xs text-zinc-300 whitespace-pre-line mb-4">{cameraError}</p>
            <button onClick={handleCancel} className="btn btn-secondary btn-sm">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
