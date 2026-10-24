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
  const [mirrorResult, setMirrorResult] = useState<boolean>(settings.mirrorResult !== false);
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
        mirrorResult,
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
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight">Camera Configuration</h2>
        <p className="text-sm text-zinc-400 mt-1.5">
          Select webcam, capture card (e.g. Sony A6400, Elgato Cam Link), and resolution.
        </p>
      </div>

      <form onSubmit={handleSave} className="glass p-6 sm:p-8 rounded-3xl flex flex-col gap-7 border border-white/10 shadow-xl">
        {/* Device selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Video Device
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all cursor-pointer"
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
          <p className="text-[11px] text-zinc-400">
            Ensure your USB camera or capture card is plugged in and authorized.
          </p>
        </div>

        {/* Resolution */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Capture Resolution
          </label>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all cursor-pointer"
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

        {/* Mirror Settings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label htmlFor="mirrorCamera" className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
            <input
              type="checkbox"
              id="mirrorCamera"
              checked={mirror}
              onChange={(e) => setMirror(e.target.checked)}
              className="w-5 h-5 rounded-md text-purple-600 focus:ring-purple-500 bg-white/10 border-white/20 cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-zinc-200">
                Mirror Live Preview
              </span>
              <span className="text-xs text-zinc-400">
                Horizontal flip on kiosk screen for intuitive posing
              </span>
            </div>
          </label>

          <label htmlFor="mirrorResult" className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
            <input
              type="checkbox"
              id="mirrorResult"
              checked={mirrorResult}
              onChange={(e) => setMirrorResult(e.target.checked)}
              className="w-5 h-5 rounded-md text-purple-600 focus:ring-purple-500 bg-white/10 border-white/20 cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-zinc-200">
                Mirror Picture Result
              </span>
              <span className="text-xs text-zinc-400">
                Save captured photo strip with flipped selfie orientation
              </span>
            </div>
          </label>
        </div>

        {/* Test Video Preview Area */}
        <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Live Preview Feed
              </span>
              <p className="text-[11px] text-zinc-400">Full uncropped camera view with sensor framing</p>
            </div>
            <button
              type="button"
              onClick={toggleTest}
              className={`btn btn-sm text-xs px-4 py-2 ${
                testing ? 'btn-danger' : 'btn-secondary'
              }`}
            >
              {testing ? '⏹ Stop Feed' : '▶ Test Camera'}
            </button>
          </div>

          <div className="relative w-full aspect-video max-h-[480px] rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
              style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
            />
            {!testing && (
              <div className="text-center p-6">
                <span className="text-3xl block mb-2 opacity-60">📷</span>
                <span className="text-xs text-zinc-400">Click &quot;Test Camera&quot; to preview live feed</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-white/10">
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary px-8 py-3 text-sm font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            {saving ? 'Saving…' : '💾 Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
