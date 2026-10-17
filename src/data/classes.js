export const CLASSES = {
  mage: {
    id: 'mage', name: 'Mage',
    skills: ['fireball', 'meteor', 'iceShard', 'frostNova', 'chainLightning', 'arcaneOrb'],
    recipes: [
      { ult: 'armageddon', a: 'fireball', b: 'meteor' },
      { ult: 'absoluteZero', a: 'iceShard', b: 'frostNova' },
      { ult: 'badaiPetir', a: 'chainLightning', b: 'arcaneOrb' },
    ],
  },
  swordman: { id: 'swordman', name: 'Swordman', locked: true },
  archer: { id: 'archer', name: 'Archer', locked: true },
};

export const PASSIVES = ['vitality', 'swiftness', 'focus', 'magnet', 'wisdom', 'amplify'];

export const NAMES = {
  fireball: { name: 'Fireball', desc: 'Bola api ke musuh terdekat, meledak saat kena.' },
  meteor: { name: 'Meteor', desc: 'Meteor jatuh ke area musuh setelah peringatan singkat, lalu membakar.' },
  iceShard: { name: 'Ice Shard', desc: 'Pecahan es menembus musuh dan memperlambat mereka.' },
  frostNova: { name: 'Frost Nova', desc: 'Ledakan es di sekitarmu yang membekukan musuh.' },
  chainLightning: { name: 'Petir Berantai', desc: 'Petir menyambar musuh dan melompat ke musuh lain.' },
  arcaneOrb: { name: 'Orb Arcane', desc: 'Orb arcane mengorbit dan melukai musuh yang tersentuh.' },
  armageddon: { name: 'Armageddon', desc: 'Hujan meteor menghantam seluruh layar selama beberapa detik.' },
  absoluteZero: { name: 'Absolute Zero', desc: 'Membekukan semua musuh di layar; mereka menerima damage dua kali lipat.' },
  badaiPetir: { name: 'Badai Petir', desc: 'Petir bertubi-tubi di sekitarmu dan orb arcane makin kuat.' },
  vitality: { name: 'Vitalitas', desc: '+20 HP maks' },
  swiftness: { name: 'Kelincahan', desc: '+8% kecepatan gerak' },
  focus: { name: 'Fokus', desc: '-6% cooldown skill' },
  magnet: { name: 'Magnet', desc: '+25% jangkauan tarik gem' },
  wisdom: { name: 'Kebijaksanaan', desc: '+10% XP' },
  amplify: { name: 'Amplifikasi', desc: '+8% area serangan' },
};
