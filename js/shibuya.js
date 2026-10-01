'use strict';
// Shibuya Station Incident: a multi-floor mode. You fight down from the Scramble Crossing to the sealed
// platform at B5F through five hand-built floors, joined by escalators. Walls, trains, pillars and benches
// are solid; sealed escalators open when a floor's objective is done; each floor has a Special Grade guarding it
// on B2F-B5F and a few optional "memories" to find.
//
// Add a floor: add an entry to LEVELS (coordinates are in the map image's pixels, `scale` converts to world),
// link it from a neighbour with `links`, and give it an `obj` (objective) and scenes in SH_SCENES.
// Run the game with ?debug in the URL to draw collision boxes, links and trigger zones.

let RUN_MODE = 'endless'; // endless | shibuya
try { if (localStorage.getItem('ic_mode') === 'shibuya') RUN_MODE = 'shibuya'; } catch (e) { /* ignore */ }

const SH_DEBUG = /[?&]debug\b/.test(location.search);
const SH_IMG = 'assets/maps/shibuya/';
const sq = (cx, cy, h) => [cx - h, cy - h, cx + h, cy + h];

// A train you can walk into: a hollow shell with doorways on both long sides (the cars are merged into one carriage).
// (x1,y1,x2,y2) is the car's outline; `t` the wall thickness; `doors` doorways per side;
// `vertical` for cars lying top-to-bottom.
function trainCar(x1, y1, x2, y2, { t = 14, doors = 3, doorW = 60, vertical = false } = {}) {
  const out = [];
  const [a1, a2, b1, b2] = vertical ? [y1, y2, x1, x2] : [x1, x2, y1, y2]; // a = along the car, b = across
  const len = a2 - a1;
  const mk = (aa, ab, ba, bb) => out.push(vertical ? [ba, aa, bb, ab] : [aa, ba, ab, bb]);
  for (const [w0, w1] of [[b1, b1 + t], [b2 - t, b2]]) {
    let cur = a1;
    for (let i = 0; i < doors; i++) {
      const c = a1 + (i + 0.5) / doors * len;
      mk(cur, c - doorW / 2, w0, w1);
      cur = c + doorW / 2;
    }
    mk(cur, a2, w0, w1);
  }
  for (const aa of [[a1, a1 + t], [a2 - t, a2]]) mk(aa[0], aa[1], b1 + t, b2 - t);
  return out;
}

