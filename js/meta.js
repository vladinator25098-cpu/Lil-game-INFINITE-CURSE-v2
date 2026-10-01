'use strict';
// Meta-progression: Cursed Shards are earned at the end of every run and spent on permanent upgrades.
// Saved in localStorage under `ic_meta`. Add a row to META_DEFS and read it with metaLevel(id).

const META_DEFS = {
  vitality:   { name: 'Vitality',        kanji: '命', max: 5, cost: (l) => 40 + l * 35,  desc: (l) => `+10 Max HP per level. (now +${l * 10})` },
  might:      { name: 'Cursed Might',    kanji: '力', max: 5, cost: (l) => 60 + l * 50,  desc: (l) => `+5% damage per level. (now +${l * 5}%)` },
  haste:      { name: 'Quick Feet',      kanji: '速', max: 4, cost: (l) => 50 + l * 40,  desc: (l) => `+3% move speed per level. (now +${l * 3}%)` },
  insight:    { name: 'Sharp Instinct',  kanji: '眼', max: 5, cost: (l) => 50 + l * 40,  desc: (l) => `+8% XP gain per level. (now +${l * 8}%)` },
  recovery:   { name: 'Quiet Recovery',  kanji: '癒', max: 4, cost: (l) => 70 + l * 60,  desc: (l) => `+0.3 HP/sec regeneration per level. (now +${(l * 0.3).toFixed(1)})` },
  secondWind: { name: 'Second Wind',     kanji: '蘇', max: 1, cost: () => 400,           desc: () => 'Once per run, survive a killing blow: refill half your HP and blast nearby curses away.' },
};

let META = { shards: 0, lvl: {}, wins: 0, seen: {}, prestige: {}, form: {}, charWins: {} };
try {
  const raw = JSON.parse(localStorage.getItem('ic_meta') || 'null');
  if (raw && typeof raw === 'object') META = { shards: raw.shards | 0, lvl: raw.lvl || {}, wins: raw.wins | 0, seen: raw.seen || {}, prestige: raw.prestige || {}, form: raw.form || {}, charWins: raw.charWins || {} };
} catch (e) { /* private mode or corrupt save: start fresh */ }

function saveMeta() { try { localStorage.setItem('ic_meta', JSON.stringify(META)); } catch (e) { /* ignore */ } }
const metaLevel = (id) => META.lvl[id] || 0;

// Prestige: win a run with a sorcerer, then pay shards on the menu to evolve them into their prestige form.
const prestigeRank = (id) => META.prestige[id] || 0;
function activeCharacter(base) {
  const f = PRESTIGE[base.id];
  return f && prestigeRank(base.id) >= 1 && META.form[base.id] !== 'base' ? f : base;
}

// Shards for a finished run: time, kills, bosses beaten, plus a bonus for winning.
function calcShards(g, won) {
  const mins = g.time / 60000;
  return Math.floor((mins * 12 + g.kills / 12 + (g.bossesDown || 0) * 40 + (won ? 150 : 0)) * (RUN_MODS.shards || 1));
}

function buyMeta(id) {
  const d = META_DEFS[id], l = metaLevel(id);
  if (l >= d.max) return;
  const c = d.cost(l);
  if (META.shards < c) return;
  META.shards -= c;
  META.lvl[id] = l + 1;
  saveMeta();
  renderShop();
}

function renderShop() {
  const grid = document.getElementById('shopGrid');
  document.getElementById('shopShards').textContent = META.shards;
  grid.innerHTML = '';
  for (const id of Object.keys(META_DEFS)) {
    const d = META_DEFS[id], l = metaLevel(id), maxed = l >= d.max;
    const cost = maxed ? 0 : d.cost(l);
    const card = document.createElement('div');
    card.className = 'up-card shop-card' + (maxed ? ' maxed' : META.shards < cost ? ' poor' : '');
    card.style.setProperty('--c', '#fca5a5');
    card.innerHTML = `
      <div class="cc-kanji">${d.kanji}</div>
      <span class="up-tag">LV ${l} / ${d.max}</span>
      <div class="card-name">${d.name}</div>
      <div class="card-desc">${d.desc(l)}</div>
      <div class="shop-cost">${maxed ? 'MAXED' : `◆ ${cost}`}</div>`;
    if (!maxed) card.addEventListener('click', () => buyMeta(id));
    grid.appendChild(card);
  }
}

function openShop() {
  if (state !== 'menu') return;
  state = 'shop';
  renderShop();
  document.getElementById('shop-overlay').classList.remove('hidden');
}
function closeShop() {
  if (state !== 'shop') return;
  state = 'menu';
  document.getElementById('shop-overlay').classList.add('hidden');
  el.menuBest.textContent = bestScoreText();
  document.getElementById('menuShards').textContent = META.shards;
}
