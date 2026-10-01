'use strict';
// Prologues: every run opens with a short manga-panel scene picked at random for your sorcerer,
// ending in a choice between two Omens (run modifiers with an upside and a downside).
//
// Add a scene: push an entry into SCENES. `chars` lists character ids it can appear for ([] = anyone).
// Each beat is { panel, who, text }. `who` is a key of SPEAKERS, or 'p' for the player's own character.
// Add a panel: put the image in assets/panels/ and add it to PANELS.

let RUN_MODS = {};   // numeric modifiers of the chosen Omen, read by game.js / enemies.js / meta.js
let RUN_OMEN = null; // the chosen Omen, shown in the banner and on the end screen

const PANELS = {
  sk_disgraced: 'assets/panels/sukuna/disgraced_one.jpg',
  sk_flames:    'assets/panels/sukuna/flames.jpg',
  sk_shrine:    'assets/panels/sukuna/malevolent_shrine.jpg',
  gj_defeated:  'assets/panels/gojo/defeated.jpg',
  gj_crazy:     'assets/panels/gojo/lets_get_crazy.jpg',
  gj_win:       'assets/panels/gojo/would_you_lose.jpeg',
  gj_void:      'assets/panels/gojo/unlimited_void.webp',
  st_cross:     'assets/maps/shibuya/crossing.jpg',
  st_b1:        'assets/maps/shibuya/concourse_b1.webp',
  st_b2:        'assets/maps/shibuya/platform_b2.webp',
  st_b3:        'assets/maps/shibuya/platform_b3.jpeg',
  st_b4:        'assets/maps/shibuya/deep_b4.jpeg',
  mg_enough:    'assets/panels/megumi/had_enough.jpeg',
  mg_treasure:  'assets/panels/megumi/with_this_treasure.jpeg',
  mg_nevermind: 'assets/panels/megumi/never_mind.webp',
  kenjaku:      'assets/panels/npc/kenjaku.jpg',
  takaba:       'assets/panels/npc/takaba.jpg',
  toji:         'assets/panels/npc/toji.webp',
};

const SPEAKERS = {
  SUKUNA:  { name: 'SUKUNA',  color: '#ef4444' },
  GOJO:    { name: 'GOJO',    color: '#38bdf8' },
  MEGUMI:  { name: 'MEGUMI',  color: '#22c55e' },
  TAKABA:  { name: 'TAKABA',  color: '#fbbf24' },
  KENJAKU: { name: 'KENJAKU', color: '#a78bfa' },
  TOJI:    { name: 'TOJI',    color: '#e5e7eb' },
  STATION: { name: 'ANNOUNCEMENT', color: '#94a3b8' },
};

// mods: dmg/speed/xp/domain/shards/enemyHp/enemyDmg/spawn are multipliers; hp/boss are added; revive/picks are counts.
const OMENS = {
  bloodlust: { name: 'Bloodlust',         kanji: '血', up: '+20% damage, +10% speed', down: 'curses swarm 20% faster',          mods: { dmg: 1.2, speed: 1.1, spawn: 0.8 } },
  foresight: { name: 'Foresight',         kanji: '眼', up: '+25% XP',                 down: 'first boss arrives 30s early',     mods: { xp: 1.25, boss: -30000 } },
  gift:      { name: 'Poisoned Gift',     kanji: '贈', up: '2 free technique picks',  down: 'curses have +15% HP',              mods: { picks: 2, enemyHp: 1.15 } },
  spite:     { name: 'Spite',             kanji: '怒', up: '+15% damage',             down: '-10% XP',                          mods: { dmg: 1.15, xp: 0.9 } },
  bargain:   { name: 'Mercenary Bargain', kanji: '金', up: '+50% shards',             down: 'curses have +15% HP',              mods: { shards: 1.5, enemyHp: 1.15 } },
  calm:      { name: 'Calm Mind',         kanji: '静', up: '+40 Max HP',              down: '-5% speed',                        mods: { hp: 40, speed: 0.95 } },
  showtime:  { name: 'Showtime',          kanji: '笑', up: 'Domain charges 60% faster', down: 'curses hit 15% harder',          mods: { domain: 1.6, enemyDmg: 1.15 } },
  laughter:  { name: 'Good Laugh',        kanji: '楽', up: '+30% XP',                 down: '-5% speed',                        mods: { xp: 1.3, speed: 0.95 } },
  grudge:    { name: 'Old Grudge',        kanji: '恨', up: '+25% damage',             down: '-25 Max HP',                       mods: { dmg: 1.25, hp: -25 } },
  resolve:   { name: 'Resolve',           kanji: '決', up: '+30 Max HP, +10% damage', down: 'curses have +10% HP',              mods: { hp: 30, dmg: 1.1, enemyHp: 1.1 } },
  vow:       { name: 'Binding Vow',       kanji: '縛', up: 'survive one killing blow', down: '-10% damage',                     mods: { revive: 1, dmg: 0.9 } },
  allin:     { name: 'All In',            kanji: '賭', up: '+20% damage, Domain +30%', down: '-30 Max HP',                      mods: { dmg: 1.2, domain: 1.3, hp: -30 } },
  patience:  { name: 'Patience',          kanji: '待', up: '+20 Max HP, +5% speed',   down: '-10% damage',                      mods: { hp: 20, speed: 1.05, dmg: 0.9 } },
  focus:     { name: 'Focus',             kanji: '集', up: '+10% damage, +10% speed', down: '-20 Max HP',                       mods: { dmg: 1.1, speed: 1.1, hp: -20 } },
};

