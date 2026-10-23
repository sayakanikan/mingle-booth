/**
 * supabase.js — Supabase client + all DB CRUD helpers
 *
 * Tables used:
 *   photo_sessions   — one row per booth session
 *   session_photos   — one row per individual shot within a session
 *
 * Credentials come from .env (VITE_ prefix exposes them to the browser).
 *
 * HOW TO SET UP:
 *  1. Create a project at https://supabase.com
 *  2. Run the SQL schema from the implementation plan in the SQL Editor
 *  3. Copy Project URL and anon key into .env:
 *       VITE_SUPABASE_URL=https://xxxx.supabase.co
 *       VITE_SUPABASE_ANON_KEY=eyJhbGci...
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/** Returns true when Supabase credentials are configured */
export function isSupabaseConfigured() {
  return !!supabase;
}

/**
 * Test the Supabase connection by pinging the events table.
 * Call this once at startup to surface config problems early.
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export async function testConnection() {
  if (!supabase) {
    return {
      ok: false,
      message: 'Supabase not configured — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env',
    };
  }
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .eq('id', 'default')
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: 'events table exists but "default" row is missing — re-run schema.sql' };
    return { ok: true, message: `Supabase connected ✔  (event: ${data.id})` };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

/* ── Photo Sessions ──────────────────────────────────────────── */

/**
 * Save (upsert) a photo session row.
 *
 * @param {Object} session
 * @param {string}      session.id           - unique session ID (timestamp string)
 * @param {string}      session.layout       - frame ID string e.g. 'frame:uuid' or 'frame:custom'
 * @param {number}      session.photo_count  - how many shots were taken
 * @param {string}      session.strip_url    - Cloudinary JPEG URL
 * @param {string|null} session.gif_url      - Cloudinary GIF URL (nullable)
 * @param {string|null} session.viewer_url   - full QR viewer URL (nullable)
 * @param {number}      session.strip_w      - strip canvas width in px
 * @param {number}      session.strip_h      - strip canvas height in px
 * @param {string|null} session.frame_url    - frame overlay URL used (nullable)
 */
export async function saveSession(session) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('photo_sessions').upsert(session);
  if (error) throw new Error(`saveSession: ${error.message}`);
}

/**
 * Load all sessions newest-first, with their individual photos joined.
 *
 * @param {number} limit - max rows to return
 * @returns {Promise<Array>}
 */
export async function loadSessions(limit = 200) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('photo_sessions')
    .select('*, session_photos(*)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`loadSessions: ${error.message}`);
  // Sort the nested photos by slot_index
  return (data || []).map(s => ({
    ...s,
    session_photos: (s.session_photos || []).sort((a, b) => a.slot_index - b.slot_index),
  }));
}

/**
 * Delete a single session (cascades to session_photos via FK).
 *
 * @param {string} id
 */
export async function deleteSession(id) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('photo_sessions').delete().eq('id', id);
  if (error) throw new Error(`deleteSession: ${error.message}`);
}

/**
 * Delete ALL sessions.
 */
export async function clearSessions() {
  if (!supabase) throw new Error('Supabase not configured');
  // Delete rows where id is not empty string (i.e. all rows)
  const { error } = await supabase.from('photo_sessions').delete().neq('id', '');
  if (error) throw new Error(`clearSessions: ${error.message}`);
}

/* ── Session Photos (individual shots) ──────────────────────── */

/**
 * Save (upsert) the individual photo rows for a session.
 *
 * @param {string} sessionId
 * @param {Array<{
 *   slot_index: number,
 *   url:        string,
 *   slot_x:     number,
 *   slot_y:     number,
 *   slot_w:     number,
 *   slot_h:     number,
 * }>} photos
 */
export async function saveSessionPhotos(sessionId, photos) {
  if (!supabase) throw new Error('Supabase not configured');
  const rows = photos.map(p => ({ session_id: sessionId, ...p }));
  const { error } = await supabase.from('session_photos').upsert(rows);
  if (error) throw new Error(`saveSessionPhotos: ${error.message}`);
}

/**
 * Load individual photos for one session, sorted by slot_index.
 *
 * @param {string} sessionId
 * @returns {Promise<Array>}
 */
export async function loadSessionPhotos(sessionId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('session_photos')
    .select('*')
    .eq('session_id', sessionId)
    .order('slot_index', { ascending: true });
  if (error) throw new Error(`loadSessionPhotos: ${error.message}`);
  return data || [];
}
