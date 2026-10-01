'use strict';

/* ===================== Utilities ===================== */
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const choice = (arr) => arr[randInt(0, arr.length - 1)];
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/* ===================== Characters ===================== */
/* ===================== Characters ===================== */
// Characters live in their own files in characters/ (one per character).
// Each file calls registerCharacter() from characters/registry.js. See characters/README.md.

/* ===================== Sprites ===================== */
// Sheets are flat-colour JPGs, so the background is keyed out and frames are
// found by scanning each row band for runs of non-transparent columns.
function sliceBand(d, w, band) {
  const x0 = band.x0 || 0, x1 = band.x1 || w;
  const has = (x) => {
    for (let y = band.y0; y < band.y1; y++) if (d[(y * w + x) * 4 + 3]) return true;
    return false;
  };
  const runs = [];
  if (band.even) {
    // Frames touch each other: cut at evenly spaced points, nudged to the emptiest nearby column.
    const ink = (x) => {
      let n = 0;
      for (let y = band.y0; y < band.y1; y++) if (d[(y * w + x) * 4 + 3]) n++;
      return n;
    };
    const pitch = (x1 - x0) / band.count;
    const cuts = [x0];
    for (let i = 1; i < band.count; i++) {
      const ideal = Math.round(x0 + pitch * i);
      let best = ideal;
      for (let x = ideal - 5; x <= ideal + 5; x++) if (ink(x) < ink(best)) best = x;
      cuts.push(best);
    }
    cuts.push(x1);
    for (let i = 0; i < band.count; i++) runs.push({ x0: cuts[i], x1: cuts[i + 1] });
  } else if (band.count === 1) {
    runs.push({ x0, x1 });
  } else {
    for (let x = x0; x < x1; x++) {
      if (!has(x)) continue;
      const last = runs[runs.length - 1];
      if (last && x - last.x1 <= 3) last.x1 = x + 1;
      else runs.push({ x0: x, x1: x + 1 });
    }
  }
  const frames = [];
  for (const r of runs) {
    if (r.x1 - r.x0 < 6) continue;
    let top = band.y1, bot = band.y0, left = r.x1, right = r.x0;
    for (let y = band.y0; y < band.y1; y++)
      for (let x = r.x0; x < r.x1; x++)
        if (d[(y * w + x) * 4 + 3]) {
          top = Math.min(top, y); bot = Math.max(bot, y + 1);
          left = Math.min(left, x); right = Math.max(right, x + 1);
        }
    if (bot <= top) continue;
    frames.push({ x: left, y: top, w: right - left, h: bot - top });
  }
  if (frames.length !== band.count) console.warn('sprite slice: expected', band.count, 'frames, found', frames.length);
  band.frames = frames.slice(0, band.count);
  band.maxH = Math.max(...band.frames.map(f => f.h));
}

// Removes the background of one region by flood-filling inwards from its border, so
// light/grey pixels *inside* a sprite that resemble the background survive.
function floodKey(d, w, band, bg, tBg = 90, tFringe = 170) {
  const { x0, x1, y0, y1 } = band;
  const near = (p, t) => Math.abs(d[p * 4] - bg[0]) + Math.abs(d[p * 4 + 1] - bg[1]) + Math.abs(d[p * 4 + 2] - bg[2]) < t;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) d[(y * w + x) * 4 + 3] = 255;
  const seen = new Set();
  const stack = [];
  const push = (x, y) => {
    if (x < x0 || x >= x1 || y < y0 || y >= y1) return;
    const p = y * w + x;
    if (seen.has(p) || !near(p, tBg)) return;
    seen.add(p); stack.push(p);
  };
  for (let x = x0; x < x1; x++) { push(x, y0); push(x, y1 - 1); }
  for (let y = y0; y < y1; y++) { push(x0, y); push(x1 - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    d[p * 4 + 3] = 0;
    const x = p % w, y = (p - x) / w;
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
  }
  // Drop the blended fringe: background-ish pixels touching removed ones.
  for (let pass = 0; pass < 2; pass++) {
    const gone = [];
    for (let y = y0 + 1; y < y1 - 1; y++) {
      for (let x = x0 + 1; x < x1 - 1; x++) {
        const p = y * w + x;
        if (d[p * 4 + 3] && near(p, tFringe) && (!d[(p - 1) * 4 + 3] || !d[(p + 1) * 4 + 3] || !d[(p - w) * 4 + 3] || !d[(p + w) * 4 + 3])) gone.push(p);
      }
    }
    for (const p of gone) d[p * 4 + 3] = 0;
  }
}

// Action animations are cut from hand-listed x ranges (one per frame), each trimmed to its pixels.
function sliceSegs(d, w, act) {
  act.frames = [];
  for (const [x0, x1] of act.segs) {
    let l = x1, r = x0, top = act.y1, bot = act.y0;
    for (let y = act.y0; y < act.y1; y++)
      for (let x = x0; x < x1; x++)
        if (d[(y * w + x) * 4 + 3]) { l = Math.min(l, x); r = Math.max(r, x); top = Math.min(top, y); bot = Math.max(bot, y); }
    if (r >= l) act.frames.push({ x: l, y: top, w: r - l + 1, h: bot - top + 1 });
  }
  act.maxH = Math.max(...act.frames.map(f => f.h));
}

function loadSprite(c) {
  const s = c.sprite;
  if (!s) return;
  if (s.atlas) { loadAtlasSprite(c); return; } // prestige forms use a pre-sliced atlas (js/heian.js)
  if (s.portrait && s.portrait.src) {
    // Separate portrait art (transparent PNG/WebP): used as-is, no keying.
    const p = new Image();
    p.onload = () => { s.portrait.img = p; };
    p.src = s.portrait.src;
  }
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    let data;
    try {
      data = cx.getImageData(0, 0, cv.width, cv.height);
    } catch (err) {
      // Some browsers taint the canvas for images loaded straight off disk (file://) rather than
      // over http(s). Sprite keying can't run then; the game falls back to flat-colour shapes
      // everywhere `s.ready` is checked, instead of crashing.
      console.warn('Sprite keying skipped (file:// canvas restriction):', s.src, err.message);
      return;
    }
    const d = data.data;
    if (s.flood) {
      // Dark sprites close to the background colour: only strip background connected to the region edge.
      for (const band of [s.idle, s.walk]) {
        floodKey(d, cv.width, { x0: band.x0 || 0, x1: band.x1 || cv.width, y0: band.y0, y1: band.y1 }, s.bg, s.keyT, s.fringeT);
      }
      // Action rows: every frame is keyed on its own so box outlines / labels around it can't trap background.
      for (const act of Object.values(s.actions || {})) {
        for (const [ax0, ax1] of act.segs) floodKey(d, cv.width, { x0: ax0, x1: ax1, y0: act.y0, y1: act.y1 }, s.bg, s.keyT, s.fringeT);
      }
    } else {
      for (let i = 0; i < d.length; i += 4) {
        if (Math.abs(d[i] - s.bg[0]) + Math.abs(d[i + 1] - s.bg[1]) + Math.abs(d[i + 2] - s.bg[2]) < 100) d[i + 3] = 0;
      }
    }
    // Peel off the blended edge ring: drop opaque pixels that touch a transparent one.
    const w = cv.width, h = cv.height;
    for (let pass = 0; pass < (s.erode ?? 1); pass++) {
      const alpha = new Uint8Array(w * h);
      for (let p = 0; p < w * h; p++) alpha[p] = d[p * 4 + 3];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const p = y * w + x;
          if (alpha[p] && (!alpha[p - 1] || !alpha[p + 1] || !alpha[p - w] || !alpha[p + w])) d[p * 4 + 3] = 0;
        }
      }
    }
    cx.putImageData(data, 0, 0);
    sliceBand(d, cv.width, s.idle);
    sliceBand(d, cv.width, s.walk);
    for (const act of Object.values(s.actions || {})) sliceSegs(d, cv.width, act);
    for (const key of Object.keys(s.things || {})) floodKey(d, cv.width, s.things[key], s.bg);
    // Portrait art is smooth-shaded, so key only near-exact background to keep dark clothing intact.
    if (s.portrait && !s.portrait.src) floodKey(d, cv.width, s.portrait, s.bg, s.portrait.keyT ?? 30, s.portrait.fringeT ?? 50);
    cx.putImageData(data, 0, 0);
    for (const key of Object.keys(s.things || {})) sliceBand(d, cv.width, s.things[key]);
    s.sheet = cv;
    s.ready = true;
    if (typeof buildCharGrid === 'function' && typeof el !== 'undefined' && state === 'menu') buildCharGrid();
  };
  img.src = s.src;
}

// Draws frame of `anim` with feet at (x, footY), scaled so the tallest frame is targetH px.
function drawSpriteFrame(ctx2, s, anim, t, x, footY, facing, targetH) {
  const a = s[anim] || s.actions[anim];
  const n = a.frames.length;
  const f = a.frames[(((Math.floor(t * a.fps)) % n) + n) % n];
  // Sheets with action rows share one scale (the idle height) so poses don't change the character's size.
  const k = targetH / (s.actions ? s.idle.maxH : a.maxH);
  ctx2.save();
  ctx2.translate(x, footY);
  ctx2.scale(facing, 1);
  ctx2.imageSmoothingEnabled = false;
  // Atlas frames carry a foot anchor (ax) and foot line (fy) so weapon-heavy poses don't slide the body around.
  ctx2.drawImage(s.sheet, f.x, f.y, f.w, f.h, -(f.ax ?? f.w / 2) * k, -(f.fy ?? f.h) * k, f.w * k, f.h * k);
  ctx2.restore();
}

// Draws one frame of a named extra sprite (shikigami, etc). Anchored at its feet, or its centre if `mid`.
function drawThing(ctx2, ch, name, frame, x, y, facing, targetH, mid) {
  const sp = ch && ch.sprite;
  const th = sp && sp.ready && sp.things && sp.things[name];
  if (!th || !th.frames.length) return false;
  const f = th.frames[((frame % th.frames.length) + th.frames.length) % th.frames.length];
  const k = targetH / th.maxH;
  ctx2.save();
  ctx2.translate(x, y);
  ctx2.scale(facing, 1);
  ctx2.imageSmoothingEnabled = false;
  ctx2.drawImage(sp.sheet, f.x, f.y, f.w, f.h, -f.w * k / 2, mid ? -f.h * k / 2 : -f.h * k, f.w * k, f.h * k);
  ctx2.restore();
  return true;
}
const megumiChar = () => CHARACTERS.find(c => c.id === 'megumi');

CHARACTERS.forEach(loadSprite);
Object.values(PRESTIGE).forEach(loadSprite);
BOSS_DEFS.forEach(loadSprite); // boss sheets use the same format (see enemies.js)