// Rect lists are [x1, y1, x2, y2] in the map image's pixel space.
const LEVELS = {
  street: {
    name: 'Scramble Crossing', kanji: '地', jp: 'スクランブル交差点', floor: 'GL', depth: 0, img: 'crossing.jpg', rw: 735, rh: 413, scale: 4, smooth: true,
    bounds: [0, 0, 735, 413], start: [370, 205], cap: 42, spawnMult: 1.15,
    solids: [
      [200, 8, 236, 38], [255, 35, 312, 62], [240, 65, 258, 128], [125, 138, 142, 162], [165, 95, 192, 122],
      [178, 138, 222, 196], [320, 160, 347, 230], [312, 322, 340, 360], [433, 85, 482, 145], [475, 166, 498, 236],
      [493, 75, 565, 105], [498, 370, 550, 410], [28, 345, 78, 398], [0, 245, 62, 332], [682, 185, 735, 295],
    ],
    links: [{ id: 's_down', rect: [655, 200, 682, 262], to: 'b1', arrive: [440, 238], dir: 'down', label: 'SHIBUYA STATION', needs: 'veil' }],
    obj: { kills: 12, flag: 'veil', text: 'Break the veil: exorcise curses', done: 'The veil is down. Enter the station ▶', scene: 'ch_veil', banner: ['幕', 'VEIL BROKEN', 'The station entrance is open'] },
    pickups: [[520, 300], [140, 60]],
    memory: { id: 'm_street', at: [600, 330], scene: 'm_street' },
  },
  b1: {
    name: 'B1F Concourse', kanji: '一', jp: '地下一階 · コンコース', floor: 'B1', depth: 1, img: 'concourse_b1.webp', rw: 640, rh: 480, scale: 4, smooth: false,
    bounds: [47, 80, 592, 400], start: [440, 238], cap: 50, spawnMult: 1.0,
    solids: [
      // the two stopped trains: hollow, with doorways
      ...[143, 287].flatMap(y => trainCar(58, y, 588, y + 49, { t: 6, doors: 6, doorW: 30 })),
      // benches and stopped escalators
      [65, 213, 95, 258], [547, 213, 575, 258], [240, 232, 300, 247], [335, 232, 400, 247],
      [65, 103, 130, 118], [510, 103, 580, 118], [65, 365, 130, 380], [510, 365, 580, 380],
      [140, 80, 215, 100], [430, 80, 500, 100], [140, 380, 215, 400], [430, 380, 500, 400],
    ],
    links: [
      { id: 'b1_up', rect: [460, 215, 530, 262], to: 'street', arrive: [640, 235], dir: 'up', label: 'EXIT TO STREET' },
      { id: 'b1_down', rect: [105, 215, 180, 262], to: 'b2', arrive: [1160, 205], dir: 'down', label: 'B2F PLATFORMS', needs: 'b1clear' },
    ],
    obj: { kills: 22, flag: 'b1clear', text: 'Clear the concourse: exorcise curses', done: 'The shutter is open. Take the escalator ▼', scene: 'ch_b1_clear', banner: ['開', 'SHUTTER OPEN', 'The way down is clear'] },
    pickups: [[330, 112], [330, 372]],
    memory: { id: 'm_b1', at: [330, 262], scene: 'm_b1' },
  },
  b2: {
    name: 'B2F Platforms', kanji: '二', jp: '地下二階 · ホーム', floor: 'B2', depth: 2, img: 'platform_b2.webp', rw: 2000, rh: 1294, scale: 1.5, smooth: true,
    bounds: [0, 0, 2000, 1294], start: [1160, 205], cap: 56, spawnMult: 0.95,
    solids: [
      // dark margins
      [0, 0, 2000, 70], [0, 1240, 2000, 1294], [0, 0, 65, 235], [0, 470, 65, 825], [0, 1065, 65, 1294],
      [1930, 0, 2000, 235], [1930, 470, 2000, 825], [1930, 1065, 2000, 1294],
      // vents, lift housings, lockers, stopped escalator
      [1820, 70, 1930, 182], [1820, 525, 1930, 770], [1820, 1110, 1930, 1240],
      [1290, 70, 1362, 185], [1290, 525, 1362, 780], [1290, 1115, 1362, 1240],
      [1030, 1065, 1290, 1240], [78, 530, 92, 765], [68, 1095, 98, 1190], [160, 70, 250, 95],
      // both trains: hollow carriages, walk in through the doorways
      ...[[355, 465], [830, 937]].flatMap(([y1, y2]) => trainCar(125, y1, 1875, y2, { doors: 9, doorW: 64 })),
      // pillars
      ...[293, 645, 998, 1700].flatMap(x => [177, 527, 765, 1100].map(y => sq(x, y, 22))),
      // benches
      [360, 70, 465, 104], [478, 70, 580, 104], [1480, 70, 1580, 104],
      [360, 612, 465, 682], [478, 612, 580, 682], [1478, 612, 1575, 682], [705, 632, 822, 662],
      [360, 1188, 465, 1224], [478, 1188, 580, 1224], [1480, 1188, 1580, 1224],
    ],
    links: [
      { id: 'b2_up', rect: [1030, 70, 1290, 175], to: 'b1', arrive: [195, 238], dir: 'up', label: 'B1F CONCOURSE' },
      { id: 'b2_down', rect: [1030, 530, 1290, 760], to: 'b3', arrive: [245, 40], dir: 'down', label: 'B3F TUNNEL LINE', needs: 'jogo' },
    ],
    obj: { boss: 'jogo', at: [700, 640], zone: [250, 505, 1750, 800], flag: 'jogo', text: 'Cross through the train and defeat Jogo', done: 'Jogo is ash. Take the escalator ▼', scene: 'ch_b2_clear' },
    pickups: [[800, 150], [1600, 1150]],
    memory: { id: 'm_b2', at: [600, 295], scene: 'm_b2' },
  },
  b3: {
    name: 'B3F Tunnel Line', kanji: '三', jp: '地下三階 · 線路', floor: 'B3', depth: 3, img: 'platform_b3.jpeg', rw: 556, rh: 359, scale: 5, smooth: false,
    bounds: [0, 0, 556, 359], start: [245, 40], cap: 60, spawnMult: 0.9,
    solids: [
      [0, 0, 556, 15], [0, 345, 556, 359], [0, 0, 20, 65], [0, 128, 20, 228], [0, 292, 20, 359],
      [538, 0, 556, 65], [538, 128, 556, 228], [538, 292, 556, 359],
      [503, 15, 541, 53], [503, 143, 541, 212], [503, 308, 541, 346],
      [360, 18, 382, 62], [360, 140, 382, 222], [360, 308, 382, 346], [285, 308, 360, 346],
      [97, 170, 160, 190], [405, 170, 440, 190], [193, 172, 235, 188],
      ...[80, 180, 277, 472].flatMap(x => [47, 146, 212, 316].map(y => sq(x, y, 6))),
    ],
    links: [
      { id: 'b3_up', rect: [285, 18, 360, 50], to: 'b2', arrive: [985, 645], dir: 'up', label: 'B2F PLATFORMS' },
      { id: 'b3_down', rect: [285, 140, 360, 215], to: 'b4', arrive: [80, 70], dir: 'down', label: 'B5F SEALED PLATFORM', needs: 'hanami' },
    ],
    obj: { boss: 'hanami', at: [470, 178], zone: [30, 130, 530, 226], flag: 'hanami', text: 'Reach the middle platform and defeat Hanami', done: 'The roots are cut. Take the escalator ▼', scene: 'ch_b3_clear' },
    pickups: [[400, 100], [150, 265]],
    memory: { id: 'm_b3', at: [130, 100], scene: 'm_b3' },
  },
  b4: {
    name: 'B5F Sealed Platform', kanji: '五', jp: '地下五階 · 封印のホーム', floor: 'B5', depth: 4, img: 'deep_b4.jpeg', rw: 415, rh: 739, scale: 4, smooth: false,
    bounds: [28, 18, 402, 712], start: [80, 70], cap: 64, spawnMult: 0.85,
    solids: [
      [0, 232, 75, 305], [0, 430, 75, 500], [342, 138, 402, 190], [338, 338, 402, 398], [340, 545, 402, 600],
      ...trainCar(207, 237, 256, 688, { t: 7, doors: 6, doorW: 34, vertical: true }),
      [65, 65, 105, 185], [60, 555, 108, 640], [122, 150, 138, 168], [122, 290, 138, 305], [122, 430, 138, 445],
    ],
    links: [{ id: 'b4_up', rect: [35, 20, 125, 40], to: 'b3', arrive: [265, 178], dir: 'up', label: 'B3F TUNNEL LINE' }],
    obj: { boss: 'mahito', at: [300, 480], zone: [28, 290, 402, 700], flag: 'mahito', text: 'Descend the platform and defeat Mahito', done: 'Shibuya is free.', scene: null },
    pickups: [[330, 480], [90, 400]],
    memory: { id: 'm_b4', at: [330, 252], scene: 'm_b4' },
  },
};
const LEVEL_ORDER = ['street', 'b1', 'b2', 'b3', 'b4'];

