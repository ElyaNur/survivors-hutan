// Spawn schedule (spec §7): data, not code. Minutes for waves, seconds for events and bosses.
// Older types keep coming all run, with a shrinking share; HP grows via TUNING.enemyHpGrowthPerMin.
export const SCHEDULE = {
  waves: [
    { from: 0,  to: 1,  rate: 1.0,  mix: { slime: 1 } },
    { from: 1,  to: 2,  rate: 1.6,  mix: { slime: 3, bat: 2 } },
    { from: 2,  to: 4,  rate: 2.3,  mix: { slime: 3, bat: 3 } },
    { from: 4,  to: 5,  rate: 3.0,  mix: { slime: 2, bat: 2, slimeRed: 3 } },
    { from: 5,  to: 7,  rate: 3.8,  mix: { slime: 1, bat: 2, slimeRed: 3, goblin: 3 } },
    { from: 7,  to: 10, rate: 4.8,  mix: { slime: 1, bat: 2, slimeRed: 2, goblin: 3, wolf: 2 } },
    { from: 10, to: 12, rate: 6.0,  mix: { slime: 1, bat: 1, slimeRed: 2, goblin: 3, wolf: 2, orc: 3 } },
    { from: 12, to: 15, rate: 7.5,  mix: { slime: 1, bat: 1, slimeRed: 2, goblin: 3, wolf: 2, orc: 3, witch: 2 } },
    { from: 15, to: 17, rate: 9.0,  mix: { slime: 1, bat: 2, slimeRed: 2, goblin: 3, wolf: 3, orc: 3, witch: 3 } },
    { from: 17, to: 19, rate: 10.5, mix: { slime: 1, bat: 2, slimeRed: 2, goblin: 3, wolf: 3, orc: 4, witch: 3 } },
    { from: 19, to: Infinity, rate: 12, mix: { slime: 1, bat: 2, slimeRed: 2, goblin: 3, wolf: 3, orc: 4, witch: 4 } },
  ],
  groups: { goblin: 3 },                                    // goblins arrive in small bands
  groupSpread: 10,                                          // px jitter inside a band or pack
  ringRadius: 200,                                          // batRing: circle around the view centre
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
