registerCharacter({
  id: 'itadori', name: 'King of Curses', sub: '(Sukuna-style)', color: '#dc2626',
  desc: 'Ryomen Sukuna\'s arsenal: relentless Dismantle, Cleave that scales with the target, and the Fuga flame arrow. Domain: Malevolent Shrine.',
  hpBonus: 40, speedMult: 1.0, energyRegenMult: 1.0, domainUnlockLevel: 5,
  startWeapons: ['dismantle', 'cleave'],
  domain: { kind: 'shrine', name: 'Malevolent Shrine', color: '#ef4444',
    desc: (l) => `Sukuna's domain. For a few seconds, Dismantle and Cleave slashes rain on every curse nearby. Press SPACE when full. Lv${l ?? 1}` },
  sprite: {
    src: 'Icons/jujutsu_kaisen_ryomen_sukuna_jus_by_finhj_by_finhj_dh6botq-375w-2x.jpg', bg: [54, 51, 60],
    flood: true, keyT: 40, fringeT: 60,
    idle: { y0: 22, y1: 88, x1: 130, count: 4, fps: 4 },
    walk: { y0: 107, y1: 172, x1: 340, count: 10, fps: 12 },
  },
});
