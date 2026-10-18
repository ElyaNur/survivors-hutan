// Spawn schedule (spec §7): data, not code. Minutes for waves, seconds for events and bosses.
// Older types keep coming all run, with a shrinking share; HP grows via TUNING.enemyHpGrowthPerMin.
const LATE = { slime: 1, bat: 2, slimeRed: 2, goblin: 3, wolf: 3, orc: 4, witch: 4 };   // minute 19 on
export const SCHEDULE = {
  waves: [
    { from: 0,  to: 1,  rate: 1.2,  mix: { slime: 1 } },
    { from: 1,  to: 2,  rate: 1.6,  mix: { slime: 6, bat: 1 } },
    { from: 2,  to: 4,  rate: 2,  mix: { slime: 4, bat: 1.5 } },
    { from: 4,  to: 5,  rate: 2.5,  mix: { slime: 2, bat: 2, slimeRed: 3 } },
    { from: 5,  to: 7,  rate: 3.2,  mix: { slime: 1, bat: 2, slimeRed: 3, goblin: 3 } },
    { from: 7,  to: 10, rate: 4,  mix: { slime: 1, bat: 2, slimeRed: 2, goblin: 3, wolf: 1 } },
    { from: 10, to: 12, rate: 6.5,  mix: { slime: 1, bat: 1, slimeRed: 2, goblin: 3, wolf: 1, orc: 3 } },
    { from: 12, to: 15, rate: 11.7,  mix: { slime: 1, bat: 1, slimeRed: 2, goblin: 3, wolf: 2, orc: 3, witch: 2 } },
    { from: 15, to: 17, rate: 19.2,  mix: { slime: 1, bat: 2, slimeRed: 2, goblin: 3, wolf: 3, orc: 3, witch: 3 } },
    { from: 17, to: 19, rate: 22.4,  mix: { slime: 1, bat: 2, slimeRed: 2, goblin: 3, wolf: 3, orc: 4, witch: 3 } },
    { from: 19, to: 20, rate: 24.0, mix: LATE },
    { from: 20, to: Infinity, rate: 12.0, mix: LATE },             // the treant is out (bosses at 1200 s): same mix, half rate
  ],
  groups: { goblin: 3, wolf: 3 },                           // goblins arrive in small bands, wolves in packs (one spawn point each)
  groupSpread: 10,                                          // px jitter inside a band or pack
  ringRadius: 280,                                          // batRing: circle around the view centre
  events: [
    { at: 180,  kind: 'batRing',  count: 16 },
    { at: 360,  kind: 'batRing',  count: 22 },
    { at: 480,  kind: 'wolfPack', count: 6 },
    { at: 660,  kind: 'batRing',  count: 28 },
    { at: 780,  kind: 'wolfPack', count: 10 },
    { at: 960,  kind: 'batRing',  count: 36 },
    { at: 1080, kind: 'wolfPack', count: 14 },
  ],
  bosses: [{ at: 600, type: 'kingSlime' }, { at: 900, type: 'orcChief' }, { at: 1200, type: 'treant' }],
};
