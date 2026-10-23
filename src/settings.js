/**
 * settings.js — In-memory settings store backed by Supabase
 *
 * Architecture:
 *   - No localStorage. All persistence goes to Supabase.
 *   - _cache holds the live in-memory copy.
 *   - initSettings() loads from Supabase at startup (must be awaited).
 *   - getSettings() returns a shallow clone synchronously (fast, no await needed).
 *   - saveSettings(patch) updates _cache + fires async DB write.
 *   - Frames have dedicated async helpers (addFrame, activateFrame, etc.).
 */

import { isSupabaseConfigured, supabase } from './supabase.js';

const EVENT_ID = 'default';

const defaultSettings = {
  // Camera
  cameraDeviceId:    null,
  cameraResolution:  '1920x1080',
  mirrorCamera:      true,

  // Event branding
  eventTitle:        'Mingle Booth',
  eventSubtitle:     'Capture Your Memories',
  brandLogoDataUrl:  null,

  // Strip layout
  stripLayout:       '3v',

  // Active frame overlay (full object or null)
  activeFrame:       null,

  // All uploaded frames: [{ id, name, dataUrl, width, height, slots[] }]
  frames: [],

  // Admin
  adminPassword: 'admin1234',

  // Strip appearance
  stripBgColor:    '#1a1a28',
  stripTextColor:  '#ffffff',
  stripShowDate:   true,
  stripShowTitle:  true,
};

/** In-memory settings cache */
let _cache = { ...defaultSettings };

/* ── Mapping helpers ─────────────────────────────────────────── */

function mapEventToSettings(ev) {
  return {
    cameraDeviceId:   ev.camera_device_id   ?? null,
    cameraResolution: ev.camera_resolution  || '1920x1080',
    mirrorCamera:     ev.mirror_camera      ?? true,
    eventTitle:       ev.title              || 'Mingle Booth',
    eventSubtitle:    ev.subtitle           || 'Capture Your Memories',
    brandLogoDataUrl: ev.brand_logo_data_url ?? null,
    stripLayout:      ev.default_layout     || '3v',
    adminPassword:    ev.admin_password     || 'admin1234',
    stripBgColor:     ev.strip_bg_color     || '#1a1a28',
    stripTextColor:   ev.strip_text_color   || '#ffffff',
    stripShowDate:    ev.strip_show_date    ?? true,
    stripShowTitle:   ev.strip_show_title   ?? true,
  };
}

function mapSettingsToEvent(s) {
  return {
    id:                  EVENT_ID,
    title:               s.eventTitle       || 'Mingle Booth',
    subtitle:            s.eventSubtitle    || 'Capture Your Memories',
    brand_logo_data_url: s.brandLogoDataUrl || null,
    strip_bg_color:      s.stripBgColor     || '#1a1a28',
    strip_text_color:    s.stripTextColor   || '#ffffff',
    strip_show_title:    s.stripShowTitle   !== false,
    strip_show_date:     s.stripShowDate    !== false,
    default_layout:      s.stripLayout      || '3v',
    admin_password:      s.adminPassword    || 'admin1234',
    camera_device_id:    s.cameraDeviceId   || null,
    camera_resolution:   s.cameraResolution || '1920x1080',
    mirror_camera:       s.mirrorCamera     !== false,
  };
}

/* ── Init ────────────────────────────────────────────────────── */

/**
 * Load settings from Supabase into the in-memory cache.
 * Must be awaited once at app startup before getSettings() is used.
 *
 * @returns {Promise<Object>} the loaded settings
 */
