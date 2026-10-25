'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SessionData } from '@/types';
import { deleteSessionAction, clearSessionsAction } from '@/actions/sessions';
import { useToast } from '@/components/ui/Toast';

interface GalleryGridProps {
  initialSessions: SessionData[];
  eventId?: string;
  eventName?: string;
  eventSubtitle?: string;
}

export function GalleryGrid({ initialSessions, eventId, eventName, eventSubtitle }: GalleryGridProps) {
  const [sessions, setSessions] = useState<SessionData[]>(initialSessions);
  const [sessionToDelete, setSessionToDelete] = useState<SessionData | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const { toast } = useToast();

  const executeDelete = async (sessionId: string) => {
    setDeletingId(sessionId);
    try {
      const res = await deleteSessionAction(sessionId);
      if (res.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setSessionToDelete(null);
        toast('Photo strip and all assets deleted successfully', 'success');
      } else {
        toast('Error deleting photo strip: ' + res.error, 'error');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const executeClearAll = async () => {
    setClearingAll(true);
    try {
      const res = await clearSessionsAction(eventId);
      if (res.success) {
        setSessions([]);
        setShowClearConfirm(false);
        toast('All photos cleared for this event', 'info');
      } else {
        toast('Error: ' + res.error, 'error');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Back button if in event detail */}
      {eventId && (
        <div>
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-2 text-xs font-semibold text-purple-300 hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Back to All Events</span>
          </Link>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight">
            {eventName ? `${eventName} — Gallery` : 'Photo Session Gallery'}
          </h2>
          <p className="text-sm text-zinc-400 mt-1.5">
            {eventSubtitle
              ? `${eventSubtitle} · Browse, download, or delete captured photo strips.`
              : 'Browse, download, or delete captured photo strips in real time.'}
          </p>
        </div>

        {sessions.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={clearingAll || deletingId !== null}
            className="btn btn-danger btn-sm text-xs px-4 py-2 self-start sm:self-auto shadow-lg disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>🗑️</span>
            <span>Clear All Photos ({sessions.length})</span>
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="p-14 text-center text-zinc-400 text-sm glass rounded-3xl border border-white/10 flex flex-col items-center gap-3">
          <span className="text-3xl">📷</span>
          <span>No photo sessions captured yet for this event.</span>
          <Link
            href="/"
            className="btn btn-primary btn-sm text-xs mt-2"
          >
            Launch Photo Booth
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {sessions.map((s) => {
            const isDeleting = deletingId === s.id;
            const formattedDate = s.createdAt
              ? new Date(s.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Recent';

            return (
              <div
                key={s.id}
                className={`group relative rounded-2xl glass p-4 flex flex-col justify-between gap-3 border transition-all shadow-lg overflow-hidden ${
                  isDeleting
                    ? 'border-red-500/50 opacity-80'
                    : 'border-white/10 hover:border-white/25'
                }`}
              >
                {/* Deleting Loading Overlay */}
                {isDeleting && (
                  <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-red-500/30 border-t-red-400 animate-spin" />
                    <span className="text-xs font-semibold text-red-200">Deleting Photo…</span>
                    <span className="text-[10px] text-zinc-400">Removing from cloud storage</span>
                  </div>
                )}

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

                {/* Only ONE single action row: View, Download, and Delete */}
                <div className="flex gap-2 w-full mt-1 items-center">
                  <a
                    href={`/s/${s.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm flex-1 text-xs py-2 text-center font-medium"
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
                  <button
                    type="button"
                    disabled={isDeleting || deletingId !== null}
                    onClick={() => setSessionToDelete(s)}
                    className="btn btn-danger btn-sm px-3 text-xs py-2 hover:bg-red-600 transition-colors flex items-center gap-1"
                    title="Delete this photostrip, gif, and photos"
                  >
                    <span>🗑️</span>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Confirm Single Delete */}
      {sessionToDelete && (
        <div
          onClick={() => !deletingId && setSessionToDelete(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card max-w-sm w-full p-6 sm:p-7 rounded-3xl flex flex-col gap-4 border border-red-500/30 shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-2xl mx-auto">
              🗑️
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Delete Photo Strip?</h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                This will delete this photostrip, animated GIF, and all original photo shots from cloud storage. This cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => setSessionToDelete(null)}
                className="btn btn-secondary btn-sm text-xs px-4 py-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => executeDelete(sessionToDelete.id)}
                className="btn btn-danger btn-sm text-xs px-5 py-2 shadow-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                {deletingId === sessionToDelete.id ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Clear All */}
      {showClearConfirm && (
        <div
          onClick={() => !clearingAll && setShowClearConfirm(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card max-w-md w-full p-6 sm:p-7 rounded-3xl flex flex-col gap-4 border border-red-500/40 shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-2xl mx-auto">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Clear All Event Photos?</h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                Are you sure you want to delete ALL {sessions.length} photo sessions for this event? All strips, GIFs, and images will be permanently removed.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={clearingAll}
                onClick={() => setShowClearConfirm(false)}
                className="btn btn-secondary btn-sm text-xs px-4 py-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearingAll}
                onClick={executeClearAll}
                className="btn btn-danger btn-sm text-xs px-5 py-2 shadow-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                {clearingAll ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                    <span>Clearing All…</span>
                  </>
                ) : (
                  'Yes, Clear Everything'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
