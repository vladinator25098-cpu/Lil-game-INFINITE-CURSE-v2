registerCharacter({
  id: 'megumi', name: 'Shikigami User', sub: '(Megumi-style)', color: '#22c55e', kanji: '影', speaker: 'MEGUMI', grade: 'Grade 2',
  desc: 'Ten Shadows technique: Divine Dogs, Toad, Nue, Max Elephant, Round Deer and Mahoraga. Domain: Chimera Shadow Garden.',
  hpBonus: 0, speedMult: 1.0, energyRegenMult: 1.15, domainUnlockLevel: 5,
  startWeapons: ['divineDog', 'toad'],
  domain: { kind: 'shadow', name: 'Chimera Shadow Garden', color: '#6366f1',
    desc: (l) => `A pool of shadow swallows the area: curses inside are dragged down, slowed and drained. Press SPACE when full. Lv${l ?? 1}` },
  // Manga-panel cut-ins (see showPanel in dialogue.js).
  panels: {
    start:    { src: 'assets/panels/megumi/with_this_treasure.jpeg', cap: 'With this treasure, I summon... literally anything. Please.', tilt: -2 },
    mahoraga: { src: 'assets/panels/megumi/with_this_treasure.jpeg', cap: 'Divine General Mahoraga. Please don\'t turn on me.', tilt: 2 },
    domain:   { src: 'assets/panels/megumi/never_mind.webp', cap: 'Chimera Shadow Garden. Never mind the rules.', tilt: -3 },
    win:      { src: 'assets/panels/megumi/never_mind.webp', cap: 'The plan worked. Never mind how.' },
    death:    { src: 'assets/panels/megumi/had_enough.jpeg', cap: 'I\'ve had enough... (Retry?)' },
  },
  sprite: {
    src: 'assets/sprites/characters/megumi_sheet_by_finhj.jpg', bg: [107, 91, 82],
    idle: { y0: 16, y1: 80, x0: 4, x1: 106, count: 4, fps: 4, even: true },
    walk: { y0: 98, y1: 162, x0: 4, count: 10, fps: 12 },
    // Boss-conversation bust, cropped from a separate transparent illustration.
    portrait: { src: 'assets/sprites/characters/megumi_portrait.webp', x0: 262, x1: 588, y0: 0, y1: 326 },
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
