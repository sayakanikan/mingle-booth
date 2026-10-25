'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { BoothSettings } from '@/types';
import { composeStripFromFrame } from '@/lib/booth/composite';

interface ReviewScreenProps {
  photos: HTMLCanvasElement[];
  settings: BoothSettings;
  onRetakeSlot: (slotIndex: number) => void;
  onConfirm: () => void;
  onRestartAll: () => void;
}

export function ReviewScreen({
  photos,
  settings,
  onRetakeSlot,
  onConfirm,
  onRestartAll,
}: ReviewScreenProps) {
  // Default selected photo is the first photo (index 0)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [stripPreviewUrl, setStripPreviewUrl] = useState<string | null>(null);
  const [composing, setComposing] = useState(true);

  const sortedSlots = useMemo(() => {
    const activeSlots = settings.activeFrame?.slots || [];
    return [...activeSlots].sort((a, b) => a.slot_index - b.slot_index);
  }, [settings.activeFrame?.slots]);

  // Keep selectedSlotIndex within valid bounds
  const validIndex = Math.min(Math.max(0, selectedSlotIndex), Math.max(0, photos.length - 1));
  const currentSlot = sortedSlots[validIndex];
  const selectedCanvas = photos[validIndex];
  const selectedPhotoUrl = useMemo(
    () => (selectedCanvas ? selectedCanvas.toDataURL('image/jpeg', 0.95) : null),
    [selectedCanvas]
  );

  // Generate live composite preview whenever photos change
  useEffect(() => {
    let active = true;

    async function updatePreview() {
      if (photos.length === 0) return;
      setComposing(true);
      try {
        const canvas = await composeStripFromFrame(photos, {
          frameDataUrl: settings.activeFrame?.dataUrl,
          frameWidth: settings.activeFrame?.width || 1200,
          frameHeight: settings.activeFrame?.height || 3600,
          slots: sortedSlots,
          bgColor: settings.stripBgColor || '#1a1a28',
          textColor: settings.stripTextColor || '#ffffff',
          showTitle: settings.stripShowTitle !== false,
          eventTitle: settings.eventTitle || 'Mingle Booth',
          showDate: settings.stripShowDate !== false,
        });

        if (active) {
          setStripPreviewUrl(canvas.toDataURL('image/jpeg', 0.88));
          setComposing(false);
        }
      } catch (e) {
        console.warn('Failed to compose preview strip:', e);
        if (active) setComposing(false);
      }
    }

    updatePreview();

    return () => {
      active = false;
    };
  }, [photos, settings, sortedSlots]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between p-3 sm:p-5 z-20 overflow-hidden select-none">
      {/* Header */}
      <div className="text-center pt-1 pb-1 shrink-0">
        <h2 className="text-2xl sm:text-3xl font-bold font-sans text-hero-gradient">
          Review Your Photos 📸
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
          Select a photo to inspect in full size, or retake any shot you want
        </p>
      </div>

      {/* Main Content Showcase */}
      <div className="flex flex-row items-center justify-center gap-4 sm:gap-8 max-w-5xl w-full flex-1 min-h-0 overflow-hidden my-auto py-1">
        {/* Left: Big Preview of the Selected Photo */}
        <div className="flex flex-col items-center gap-3 flex-1 h-full min-h-0 justify-center max-w-lg">
          <div className="flex items-center justify-between w-full px-1">
            <span className="text-xs font-semibold text-purple-300">
              🔍 Photo {validIndex + 1} of {photos.length}
            </span>
            <button
              type="button"
              onClick={() => onRetakeSlot(validIndex)}
              className="btn btn-secondary btn-sm text-xs py-1.5 px-3.5 hover:border-purple-400 hover:text-purple-300 transition-all shadow-md flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>Retake Photo {validIndex + 1}</span>
            </button>
          </div>

          {/* Big Photo Stage */}
          <div
            className="relative w-full max-h-[46vh] sm:max-h-[50vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black flex items-center justify-center"
            style={{
              aspectRatio: currentSlot ? `${currentSlot.w} / ${currentSlot.h}` : '4 / 3',
            }}
          >
            {selectedPhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedPhotoUrl}
                alt={`Photo ${validIndex + 1}`}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-white border border-white/10">
              Shot {validIndex + 1}
            </div>
          </div>

          {/* Thumbnail Selector Row */}
          <div className="flex items-center justify-center flex-wrap gap-2.5 mt-1 py-1 w-full">
            {photos.map((canvas, idx) => {
              const isSelected = idx === validIndex;
              const thumbUrl = canvas.toDataURL('image/jpeg', 0.5);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedSlotIndex(idx)}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all flex items-center justify-center ${
                    isSelected
                      ? 'border-purple-400 ring-2 ring-purple-400/50 shadow-lg scale-105'
                      : 'border-white/15 opacity-60 hover:opacity-100 hover:border-white/30'
                  }`}
                  title={`Select Photo ${idx + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbUrl}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-white">
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Photostrip Live Preview */}
        <div className="flex flex-col items-center gap-1.5 h-full min-h-0 justify-center shrink-0">
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold shrink-0">
            Photostrip Preview
          </span>
          <div className="h-full max-h-[58vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black flex items-center justify-center p-1 relative">
            {composing ? (
              <div className="w-36 sm:w-44 h-[50vh] flex flex-col items-center justify-center gap-2 text-zinc-400">
                <span className="text-2xl animate-spin">⏳</span>
                <span className="text-xs">Updating strip…</span>
              </div>
            ) : stripPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={stripPreviewUrl}
                alt="Photostrip Preview"
                className="max-h-full max-w-full w-auto object-contain rounded-xl block"
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-3 pt-2 pb-1 shrink-0">
        <button
          type="button"
          onClick={onConfirm}
          className="btn btn-primary btn-md shadow-xl px-7 py-2.5 text-xs sm:text-sm font-semibold"
        >
          Looks Good! Continue ✨
        </button>
        <button
          type="button"
          onClick={onRestartAll}
          className="btn btn-secondary btn-md px-5 py-2.5 text-xs sm:text-sm font-semibold"
        >
          Restart All ↺
        </button>
      </div>
    </div>
  );
}
