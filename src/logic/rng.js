// Seeded RNG (mulberry32): same seed -> same sequence.
export function createRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (a, b) => a + next() * (b - a);
  const int = (a, b) => a + Math.floor(next() * (b - a + 1));
  const pick = arr => arr[int(0, arr.length - 1)];
  return { next, int, pick, range };
}