/* ===================== Technique art ===================== */
// Effect sprites for techniques. `tint` makes a recoloured copy of another entry.
const FX = {
  slash:     { src: 'assets/fx/slash_flurry.png' },                       // Dismantle / Cleave
  slashRed:  { tint: 'slash', rgb: [255, 70, 90] },
  red:       { src: 'assets/fx/reversal_red.webp' },                          // Cursed Technique Reversal: Red
  redFire:   { tint: 'red', rgb: [255, 150, 40], keepLight: true },      // Fuga reuses the orb in flame colours
  blue:      { src: 'assets/fx/blue_orb.png' },                           // Cursed Technique Lapse: Blue
  shrine:    { src: 'assets/fx/malevolent_shrine.png', crop: { x: 122, y: 160, w: 1764, h: 956 } }, // Malevolent Shrine
};
function loadFx(f) {
  if (f.src) {
    const img = new Image();
    img.onload = () => { f.img = img; f.ready = true; };
    img.src = f.src;
  } else {
    const base = FX[f.tint];
    const wait = setInterval(() => {
      if (!base.ready) return;
      clearInterval(wait);
      const cv = document.createElement('canvas');
      cv.width = base.img.width; cv.height = base.img.height;
      const c = cv.getContext('2d');
      c.drawImage(base.img, 0, 0);
      // 'source-atop' keeps the alpha; 'multiply'-style tint keeps the bright core for orbs.
      c.globalCompositeOperation = f.keepLight ? 'hue' : 'source-atop';
      c.fillStyle = `rgb(${f.rgb.join(',')})`;
      c.fillRect(0, 0, cv.width, cv.height);
      if (f.keepLight) {
        c.globalCompositeOperation = 'destination-in';
        c.drawImage(base.img, 0, 0);
      }
      f.img = cv; f.ready = true;
    }, 50);
  }
}
Object.values(FX).forEach(loadFx);

// Draw effect `name` centred on (x, y), `size` px wide (aspect preserved), rotated by `rot`.
function drawFx(c, name, x, y, size, rot, alpha) {
  const f = FX[name];
  if (!f || !f.ready) return false;
  const src = f.crop || { x: 0, y: 0, w: f.img.width, h: f.img.height };
  const h = size * src.h / src.w;
  c.save();
  c.globalAlpha *= alpha ?? 1;
  c.translate(x, y);
  if (rot) c.rotate(rot);
  c.drawImage(f.img, src.x, src.y, src.w, src.h, -size / 2, -h / 2, size, h);
  c.restore();
  return true;
}

/* ===================== Weapon & Passive definitions ===================== */
const WEAPON_DEFS = {
  cursedBlast: { name: 'Cursed Energy Blast', color: '#a78bfa', maxLevel: 5, chars: ['itadori', 'megumi'],
    desc: (l) => `Fires a bolt of raw cursed energy at the nearest curse. Lv${l ?? 1}` },
  // --- Sukuna ---
  dismantle: { name: 'Dismantle', color: '#fca5a5', maxLevel: 5, chars: ['itadori'],
    desc: (l) => `Invisible slashes rain down on nearby curses in rapid succession. Lv${l ?? 1}` },
  cleave: { name: 'Cleave', color: '#f43f5e', maxLevel: 5, chars: ['itadori'],
    desc: (l) => `A heavy slash on the toughest curse nearby. Its damage adapts to the target's HP. Lv${l ?? 1}` },
  fuga: { name: 'Fuga: Flame Arrow', color: '#fb923c', maxLevel: 5, chars: ['itadori'], minLevel: 4,
    desc: (l) => `Looses a flaming arrow that explodes and leaves the ground burning. Lv${l ?? 1}` },
  // --- Megumi (Ten Shadows) ---
  divineDog: { name: 'Divine Dogs', color: '#f1f5f9', maxLevel: 5, chars: ['megumi'],
    desc: (l) => `White and Black dogs circle you and maul nearby curses. Lv${l ?? 1}` },
  toad: { name: 'Toad', color: '#84cc16', maxLevel: 5, chars: ['megumi'],
    desc: (l) => `Lashes out with its tongue, yanking a curse to you and stunning it. Lv${l ?? 1}` },
  nue: { name: 'Nue', color: '#facc15', maxLevel: 5, chars: ['megumi'],
    desc: (l) => `The lightning owl swoops through curses and shocks them. Lv${l ?? 1}` },
  rabbitEscape: { name: 'Rabbit Escape', color: '#fbcfe8', maxLevel: 5, chars: ['megumi'],
    desc: (l) => `A swarm of rabbits floods an area. Curses stop to chase them and take chip damage. Lv${l ?? 1}` },
  maxElephant: { name: 'Max Elephant', color: '#38bdf8', maxLevel: 5, chars: ['megumi'],
    desc: (l) => `Floods an area with water that slows and batters curses. Lv${l ?? 1}` },
  roundDeer: { name: 'Round Deer', color: '#86efac', maxLevel: 5, chars: ['megumi'],
    desc: (l) => `The healing shikigami periodically restores your HP. Lv${l ?? 1}` },
  mahoraga: { name: 'Divine General Mahoraga', color: '#fde68a', maxLevel: 5, chars: ['megumi'], minLevel: 6,
    desc: (l) => `Summons Mahoraga for a time. Its wheel turns and its sword adapts, hitting harder every second. Lv${l ?? 1}` },
  // --- Gojo (Limitless) ---
  infinity: { name: 'Infinity', color: '#7dd3fc', maxLevel: 5, chars: ['gojo'],
    desc: (l) => `Curses slow to a crawl near you and cannot touch you. The barrier breaks if overwhelmed, then recovers. Lv${l ?? 1}` },
  blue: { name: 'Cursed Technique Lapse: Blue', color: '#38bdf8', maxLevel: 5, chars: ['gojo'],
    desc: (l) => `Conjures a singularity that pulls curses in and grinds them down. Lv${l ?? 1}` },
  red: { name: 'Cursed Technique Reversal: Red', color: '#ef4444', maxLevel: 5, chars: ['gojo'],
    desc: (l) => `A repulsive orb that detonates on impact and blasts curses away. Lv${l ?? 1}` },
  purple: { name: 'Hollow Purple', color: '#c084fc', maxLevel: 5, chars: ['gojo'], requires: ['blue', 'red'],
    desc: (l) => `Fuses Blue and Red into a massive beam that erases everything in its path. Lv${l ?? 1}` },
  domainExpansion: { name: 'Domain Expansion', color: '#60a5fa', maxLevel: 3,
    desc: (l) => `Unlocks the Domain meter. When full, press SPACE to unleash your Domain. Lv${l ?? 1}` },
};

// Which technique art (if any) represents a weapon on its upgrade card.
function techniqueArt(id, character) {
  if (id === 'domainExpansion') return character.domain && character.domain.kind === 'shrine' ? 'shrine' : null;
  return { dismantle: 'slash', cleave: 'slashRed', blue: 'blue', red: 'red', fuga: 'redFire' }[id] || null;
}

function weaponDef(id, character) {
  const d = WEAPON_DEFS[id];
  return id === 'domainExpansion' && character.domain ? { ...d, ...character.domain } : d;
}

const PASSIVE_DEFS = {
  reinforcement: { name: 'Cursed Energy Reinforcement', maxLevel: 5, desc: () => '+20 Max HP per level.' },
  rct: { name: 'Reverse Cursed Technique', maxLevel: 5, desc: () => '+0.8 HP/sec regeneration per level.' },
  footwork: { name: 'Footwork', maxLevel: 5, desc: () => '+7% move speed per level.' },
  control: { name: 'Cursed Energy Control', maxLevel: 5, desc: () => '-8% technique cooldowns per level.' },
  domainAmp: { name: 'Domain Amplifier', maxLevel: 5, desc: () => '+20% Domain damage, +10% energy regen per level.' },
  sixEyes: { name: 'Six Eyes Insight', maxLevel: 5, desc: () => '+25% pickup range, +15% XP gain per level.' },
};

/* ===================== Game ===================== */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const el = {
  hud: document.getElementById('hud'),
  hpFill: document.getElementById('hpFill'),
  hpLabel: document.getElementById('hpLabel'),
  xpFill: document.getElementById('xpFill'),
  lvlBadge: document.getElementById('lvlBadge'),
  energyRow: document.getElementById('energyRow'),
  energyFill: document.getElementById('energyFill'),
  energyLabel: document.getElementById('energyLabel'),
  timer: document.getElementById('timer'),
  killCount: document.getElementById('killCount'),
  menuOverlay: document.getElementById('menu-overlay'),
  charGrid: document.getElementById('charGrid'),
  startBtn: document.getElementById('startBtn'),
  menuBest: document.getElementById('menuBest'),
  levelupOverlay: document.getElementById('levelup-overlay'),
  upgradeCards: document.getElementById('upgradeCards'),
  pauseOverlay: document.getElementById('pause-overlay'),
  gameoverOverlay: document.getElementById('gameover-overlay'),
  finalStats: document.getElementById('finalStats'),
  retryBtn: document.getElementById('retryBtn'),
  menuBtn: document.getElementById('menuBtn'),
  banner: document.getElementById('banner'),
  bossBar: document.getElementById('bossBar'),
  bossName: document.getElementById('bossName'),
  bossFill: document.getElementById('bossFill'),
};

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (state === 'dialogue') {
    if (e.code === 'Escape') endBossDialogue();
    else if (['Space', 'Enter'].includes(e.code) && !e.repeat) advanceDialogue();
    if (['Space', 'Enter', 'Escape'].includes(e.code)) e.preventDefault();
    return;
  }
  if (state === 'story') { storyKey(e); return; }
  if (state === 'prestige') { prestigeKey(e); return; }
  if (state === 'shop') { if (e.code === 'Escape') closeShop(); return; }
  if (e.code === 'Escape') togglePause();
  if (e.code === 'Space') tryDomainExpansion();
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) tryDash();
  if (['1', '2', '3'].includes(e.key)) handleNumberKey(e.key);
  if (e.code === 'Enter' && state === 'menu') beginRun();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

let selectedCharIdx = 0;
let game = null; // active game state, null when not playing
let state = 'menu'; // menu | playing | levelup | dialogue | paused | gameover
let pendingUpgradeCards = [];
let pendingLevelUps = 0;