/* ===================== Story ===================== */
// Beat text for 'p' can be { charId: line, default: line } so each sorcerer answers in their own voice.
const SH_SCENES = {
  ch_street: { title: 'Chapter 1 · The Curtain', place: 'Scramble Crossing, 6:42 PM', beats: [
    { panel: 'st_cross', who: 'STATION', text: 'Attention. Shibuya Station is closed due to an incident. Please remain where you are. Please do not remain where you are.' },
    { panel: 'kenjaku', who: 'KENJAKU', text: 'A veil, a crowd, a quiet cruelty. Break my curtain if you can. The stairs are on your right.' },
    { panel: 'self', who: 'p', text: {
      itadori: 'A sheet of cursed energy over an intersection. Cute. I will cut through it.',
      gojo: 'The veil is thin on the left. Bet I can see through it with my eyes closed?',
      megumi: 'Cars abandoned mid-turn. Everyone left in a hurry, or never got the chance.',
      default: 'The crossing is empty. That is the worst part.' } },
    { panel: 'st_cross', who: 'STATION', text: 'Exorcise twelve curses to break the veil over the station entrance.' },
  ] },
  ch_veil: { title: 'The Veil Tears', place: 'Station entrance', beats: [
    { panel: 'takaba', who: 'TAKABA', text: 'The glow on the door just went out! Did you do that? Say yes. I am putting it in the report.' },
    { panel: 'kenjaku', who: 'KENJAKU', text: 'Five floors down. Each one hungrier than the last. Do take the escalators. The stairs are a trap.' },
    { panel: 'self', who: 'p', text: {
      itadori: 'Spare me the commentary. Move, stitched one.',
      gojo: 'Yes, I did that. Obviously. Put my good side in the report.',
      megumi: '...Please stay behind me. And stop smiling.',
      default: 'Going down.' } },
  ] },
  ch_b1: { title: 'Chapter 2 · The Concourse', place: 'B1F, ticket hall', beats: [
    { panel: 'st_b1', who: 'STATION', text: 'Welcome to Shibuya Station, B1F. All trains are suspended. All passengers are suspended.' },
    { panel: 'self', who: 'p', text: {
      itadori: 'Two trains frozen side by side. Hah. A coffin with windows.',
      gojo: 'Love what they did with the place. Very post-apocalyptic commuter.',
      megumi: 'The shadows here are moving without a light source. Stay alert.',
      default: 'The trains are not moving. Neither is anyone inside them.' } },
  ] },
  ch_b1_clear: { title: 'The Shutter Lifts', place: 'B1F, ticket hall', beats: [
    { panel: 'kenjaku', who: 'KENJAKU', text: 'The shutter lifts. Down below, Jogo is warming the platform. He never could stay patient.' },
    { panel: 'self', who: 'p', text: {
      itadori: 'A volcano with a grudge. Fine. I will put it out.',
      gojo: 'Jogo? Great. I wanted a hot take.',
      megumi: 'Special Grade, then. I will need everything I have.',
      default: 'Special Grade. Understood.' } },
  ] },
  ch_b2: { title: 'Chapter 3 · The Platforms', place: 'B2F, platform level', beats: [
    { panel: 'st_b2', who: 'STATION', text: 'Platform lines suspended. Two trains are stopped. Neither is empty.' },
    { panel: 'self', who: 'p', text: {
      itadori: 'The trains have doors. Doors are for walking through.',
      gojo: 'Walk through the train, or around it by the track beds. I do love a puzzle with explosions.',
      megumi: 'The platform is split in three. The trains are open. I can cut straight through.',
      default: 'The trains cut the platforms apart, but their doors are open. I can walk straight through.' } },
  ] },
  ch_b2_clear: { title: 'Ash on the Rails', place: 'B2F, middle platform', beats: [
    { panel: 'takaba', who: 'TAKABA', text: 'The whole platform was on fire and you did not even sweat? Can I interview your hands?' },
    { panel: 'kenjaku', who: 'KENJAKU', text: 'One disaster down. The volcano wanted to be a god. Poor thing. Next, the forest.' },
  ] },
  ch_b3: { title: 'Chapter 4 · The Tunnel Line', place: 'B3F, tunnel platform', beats: [
    { panel: 'toji', who: 'TOJI', text: 'Quiet down here. I heard you coming from two floors up.' },
    { panel: 'self', who: 'p', text: {
      itadori: 'A man with no cursed energy, walking my halls. Are you here to die or to watch?',
      gojo: 'Oh, hey. Always a pleasure. Are you going to get in my way?',
      megumi: '...You. Stay out of the way of the curses, and out of mine.',
      default: 'Who sent you?' } },
    { panel: 'toji', who: 'TOJI', text: 'Nobody, tonight. Walk the tunnel. I will be around. Try not to die. It would be annoying to explain.' },
  ] },
  ch_b3_clear: { title: 'Roots and Ash', place: 'B3F, middle platform', beats: [
    { panel: 'kenjaku', who: 'KENJAKU', text: 'Roots and ash. Two down. The deepest floor remembers every name ever written on it.' },
    { panel: 'self', who: 'p', text: {
      itadori: 'Then let it remember mine.',
      gojo: 'Cute. Remember mine in bigger letters.',
      megumi: 'I am not afraid of a name.',
      default: 'Show me the last floor.' } },
  ] },
  ch_b4: { title: 'Chapter 5 · The Sealed Platform', place: 'B5F, a floor not on the map', beats: [
    { panel: 'st_b4', who: 'STATION', text: 'Platform B5F. There is no B4F. Nobody remembers why.' },
    { panel: 'kenjaku', who: 'KENJAKU', text: 'The last platform. Behind that door, a prison. In front of it, a man who loves to rearrange souls.' },
    { panel: 'self', who: 'p', text: {
      itadori: 'Another of Kenjaku\'s toys. I will break it and keep the pieces.',
      gojo: 'Mahito? The cheerful one. Good. I am in a cheerful mood too.',
      megumi: 'A curse that shapes souls. I know what I have to do.',
      default: 'Last floor. Last fight.' } },
  ] },
  ch_end: { title: 'Epilogue · Reopening', place: 'B5F, sealed platform', beats: [
    { panel: 'kenjaku', who: 'KENJAKU', text: 'Three disasters, five floors, not a scratch on my plan. Thank you for the demonstration.' },
    { panel: 'self', who: 'p', text: {
      itadori: 'Plans have a habit of breaking in my hands.',
      gojo: 'Nah. I\'d win. Obviously. Also, I am keeping the station.',
      megumi: 'We are not done. Never mind. We are.',
      default: 'Your plan is not finished. Neither am I.' } },
    { panel: 'st_cross', who: 'STATION', text: 'Shibuya Station is now reopening. Thank you for your patience.' },
  ] },
  m_street: { title: 'The Ringing Phone', place: 'Scramble Crossing', memory: true, beats: [
    { panel: 'st_cross', who: 'STATION', text: 'An unattended phone rings on the asphalt. The caller ID reads: MOM.' },
    { panel: 'self', who: 'p', text: { itadori: 'Humans. Always so loud.', gojo: 'I\'ll make sure someone picks up. Eventually.', megumi: '...I will get you home. Whoever you are.', default: 'Nobody answers. I should finish this quickly.' } },
  ] },
  m_b1: { title: 'The Last Timetable', place: 'B1F, ticket hall', memory: true, beats: [
    { panel: 'st_b1', who: 'STATION', text: 'The timetable has been rewritten in red. Every train terminates at: DOWN.' },
    { panel: 'takaba', who: 'TAKABA', text: 'Fun fact: the departure board just winked at me. I would like to leave now.' },
  ] },
  m_b2: { title: 'Burnt Seats', place: 'B2F, track bed', memory: true, beats: [
    { panel: 'st_b2', who: 'STATION', text: 'The seats inside the stopped train are scorched in the shape of hands.' },
    { panel: 'self', who: 'p', text: { itadori: 'Heat that clings. Amateur work.', gojo: 'Sloppy. You never leave fingerprints.', megumi: 'Whoever they were, they were afraid.', default: 'Someone held on until the very end.' } },
  ] },
  m_b3: { title: 'Tally Marks', place: 'B3F, tunnel wall', memory: true, beats: [
    { panel: 'st_b3', who: 'STATION', text: 'Chalk on the tunnel wall: one tally mark for every floor. Five. The fifth is circled twice.' },
    { panel: 'toji', who: 'TOJI', text: 'Not mine. Though I would have drawn it neater.' },
  ] },
  m_b4: { title: 'The Sealed Door', place: 'B5F, sealed platform', memory: true, beats: [
    { panel: 'st_b4', who: 'STATION', text: 'A door with no handle. Cursed seals crawl across it like frost.' },
    { panel: 'kenjaku', who: 'KENJAKU', text: 'You came all this way to look at a door. Admirable. Look as long as you like.' },
  ] },
};

