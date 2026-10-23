/**
 * main.js — Mingle Booth App entry point
 * Screen state machine + all screen renderers
 */

import './style.css';
import { initSettings, getSettings, saveSettings, addFrame, activateFrame, removeFrame, clearActiveFrame, updateFrameSlots } from './settings.js';
import { getCameraDevices, getDeviceLabel, startCamera, stopCamera, captureFrame } from './camera.js';
import { composeStripFromFrame, canvasToDataUrl, downloadDataUrl } from './composite.js';
import { buildGif, buildAnimatedPreviewEl } from './gifmaker.js';
import { drawQRCode } from './qr.js';
import { initParticles, stopParticles } from './particles.js';
import { playCountdownBeep, playGoBeep, playShutter, playSuccess } from './audio.js';
import { isCloudinaryConfigured, uploadSession } from './cloudinary.js';
import { testConnection, isSupabaseConfigured, saveSession, saveSessionPhotos, loadSessions, deleteSession, clearSessions } from './supabase.js';
import { detectSlots } from './slotDetector.js';
import { createSlotEditor } from './slotEditor.js';
import { generateDefaultFrame } from './defaultFrames.js';

/* ============================================================
   PHOTO VIEWER MODE — activated when QR is scanned
   URL formats:
     Cloud:  ?view=latest&strip=https://...&gif=https://...&originals=url1,url2&title=EventName
   ============================================================ */
const urlParams = new URLSearchParams(window.location.search);
const IS_VIEWER = urlParams.get('view') === 'latest';

