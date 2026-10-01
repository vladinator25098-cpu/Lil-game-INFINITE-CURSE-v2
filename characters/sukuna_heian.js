// Prestige I for the King of Curses: the Heian-era Sukuna.
// Unlock: win a run as the King of Curses, then evolve him from the menu (costs shards).
// Sprites: assets/sprites/characters/sukuna_heian_sheet.png, sliced into characters/sukuna_heian_atlas.js.
registerPrestige('itadori', {
  name: 'Heian Era King', sub: '(Prestige I)', color: '#fbbf24', kanji: '覇', grade: 'Heian Era',
  desc: 'Sukuna unbound, as he stood a thousand years ago. Faster and far tougher, with Fuga from the first second, a blade-edged dash, and blows he simply turns aside. Domain: Malevolent Shrine, with its demon at his back.',
  cost: 500,
  hpBonus: 90, speedMult: 1.1, energyRegenMult: 1.35, domainUnlockLevel: 3,
  startWeapons: ['dismantle', 'cleave', 'fuga'],
  dash: { dist: 200, cd: 2200, dur: 240 }, // SHIFT: Heian Rush, invulnerable and cuts through curses
  parry: 0.18,                             // chance to guard against any blow
  domain: { kind: 'shrine', name: 'Malevolent Shrine', color: '#fbbf24',
    desc: (l) => `The shrine's demon rises behind him. Slashes rain on every curse nearby and Sukuna sprints through the carnage. Press SPACE when full. Lv${l ?? 1}` },
  perks: [
    '+50 Max HP and +10% speed over the base form',
    'Starts with Dismantle, Cleave and Fuga',
    'SHIFT: Heian Rush, an invulnerable dash that cuts curses',
    '18% chance to guard any blow',
    'Domain unlocks at level 3 and charges 35% faster',
  ],
  prestigeScene: {
    panel: 'assets/panels/sukuna/prestige_all_out.jpeg',
    beats: [
      { name: 'THE SHRINE', color: '#ef4444', text: 'Three Disasters fell on your ground. The shrine remembers who stood at its heart.' },
      { name: 'THE SHRINE', color: '#ef4444', text: 'Something older watches from behind your eyes. It has been holding back.' },
      { name: 'SUKUNA', color: '#fbbf24', text: 'Hm. So you finally outgrew the borrowed shell. About time.' },
      { name: 'SUKUNA', color: '#fbbf24', text: 'Open your eyes, brat. Let me show you what the Heian era felt like.' },
    ],
  },
  sprite: { atlas: HEIAN_ATLAS, src: 'assets/sprites/characters/sukuna_heian_sheet.png', portraitRegion: 'bustA' },
});