// Prologues for Shibuya runs. They are also eligible in the normal pool. Picked in story.js.
SCENES.push(
  { id: 'shibuya_curtain', chars: ['itadori'], shibuya: true, title: 'Dusk Over Shibuya', place: 'Shibuya Station, Exit 8',
    beats: [
      { panel: 'sk_flames',    who: 'SUKUNA',  text: 'A curtain of dusk over a station. Even the pigeons have fled.' },
      { panel: 'kenjaku',      who: 'KENJAKU', text: 'Welcome, King of Curses. The curtain is down. Nobody leaves, nobody enters.' },
      { panel: 'sk_disgraced', who: 'SUKUNA',  text: 'You expect a bedsheet of cursed energy to cage me?' },
      { panel: 'kenjaku',      who: 'KENJAKU', text: 'I expect you to be curious. Five floors below, a sealed door. Something worth killing for.' },
      { panel: 'sk_shrine',    who: 'SUKUNA',  text: 'Five floors of curses and a locked door. Fine. I will humor your theater.' },
    ],
    prompt: 'The escalator groans open.',
    options: [
      { label: 'Descend hungry',   omen: 'bloodlust' },
      { label: 'Descend watching', omen: 'foresight' },
    ] },
  { id: 'shibuya_last_train', chars: ['gojo'], shibuya: true, title: 'The Last Train', place: 'Shibuya, platform level',
    beats: [
      { panel: 'takaba',   who: 'TAKABA',  text: 'Gojo-san! The station is closed, there is a veil, the trains stopped, and I need the restroom. Priorities?' },
      { panel: 'gj_crazy', who: 'GOJO',    text: 'One, the veil. Two, whatever is behind the veil. Three, your bladder.' },
      { panel: 'kenjaku',  who: 'KENJAKU', text: 'Satoru Gojo, the strongest, walking into a sealed station. How trusting.' },
      { panel: 'gj_win',   who: 'GOJO',    text: 'Nah. I\'d win. Going down.' },
    ],
    prompt: 'The last train never arrives.',
    options: [
      { label: 'Take it slow',        omen: 'patience' },
      { label: 'Make an entrance',    omen: 'showtime' },
    ] },
  { id: 'shibuya_shadows', chars: ['megumi'], shibuya: true, title: 'Shadows Point Down', place: 'Scramble Crossing',
    beats: [
      { panel: 'toji',        who: 'TOJI',   text: 'The station is sealed. Every shadow in this district is pointing at the stairs.' },
      { panel: 'mg_enough',   who: 'MEGUMI', text: 'I felt it too. Something down there is waiting for a fight.' },
      { panel: 'toji',        who: 'TOJI',   text: 'Then do not die at the entrance. That is all the advice you are getting.' },
      { panel: 'mg_treasure', who: 'MEGUMI', text: 'With this treasure... fine. I will go down.' },
    ],
    prompt: 'The shadows lengthen toward the station.',
    options: [
      { label: 'Go for yourself',                 omen: 'resolve' },
      { label: 'Go for those trapped inside',     omen: 'vow' },
    ] },
  { id: 'shibuya_unknown', chars: [], shibuya: true, fallback: true, title: 'Closed for Maintenance', place: 'Shibuya, midnight',
    beats: [
      { panel: 'st_cross', who: 'STATION', text: 'Attention. Shibuya Station is closed. Please do not enter.' },
      { panel: 'kenjaku',  who: 'KENJAKU', text: 'Yet here you are. Another sorcerer who cannot read signs.' },
      { panel: 'takaba',   who: 'TAKABA',  text: 'I will hold your coat! Out of the way, curses, big entrance!' },
    ],
    prompt: 'Choose how you walk in.',
    options: [
      { label: 'Head held high',  omen: 'resolve' },
      { label: 'Quiet and sharp', omen: 'focus' },
    ] },
);

