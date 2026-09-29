// Copy this file to characters/yourname.js, edit it, then add a
// <script src="characters/yourname.js"></script> line in index.html (above game.js).
// Delete these comments if you like. Full guide: characters/README.md
registerCharacter({
  id: 'yourname',                 // unique, lowercase, no spaces
  name: 'Your Character',         // shown on the menu card
  sub: '(Inspired-by)',
  color: '#f59e0b',               // card / fallback circle colour
  desc: 'One or two sentences about how this character plays.',

  // Optional stats (defaults: 0 / 1 / 1 / 5)
  hpBonus: 0,                     // extra HP on top of 100
  speedMult: 1.0,
  energyRegenMult: 1.0,           // how fast the domain meter fills
  domainUnlockLevel: 5,

  // Weapon ids from WEAPON_DEFS in game.js (use any existing ones!)
  startWeapons: ['cursedBlast'],
  // Extra weapons this character can find on level-up, beyond the ones
  // whose `chars` list already contains their id.
  weapons: ['dismantle'],

  // Optional domain expansion (omit for none)
  // domain: { kind: 'void', name: 'My Domain', color: '#ffffff',
  //   desc: (l) => `What it does. Lv${l ?? 1}` },
  // kind must be an existing one: 'shrine' | 'shadow' | 'void'

  // Optional sprite. Without it the character is drawn as a coloured circle.
  // sprite: {
  //   src: 'Icons/your_sheet.png', bg: [r, g, b],   // bg = flat background colour to remove
  //   idle: { y0: 0, y1: 64, count: 4, fps: 4 },    // pixel rows of the idle strip + frame count
  //   walk: { y0: 80, y1: 144, count: 6, fps: 10 },
  // },
});