const SCENES = [
  { id: 'old_rivals', chars: ['itadori'], title: 'Old Rivals', place: 'Shibuya, after dark',
    beats: [
      { panel: 'sk_flames',    who: 'SUKUNA', text: 'Flames? No. Tonight even the sky burns on its own.' },
      { panel: 'gj_win',       who: 'GOJO',   text: 'Yo, Sukuna. Heard you were bored, so I brought you a hobby.' },
      { panel: 'sk_disgraced', who: 'SUKUNA', text: 'A hobby. The so-called strongest calls me a hobby.' },
      { panel: 'gj_win',       who: 'GOJO',   text: 'Would I lose to you? Nah. I\'d win. I\'d feel a little bad about it, though.' },
      { panel: 'sk_shrine',    who: 'SUKUNA', text: 'Then feel bad inside my Shrine. The curses are already gathering. Count them for me, Honored One.' },
    ],
    prompt: 'Sukuna grins. The Shrine is hungry.',
    options: [
      { label: 'Greet them with cruelty', omen: 'bloodlust' },
      { label: 'Savor the hunt',          omen: 'foresight' },
    ] },

  { id: 'stitched_visitor', chars: ['itadori'], title: 'The Stitched Visitor', place: 'A quiet room, somewhere above the city',
    beats: [
      { panel: 'kenjaku',      who: 'KENJAKU', text: 'Don\'t get up, King of Curses. I only came to watch the gears turn.' },
      { panel: 'sk_disgraced', who: 'SUKUNA',  text: 'A thief wearing a dead man\'s face. Speak, or become a skull in my Shrine.' },
      { panel: 'kenjaku',      who: 'KENJAKU', text: 'A thousand years of waiting and you still threaten like a child. Tonight\'s curses are a gift. Eat well.' },
      { panel: 'sk_flames',    who: 'SUKUNA',  text: '...Hmph. Leave the plate. I\'ll deal with you afterward.' },
    ],
    prompt: 'The gift is on the table. What do you do?',
    options: [
      { label: 'Take the gift',      omen: 'gift' },
      { label: 'Refuse the scheme',  omen: 'spite' },
    ] },

  { id: 'hired_blade', chars: ['itadori'], title: 'The Hired Blade', place: 'A rooftop, wind rising',
    beats: [
      { panel: 'toji',         who: 'TOJI',   text: 'Heard there\'s a king around here. Doesn\'t look like much.' },
      { panel: 'sk_disgraced', who: 'SUKUNA', text: 'No cursed energy at all, yet the air bends away from you. How curious.' },
      { panel: 'toji',         who: 'TOJI',   text: 'Spare me. Name your price. Whoever hired me pays better than you.' },
      { panel: 'sk_shrine',    who: 'SUKUNA', text: 'Hah! Run along, hired blade. The curses will be the ones begging tonight.' },
    ],
    prompt: 'The mercenary waits for an answer.',
    options: [
      { label: 'Hear his offer',  omen: 'bargain' },
      { label: 'Ignore him',      omen: 'calm' },
    ] },

  { id: 'comedy_hour', chars: ['gojo'], title: 'Comedy Hour', place: 'An alley that smells like dread and pizza',
    beats: [
      { panel: 'takaba', who: 'TAKABA', text: 'Gojo-san! Quick question. Is it true you can\'t lose?' },
      { panel: 'gj_crazy', who: 'GOJO',   text: 'Obviously. Next question.' },
      { panel: 'takaba', who: 'TAKABA', text: 'Okay, but if you did lose, could I get the exclusive? Asking for the audience.' },
      { panel: 'gj_win', who: 'GOJO',   text: 'Nah, I\'d win. But for you, I\'ll make it entertaining. Go ahead, Takaba, count the curses.' },
      { panel: 'takaba', who: 'TAKABA', text: 'Too many! Do I get a discount if I scream?' },
    ],
    prompt: 'The crowd is warming up.',
    options: [
      { label: 'Play to the crowd',   omen: 'showtime' },
      { label: 'Let Takaba do a bit', omen: 'laughter' },
    ] },

  { id: 'would_you_lose', chars: ['gojo'], title: 'Would You Lose?', place: 'Across a field of ash',
    beats: [
      { panel: 'gj_win',       who: 'GOJO',   text: 'Hey, Sukuna. Quick poll: would you lose to me?' },
      { panel: 'sk_disgraced', who: 'SUKUNA', text: 'Hmph. Ask me again when your Six Eyes stop bleeding.' },
      { panel: 'gj_defeated',  who: 'GOJO',   text: '...Fair. I do remember that day. I remember all of it.' },
      { panel: 'gj_void',      who: 'GOJO',   text: 'But that was then. Tonight I bring Infinite Void and a really good mood.' },
    ],
    prompt: 'He is smiling. It does not reach the eyes.',
    options: [
      { label: 'Carry the grudge',  omen: 'grudge' },
      { label: 'Cool head',         omen: 'calm' },
    ] },

  { id: 'prison_door', chars: ['gojo'], title: 'The Door Guards', place: 'Beneath a sealed gate',
    beats: [
      { panel: 'kenjaku',  who: 'KENJAKU', text: 'Satoru Gojo. Alone at last, and fully charged.' },
      { panel: 'gj_crazy', who: 'GOJO',    text: 'Funny, I expected a bigger stage. Let\'s get... a little crazy?' },
      { panel: 'kenjaku',  who: 'KENJAKU', text: 'The Prison Realm waits. These curses are merely the door guards.' },
      { panel: 'gj_win',   who: 'GOJO',    text: 'Nah. I\'d win.' },
    ],
    prompt: 'The guards are closing in.',
    options: [
      { label: 'Burn through them',  omen: 'bloodlust' },
      { label: 'Study the door',     omen: 'foresight' },
    ] },

  { id: 'bad_inheritance', chars: ['megumi'], title: 'A Bad Inheritance', place: 'Where the shadows pool',
    beats: [
      { panel: 'toji',        who: 'TOJI',   text: '...You have my eyes. That\'s the only thing you got from me.' },
      { panel: 'mg_enough',   who: 'MEGUMI', text: 'I\'ve had enough of hearing who you were. I\'m not your anything.' },
      { panel: 'toji',        who: 'TOJI',   text: 'Good. Then show me the other thing you inherited. Stubbornness.' },
      { panel: 'mg_treasure', who: 'MEGUMI', text: 'With this treasure, I summon...' },
    ],
    prompt: 'What are you fighting for?',
    options: [
      { label: 'For yourself',        omen: 'resolve' },
      { label: 'For your sister',     omen: 'vow' },
    ] },

  { id: 'wasted_shell', chars: ['megumi'], title: 'A Waste of a Shell', place: 'Under a broken moon',
    beats: [
      { panel: 'sk_shrine',    who: 'SUKUNA', text: 'Fushiguro. Ten Shadows in a shell this fragile. What a waste.' },
      { panel: 'mg_nevermind', who: 'MEGUMI', text: 'Heh. Never mind. I\'m done being polite about it.' },
      { panel: 'sk_disgraced', who: 'SUKUNA', text: 'Then die usefully. Let the curses taste what\'s left of you.' },
      { panel: 'mg_treasure',  who: 'MEGUMI', text: 'Not a chance. Divine Dogs, go.' },
    ],
    prompt: 'Everything or nothing.',
    options: [
      { label: 'Spend everything now',   omen: 'allin' },
      { label: 'Hold something back',    omen: 'patience' },
    ] },

  { id: 'stray_comedian', chars: ['megumi'], title: 'The Stray Comedian', place: 'A parking lot, midnight',
    beats: [
      { panel: 'takaba',       who: 'TAKABA', text: 'Hey, shadow guy! You have a dog. Can I pet it?' },
      { panel: 'mg_enough',    who: 'MEGUMI', text: '...No. And please stop smiling at me like that.' },
      { panel: 'takaba',       who: 'TAKABA', text: 'Tough crowd! What if I distract the curses with some stand-up?' },
      { panel: 'mg_nevermind', who: 'MEGUMI', text: '...Fine. Just stay out of the way.' },
    ],
    prompt: 'Takaba is already warming up.',
    options: [
      { label: 'Let him distract them', omen: 'laughter' },
      { label: 'Shoo him away',         omen: 'focus' },
    ] },

  // Fallback for characters without their own scenes (including community characters).
  { id: 'unknown_sorcerer', chars: [], fallback: true, title: 'A Visit from the Dark', place: 'Somewhere between cities',
    beats: [
      { panel: 'kenjaku', who: 'KENJAKU', text: 'Another sorcerer walks into the dark. How brave. How predictable.' },
      { panel: 'takaba',  who: 'TAKABA',  text: 'Hey, I\'ll hold your coat! Out of the way, curses, big entrance!' },
      { panel: 'kenjaku', who: 'KENJAKU', text: 'Show me how you fight. I\'m taking notes.' },
    ],
    prompt: 'Choose how you walk in.',
    options: [
      { label: 'Head held high',  omen: 'resolve' },
      { label: 'Quiet and sharp', omen: 'focus' },
    ] },
];