/* ---------- Menu setup ---------- */
function statPips(c) {
  const rows = [
    ['HP', (100 + c.hpBonus) / 150],
    ['SPEED', c.speedMult / 1.15],
    ['DOMAIN', c.domain ? clamp(c.energyRegenMult / 2, 0.15, 1) : 0],
  ];
  return rows.map(([k, v]) => `<span>${k}</span><div class="pip"><i style="width:${clamp(v, 0, 1) * 100}%"></i></div>`).join('');
}
function buildCharGrid() {
  el.charGrid.innerHTML = '';
  CHARACTERS.forEach((base, i) => {
    const c = activeCharacter(base); // shows the prestige form when it is switched on
    const card = document.createElement('div');
    card.className = 'char-card' + (i === selectedCharIdx ? ' selected' : '') + (c.prestige ? ' prestige' : '');
    card.style.setProperty('--c', c.color);
    card.innerHTML = `
      <div class="cc-kanji">${c.kanji}</div>
      <div class="cc-top"><span class="card-key">${i + 1}</span><span class="cc-grade">${c.grade}</span></div>
      <div class="cc-portrait"></div>
      <div class="card-name">${c.name}</div>
      <div class="cc-sub">${c.sub}</div>
      <div class="card-desc">${c.desc}</div>
      <div class="cc-stats">${statPips(c)}</div>
      ${c.domain ? `<div class="cc-domain"><b>領域展開</b>${c.domain.name}</div>` : ''}
      <span class="card-tag">Starts with ${c.startWeapons.map(w => WEAPON_DEFS[w].name).join(' + ')}</span>
    `;
    if (c.sprite && c.sprite.ready) {
      const icon = document.createElement('canvas');
      icon.className = 'card-icon';
      icon.width = 96; icon.height = 108;
      drawSpriteFrame(icon.getContext('2d'), c.sprite, 'idle', 0, 48, 106, 1, 100);
      card.querySelector('.cc-portrait').appendChild(icon);
    }
    const pr = prestigeRow(base);
    if (pr) card.appendChild(pr);
    card.addEventListener('click', () => { selectedCharIdx = i; buildCharGrid(); });
    card.addEventListener('dblclick', beginRun);
    el.charGrid.appendChild(card);
  });
}
// Drifting cursed-energy embers behind the main menu.
{
  const bg = document.getElementById('menuBg');
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span');
    s.className = 'ember';
    const size = rand(3, 9);
    s.style.cssText = `left:${rand(0, 100)}%;width:${size}px;height:${size}px;--dx:${rand(-80, 80)}px;` +
      `animation-duration:${rand(9, 20)}s;animation-delay:${-rand(0, 20)}s`;
    bg.appendChild(s);
  }
}
function handleNumberKey(k) {
  const idx = parseInt(k, 10) - 1;
  if (state === 'menu' && idx >= 0 && idx < CHARACTERS.length) {
    selectedCharIdx = idx; buildCharGrid();
  } else if (state === 'levelup' && idx >= 0 && idx < pendingUpgradeCards.length) {
    applyUpgrade(pendingUpgradeCards[idx]);
  }
}
function bestScoreText() {
  const best = parseInt(localStorage.getItem('ic_best_ms') || '0', 10);
  const bestKills = parseInt(localStorage.getItem('ic_best_kills') || '0', 10);
  const mem = storySeenText();
  if (!best) return mem;
  return `Best survival: ${fmtTime(best)} · Best exorcisms: ${bestKills} · ${mem}`;
}
function showMenu() {
  state = 'menu';
  game = null;
  el.hud.classList.add('hidden');
  el.bossBar.classList.add('hidden');
  el.banner.classList.add('hidden');
  document.getElementById('dialogue-overlay').classList.add('hidden');
  hideBarks();
  el.gameoverOverlay.classList.add('hidden');
  el.pauseOverlay.classList.add('hidden');
  el.levelupOverlay.classList.add('hidden');
  el.menuOverlay.classList.remove('hidden');
  el.menuBest.textContent = bestScoreText();
  document.getElementById('menuShards').textContent = META.shards;
  document.getElementById('shop-overlay').classList.add('hidden');
  hideStory();
  document.getElementById('victory-overlay').classList.add('hidden');
  buildCharGrid();
  updateModeBtn();
  document.getElementById('objective').classList.add('hidden');
}
el.startBtn.addEventListener('click', beginRun);
el.retryBtn.addEventListener('click', beginRun);
el.menuBtn.addEventListener('click', showMenu);
document.getElementById('shopBtn').addEventListener('click', openShop);
document.getElementById('shopBack').addEventListener('click', closeShop);
document.getElementById('keepBtn').addEventListener('click', () => {
  document.getElementById('victory-overlay').classList.add('hidden');
  state = 'playing'; game.lastTs = performance.now(); requestAnimationFrame(loop);
});
document.getElementById('cashBtn').addEventListener('click', () => {
  document.getElementById('victory-overlay').classList.add('hidden');
  endGame();
});

/* ===================== Entity factories ===================== */
function makePlayer(character) {
  return {
    character,
    x: 0, y: 0,
    baseSpeed: 175,
    speed: 175,
    maxHp: 100 + character.hpBonus,
    hp: 100 + character.hpBonus,
    regen: 0,
    pickupRadius: 80,
    xpGainMult: 1,
    cdrMult: 1,
    domainDamageMult: 1,
    energyRegenMult: character.energyRegenMult,
    level: 1,
    xp: 0,
    xpToNext: 18,
    invuln: 0,
    facing: 1,
    weapons: [], // {id, level, cd, ...}
    passives: {}, // id -> level
    energy: 0,
    energyMax: 100,
    domainOwned: false,
    slowUntil: 0,
  };
}

function addWeapon(player, id) {
  if (player.weapons.find(w => w.id === id)) return;
  const w = { id, level: 1, cd: 0 };
  if (id === 'divineDog') w.hitMap = new Map();
  if (id === 'infinity') { w.charge = 100; w.downUntil = 0; }
  if (id === 'mahoraga') { w.until = 0; w.start = 0; w.swing = 0; }
  if (id === 'domainExpansion') { player.domainOwned = true; w.level = 1; player.energyMax = 100; }
  player.weapons.push(w);
}

function upgradeWeapon(player, id) {
  const w = player.weapons.find(x => x.id === id);
  if (w) w.level = Math.min(w.level + 1, WEAPON_DEFS[id].maxLevel);
}

function setPassive(player, id, level) {
  player.passives[id] = level;
  recomputeStats(player);
}

function recomputeStats(player) {
  const p = player.passives;
  const oldMax = player.maxHp;
  player.maxHp = 100 + player.character.hpBonus + (p.reinforcement || 0) * 20 + metaLevel('vitality') * 10 + (RUN_MODS.hp || 0);
  player.hp = Math.min(player.maxHp, player.hp + Math.max(0, player.maxHp - oldMax));
  player.regen = (p.rct || 0) * 0.8;
  player.speed = player.baseSpeed * player.character.speedMult * (1 + (p.footwork || 0) * 0.07);
  player.cdrMult = Math.max(0.35, 1 - (p.control || 0) * 0.08);
  player.domainDamageMult = 1 + (p.domainAmp || 0) * 0.2;
  player.energyRegenMult = player.character.energyRegenMult * (1 + (p.domainAmp || 0) * 0.1);
  player.pickupRadius = 80 * (1 + (p.sixEyes || 0) * 0.25);
  player.xpGainMult = 1 + (p.sixEyes || 0) * 0.15 + metaLevel('insight') * 0.08;
  player.regen += metaLevel('recovery') * 0.3;
  player.speed *= (1 + metaLevel('haste') * 0.03) * (RUN_MODS.speed || 1);
  player.metaDmg = (1 + metaLevel('might') * 0.05) * (RUN_MODS.dmg || 1);
  player.xpGainMult *= RUN_MODS.xp || 1;
  player.energyRegenMult *= RUN_MODS.domain || 1;
}

/* ===================== Game lifecycle ===================== */
function startGame() {
  pendingLevelUps = 0;
  const character = activeCharacter(CHARACTERS[selectedCharIdx]);
  const player = makePlayer(character);
  character.startWeapons.forEach(id => addWeapon(player, id));
  recomputeStats(player);
  player.hp = player.maxHp;

  game = {
    player,
    character,
    enemies: [],
    projectiles: [],
    orbs: [],
    particles: [],
    texts: [],
    rings: [],
    zones: [],
    delayed: [],
    domain: null,
    domainColor: '#60a5fa',
    camera: { x: 0, y: 0, shake: 0 },
    time: 0,
    kills: 0,
    spawnTimer: 0,
    eliteTimer: 26000,
    bossTimer: FIRST_BOSS_MS + (RUN_MODS.boss || 0),
    bossIdx: 0,
    bossOrder: shuffle([0, 1, 2]),
    bossesDown: 0,
    won: false,
    revives: metaLevel('secondWind') + (RUN_MODS.revive || 0),
    hazards: [],
    barkQueue: [],
    barkUntil: 0,
    lastBarkAt: -1e9,
    barkShown: false,
    idleBarkT: 45000,
    lowHpBarkAt: 0,
    lastTs: 0,
    domainFlash: 0,
  };

  el.menuOverlay.classList.add('hidden');
  el.gameoverOverlay.classList.add('hidden');
  el.levelupOverlay.classList.add('hidden');
  el.pauseOverlay.classList.add('hidden');
  el.hud.classList.remove('hidden');
  hideBarks();
  game.delayed.push({ t: 1200, fn: () => playerBark('start') });
  playAnim(player, 'intro', 1300);
  if (RUN_OMEN) game.delayed.push({ t: 500, fn: () => showBanner(RUN_OMEN.kanji, RUN_OMEN.name, `Omen · ${RUN_OMEN.up} / ${RUN_OMEN.down}`) });
  preloadPanels(character);
  if (RUN_MODE === 'shibuya') shibuyaStart();
  else game.delayed.push({ t: 600, fn: () => showPanel('start', 3200) });
  state = 'playing';
  game.lastTs = performance.now();
  requestAnimationFrame(loop);
  if (RUN_MODS.picks) { pendingLevelUps = RUN_MODS.picks; openLevelUp(); }
}

function togglePause() {
  if (state === 'playing') { state = 'paused'; el.pauseOverlay.classList.remove('hidden'); }
  else if (state === 'paused') { state = 'playing'; el.pauseOverlay.classList.add('hidden'); game.lastTs = performance.now(); requestAnimationFrame(loop); }
}

function endGame() {
  state = 'gameover';
  const won = game.won;
  const survived = game.time;
  const kills = game.kills;
  const best = parseInt(localStorage.getItem('ic_best_ms') || '0', 10);
  const bestKills = parseInt(localStorage.getItem('ic_best_kills') || '0', 10);
  if (survived > best) localStorage.setItem('ic_best_ms', String(Math.floor(survived)));
  if (kills > bestKills) localStorage.setItem('ic_best_kills', String(kills));
  const shards = calcShards(game, won);
  META.shards += shards;
  if (won) { META.wins++; META.charWins[game.character.id] = (META.charWins[game.character.id] || 0) + 1; }
  saveMeta();
  document.getElementById('goTitle').innerHTML = won
    ? '<span class="t-white">EXORCISM</span> <span class="t-red">COMPLETE</span>'
    : '<span class="t-white">CONSUMED</span> <span class="t-red">BY CURSE</span>';
  document.getElementById('goKanji').textContent = won ? '祓' : '死';
  el.finalStats.innerHTML = `
    <div><b>${fmtTime(survived)}</b>Survived</div>
    <div><b>${kills}</b>Curses Exorcised</div>
    <div><b>Lv.${game.player.level}</b>Level Reached</div>
    <div><b>${game.bossesDown}/${BOSS_DEFS.length}</b>Disasters Down</div>
    <div><b>◆ ${shards}</b>Shards Earned</div>
    ${game.shibuya ? `<div><b>${['GL', 'B1', 'B2', 'B3', 'B5'][game.shibuya.deepest]}</b>Deepest Floor</div>` : ''}
    ${RUN_OMEN ? `<div><b>${RUN_OMEN.kanji}</b>${RUN_OMEN.name}</div>` : ''}
  `;
  const endPanel = game.character.panels && (won ? game.character.panels.win : game.character.panels.death);
  document.getElementById('goPanel').classList.toggle('hidden', !endPanel);
  if (endPanel) {
    document.getElementById('goPanelImg').src = endPanel.src;
    document.getElementById('goPanelCap').textContent = endPanel.cap || '';
  }
  el.gameoverOverlay.classList.remove('hidden');
  hideBarks();
  el.hud.classList.add('hidden');
  el.bossBar.classList.add('hidden');
  el.banner.classList.add('hidden');
  document.getElementById('objective').classList.add('hidden');
}

function showVictory() {
  if (state !== 'playing') { game.delayed.push({ t: 1000, fn: showVictory }); return; }
  if (game.shibuya && !game.shibuya.epilogue) { game.shibuya.epilogue = true; playRunScene('ch_end', showVictory); return; }
  state = 'victory';
  document.getElementById('victory-overlay').classList.remove('hidden');
  showPanel('win', 4000);
}

