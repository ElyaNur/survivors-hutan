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

// Pure: returns new records and which stats beat the old best.
export function mergeResult(rec, classId, { time, kills, level, won }) {
  const old = { ...EMPTY_RECORD, ...rec[classId] }, cur = { time, kills, level };
  const next = { ...old, wins: old.wins + (won ? 1 : 0) }, newBest = [];
  for (const [k, best] of STATS) if (cur[k] > old[best]) { next[best] = cur[k]; newBest.push(k); }
  return { records: { ...rec, [classId]: next }, newBest };
}