/* ===================== Playback ===================== */
const story = {
  overlay: document.getElementById('story-overlay'),
  bg: document.getElementById('stBg'),
  frame: document.getElementById('stFrame'),
  img: document.getElementById('stImg'),
  eyebrow: document.getElementById('stEyebrow'),
  title: document.getElementById('stTitle'),
  caption: document.getElementById('stCaption'),
  name: document.getElementById('stName'),
  text: document.getElementById('stText'),
  choice: document.getElementById('stChoice'),
  prompt: document.getElementById('stPrompt'),
  options: document.getElementById('stOptions'),
  scene: null, idx: 0, typer: null, shown: 0, choosing: false, ch: null, inRun: false, done: null,
};

function pickScene(ch) {
  // Shibuya runs only use Shibuya prologues; the normal pool also includes them.
  const ok = (s) => RUN_MODE !== 'shibuya' || s.shibuya;
  let pool = SCENES.filter(s => ok(s) && s.chars.includes(ch.id));
  if (!pool.length) pool = SCENES.filter(s => ok(s) && s.fallback);
  let last = null;
  try { last = localStorage.getItem('ic_last_scene'); } catch (e) { /* ignore */ }
  const fresh = pool.filter(s => s.id !== last);
  return choice(fresh.length ? fresh : pool);
}

