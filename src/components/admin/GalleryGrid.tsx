'use client';

import React, { useState } from 'react';
import { SessionData } from '@/types';
import { deleteSessionAction, clearSessionsAction } from '@/actions/sessions';
import { useToast } from '@/components/ui/Toast';

interface GalleryGridProps {
  initialSessions: SessionData[];
}

export function GalleryGrid({ initialSessions }: GalleryGridProps) {
  const [sessions, setSessions] = useState<SessionData[]>(initialSessions);
  const { toast } = useToast();

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Delete this photo session?')) return;
    try {
      const res = await deleteSessionAction(sessionId);
      if (res.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        toast('Session deleted', 'info');
      } else {
        toast('Error: ' + res.error, 'error');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL sessions? This cannot be undone.')) return;
    try {
      const res = await clearSessionsAction();
      if (res.success) {
        setSessions([]);
        toast('All sessions cleared', 'info');
      } else {
        toast('Error: ' + res.error, 'error');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-sans">Photo Session Gallery</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Browse and download photo strips captured by guests.
          </p>
        </div>

        {sessions.length > 0 && (
          <button onClick={handleClearAll} className="btn btn-danger btn-sm text-xs self-start sm:self-auto">
            🗑️ Clear All ({sessions.length})
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 text-sm glass rounded-3xl">
          No photo sessions captured yet. Launch the booth kiosk and take some photos!
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {sessions.map((s) => {
            const formattedDate = s.createdAt
              ? new Date(s.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Unknown date';

            return (
              <div
                key={s.id}
                className="group relative rounded-2xl glass p-3 flex flex-col items-center gap-2 border border-white/10 hover:border-white/20 transition-all shadow-md"
              >
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Delete session"
                >
                  ✕
                </button>

                {/* Strip thumbnail */}
                <a
                  href={`/s/${s.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full aspect-2/3 rounded-xl overflow-hidden bg-black/80 flex items-center justify-center p-1 border border-white/5 cursor-pointer"
                  title="Open guest viewer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.stripUrl}
                    alt="Session strip"
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />
                </a>

                {/* Details */}
                <div className="w-full text-center">
                  <div className="text-[11px] text-zinc-400">{formattedDate}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {s.photoCount} shots · {s.layout}
                  </div>
                </div>

                {/* Action links */}
                <div className="flex gap-2 w-full mt-1">
                  <a
                    href={`/s/${s.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm flex-1 text-[11px] py-1 text-center"
                  >
                    View ↗
                  </a>
                  <a
                    href={s.stripUrl}
                    download={`session-${s.id}.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm px-2 text-[11px] py-1"
                    title="Download strip"
                  >
                    ⬇
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
