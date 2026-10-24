'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EventData } from '@/types';
import {
  createEventAction,
  activateEventAction,
  updateEventAction,
  deleteEventAction,
} from '@/actions/events';
import { useToast } from '@/components/ui/Toast';

interface EventsManagerProps {
  initialEvents: EventData[];
}

export function EventsManager({ initialEvents }: EventsManagerProps) {
  const [events, setEvents] = useState<EventData[]>(initialEvents);
  const [isCreating, setIsCreating] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [setActiveNow, setSetActiveNow] = useState(true);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast('Please enter an event title', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await createEventAction({
        title,
        subtitle,
        setActive: setActiveNow,
      });

      if (res.success && res.eventId) {
        toast('Event created successfully!', 'success');
        const newEvent: EventData = {
          id: res.eventId,
          title,
          subtitle: subtitle || 'by Kala Kini',
          isActive: setActiveNow,
          createdAt: new Date().toISOString(),
          sessionCount: 0,
        };

        setEvents((prev) => {
          if (setActiveNow) {
            return [newEvent, ...prev.map((ev) => ({ ...ev, isActive: false }))];
          }
          return [newEvent, ...prev];
        });

        setTitle('');
        setSubtitle('');
        setIsCreating(false);
      } else {
        toast('Error creating event: ' + res.error, 'error');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (eventId: string) => {
    setLoading(true);
    try {
      const res = await activateEventAction(eventId);
      if (res.success) {
        setEvents((prev) =>
          prev.map((ev) => ({
            ...ev,
            isActive: ev.id === eventId,
          }))
        );
        toast('Event activated! Photo booth will now capture for this event.', 'success');
      } else {
        toast('Error activating event: ' + res.error, 'error');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    setLoading(true);
    try {
      const res = await updateEventAction(editingEvent.id, {
        title: editingEvent.title,
        subtitle: editingEvent.subtitle,
      });

      if (res.success) {
        toast('Event updated!', 'success');
        setEvents((prev) =>
          prev.map((ev) => (ev.id === editingEvent.id ? { ...editingEvent } : ev))
        );
        setEditingEvent(null);
      } else {
        toast('Error updating event: ' + res.error, 'error');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId: string, eventTitle: string, sessionCount = 0) => {
    const confirmMsg =
      sessionCount > 0
        ? `Delete "${eventTitle}" and all ${sessionCount} photo sessions? This will also remove photos from cloud storage and cannot be undone.`
        : `Delete "${eventTitle}"?`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await deleteEventAction(eventId);
      if (res.success) {
        toast('Event deleted', 'info');
        setEvents((prev) => {
          const filtered = prev.filter((ev) => ev.id !== eventId);
          // If the deleted event was active, the backend activates the next available event
          if (filtered.length > 0 && !filtered.some((e) => e.isActive)) {
            filtered[0].isActive = true;
          }
          return filtered;
        });
      } else {
        toast('Error deleting event: ' + res.error, 'error');
      }
    } catch (err: unknown) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight">Events &amp; Gallery</h2>
          <p className="text-sm text-zinc-400 mt-1.5">
            Manage your photo booth events. Click any event card to browse and download its photo strips.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="btn btn-primary btn-md shadow-xl text-xs sm:text-sm px-5 py-2.5 flex items-center gap-2 self-start sm:self-auto font-semibold"
        >
          <span>➕</span>
          <span>New Event</span>
        </button>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="p-14 text-center text-zinc-400 text-sm glass rounded-3xl border border-white/10 flex flex-col items-center gap-4">
          <span className="text-4xl">🎉</span>
          <p>No events found. Create your first event to start taking photos in the booth!</p>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="btn btn-primary btn-sm mt-2 text-xs"
          >
            Create First Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => {
            const formattedDate = ev.createdAt
              ? new Date(ev.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Recent';

            return (
              <div
                key={ev.id}
                className={`relative rounded-3xl glass p-6 flex flex-col justify-between gap-5 transition-all shadow-xl border ${
                  ev.isActive
                    ? 'border-purple-500/60 ring-2 ring-purple-500/25 bg-purple-950/20'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Top Row: Status Badge & Actions */}
                <div className="flex items-center justify-between gap-2">
                  {ev.isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Active Event
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleActivate(ev.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 hover:bg-purple-600/30 hover:border-purple-500/40 text-zinc-300 hover:text-purple-200 border border-white/10 transition-all shadow-sm"
                      title="Activate this event for the photo booth"
                    >
                      <span>⚡</span>
                      <span>Set as Active</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingEvent(ev)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                      title="Edit event details"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ev.id, ev.title, ev.sessionCount)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete event"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Event Information */}
                <div>
                  <h3 className="text-xl font-bold font-sans text-white tracking-tight line-clamp-1">
                    {ev.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                    {ev.subtitle || 'by Kala Kini'}
                  </p>
                </div>

                {/* Metrics Pill */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                    <span>📸</span>
                    <span>{ev.sessionCount ?? 0} Photo Sessions</span>
                  </span>
                  <span>{formattedDate}</span>
                </div>

                {/* Main Link to Gallery */}
                <Link
                  href={`/admin/events/${ev.id}`}
                  className="btn btn-secondary btn-sm w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 group-hover:border-purple-400/50 hover:bg-purple-600/20 hover:text-purple-200 transition-all"
                >
                  <span>🖼️ View Photos ({ev.sessionCount ?? 0})</span>
                  <span>➔</span>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Event */}
      {isCreating && (
        <div
          onClick={() => setIsCreating(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card max-w-md w-full p-6 sm:p-7 rounded-3xl flex flex-col gap-5 border border-purple-500/30 shadow-2xl"
          >
            <div>
              <h3 className="text-xl font-bold font-sans text-hero-gradient">Create New Event</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Enter details for your upcoming event.
              </p>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Event Title <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wedding of Sarah & Alex"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input text-xs sm:text-sm w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Subtitle / Date
                </label>
                <input
                  type="text"
                  placeholder="e.g. October 24, 2026 or by Kala Kini"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="input text-xs sm:text-sm w-full"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="setActiveNow"
                  checked={setActiveNow}
                  onChange={(e) => setSetActiveNow(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 bg-black/40 border-white/20 focus:ring-purple-500"
                />
                <label htmlFor="setActiveNow" className="text-xs text-zinc-300 cursor-pointer select-none">
                  Activate this event immediately for the photo booth
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="btn btn-secondary btn-sm text-xs px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-sm text-xs px-5 shadow-lg"
                >
                  {loading ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Event */}
      {editingEvent && (
        <div
          onClick={() => setEditingEvent(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card max-w-md w-full p-6 sm:p-7 rounded-3xl flex flex-col gap-5 border border-purple-500/30 shadow-2xl"
          >
            <div>
              <h3 className="text-xl font-bold font-sans text-hero-gradient">Edit Event</h3>
              <p className="text-xs text-zinc-400 mt-1">Update event name or subtitle.</p>
            </div>

            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Event Title <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingEvent.title}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, title: e.target.value })
                  }
                  className="input text-xs sm:text-sm w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Subtitle / Date
                </label>
                <input
                  type="text"
                  value={editingEvent.subtitle}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, subtitle: e.target.value })
                  }
                  className="input text-xs sm:text-sm w-full"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="btn btn-secondary btn-sm text-xs px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-sm text-xs px-5 shadow-lg"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