// Entry point for Begin / Retry: play a random prologue, then start the run.
function beginRun() {
  if (state !== 'menu' && state !== 'gameover') return;
  const ch = CHARACTERS[selectedCharIdx];
  const scene = pickScene(ch);
  try { localStorage.setItem('ic_last_scene', scene.id); } catch (e) { /* ignore */ }
  RUN_MODS = {}; RUN_OMEN = null;
  // The partner is whoever in the scene isn't the sorcerer you're playing.
  const me = (ch.speaker || '').toUpperCase();
  const other = scene.beats.map(b => b.who).find(w => w !== 'p' && w !== me);
  RUN_COMPANION = other && COMPANION_FACES[other] ? other : null;
  if (RUN_COMPANION) companionFaceImg(RUN_COMPANION); // start loading the face now
  Object.assign(story, { scene, idx: 0, choosing: false, ch, inRun: false });
  scene.beats.forEach(b => { const i = new Image(); i.src = PANELS[b.panel]; }); // warm the cache
  state = 'story';
  el.menuOverlay.classList.add('hidden');
  el.gameoverOverlay.classList.add('hidden');
  story.choice.classList.add('hidden');
  story.caption.classList.remove('hidden');
  story.eyebrow.textContent = `Prologue · ${scene.place}`;
  story.title.textContent = scene.title;
  story.overlay.classList.remove('hidden');
  showBeat();
}