if (IS_VIEWER) {
  // ── Resolve assets from URL params (Cloudinary URLs) ──
  const stripUrl     = urlParams.get('strip')     || '';
  const gifUrl       = urlParams.get('gif')       || '';
  const originalsRaw = urlParams.get('originals') || '[]';
  const eventTitle   = urlParams.get('title')     || 'Mingle Booth';
  const isCloud      = !!(urlParams.get('strip')); // true when URLs come from Cloudinary

  let originalUrls = [];
  try { originalUrls = JSON.parse(originalsRaw); } catch { originalUrls = originalsRaw.split(',').filter(Boolean); }

  // ── Styles ────────────────────────────────────────────────────────────────────
  const S = document.createElement('style');
  S.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');

    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Body — mobile-first, safe-area aware ── */
    body {
      font-family: 'Outfit', sans-serif;
      background: #0a0a0f;
      color: #f1f0ff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      /* safe-area insets for notched / dynamic-island phones */
      padding: max(24px, env(safe-area-inset-top))
               max(16px, env(safe-area-inset-right))
               max(40px, env(safe-area-inset-bottom))
               max(16px, env(safe-area-inset-left));
      gap: 24px;
      overflow-x: hidden;
    }

    /* ── Header ── */
    .vw-title {
      font-size: clamp(1.5rem, 6vw, 2.6rem);
      background: linear-gradient(135deg, #c084fc, #f472b6, #38bdf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-align: center;
      font-weight: 700;
      line-height: 1.2;
    }
    .vw-subtitle {
      font-size: clamp(.8rem, 2.5vw, .95rem);
      color: #6b6a88;
      text-align: center;
      letter-spacing: .06em;
    }
    .vw-badge {
      font-size: .78rem;
      padding: 5px 16px;
      border-radius: 9999px;
      background: rgba(56,189,248,.12);
      border: 1px solid rgba(56,189,248,.3);
      color: #38bdf8;
      white-space: nowrap;
    }

    /* ── Sections ── */
    .vw-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      width: 100%;
      max-width: 560px;
    }
    .vw-label {
      font-size: .68rem;
      text-transform: uppercase;
      letter-spacing: .16em;
      color: #6b6a88;
      font-weight: 600;
    }

    /* ── Images — fluid, never overflow viewport ── */
    .vw-img {
      width: 100%;
      max-width: min(400px, 92vw);
      height: auto;
      border-radius: 16px;
      box-shadow: 0 16px 48px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.06);
      display: block;
    }
    .vw-gif {
      width: 100%;
      max-width: min(360px, 88vw);
      height: auto;
      border-radius: 16px;
      box-shadow: 0 12px 36px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.06);
      display: block;
    }

    /* ── Originals grid — 2 cols on small phones, more on wider screens ── */
    .vw-originals {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      width: 100%;
      max-width: 560px;
    }
    .vw-originals a {
      display: block;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,.5);
      transition: transform .18s, box-shadow .18s;
    }
    .vw-originals a:active { transform: scale(.97); }
    .vw-originals img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* ── Buttons — full-width on narrow phones ── */
    .vw-btn-row {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      max-width: 320px;
    }
    .vw-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 24px;
      border-radius: 9999px;
      font-weight: 600;
      font-size: clamp(.88rem, 3vw, .95rem);
      text-decoration: none;
      cursor: pointer;
      border: none;
      min-height: 48px; /* touch target */
      transition: transform .15s, opacity .15s, box-shadow .15s;
      -webkit-tap-highlight-color: transparent;
    }
    .vw-btn:active { transform: scale(.97); opacity: .85; }
    .vw-btn-primary {
      background: linear-gradient(135deg, #c084fc, #f472b6);
      color: #fff;
      box-shadow: 0 4px 20px rgba(192,132,252,.5);
    }
    .vw-btn-primary:active { box-shadow: 0 2px 10px rgba(192,132,252,.4); }
    .vw-btn-secondary {
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.14);
      color: #f1f0ff;
    }

    /* ── Divider ── */
    .vw-divider {
      width: 100%;
      max-width: 400px;
      height: 1px;
      background: rgba(255,255,255,.07);
    }

    /* ── Empty state ── */
    .vw-empty {
      color: #6b6a88;
      text-align: center;
      font-size: .9rem;
      max-width: 280px;
      line-height: 1.7;
    }

    /* ── Tablet: ≥ 600 px — side-by-side cards ── */
    @media (min-width: 600px) {
      body { padding: 40px 32px 60px; gap: 32px; }

      .vw-section { max-width: 680px; }

      .vw-img  { max-width: min(440px, 60vw); }
      .vw-gif  { max-width: min(400px, 56vw); }

      .vw-originals {
        grid-template-columns: repeat(3, 1fr);
        max-width: 680px;
      }

      /* Buttons go side-by-side on tablet */
      .vw-btn-row {
        flex-direction: row;
        justify-content: center;
        max-width: none;
        width: auto;
      }
      .vw-btn { width: auto; padding: 13px 32px; }
    }

    /* ── Desktop: ≥ 900 px — wider layout ── */
    @media (min-width: 900px) {
      body { padding: 56px 48px 72px; gap: 36px; }

      .vw-section { max-width: 820px; }
      .vw-img  { max-width: 420px; }
      .vw-gif  { max-width: 380px; }

      .vw-originals {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        max-width: 820px;
      }

      .vw-btn:hover { transform: translateY(-2px); opacity: .9; }
    }
  `;
  document.head.appendChild(S);

  // ── Title ─────────────────────────────────────────────────────────────────────
  const h1 = document.createElement('h1');
  h1.className = 'vw-title';
  h1.textContent = `📸 ${eventTitle}`;
  document.body.appendChild(h1);

  const sub = document.createElement('p');
  sub.className = 'vw-subtitle';
  sub.textContent = 'Your photo session memories';
  document.body.appendChild(sub);

  if (isCloud) {
    const badge = document.createElement('span');
    badge.className = 'vw-badge';
    badge.textContent = '☁️ Stored in Cloud';
    document.body.appendChild(badge);
  }

  if (!stripUrl && !gifUrl && !originalUrls.length) {
    const msg = document.createElement('p');
    msg.className = 'vw-empty';
    msg.textContent = 'No photos available yet — visit the booth and take some photos first!';
    document.body.appendChild(msg);
  }

  // ── Strip ─────────────────────────────────────────────────────────────────────
  if (stripUrl) {
    const sec = document.createElement('div');
    sec.className = 'vw-section';

    const lbl = document.createElement('p'); lbl.className = 'vw-label'; lbl.textContent = 'Photo Strip';
    const img = document.createElement('img'); img.className = 'vw-img'; img.src = stripUrl; img.alt = 'Photo Strip';
    sec.appendChild(lbl); sec.appendChild(img);

    const btnRow = document.createElement('div'); btnRow.className = 'vw-btn-row';
    const dlBtn  = document.createElement('a');
    dlBtn.className = 'vw-btn vw-btn-primary';
    dlBtn.textContent = '⬇ Download Strip';
    if (isCloud) {
      // Cloud URLs: open in new tab (browser handles save)
      dlBtn.href = stripUrl; dlBtn.target = '_blank';
    } else {
      dlBtn.href = stripUrl;
      dlBtn.download = `${eventTitle.replace(/\s+/g,'-')}-strip-${Date.now()}.jpg`;
    }
    btnRow.appendChild(dlBtn);

    // Web Share API (mobile)
    if (navigator.share && isCloud) {
      const shareBtn = document.createElement('button');
      shareBtn.className = 'vw-btn vw-btn-secondary';
      shareBtn.textContent = '↗ Share';
      shareBtn.onclick = () => navigator.share({ title: eventTitle, url: stripUrl }).catch(() => {});
      btnRow.appendChild(shareBtn);
    }
    sec.appendChild(btnRow);
    document.body.appendChild(sec);
  }

  // ── GIF ───────────────────────────────────────────────────────────────────────
  if (gifUrl) {
    const div = document.createElement('div'); div.className = 'vw-divider';
    document.body.appendChild(div);

    const sec = document.createElement('div'); sec.className = 'vw-section';
    const lbl = document.createElement('p'); lbl.className = 'vw-label'; lbl.textContent = 'Animated GIF';
    const gif = document.createElement('img'); gif.className = 'vw-gif'; gif.src = gifUrl; gif.alt = 'Animated GIF';
    sec.appendChild(lbl); sec.appendChild(gif);

    const btnRow = document.createElement('div'); btnRow.className = 'vw-btn-row';
    const dlBtn  = document.createElement('a');
    dlBtn.className = 'vw-btn vw-btn-secondary';
    dlBtn.textContent = '⬇ Download GIF';
    dlBtn.href = gifUrl;
    if (isCloud) { dlBtn.target = '_blank'; }
    else { dlBtn.download = `${eventTitle.replace(/\s+/g,'-')}-${Date.now()}.gif`; }
    btnRow.appendChild(dlBtn);
    sec.appendChild(btnRow);
    document.body.appendChild(sec);
  }

  // ── Original photos grid ──────────────────────────────────────────────────────
  if (originalUrls.length > 0) {
    const div = document.createElement('div'); div.className = 'vw-divider';
    document.body.appendChild(div);

    const sec = document.createElement('div'); sec.className = 'vw-section';
    const lbl = document.createElement('p');
    lbl.className = 'vw-label';
    lbl.textContent = `Original Photos (${originalUrls.length})`;
    sec.appendChild(lbl);

    const grid = document.createElement('div'); grid.className = 'vw-originals';
    originalUrls.forEach((url, i) => {
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.title = `Photo ${i + 1}`;
      const img = document.createElement('img');
      img.src = url; img.alt = `Photo ${i + 1}`;
      img.loading = 'lazy';
      a.appendChild(img); grid.appendChild(a);
    });
    sec.appendChild(grid);
    document.body.appendChild(sec);
  }

  // Viewer rendered — stop here, don't mount the main app
}


/* ============================================================
   APP STATE
   ============================================================ */
const AppState = {
  SCREENSAVER: 'screensaver',
  CAPTURE:     'capture',
  PROCESSING:  'processing',
  RESULT:      'result',
  ADMIN:       'admin',
};

let currentState = null;
let settings     = {}; // populated by initSettings() in the async bootstrap below
let capturedPhotos   = [];      // HTMLCanvasElement[]
let resultStripDataUrl  = null;
let resultGifDataUrl    = null;
let resultGifBlob       = null;
let resultCloudinaryUrls = null; // { stripUrl, gifUrl, originalUrls[], viewerUrl }
let resultSessionId     = null;
let resultStripCanvas   = null;  // keep canvas ref for upload
let adminPanelSection  = 'camera';
let captureSequenceRunning = false;

/* ============================================================
   DOM BOOTSTRAP — only runs when NOT in viewer mode
   ============================================================ */
let app, particleCanvas, toastContainer, adminTrigger, pwdModal, screens;
let triggerClicks = 0, triggerTimer;

if (!IS_VIEWER) {
  (async () => {
    // ── 1. Test Supabase connection ──────────────────────────
    const connResult = await testConnection();
    console.log(connResult.ok
      ? `%c[Supabase] ${connResult.message}` : `%c[Supabase] ⚠ ${connResult.message}`,
      connResult.ok ? 'color:#4ade80' : 'color:#f87171'
    );

    // ── 2. Load settings from Supabase ───────────────────────
    settings = await initSettings();

    // ── 3. Build DOM ─────────────────────────────────────────
    app = document.getElementById('app');

    // Create particle canvas
    particleCanvas = document.createElement('canvas');
    particleCanvas.id = 'particle-canvas';
    app.appendChild(particleCanvas);

    // Toast container
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    app.appendChild(toastContainer);

    // Admin hidden trigger (top-right corner)
    adminTrigger = document.createElement('div');
    adminTrigger.id = 'admin-trigger';
    adminTrigger.title = '';
    app.appendChild(adminTrigger);

    // Password modal
    pwdModal = createPasswordModal();
    app.appendChild(pwdModal.el);

    // Screens
    screens = {
      [AppState.SCREENSAVER]: createScreenSaver(),
      [AppState.CAPTURE]:     createCaptureScreen(),
      [AppState.PROCESSING]:  createProcessingScreen(),
      [AppState.RESULT]:      createResultScreen(),
      [AppState.ADMIN]:       createAdminPanel(),
    };
    Object.values(screens).forEach(s => app.appendChild(s.el));

    /* Init */
    initParticles(particleCanvas);
    transitionTo(AppState.SCREENSAVER);

    // Admin trigger: triple-click top-right corner
    adminTrigger.addEventListener('click', () => {
      triggerClicks++;
      clearTimeout(triggerTimer);
      triggerTimer = setTimeout(() => { triggerClicks = 0; }, 800);
      if (triggerClicks >= 3) {
        triggerClicks = 0;
        pwdModal.open();
      }
    });
  })();
}

/* ============================================================
   STATE MACHINE
   ============================================================ */
function transitionTo(newState) {
  if (currentState === newState) return;

  // Exit current
  if (currentState && screens[currentState]) {
    const el = screens[currentState].el;
    el.classList.remove('active');
    el.classList.add('exit');
    setTimeout(() => el.classList.remove('exit'), 600);
    screens[currentState].onExit?.();
  }

  const prev = currentState;
  currentState = newState;

  // Enter new
  const screen = screens[newState];
  setTimeout(() => {
    screen.el.classList.add('active');
    screen.onEnter?.();
  }, prev ? 100 : 0);
}

/* ============================================================
   ASPECT RATIO FORMATTER HELPER
   ============================================================ */
function formatAspectRatio(w, h) {
  if (!w || !h) return '';
  const ratio = w / h;
  let label = '';
  if (Math.abs(ratio - 1) < 0.04) label = 'Square (1:1)';
  else if (Math.abs(ratio - 4/3) < 0.04) label = 'Landscape (4:3)';
  else if (Math.abs(ratio - 3/4) < 0.04) label = 'Portrait (3:4)';
  else if (Math.abs(ratio - 16/9) < 0.04) label = 'Widescreen (16:9)';
  else if (Math.abs(ratio - 9/16) < 0.04) label = 'Story (9:16)';
  else if (Math.abs(ratio - 3/2) < 0.04) label = 'Classic (3:2)';
  else if (Math.abs(ratio - 2/3) < 0.04) label = 'Portrait (2:3)';
  else {
    function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
    const d = gcd(w, h);
    const rw = Math.round(w / d);
    const rh = Math.round(h / d);
    label = (rw < 20 && rh < 20) ? `${rw}:${rh}` : 'Custom Crop';
  }
  return `${label} · ${w}×${h}px`;
}

/* ============================================================
   SCREEN: SCREENSAVER
   ============================================================ */
function createScreenSaver() {
  const el = document.createElement('div');
  el.id = 'screen-saver';
  el.className = 'screen';

  el.innerHTML = `
    <div class="ss-bg-glow"></div>
    <div class="ss-floating-frames" id="ss-frames"></div>

    <div class="ss-logo-wrap">
      <img class="ss-brand-logo" id="ss-logo" src="" alt="Brand Logo" />
      <h1 class="ss-title" id="ss-title">Mingle Booth</h1>
      <p class="ss-subtitle" id="ss-subtitle">Capture Your Memories</p>
    </div>

    <div class="ss-tap-prompt">
      <div class="ss-tap-ring">
        <span class="ss-tap-icon">📸</span>
      </div>
      <p class="ss-tap-label">Touch Anywhere to Start</p>
    </div>

    <div class="ss-no-frame-pill" id="ss-no-frame-pill" style="display:none;">
      ⚠ No active frame · Triple-tap top-right for Admin
    </div>
  `;

  // Spawn floating decorative frames
  const framesContainer = el.querySelector('#ss-frames');
  for (let i = 0; i < 6; i++) {
    const frame = document.createElement('div');
    frame.className = 'ss-frame';
    const size = 80 + Math.random() * 100;
    frame.style.cssText = `
      width: ${size}px;
      height: ${size * 1.35}px;
      left: ${Math.random() * 90}%;
      --r: ${(Math.random() - 0.5) * 30}deg;
      animation-duration: ${8 + Math.random() * 12}s;
      animation-delay: -${Math.random() * 10}s;
    `;
    framesContainer.appendChild(frame);
  }

  // Click anywhere to start
  el.addEventListener('click', () => {
    transitionTo(AppState.CAPTURE);
  });

  return {
    el,
    onEnter() {
      // Refresh settings-driven content
      settings = getSettings();
      const titleEl = el.querySelector('#ss-title');
      const subtitleEl = el.querySelector('#ss-subtitle');
      const logoEl = el.querySelector('#ss-logo');
      const noFramePill = el.querySelector('#ss-no-frame-pill');

      titleEl.textContent    = settings.eventTitle    || 'Mingle Booth';
      subtitleEl.textContent = settings.eventSubtitle || 'Capture Your Memories';

      if (settings.brandLogoDataUrl) {
        logoEl.src = settings.brandLogoDataUrl;
        logoEl.classList.add('visible');
      } else {
        logoEl.classList.remove('visible');
      }

      const activeFrame = settings.activeFrame;
      if (noFramePill) {
        noFramePill.style.display = (!activeFrame || !activeFrame.slots?.length) ? 'block' : 'none';
      }
    },
    onExit() {},
  };
}

/* ============================================================
   SCREEN: CAPTURE
   ============================================================ */
function createCaptureScreen() {
  const el = document.createElement('div');
  el.id = 'screen-capture';
  el.className = 'screen';

  el.innerHTML = `
    <div class="capture-stage" id="capture-stage">
      <div class="capture-crop-box" id="capture-crop-box">
        <video id="camera-video" autoplay muted playsinline></video>
        <canvas id="overlay-canvas"></canvas>
        <div class="camera-flash" id="camera-flash"></div>
        <div class="shot-aspect-badge" id="shot-aspect-badge"></div>
      </div>
      <div class="capture-no-frame-overlay" id="capture-no-frame" style="display:none;">
        <div class="capture-no-frame-card">
          <div style="font-size:3rem;line-height:1;">🖼️</div>
          <h3 style="font-size:1.3rem;font-weight:700;margin-top:8px;">Frame Configuration Required</h3>
          <p style="color:var(--clr-text-2);font-size:0.95rem;line-height:1.5;">
            No active frame is selected or the active frame has no photo slots defined.
          </p>
          <div style="display:flex;gap:12px;margin-top:16px;">
            <button class="btn btn-primary btn-sm" id="btn-open-admin-from-capture">⚙ Open Admin Panel</button>
            <button class="btn btn-secondary btn-sm" id="btn-back-home-from-capture">🏠 Back to Home</button>
          </div>
        </div>
      </div>
    </div>
    <div class="capture-sidebar">
      <div class="capture-shots-strip" id="shots-strip"></div>
      <div class="countdown-wrap" id="countdown-wrap">
        <div class="countdown-number" id="countdown-num">
          <svg viewBox="0 0 108 108">
            <circle class="countdown-ring" id="countdown-ring" cx="54" cy="54" r="50"/>
          </svg>
          <span id="countdown-text">●</span>
        </div>
        <div class="countdown-label" id="countdown-label">Get ready!</div>
      </div>
      <div class="capture-shot-counter" id="shot-counter"></div>
      <button class="btn btn-secondary btn-sm" id="btn-capture-cancel" style="margin-top:auto;width:100%;opacity:0.7;">🏠 Back to Home</button>
    </div>
  `;

  const cropBox       = el.querySelector('#capture-crop-box');
  const video         = el.querySelector('#camera-video');
  const flashEl       = el.querySelector('#camera-flash');
  const aspectBadge   = el.querySelector('#shot-aspect-badge');
  const noFrameEl     = el.querySelector('#capture-no-frame');
  const btnOpenAdmin  = el.querySelector('#btn-open-admin-from-capture');
  const btnBackHome   = el.querySelector('#btn-back-home-from-capture');
  const shotsStrip    = el.querySelector('#shots-strip');
  const cdNum         = el.querySelector('#countdown-num');
  const cdText        = el.querySelector('#countdown-text');
  const cdRing        = el.querySelector('#countdown-ring');
  const cdLabel       = el.querySelector('#countdown-label');
  const shotCounter   = el.querySelector('#shot-counter');

  const RING_CIRCUMFERENCE = 314; // 2 * π * 50

  function updateShotThumbs(capturedCount, totalCount) {
    shotsStrip.innerHTML = '';
    for (let i = 0; i < totalCount; i++) {
      const thumb = document.createElement('div');
      thumb.className = 'shot-thumb' +
        (i === capturedCount ? ' active' : '') +
        (i < capturedCount ? ' done' : '');

      if (capturedPhotos[i]) {
        const img = document.createElement('img');
        img.src = capturedPhotos[i].toDataURL('image/jpeg', 0.5);
        thumb.appendChild(img);
      } else {
        const numEl = document.createElement('div');
        numEl.className = 'shot-thumb-num';
        numEl.textContent = i + 1;
        thumb.appendChild(numEl);
      }
      shotsStrip.appendChild(thumb);
    }
  }

  function setCountdown(n, total) {
    if (n === 0) {
      cdText.textContent = '😊';
      cdLabel.innerHTML  = '<span class="smile-text">SMILE! 📸</span>';
      cdRing.style.strokeDashoffset = 0;
      return;
    }
    cdText.textContent = n;
    cdLabel.textContent = 'Get ready...';
    cdNum.classList.remove('tick');
    void cdNum.offsetWidth; // reflow
    cdNum.classList.add('tick');

    const progress = (total - n) / total;
    cdRing.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);
  }

  async function runCapture() {
    if (captureSequenceRunning) return;
    captureSequenceRunning = true;
    capturedPhotos = [];

    settings = getSettings();
    const activeFrame  = settings.activeFrame;
    const sortedSlots  = [...(activeFrame?.slots || [])].sort((a, b) => a.slot_index - b.slot_index);
    const totalPhotos  = sortedSlots.length;

    if (!totalPhotos) {
      captureSequenceRunning = false;
      noFrameEl.style.display = 'flex';
      return;
    }

    updateShotThumbs(0, totalPhotos);

    for (let shot = 0; shot < totalPhotos; shot++) {
      // Check if cancelled between shots
      if (!captureSequenceRunning) return;

      // Update camera aspect ratio for this slot
      const slot = sortedSlots[shot];
      if (slot && cropBox) {
        cropBox.style.aspectRatio = `${slot.w} / ${slot.h}`;
        const desc = formatAspectRatio(slot.w, slot.h);
        if (aspectBadge) aspectBadge.textContent = desc;
        shotCounter.innerHTML = `Shot <strong>${shot + 1}</strong> of ${totalPhotos}<div style="font-size:0.75rem;opacity:0.75;margin-top:2px;">${desc}</div>`;
      }

      // Countdown 5..1
      const COUNTDOWN = 5;
      cdRing.style.strokeDashoffset = RING_CIRCUMFERENCE;

      for (let n = COUNTDOWN; n >= 1; n--) {
        if (!captureSequenceRunning) return; // cancelled mid-countdown
        setCountdown(n, COUNTDOWN);
        if (n > 1) playCountdownBeep();
        else       playGoBeep();
        await sleep(1000);
      }

      if (!captureSequenceRunning) return; // cancelled just before capture

      // SMILE!
      setCountdown(0, COUNTDOWN);
      await sleep(300);

      if (!captureSequenceRunning) return;

      // Capture photo
      const photoCanvas = captureFrame(video, settings.mirrorCamera !== false);
      capturedPhotos.push(photoCanvas);

      // Flash effect
      playShutter();
      flashEl.classList.add('flash');
      setTimeout(() => flashEl.classList.remove('flash'), 400);

      updateShotThumbs(shot + 1, totalPhotos);
      cdRing.style.strokeDashoffset = RING_CIRCUMFERENCE;
      cdText.textContent = '●';
      cdLabel.textContent = shot < totalPhotos - 1 ? 'Great! Next shot...' : 'All done! 🎉';

      if (shot < totalPhotos - 1) await sleep(1200);
    }

    if (!captureSequenceRunning) return; // cancelled after last shot

    captureSequenceRunning = false;
    playSuccess();
    await sleep(600);
    transitionTo(AppState.PROCESSING);
  }

  return {
    el,
    async onEnter() {
      captureSequenceRunning = false;
      capturedPhotos = [];
      settings = getSettings();

      const activeFrame = settings.activeFrame;
      const sortedSlots = [...(activeFrame?.slots || [])].sort((a, b) => a.slot_index - b.slot_index);

      // Wire up cancel button
      const cancelBtn = el.querySelector('#btn-capture-cancel');
      cancelBtn.onclick = () => {
        captureSequenceRunning = false;
        transitionTo(AppState.SCREENSAVER);
      };

      // Graceful fallback if no frame or frame has no slots
      if (!sortedSlots.length) {
        noFrameEl.style.display = 'flex';
        btnOpenAdmin.onclick = () => {
          pwdModal?.open();
        };
        btnBackHome.onclick = () => {
          transitionTo(AppState.SCREENSAVER);
        };
        return;
      }
      noFrameEl.style.display = 'none';

      // Set initial crop aspect ratio
      if (cropBox && sortedSlots[0]) {
        cropBox.style.aspectRatio = `${sortedSlots[0].w} / ${sortedSlots[0].h}`;
        if (aspectBadge) aspectBadge.textContent = formatAspectRatio(sortedSlots[0].w, sortedSlots[0].h);
      }

      // Start camera
      try {
        const stream = await startCamera(settings.cameraDeviceId, settings.cameraResolution);
        video.srcObject = stream;
        await video.play();
        video.style.transform = settings.mirrorCamera !== false ? 'scaleX(-1)' : 'scaleX(1)';
      } catch (err) {
        toast('Camera error: ' + err.message, 'error');
        console.error(err);
      }

      // Small delay then start capture sequence
      setTimeout(runCapture, 1000);
    },
    onExit() {
      stopCamera();
      video.srcObject = null;
      captureSequenceRunning = false;
    },
  };
}

/* ============================================================
   SCREEN: PROCESSING
   ============================================================ */
function createProcessingScreen() {
  const el = document.createElement('div');
  el.id = 'screen-processing';
  el.className = 'screen';

  el.innerHTML = `
    <div class="processing-animation">
      <div class="processing-ring"></div>
      <div class="processing-ring-2"></div>
      <span class="processing-icon">✨</span>
    </div>
    <h2 class="processing-title">Creating your masterpiece…</h2>
    <div class="processing-steps">
      <div class="proc-step" id="proc-step-1">
        <span class="proc-step-icon">🖼️</span>
        <span>Composing photo strip</span>
      </div>
      <div class="proc-step" id="proc-step-2">
        <span class="proc-step-icon">🎞️</span>
        <span>Generating animated GIF</span>
      </div>
      <div class="proc-step" id="proc-step-3">
        <span class="proc-step-icon">☁️</span>
        <span id="proc-step-3-label">Uploading to cloud</span>
        <span class="proc-upload-pct" id="proc-upload-pct"></span>
      </div>
      <div class="proc-step" id="proc-step-4">
        <span class="proc-step-icon">📱</span>
        <span>Preparing QR code</span>
      </div>
    </div>
  `;

  const steps = [
    el.querySelector('#proc-step-1'),
    el.querySelector('#proc-step-2'),
    el.querySelector('#proc-step-3'),
    el.querySelector('#proc-step-4'),
  ];
  const uploadPctEl = el.querySelector('#proc-upload-pct');
  const step3Label  = el.querySelector('#proc-step-3-label');

  function setStep(i, status) {
    steps.forEach(s => { s.classList.remove('active', 'done'); });
    if (status === 'active') {
      for (let j = 0; j < i; j++) steps[j].classList.add('done');
      steps[i].classList.add('active');
    } else if (status === 'done') {
      steps.forEach(s => s.classList.add('done'));
    }
  }

  async function process() {
    settings = getSettings();
    resultCloudinaryUrls = null;
    resultSessionId = Date.now().toString();

    // Step 1: Compose strip
    setStep(0, 'active');
    await sleep(400);
    let stripCanvas;
    try {
      const activeFrame = settings.activeFrame;
      if (!activeFrame) throw new Error('No active frame configured');
      stripCanvas = await composeStripFromFrame(capturedPhotos, {
        frameDataUrl: activeFrame.dataUrl,
        frameWidth:   activeFrame.width  || 800,
        frameHeight:  activeFrame.height || 2400,
        slots:        [...(activeFrame.slots || [])].sort((a, b) => a.slot_index - b.slot_index),
        bgColor:      settings.stripBgColor   || '#1a1a28',
        textColor:    settings.stripTextColor || '#ffffff',
        showTitle:    settings.stripShowTitle !== false,
        eventTitle:   settings.eventTitle || 'Mingle Booth',
        showDate:     settings.stripShowDate  !== false,
      });
      resultStripCanvas  = stripCanvas;
      resultStripDataUrl = canvasToDataUrl(stripCanvas, 0.92);
    } catch (err) {
      console.error('Strip compose error:', err);
      toast('Strip generation error: ' + err.message, 'error');
    }

    // Step 2: GIF
    setStep(1, 'active');
    await sleep(300);
    try {
      const result = await buildGif(capturedPhotos, {
        width: 480, height: 360, delay: 700, quality: 8,
      });
      resultGifDataUrl = result.dataUrl;
      resultGifBlob    = result.blob;
    } catch (err) {
      console.warn('GIF generation failed, using fallback:', err);
      resultGifDataUrl = null;
      resultGifBlob    = null;
    }

    // Step 3: Upload to Cloudinary
    setStep(2, 'active');
    if (isCloudinaryConfigured()) {
      try {
        const uploadResults = await uploadSession({
          stripCanvas,
          gifBlob:        resultGifBlob,
          originalPhotos: capturedPhotos,
          sessionId:      resultSessionId,
          eventTitle:     settings.eventTitle || 'Mingle Booth',
          onStepUpdate:   (asset, pct) => {
            const labels = {
              strip:     `Uploading strip… ${pct}%`,
              gif:       `Uploading GIF… ${pct}%`,
              originals: `Uploading originals… ${pct}%`,
            };
            if (step3Label)  step3Label.textContent  = labels[asset] || `Uploading… ${pct}%`;
            if (uploadPctEl) uploadPctEl.textContent = '';
          },
        });

        resultCloudinaryUrls = {
          stripUrl:      uploadResults.strip?.secure_url  || null,
          gifUrl:        uploadResults.gif?.secure_url    || null,
          originalUrls:  (uploadResults.originals || []).map(r => r.secure_url),
          // Build viewer URL: encoded in QR so phone opens a Cloudinary-hosted page
          viewerUrl:     buildCloudinaryViewerUrl(uploadResults),
        };

        if (step3Label) step3Label.textContent = 'Uploaded to cloud ✔';

        // ── Save to Supabase ────────────────────────────────────
        if (isSupabaseConfigured()) {
          try {
            const activeFrame  = settings.activeFrame;
            const frameSlots   = [...(activeFrame?.slots || [])].sort((a, b) => a.slot_index - b.slot_index);

            await saveSession({
              id:          resultSessionId,
              event_id:    'default',
              layout:      `frame:${activeFrame?.id || 'custom'}`,
              photo_count: capturedPhotos.length,
              strip_url:   resultCloudinaryUrls.stripUrl,
              gif_url:     resultCloudinaryUrls.gifUrl     || null,
              viewer_url:  resultCloudinaryUrls.viewerUrl  || null,
              strip_w:     activeFrame?.width  ?? 800,
              strip_h:     activeFrame?.height ?? 2400,
              frame_url:   activeFrame?.id || null,
            });

            const photoRows = resultCloudinaryUrls.originalUrls.map((url, i) => {
              const slot = frameSlots[i] || {};
              return {
                slot_index: i, url,
                slot_x: slot.x ?? 0, slot_y: slot.y ?? 0,
                slot_w: slot.w ?? 0, slot_h: slot.h ?? 0,
              };
            });
            await saveSessionPhotos(resultSessionId, photoRows);

            console.log('[Supabase] Session saved:', resultSessionId);
          } catch (dbErr) {
            console.warn('[Supabase] Save failed:', dbErr);
          }
        }
      } catch (err) {
        console.warn('Cloudinary upload failed:', err);
        if (step3Label) step3Label.textContent = 'Upload failed — will retry on result screen';
        toast('Cloud upload failed — you can retry on the result screen', 'error');
      }
    } else {
      if (step3Label) step3Label.textContent = 'Cloud upload — not configured';
    }

    // Step 4: Save to gallery + prepare QR
    setStep(3, 'active');
    await sleep(300);

    // Gallery is saved to Supabase in the upload step above (saveSession + saveSessionPhotos).
    // Nothing to do here — Supabase is the single source of truth.

    setStep(3, 'done');
    await sleep(400);
    transitionTo(AppState.RESULT);
  }

  /** Build a self-contained viewer URL using Cloudinary URLs as query params */
  function buildCloudinaryViewerUrl(uploadResults) {
    const base   = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({ view: 'latest' });
    if (uploadResults.strip?.secure_url) params.set('strip', uploadResults.strip.secure_url);
    if (uploadResults.gif?.secure_url)   params.set('gif',   uploadResults.gif.secure_url);
    const origUrls = (uploadResults.originals || []).map(r => r.secure_url).filter(Boolean);
    if (origUrls.length) params.set('originals', origUrls.join(','));
    if (settings.eventTitle) params.set('title', settings.eventTitle);
    return `${base}?${params.toString()}`;
  }

  return {
    el,
    onEnter() {
      steps.forEach(s => { s.classList.remove('active','done'); });
      if (uploadPctEl) uploadPctEl.textContent = '';
      if (step3Label)  step3Label.textContent  = 'Uploading to cloud';
      process();
    },
    onExit() {},
  };
}

/* ============================================================
   SCREEN: RESULT
   ============================================================ */
function createResultScreen() {
  const el = document.createElement('div');
  el.id = 'screen-result';
  el.className = 'screen';

  el.innerHTML = `
    <div class="result-header">
      <h2 class="result-title">Your Photos Are Ready! 🎉</h2>
      <p class="result-subtitle">Scan the QR code to view &amp; download your memories</p>
      <div class="result-cloud-badge" id="result-cloud-badge" style="display:none;"></div>
    </div>

    <div class="result-content">
      <div class="result-strip-wrap">
        <div class="result-strip-label">Photo Strip</div>
        <canvas id="result-canvas-strip"></canvas>
      </div>

      <div style="display:flex;flex-direction:column;gap:24px;align-items:center;">
        <div class="result-strip-wrap" id="gif-wrap">
          <div class="result-strip-label">Animated GIF</div>
          <div id="gif-preview-container"></div>
        </div>

        <div class="result-qr-wrap">
          <div class="result-qr-title">📱 Scan to Download</div>
          <canvas id="qr-code-canvas"></canvas>
          <p class="result-qr-note" id="result-qr-note">Point your phone camera at the QR code to get your photos</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:4px;">
            <button class="btn btn-sm btn-secondary" id="btn-dl-strip">⬇ Download Strip</button>
            <button class="btn btn-sm btn-secondary" id="btn-dl-gif" style="display:none;">⬇ Download GIF</button>
          </div>
        </div>
      </div>
    </div>

    <div class="result-actions">
      <button class="btn btn-primary" id="btn-result-done">Take More Photos 📸</button>
      <button class="btn btn-secondary" id="btn-result-home">Back to Start 🏠</button>
    </div>

    <div class="result-retry-wrap" id="result-retry-wrap" style="display:none;">
      <button class="btn btn-secondary btn-sm" id="btn-retry-upload">🔄 Retry Upload</button>
      <span class="result-retry-label" id="result-retry-label"></span>
    </div>
  `;

  const stripCanvas   = el.querySelector('#result-canvas-strip');
  const qrCanvas      = el.querySelector('#qr-code-canvas');
  const gifContainer  = el.querySelector('#gif-preview-container');
  const btnDlStrip    = el.querySelector('#btn-dl-strip');
  const btnDlGif      = el.querySelector('#btn-dl-gif');
  const btnDone       = el.querySelector('#btn-result-done');
  const btnHome       = el.querySelector('#btn-result-home');
  const cloudBadge    = el.querySelector('#result-cloud-badge');
  const qrNote        = el.querySelector('#result-qr-note');
  const retryWrap     = el.querySelector('#result-retry-wrap');
  const btnRetry      = el.querySelector('#btn-retry-upload');
  const retryLabel    = el.querySelector('#result-retry-label');

  btnDone.addEventListener('click', () => { transitionTo(AppState.CAPTURE); });
  btnHome.addEventListener('click', () => { transitionTo(AppState.SCREENSAVER); });

  btnRetry.addEventListener('click', async () => {
    if (!isCloudinaryConfigured() || !resultStripCanvas) return;
    btnRetry.disabled = true;
    retryLabel.textContent = 'Uploading…';
    try {
      const uploadResults = await uploadSession({
        stripCanvas:    resultStripCanvas,
        gifBlob:        resultGifBlob,
        originalPhotos: capturedPhotos,
        sessionId:      resultSessionId,
        eventTitle:     settings.eventTitle || 'Mingle Booth',
        onStepUpdate:   (asset, pct) => {
          const labels = { strip: `Strip ${pct}%`, gif: `GIF ${pct}%`, originals: `Originals ${pct}%` };
          retryLabel.textContent = labels[asset] || `Uploading… ${pct}%`;
        },
      });
      resultCloudinaryUrls = {
        stripUrl:     uploadResults.strip?.secure_url  || null,
        gifUrl:       uploadResults.gif?.secure_url    || null,
        originalUrls: (uploadResults.originals || []).map(r => r.secure_url),
        viewerUrl:    buildCloudinaryViewerUrl(uploadResults),
      };
      retryLabel.textContent = '✔ Uploaded!';
      retryWrap.style.display = 'none';

      // Refresh cloud badge & QR with new cloud URL
      if (cloudBadge) {
        cloudBadge.textContent = '☁️ Photos uploaded to cloud';
        cloudBadge.style.display = '';
        cloudBadge.className = 'result-cloud-badge cloud-ok';
      }
      const qrTarget = resultCloudinaryUrls.viewerUrl
        || (window.location.origin + window.location.pathname + '?view=latest');
      await drawQRCode(qrCanvas, qrTarget, { width: 200 });
      if (qrNote) qrNote.textContent = 'Scan to view & download your photos from the cloud ☁️';
      toast('Upload successful! ☁️', 'success');
    } catch (err) {
      console.warn('Retry upload failed:', err);
      retryLabel.textContent = 'Retry failed. Try again.';
      btnRetry.disabled = false;
      toast('Retry failed: ' + err.message, 'error');
    }
  });

  function buildCloudinaryViewerUrl(uploadResults) {
    const base   = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({ view: 'latest' });
    if (uploadResults.strip?.secure_url) params.set('strip', uploadResults.strip.secure_url);
    if (uploadResults.gif?.secure_url)   params.set('gif',   uploadResults.gif.secure_url);
    const origUrls = (uploadResults.originals || []).map(r => r.secure_url).filter(Boolean);
    if (origUrls.length) params.set('originals', origUrls.join(','));
    if (settings.eventTitle) params.set('title', settings.eventTitle);
    return `${base}?${params.toString()}`;
  }

  btnDlStrip.addEventListener('click', () => {
    // Prefer Cloudinary URL (opens in new tab / native share on mobile)
    const cloudUrl = resultCloudinaryUrls?.stripUrl;
    if (cloudUrl) {
      window.open(cloudUrl, '_blank');
      toast('Opening strip in new tab — long-press to save!', 'success');
    } else if (resultStripDataUrl) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      downloadDataUrl(resultStripDataUrl, `mingle-booth-strip-${ts}.jpg`);
      toast('Strip downloaded!', 'success');
    }
  });
  btnDlGif.addEventListener('click', () => {
    const cloudUrl = resultCloudinaryUrls?.gifUrl;
    if (cloudUrl) {
      window.open(cloudUrl, '_blank');
      toast('Opening GIF in new tab — long-press to save!', 'success');
    } else if (resultGifBlob) {
      const url = URL.createObjectURL(resultGifBlob);
      const a = document.createElement('a');
      a.href = url; a.download = `mingle-booth-${Date.now()}.gif`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast('GIF downloaded!', 'success');
    } else if (resultGifDataUrl) {
      downloadDataUrl(resultGifDataUrl, `mingle-booth-${Date.now()}.gif`);
    }
  });


  return {
    el,
    async onEnter() {
      gifContainer.innerHTML = '';

      // Draw strip preview
      if (resultStripDataUrl) {
        const img = new Image();
        img.onload = () => {
          stripCanvas.width  = img.naturalWidth;
          stripCanvas.height = img.naturalHeight;
          const ctx = stripCanvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
        };
        img.src = resultStripDataUrl;
      }

      // Cloud badge
      if (cloudBadge) {
        if (resultCloudinaryUrls?.stripUrl) {
          cloudBadge.textContent = '☁️ Photos uploaded to cloud';
          cloudBadge.style.display = '';
          cloudBadge.className = 'result-cloud-badge cloud-ok';
        } else if (isCloudinaryConfigured()) {
          cloudBadge.textContent = '⚠️ Cloud upload failed — photos available locally';
          cloudBadge.style.display = '';
          cloudBadge.className = 'result-cloud-badge cloud-warn';
        } else {
          cloudBadge.style.display = 'none';
        }
      }

      // GIF preview
      if (resultGifDataUrl) {
        const gifImg = document.createElement('img');
        gifImg.src = resultCloudinaryUrls?.gifUrl || resultGifDataUrl;
        gifImg.className = 'result-gif-img';
        gifContainer.appendChild(gifImg);
        btnDlGif.style.display = '';
      } else {
        const previewEl = buildAnimatedPreviewEl(capturedPhotos, 700);
        gifContainer.appendChild(previewEl);
        btnDlGif.style.display = 'none';
      }

      // QR code — use Cloudinary viewer URL if available, else fall back to local
      try {
        const qrTarget = resultCloudinaryUrls?.viewerUrl
          || (window.location.origin + window.location.pathname + '?view=latest');
        await drawQRCode(qrCanvas, qrTarget, { width: 200 });

        if (qrNote) {
          qrNote.textContent = resultCloudinaryUrls?.viewerUrl
            ? 'Scan to view & download your photos from the cloud ☁️'
            : 'Point your phone camera at the QR code to get your photos';
        }
      } catch (e) {
        console.warn('QR error:', e);
      }

      // Show retry button if upload failed
      if (isCloudinaryConfigured() && !resultCloudinaryUrls?.stripUrl) {
        retryWrap.style.display = '';
        btnRetry.disabled = false;
        retryLabel.textContent = 'Upload did not complete.';
      } else {
        retryWrap.style.display = 'none';
      }
    },
    onExit() {},
  };
}

/* ============================================================
   SCREEN: ADMIN PANEL
   ============================================================ */
function createAdminPanel() {
  const el = document.createElement('div');
  el.id = 'screen-admin';
  el.className = 'screen';

  el.innerHTML = `
    <div class="admin-topbar">
      <div class="admin-topbar-title">Admin Dashboard</div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-sm btn-secondary" id="admin-save-btn">💾 Save Settings</button>
        <button class="btn btn-sm btn-secondary" id="admin-close-btn">✕ Close</button>
      </div>
    </div>
    <div class="admin-body">
      <nav class="admin-nav">
        <button class="admin-nav-btn active" data-section="camera">📷 Camera</button>
        <button class="admin-nav-btn" data-section="branding">🎨 Branding</button>
        <button class="admin-nav-btn" data-section="frames">🖼️ Frames & Layout</button>
        <button class="admin-nav-btn" data-section="gallery">🗂️ Gallery</button>
        <button class="admin-nav-btn" data-section="security">🔒 Security</button>
      </nav>
      <div class="admin-panel-content" id="admin-content">
        <!-- dynamically rendered -->
      </div>
    </div>
  `;

  const content = el.querySelector('#admin-content');
  const saveBtn = el.querySelector('#admin-save-btn');
  const closeBtn = el.querySelector('#admin-close-btn');
  const navBtns = el.querySelectorAll('.admin-nav-btn');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      collectAndSave();
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      adminPanelSection = btn.dataset.section;
      renderSection(adminPanelSection);
    });
  });

  saveBtn.addEventListener('click', () => {
    collectAndSave();
    toast('Settings saved!', 'success');
  });

  closeBtn.addEventListener('click', () => {
    collectAndSave();
    transitionTo(AppState.SCREENSAVER);
  });

  /* ----------- Sections ----------- */

  async function renderSection(section) {
    settings = getSettings();
    content.innerHTML = '';

    switch (section) {
      case 'camera':    await renderCamera(); break;
      case 'branding':  renderBranding();     break;
      case 'frames':    renderFrames();       break;
      case 'gallery':   await renderGallery();break;
      case 'security':  renderSecurity();     break;
    }
  }

  /* --- Camera section --- */
  async function renderCamera() {
    const devices = await getCameraDevices();

    const deviceOptions = devices.length
      ? devices.map((d, i) =>
          `<option value="${d.deviceId}" ${d.deviceId === settings.cameraDeviceId ? 'selected' : ''}>
             ${getDeviceLabel(d, i)}
           </option>`
        ).join('')
      : '<option value="" disabled>No cameras found — check browser permission</option>';

    const resOptions = [
      ['1920x1080','1080p Full HD (recommended for A6400)'],
      ['3840x2160','4K UHD'],
      ['1280x720', '720p HD'],
      ['640x480',  '480p SD'],
    ].map(([v,l]) => `<option value="${v}" ${v===settings.cameraResolution?'selected':''}>${l}</option>`).join('');

    content.innerHTML = `
      <h3 class="admin-section-title">Camera Settings</h3>

      <div class="camera-setup-tip">
        <strong>📡 Using Sony A6400 via Capture Card?</strong>
        <ol>
          <li>Connect A6400 → HDMI cable → Capture Card → USB to PC</li>
          <li>Set camera to <em>Clean HDMI output</em> (no on-screen info overlay)</li>
          <li>Close OBS / any other app that may hold the device</li>
          <li>Click <strong>Refresh Devices</strong> below, then select the capture card</li>
          <li>Look for a label with <em>📡</em> or "USB Video" / capture card brand name</li>
          <li>Click <strong>Test Camera</strong> to confirm the feed</li>
        </ol>
        <p style="margin-top:8px;color:var(--clr-text-3);font-size:.8rem;">
          ⚠ If only OBS Virtual Camera appears, close OBS completely and click Refresh.
        </p>
      </div>

      <div class="admin-field">
        <label class="admin-label">Video Input Device</label>
        <div style="display:flex;gap:8px;">
          <select class="admin-select" id="cam-device" style="flex:1;">
            <option value="">— Default Camera —</option>
            ${deviceOptions}
          </select>
          <button class="btn btn-secondary btn-sm" id="refresh-devices-btn" title="Re-scan cameras">🔄</button>
        </div>
        <small style="color:var(--clr-text-3);font-size:.8rem;margin-top:4px;">
          Found ${devices.length} video input device(s). Capture cards show as 📡.
        </small>
      </div>
      <div class="admin-field">
        <label class="admin-label">Resolution</label>
        <select class="admin-select" id="cam-resolution">${resOptions}</select>
      </div>
      <div class="admin-field">
        <label class="admin-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="cam-mirror" ${settings.mirrorCamera!==false?'checked':''} style="width:16px;height:16px;accent-color:var(--clr-accent);" />
          Mirror camera (disable for capture card / A6400)
        </label>
      </div>
      <div class="admin-field">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" id="test-camera-btn">▶ Test Camera</button>
          <button class="btn btn-secondary btn-sm" id="stop-test-btn" style="display:none;">⏹ Stop Test</button>
        </div>
        <video id="test-video" autoplay muted playsinline
          style="display:none;margin-top:12px;width:100%;max-height:240px;border-radius:12px;object-fit:cover;border:1px solid var(--clr-border);"
        ></video>
        <div id="cam-test-info" style="font-size:.8rem;color:var(--clr-success);margin-top:6px;display:none;"></div>
        <div id="cam-test-error" style="font-size:.8rem;color:var(--clr-danger);margin-top:6px;display:none;"></div>
      </div>
    `;

    // Refresh device list
    el.querySelector('#refresh-devices-btn').addEventListener('click', async () => {
      await renderCamera();
    });

    // Test camera
    const testVideo   = el.querySelector('#test-video');
    const testInfo    = el.querySelector('#cam-test-info');
    const testError   = el.querySelector('#cam-test-error');
    const stopTestBtn = el.querySelector('#stop-test-btn');

    el.querySelector('#test-camera-btn').addEventListener('click', async () => {
      testError.style.display = 'none';
      testInfo.style.display  = 'none';
      try {
        const deviceId   = el.querySelector('#cam-device').value || null;
        const resolution = el.querySelector('#cam-resolution').value;
        const stream = await startCamera(deviceId, resolution);
        testVideo.srcObject = stream;
        testVideo.style.display = 'block';
        stopTestBtn.style.display = '';
        await testVideo.play();
        // Show actual stream info
        const track = stream.getVideoTracks()[0];
        const info  = track?.getSettings();
        testInfo.textContent = `✅ Connected: "${track?.label}" @ ${info?.width}×${info?.height} ${info?.frameRate?.toFixed(0)}fps`;
        testInfo.style.display = 'block';
      } catch (err) {
        testError.textContent = '❌ ' + err.message.split('\n')[0];
        testError.style.display = 'block';
        console.error('[Camera test]', err);
      }
    });

    stopTestBtn.addEventListener('click', () => {
      if (testVideo.srcObject) {
        testVideo.srcObject.getTracks().forEach(t => t.stop());
        testVideo.srcObject = null;
      }
      testVideo.style.display = 'none';
      stopTestBtn.style.display = 'none';
      testInfo.style.display  = 'none';
      testError.style.display = 'none';
    });
  }

  /* --- Branding section --- */
  function renderBranding() {
    content.innerHTML = `
      <h3 class="admin-section-title">Event Branding</h3>
      <div class="admin-field">
        <label class="admin-label">Event Title</label>
        <input type="text" class="admin-input" id="brand-title" value="${settings.eventTitle || ''}" placeholder="Mingle Booth" />
      </div>
      <div class="admin-field">
        <label class="admin-label">Subtitle / Tagline</label>
        <input type="text" class="admin-input" id="brand-subtitle" value="${settings.eventSubtitle || ''}" placeholder="Capture Your Memories" />
      </div>
      <div class="admin-field">
        <label class="admin-label">Logo Image (PNG/JPG)</label>
        <div class="upload-zone" id="logo-upload-zone">
          <div class="upload-zone-icon">🏷️</div>
          <p>Click to upload logo</p>
        </div>
        ${settings.brandLogoDataUrl ? `<img src="${settings.brandLogoDataUrl}" style="max-height:80px;margin-top:8px;border-radius:8px;" id="logo-preview" />` : '<div id="logo-preview"></div>'}
      </div>
      <div class="admin-field">
        <label class="admin-label">Strip Background Color</label>
        <div class="admin-row">
          <input type="color" id="strip-bg-color" value="${settings.stripBgColor||'#1a1a28'}" style="height:36px;border:none;background:none;cursor:pointer;" />
          <span style="font-size:.85rem;color:var(--clr-text-2);">Strip text color:</span>
          <input type="color" id="strip-text-color" value="${settings.stripTextColor||'#ffffff'}" style="height:36px;border:none;background:none;cursor:pointer;" />
        </div>
      </div>
      <div class="admin-field">
        <label class="admin-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="strip-show-title" ${settings.stripShowTitle!==false?'checked':''} style="accent-color:var(--clr-accent);width:16px;height:16px;" />
          Show event title on strip
        </label>
        <label class="admin-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:8px;">
          <input type="checkbox" id="strip-show-date" ${settings.stripShowDate!==false?'checked':''} style="accent-color:var(--clr-accent);width:16px;height:16px;" />
          Show date on strip
        </label>
      </div>
    `;

    setupFileUpload(
      el.querySelector('#logo-upload-zone'),
      null,
      (dataUrl) => {
        settings.brandLogoDataUrl = dataUrl;
        const preview = el.querySelector('#logo-preview');
        if (preview) {
          preview.innerHTML = `<img src="${dataUrl}" style="max-height:80px;margin-top:8px;border-radius:8px;" />`;
        }
      },
      ['image/*']
    );
  }

  /* --- Layout section --- */
  /* --- Frames & Layout section --- */
  function renderFrames() {
    const framesHtml = (settings.frames || []).map(f => {
      const n = f.slots?.length || 0;
      return `
      <div class="frame-preview-item ${settings.activeFrame?.id === f.id ? 'selected' : ''}" data-frame-id="${f.id}" style="position:relative;">
        <img src="${f.dataUrl}" alt="${f.name}" />
        <button class="remove-frame" data-remove="${f.id}">✕</button>
        <span style="position:absolute;left:6px;top:6px;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:700;background:${n ? 'rgba(56,189,248,.9)' : 'rgba(239,68,68,.9)'};color:#fff;">
          ${n ? `${n} photo${n > 1 ? 's' : ''}` : '⚠ No slots'}
        </span>
        <button class="btn btn-sm btn-secondary edit-slots" data-edit="${f.id}" style="position:absolute;left:6px;right:6px;bottom:6px;padding:4px;font-size:.75rem;">✎ Edit Slots</button>
      </div>`;
    }).join('');

    const loadDims = (src) => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res({ width: im.naturalWidth, height: im.naturalHeight });
      im.onerror = rej;
      im.src = src;
    });

    const openEditor = ({ name, dataUrl, width, height, slots, onSave }) => {
      const editor = createSlotEditor({
        frameName: name, frameDataUrl: dataUrl,
        frameWidth: width, frameHeight: height,
        initialSlots: slots, onSave,
      });
      document.body.appendChild(editor.el);
      editor.open();
    };

    content.innerHTML = `
      <h3 class="admin-section-title">Frames &amp; Layouts</h3>
      <p style="color:var(--clr-text-2);font-size:.9rem;margin-bottom:16px;">
        Each frame PNG defines the photo strip template. Transparent regions are auto-detected as photo slots.
        Click a frame to activate it, or click <strong>✎ Edit Slots</strong> to adjust boundaries, resize, or reorder shots.
      </p>

      <div class="upload-zone" id="frame-upload-zone">
        <div class="upload-zone-icon">🖼️</div>
        <p>Click or drag-and-drop transparent PNG frame</p>
        <small style="color:var(--clr-text-3);">PNG with transparency recommended</small>
      </div>

      <div style="margin-top:16px;">
        <div style="font-size:0.85rem;color:var(--clr-text-2);margin-bottom:8px;font-weight:600;">Or start with a built-in template:</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
          <button class="btn btn-sm btn-secondary btn-template" data-tpl="3-strip-dark">✨ Classic 3-Strip (Dark)</button>
          <button class="btn btn-sm btn-secondary btn-template" data-tpl="3-strip-white">✨ Wedding 3-Strip (White)</button>
          <button class="btn btn-sm btn-secondary btn-template" data-tpl="4-strip-dark">✨ Neon 4-Strip</button>
          <button class="btn btn-sm btn-secondary btn-template" data-tpl="2x2-dark">✨ 2×2 Photo Grid</button>
        </div>
      </div>

      <div style="margin-top:16px;">
        <button class="btn btn-sm btn-secondary" id="no-frame-btn" style="margin-bottom:12px;">
          ✕ No Frame (clear)
        </button>
        <div class="frame-preview-grid" id="frame-grid">
          ${framesHtml || '<p style="color:var(--clr-text-3);font-size:.85rem;">No frames uploaded yet.</p>'}
        </div>
      </div>
    `;

    content.querySelectorAll('.btn-template').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const tplType = btn.dataset.tpl;
          const frame = generateDefaultFrame(tplType, settings.eventTitle || 'Mingle Booth');
          await addFrame(frame);
          settings = getSettings();
          renderFrames();
          toast(`Added & activated "${frame.name}"!`, 'success');
        } catch (e) {
          toast('Failed to create template: ' + e.message, 'error');
        }
      });
    });

    el.querySelector('#no-frame-btn').addEventListener('click', async () => {
      await clearActiveFrame();
      settings = getSettings();
      content.querySelectorAll('.frame-preview-item').forEach(i => i.classList.remove('selected'));
      toast('Frame cleared', 'success');
    });

    setupFileUpload(
      el.querySelector('#frame-upload-zone'),
      null,
      async (dataUrl, fileName) => {
        try {
          const { width, height } = await loadDims(dataUrl);
          let slots = [];
          try { slots = await detectSlots(dataUrl); } catch (err) { console.warn('[Frames] detectSlots failed', err); }
          toast(slots.length ? `Detected ${slots.length} slot(s) — adjust and save` : 'No transparent areas found — draw slots manually', 'info');
          openEditor({
            name: fileName, dataUrl, width, height, slots,
            onSave: async (finalSlots) => {
              try {
                await addFrame({ name: fileName, dataUrl, width, height, slots: finalSlots });
                settings = getSettings();
                renderFrames();
                toast('Frame saved & activated!', 'success');
              } catch (e) {
                toast('Frame save failed: ' + e.message, 'error');
              }
            },
          });
        } catch (e) {
          toast('Frame upload failed: ' + e.message, 'error');
        }
      },
      ['image/png', 'image/*']
    );

    content.querySelectorAll('.frame-preview-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        if (e.target.closest('.remove-frame') || e.target.closest('.edit-slots')) return;
        const frameId = item.dataset.frameId;
        await activateFrame(frameId);
        settings = getSettings();
        content.querySelectorAll('.frame-preview-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        toast('Frame activated!', 'success');
      });
      item.querySelector('.edit-slots')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const f = (settings.frames || []).find(x => x.id === item.dataset.frameId);
        if (!f) return;
        const dims = (f.width && f.height) ? { width: f.width, height: f.height } : await loadDims(f.dataUrl);
        let slots = f.slots || [];
        if (!slots.length) { try { slots = await detectSlots(f.dataUrl); } catch {} }
        openEditor({
          name: f.name, dataUrl: f.dataUrl, ...dims, slots,
          onSave: async (finalSlots) => {
            try {
              await updateFrameSlots(f.id, { slots: finalSlots, ...dims });
              settings = getSettings();
              renderFrames();
              toast('Slots updated!', 'success');
            } catch (err) {
              toast('Update failed: ' + err.message, 'error');
            }
          },
        });
      });
      item.querySelector('.remove-frame')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const removeId = e.target.dataset.remove;
        await removeFrame(removeId);
        settings = getSettings();
        renderFrames();
      });
    });
  }

  /* --- Gallery section --- */
  async function renderGallery() {
    content.innerHTML = `
      <h3 class="admin-section-title">Photo Gallery</h3>
      <div class="gallery-toolbar" id="gallery-toolbar">
        <span class="gallery-count" id="gallery-count">Loading…</span>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-sm btn-secondary" id="refresh-gallery-btn">🔄 Refresh</button>
          <button class="btn btn-danger btn-sm" id="clear-gallery-btn" style="display:none;">🗑 Clear All</button>
        </div>
      </div>
      <div id="gallery-list"></div>
    `;

    const listEl  = content.querySelector('#gallery-list');
    const countEl = content.querySelector('#gallery-count');
    const clearBtn = content.querySelector('#clear-gallery-btn');
    content.querySelector('#refresh-gallery-btn').addEventListener('click', renderGallery);

    // ── Load from Supabase ──────────────────────────────────────
    let sessions = [];
    let loadError = null;

    if (!isSupabaseConfigured()) {
      loadError = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env';
    } else {
      try {
        sessions = await loadSessions();
      } catch (e) {
        console.error('[Gallery] Supabase load failed:', e);
        loadError = e.message;
      }
    }

    if (loadError) {
      listEl.innerHTML = `<p class="gallery-empty" style="color:var(--clr-danger);">⚠ ${loadError}</p>`;
      countEl.textContent = 'Error loading gallery';
      return;
    }

    countEl.textContent = `${sessions.length} session${sessions.length !== 1 ? 's' : ''} saved`;
    if (sessions.length > 0) clearBtn.style.display = '';

    if (!sessions.length) {
      listEl.innerHTML = '<p class="gallery-empty">No photos yet. Start capturing!</p>';
      return;
    }

    // ── Render cards ───────────────────────────────────────────
    listEl.innerHTML = sessions.map(s => {
      const date = s.created_at
        ? new Date(s.created_at).toLocaleString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
        : '';
      let layoutLabel = { '2v':'2 Shots', '3v':'3 Shots', '4v':'4 Shots', '2x2':'2×2 Grid' }[s.layout] || s.layout;
      if (typeof s.layout === 'string' && s.layout.startsWith('frame:')) {
        const frameId = s.layout.replace(/^frame:/, '');
        const matchedFrame = (settings.frames || []).find(f => f.id === frameId);
        layoutLabel = matchedFrame ? `Frame: ${matchedFrame.name}` : 'Custom Frame';
      }
      const photoCount = s.photo_count ?? s.session_photos?.length ?? '?';

      const originals = (s.session_photos || []).map((p, i) => `
        <a href="${p.url}" target="_blank" title="Slot ${p.slot_index + 1} — ${p.slot_w ? p.slot_w+'×'+p.slot_h+'px' : ''}">
          <img src="${p.url}" loading="lazy" />
        </a>
      `).join('');

      return `
        <div class="gallery-card" data-id="${s.id}">
          <div class="gallery-card-left">
            ${s.strip_url
              ? `<a href="${s.strip_url}" target="_blank"><img class="gallery-strip-thumb" src="${s.strip_url}" alt="Strip" /></a>`
              : '<div class="gallery-strip-thumb gallery-thumb-empty">No image</div>'}
          </div>
          <div class="gallery-card-body">
            <div class="gallery-card-meta">
              <span class="gallery-badge">${layoutLabel}</span>
              <span class="gallery-badge gallery-badge-shots">📸 ${photoCount} shot${photoCount !== 1 ? 's' : ''}</span>
              ${date ? `<span class="gallery-date">${date}</span>` : ''}
            </div>
            ${originals ? `
              <div class="gallery-originals">${originals}</div>
            ` : ''}
            <div class="gallery-card-actions">
              ${s.strip_url ? `<a href="${s.strip_url}" target="_blank" class="btn btn-sm btn-secondary">↗ Strip</a>` : ''}
              ${s.gif_url   ? `<a href="${s.gif_url}"   target="_blank" class="btn btn-sm btn-secondary">↗ GIF</a>`   : ''}
              ${s.viewer_url ? `<button class="btn btn-sm btn-secondary gallery-copy-link" data-url="${s.viewer_url}">🔗 Copy Link</button>` : ''}
              <button class="btn btn-sm btn-danger gallery-delete" data-id="${s.id}">🗑 Delete</button>
            </div>
          </div>
          ${s.viewer_url ? `<canvas class="gallery-qr-mini" data-url="${s.viewer_url}" width="72" height="72"></canvas>` : ''}
        </div>
      `;
    }).join('');

    // Generate mini QR codes
    listEl.querySelectorAll('.gallery-qr-mini').forEach(async (canvas) => {
      try { await drawQRCode(canvas, canvas.dataset.url, { width: 72 }); } catch {}
    });

    // Copy link buttons
    listEl.querySelectorAll('.gallery-copy-link').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard?.writeText(btn.dataset.url).then(() => toast('QR link copied!', 'success'));
      });
    });

    // Delete buttons
    listEl.querySelectorAll('.gallery-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this session?')) return;
        const id = btn.dataset.id;
        try {
          await deleteSession(id);
          toast('Session deleted', 'success');
          renderGallery();
        } catch (e) { toast('Delete failed: ' + e.message, 'error'); }
      });
    });

    // Clear all
    clearBtn.addEventListener('click', async () => {
      if (!confirm('Delete ALL sessions? This cannot be undone.')) return;
      try {
        await clearSessions();
        toast('Gallery cleared', 'success');
        renderGallery();
      } catch (e) { toast('Clear failed: ' + e.message, 'error'); }
    });
  }

  /* --- Security section --- */
  function renderSecurity() {
    content.innerHTML = `
      <h3 class="admin-section-title">Security</h3>
      <div class="admin-field">
        <label class="admin-label">Admin Password</label>
        <input type="password" class="admin-input" id="admin-pwd" value="${settings.adminPassword||'admin1234'}" autocomplete="new-password" />
        <small style="color:var(--clr-text-3);font-size:.8rem;margin-top:4px;">
          Used to access this admin panel (triple-click top-right corner)
        </small>
      </div>
    `;
  }

  /* --- Collect and Save --- */
  function collectAndSave() {
    // Camera
    const camDevice     = el.querySelector('#cam-device');
    const camResolution = el.querySelector('#cam-resolution');
    const camMirror     = el.querySelector('#cam-mirror');
    if (camDevice)     settings.cameraDeviceId  = camDevice.value || null;
    if (camResolution) settings.cameraResolution = camResolution.value;
    if (camMirror)     settings.mirrorCamera     = camMirror.checked;

    // Branding
    const brandTitle    = el.querySelector('#brand-title');
    const brandSubtitle = el.querySelector('#brand-subtitle');
    const stripBgColor  = el.querySelector('#strip-bg-color');
    const stripTxtColor = el.querySelector('#strip-text-color');
    const showTitle     = el.querySelector('#strip-show-title');
    const showDate      = el.querySelector('#strip-show-date');
    if (brandTitle)    settings.eventTitle    = brandTitle.value;
    if (brandSubtitle) settings.eventSubtitle = brandSubtitle.value;
    if (stripBgColor)  settings.stripBgColor  = stripBgColor.value;
    if (stripTxtColor) settings.stripTextColor = stripTxtColor.value;
    if (showTitle)     settings.stripShowTitle = showTitle.checked;
    if (showDate)      settings.stripShowDate  = showDate.checked;

    // Security
    const adminPwd = el.querySelector('#admin-pwd');
    if (adminPwd) settings.adminPassword = adminPwd.value;

    saveSettings(settings);
  }

  /* --- File Upload Helper --- */
  function setupFileUpload(zone, inputEl, onFile, accept = ['image/*']) {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = accept.join(',');
    input.style.display = 'none';
    document.body.appendChild(input);

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) readFile(file);
    });

    input.addEventListener('change', () => {
      if (input.files[0]) readFile(input.files[0]);
      input.value = '';
    });

    function readFile(file) {
      const reader = new FileReader();
      reader.onload = (e) => onFile(e.target.result, file.name);
      reader.readAsDataURL(file);
    }
  }

  return {
    el,
    onEnter() {
      settings = getSettings();
      adminPanelSection = 'camera';
      navBtns.forEach((b,i) => { b.classList.toggle('active', i===0); });
      renderSection('camera');
    },
    onExit() {
      // Stop any test camera streams
      const testVideo = el.querySelector('#test-video');
      if (testVideo && testVideo.srcObject) {
        testVideo.srcObject.getTracks().forEach(t => t.stop());
        testVideo.srcObject = null;
      }
    },
  };
}

/* ============================================================
   PASSWORD MODAL
   ============================================================ */
function createPasswordModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">🔒 Admin Access</div>
      <input type="password" class="admin-input" id="pwd-input" placeholder="Enter admin password" autocomplete="off" />
      <div class="modal-error" id="pwd-error">Incorrect password. Try again.</div>
      <div style="display:flex;gap:8px;justify-content:center;">
        <button class="btn btn-primary btn-sm" id="pwd-submit">Enter</button>
        <button class="btn btn-secondary btn-sm" id="pwd-cancel">Cancel</button>
      </div>
    </div>
  `;

  const input    = overlay.querySelector('#pwd-input');
  const errorMsg = overlay.querySelector('#pwd-error');
  const submitBtn = overlay.querySelector('#pwd-submit');
  const cancelBtn = overlay.querySelector('#pwd-cancel');

  function open() {
    input.value = '';
    errorMsg.classList.remove('visible');
    overlay.classList.add('open');
    setTimeout(() => input.focus(), 300);
  }

  function close() {
    overlay.classList.remove('open');
  }

  submitBtn.addEventListener('click', attempt);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') attempt(); });
  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  function attempt() {
    const pwd = input.value;
    const correct = getSettings().adminPassword || 'admin1234';
    if (pwd === correct) {
      close();
      transitionTo(AppState.ADMIN);
    } else {
      errorMsg.classList.add('visible');
      input.value = '';
      input.focus();
    }
  }

  return { el: overlay, open, close };
}

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */
function toast(message, type = '') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ============================================================
   UTILITIES
   ============================================================ */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
