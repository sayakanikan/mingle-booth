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

  const [showSonyGuide, setShowSonyGuide] = useState(false);
  const [guideTab, setGuideTab] = useState<'hardware' | 'menu' | 'flash' | 'settings'>('hardware');

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight">Camera Configuration</h2>
          <p className="text-sm text-zinc-400 mt-1.5">
            Select webcam, capture card (e.g. Sony a6400, Elgato Cam Link), and resolution.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSonyGuide(!showSonyGuide)}
          className="btn btn-secondary btn-sm px-4 py-2 self-start sm:self-auto text-xs font-semibold flex items-center gap-2 border border-purple-400/40 hover:border-purple-400 hover:text-purple-300 shadow-md transition-all"
        >
          <span>📸</span>
          <span>{showSonyGuide ? 'Hide Sony a6400 Guide' : 'Sony a6400 & Flash Setup Tutorial'}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Guide
          </span>
        </button>
      </div>

      {/* Sony a6400 & Flash Setup Guide Accordion Card */}
      {showSonyGuide && (
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-purple-500/30 shadow-2xl flex flex-col gap-6 bg-gradient-to-br from-purple-950/20 via-[#12121e]/90 to-black/80 animate-screenFadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">📷</span>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Sony a6400 & Flash Connection Tutorial
                </h3>
                <p className="text-xs text-zinc-400">
                  Step-by-step guide for clean 1080p HDMI video feed, continuous power, and flash/lighting sync.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSonyGuide(false)}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 self-end sm:self-auto"
            >
              ✕ Close
            </button>
          </div>

          {/* Guide Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: 'hardware', label: '🔌 1. Cables & Hardware' },
              { id: 'menu', label: '⚙️ 2. Camera Menu Setup' },
              { id: 'flash', label: '⚡ 3. Flash & Lighting Sync' },
              { id: 'settings', label: '📋 4. Recommended Exposure' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGuideTab(tab.id as typeof guideTab)}
                className={`text-xs px-3.5 py-2 rounded-xl font-medium transition-all shrink-0 ${
                  guideTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Cables & Hardware */}
          {guideTab === 'hardware' && (
            <div className="flex flex-col gap-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                    <span>1️⃣</span> HDMI Capture Card
                  </span>
                  <p className="text-xs text-zinc-400">
                    Use an <strong>Elgato Cam Link 4K</strong> or generic <strong>USB 3.0 HDMI Video Capture Card</strong>. Connect it directly to a high-speed blue USB 3.0 port on your computer.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                    <span>2️⃣</span> Micro-HDMI to HDMI Cable
                  </span>
                  <p className="text-xs text-zinc-400">
                    Connect the <strong>Micro-HDMI (Type D)</strong> end to the Sony a6400 HDMI port, and the full HDMI end into the capture card.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                    <span>3️⃣</span> Continuous AC Power
                  </span>
                  <p className="text-xs text-zinc-400">
                    Use an <strong>AC-PW20 dummy battery / DC coupler</strong> (or plug a USB charger into the Micro-USB port) so the camera runs indefinitely during long events without dying.
                  </p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
                💡 <strong>Tip:</strong> Windows and macOS recognize the capture card as a standard webcam. Once connected, select it in the <strong>Video Device</strong> dropdown below.
              </div>
            </div>
          )}

          {/* Tab 2: Camera Menu Setup */}
          {guideTab === 'menu' && (
            <div className="flex flex-col gap-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Clean HDMI Output</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold">Crucial</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Removes all icons, battery level, grid lines, and exposure meter from the live video feed.
                  </p>
                  <code className="text-[11px] bg-black/60 p-2.5 rounded-lg border border-white/10 font-mono text-purple-300">
                    Menu ➔ Setup (Toolbox 3) ➔ HDMI Settings ➔ HDMI Info. Disp ➔ OFF
                  </code>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Overheating Protection</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">Important</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Prevents the Sony a6400 from automatically shutting down due to heat during long continuous events.
                  </p>
                  <code className="text-[11px] bg-black/60 p-2.5 rounded-lg border border-white/10 font-mono text-amber-300">
                    Menu ➔ Setup (Toolbox 2) ➔ Auto Pwr OFF Temp ➔ High
                  </code>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">HDMI Resolution</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">1080p</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Matches Mingle Booth kiosk high-definition capture format.
                  </p>
                  <code className="text-[11px] bg-black/60 p-2.5 rounded-lg border border-white/10 font-mono text-sky-300">
                    Menu ➔ Setup (Toolbox 3) ➔ HDMI Settings ➔ HDMI Resolution ➔ 1080p
                  </code>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Face & Eye Tracking Autofocus</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">Sharp Focus</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Automatically locks sharp focus onto guests’ eyes and faces as they step into the booth.
                  </p>
                  <code className="text-[11px] bg-black/60 p-2.5 rounded-lg border border-white/10 font-mono text-emerald-300">
                    Focus Mode ➔ AF-C (Continuous) | Face/Eye Priority ➔ ON
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Flash & Lighting Sync */}
          {guideTab === 'flash' && (
            <div className="flex flex-col gap-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <span>⚡</span> How Flash Works in Web Photobooths
                </h4>
                <p className="text-xs text-zinc-400">
                  Because web applications continuously stream video from the HDMI capture card, here are the three recommended ways to trigger lighting for your Sony a6400:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Method A */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-500/10 to-transparent border border-purple-500/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300">Option A: Continuous LED</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 font-bold">Recommended</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Use a continuous beauty dish, studio LED light (e.g. <strong>Godox SL60W / LA150D</strong>), or ring light.
                  </p>
                  <ul className="text-[11px] text-zinc-300 list-disc list-inside space-y-1 mt-1">
                    <li>Flawless exposure on both live preview and photo</li>
                    <li>No strobe recharge delay or sync issues</li>
                    <li>Industry standard for high-end web photobooths</li>
                  </ul>
                </div>

                {/* Method B */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Option B: External Strobe / Speedlight</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">Hotshoe</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    If mounting a Godox TT350S / V1-S speedlight or wireless trigger on the Sony hotshoe:
                  </p>
                  <ul className="text-[11px] text-zinc-300 list-disc list-inside space-y-1 mt-1">
                    <li>Set <strong>Live View Display ➔ Setting Effect ➔ OFF</strong> (Crucial: keeps HDMI screen bright!)</li>
                    <li>Trip camera shutter with a wireless remote (RMT-P1BT) or foot pedal on the countdown buzzer.</li>
                  </ul>
                </div>

                {/* Method C */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Option C: Built-in Screen Flash</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">Built-in</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Mingle Booth already includes an automatic full-brightness screen flash overlay!
                  </p>
                  <ul className="text-[11px] text-zinc-300 list-disc list-inside space-y-1 mt-1">
                    <li>Fires a 350ms bright white flash across the display</li>
                    <li>Synchronized with the shutter chime</li>
                    <li>Acts as instant fill light when kiosk screen is facing guests</li>
                  </ul>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                ⚠️ <strong>Crucial Strobe Setting:</strong> When using flash exposure settings (e.g. 1/160s, f/5.6, ISO 100), the live preview will appear completely black unless you disable exposure preview:
                <div className="mt-1 font-mono text-[11px] text-amber-300 font-bold">
                  Menu ➔ Camera Settings 2 ➔ Live View Display ➔ Setting Effect ➔ OFF
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Recommended Exposure */}
          {guideTab === 'settings' && (
            <div className="flex flex-col gap-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                <span className="font-semibold text-white">Cheat Sheet: Dial In Your Sony a6400</span>
                <p className="text-xs text-zinc-400">
                  Recommended manual camera exposure settings for sharp, professional event photos:
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wider block">Mode Dial</span>
                  <span className="text-base font-bold text-purple-300 mt-1 block">M (Manual)</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wider block">Shutter Speed</span>
                  <span className="text-base font-bold text-white mt-1 block">1/125s – 1/160s</span>
                  <span className="text-[10px] text-zinc-500 block">Eliminates motion blur</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wider block">Aperture</span>
                  <span className="text-base font-bold text-white mt-1 block">f/3.5 – f/5.6</span>
                  <span className="text-[10px] text-zinc-500 block">Whole group in focus</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wider block">ISO & White Balance</span>
                  <span className="text-base font-bold text-white mt-1 block">ISO 200–400</span>
                  <span className="text-[10px] text-zinc-500 block">WB: 5500K / Daylight</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
            className="btn btn-primary px-8 py-3 text-sm font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                <span>Saving Camera Settings…</span>
              </>
            ) : (
              '💾 Save Settings'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
