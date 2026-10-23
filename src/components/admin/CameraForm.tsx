'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BoothSettings } from '@/types';
import { getCameraDevices, getDeviceLabel, startCamera, stopCamera } from '@/lib/booth/camera';
import { updateSettingsAction } from '@/actions/settings';
import { useToast } from '@/components/ui/Toast';

interface CameraFormProps {
  settings: BoothSettings;
}

export function CameraForm({ settings }: CameraFormProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(settings.cameraDeviceId || '');
  const [resolution, setResolution] = useState<string>(settings.cameraResolution || '1920x1080');
  const [mirror, setMirror] = useState<boolean>(settings.mirrorCamera !== false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    getCameraDevices().then((devs) => {
      setDevices(devs);
      if (!selectedDeviceId && devs.length > 0) {
        setSelectedDeviceId(devs[0].deviceId);
      }
    });
  }, [selectedDeviceId]);

  const toggleTest = async () => {
    if (testing) {
      stopCamera();
      if (videoRef.current) videoRef.current.srcObject = null;
      setTesting(false);
    } else {
      try {
        const stream = await startCamera(selectedDeviceId || null, resolution);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setTesting(true);
      } catch (err: unknown) {
        toast('Camera test failed: ' + (err as Error).message, 'error');
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateSettingsAction({
        cameraDeviceId: selectedDeviceId || null,
        cameraResolution: resolution,
        mirrorCamera: mirror,
      });
      if (res.success) {
        toast('Camera settings saved!', 'success');
      } else {
        toast('Error: ' + res.error, 'error');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold font-sans">Camera Configuration</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Select webcam, capture card (e.g. Sony A6400, Elgato Cam Link), and resolution.
        </p>
      </div>

      <form onSubmit={handleSave} className="glass p-6 rounded-3xl flex flex-col gap-5 border border-white/10">
        {/* Device selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Video Device
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400"
          >
            {devices.length === 0 ? (
              <option value="" className="bg-[#12121a]">
                Default System Camera
              </option>
            ) : (
              devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId} className="bg-[#12121a]">
                  {getDeviceLabel(d, i)}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Resolution */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Capture Resolution
          </label>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400"
          >
            <option value="1920x1080" className="bg-[#12121a]">
              1920 × 1080 (Full HD 1080p — Recommended)
            </option>
            <option value="1280x720" className="bg-[#12121a]">
              1280 × 720 (HD 720p)
            </option>
            <option value="3840x2160" className="bg-[#12121a]">
              3840 × 2160 (4K UHD)
            </option>
          </select>
        </div>

        {/* Mirror */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="mirrorCamera"
            checked={mirror}
            onChange={(e) => setMirror(e.target.checked)}
            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-white/10 border-white/20"
          />
          <label htmlFor="mirrorCamera" className="text-sm font-medium text-zinc-200 cursor-pointer">
            Mirror Camera Preview (Horizontal Flip for Selfies)
          </label>
        </div>

        {/* Test Video Preview Area */}
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Live Preview Feed
            </span>
            <button
              type="button"
              onClick={toggleTest}
              className="btn btn-secondary btn-sm text-xs"
            >
              {testing ? '⏹ Stop Feed' : '▶ Test Camera'}
            </button>
          </div>

          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
            />
            {!testing && (
              <span className="text-xs text-zinc-500">Camera preview inactive</span>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button type="submit" disabled={saving} className="btn btn-primary px-8">
            {saving ? 'Saving…' : '💾 Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
