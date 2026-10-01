registerCharacter({
  id: 'gojo', name: 'Limitless', sub: '(Gojo-style)', color: '#38bdf8', kanji: '無', speaker: 'GOJO', grade: 'Special Grade',
  desc: 'The Limitless and Six Eyes: Infinity barrier, Blue, Red, Hollow Purple. Domain: Infinite Void.',
  hpBonus: 0, speedMult: 1.05, energyRegenMult: 1.85, domainUnlockLevel: 3,
  startWeapons: ['blue', 'infinity'],
  domain: { kind: 'void', name: 'Infinite Void', color: '#c7d2fe',
    desc: (l) => `Every curse is flooded with infinite information and freezes in place, taking damage. Press SPACE when full. Lv${l ?? 1}` },
  // Manga-panel cut-ins (see showPanel in dialogue.js). Keys: start, domain, crazy, win, death.
  panels: {
    start:  { src: 'assets/panels/gojo/would_you_lose.jpeg', cap: 'Throughout Heaven and Earth, I alone am the honored one.' },
    domain: { src: 'assets/panels/gojo/unlimited_void.webp', cap: 'Your curses are now buffering...', tilt: 2 },
    crazy:  { src: 'assets/panels/gojo/lets_get_crazy.jpg', cap: 'The strongest is about to do something unreasonable.' },
    win:    { src: 'assets/panels/gojo/would_you_lose.jpeg', cap: 'Would you lose? Nah. Told you.' },
    death:  { src: 'assets/panels/gojo/defeated.jpg', cap: 'Would you lose?  ...Yes. Apparently.' },
  },
  sprite: {
    src: 'assets/sprites/characters/gojo_sheet_by_finhj.jpg', bg: [73, 73, 120],
    idle: { y0: 14, y1: 86, x1: 132, count: 5, fps: 4, even: true },
    walk: { y0: 102, y1: 174, count: 6, fps: 9 },
  },
});
