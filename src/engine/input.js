// Keyboard + mouse. Mouse coords are mapped into the internal 480x270 space.
const keys = new Set(), taps = new Set();
export const input = {
  mouse: { x: 0, y: 0, clicked: false },
  moveVector() {
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
  addEventListener('blur', () => keys.clear());
  const toInternal = e => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = (e.clientX - r.left) * canvas.width / r.width;
    input.mouse.y = (e.clientY - r.top) * canvas.height / r.height;
  };
  canvas.addEventListener('mousemove', toInternal);
  canvas.addEventListener('mousedown', e => { toInternal(e); input.mouse.clicked = true; });
}
