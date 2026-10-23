'use client';

import React, { useState } from 'react';
import { BoothSettings, Frame, Slot } from '@/types';
import { generateDefaultFrame } from '@/lib/booth/defaultFrames';
import { detectSlots } from '@/lib/booth/slotDetector';
import { createSlotEditor } from '@/lib/booth/slotEditor';
import { isCloudinaryConfigured, uploadDataUrl } from '@/lib/booth/cloudinary';
import {
  addFrameAction,
  activateFrameAction,
  clearActiveFrameAction,
  removeFrameAction,
  updateFrameSlotsAction,
} from '@/actions/frames';
import { useToast } from '@/components/ui/Toast';

interface FrameManagerProps {
  settings: BoothSettings;
}

export function FrameManager({ settings }: FrameManagerProps) {
  const [frames, setFrames] = useState<Frame[]>(settings.frames);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(settings.activeFrame?.id || null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleTemplateAdd = async (type: '3-strip-dark' | '3-strip-white' | '4-strip-dark' | '2x2-dark') => {
    try {
      const tpl = generateDefaultFrame(type, settings.eventTitle || 'Mingle Booth');
      let dataUrlOrCloud = tpl.dataUrl;

      if (isCloudinaryConfigured()) {
        try {
          const res = await uploadDataUrl(tpl.dataUrl, {
            subfolder: 'frames',
            publicIdHint: `template_${type}_${Date.now()}`,
          });
          dataUrlOrCloud = res.secure_url;
        } catch (e) {
          console.warn('Cloudinary frame upload fallback:', e);
        }
      }

      const res = await addFrameAction({
        name: tpl.name,
        dataUrl: dataUrlOrCloud,
        width: tpl.width,
        height: tpl.height,
        slots: tpl.slots,
      });

      if (res.success && res.frameId) {
        const newFrame: Frame = {
          id: res.frameId,
          name: tpl.name,
          dataUrl: dataUrlOrCloud,
          width: tpl.width,
          height: tpl.height,
          slots: tpl.slots,
          isActive: true,
        };
        setFrames((prev) => [...prev.map((f) => ({ ...f, isActive: false })), newFrame]);
        setActiveFrameId(res.frameId);
        toast(`Added & activated "${tpl.name}"!`, 'success');
      } else {
        toast('Error: ' + res.error, 'error');
      }
    } catch (err: unknown) {
      toast('Failed to create template: ' + (err as Error).message, 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileName = file.name;
    const reader = new FileReader();

    reader.onload = async () => {
      const dataUrl = reader.result as string;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        let detectedSlots: Slot[] = [];
        try {
          detectedSlots = await detectSlots(dataUrl);
          toast(
            detectedSlots.length
              ? `Detected ${detectedSlots.length} slot(s) — adjust boundaries and save!`
              : 'No transparent areas found — draw slots manually',
            'info'
          );
        } catch (err) {
          console.warn('detectSlots failed:', err);
        }

        const editor = createSlotEditor({
          frameName: fileName,
          frameDataUrl: dataUrl,
          frameWidth: width,
          frameHeight: height,
          initialSlots: detectedSlots,
          onSave: async (finalSlots) => {
            let finalUrl = dataUrl;
            if (isCloudinaryConfigured()) {
              try {
                const res = await uploadDataUrl(dataUrl, {
                  subfolder: 'frames',
                  publicIdHint: `frame_${Date.now()}`,
                });
                finalUrl = res.secure_url;
              } catch (e) {
                console.warn('Cloudinary upload fallback:', e);
              }
            }

            const res = await addFrameAction({
              name: fileName,
              dataUrl: finalUrl,
              width,
              height,
              slots: finalSlots,
            });

            if (res.success && res.frameId) {
              const newFrame: Frame = {
                id: res.frameId,
                name: fileName,
                dataUrl: finalUrl,
                width,
                height,
                slots: finalSlots,
                isActive: true,
              };
              setFrames((prev) => [...prev.map((f) => ({ ...f, isActive: false })), newFrame]);
              setActiveFrameId(res.frameId);
              toast('Frame saved & activated!', 'success');
            } else {
              toast('Failed to save frame: ' + res.error, 'error');
            }
          },
        });

        document.body.appendChild(editor.el);
        editor.open();
        setUploading(false);
      };
      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  };

  const handleActivate = async (frameId: string) => {
    try {
      const res = await activateFrameAction(frameId);
      if (res.success) {
        setActiveFrameId(frameId);
        setFrames((prev) => prev.map((f) => ({ ...f, isActive: f.id === frameId })));
        toast('Frame activated!', 'success');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    }
  };

  const handleClearActive = async () => {
    try {
      const res = await clearActiveFrameAction();
      if (res.success) {
        setActiveFrameId(null);
        setFrames((prev) => prev.map((f) => ({ ...f, isActive: false })));
        toast('Active frame cleared', 'info');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    }
  };

  const handleRemove = async (frameId: string) => {
    if (!confirm('Are you sure you want to delete this frame?')) return;
    try {
      const res = await removeFrameAction(frameId);
      if (res.success) {
        setFrames((prev) => prev.filter((f) => f.id !== frameId));
        if (activeFrameId === frameId) setActiveFrameId(null);
        toast('Frame deleted', 'info');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    }
  };

  const handleEditSlots = (frame: Frame) => {
    const editor = createSlotEditor({
      frameName: frame.name,
      frameDataUrl: frame.dataUrl,
      frameWidth: frame.width || 1200,
      frameHeight: frame.height || 3600,
      initialSlots: frame.slots,
      onSave: async (finalSlots) => {
        try {
          const res = await updateFrameSlotsAction(frame.id, {
            slots: finalSlots,
            width: frame.width || 1200,
            height: frame.height || 3600,
          });
          if (res.success) {
            setFrames((prev) =>
              prev.map((f) => (f.id === frame.id ? { ...f, slots: finalSlots } : f))
            );
            toast('Slots updated successfully!', 'success');
          }
        } catch (err: unknown) {
          toast((err as Error).message, 'error');
        }
      },
    });

    document.body.appendChild(editor.el);
    editor.open();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold font-sans">Frames & Layouts</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Each transparent PNG frame acts as an overlay. Cutout regions define photo slots.
        </p>
      </div>

      {/* Built-in template selector */}
      <div className="glass p-5 rounded-3xl border border-white/10 flex flex-col gap-3">
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          Quick Start with Built-in Templates
        </span>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => handleTemplateAdd('3-strip-dark')}
            className="btn btn-secondary btn-sm"
          >
            ✨ Classic 3-Strip (Dark)
          </button>
          <button
            type="button"
            onClick={() => handleTemplateAdd('3-strip-white')}
            className="btn btn-secondary btn-sm"
          >
            ✨ Wedding 3-Strip (White)
          </button>
          <button
            type="button"
            onClick={() => handleTemplateAdd('4-strip-dark')}
            className="btn btn-secondary btn-sm"
          >
            ✨ Neon 4-Strip
          </button>
          <button
            type="button"
            onClick={() => handleTemplateAdd('2x2-dark')}
            className="btn btn-secondary btn-sm"
          >
            ✨ Retro 2×2 Grid
          </button>
        </div>
      </div>

      {/* Custom Upload Box */}
      <label className="border-2 border-dashed border-white/20 hover:border-purple-400/50 rounded-3xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-white/5 hover:bg-white/10">
        <span className="text-4xl">{uploading ? '⏳' : '🖼️'}</span>
        <span className="font-semibold text-sm text-zinc-200">
          {uploading ? 'Analyzing frame image…' : 'Click or drag transparent PNG frame here'}
        </span>
        <span className="text-xs text-zinc-400">
          PNG with transparent cutouts recommended · Automatic slot detection
        </span>
        <input
          type="file"
          accept="image/png,image/*"
          disabled={uploading}
          onChange={handleFileUpload}
          className="hidden"
        />
      </label>

      {/* Frame List */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Uploaded Frames ({frames.length})
          </span>
          {activeFrameId && (
            <button
              onClick={handleClearActive}
              className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
            >
              ✕ Clear Active Frame
            </button>
          )}
        </div>

        {frames.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm glass rounded-2xl">
            No frames uploaded yet. Pick a built-in template above or upload a custom PNG.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {frames.map((frame) => {
              const isActive = frame.id === activeFrameId;
              const slotCount = frame.slots?.length || 0;

              return (
                <div
                  key={frame.id}
                  onClick={() => handleActivate(frame.id)}
                  className={`group relative rounded-2xl border-2 p-3 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    isActive
                      ? 'border-purple-400 bg-purple-500/15 shadow-[0_0_20px_rgba(192,132,252,0.35)]'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(frame.id);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Delete frame"
                  >
                    ✕
                  </button>

                  {/* Frame image preview */}
                  <div className="w-full aspect-2/3 rounded-xl overflow-hidden bg-black/60 flex items-center justify-center p-1 border border-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={frame.dataUrl}
                      alt={frame.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {/* Frame details */}
                  <div className="w-full text-center">
                    <div className="text-xs font-semibold text-zinc-200 truncate">{frame.name}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      {slotCount ? `${slotCount} photo slot${slotCount > 1 ? 's' : ''}` : '⚠ No slots'}
                    </div>
                  </div>

                  {/* Edit Slots Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSlots(frame);
                    }}
                    className="btn btn-secondary btn-sm w-full text-xs py-1 mt-1"
                  >
                    ✎ Edit Slots
                  </button>

                  {isActive && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-purple-300">
                      ✓ Active Frame
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