/* ===================== Upgrade flow ===================== */
function openLevelUp() {
  state = 'levelup';
  const player = game.player;
  const candidates = [];

  Object.keys(WEAPON_DEFS).forEach(id => {
    const owned = player.weapons.find(w => w.id === id);
    const wd = WEAPON_DEFS[id];
    if (wd.chars && !wd.chars.includes(player.character.id) && !(player.character.weapons || []).includes(id)) return;
    if (id === 'domainExpansion' && !player.character.domain) return;
    if (id === 'domainExpansion' && !owned && player.level < player.character.domainUnlockLevel) return;
    if (!owned && wd.minLevel && player.level < wd.minLevel) return;
    if (!owned && wd.requires && !wd.requires.every(r => player.weapons.some(x => x.id === r))) return;
    if (owned) {
      if (owned.level < WEAPON_DEFS[id].maxLevel) candidates.push({ kind: 'weapon', id, action: 'upgrade', toLevel: owned.level + 1 });
    } else if (player.weapons.length < 6) {
      candidates.push({ kind: 'weapon', id, action: 'new' });
    }
  });
  Object.keys(PASSIVE_DEFS).forEach(id => {
    const lvl = player.passives[id] || 0;
    if (lvl < PASSIVE_DEFS[id].maxLevel) candidates.push({ kind: 'passive', id, action: lvl === 0 ? 'new' : 'upgrade', toLevel: lvl + 1 });
  });

  let picks = shuffle(candidates).slice(0, 3);
  while (picks.length < 3) picks.push({ kind: 'filler' });
  pendingUpgradeCards = picks;

  el.upgradeCards.innerHTML = '';
  picks.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'up-card';
    let name, desc, color, tag, kanji;
    if (c.kind === 'weapon') {
      const def = weaponDef(c.id, player.character);
      name = def.name; desc = def.desc(c.toLevel); color = def.color;
      tag = c.action === 'new' ? 'NEW TECHNIQUE' : `LV ${c.toLevel - 1} → ${c.toLevel}`;
      kanji = c.id === 'domainExpansion' ? '領' : '術';
    } else if (c.kind === 'passive') {
      const def = PASSIVE_DEFS[c.id];
      name = def.name; desc = def.desc(); color = '#f3eee6';
      tag = c.action === 'new' ? 'NEW' : `LV ${c.toLevel - 1} → ${c.toLevel}`;
      kanji = '力';
    } else {
      name = 'Cursed Energy Surge'; desc = 'Restore 30% of max HP immediately.'; color = '#4ade80'; tag = 'RECOVERY';
      kanji = '癒';
    }
    card.style.setProperty('--c', color);
    card.innerHTML = `
      <div class="cc-kanji">${kanji}</div>
      <span class="card-key">${i + 1}</span><span class="up-tag">${tag}</span>
      <div class="card-name">${name}</div>
      <div class="card-desc">${desc}</div>
    `;
    const art = c.kind === 'weapon' ? techniqueArt(c.id, player.character) : null;
    if (art && FX[art].ready) {
      const icon = document.createElement('canvas');
      icon.className = 'card-fx';
      icon.width = 120; icon.height = 80;
      const ictx = icon.getContext('2d');
      const f = FX[art], src = f.crop || { w: f.img.width, h: f.img.height };
      drawFx(ictx, art, 60, 40, Math.min(120, 80 * src.w / src.h), 0, 1);
      card.insertBefore(icon, card.querySelector('.card-name'));
    }
    card.addEventListener('click', () => applyUpgrade(c));
    el.upgradeCards.appendChild(card);
  });

  el.levelupOverlay.classList.remove('hidden');
}

function applyUpgrade(c) {
  const player = game.player;
  if (c.kind === 'weapon') {
    if (c.action === 'new') { addWeapon(player, c.id); playerBark('newTech', true, 0.7); }
    else upgradeWeapon(player, c.id);
  } else if (c.kind === 'passive') {
    setPassive(player, c.id, (player.passives[c.id] || 0) + 1);
  } else if (c.kind === 'filler') {
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.3);
  }
  pendingLevelUps = Math.max(0, pendingLevelUps - 1);
  resumeAfterOverlay();
}

// Back to the fight after a level-up or boss conversation (or into the next queued level-up).
function resumeAfterOverlay() {
  if (pendingLevelUps > 0) {
    openLevelUp();
    return;
  }
  el.levelupOverlay.classList.add('hidden');
  state = 'playing';
  game.lastTs = performance.now();
  requestAnimationFrame(loop);
}

function gainXp(amount) {
  const player = game.player;
  player.xp += amount * player.xpGainMult;
  let leveled = false;
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level += 1;
    player.xpToNext = Math.floor(18 + player.level * 12 * Math.pow(1.05, player.level));
    pendingLevelUps += 1;
    leveled = true;
  }
  if (leveled && state === 'playing') openLevelUp();
}

/* ===================== Combat helpers ===================== */
function spawnText(x, y, str, color, big) {
  game.texts.push({ x, y, str, color, life: 700, t: 0, big });
}
function spawnParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const sp = rand(40, 180);
    game.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(250, 500), t: 0, color });
  }
}
function nearestEnemy(x, y, maxRange) {
  let best = null, bd = maxRange * maxRange;
  for (const e of game.enemies) {
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d <= bd) { bd = d; best = e; }
  }
  return best;
}

function knockback(e, fx, fy, force) {
  if (e.isBoss) force *= 0.25;
  const d = dist(e.x, e.y, fx, fy) || 1;
  e.kvx += (e.x - fx) / d * force;
  e.kvy += (e.y - fy) / d * force;
}
function burst(x, y, r, color, life) {
  game.rings.push({ type: 'ring', visual: true, x, y, radius: 0, maxRadius: r, color, life: life || 250, t: 0, hit: new Set() });
}
function slash(x, y, angle, len, width, dmg, pct, color, life, fx) {
  game.rings.push({
    type: 'line', x: x - Math.cos(angle) * len / 2, y: y - Math.sin(angle) * len / 2, angle, length: len, width,
    dmg, pct, color, life: life || 160, t: 0, hit: new Set(), fx, spin: Math.random() < 0.5 ? 1 : -1,
  });
}
function randomEnemyNear(x, y, range) {
  const near = game.enemies.filter(e => !e.dead && dist(x, y, e.x, e.y) <= range);
  return near.length ? choice(near) : null;
}

function damageEnemy(e, dmg, opts) {
  dmg *= game.player.metaDmg || 1;
  e.hp -= dmg;
  e.flash = 90;
  if (e.isBoss && !e.hurtSaid && e.hp > 0 && e.hp < e.maxHp / 2) { e.hurtSaid = true; bossBark(e); playerBark('bossHurt'); }
  spawnText(e.x + rand(-8, 8), e.y - e.radius, Math.round(dmg).toString(), (opts && opts.color) || '#fff', opts && opts.big);
  if (opts && opts.slow) e.slowUntil = game.time + 1400;
  if (opts && opts.stun) e.stunUntil = Math.max(e.stunUntil, game.time + opts.stun);
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    game.kills += 1;
    if (e.isBoss) {
      playerBark('bossDown');
      game.bossesDown++;
      if (game.bossesDown >= BOSS_DEFS.length && !game.won) { game.won = true; game.delayed.push({ t: 2600, fn: showVictory }); }
    }
    else if (game.kills % 250 === 0) playerBark('streak', true);
    spawnParticles(e.x, e.y, e.color, 14);
    spawnParticles(e.x, e.y, '#1a0a12', e.isBoss ? 30 : 6);
    game.orbs.push({ x: e.x, y: e.y, value: e.xpValue, vx: 0, vy: 0 });
    heianKill(e);
    if (e.isBoss) { game.camera.shake = Math.max(game.camera.shake, 18); spawnText(e.x, e.y - 40, e.name + ' EXORCISED', '#fbbf24', true); }
    else if (e.type === 'elite') spawnText(e.x, e.y - 30, '祓 EXORCISED', '#facc15', true);
  }
}

function damageEnemiesInRadius(x, y, r, dmg, opts) {
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (dist(x, y, e.x, e.y) <= r + e.radius) {
      damageEnemy(e, dmg, opts);
      if (opts && opts.knock) knockback(e, x, y, opts.knock);
    }
  }
}

// Sprite action poses (hit / strike / Cleave / Fuga / domain). Higher priority poses can't be cut off by lower ones.
const ACT_PRIO = { strike: 1, ult: 2, jump: 2, dash: 3, hit: 3, guard: 3, fuga: 4, getup: 4, intro: 5, domain: 5, down: 9 };
function playAnim(player, name, dur, faceX) {
  const sp = player.character.sprite;
  const acts = sp && sp.actions;
  if (!acts) return;
  const base = name;
  if (sp.pools && sp.pools[name]) name = choice(sp.pools[name]); // atlas sprites: a random variant from the pool
  if (!acts[name] || !acts[name].frames) return;
  const cur = player.act;
  if (cur && cur.t < cur.dur && ACT_PRIO[cur.base] > ACT_PRIO[base]) return;
  player.act = { name, base, t: 0, dur, prio: ACT_PRIO[base] };
  if (faceX !== undefined && faceX !== player.x) player.facing = faceX > player.x ? 1 : -1;
}
function updatePlayerAnim(dt) {
  const a = game.player.act;
  if (!a) return;
  a.t += dt;
  if (a.base === 'domain' && game.domain) a.t = Math.min(a.t, a.dur - 1); // hold the seal pose while the domain stands
  else if (a.base === 'down') a.t = Math.min(a.t, a.dur - 1); // stay on the floor
  else if (a.t >= a.dur) game.player.act = null;
}

function damagePlayer(dmg) {
  const player = game.player;
  if (player.invuln > 0 || player.dead) return;
  if (player.character.parry && Math.random() < player.character.parry) {
    // Guard: the blow is turned aside.
    playAnim(player, 'guard', 360);
    player.invuln = 380;
    spawnText(player.x, player.y - 36, 'GUARD', '#fbbf24', true);
    spawnParticles(player.x, player.y, '#fde68a', 8);
    game.camera.shake = Math.max(game.camera.shake, 4);
    return;
  }
  playAnim(player, 'hit', 300);
  player.hp -= dmg;
  player.invuln = 450;
  game.camera.shake = Math.max(game.camera.shake, 8);
  if (player.hp <= 0 && game.revives > 0) {
    game.revives--;
    player.hp = player.maxHp * 0.5;
    player.invuln = 2500;
    game.camera.shake = 16;
    for (const e of game.enemies) {
      if (!e.dead && dist(e.x, e.y, player.x, player.y) < 320) knockback(e, player.x, player.y, e.isBoss ? 400 : 900);
    }
    burst(player.x, player.y, 320, '#4ade80', 600);
    spawnText(player.x, player.y - 50, '蘇 SECOND WIND', '#4ade80', true);
    playAnim(player, 'getup', 700);
  }
  else if (player.hp <= 0 && player.character.sprite && player.character.sprite.actions && player.character.sprite.actions.down) {
    // Collapse first, then the end screen.
    player.hp = 0; player.dead = true; game.deathT = 1500;
    player.act = null; playAnim(player, 'down', 700);
    heianDeath(player);
    game.camera.shake = 14;
  }
  else if (player.hp <= 0) { player.hp = 0; endGame(); }
  else if (player.hp < player.maxHp * 0.3 && game.time > game.lowHpBarkAt) { playerBark('lowHp'); showPanelOnce('crazy'); game.lowHpBarkAt = game.time + 30000; }
}

/* ===================== Domain Expansion ===================== */
function domainLevel() {
  const w = game.player.weapons.find(x => x.id === 'domainExpansion');
  return w ? w.level : 1;
}