/* ===================== Level build ===================== */
const shCache = {};
function shBuild(id) {
  if (shCache[id]) return shCache[id];
  const d = LEVELS[id], s = d.scale;
  const R = (r) => ({ x1: r[0] * s, y1: r[1] * s, x2: r[2] * s, y2: r[3] * s });
  const img = new Image();
  const L = { id, def: d, img, ready: false, w: d.rw * s, h: d.rh * s,
    bounds: R(d.bounds), solids: d.solids.map(R),
    links: d.links.map(l => ({ ...l, r: R(l.rect) })),
    pickups: (d.pickups || []).map(p => ({ x: p[0] * s, y: p[1] * s, taken: false })),
    memory: d.memory ? { ...d.memory, x: d.memory.at[0] * s, y: d.memory.at[1] * s, used: false } : null,
    zone: d.obj.zone ? R(d.obj.zone) : null,
    kills: 0, visited: false, boss: null, bossSpawned: false, stash: [], done: false };
  img.onload = () => { L.ready = true; };
  img.src = SH_IMG + d.img;
  shCache[id] = L;
  return L;
}
const shLocked = (l) => !!l.needs && !game.shibuya.flags[l.needs];

/* ===================== Collision ===================== */
function shCircleRect(cx, cy, r, b) {
  const nx = clamp(cx, b.x1, b.x2), ny = clamp(cy, b.y1, b.y2);
  return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r;
}

// Keeps a circle (entity position + dyOff, radius r) inside the floor and out of every solid.
function pushOutOfLevel(ent, dyOff, r) {
  const L = game.shibuya.cur, b = L.bounds;
  for (let pass = 0; pass < 2; pass++) {
    ent.x = clamp(ent.x, b.x1 + r, b.x2 - r);
    ent.y = clamp(ent.y, b.y1 + r - dyOff, b.y2 - r - dyOff);
    const cx0 = ent.x, cy0 = ent.y + dyOff;
    const solid = (t) => {
      if (cx0 + r < t.x1 || cx0 - r > t.x2 || cy0 + r < t.y1 || cy0 - r > t.y2) return;
      const cx = ent.x, cy = ent.y + dyOff;
      const nx = clamp(cx, t.x1, t.x2), ny = clamp(cy, t.y1, t.y2);
      const ddx = cx - nx, ddy = cy - ny, d2 = ddx * ddx + ddy * ddy;
      if (d2 >= r * r) return;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        ent.x += ddx / d * (r - d);
        ent.y += ddy / d * (r - d);
      } else {
        // centre is inside: leave through the nearest side
        const l = cx - t.x1, rt = t.x2 - cx, tp = cy - t.y1, bt = t.y2 - cy, m = Math.min(l, rt, tp, bt);
        if (m === l) ent.x = t.x1 - r; else if (m === rt) ent.x = t.x2 + r;
        else if (m === tp) ent.y = t.y1 - r - dyOff; else ent.y = t.y2 + r - dyOff;
      }
    };
    for (const t of L.solids) solid(t);
    for (const l of L.links) if (shLocked(l)) solid(l.r); // a sealed escalator is a wall
  }
}