// Lines the player speaks use panel 'self': the sorcerer's own panel (or a station shot for community characters).
const SELF_PANELS = { itadori: 'sk_disgraced', gojo: 'gj_win', megumi: 'mg_enough' };
const beatPanel = (b, ch) => b.panel === 'self' ? (SELF_PANELS[ch.id] || 'st_cross') : b.panel;

// A player ('p') line can be a string or { charId: line, default: line }.
function beatText(b) {
  if (typeof b.text === 'string') return b.text;
  return b.text[story.ch.id] || b.text.default;
}

function showBeat() {
  const b = story.scene.beats[story.idx];
  const sp = b.who === 'p'
    ? { name: (story.ch.speaker || story.ch.name).toUpperCase(), color: story.ch.color }
    : SPEAKERS[b.who];
  const url = PANELS[beatPanel(b, story.ch)];
  story.img.src = url;
  story.bg.style.backgroundImage = `url("${url}")`;
  story.overlay.style.setProperty('--sc', sp.color);
  story.name.textContent = sp.name;
  // Restart the panel "slam" + caption animations for each beat.
  for (const node of [story.frame, story.caption]) { node.style.animation = 'none'; void node.offsetWidth; node.style.animation = ''; }
  story.text.textContent = '';
  story.shown = 0;
  clearInterval(story.typer);
  const full = beatText(b);
  story.typer = setInterval(() => {
    story.shown++;
    story.text.textContent = full.slice(0, story.shown);
    if (story.shown >= full.length) { clearInterval(story.typer); story.typer = null; }
  }, 24);
}

function advanceStory() {
  if (state !== 'story' || story.choosing) return;
  const b = story.scene.beats[story.idx];
  if (story.typer) { clearInterval(story.typer); story.typer = null; story.text.textContent = beatText(b); return; }
  story.idx++;
  if (story.idx >= story.scene.beats.length) { if (story.inRun) endRunScene(); else showChoice(); }
  else showBeat();
}

function showChoice() {
  clearInterval(story.typer); story.typer = null;
  story.choosing = true;
  story.caption.classList.add('hidden');
  story.prompt.textContent = story.scene.prompt;
  story.options.innerHTML = '';
  story.scene.options.forEach((o, i) => {
    const om = OMENS[o.omen];
    const card = document.createElement('div');
    card.className = 'up-card omen-card';
    card.style.setProperty('--c', '#fca5a5');
    card.innerHTML = `
      <div class="cc-kanji">${om.kanji}</div>
      <span class="card-key">${i + 1}</span><span class="up-tag">OMEN</span>
      <div class="card-name">${o.label}</div>
      <div class="omen-name">${om.name}</div>
      <div class="omen-up">+ ${om.up}</div>
      <div class="omen-down">− ${om.down}</div>`;
    card.addEventListener('click', () => chooseOmen(i));
    story.options.appendChild(card);
  });
  story.choice.classList.remove('hidden');
  story.overlay.classList.add('choosing');
}

function chooseOmen(i) {
  if (state !== 'story' || !story.choosing) return;
  const omen = OMENS[story.scene.options[i].omen];
  RUN_OMEN = omen;
  RUN_MODS = { ...omen.mods };
  META.seen[story.scene.id] = true;
  saveMeta();
  hideStory();
  startGame();
}

function hideStory() {
  clearInterval(story.typer); story.typer = null;
  story.choosing = false;
  story.overlay.classList.remove('choosing');
  story.overlay.classList.add('hidden');
}

function storyKey(e) {
  if (['Space', 'Enter', 'Escape', 'Digit1', 'Digit2'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (story.choosing) {
    if (e.code === 'Digit1') chooseOmen(0);
    else if (e.code === 'Digit2') chooseOmen(1);
  } else if (e.code === 'Escape') { if (story.inRun) endRunScene(); else showChoice(); }
  else if (e.code === 'Space' || e.code === 'Enter') advanceStory();
}
story.overlay.addEventListener('click', (e) => { if (!e.target.closest('.omen-card')) advanceStory(); });

const storySeenText = () => {
  const mem = Object.keys(SH_SCENES).filter(k => SH_SCENES[k].memory);
  const total = SCENES.filter(s => !s.fallback).length + mem.length;
  const seen = SCENES.filter(s => !s.fallback && META.seen[s.id]).length + mem.filter(k => META.seen[k]).length;
  return `Memories unlocked: ${seen}/${total}`;
};
