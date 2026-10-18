// Per-class bests in localStorage. Storage may be null or throw (private mode, blocked): the game plays without records.
export const RECORDS_KEY = 'survivorsHutan.records.v1';
export const EMPTY_RECORD = { bestTime: 0, bestKills: 0, bestLevel: 0, wins: 0 };
const STATS = [['time', 'bestTime'], ['kills', 'bestKills'], ['level', 'bestLevel']];

export function loadRecords(storage) {
  try {
    const r = JSON.parse(storage?.getItem(RECORDS_KEY) ?? 'null');
    return r && typeof r === 'object' && !Array.isArray(r) ? r : {};
  } catch { return {}; }
}

export function saveRecords(storage, rec) {
  try { storage?.setItem(RECORDS_KEY, JSON.stringify(rec)); } catch { /* no records this session */ }
}

// fusions: { [id]: { made, wins } }. Hand-edited or corrupt storage reads as "none"; entries are sanitised where used.
const fusionsOf = (rec, classId) => {
  const f = rec[classId]?.fusions;
  return f && typeof f === 'object' && !Array.isArray(f) ? f : {};
};
const num = n => Number.isFinite(n) ? n : 0;

// Pure: one more time this fusion was picked.
export function recordFusion(rec, classId, id) {
  const e = fusionsOf(rec, classId)[id];
  return { ...rec, [classId]: { ...rec[classId], fusions: { ...fusionsOf(rec, classId), [id]: { made: num(e?.made) + 1, wins: num(e?.wins) } } } };
}

export const discoveredSet = (rec, classId) =>
  new Set(Object.entries(fusionsOf(rec, classId)).filter(([, e]) => num(e?.made) > 0).map(([id]) => id));

// Pure: returns new records and which stats beat the old best. On a win each fusion in the build gets a win.
export function mergeResult(rec, classId, { time, kills, level, won, fusions = [] }) {
  const old = { ...EMPTY_RECORD, ...rec[classId] }, cur = { time, kills, level };
  const next = { ...old, wins: old.wins + (won ? 1 : 0) }, newBest = [];
  if (won && fusions.length) {
    const all = { ...fusionsOf(rec, classId) };
    for (const id of fusions) all[id] = { made: num(all[id]?.made), wins: num(all[id]?.wins) + 1 };
    next.fusions = all;
  }
  for (const [k, best] of STATS) if (cur[k] > old[best]) { next[best] = cur[k]; newBest.push(k); }
  return { records: { ...rec, [classId]: next }, newBest };
}