function tryDomainExpansion() {
  if (state !== 'playing' || !game || game.domain) return;
  const player = game.player;
  const w = player.weapons.find(x => x.id === 'domainExpansion');
  if (!w || !player.character.domain) return;
  if (player.energy < player.energyMax) return;
  const info = player.character.domain;
  const lvl = w.level;
  const dur = info.kind === 'void' ? 4200 + lvl * 800 : info.kind === 'shrine' ? 4000 + lvl * 700 : 4800 + lvl * 800;
  game.domain = { kind: info.kind, t: 0, dur, tick: 0, x: player.x, y: player.y };
  playAnim(player, 'domain', 900);
  if (info.kind === 'void') { game.projectiles = game.projectiles.filter(p => p.friendly); game.hazards = []; }
  player.energy = 0;
  game.camera.shake = 24;
  game.domainFlash = 500;
  game.domainColor = info.color;
  spawnText(player.x, player.y - 60, 'DOMAIN EXPANSION: ' + info.name.toUpperCase(), info.color, true);
  playerBark('domain');
  showPanel('domain', 2400);
}

function updateDomain(dt) {
  const d = game.domain;
  if (!d) return;
  const player = game.player;
  const lvl = domainLevel();
  const mult = player.domainDamageMult;
  d.t += dt;
  d.tick -= dt;
  if (d.kind === 'void') {
    // Infinite Void: everything is stunned, and enemy fire is erased.
    for (const e of game.enemies) if (!e.dead && dist(player.x, player.y, e.x, e.y) < 1100) e.stunUntil = Math.max(e.stunUntil, game.time + 200);
    game.projectiles = game.projectiles.filter(p => p.friendly);
    game.hazards = [];
    if (d.tick <= 0) {
      d.tick = 250;
      for (const e of game.enemies) {
        if (!e.dead && dist(player.x, player.y, e.x, e.y) < 1100) damageEnemy(e, (10 + 6 * lvl) * mult, { color: '#e0e7ff' });
      }
    }
  } else if (d.kind === 'shrine') {
    // Malevolent Shrine: relentless Dismantle / Cleave slashes.
    if (d.tick <= 0) {
      d.tick = 90;
      for (let i = 0; i < 2 + lvl; i++) {
        const t = randomEnemyNear(player.x, player.y, 600);
        const ang = rand(0, Math.PI * 2);
        const cx = t ? t.x : player.x + rand(-400, 400), cy = t ? t.y : player.y + rand(-300, 300);
        slash(cx, cy, ang, rand(120, 240), 26, (8 + 4 * lvl) * mult, 0.03, i % 2 ? '#ef4444' : '#fecaca', 150, i % 2 ? 'slashRed' : 'slash');
      }
    }
  } else if (d.kind === 'shadow') {
    // Chimera Shadow Garden: shadows drag curses down.
    const r = 380 + lvl * 40;
    const hit = d.tick <= 0;
    if (hit) d.tick = 300;
    for (const e of game.enemies) {
      if (e.dead || dist(player.x, player.y, e.x, e.y) > r + e.radius) continue;
      e.slowUntil = Math.max(e.slowUntil, game.time + 150);
      if (hit) damageEnemy(e, (9 + 5 * lvl) * mult, { color: '#a5b4fc' });
    }
  }
  if (d.t >= d.dur) game.domain = null;
}

// Malevolent Shrine: the world goes dark and the shrine rises where the domain was cast, then stays put.
function drawDomainBack() {
  const d = game.domain;
  if (!d || d.kind !== 'shrine') return;
  const fade = clamp(Math.min(d.t / 600, (d.dur - d.t) / 500), 0, 1);
  ctx.save();
  ctx.globalAlpha = 0.82 * fade;
  ctx.fillStyle = '#05000a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  if (!FX.shrine.ready) return;
  const [sx, sy] = worldToScreen(d.x, d.y);
  const w = Math.min(canvas.width * 0.95, 1100);
  const h = w * FX.shrine.crop.h / FX.shrine.crop.w;
  ctx.save();
  ctx.globalAlpha = 0.95 * fade;
  drawFx(ctx, 'shrine', sx, sy + 140 - h / 2 + (1 - fade) * 120, w, 0, 1);
  ctx.restore();
}

