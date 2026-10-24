'use client';

import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone) {
    return null; // Don't show button if already installed and running as standalone app
  }

  // Show if prompt is available, or on iOS where beforeinstallprompt isn't supported
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSGuide((prev) => !prev);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="fixed top-5 right-28 z-40 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-xs font-semibold text-purple-200 hover:text-white backdrop-blur-md transition-all shadow-lg select-none active:scale-95"
        title="Install as App on this device"
      >
        <span className="text-sm">📲</span>
        <span className="hidden sm:inline">Install App</span>
      </button>

      {/* iOS instruction modal/toast */}
      {showIOSGuide && (
        <div
          onClick={() => setShowIOSGuide(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card max-w-sm w-full p-6 rounded-3xl text-center flex flex-col items-center gap-3 shadow-2xl border border-purple-500/30"
          >
            <span className="text-4xl">📲</span>
            <h3 className="text-lg font-bold text-hero-gradient">Install on iPhone / iPad</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              1. Tap the <span className="font-semibold text-white">Share button</span> (square with arrow ⎋) in Safari.<br />
              2. Scroll down and tap <span className="font-semibold text-white">&apos;Add to Home Screen&apos; ➕</span>.<br />
              3. Tap <span className="font-semibold text-white">&apos;Add&apos;</span> to install Mingle Booth as a standalone app!
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="btn btn-primary btn-sm mt-2 w-full text-xs"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
