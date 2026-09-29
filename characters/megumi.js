registerCharacter({
  id: 'megumi', name: 'Shikigami User', sub: '(Megumi-style)', color: '#22c55e',
  desc: 'Ten Shadows technique: Divine Dogs, Toad, Nue, Max Elephant, Round Deer and Mahoraga. Domain: Chimera Shadow Garden.',
  hpBonus: 0, speedMult: 1.0, energyRegenMult: 1.15, domainUnlockLevel: 5,
  startWeapons: ['divineDog', 'toad'],
  domain: { kind: 'shadow', name: 'Chimera Shadow Garden', color: '#6366f1',
    desc: (l) => `A pool of shadow swallows the area: curses inside are dragged down, slowed and drained. Press SPACE when full. Lv${l ?? 1}` },
  sprite: {
    src: 'Icons/megumi_fushiguro_sprite_sheet_jus_by_finhj_dicykj2-pre.jpg', bg: [107, 91, 82],
    idle: { y0: 16, y1: 80, x0: 4, x1: 106, count: 4, fps: 4, even: true },
    walk: { y0: 98, y1: 162, x0: 4, count: 10, fps: 12 },
    // Shikigami on the sheet (regions found by eye; each is trimmed to its pixels).
    things: {
      wolves:   { y0: 612, y1: 684, x0: 203, x1: 345, count: 2, even: true },
      rabbits:  { y0: 726, y1: 748, x0: 203, x1: 398, count: 6 },
      nue:      { y0: 772, y1: 826, x0: 205, x1: 270, count: 1 },
      elephant: { y0: 910, y1: 985, x0: 240, x1: 420, count: 1 },
      mahoraga: { y0: 982, y1: 1073, x0: 548, x1: 616, count: 1 },
    },
  },
});
