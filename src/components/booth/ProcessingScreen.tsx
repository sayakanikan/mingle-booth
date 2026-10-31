'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BoothSettings, SessionPhotoData } from '@/types';
import { composeStripFromFrame, canvasToDataUrl } from '@/lib/booth/composite';
import { buildGif } from '@/lib/booth/gifmaker';
import { isCloudinaryConfigured, uploadSession } from '@/lib/booth/cloudinary';
import { saveSessionAction } from '@/actions/sessions';

interface ProcessingScreenProps {
  photos: HTMLCanvasElement[];
  settings: BoothSettings;
  onComplete: (result: {
    stripCanvas: HTMLCanvasElement;
    stripDataUrl: string;
    gifDataUrl: string | null;
    gifBlob: Blob | null;
    sessionId: string;
    cloudStripUrl?: string | null;
    cloudGifUrl?: string | null;
    viewerUrl?: string | null;
  }) => void;
  onError: (msg: string) => void;
}

export function ProcessingScreen({ photos, settings, onComplete, onError }: ProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const ranRef = useRef(false);

  const steps = [
    { icon: '🖼️', label: 'Composing photo strip' },
    { icon: '🎞️', label: 'Generating animated GIF' },
    { icon: '☁️', label: 'Uploading to cloud' },
    { icon: '📱', label: 'Preparing QR code' },
  ];

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    async function process() {
      const sessionId = Date.now().toString();
      const activeFrame = settings.activeFrame;
      const sortedSlots = [...(activeFrame?.slots || [])].sort((a, b) => a.slot_index - b.slot_index);

      // 1. Compose Strip
      setCurrentStep(0);
      let stripCanvas: HTMLCanvasElement;
      let stripDataUrl: string;
      try {
        stripCanvas = await composeStripFromFrame(photos, {
          frameDataUrl: activeFrame?.dataUrl,
          frameWidth: activeFrame?.width || 800,
          frameHeight: activeFrame?.height || 2400,
          slots: sortedSlots,
          bgColor: settings.stripBgColor || '#1a1a28',
          textColor: settings.stripTextColor || '#ffffff',
          showTitle: settings.stripShowTitle !== false,
          eventTitle: settings.eventTitle || 'Mingle Booth',
          showDate: settings.stripShowDate !== false,
        });
        stripDataUrl = canvasToDataUrl(stripCanvas, 0.92);
      } catch (err: unknown) {
        console.error('Strip compose error:', err);
        onError('Failed to compose strip: ' + (err as Error).message);
        return;
      }

      // 2. Generate GIF
      setCurrentStep(1);
      let gifDataUrl: string | null = null;
      let gifBlob: Blob | null = null;
      try {
        const gifResult = await buildGif(photos, {
          width: 480,
          height: 360,
          delay: 700,
          quality: 8,
        });
        gifDataUrl = gifResult.dataUrl;
        gifBlob = gifResult.blob;
      } catch (err) {
        console.warn('GIF generation failed:', err);
      }

      // 3. Upload to Cloudinary
      setCurrentStep(2);
      let cloudStripUrl: string | null = null;
      let cloudGifUrl: string | null = null;
      let originalUrls: string[] = [];
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      let viewerUrl = `${origin}/s/${sessionId}`;

      if (isCloudinaryConfigured()) {
        try {
          const uploadResults = await uploadSession({
            stripCanvas,
            gifBlob,
            originalPhotos: photos,
            sessionId,
            eventTitle: settings.eventTitle || 'Mingle Booth',
            onStepUpdate: (asset, pct) => {
              setUploadProgress(`${asset}: ${pct}%`);
            },
          });

          cloudStripUrl = uploadResults.strip?.secure_url || null;
          cloudGifUrl = uploadResults.gif?.secure_url || null;
          originalUrls = (uploadResults.originals || []).map((o) => o.secure_url);
        } catch (err) {
          console.warn('Cloudinary upload error:', err);
        }
      }

      // 4. Save to Database via Server Action
      setCurrentStep(3);
      try {
        const photoRows: SessionPhotoData[] = (
          cloudStripUrl ? originalUrls : photos.map((p) => p.toDataURL('image/jpeg', 0.8))
        ).map((url, i) => {
          const slot = sortedSlots[i] || { x: 0, y: 0, w: 0, h: 0 };
          return {
            slotIndex: i,
            url,
            slotX: slot.x ?? 0,
            slotY: slot.y ?? 0,
            slotW: slot.w ?? 0,
            slotH: slot.h ?? 0,
          };
        });

        await saveSessionAction({
          session: {
            id: sessionId,
            layout: `frame:${activeFrame?.id || 'custom'}`,
            photoCount: photos.length,
            stripUrl: cloudStripUrl || stripDataUrl,
            gifUrl: cloudGifUrl || gifDataUrl,
            viewerUrl,
            stripW: activeFrame?.width ?? 800,
            stripH: activeFrame?.height ?? 2400,
            frameUrl: activeFrame?.id || null,
          },
          photos: photoRows,
        });
      } catch (dbErr) {
        console.warn('Session DB save notice:', dbErr);
      }

      onComplete({
        stripCanvas,
        stripDataUrl,
        gifDataUrl,
        gifBlob,
        sessionId,
        cloudStripUrl,
        cloudGifUrl,
        viewerUrl,
      });
    }

    process();
  }, [photos, settings, onComplete, onError]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-20">
      <div className="glass-card max-w-md w-full p-8 rounded-3xl text-center flex flex-col items-center">
        {/* Animated processing icon & rings */}
        <div className="relative w-28 h-28 flex items-center justify-center mb-6">
          <div
            className="absolute inset-0 rounded-full border-2 border-[#e24a21]/50 border-t-[#e24a21]"
            style={{ animation: 'spinSlow 3s linear infinite' }}
          />
          <div
            className="absolute inset-2 rounded-full border-2 border-[#f17b54]/40 border-b-[#f17b54]"
            style={{ animation: 'spinSlowReverse 2s linear infinite' }}
          />
          <span className="text-4xl animate-bounce">✨</span>
        </div>

        <h2 className="text-2xl font-bold text-hero-gradient mb-2">Creating your masterpiece…</h2>
        <p className="text-xs text-[#c8beb7] mb-6">Please wait while we stitch and polish your photos</p>

        {/* Steps */}
        <div className="w-full flex flex-col gap-3 text-left">
          {steps.map((st, i) => {
            const isDone = i < currentStep;
            const isCurrent = i === currentStep;

            return (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isDone
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                    : isCurrent
                    ? 'bg-[#e24a21]/20 border-[#e24a21]/50 text-[#faf6ee] shadow-[0_0_20px_rgba(226,74,33,0.25)]'
                    : 'bg-white/5 border-white/5 text-[#8e8179]'
                }`}
              >
                <div className="flex items-center gap-3 text-sm font-medium">
                  <span>{st.icon}</span>
                  <span>{st.label}</span>
                </div>
                {isDone && <span className="text-xs font-bold text-emerald-400">✓ Done</span>}
                {isCurrent && (
                  <span className="text-xs font-semibold text-[#fdeee9] animate-pulse">
                    {uploadProgress || 'Working…'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
