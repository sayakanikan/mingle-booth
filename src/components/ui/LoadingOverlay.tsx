import React from 'react';

interface LoadingOverlayProps {
  message?: string;
  submessage?: string;
}

export function LoadingOverlay({
  message = 'Loading, please wait…',
  submessage = 'Preparing your experience',
}: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0f]/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center pointer-events-auto select-none animate-in fade-in duration-150">
      <div className="relative w-16 h-16 flex items-center justify-center mb-4">
        {/* Outer glowing pulsing ring */}
        <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 animate-ping" />
        {/* Inner spinning gradient ring */}
        <div className="w-14 h-14 rounded-full border-4 border-purple-500/30 border-t-purple-400 border-r-pink-400 animate-spin" />
        <span className="absolute text-xl">📸</span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-semibold tracking-wide text-zinc-100">
          {message}
        </span>
        {submessage && (
          <span className="text-xs text-zinc-400">
            {submessage}
          </span>
        )}
      </div>
    </div>
  );
}
