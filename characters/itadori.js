registerCharacter({
  id: 'itadori', name: 'King of Curses', sub: '(Sukuna-style)', color: '#dc2626', kanji: '宿', speaker: 'SUKUNA', grade: 'Special Grade',
  desc: 'Ryomen Sukuna\'s arsenal: relentless Dismantle, Cleave that scales with the target, and the Fuga flame arrow. Domain: Malevolent Shrine.',
  hpBonus: 40, speedMult: 1.0, energyRegenMult: 1.0, domainUnlockLevel: 5,
  startWeapons: ['dismantle', 'cleave'],
  domain: { kind: 'shrine', name: 'Malevolent Shrine', color: '#ef4444',
    desc: (l) => `Sukuna's domain. For a few seconds, Dismantle and Cleave slashes rain on every curse nearby. Press SPACE when full. Lv${l ?? 1}` },
  // Manga-panel cut-ins (see showPanel in dialogue.js).
  panels: {
    start:  { src: 'assets/panels/sukuna/disgraced_one.jpg', cap: 'Stand proud. You\'re strong.', tilt: -2 },
    domain: { src: 'assets/panels/sukuna/malevolent_shrine.jpg', cap: 'Today\'s special: curses, sliced thin.', tilt: 2 },
    fuga:   { src: 'assets/panels/sukuna/flames.jpg', cap: 'Flames? Oh, you mean Fuga. Don\'t be rude.', tilt: -3 },
    win:    { src: 'assets/panels/sukuna/malevolent_shrine.jpg', cap: 'King of Curses. Always has been.' },
    death:  { src: 'assets/panels/sukuna/disgraced_one.jpg', cap: 'Disgraced? Me? ...Fine. Just this once.' },
  },
  sprite: {
    src: 'assets/sprites/characters/sukuna_sheet_by_finhj.jpg', bg: [54, 51, 60],
    flood: true, keyT: 40, fringeT: 60,
    idle: { y0: 22, y1: 88, x1: 130, count: 4, fps: 4 },
    walk: { y0: 107, y1: 172, x1: 340, count: 10, fps: 12 },
    // Extra rows of the sheet. Each frame is an x range; y0..y1 is the row. fps only sets the index maths.
    actions: {
      hit:    { y0: 505, y1: 568, fps: 10, segs: [[4, 49], [51, 92]] },                     // "Hit:"
      strike: { y0: 478, y1: 534, fps: 10, segs: [[381, 425], [438, 479], [494, 546]] },    // punch frames beside "Hit:"
      ult:    { y0: 588, y1: 652, fps: 10, segs: [[4, 41], [44, 83], [85, 123], [126, 162]] }, // "Ultimate Action:" -> Cleave
      domain: { y0: 672, y1: 740, fps: 10, segs: [[3, 34], [34, 66], [68, 107], [111, 142], [144, 175], [177, 208], [210, 243]] }, // Malevolent Shrine seals
      fuga:   { y0: 753, y1: 821, fps: 10, segs: [[1, 32], [33, 66], [67, 98], [99, 127], [127, 155], [159, 193], [201, 246], [259, 304], [312, 358], [369, 419], [422, 485]] }, // "Open (Fuga)"
    },
    // Big bust illustration (top right of the sheet), used in boss conversations.
    portrait: { x0: 428, x1: 712, y0: 48, y1: 338 },
  },
});