function shBlockedAt(x, y, pad = 0) {
  const L = game.shibuya.cur, b = L.bounds;
  if (x < b.x1 + pad || x > b.x2 - pad || y < b.y1 + pad || y > b.y2 - pad) return true;
  for (const t of L.solids) if (x > t.x1 - pad && x < t.x2 + pad && y > t.y1 - pad && y < t.y2 + pad) return true;
  for (const l of L.links) if (shLocked(l) && x > l.r.x1 && x < l.r.x2 && y > l.r.y1 && y < l.r.y2) return true;
  return false;
}

// A walkable point just off-screen (preferring `angle`) for ambient spawns.
function levelSpawnPos(angle) {
  const p = game.player;
  const ring = Math.max(canvas.width, canvas.height) / 2 + 80;
  for (let i = 0; i < 16; i++) {
    const a = i === 0 && angle !== undefined ? angle : rand(0, Math.PI * 2);
    const d = ring + rand(0, 160) * (i > 3 ? 2 : 1);
    const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    if (!shBlockedAt(x, y, 18)) return { x, y };
  }
  const b = game.shibuya.cur.bounds;
  for (let i = 0; i < 40; i++) {
    const x = rand(b.x1, b.x2), y = rand(b.y1, b.y2);
    if (dist(x, y, p.x, p.y) > 380 && !shBlockedAt(x, y, 18)) return { x, y };
  }
  return { x: p.x + 420, y: p.y };
}

/* ===================== Run flow ===================== */
function shibuyaStart() {
  const flags = {};
  game.shibuya = { flags, cur: null, curId: null, cool: 0, trans: null, queue: [], seen: {}, deepest: 0, visited: 0, lvKillSeen: 0, epilogue: false, hint: '' };
  shEnter('street', null, true);
  game.shibuya.queue.push({ id: 'ch_street', delay: 3200 });
  document.getElementById('objective').classList.remove('hidden');
}

function shEnter(id, link, first) {
  const S = game.shibuya;
  if (S.cur) S.cur.stash = game.enemies.filter(e => e.isBoss && !e.dead);
  game.enemies = []; game.projectiles = []; game.hazards = []; game.orbs = []; game.zones = []; game.rings = [];
  const L = shBuild(id);
  S.cur = L; S.curId = id;
  const p = game.player;
  const at = link ? link.arrive : L.def.start; // arrive points are in the destination map's pixels
  p.x = at[0] * L.def.scale;
  p.y = at[1] * L.def.scale;
  p.dash = null;
  for (const e of L.stash) game.enemies.push(e);
  L.stash = [];
  game.camera.x = p.x; game.camera.y = p.y;
  S.lvKillSeen = game.kills;
  S.deepest = Math.max(S.deepest, L.def.depth);
  if (!L.visited) {
    L.visited = true; S.visited++;
    if (!first) {
      showBanner(L.def.kanji, L.def.name, L.def.jp);
      const sc = { street: null, b1: 'ch_b1', b2: 'ch_b2', b3: 'ch_b3', b4: 'ch_b4' }[id];
      if (sc) S.queue.push({ id: sc, delay: 1500 });
    }
  }
  S.hint = '';
}

function shGo(link) {
  const S = game.shibuya;
  if (S.trans || S.cool > 0) return;
  S.trans = { t: 0, link, swapped: false };
  game.player.invuln = Math.max(game.player.invuln, 900);
}

function updateTransition(dt) {
  const S = game.shibuya, tr = S.trans;
  tr.t += dt;
  if (!tr.swapped && tr.t >= 340) { tr.swapped = true; shEnter(tr.link.to, tr.link, false); }
  if (tr.t >= 700) { S.trans = null; S.cool = 700; }
}
// Runs a scene from the story overlay mid-run, then returns to the fight.
function playRunScene(id, done) {
  const sc = SH_SCENES[id];
  if (!sc) { done && done(); return; }
  if (game.shibuya) game.shibuya.seen[id] = true;
  sc.beats.forEach(b => { const i = new Image(); i.src = PANELS[beatPanel(b, game.character)]; });
  const ch = game.character;
  Object.assign(story, { scene: sc, idx: 0, choosing: false, ch, inRun: true, done });
  state = 'story';
  story.choice.classList.add('hidden');
  story.caption.classList.remove('hidden');
  story.overlay.classList.remove('choosing');
  story.eyebrow.textContent = `${sc.memory ? 'Memory' : 'Story'} · ${sc.place}`;
  story.title.textContent = sc.title;
  story.overlay.classList.remove('hidden');
  showBeat();
}

function endRunScene() {
  clearInterval(story.typer); story.typer = null;
  story.inRun = false;
  hideStory();
  const done = story.done; story.done = null;
  state = 'playing';
  game.lastTs = performance.now();
  requestAnimationFrame(loop);
  if (done) done();
}

/* ===================== Boss + objectives ===================== */
function spawnLevelBoss(L) {
  const o = L.def.obj, s = L.def.scale;
  const idx = BOSS_DEFS.findIndex(b => b.id === o.boss);
  game.bossOrder = [idx]; game.bossIdx = 0;
  const b = spawnEnemy('boss', { x: o.at[0] * s, y: o.at[1] * s });
  game.bossIdx = 1;
  L.boss = b; L.bossSpawned = true;
  startBossDialogue(b, () => {
    showBanner('特級呪霊', b.name, `Special Grade Curse · ${b.title}`);
    game.camera.shake = Math.max(game.camera.shake, 14);
    companionBark('boss', false);
  });
}

