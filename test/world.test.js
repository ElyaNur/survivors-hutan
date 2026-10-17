import { test } from 'node:test'; import assert from 'node:assert/strict';
import { createRng } from '../src/logic/rng.js';
import { HUT, riverX, isWater, onBridge, terrainSpeed, clampToWorld, placeDecor, camera } from '../src/game/world.js';
test('water and bridge', () => {
  assert.equal(isWater(riverX(300), 300), true);
  assert.equal(isWater(riverX(300) + 40, 300), false);
  assert.equal(onBridge(riverX(540), 540), true);
  assert.equal(terrainSpeed(riverX(540), 540), 1);
  assert.equal(terrainSpeed(riverX(300), 300), 0.45);
  assert.equal(terrainSpeed(100, 100), 1);
});
test('clampToWorld', () => {
  assert.deepEqual(clampToWorld({ x: -50, y: 5000 }), { x: 8, y: 1072 });
});
test('placeDecor keeps hut, water and path clear; deterministic', () => {
  const d = placeDecor(createRng(1));
  assert.ok(d.length >= 150);
  assert.deepEqual(d, placeDecor(createRng(1)));
  assert.ok(new Set(d.map(o => o.kind)).size === 4);
  for (const o of d) {
    assert.ok(Math.hypot(o.x - HUT.x, o.y - HUT.y) >= 70, 'hut');
    assert.ok(!isWater(o.x, o.y), 'water');
    assert.ok(!(o.x >= 960 && o.x <= riverX(540) && o.y >= 532 && o.y <= 552), 'path');
  }
});
test('camera', () => {
  assert.deepEqual(camera({ x: 0, y: 0 }), { x: 0, y: 0, w: 480, h: 270 });
  assert.deepEqual(camera({ x: 5000, y: 5000 }), { x: 1440, y: 810, w: 480, h: 270 });
});
