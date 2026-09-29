registerCharacter({
  id: 'gojo', name: 'Limitless', sub: '(Gojo-style)', color: '#38bdf8',
  desc: 'The Limitless and Six Eyes: Infinity barrier, Blue, Red, Hollow Purple. Domain: Infinite Void.',
  hpBonus: 0, speedMult: 1.05, energyRegenMult: 1.85, domainUnlockLevel: 3,
  startWeapons: ['blue', 'infinity'],
  domain: { kind: 'void', name: 'Infinite Void', color: '#c7d2fe',
    desc: (l) => `Every curse is flooded with infinite information and freezes in place, taking damage. Press SPACE when full. Lv${l ?? 1}` },
  sprite: {
    src: 'Icons/satoru_gojo_sprites_sheet_jus_by_finhj_miiztyho_by_finhj_dgn75v9-375w-2x.jpg', bg: [73, 73, 120],
    idle: { y0: 14, y1: 86, x1: 132, count: 5, fps: 4, even: true },
    walk: { y0: 102, y1: 174, count: 6, fps: 9 },
  },
});