function shObjectiveDone(L) {
  const S = game.shibuya, o = L.def.obj;
  L.done = true;
  S.flags[o.flag] = true;
  if (o.banner) showBanner(o.banner[0], o.banner[1], o.banner[2]);
  else if (o.boss) showBanner('祓', 'ESCALATOR UNSEALED', 'The way down is open');
  game.camera.shake = Math.max(game.camera.shake, 8);
  if (o.scene) S.queue.push({ id: o.scene, delay: 1800 });
}

function shHeal(frac) {
  const p = game.player;
  p.hp = Math.min(p.maxHp, p.hp + p.maxHp * frac);
  spawnText(p.x, p.y - 40, `+${Math.round(p.maxHp * frac)} HP`, '#86efac', true);
  spawnParticles(p.x, p.y, '#86efac', 14);
}

function updateShibuya(dt) {
  const S = game.shibuya, L = S.cur, p = game.player, o = L.def.obj;
  S.cool = Math.max(0, S.cool - dt);

  // queued story scenes (one at a time, once the fade is over and no dialogue is up)
  if (S.queue.length && !S.trans) {
    S.queue[0].delay -= dt;
    if (S.queue[0].delay <= 0) { const q = S.queue.shift(); playRunScene(q.id); return; }
  }

  // kill-count objectives
  L.kills += game.kills - S.lvKillSeen; S.lvKillSeen = game.kills;
  if (!L.done && o.kills && L.kills >= o.kills) shObjectiveDone(L);

  // boss objectives: enter the arena zone to wake the Special Grade
  if (o.boss && !L.bossSpawned && !L.done && L.zone && shCircleRect(p.x, p.y + 12, 11, L.zone)) spawnLevelBoss(L);
  if (L.boss && L.boss.dead && !L.done) shObjectiveDone(L);
  if (L.boss && L.boss.dead) L.boss = null;

  // drop curses that have wandered far from the player (they were stuck behind a wall)
  for (const e of game.enemies) if (!e.isBoss && e.type !== 'elite' && dist(e.x, e.y, p.x, p.y) > 1700) e.dead = true;

  // pickups and the floor's optional memory
  for (const pk of L.pickups) {
    if (!pk.taken && dist(pk.x, pk.y, p.x, p.y) < 36) { pk.taken = true; shHeal(0.35); }
  }
  const m = L.memory;
  if (m && !m.used && dist(m.x, m.y, p.x, p.y) < 46) {
    m.used = true; META.seen[m.scene] = true; saveMeta();
    shHeal(0.25);
    playRunScene(m.scene);
    return;
  }

  // escalators
  S.hint = '';
  for (const l of L.links) {
    const hit = shCircleRect(p.x, p.y + 12, 11, l.r);
    if (shLocked(l)) {
      if (dist(p.x, p.y, (l.r.x1 + l.r.x2) / 2, (l.r.y1 + l.r.y2) / 2) < 380) S.hint = 'Sealed. Finish the objective first.';
      continue;
    }
    if (hit) { shGo(l); break; }
  }
}

function shibuyaSpawning(dt) {
  const S = game.shibuya, L = S.cur;
  const t = game.time / 1000 + L.def.depth * 15;
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0 && game.enemies.length < L.def.cap) {
    const perSpawn = 1 + Math.min(4, Math.floor(t / 40));
    for (let i = 0; i < perSpawn; i++) {
      const kind = pickSpawnKind(t);
      if (kind === 'fly') {
        const a = rand(0, Math.PI * 2);
        for (let j = 0; j < 3; j++) spawnEnemy('fly', { angle: a + rand(-0.12, 0.12) });
      } else spawnEnemy(kind);
    }
    game.spawnTimer = Math.max(220, 1500 - t * 3) * (RUN_MODS.spawn || 1) * L.def.spawnMult;
  }
  game.eliteTimer -= dt;
  if (game.eliteTimer <= 0 && L.def.depth > 0) { spawnEnemy('elite'); game.eliteTimer = 30000; playerBark('elite', true, 0.7); }
}

/* ===================== Camera + drawing ===================== */
function shClampCamera() {
  const L = game.shibuya.cur, c = game.camera, hw = canvas.width / 2, hh = canvas.height / 2;
  c.x = L.w <= canvas.width ? L.w / 2 : clamp(c.x, hw, L.w - hw);
  c.y = L.h <= canvas.height ? L.h / 2 : clamp(c.y, hh, L.h - hh);
}

function drawLevelBackground() {
  ctx.fillStyle = '#030307';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const L = game.shibuya.cur;
  if (L.ready) {
    const [ox, oy] = worldToScreen(0, 0);
    ctx.imageSmoothingEnabled = L.def.smooth;
    ctx.drawImage(L.img, Math.round(ox), Math.round(oy), L.w, L.h);
    ctx.imageSmoothingEnabled = true;
  }
  ctx.fillStyle = 'rgba(8,6,24,0.38)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function shRectScreen(r) {
  const [x, y] = worldToScreen(r.x1, r.y1);
  return [x, y, r.x2 - r.x1, r.y2 - r.y1];
}

