import { test } from 'node:test'; import assert from 'node:assert/strict';
import { loadRecords, saveRecords, mergeResult, RECORDS_KEY } from '../src/logic/records.js';

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
