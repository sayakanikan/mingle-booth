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
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight">Photo Session Gallery</h2>
          <p className="text-sm text-zinc-400 mt-1.5">
            Browse and download photo strips captured by guests in real time.
          </p>
        </div>

        {sessions.length > 0 && (
          <button onClick={handleClearAll} className="btn btn-danger btn-sm text-xs px-4 py-2 self-start sm:self-auto shadow-lg">
            🗑️ Clear All ({sessions.length})
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="p-14 text-center text-zinc-400 text-sm glass rounded-3xl border border-white/10">
          No photo sessions captured yet. Launch the booth kiosk and take some photos!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {sessions.map((s) => {
            const formattedDate = s.createdAt
              ? new Date(s.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Recent';

            return (
              <div
                key={s.id}
                className="group relative rounded-2xl glass p-4 flex flex-col justify-between gap-3 border border-white/10 hover:border-white/25 transition-all shadow-lg"
              >
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
                  title="Delete session"
                >
                  ✕
                </button>

                {/* Strip thumbnail */}
                <a
                  href={`/s/${s.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-44 sm:h-48 rounded-xl overflow-hidden bg-black/80 flex items-center justify-center p-2 border border-white/10 shadow-inner hover:scale-[1.02] transition-transform"
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
                <div className="w-full text-center px-1">
                  <div className="text-xs font-semibold text-zinc-200">{formattedDate}</div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    {s.photoCount} shots · {s.layout}
                  </div>
                </div>

                {/* Action links */}
                <div className="flex gap-2 w-full mt-1">
                  <a
                    href={`/s/${s.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm flex-1 text-xs py-2 text-center"
                  >
                    View ↗
                  </a>
                  <a
                    href={s.stripUrl}
                    download={`session-${s.id}.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm px-3 text-xs py-2"
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