// Escalator markers, sealed barriers, pickups and memories: drawn under the characters.
function drawLevelFx() {
  const S = game.shibuya, L = S.cur, now = performance.now();
  const pulse = 0.5 + 0.5 * Math.sin(now / 320);
  ctx.save();
  ctx.textAlign = 'center';
  for (const l of L.links) {
    const [x, y, w, h] = shRectScreen(l.r);
    const locked = shLocked(l);
    ctx.fillStyle = locked ? 'rgba(185,28,28,0.42)' : `rgba(250,204,21,${0.12 + pulse * 0.16})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = locked ? '#ef4444' : '#fde047';
    ctx.lineWidth = 3;
    ctx.setLineDash(locked ? [14, 10] : []);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.font = '800 15px Inter, sans-serif';
    ctx.fillStyle = locked ? '#fca5a5' : '#fef9c3';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
    const arrow = l.dir === 'down' ? '▼' : '▲';
    ctx.fillText(locked ? `封 SEALED · ${l.label}` : `${arrow} ${l.label}`, x + w / 2, y - 8);
    ctx.shadowBlur = 0;
  }
  for (const pk of L.pickups) {
    if (pk.taken) continue;
    const [x, y] = worldToScreen(pk.x, pk.y);
    ctx.fillStyle = `rgba(134,239,172,${0.25 + pulse * 0.2})`;
    ctx.beginPath(); ctx.arc(x, y, 20 + pulse * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#16a34a'; ctx.strokeStyle = '#dcfce7'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 6, y - 1.5, 12, 3); ctx.fillRect(x - 1.5, y - 6, 3, 12);
  }
  const m = L.memory;
  if (m && !m.used) {
    const [x, y] = worldToScreen(m.x, m.y);
    ctx.fillStyle = `rgba(125,211,252,${0.18 + pulse * 0.2})`;
    ctx.beginPath(); ctx.arc(x, y, 26 + pulse * 4, 0, Math.PI * 2); ctx.fill();
    ctx.font = '800 26px Anton, Impact, sans-serif';
    ctx.fillStyle = '#e0f2fe'; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 12;
    ctx.fillText('?', x, y + 9);
    ctx.shadowBlur = 0;
  }
  if (SH_DEBUG) {
    ctx.fillStyle = 'rgba(239,68,68,0.35)'; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1;
    for (const t of L.solids) { const [x, y, w, h] = shRectScreen(t); ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); }
    const [bx, by, bw, bh] = shRectScreen(L.bounds);
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 3; ctx.strokeRect(bx, by, bw, bh);
    if (L.zone) { const [x, y, w, h] = shRectScreen(L.zone); ctx.strokeStyle = '#a78bfa'; ctx.setLineDash([8, 6]); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]); }
    const p = game.player, [px, py] = worldToScreen(p.x, p.y + PLAYER_HIT.dy);
    ctx.strokeStyle = '#4ade80'; ctx.beginPath(); ctx.arc(px, py, PLAYER_HIT.r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// Vignette, a compass arrow toward the way on, and the floor-change fade.
function drawLevelOverlay() {
  const S = game.shibuya, L = S.cur, p = game.player;
  const W = canvas.width, H = canvas.height;
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // compass: boss while it lives, else the unlocked way down (or up when you are done here)
  let tx = null, ty = null, col = '#fde047';
  if (L.boss && !L.boss.dead) { tx = L.boss.x; ty = L.boss.y; col = '#f87171'; }
  else if (L.done || !L.def.obj) {
    const l = L.links.find(k => k.dir === 'down' && !shLocked(k));
    if (l) { tx = (l.r.x1 + l.r.x2) / 2; ty = (l.r.y1 + l.r.y2) / 2; }
  } else if (L.def.obj.boss && !L.bossSpawned && L.zone) { tx = (L.zone.x1 + L.zone.x2) / 2; ty = (L.zone.y1 + L.zone.y2) / 2; col = '#c4b5fd'; }
  if (tx !== null) {
    const [sx, sy] = worldToScreen(tx, ty);
    const off = sx < 40 || sx > W - 40 || sy < 40 || sy > H - 40;
    if (off) {
      const a = Math.atan2(ty - p.y, tx - p.x), r = Math.min(W, H) / 2 - 56;
      const ax = W / 2 + Math.cos(a) * r * (W / H > 1 ? 1.6 : 1), ay = H / 2 + Math.sin(a) * r;
      const cx = clamp(ax, 40, W - 40), cy = clamp(ay, 40, H - 40);
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.shadowColor = col; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-12, -13); ctx.lineTo(-6, 0); ctx.lineTo(-12, 13); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  if (S.trans) {
    const t = S.trans.t;
    const a = t < 340 ? t / 340 : Math.max(0, 1 - (t - 340) / 360);
    ctx.fillStyle = `rgba(0,0,0,${clamp(a, 0, 1)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function updateLevelHud() {
  const S = game.shibuya, L = S.cur, o = L.def.obj;
  const box = document.getElementById('objective');
  let text;
  if (L.done) text = o.done;
  else if (o.kills) text = `${o.text} · ${Math.min(L.kills, o.kills)}/${o.kills}`;
  else if (L.boss && !L.boss.dead) text = `Defeat ${L.boss.name}`;
  else text = o.text;
  box.querySelector('.ob-lv').textContent = L.def.name;
  box.querySelector('.ob-text').textContent = S.hint || text;
  box.classList.toggle('sealed', !!S.hint);
}

/* ===================== Menu mode toggle ===================== */
function updateModeBtn() {
  const b = document.getElementById('modeBtn');
  if (!b) return;
  b.innerHTML = RUN_MODE === 'shibuya'
    ? '<span class="btn-kanji">渋</span>Mode: Shibuya Station Incident <small>5 floors · escalators · bosses</small>'
    : '<span class="btn-kanji">∞</span>Mode: Endless Curse <small>survive as long as you can</small>';
}
document.getElementById('modeBtn').addEventListener('click', () => {
  RUN_MODE = RUN_MODE === 'shibuya' ? 'endless' : 'shibuya';
  try { localStorage.setItem('ic_mode', RUN_MODE); } catch (e) { /* ignore */ }
  updateModeBtn();
});
updateModeBtn();
