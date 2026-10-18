import { test } from 'node:test'; import assert from 'node:assert/strict';
// audio.js registers its unlock handler at import time, and only when addEventListener exists: fake both first.
const handlers = {}, node = () => ({ connect() {}, gain: { value: 0 } });
let resumes = 0, created = 0, sources = [], state = 'suspended';
globalThis.addEventListener = (ev, fn) => { handlers[ev] = fn; };
globalThis.AudioContext = class {
  constructor() { created++; this.sampleRate = 8; this.destination = node(); }
  get state() { return state; }
  resume() { resumes++; }
  createGain() { return node(); }
  createDynamicsCompressor() { return { ...node(), threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} }; }
  createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
};
await import('../src/engine/audio.js');

test('unlock resumes a context that is still suspended on every later gesture; a running one is left alone', () => {
  handlers.keydown();                                     // first key: creates and tries to resume
  assert.equal(created, 1); assert.equal(resumes, 1);
  handlers.pointerdown();                                 // still suspended (e.g. that key was Esc): try again
  assert.equal(created, 1); assert.equal(resumes, 2);
  state = 'running'; handlers.pointerdown();
  assert.equal(resumes, 2);
});
