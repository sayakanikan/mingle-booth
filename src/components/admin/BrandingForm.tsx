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
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight">Event Branding & Appearance</h2>
        <p className="text-sm text-zinc-400 mt-1.5">
          Customize the screensaver, photo strip background colors, and event logos.
        </p>
      </div>

      <form onSubmit={handleSave} className="glass p-6 sm:p-8 rounded-3xl flex flex-col gap-7 border border-white/10 shadow-xl">
        {/* Title & Subtitle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sarah & John's Wedding"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
            />
            <p className="text-[11px] text-zinc-400">Main title displayed on screensaver and photo strips</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Event Subtitle
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. October 24, 2026"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
            />
            <p className="text-[11px] text-zinc-400">Subtitle, date, or event hashtag</p>
          </div>
        </div>

        {/* Brand Logo Upload */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-white/10">
          <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Brand Logo (Screensaver & Strips)
          </label>
          <div className="flex items-center gap-4">
            {logo ? (
              <div className="relative p-3 rounded-2xl bg-black/60 border border-white/15 w-40 h-24 flex items-center justify-center shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                <button
                  type="button"
                  onClick={() => setLogo(null)}
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-700 shadow-lg font-bold"
                  title="Remove logo"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-dashed border-white/20 hover:border-purple-400/50 cursor-pointer text-xs font-medium text-zinc-300 transition-all hover:bg-white/10">
                <span className="text-lg">📁</span>
                <span>Upload Logo (PNG / JPG)</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Colors */}
        <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
          <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Strip Color Palette
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0 shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-200">Background Color</span>
                <span className="text-[11px] text-zinc-400 font-mono mt-0.5">{bgColor}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0 shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-200">Text & Border Color</span>
                <span className="text-[11px] text-zinc-400 font-mono mt-0.5">{textColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visibility Toggles */}
        <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
          <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Strip Header Visibility
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label htmlFor="showTitle" className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
              <input
                type="checkbox"
                id="showTitle"
                checked={showTitle}
                onChange={(e) => setShowTitle(e.target.checked)}
                className="w-5 h-5 rounded-md text-purple-600 focus:ring-purple-500 bg-white/10 border-white/20 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-200">
                  Show Event Title
                </span>
                <span className="text-xs text-zinc-400">
                  Display title on the footer of each photo strip
                </span>
              </div>
            </label>

            <label htmlFor="showDate" className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
              <input
                type="checkbox"
                id="showDate"
                checked={showDate}
                onChange={(e) => setShowDate(e.target.checked)}
                className="w-5 h-5 rounded-md text-purple-600 focus:ring-purple-500 bg-white/10 border-white/20 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-200">
                  Show Capture Date
                </span>
                <span className="text-xs text-zinc-400">
                  Print the date timestamp on each photo strip
                </span>
              </div>
            </label>
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
