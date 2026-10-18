import { test } from 'node:test'; import assert from 'node:assert/strict';
import { loadRecords, saveRecords, mergeResult, recordFusion, discoveredSet, RECORDS_KEY } from '../src/logic/records.js';

const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
const memory = (init = {}) => { const m = { ...init }; return { getItem: k => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); }, m }; };

test('loadRecords(null) -> empty records', () => assert.deepEqual(loadRecords(null), {}));

test('a storage whose getItem throws -> empty records, no throw', () => assert.deepEqual(loadRecords(throwing), {}));

test('saveRecords on a throwing storage does not throw', () => {
  assert.doesNotThrow(() => saveRecords(throwing, { mage: { bestTime: 1, bestKills: 1, bestLevel: 1, wins: 0 } }));
  assert.doesNotThrow(() => saveRecords(null, {}));
});

test('corrupt JSON -> empty records', () => {
  assert.deepEqual(loadRecords(memory({ [RECORDS_KEY]: '{nope' })), {});
  assert.deepEqual(loadRecords(memory({ [RECORDS_KEY]: '[1,2]' })), {});
  assert.deepEqual(loadRecords(memory({ [RECORDS_KEY]: 'null' })), {});
});

test('save then load round-trips under the v1 key', () => {
  assert.equal(RECORDS_KEY, 'survivorsHutan.records.v1');
  const s = memory(), rec = { mage: { bestTime: 300, bestKills: 50, bestLevel: 10, wins: 1 } };
  saveRecords(s, rec);
  assert.deepEqual(loadRecords(s), rec);
});

test('first result: every stat is a new best, wins 0 on a loss', () => {
  const { records, newBest } = mergeResult({}, 'mage', { time: 300, kills: 50, level: 10, won: false });
  assert.deepEqual(records.mage, { bestTime: 300, bestKills: 50, bestLevel: 10, wins: 0 });
  assert.deepEqual([...newBest].sort(), ['kills', 'level', 'time']);
});

test('a worse result: no new best, input untouched', () => {
  const rec = { mage: { bestTime: 300, bestKills: 50, bestLevel: 10, wins: 0 } }, before = structuredClone(rec);
  const { records, newBest } = mergeResult(rec, 'mage', { time: 100, kills: 50, level: 3, won: false });
  assert.deepEqual(newBest, []);
  assert.deepEqual(rec, before);
  assert.deepEqual(records.mage, before.mage);
});

test('a won result adds a win and keeps other classes', () => {
  const rec = { mage: { bestTime: 1200, bestKills: 900, bestLevel: 30, wins: 2 }, archer: { bestTime: 5, bestKills: 1, bestLevel: 1, wins: 0 } };
  const { records, newBest } = mergeResult(rec, 'mage', { time: 1200, kills: 950, level: 30, won: true });
  assert.equal(records.mage.wins, 3);
  assert.deepEqual(newBest, ['kills']);
  assert.deepEqual(records.archer, rec.archer);
  assert.equal(rec.mage.wins, 2);
});

test('recordFusion counts each pick and leaves its input alone', () => {
  const r0 = {}, r1 = recordFusion(r0, 'mage', 'gletser'), r2 = recordFusion(r1, 'mage', 'gletser');
  assert.deepEqual(r0, {});
  assert.equal(r1.mage.fusions.gletser.made, 1);
  assert.equal(r2.mage.fusions.gletser.made, 2);
  assert.equal(r2.mage.fusions.gletser.wins, 0);
});

test('a v1 record has no discoveries and keeps its bests when a fusion is recorded', () => {
  const v1 = { mage: { bestTime: 300, bestKills: 50, bestLevel: 10, wins: 1 } };
  assert.equal(discoveredSet(v1, 'mage').size, 0);
  assert.deepEqual(recordFusion(v1, 'mage', 'gletser').mage, { ...v1.mage, fusions: { gletser: { made: 1, wins: 0 } } });
});

test('discoveredSet lists made > 0 and shrugs off corrupt data', () => {
  assert.deepEqual([...discoveredSet({ mage: { fusions: { a: { made: 2 }, b: { made: 0 } } } }, 'mage')], ['a']);
  for (const fusions of ['x', [1], null, { lubangHitam: { made: 'a' } }, { z: null }])
    assert.equal(discoveredSet({ mage: { fusions } }, 'mage').size, 0);
  assert.equal(discoveredSet({}, 'mage').size, 0);
});

test('mergeResult: fusions get a win only on a won run', () => {
  const rec = recordFusion({}, 'mage', 'lubangHitam'), res = { time: 1, kills: 1, level: 1, fusions: ['lubangHitam'] };
  assert.equal(mergeResult(rec, 'mage', { ...res, won: true }).records.mage.fusions.lubangHitam.wins, 1);
  assert.equal(mergeResult(rec, 'mage', { ...res, won: false }).records.mage.fusions.lubangHitam.wins, 0);
});

test('saving a fresh fusion record on a throwing storage does not throw', () =>
  assert.doesNotThrow(() => saveRecords(throwing, recordFusion({}, 'mage', 'gletser'))));
