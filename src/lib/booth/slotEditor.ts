import { Slot } from '@/types';

const HANDLE_R = 9;
const BADGE_R = 14;
const MIN_DRAW = 30;

const CLR = {
  fill: 'rgba(56,189,248,0.15)',
  stroke: '#38bdf8',
  fillSel: 'rgba(192,132,252,0.25)',
  strokeSel: '#c084fc',
  badge: '#38bdf8',
  badgeSel: '#c084fc',
  handle: '#ffffff',
  hstroke: '#c084fc',
  rubber: 'rgba(192,132,252,0.18)',
  rubLine: '#c084fc',
  drag: 'rgba(192,132,252,0.5)',
};

export interface SlotEditorOptions {
  frameName: string;
  frameDataUrl: string;
  frameWidth: number;
  frameHeight: number;
  initialSlots?: Slot[];
  onSave?: (slots: Slot[]) => void;
  onClose?: () => void;
}

export function createSlotEditor({
  frameName,
  frameDataUrl,
  frameWidth,
  frameHeight,
  initialSlots = [],
  onSave,
  onClose,
}: SlotEditorOptions) {
  const overlay = document.createElement('div');
  overlay.className = 'se-overlay';
  overlay.innerHTML = `
    <div class="se-modal">
      <div class="se-header">
        <div class="se-header-left">
          <span class="se-icon">🖼️</span>
          <div>
            <div class="se-title">Configure Frame</div>
            <div class="se-subtitle">${frameName}</div>
          </div>
        </div>
        <div class="se-header-right">
          <span class="se-hint">Click to select · Drag to move · Drag corner to resize · Drag badge to reorder</span>
          <button class="se-close" id="se-x">✕</button>
        </div>
      </div>
      <div class="se-body">
        <div class="se-canvas-wrap" id="se-canvas-wrap">
          <canvas id="se-canvas"></canvas>
          <div class="se-add-crosshair" id="se-crosshair" style="display:none;">
            <span>Click &amp; drag to draw a slot</span>
          </div>
        </div>
        <div class="se-sidebar">
          <div class="se-sb-top">
            <h3 class="se-sb-title">Photo Slots</h3>
            <button class="btn btn-sm btn-secondary" id="se-add-btn">+ Add Slot</button>
          </div>
          <div class="se-slot-list" id="se-slot-list"></div>
          <div class="se-sb-footer">
            <div class="se-slot-count" id="se-slot-count">0 slots</div>
            <button class="btn btn-primary" id="se-save">✓ Save Frame</button>
            <button class="btn btn-secondary btn-sm" id="se-cancel">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const canvasWrap = overlay.querySelector<HTMLDivElement>('#se-canvas-wrap')!;
  const canvas = overlay.querySelector<HTMLCanvasElement>('#se-canvas')!;
  const crosshair = overlay.querySelector<HTMLDivElement>('#se-crosshair')!;
  const slotListEl = overlay.querySelector<HTMLDivElement>('#se-slot-list')!;
  const slotCountEl = overlay.querySelector<HTMLDivElement>('#se-slot-count')!;
  const ctx = canvas.getContext('2d')!;

  let slots: Slot[] = initialSlots.map((s, i) => ({ ...s, slot_index: s.slot_index ?? i }));
  let selIdx: number | null = null;
  let scale = 1;
  let frameImg: HTMLImageElement | null = null;
  let addMode = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let drag: any = null;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    frameImg = img;
    resizeCanvas();
    redraw();
  };
  img.src = frameDataUrl;

  function resizeCanvas() {
    const ww = canvasWrap.clientWidth || 560;
    const wh = canvasWrap.clientHeight || 500;
    scale = Math.min(ww / frameWidth, wh / frameHeight, 1);
    canvas.width = Math.round(frameWidth * scale);
    canvas.height = Math.round(frameHeight * scale);
    redraw();
  }

  const ro = new ResizeObserver(() => resizeCanvas());

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1a1a28';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (frameImg) ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

    const sorted = [...slots].sort((a, b) => a.slot_index - b.slot_index);

    for (const pass of [false, true]) {
      for (const slot of sorted) {
        const isSel = slot.slot_index === selIdx;
        if (isSel !== pass) continue;

        const sx = slot.x * scale,
          sy = slot.y * scale;
        const sw = slot.w * scale,
          sh = slot.h * scale;

        ctx.fillStyle = isSel ? CLR.fillSel : CLR.fill;
        ctx.strokeStyle = isSel ? CLR.strokeSel : CLR.stroke;
        ctx.lineWidth = isSel ? 2.5 : 1.5;
        ctx.fillRect(sx, sy, sw, sh);
        ctx.strokeRect(sx, sy, sw, sh);

        if (isSel) {
          for (const [hx, hy] of [
            [sx, sy],
            [sx + sw, sy],
            [sx, sy + sh],
            [sx + sw, sy + sh],
          ]) {
            ctx.fillStyle = CLR.handle;
            ctx.strokeStyle = CLR.hstroke;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(hx, hy, HANDLE_R, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }

        const bx = sx + BADGE_R + 6,
          by = sy + BADGE_R + 6;
        ctx.fillStyle = isSel ? CLR.badgeSel : CLR.badge;
        ctx.beginPath();
        ctx.arc(bx, by, BADGE_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(BADGE_R * 1.1)}px system-ui,sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(slot.slot_index + 1), bx, by);
      }
    }

    if (drag?.type === 'draw' && drag.d) {
      const { x1, y1, x2, y2 } = drag.d;
      const rx = Math.min(x1, x2),
        ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1),
        rh = Math.abs(y2 - y1);
      ctx.fillStyle = CLR.rubber;
      ctx.strokeStyle = CLR.rubLine;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
    }

    if (drag?.type === 'reorder') {
      const { cx, cy, fromSlot } = drag;
      ctx.fillStyle = CLR.drag;
      ctx.beginPath();
      ctx.arc(cx, cy, BADGE_R + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(BADGE_R * 1.1)}px system-ui,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(fromSlot.slot_index + 1), cx, cy);
    }
  }

  function canvasXY(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function handleAt(slot: Slot, cx: number, cy: number) {
    const sx = slot.x * scale,
      sy = slot.y * scale,
      sw = slot.w * scale,
      sh = slot.h * scale;
    const corners: [number, number, string][] = [
      [sx, sy, 'resize-tl'],
      [sx + sw, sy, 'resize-tr'],
      [sx, sy + sh, 'resize-bl'],
      [sx + sw, sy + sh, 'resize-br'],
    ];
    for (const [hx, hy, type] of corners) {
      if (Math.hypot(cx - hx, cy - hy) <= HANDLE_R + 3) return type;
    }
    return null;
  }

  function badgeAt(slot: Slot, cx: number, cy: number) {
    const bx = slot.x * scale + BADGE_R + 6,
      by = slot.y * scale + BADGE_R + 6;
    return Math.hypot(cx - bx, cy - by) <= BADGE_R + 4;
  }

  function bodyAt(slot: Slot, cx: number, cy: number) {
    const sx = slot.x * scale,
      sy = slot.y * scale,
      sw = slot.w * scale,
      sh = slot.h * scale;
    return cx >= sx && cx <= sx + sw && cy >= sy && cy <= sy + sh;
  }

  function topSlotAt(cx: number, cy: number) {
    return [...slots].reverse().find((s) => bodyAt(s, cx, cy)) || null;
  }

  canvas.style.touchAction = 'none';

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = canvasXY(e);

    if (addMode) {
      drag = { type: 'draw', d: { x1: x, y1: y, x2: x, y2: y }, pointerId: e.pointerId };
      return;
    }

    if (selIdx !== null) {
      const sel = slots.find((s) => s.slot_index === selIdx);
      if (sel) {
        const h = handleAt(sel, x, y);
        if (h) {
          drag = { type: h, snap: { ...sel }, ox: x, oy: y, pointerId: e.pointerId };
          return;
        }
        if (badgeAt(sel, x, y)) {
          drag = { type: 'reorder', fromSlot: sel, cx: x, cy: y, pointerId: e.pointerId };
          return;
        }
      }
    }

    for (const slot of [...slots].reverse()) {
      if (badgeAt(slot, x, y)) {
        selIdx = slot.slot_index;
        drag = { type: 'reorder', fromSlot: slot, cx: x, cy: y, pointerId: e.pointerId };
        redraw();
        renderSidebar();
        return;
      }
    }

    const hit = topSlotAt(x, y);
    if (hit) {
      selIdx = hit.slot_index;
      drag = { type: 'move', snap: { ...hit }, ox: x, oy: y, pointerId: e.pointerId };
      redraw();
      renderSidebar();
      return;
    }

    selIdx = null;
    redraw();
    renderSidebar();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag) {
      if (addMode) {
        canvas.style.cursor = 'crosshair';
        return;
      }
      const { x, y } = canvasXY(e);
      if (selIdx !== null) {
        const sel = slots.find((s) => s.slot_index === selIdx);
        if (sel) {
          if (handleAt(sel, x, y)) {
            canvas.style.cursor = 'nwse-resize';
            return;
          }
          if (badgeAt(sel, x, y)) {
            canvas.style.cursor = 'grab';
            return;
          }
        }
      }
      canvas.style.cursor = topSlotAt(x, y) ? 'move' : 'default';
      return;
    }

    e.preventDefault();
    const { x, y } = canvasXY(e);
    const dx = (x - drag.ox) / scale;
    const dy = (y - drag.oy) / scale;

    if (drag.type === 'draw') {
      drag.d.x2 = x;
      drag.d.y2 = y;
      redraw();
      return;
    }

    if (drag.type === 'reorder') {
      drag.cx = x;
      drag.cy = y;
      redraw();
      return;
    }

    const slot = slots.find((s) => s.slot_index === (drag.snap?.slot_index ?? selIdx));
    if (!slot) return;
    const o = drag.snap;

    if (drag.type === 'move') {
      slot.x = Math.round(Math.max(0, Math.min(o.x + dx, frameWidth - o.w)));
      slot.y = Math.round(Math.max(0, Math.min(o.y + dy, frameHeight - o.h)));
    } else {
      if (drag.type === 'resize-br') {
        slot.w = Math.round(Math.max(MIN_DRAW / scale, o.w + dx));
        slot.h = Math.round(Math.max(MIN_DRAW / scale, o.h + dy));
      } else if (drag.type === 'resize-tr') {
        slot.w = Math.round(Math.max(MIN_DRAW / scale, o.w + dx));
        const newH = Math.max(MIN_DRAW / scale, o.h - dy);
        slot.y = Math.round(o.y + o.h - newH);
        slot.h = Math.round(newH);
      } else if (drag.type === 'resize-bl') {
        const newW = Math.max(MIN_DRAW / scale, o.w - dx);
        slot.x = Math.round(o.x + o.w - newW);
        slot.w = Math.round(newW);
        slot.h = Math.round(Math.max(MIN_DRAW / scale, o.h + dy));
      } else if (drag.type === 'resize-tl') {
        const newW = Math.max(MIN_DRAW / scale, o.w - dx);
        slot.x = Math.round(o.x + o.w - newW);
        slot.w = Math.round(newW);
        const newH = Math.max(MIN_DRAW / scale, o.h - dy);
        slot.y = Math.round(o.y + o.h - newH);
        slot.h = Math.round(newH);
      }
      slot.x = Math.max(0, Math.min(slot.x, frameWidth - slot.w));
      slot.y = Math.max(0, Math.min(slot.y, frameHeight - slot.h));
    }

    redraw();
    renderSidebar();
  });

  const endDrag = (e: PointerEvent) => {
    if (!drag) return;
    if (e && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    const { x, y } = canvasXY(e);

    if (drag.type === 'draw') {
      const { x1, y1, x2, y2 } = drag.d;
      const rw = Math.abs(x2 - x1),
        rh = Math.abs(y2 - y1);
      if (rw >= MIN_DRAW && rh >= MIN_DRAW) {
        const newIdx = slots.length;
        slots.push({
          slot_index: newIdx,
          x: Math.round(Math.min(x1, x2) / scale),
          y: Math.round(Math.min(y1, y2) / scale),
          w: Math.round(rw / scale),
          h: Math.round(rh / scale),
        });
        selIdx = newIdx;
      }
      setAddMode(false);
    }

    if (drag.type === 'reorder') {
      const target = slots.find((s) => s.slot_index !== drag.fromSlot.slot_index && bodyAt(s, x, y));
      if (target) {
        const fromSlot = slots.find((s) => s.slot_index === drag.fromSlot.slot_index);
        if (fromSlot) {
          [fromSlot.slot_index, target.slot_index] = [target.slot_index, fromSlot.slot_index];
          selIdx = fromSlot.slot_index;
        }
      }
    }

    drag = null;
    redraw();
    renderSidebar();
  };

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function renderSidebar() {
    const sorted = [...slots].sort((a, b) => a.slot_index - b.slot_index);
    slotCountEl.textContent = `${sorted.length} slot${sorted.length !== 1 ? 's' : ''} defined`;

    slotListEl.innerHTML = sorted
      .map(
        (s) => `
      <div class="se-slot-item${s.slot_index === selIdx ? ' selected' : ''}" data-idx="${s.slot_index}">
        <div class="se-slot-num">${s.slot_index + 1}</div>
        <div class="se-slot-meta">
          <div class="se-slot-dim">${s.w} × ${s.h} px</div>
          <div class="se-slot-pos">at (${s.x}, ${s.y})</div>
        </div>
        <div class="se-slot-btns">
          <button class="se-btn-order se-up" data-idx="${s.slot_index}" ${s.slot_index === 0 ? 'disabled' : ''} title="Capture earlier">↑</button>
          <button class="se-btn-order se-down" data-idx="${s.slot_index}" ${s.slot_index === sorted.length - 1 ? 'disabled' : ''} title="Capture later">↓</button>
          <button class="se-btn-del" data-idx="${s.slot_index}" title="Delete slot">×</button>
        </div>
      </div>
    `
      )
      .join('');

    slotListEl.querySelectorAll<HTMLDivElement>('.se-slot-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        selIdx = parseInt(item.dataset.idx!);
        redraw();
        renderSidebar();
      });
    });

    slotListEl.querySelectorAll<HTMLButtonElement>('.se-up').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx!);
        const s = slots.find((x) => x.slot_index === idx);
        const prev = slots.find((x) => x.slot_index === idx - 1);
        if (s && prev) {
          s.slot_index--;
          prev.slot_index++;
          selIdx = s.slot_index;
        }
        redraw();
        renderSidebar();
      })
    );

    slotListEl.querySelectorAll<HTMLButtonElement>('.se-down').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx!);
        const s = slots.find((x) => x.slot_index === idx);
        const next = slots.find((x) => x.slot_index === idx + 1);
        if (s && next) {
          s.slot_index++;
          next.slot_index--;
          selIdx = s.slot_index;
        }
        redraw();
        renderSidebar();
      })
    );

    slotListEl.querySelectorAll<HTMLButtonElement>('.se-btn-del').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx!);
        slots = slots.filter((s) => s.slot_index !== idx);
        slots
          .sort((a, b) => a.slot_index - b.slot_index)
          .forEach((s, i) => {
            s.slot_index = i;
          });
        if (selIdx === idx) selIdx = null;
        else if (selIdx !== null && selIdx > idx) selIdx = Math.max(0, selIdx - 1);
        redraw();
        renderSidebar();
      })
    );
  }

  function setAddMode(on: boolean) {
    addMode = on;
    overlay.querySelector('#se-add-btn')!.classList.toggle('active', on);
    canvas.style.cursor = on ? 'crosshair' : 'default';
    crosshair.style.display = on ? 'flex' : 'none';
  }

  overlay.querySelector('#se-add-btn')!.addEventListener('click', () => setAddMode(!addMode));

  overlay.querySelector('#se-save')!.addEventListener('click', () => {
    if (!slots.length) {
      alert('Please define at least one photo slot.');
      return;
    }
    const final = [...slots]
      .sort((a, b) => a.slot_index - b.slot_index)
      .map((s, i) => ({ ...s, slot_index: i }));
    onSave?.(final);
    close();
  });

  overlay.querySelector('#se-cancel')!.addEventListener('click', close);
  overlay.querySelector('#se-x')!.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  function open() {
    overlay.classList.add('open');
    renderSidebar();
    setTimeout(() => {
      resizeCanvas();
      ro.observe(canvasWrap);
    }, 60);
  }

  function close() {
    overlay.classList.remove('open');
    ro.disconnect();
    onClose?.();
    setTimeout(() => {
      if (!overlay.classList.contains('open')) overlay.remove();
    }, 350);
  }

  return { el: overlay, open, close };
}