export async function initSettings() {
  if (!isSupabaseConfigured()) {
    console.warn('[Settings] Supabase not configured — using defaults. Add env vars.');
    return { ..._cache };
  }

  try {
    // Load event settings row
    const { data: ev, error: evErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', EVENT_ID)
      .single();

    if (evErr) {
      console.warn('[Settings] Could not load event row:', evErr.message);
    } else if (ev) {
      _cache = { ..._cache, ...mapEventToSettings(ev) };
    }

    // Load frame overlays
    const { data: frames, error: framesErr } = await supabase
      .from('frames')
      .select('*')
      .eq('event_id', EVENT_ID)
      .order('created_at', { ascending: true });

    if (framesErr) {
      console.warn('[Settings] Could not load frames:', framesErr.message);
    } else if (frames) {
      _cache.frames = frames.map(f => ({
        id:       f.id,
        name:     f.name,
        dataUrl:  f.data_url,
        width:    f.width  || null,
        height:   f.height || null,
        slots:    f.slots  || [],
      }));
      const active = frames.find(f => f.is_active);
      _cache.activeFrame = active ? {
        id:      active.id,
        name:    active.name,
        dataUrl: active.data_url,
        width:   active.width  || null,
        height:  active.height || null,
        slots:   active.slots  || [],
      } : null;
    }

    console.log('[Settings] Loaded from Supabase ✔');
  } catch (e) {
    console.error('[Settings] initSettings failed:', e);
  }

  return { ..._cache };
}

/* ── Read ────────────────────────────────────────────────────── */

/**
 * Return a shallow copy of the current in-memory settings.
 * Always synchronous — no await needed.
 */
export function getSettings() {
  return { ..._cache };
}

/* ── Write ───────────────────────────────────────────────────── */

/**
 * Merge patch into the in-memory cache and persist to Supabase.
 * Note: frame fields (frames, activeFrameDataUrl) are managed by
 *       addFrame / activateFrame / removeFrame / clearActiveFrame.
 *
 * @param {Object} patch
 * @returns {Object} updated settings
 */
export function saveSettings(patch) {
  _cache = { ..._cache, ...patch };

  if (isSupabaseConfigured()) {
    supabase
      .from('events')
      .upsert(mapSettingsToEvent(_cache))
      .then(({ error }) => {
        if (error) console.warn('[Settings] saveSettings failed:', error.message);
      });
  }

  return { ..._cache };
}

/** Reset all settings to defaults and persist. */
export function resetSettings() {
  _cache = { ...defaultSettings };

  if (isSupabaseConfigured()) {
    supabase
      .from('events')
      .upsert(mapSettingsToEvent(_cache))
      .then(({ error }) => { if (error) console.warn('[Settings] resetSettings failed:', error.message); });
  }

  return { ..._cache };
}

/* ── Frame management ────────────────────────────────────────── */

/**
 * Add a new frame overlay and set it as active.
 * @param {{ name: string, dataUrl: string, width: number, height: number, slots: Array }} frame
 */
export async function addFrame({ name, dataUrl, width, height, slots }) {
  if (isSupabaseConfigured()) {
    // Deactivate all existing frames first
    await supabase.from('frames').update({ is_active: false }).eq('event_id', EVENT_ID);

    const { data, error } = await supabase
      .from('frames')
      .insert({ event_id: EVENT_ID, name, data_url: dataUrl, is_active: true, width: width ?? null, height: height ?? null, slots: slots ?? [] })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const frameObj = { id: data.id, name: data.name, dataUrl: data.data_url, width: data.width, height: data.height, slots: data.slots || [] };
    _cache.frames = [...(_cache.frames || []), frameObj];
    _cache.activeFrame = frameObj;
    return data;
  } else {
    // No Supabase — keep in memory only
    const f = { id: Date.now().toString(), name, dataUrl, width: width ?? null, height: height ?? null, slots: slots ?? [] };
    _cache.frames = [...(_cache.frames || []), f];
    _cache.activeFrame = f;
    return f;
  }
}

/**
 * Set a frame as the active overlay.
 * @param {string} frameId
 */
export async function activateFrame(frameId) {
  const frame = (_cache.frames || []).find(f => f.id === frameId);
  if (!frame) return;

  _cache.activeFrame = frame;

  if (!isSupabaseConfigured()) return;
  await supabase.from('frames').update({ is_active: false }).eq('event_id', EVENT_ID);
  await supabase.from('frames').update({ is_active: true }).eq('id', frameId);
}

/**
 * Remove a frame by ID.
 * @param {string} frameId
 */
export async function removeFrame(frameId) {
  const frame = (_cache.frames || []).find(f => f.id === frameId);
  _cache.frames = (_cache.frames || []).filter(f => f.id !== frameId);
  if (frame && _cache.activeFrame?.id === frameId) {
    _cache.activeFrame = null;
  }

  if (!isSupabaseConfigured()) return;
  await supabase.from('frames').delete().eq('id', frameId);
}

/**
 * Update slot configuration (and dimensions) of an existing frame.
 * @param {string} frameId
 * @param {{ slots: Array, width?: number, height?: number }} patch
 */
export async function updateFrameSlots(frameId, { slots, width, height }) {
  const frame = (_cache.frames || []).find(f => f.id === frameId);
  if (!frame) return;
  frame.slots = slots;
  if (width)  frame.width  = width;
  if (height) frame.height = height;
  if (_cache.activeFrame?.id === frameId) _cache.activeFrame = frame;

  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from('frames')
    .update({ slots, width: frame.width, height: frame.height })
    .eq('id', frameId);
  if (error) throw new Error(error.message);
}

/**
 * Deactivate all frames (no overlay).
 */
export async function clearActiveFrame() {
  _cache.activeFrame = null;

  if (!isSupabaseConfigured()) return;
  await supabase.from('frames').update({ is_active: false }).eq('event_id', EVENT_ID);
}

/**
 * Return number of photo shots required by the currently active frame.
 * @returns {number}
 */
export function getActivePhotoCount() {
  return _cache.activeFrame?.slots?.length ?? 0;
}