function drawDomain() {
  const d = game.domain;
  if (!d) return;
  const player = game.player;
  const lvl = domainLevel();
  const fade = clamp(Math.min(d.t / 350, (d.dur - d.t) / 450), 0, 1);
  const [px, py] = worldToScreen(player.x, player.y);
  ctx.save();
  if (d.kind === 'void') {
    ctx.globalAlpha = fade * 0.82;
    ctx.fillStyle = '#04040d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = fade * 0.9;
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? '#e0e7ff' : '#818cf8';
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, rand(1, 3), rand(1, 14));
    }
    ctx.strokeStyle = '#c7d2fe';
    ctx.lineWidth = 2;
    ctx.globalAlpha = fade * 0.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(px, py, 120 + i * 90 + (d.t * 0.05) % 90, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (d.kind === 'shrine') {
    const g = ctx.createRadialGradient(px, py, 60, px, py, Math.max(canvas.width, canvas.height) * 0.7);
    g.addColorStop(0, 'rgba(127,29,29,0.05)');
    g.addColorStop(1, 'rgba(69,10,10,0.75)');
    ctx.globalAlpha = fade;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(248,113,113,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, 600, 0, Math.PI * 2);
    ctx.stroke();
    drawHeianDomain(d, fade);
  } else if (d.kind === 'shadow') {
    const r = 380 + lvl * 40;
    const g = ctx.createRadialGradient(px, py, r * 0.2, px, py, r);
    g.addColorStop(0, 'rgba(2,2,12,0.9)');
    g.addColorStop(0.85, 'rgba(15,10,40,0.85)');
    g.addColorStop(1, 'rgba(99,102,241,0.35)');
    ctx.globalAlpha = fade;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.globalAlpha = fade * 0.7;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(px, py, r * (0.5 + ((d.t * 0.0006 + i * 0.5) % 0.5)), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ===================== Weapon update logic ===================== */
function explodeAt(x, y, ex, color) {
  damageEnemiesInRadius(x, y, ex.r, ex.dmg, { color, big: true, knock: ex.force });
  burst(x, y, ex.r, color, 320);
  if (ex.fx) game.rings.push({ type: 'sprite', visual: true, fx: ex.fx, x, y, size: ex.r * 3, life: 420, t: 0 });
  spawnParticles(x, y, color, 16);
  if (ex.fire) game.zones.push({ type: 'fire', x, y, r: ex.r * 0.8, life: 2500, t: 0, tick: 0, dmg: ex.dmg * 0.12, color });
  game.camera.shake = Math.max(game.camera.shake, 8);
}

function updateWeapons(dt) {
  const player = game.player;
  for (const w of player.weapons) {
    const def = WEAPON_DEFS[w.id];
    const lvl = w.level;
    switch (w.id) {
      case 'cursedBlast': {
        w.cd -= dt;
        if (w.cd <= 0) {
          const target = nearestEnemy(player.x, player.y, 480);
          if (target) {
            const ang = Math.atan2(target.y - player.y, target.x - player.x);
            game.projectiles.push({
              x: player.x, y: player.y, vx: Math.cos(ang) * 430, vy: Math.sin(ang) * 430,
              radius: 6, dmg: (9 + lvl * 4), pierce: lvl - 1, color: def.color,
              friendly: true, life: 1200,
            });
          }
          w.cd = Math.max(140, 620 - lvl * 60) * player.cdrMult;
        }
        break;
      }
      /* ---------- Sukuna ---------- */
      case 'dismantle': {
        w.cd -= dt;
        if (w.cd <= 0) {
          const n = 1 + Math.ceil(lvl / 2);
          for (let i = 0; i < n; i++) {
            const t = randomEnemyNear(player.x, player.y, 400);
            if (!t) break;
            slash(t.x, t.y, rand(0, Math.PI * 2), 110 + lvl * 12, 14, 7 + lvl * 3, 0, def.color, 120, 'slash');
            if (i === 0) heianDismantleFx(t);
            if (i === 0 && !player.moving) playAnim(player, 'strike', 270, t.x);
          }
          w.cd = Math.max(220, 600 - lvl * 60) * player.cdrMult;
        }
        break;
      }
      case 'cleave': {
        w.cd -= dt;
        if (w.cd <= 0) {
          let t = null;
          for (const e of game.enemies) {
            if (e.dead || dist(player.x, player.y, e.x, e.y) > 380) continue;
            if (!t || e.maxHp > t.maxHp) t = e;
          }
          if (t) {
            const ang = Math.atan2(t.y - player.y, t.x - player.x) + Math.PI / 2;
            slash(t.x, t.y, ang, 230 + lvl * 20, 40, 14 + lvl * 6, 0.1 + lvl * 0.03, def.color, 220, 'slashRed');
            if (!player.moving) playAnim(player, 'ult', 420, t.x);
            heianCleaveFx(player, t);
            game.camera.shake = Math.max(game.camera.shake, 4);
            w.cd = Math.max(900, 2600 - lvl * 300) * player.cdrMult;
          }
        }
        break;
      }
      case 'fuga': {
        w.cd -= dt;
        if (w.cd <= 0) {
          const t0 = nearestEnemy(player.x, player.y, 600);
          if (t0) {
            // Wind up through the sheet's Fuga frames, loosing the arrow on the last one.
            const hasPose = !!(player.character.sprite && player.character.sprite.actions && player.character.sprite.actions.fuga);
            const launch = () => {
              const t = nearestEnemy(player.x, player.y, 700) || t0;
              const ang = Math.atan2(t.y - player.y, t.x - player.x);
              game.projectiles.push({
                x: player.x, y: player.y - 8, vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620, radius: 9, dmg: 0, pierce: 0,
                explode: { r: 95 + lvl * 12, dmg: 30 + lvl * 14, force: 250, fire: true, fx: 'redFire' }, arrow: true, color: def.color, friendly: true, life: 1300,
              });
              spawnText(player.x, player.y - 40, 'FUGA', def.color, true);
              showPanelOnce('fuga', 2200);
              game.camera.shake = Math.max(game.camera.shake, 6);
            };
            if (hasPose) {
              playAnim(player, 'fuga', 760, t0.x);
              game.delayed.push({ t: 640, fn: launch });
            } else launch();
            w.cd = Math.max(2800, 6800 - lvl * 700) * player.cdrMult + (hasPose ? 760 : 0);
          }
        }
        break;
      }
      /* ---------- Megumi ---------- */
      case 'divineDog': {
        const count = clamp(1 + lvl, 2, 5);
        w.angle = (w.angle || 0) + dt * 0.0028 * (1 + lvl * 0.05);
        const now = game.time;
        for (let i = 0; i < count; i++) {
          const a = w.angle + (i / count) * Math.PI * 2;
          const radius = 66 + (i % 2) * 18;
          const dx = player.x + Math.cos(a) * radius;
          const dy = player.y + Math.sin(a) * radius;
          if (!w._pos) w._pos = [];
          w._pos[i] = { x: dx, y: dy };
          for (const e of game.enemies) {
            if (e.dead) continue;
            if (dist(dx, dy, e.x, e.y) <= e.radius + 16) {
              const key = i + ':' + e.id;
              const last = w.hitMap.get(key) || 0;
              if (now - last > 340) {
                w.hitMap.set(key, now);
                damageEnemy(e, 6 + lvl * 3, { color: i % 2 ? '#94a3b8' : '#f1f5f9' });
              }
            }
          }
        }
        break;
      }
      case 'toad': {
        w.cd -= dt;
        if (w.cd <= 0) {
          const target = nearestEnemy(player.x, player.y, 330);
          if (target) {
            game.rings.push({
              type: 'line', visual: true, x: player.x, y: player.y, angle: Math.atan2(target.y - player.y, target.x - player.x),
              length: dist(player.x, player.y, target.x, target.y), width: 8, color: '#f472b6', life: 200, t: 0, hit: new Set(),
            });
            damageEnemy(target, 8 + lvl * 4, { color: def.color, stun: 700 + lvl * 120 });
            knockback(target, player.x, player.y, -900);
            w.cd = Math.max(800, 2500 - lvl * 300) * player.cdrMult;
          }
        }
        break;
      }
      case 'nue': {
        w.cd -= dt;
        if (w.cd <= 0) {
          const strikes = lvl >= 3 ? 2 : 1;
          for (let i = 0; i < strikes; i++) {
            const target = (i === 0 ? nearestEnemy(player.x, player.y, 520) : randomEnemyNear(player.x, player.y, 520))
              || { x: player.x + rand(-200, 200), y: player.y + rand(-200, 200) };
            const ang = Math.atan2(target.y - player.y, target.x - player.x);
            game.rings.push({
              type: 'line', x: player.x, y: player.y, angle: ang, length: 360, width: 46,
              dmg: (16 + lvl * 7), color: def.color, life: 450, t: 0, hit: new Set(), stun: 350, sprite: 'nue',
            });
          }
          w.cd = Math.max(650, 2200 - lvl * 260) * player.cdrMult;
        }
        break;
      }
      case 'rabbitEscape': {
        w.cd -= dt;
        if (w.cd <= 0) {
          const t = nearestEnemy(player.x, player.y, 420);
          if (t) {
            game.zones.push({ type: 'rabbits', x: t.x, y: t.y, r: 110 + lvl * 14, life: 2600 + lvl * 300, t: 0, tick: 0, dmg: 2 + lvl, color: def.color, seed: Math.random() * 1000 });
            w.cd = Math.max(2800, 7000 - lvl * 800) * player.cdrMult;
          }
        }
        break;
      }
      case 'maxElephant': {
        w.cd -= dt;
        if (w.cd <= 0) {
          const t = nearestEnemy(player.x, player.y, 420);
          const x = t ? t.x : player.x + (player.facing || 1) * 160, y = t ? t.y : player.y;
          game.zones.push({ type: 'water', x, y, r: 130 + lvl * 18, life: 2600 + lvl * 300, t: 0, tick: 0, dmg: 4 + lvl * 2, color: def.color });
          burst(x, y, 130 + lvl * 18, def.color, 350);
          w.cd = Math.max(3200, 7500 - lvl * 800) * player.cdrMult;
        }
        break;
      }
      case 'roundDeer': {
        w.cd -= dt;
        if (w.cd <= 0) {
          const heal = 5 + lvl * 3;
          if (player.hp < player.maxHp) {
            player.hp = Math.min(player.maxHp, player.hp + heal);
            spawnText(player.x, player.y - 40, '+' + heal + ' HP', '#86efac', true);
            burst(player.x, player.y, 80, def.color, 400);
          }
          w.cd = Math.max(3500, 9000 - lvl * 1000) * player.cdrMult;
        }
        break;
      }
      case 'mahoraga': {
        if (game.time < w.until) {
          w.swing -= dt;
          if (w.swing <= 0) {
            const adapt = 1 + ((game.time - w.start) / 1000) * 0.2;
            damageEnemiesInRadius(player.x, player.y, 150, (16 + lvl * 7) * adapt, { color: def.color, knock: 180 });
            burst(player.x, player.y, 150, def.color, 180);
            w.swing = 550;
          }
        } else {
          w.cd -= dt;
          if (w.cd <= 0) {
            w.start = game.time;
            w.until = game.time + 6000 + lvl * 1000;
            w.swing = 0;
            w.cd = Math.max(8000, 20000 - lvl * 2200) * player.cdrMult;
            spawnText(player.x, player.y - 70, 'DIVERGENT SILA DIVINE GENERAL', def.color, true);
            showPanelOnce('mahoraga', 2600);
            game.camera.shake = Math.max(game.camera.shake, 10);
          }
        }
        break;
      }
      /* ---------- Gojo ---------- */
      case 'infinity': {
        const R = 55 + lvl * 14;
        if (game.time < w.downUntil) {
          player.barrier = 0;
          w.charge = Math.min(100, w.charge + dt * 0.012);
          if (game.time + dt >= w.downUntil) w.charge = 60;
        } else {
          let pressing = 0;
          for (const e of game.enemies) if (!e.dead && dist(player.x, player.y, e.x, e.y) < R + e.radius + 25) pressing++;
          w.charge = clamp(w.charge - pressing * dt * 0.005 * (1.25 - lvl * 0.12) + (pressing ? 0 : dt * 0.008), 0, 100);
          player.barrier = R;
          if (w.charge <= 0) {
            w.downUntil = game.time + 2500;
            player.barrier = 0;
            spawnText(player.x, player.y - 50, 'INFINITY BROKEN', '#f87171', true);
          }
        }
        player.infinityCharge = w.charge;
        break;
      }
      case 'blue': {
        w.cd -= dt;
        if (w.cd <= 0) {
          const t = nearestEnemy(player.x, player.y, 500);
          const x = t ? t.x : player.x + (player.facing || 1) * 180, y = t ? t.y : player.y;
          game.zones.push({ type: 'blue', x, y, r: 130 + lvl * 14, life: 1800, t: 0, tick: 0, dmg: 5 + lvl * 3, color: def.color });
          spawnText(x, y - 30, 'BLUE', def.color, true);
          w.cd = Math.max(2000, 5000 - lvl * 500) * player.cdrMult;
        }
        break;
      }
      case 'red': {
        w.cd -= dt;
        if (w.cd <= 0) {
          const t = nearestEnemy(player.x, player.y, 560);
          if (t) {
            const ang = Math.atan2(t.y - player.y, t.x - player.x);
            game.projectiles.push({
              x: player.x, y: player.y, vx: Math.cos(ang) * 400, vy: Math.sin(ang) * 400, radius: 12, dmg: 0, pierce: 0,
              explode: { r: 105 + lvl * 14, dmg: 24 + lvl * 11, force: 750, fx: 'red' }, fx: 'red', color: def.color, friendly: true, life: 1500,
            });
            spawnText(player.x, player.y - 40, 'RED', def.color, true);
            w.cd = Math.max(2400, 6200 - lvl * 650) * player.cdrMult;
          }
        }
        break;
      }
      case 'purple': {
        w.cd -= dt;
        if (w.cd <= 0) {
          const t = nearestEnemy(player.x, player.y, 700);
          const ang = t ? Math.atan2(t.y - player.y, t.x - player.x) : ((player.facing || 1) > 0 ? 0 : Math.PI);
          game.projectiles.push({
            x: player.x, y: player.y, vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520, radius: 42 + lvl * 6, dmg: 70 + lvl * 35,
            pierce: 9999, purple: true, color: def.color, friendly: true, life: 1500,
          });
          spawnText(player.x, player.y - 50, 'HOLLOW PURPLE', '#d8b4fe', true);
          showPanelOnce('crazy');
          game.camera.shake = Math.max(game.camera.shake, 12);
          w.cd = Math.max(4500, 11000 - lvl * 1400) * player.cdrMult;
        }
        break;
      }
      case 'domainExpansion': {
        if (!game.domain) player.energy = Math.min(player.energyMax, player.energy + dt * 0.012 * player.energyRegenMult);
        break;
      }
    }
  }
}

function updateDelayed(dt) {
  for (const d of game.delayed) d.t -= dt;
  const due = game.delayed.filter(d => d.t <= 0);
  game.delayed = game.delayed.filter(d => d.t > 0);
  due.forEach(d => d.fn());
}

function updateZones(dt) {
  for (const z of game.zones) {
    z.t += dt;
    z.tick -= dt;
    const tick = z.tick <= 0;
    if (tick) z.tick = z.type === 'blue' ? 180 : 250;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const d = dist(z.x, z.y, e.x, e.y);
      if (d > z.r + e.radius) continue;
      if (z.type === 'blue') {
        const pull = e.isBoss ? 70 : 340;
        e.x += (z.x - e.x) / (d || 1) * pull * (dt / 1000);
        e.y += (z.y - e.y) / (d || 1) * pull * (dt / 1000);
      } else if (z.type === 'rabbits') {
        if (!e.isBoss) e.stunUntil = Math.max(e.stunUntil, game.time + 200);
        e.slowUntil = Math.max(e.slowUntil, game.time + 150);
      } else if (z.type === 'water') {
        e.slowUntil = Math.max(e.slowUntil, game.time + 150);
      }
      if (tick) damageEnemy(e, z.dmg, { color: z.color });
    }
  }
  game.zones = game.zones.filter(z => z.t < z.life);
}

/* ===================== Main update ===================== */
const MAP_SCALE = 3;

/* ===================== Building collision ===================== */
// House footprints in map-image pixels (house7_0.gif, 250x189). The map is mirrored
// 2x2 into a super-tile and repeated, so every footprint is mirrored and tiled too.
const BUILDING_RECTS = [
  { x1: 29, y1: 0, x2: 113, y2: 42 },    // top house
  { x1: 130, y1: 73, x2: 250, y2: 172 }, // big house
];
const MAP_W = 250 * MAP_SCALE, MAP_H = 189 * MAP_SCALE;
const PLAYER_HIT = { dy: 12, r: 11 }; // collision circle sits around the feet

const buildingTileRects = [];
for (const b of BUILDING_RECTS) {
  for (const mx of [false, true]) {
    for (const my of [false, true]) {
      const xs = [b.x1 * MAP_SCALE, b.x2 * MAP_SCALE], ys = [b.y1 * MAP_SCALE, b.y2 * MAP_SCALE];
      const x1 = mx ? 2 * MAP_W - xs[1] : xs[0], x2 = mx ? 2 * MAP_W - xs[0] : xs[1];
      const y1 = my ? 2 * MAP_H - ys[1] : ys[0], y2 = my ? 2 * MAP_H - ys[0] : ys[1];
      buildingTileRects.push({ x1, y1, x2, y2 });
    }
  }
}

function pushOutOfBuildings(ent, dyOff = PLAYER_HIT.dy, r = PLAYER_HIT.r) {
  if (game.shibuya) { pushOutOfLevel(ent, dyOff, r); return; }
  const tw = MAP_W * 2, th = MAP_H * 2;
  const cx0 = ent.x, cy0 = ent.y + dyOff;
  const bx = Math.floor(cx0 / tw), by = Math.floor(cy0 / th);
  for (let pass = 0; pass < 2; pass++) {
    for (let ox = bx - 1; ox <= bx + 1; ox++) {
      for (let oy = by - 1; oy <= by + 1; oy++) {
        for (const t of buildingTileRects) {
          const x1 = t.x1 + ox * tw, x2 = t.x2 + ox * tw, y1 = t.y1 + oy * th, y2 = t.y2 + oy * th;
          const cx = ent.x, cy = ent.y + dyOff;
          const nx = clamp(cx, x1, x2), ny = clamp(cy, y1, y2);
          const ddx = cx - nx, ddy = cy - ny;
          const d2 = ddx * ddx + ddy * ddy;
          if (d2 >= r * r) continue;
          if (d2 > 0.0001) {
            const d = Math.sqrt(d2);
            ent.x += ddx / d * (r - d);
            ent.y += ddy / d * (r - d);
          } else {
            // centre is inside the rect: exit through the nearest side
            const l = cx - x1, rt = x2 - cx, tp = cy - y1, bt = y2 - cy;
            const m = Math.min(l, rt, tp, bt);
            if (m === l) ent.x = x1 - r; else if (m === rt) ent.x = x2 + r;
            else if (m === tp) ent.y = y1 - r - dyOff; else ent.y = y2 + r - dyOff;
          }
        }
      }
    }
  }
}

function updatePlayerMovement(dt) {
  const player = game.player;
  let dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
  player.animTime = (player.animTime || 0) + Math.max(0, dt) / 1000;
  player.moving = !!(dx || dy);
  if (updatePlayerDash(dt)) {
    // the dash is moving the player this frame
  } else if (dx || dy) {
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    player.facing = dx >= 0 ? 1 : -1;
    const castSlow = player.act && player.act.name === 'fuga' ? 0.35 : player.act && player.act.name === 'domain' ? 0.45 : 1;
    const spd = player.speed * castSlow * (player.slowUntil > game.time ? 0.55 : 1) * (player.character.prestige && game.domain ? 1.25 : 1);
    player.x += dx * spd * (dt / 1000);
    player.y += dy * spd * (dt / 1000);
    pushOutOfBuildings(player);
  }
  if (player.invuln > 0) player.invuln -= dt;
  if (player.regen > 0) player.hp = Math.min(player.maxHp, player.hp + player.regen * (dt / 1000));
}

function updateProjectiles(dt) {
  for (const p of game.projectiles) {
    p.x += p.vx * (dt / 1000);
    p.y += p.vy * (dt / 1000);
    p.life -= dt;
    if (game.shibuya && !(p.friendly && p.pierce > 0) && shBlockedAt(p.x, p.y)) { p.life = 0; continue; }
    if (p.friendly) {
      for (const e of game.enemies) {
        if (e.dead || p.hitSet && p.hitSet.has(e.id)) continue;
        if (dist(p.x, p.y, e.x, e.y) <= p.radius + e.radius) {
          if (p.explode) explodeAt(p.x, p.y, p.explode, p.color);
          else damageEnemy(e, p.dmg, { color: p.color, slow: p.slow, big: p.purple });
          if (!p.hitSet) p.hitSet = new Set();
          p.hitSet.add(e.id);
          if (p.pierce > 0) p.pierce -= 1; else p.life = 0;
          if (p.life <= 0) break;
        }
      }
    } else {
      const player = game.player;
      if (dist(p.x, p.y, player.x, player.y) <= p.radius + 14) { damagePlayer(p.dmg); p.life = 0; }
    }
  }
  game.projectiles = game.projectiles.filter(p => p.life > 0);
}

function updateRings(dt) {
  for (const r of game.rings) {
    r.t += dt;
    if (r.visual) {
      if (r.type === 'ring') r.radius = (r.t / r.life) * r.maxRadius;
      continue;
    }
    if (r.type === 'ring') {
      r.radius = (r.t / r.life) * r.maxRadius;
      for (const e of game.enemies) {
        if (e.dead || r.hit.has(e.id)) continue;
        const d = dist(r.x, r.y, e.x, e.y);
        if (Math.abs(d - r.radius) <= 26) {
          damageEnemy(e, r.dmg, { color: r.color, slow: r.slow });
          r.hit.add(e.id);
        }
      }
    } else if (r.type === 'line') {
      const ex = r.x + Math.cos(r.angle) * r.length;
      const ey = r.y + Math.sin(r.angle) * r.length;
      for (const e of game.enemies) {
        if (e.dead || r.hit.has(e.id)) continue;
        const t2 = clamp(((e.x - r.x) * (ex - r.x) + (e.y - r.y) * (ey - r.y)) / (r.length * r.length), 0, 1);
        const px = r.x + (ex - r.x) * t2, py = r.y + (ey - r.y) * t2;
        if (dist(px, py, e.x, e.y) <= r.width / 2 + e.radius) {
          const extra = r.pct ? Math.min(e.maxHp * r.pct * (e.isBoss ? 0.3 : 1), 250) : 0;
          damageEnemy(e, r.dmg + extra, { color: r.color, stun: r.stun });
          r.hit.add(e.id);
        }
      }
    }
  }
  game.rings = game.rings.filter(r => r.t < r.life);
}

function updateOrbs(dt) {
  const player = game.player;
  for (const o of game.orbs) {
    const d = dist(player.x, player.y, o.x, o.y);
    if (d < player.pickupRadius) {
      const pull = clamp(1 - d / player.pickupRadius, 0.15, 1) * 620;
      o.x += (player.x - o.x) / (d || 1) * pull * (dt / 1000);
      o.y += (player.y - o.y) / (d || 1) * pull * (dt / 1000);
    }
    if (d < 16) { gainXp(o.value); o.collected = true; }
  }
  for (const o of game.orbs) pushOutOfBuildings(o, 0, 6);
  game.orbs = game.orbs.filter(o => !o.collected);
}

function updateParticlesAndTexts(dt) {
  for (const p of game.particles) { p.t += dt; p.x += p.vx * (dt / 1000); p.y += p.vy * (dt / 1000); p.vx *= 0.92; p.vy *= 0.92; }
  game.particles = game.particles.filter(p => p.t < p.life);
  for (const t of game.texts) { t.t += dt; t.y -= 24 * (dt / 1000); }
  game.texts = game.texts.filter(t => t.t < t.life);
  if (game.camera.shake > 0) game.camera.shake = Math.max(0, game.camera.shake - dt * 0.05);
  if (game.domainFlash > 0) game.domainFlash -= dt;
}

function update(dt) {
  game.time += dt;
  if (game.player.dead) {
    // Defeat: the world freezes while the sorcerer collapses, then the end screen.
    updatePlayerAnim(dt); updateHeianFx(dt); updateParticlesAndTexts(dt);
    game.deathT -= dt;
    if (game.deathT <= 0) endGame();
    return;
  }
  if (game.shibuya && game.shibuya.trans) {
    // changing floors: everything holds still while the screen fades
    updateTransition(dt);
    game.camera.x = game.player.x; game.camera.y = game.player.y; shClampCamera();
    return;
  }
  updatePlayerMovement(dt);
  updateWeapons(dt);
  updatePlayerAnim(dt);
  updateDelayed(dt);
  updateZones(dt);
  updateDomain(dt);
  if (game.shibuya) shibuyaSpawning(dt); else updateSpawning(dt);
  updateEnemies(dt);
  updateHazards(dt);
  updateProjectiles(dt);
  updateRings(dt);
  updateOrbs(dt);
  updateParticlesAndTexts(dt);
  updateHeianFx(dt);
  updateBarks(dt);
  updateCompanion();
  game.camera.x = game.player.x;
  game.camera.y = game.player.y;
  if (game.shibuya) { updateShibuya(dt); shClampCamera(); }
}

/* ===================== Rendering ===================== */
function worldToScreen(x, y) {
  const shakeX = game.camera.shake ? rand(-game.camera.shake, game.camera.shake) : 0;
  const shakeY = game.camera.shake ? rand(-game.camera.shake, game.camera.shake) : 0;
  return [x - game.camera.x + canvas.width / 2 + shakeX, y - game.camera.y + canvas.height / 2 + shakeY];
}

// The map image is one screen of scenery, so it is mirrored 2x2 into a super-tile
// whose edges match on every side, then repeated to fill the endless world.
let mapTile = null;
{
  const img = new Image();
  img.onload = () => {
    const w = img.width * MAP_SCALE, h = img.height * MAP_SCALE;
    const cv = document.createElement('canvas');
    cv.width = w * 2; cv.height = h * 2;
    const c2 = cv.getContext('2d');
    c2.imageSmoothingEnabled = false;
    for (let ix = 0; ix < 2; ix++) {
      for (let iy = 0; iy < 2; iy++) {
        c2.save();
        c2.translate(ix * w + (ix ? w : 0), iy * h + (iy ? h : 0));
        c2.scale(ix ? -1 : 1, iy ? -1 : 1);
        c2.drawImage(img, 0, 0, w, h);
        c2.restore();
      }
    }
    mapTile = cv;
  };
  img.src = 'assets/maps/house_map.gif';
}

function drawBackground() {
  if (game.shibuya) { drawLevelBackground(); return; }
  ctx.fillStyle = '#07070f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (mapTile) {
    const tw = mapTile.width, th = mapTile.height;
    const [ox, oy] = worldToScreen(0, 0);
    const startX = ((ox % tw) + tw) % tw - tw;
    const startY = ((oy % th) + th) % th - th;
    for (let x = startX; x < canvas.width; x += tw)
      for (let y = startY; y < canvas.height; y += th)
        ctx.drawImage(mapTile, Math.round(x), Math.round(y));
    ctx.fillStyle = 'rgba(8,6,24,0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const grid = 64;
  ctx.strokeStyle = 'rgba(120,100,200,0.07)';
  ctx.lineWidth = 1;
  const offX = -((game.camera.x) % grid);
  const offY = -((game.camera.y) % grid);
  ctx.beginPath();
  for (let x = offX; x < canvas.width; x += grid) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
  for (let y = offY; y < canvas.height; y += grid) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
  ctx.stroke();
}

function drawPlayer() {
  const player = game.player;
  const [sx, sy] = worldToScreen(player.x, player.y);
  const spr = player.character.sprite;
  ctx.save();
  if (spr && spr.ready) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 20, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (player.invuln > 0 && Math.floor(player.invuln / 80) % 2) ctx.globalAlpha = 0.5;
    const act = player.act;
    const actDef = act && spr.actions && spr.actions[act.name];
    // Light poses (strike / Cleave) only show while standing; hit, Fuga and domain always play.
    if (actDef && actDef.frames && (act.prio >= 3 || !player.moving)) {
      const idx = Math.min(actDef.frames.length - 1, Math.floor(act.t / act.dur * actDef.frames.length));
      const lift = act.base === 'jump' ? Math.sin(act.t / act.dur * Math.PI) * 18 : 0; // leaping strike
      drawSpriteFrame(ctx, spr, act.name, (idx + 0.5) / actDef.fps, sx, sy + 22 - lift, player.facing || 1, 60);
    } else {
      const run = player.moving && game.domain && spr.actions && spr.actions.rush; // sprint while the Domain stands
      drawSpriteFrame(ctx, spr, player.moving ? (run ? 'rush' : 'walk') : 'idle', player.animTime || 0, sx, sy + 22, player.facing || 1, 60);
    }
  } else {
    ctx.shadowColor = player.character.color;
    ctx.shadowBlur = player.invuln > 0 ? 26 : 14;
    ctx.fillStyle = player.character.color;
    ctx.beginPath();
    ctx.arc(sx, sy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 16, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  if (player.barrier) {
    const charge = clamp((player.infinityCharge ?? 100) / 100, 0, 1);
    ctx.save();
    ctx.strokeStyle = charge < 0.3 ? '#f87171' : '#7dd3fc';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 14;
    ctx.globalAlpha = 0.2 + charge * 0.4;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -game.time * 0.02;
    ctx.beginPath();
    ctx.arc(sx, sy, player.barrier, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const maho = player.weapons.find(w => w.id === 'mahoraga');
  if (maho && game.time < maho.until) {
    const adapt = 1 + ((game.time - maho.start) / 1000) * 0.2;
    const mg = megumiChar();
    if (mg.sprite.ready) {
      const fade = clamp(Math.min((game.time - maho.start) / 300, (maho.until - game.time) / 400), 0, 1);
      const side = -(player.facing || 1);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(sx + side * 52, sy + 24, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
      drawThing(ctx, mg, 'mahoraga', 0, sx + side * 52, sy + 26 + Math.sin(game.time * 0.004) * 2, 1, 104);
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ADAPT x' + adapt.toFixed(1), sx + side * 52, sy - 88);
      ctx.restore();
    } else {
    ctx.save();
    ctx.translate(sx, sy - 78);
    ctx.rotate(game.time * 0.0015 * adapt);
    ctx.strokeStyle = '#fde68a';
    ctx.shadowColor = '#fde68a';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
      ctx.lineTo(Math.cos(a) * 28, Math.sin(a) * 28);
    }
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ADAPT x' + adapt.toFixed(1), sx, sy - 44);
    ctx.restore();
    }
  }

  const dog = player.weapons.find(w => w.id === 'divineDog');
  if (dog && dog._pos) {
    dog._pos.forEach((pos, i) => {
      const [dx2, dy2] = worldToScreen(pos.x, pos.y);
      const a = dog.angle + (i / dog._pos.length) * Math.PI * 2;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(dx2, dy2 + 15, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
      if (drawThing(ctx, megumiChar(), 'wolves', i % 2, dx2, dy2 + 16, -Math.sin(a) >= 0 ? 1 : -1, 36)) { ctx.restore(); return; }
      ctx.fillStyle = i % 2 ? '#1e293b' : '#f8fafc';
      ctx.shadowColor = i % 2 ? '#818cf8' : '#f8fafc';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(dx2, dy2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}

function drawProjectiles() {
  for (const p of game.projectiles) {
    const [sx, sy] = worldToScreen(p.x, p.y);
    ctx.save();
    if (p.fx && FX[p.fx].ready) {
      drawFx(ctx, p.fx, sx, sy, 78 + Math.sin(game.time * 0.02) * 6, game.time * 0.004, 1);
      ctx.restore();
      continue;
    }
    if (p.arrow) {
      if (heianOrb(p, sx, sy)) { ctx.restore(); continue; }
      // Fuga: a flaming arrow streaking along its path.
      const a = Math.atan2(p.vy, p.vx);
      ctx.translate(sx, sy);
      ctx.rotate(a);
      const g = ctx.createLinearGradient(-70, 0, 14, 0);
      g.addColorStop(0, 'rgba(249,115,22,0)');
      g.addColorStop(0.7, 'rgba(251,146,60,0.85)');
      g.addColorStop(1, '#fff7ed');
      ctx.fillStyle = g;
      ctx.shadowColor = '#fb923c';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(18, 0); ctx.lineTo(-4, -7); ctx.lineTo(-70, 0); ctx.lineTo(-4, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      continue;
    }
    if (p.purple) {
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.radius);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.4, '#d8b4fe');
      g.addColorStop(1, 'rgba(168,85,247,0.2)');
      ctx.fillStyle = g;
      ctx.shadowBlur = 30;
    } else if (!p.friendly) {
      ctx.fillStyle = '#12060c';
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.radius + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      continue;
    } else {
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
    }
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawRings() {
  for (const r of game.rings) {
    if (r.type === 'sprite') {
      const [sx, sy] = worldToScreen(r.x, r.y);
      const p = clamp(r.t / r.life, 0, 1);
      ctx.save();
      drawFx(ctx, r.fx, sx, sy, r.size * (0.35 + 0.65 * Math.sqrt(p)), r.t * 0.002, (1 - p) * (1 - p));
      ctx.restore();
      continue;
    }
    if (r.fx && r.type === 'line' && FX[r.fx].ready) {
      // Slash art: pops in, holds, fades. Centred on the slash, aligned to its angle.
      const p = clamp(r.t / r.life, 0, 1);
      const mx = r.x + Math.cos(r.angle) * r.length / 2, my = r.y + Math.sin(r.angle) * r.length / 2;
      const [sx, sy] = worldToScreen(mx, my);
      ctx.save();
      ctx.shadowColor = r.fx === 'slashRed' ? '#ef4444' : '#fca5a5';
      ctx.shadowBlur = 14;
      const pop = 0.7 + 0.3 * Math.min(1, p * 4);
      drawFx(ctx, r.fx, sx, sy, r.length * 1.35 * pop, r.angle * 0.6 + (r.spin || 1) * p * 0.25, Math.min(1, (1 - p) * 1.6));
      ctx.restore();
      continue;
    }
    ctx.save();
    ctx.strokeStyle = r.color;
    ctx.shadowColor = r.color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = r.type === 'ring' ? 5 : (r.width || 8);
    ctx.globalAlpha = clamp(1 - r.t / r.life, 0, 1);
    if (r.sprite && r.type === 'line' && megumiChar().sprite.ready) {
      const p = clamp(r.t / (r.life * 0.75), 0, 1);
      const bx = r.x + Math.cos(r.angle) * r.length * p;
      const by = r.y + Math.sin(r.angle) * r.length * p;
      const [sx, sy] = worldToScreen(r.x, r.y);
      const [sx2, sy2] = worldToScreen(bx, by);
      ctx.globalAlpha *= 0.55;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx2, sy2); ctx.stroke();
      ctx.globalAlpha = clamp(1 - (r.t / r.life - 0.7) / 0.3, 0, 1);
      ctx.shadowBlur = 0;
      drawThing(ctx, megumiChar(), r.sprite, 0, sx2, sy2, Math.cos(r.angle) >= 0 ? 1 : -1, 60, true);
      ctx.restore();
      continue;
    }
    if (r.type === 'ring') {
      const [sx, sy] = worldToScreen(r.x, r.y);
      ctx.beginPath();
      ctx.arc(sx, sy, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const [sx, sy] = worldToScreen(r.x, r.y);
      const ex = r.x + Math.cos(r.angle) * r.length;
      const ey = r.y + Math.sin(r.angle) * r.length;
      const [sx2, sy2] = worldToScreen(ex, ey);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawZones() {
  for (const z of game.zones) {
    const [sx, sy] = worldToScreen(z.x, z.y);
    const fade = clamp(Math.min(z.t / 200, (z.life - z.t) / 300), 0, 1);
    ctx.save();
    ctx.globalAlpha = fade;
    if (z.type === 'blue') {
      ctx.strokeStyle = z.color;
      ctx.shadowColor = z.color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(sx, sy, z.r * (1 - ((z.t * 0.0012 + i / 3) % 1)), 0, Math.PI * 2);
        ctx.stroke();
      }
      const pulse = 1 + Math.sin(z.t * 0.012) * 0.06;
      if (!drawFx(ctx, 'blue', sx, sy, 78 * pulse, z.t * 0.004, 1)) {
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(sx, sy, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (z.type === 'rabbits') {
      ctx.strokeStyle = 'rgba(251,207,232,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(sx, sy, z.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const mg = megumiChar();
      const N = 9;
      for (let i = 0; i < N; i++) {
        const dir = i % 2 ? 1 : -1;
        const a = z.seed + i * 2.4 + z.t * 0.0007 * dir;
        const rad = z.r * (0.25 + 0.65 * (((i * 0.37) % 1) || 0.5));
        const bx = sx + Math.cos(a) * rad, by = sy + Math.sin(a) * rad * 0.8;
        const hop = Math.abs(Math.sin((z.t + i * 137) * 0.011)) * 9;
        const facing = -Math.sin(a) * dir >= 0 ? 1 : -1;
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(bx, by + 1, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
        if (!drawThing(ctx, mg, 'rabbits', 2 + (Math.floor(z.t / 120) + i) % 4, bx, by - hop, facing, 26)) {
          ctx.fillStyle = '#fbcfe8';
          ctx.beginPath(); ctx.arc(bx, by - hop - 6, 6, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else {
      const fire = z.type === 'fire';
      ctx.fillStyle = fire ? 'rgba(249,115,22,0.22)' : 'rgba(56,189,248,0.18)';
      ctx.strokeStyle = fire ? 'rgba(251,146,60,0.7)' : 'rgba(125,211,252,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, z.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (z.type === 'water') {
        const drop = (1 - clamp(z.t / 350, 0, 1)) * 70;
        drawThing(ctx, megumiChar(), 'elephant', 0, sx, sy + 24 - drop, 1, 92);
      }
    }
    ctx.restore();
  }
}

function drawOrbs() {
  for (const o of game.orbs) {
    const [sx, sy] = worldToScreen(o.x, o.y);
    ctx.save();
    ctx.fillStyle = '#c4b5fd';
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 6); ctx.lineTo(sx + 6, sy); ctx.lineTo(sx, sy + 6); ctx.lineTo(sx - 6, sy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawParticlesAndTexts() {
  for (const p of game.particles) {
    const [sx, sy] = worldToScreen(p.x, p.y);
    ctx.save();
    ctx.globalAlpha = clamp(1 - p.t / p.life, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const t of game.texts) {
    const [sx, sy] = worldToScreen(t.x, t.y);
    ctx.save();
    ctx.globalAlpha = clamp(1 - t.t / t.life, 0, 1);
    ctx.fillStyle = t.color;
    ctx.font = t.big ? 'bold 20px sans-serif' : 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t.str, sx, sy);
    ctx.restore();
  }
}

function render() {
  drawBackground();
  if (game.shibuya) drawLevelFx();
  drawDomainBack();
  drawZones();
  drawRings();
  drawHazards();
  drawOrbs();
  drawEnemies();
  drawHeianFx();
  drawProjectiles();
  drawPlayer();
  drawDomain();
  drawParticlesAndTexts();
  if (game.domainFlash > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(game.domainFlash / 500, 0, 1) * 0.5;
    ctx.fillStyle = game.domainColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  if (game.shibuya) drawLevelOverlay();
}

/* ===================== HUD ===================== */
function updateHud() {
  const player = game.player;
  el.hpFill.style.width = `${clamp(player.hp / player.maxHp, 0, 1) * 100}%`;
  el.hpLabel.textContent = `${Math.ceil(player.hp)}/${Math.round(player.maxHp)}`;
  el.xpFill.style.width = `${clamp(player.xp / player.xpToNext, 0, 1) * 100}%`;
  el.lvlBadge.textContent = `Lv.${player.level}`;
  el.timer.textContent = fmtTime(game.time);
  el.killCount.textContent = `Curses Exorcised: ${game.kills}`;
  updateDashHud();
  if (game.shibuya) updateLevelHud();
  const boss = game.enemies.find(e => e.isBoss && !e.dead);
  el.bossBar.classList.toggle('hidden', !boss);
  if (boss) {
    el.bossName.textContent = boss.name;
    el.bossFill.style.width = `${clamp(boss.hp / boss.maxHp, 0, 1) * 100}%`;
  }
  if (player.domainOwned) {
    el.energyRow.classList.remove('hidden');
    const dname = player.character.domain ? player.character.domain.name.toUpperCase() : 'DOMAIN EXPANSION';
    if (game.domain) {
      const left = 1 - game.domain.t / game.domain.dur;
      el.energyFill.style.width = `${clamp(left, 0, 1) * 100}%`;
      el.energyFill.parentElement.classList.remove('ready');
      el.energyLabel.textContent = `${dname} — ${Math.ceil(left * game.domain.dur / 1000)}s`;
    } else {
      const pct = clamp(player.energy / player.energyMax, 0, 1);
      el.energyFill.style.width = `${pct * 100}%`;
      const ready = pct >= 1;
      el.energyFill.parentElement.classList.toggle('ready', ready);
      el.energyLabel.textContent = ready ? `${dname} READY — SPACE` : dname;
    }
  } else {
    el.energyRow.classList.add('hidden');
  }
}

/* ===================== Loop ===================== */
function loop(ts) {
  if (state !== 'playing') return;
  let dt = ts - game.lastTs;
  game.lastTs = ts;
  dt = Math.min(dt, 50);
  update(dt);
  render();
  updateHud();
  requestAnimationFrame(loop);
}

showMenu();
