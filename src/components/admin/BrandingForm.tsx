'use client';

import React, { useState } from 'react';
import { BoothSettings } from '@/types';
import { updateSettingsAction } from '@/actions/settings';
import { useToast } from '@/components/ui/Toast';

interface BrandingFormProps {
  settings: BoothSettings;
}

export function BrandingForm({ settings }: BrandingFormProps) {
  const [title, setTitle] = useState(settings.eventTitle);
  const [subtitle, setSubtitle] = useState(settings.eventSubtitle);
  const [logo, setLogo] = useState<string | null>(settings.brandLogoDataUrl);
  const [bgColor, setBgColor] = useState(settings.stripBgColor || '#1a1a28');
  const [textColor, setTextColor] = useState(settings.stripTextColor || '#ffffff');
  const [showTitle, setShowTitle] = useState(settings.stripShowTitle !== false);
  const [showDate, setShowDate] = useState(settings.stripShowDate !== false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateSettingsAction({
        eventTitle: title,
        eventSubtitle: subtitle,
        brandLogoDataUrl: logo,
        stripBgColor: bgColor,
        stripTextColor: textColor,
        stripShowTitle: showTitle,
        stripShowDate: showDate,
      });

      if (res.success) {
        toast('Branding settings saved!', 'success');
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
        <h2 className="text-2xl font-bold font-sans">Event Branding & Appearance</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Customize the screensaver, photo strip background colors, and logos.
        </p>
      </div>

      <form onSubmit={handleSave} className="glass p-6 rounded-3xl flex flex-col gap-6 border border-white/10">
        {/* Title & Subtitle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sarah & John's Wedding"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Event Subtitle
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. October 24, 2026"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        {/* Brand Logo Upload */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Brand Logo (Screensaver & Strips)
          </label>
          <div className="flex items-center gap-4">
            {logo ? (
              <div className="relative p-2 rounded-xl bg-black/40 border border-white/15 w-32 h-20 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                <button
                  type="button"
                  onClick={() => setLogo(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-700 shadow"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-dashed border-white/20 hover:border-purple-400/50 cursor-pointer text-xs font-medium text-zinc-300 transition-colors">
                <span>📁 Upload Logo PNG/JPG</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
            />
            <div>
              <div className="text-xs font-semibold text-zinc-200">Strip Background Color</div>
              <div className="text-[11px] text-zinc-400 font-mono">{bgColor}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
            />
            <div>
              <div className="text-xs font-semibold text-zinc-200">Strip Text Color</div>
              <div className="text-[11px] text-zinc-400 font-mono">{textColor}</div>
            </div>
          </div>
        </div>

        {/* Visibility Toggles */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="showTitle"
              checked={showTitle}
              onChange={(e) => setShowTitle(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-white/10 border-white/20"
            />
            <label htmlFor="showTitle" className="text-sm font-medium text-zinc-200 cursor-pointer">
              Show Event Title on Strip
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="showDate"
              checked={showDate}
              onChange={(e) => setShowDate(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-white/10 border-white/20"
            />
            <label htmlFor="showDate" className="text-sm font-medium text-zinc-200 cursor-pointer">
              Show Capture Date on Strip
            </label>
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
