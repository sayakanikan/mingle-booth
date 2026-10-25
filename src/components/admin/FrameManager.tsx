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
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleTemplateAdd = async (type: '3-strip-dark' | '3-strip-white' | '4-strip-dark' | '2x2-dark') => {
    setLoadingTemplate(type);
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
    } finally {
      setLoadingTemplate(null);
    }
  };

  const [pendingUpload, setPendingUpload] = useState<{
    fileName: string;
    dataUrl: string;
    width: number;
    height: number;
    format: '2R' | '4R';
  } | null>(null);

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
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const ratio = width / height;
        // 2R photostrips are ~1:3 (0.33); 4R postcards are ~2:3 (0.67) or 3:2 (1.5)
        const detectedFormat: '2R' | '4R' = ratio < 0.5 ? '2R' : '4R';

        setPendingUpload({
          fileName,
          dataUrl,
          width,
          height,
          format: detectedFormat,
        });
        setUploading(false);
      };
      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!pendingUpload) return;
    const { fileName, dataUrl, width, height, format } = pendingUpload;
    setPendingUpload(null);
    setUploading(true);

    let detectedSlots: Slot[] = [];
    try {
      detectedSlots = await detectSlots(dataUrl);
      toast(
        detectedSlots.length
          ? `Detected ${detectedSlots.length} slot(s) for ${format} frame!`
          : 'No transparent areas found — draw slots manually',
        'info'
      );
    } catch (err) {
      console.warn('detectSlots failed:', err);
    }

    const editor = createSlotEditor({
      frameName: `${fileName} (${format})`,
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
          name: `${fileName} (${format})`,
          dataUrl: finalUrl,
          width,
          height,
          slots: finalSlots,
        });

        if (res.success && res.frameId) {
          const newFrame: Frame = {
            id: res.frameId,
            name: `${fileName} (${format})`,
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

  const handleActivate = async (frameId: string) => {
    setActivatingId(frameId);
    try {
      const res = await activateFrameAction(frameId);
      if (res.success) {
        setActiveFrameId(frameId);
        setFrames((prev) => prev.map((f) => ({ ...f, isActive: f.id === frameId })));
        toast('Frame activated!', 'success');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    } finally {
      setActivatingId(null);
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
    setDeletingId(frameId);
    try {
      const res = await removeFrameAction(frameId);
      if (res.success) {
        setFrames((prev) => prev.filter((f) => f.id !== frameId));
        if (activeFrameId === frameId) setActiveFrameId(null);
        toast('Frame deleted', 'info');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSlots = (frame: Frame) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const width = frame.width || img.naturalWidth || 1200;
      const height = frame.height || img.naturalHeight || 3600;
      const editor = createSlotEditor({
        frameName: frame.name,
        frameDataUrl: frame.dataUrl,
        frameWidth: width,
        frameHeight: height,
        initialSlots: frame.slots,
        onSave: async (finalSlots) => {
          try {
            const res = await updateFrameSlotsAction(frame.id, {
              slots: finalSlots,
              width,
              height,
            });
            if (res.success) {
              setFrames((prev) =>
                prev.map((f) =>
                  f.id === frame.id ? { ...f, slots: finalSlots, width, height } : f
                )
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
    img.src = frame.dataUrl;
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight">Frames & Layouts</h2>
        <p className="text-sm text-zinc-400 mt-1.5">
          Each transparent PNG frame acts as an overlay. Cutout regions define photo slots for the camera.
        </p>
      </div>

      {/* Built-in template selector */}
      <div className="glass p-6 md:p-7 rounded-3xl border border-white/10 flex flex-col gap-4 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Quick Start with Built-in Templates
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 font-medium">
            1-Click Setup
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loadingTemplate !== null}
            onClick={() => handleTemplateAdd('3-strip-dark')}
            className="btn btn-secondary btn-sm py-2 px-4 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            {loadingTemplate === '3-strip-dark' ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin inline-block" />
                <span>Adding…</span>
              </>
            ) : (
              '✨ Classic 3-Strip (Dark)'
            )}
          </button>
          <button
            type="button"
            disabled={loadingTemplate !== null}
            onClick={() => handleTemplateAdd('3-strip-white')}
            className="btn btn-secondary btn-sm py-2 px-4 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            {loadingTemplate === '3-strip-white' ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin inline-block" />
                <span>Adding…</span>
              </>
            ) : (
              '✨ Wedding 3-Strip (White)'
            )}
          </button>
          <button
            type="button"
            disabled={loadingTemplate !== null}
            onClick={() => handleTemplateAdd('4-strip-dark')}
            className="btn btn-secondary btn-sm py-2 px-4 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            {loadingTemplate === '4-strip-dark' ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin inline-block" />
                <span>Adding…</span>
              </>
            ) : (
              '✨ Neon 4-Strip'
            )}
          </button>
          <button
            type="button"
            disabled={loadingTemplate !== null}
            onClick={() => handleTemplateAdd('2x2-dark')}
            className="btn btn-secondary btn-sm py-2 px-4 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            {loadingTemplate === '2x2-dark' ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin inline-block" />
                <span>Adding…</span>
              </>
            ) : (
              '✨ Retro 2×2 Grid'
            )}
          </button>
        </div>
      </div>

      {/* Custom Upload Box */}
      <div className="flex flex-col gap-2">
        <label className="border-2 border-dashed border-white/20 hover:border-purple-400/50 rounded-3xl p-8 md:p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all bg-white/5 hover:bg-white/10 shadow-inner group">
          <span className="text-4xl group-hover:scale-110 transition-transform">{uploading ? '⏳' : '🖼️'}</span>
          <span className="font-semibold text-sm sm:text-base text-zinc-200">
            {uploading ? 'Analyzing frame image…' : 'Click or drag transparent PNG frame here'}
          </span>
          <span className="text-xs text-zinc-400 text-center max-w-sm">
            PNG with transparent cutouts recommended · Automatic slot detection with slot boundary editor
          </span>
          <input
            type="file"
            accept="image/png,image/*"
            disabled={uploading}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Frame List */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Uploaded Frames
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-bold text-zinc-300">
              {frames.length}
            </span>
          </div>
          {activeFrameId && (
            <button
              onClick={handleClearActive}
              className="px-3 py-1 rounded-full text-xs font-medium text-red-300 bg-red-950/40 border border-red-500/30 hover:bg-red-900/50 transition-colors"
            >
              ✕ Clear Active Frame
            </button>
          )}
        </div>

        {frames.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-sm glass rounded-3xl border border-white/10">
            No frames uploaded yet. Pick a built-in template above or upload a custom PNG.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {frames.map((frame) => {
              const isActive = frame.id === activeFrameId;
              const slotCount = frame.slots?.length || 0;
              const isDeleting = deletingId === frame.id;
              const isActivating = activatingId === frame.id;

              return (
                <div
                  key={frame.id}
                  className={`group relative rounded-2xl border-2 p-4 flex flex-col justify-between gap-3 transition-all ${
                    isActive
                      ? 'border-purple-400 bg-purple-500/15 shadow-[0_0_24px_rgba(192,132,252,0.3)] ring-1 ring-purple-400/50'
                      : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/8'
                  } ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {/* Delete button */}
                  <button
                    type="button"
                    disabled={isDeleting || isActivating}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(frame.id);
                    }}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-red-600/80 hover:bg-red-600 text-white text-xs flex items-center justify-center transition-all shadow z-10 disabled:opacity-50"
                    title="Delete frame"
                  >
                    {isDeleting ? (
                      <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                    ) : (
                      '✕'
                    )}
                  </button>

                  {/* Frame image preview */}
                  <div className="w-full h-44 sm:h-48 rounded-xl overflow-hidden bg-black/70 flex items-center justify-center p-2 border border-white/10 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={frame.dataUrl}
                      alt={frame.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {/* Frame details */}
                  <div className="w-full text-center px-1">
                    <div className="text-xs sm:text-sm font-semibold text-zinc-100 truncate" title={frame.name}>
                      {frame.name}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      {slotCount ? `${slotCount} photo slot${slotCount > 1 ? 's' : ''}` : '⚠ No slots'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-full flex flex-col gap-2 mt-1">
                    <button
                      type="button"
                      disabled={isDeleting || isActivating}
                      onClick={() => handleEditSlots(frame)}
                      className="btn btn-secondary btn-sm w-full text-xs py-2 disabled:opacity-50"
                    >
                      ✎ Edit Slots
                    </button>

                    {isActive ? (
                      <div className="w-full py-1.5 text-center rounded-xl bg-purple-500/20 border border-purple-400/40 text-[11px] font-bold text-purple-200">
                        ✓ Active in Booth
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isDeleting || isActivating}
                        onClick={() => handleActivate(frame.id)}
                        className="btn btn-primary btn-sm w-full text-xs py-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isActivating ? (
                          <>
                            <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                            <span>Activating…</span>
                          </>
                        ) : (
                          'Activate Frame'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2R vs 4R Frame Size Selection Modal */}
      {pendingUpload && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-white/10 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📐</span>
              <div>
                <h3 className="text-lg font-bold">Confirm Frame Size</h3>
                <p className="text-xs text-zinc-400">
                  Select standard print format for &quot;{pendingUpload.fileName}&quot;
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center p-2 rounded-2xl bg-black/60 border border-white/10 max-h-40 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingUpload.dataUrl}
                alt="Uploaded frame preview"
                className="max-h-36 max-w-full object-contain"
              />
            </div>

            <div className="text-xs text-zinc-300">
              Original Resolution: <span className="font-semibold text-purple-300">{pendingUpload.width} × {pendingUpload.height} px</span> (No distortion)
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingUpload((prev) => prev ? { ...prev, format: '2R' } : null)}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                  pendingUpload.format === '2R'
                    ? 'border-purple-400 bg-purple-500/20 shadow-md ring-1 ring-purple-400'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <span className="font-bold text-sm text-white">2R Photostrip</span>
                <span className="text-[11px] text-zinc-400">2&quot; × 6&quot; Vertical Strip (1:3 aspect)</span>
              </button>

              <button
                type="button"
                onClick={() => setPendingUpload((prev) => prev ? { ...prev, format: '4R' } : null)}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                  pendingUpload.format === '4R'
                    ? 'border-purple-400 bg-purple-500/20 shadow-md ring-1 ring-purple-400'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <span className="font-bold text-sm text-white">4R Postcard</span>
                <span className="text-[11px] text-zinc-400">4&quot; × 6&quot; Photo Card (2:3 aspect)</span>
              </button>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={handleConfirmUpload}
                className="btn btn-primary btn-sm flex-1 text-xs py-2.5"
              >
                Continue to Slot Editor
              </button>
              <button
                type="button"
                onClick={() => setPendingUpload(null)}
                className="btn btn-secondary btn-sm px-4 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
