// Keyboard + pointer (mouse, touch, pen). Pointer coords are mapped into the internal view space (VIEW, 480x270 or 270x480).
// Pointer events sit on window: in portrait the canvas is letterboxed, and a finger on a black bar must still steer.
// Pointer events only, no mouse/touch listeners: a tap arrives once, never again as a synthetic mousedown.
// A touch anywhere also spawns the virtual stick there; while it is held, moveVector() comes from it.
import TUNING from '../data/tuning.js';
import { VIEW } from './view.js';

const keys = new Set(), taps = new Set();

// Stick drag (dx, dy) in internal px -> move vector: zero inside the deadzone (a share of radius),
// then ramping to length 1 at the radius, capped there.
export function stickVector(dx, dy, radius = TUNING.touch.stickR, deadzone = TUNING.touch.deadzone) {
  const d = Math.hypot(dx, dy), k = Math.min(1, (d / radius - deadzone) / (1 - deadzone));
  return k > 0 ? { x: dx / d * k, y: dy / d * k } : { x: 0, y: 0 };
}

export const input = {
  mouse: { x: 0, y: 0, clicked: false },
  stick: null,                                            // { id, ox, oy, x, y } while a finger holds it
  touched: false,                                         // a touch was ever seen: show the touch-only UI
  moveVector() {
    if (this.stick) { const s = this.stick; return stickVector(s.x - s.ox, s.y - s.oy); }
    let x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    let y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  },
  pressed(code) { return taps.delete(code); },   // true once per press, consumed on read
  endFrame() { taps.clear(); this.mouse.clicked = false; },
};

export function initInput(canvas) {
  addEventListener('keydown', e => {
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (!e.repeat) taps.add(e.code);
    keys.add(e.code);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); input.stick = null; });
  const toInternal = e => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height };
  };
  addEventListener('pointermove', e => {
    const p = toInternal(e);
    Object.assign(input.mouse, p);
    if (input.stick?.id === e.pointerId) Object.assign(input.stick, p);
  });
  addEventListener('pointerdown', e => {
    const p = toInternal(e);
    Object.assign(input.mouse, p);
    input.mouse.clicked = p.x >= 0 && p.x < VIEW.w && p.y >= 0 && p.y < VIEW.h;   // a tap on a bar picks nothing
    if (e.pointerType !== 'touch') return;               // mouse: default kept, a click must still focus an embedding iframe
    e.preventDefault();
    input.touched = true;
    if (!input.stick) input.stick = { id: e.pointerId, ox: p.x, oy: p.y, ...p };   // first finger steers; others only tap
  });
  const release = e => { if (input.stick?.id === e.pointerId) input.stick = null; };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  canvas.addEventListener('contextmenu', e => e.preventDefault());   // long press: no menu over the game
}
