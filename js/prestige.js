'use strict';
// Prestige: after winning a run with a sorcerer, evolve them from the menu (costs shards).
// Plays the evolution page as a cutscene, then a reveal of the new form. Forms are registered with
// registerPrestige() in characters/; this file only runs the ceremony.

const pv = {
  overlay: document.getElementById('prestige-overlay'),
  bg: document.getElementById('pvBg'),
  frame: document.getElementById('pvFrame'),
  img: document.getElementById('pvImg'),
  art: document.getElementById('pvArt'),
  caption: document.getElementById('pvCaption'),
  name: document.getElementById('pvName'),
  text: document.getElementById('pvText'),
  reveal: document.getElementById('pvReveal'),
  perks: document.getElementById('pvPerks'),
  walker: document.getElementById('pvWalker'),
  eyebrow: document.getElementById('pvEyebrow'),
  title: document.getElementById('pvTitle'),
  id: null, form: null, idx: 0, typer: null, revealing: false, raf: 0,
};

const canPrestige = (id) => !!PRESTIGE[id] && prestigeRank(id) < 1 && (META.charWins[id] || 0) >= 1 && META.shards >= PRESTIGE[id].cost;

function startPrestige(id) {
  const form = PRESTIGE[id];
  if (state !== 'menu' || !canPrestige(id)) return;
  Object.assign(pv, { id, form, idx: 0, revealing: false });
  state = 'prestige';
  const scene = form.prestigeScene;
  pv.img.src = scene.panel;
  pv.bg.style.backgroundImage = `url("${scene.panel}")`;
  pv.eyebrow.textContent = `Prestige I · ${form.baseName}`;
  pv.title.textContent = 'The King Stirs';
  pv.frame.classList.remove('hidden'); pv.art.classList.add('hidden'); pv.walker.classList.add('hidden');
  pv.caption.classList.remove('hidden'); pv.reveal.classList.add('hidden');
  pv.overlay.classList.remove('hidden');
  showPvBeat();
}

function showPvBeat() {
  const b = pv.form.prestigeScene.beats[pv.idx];
  pv.overlay.style.setProperty('--sc', b.color);
  pv.name.textContent = b.name;
  for (const n of [pv.caption]) { n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; }
  pv.text.textContent = '';
  let shown = 0;
  clearInterval(pv.typer);
  pv.typer = setInterval(() => {
    shown++;
    pv.text.textContent = b.text.slice(0, shown);
    if (shown >= b.text.length) { clearInterval(pv.typer); pv.typer = null; }
  }, 26);
}

function advancePrestige() {
  if (state !== 'prestige' || pv.revealing) return;
  const beats = pv.form.prestigeScene.beats, b = beats[pv.idx];
  if (pv.typer) { clearInterval(pv.typer); pv.typer = null; pv.text.textContent = b.text; return; }
  pv.idx++;
  if (pv.idx >= beats.length) showPvReveal(); else showPvBeat();
}

// The new form steps out: big art, what it gives you, and a small cameo walking along the bottom.
function showPvReveal() {
  clearInterval(pv.typer); pv.typer = null;
  pv.revealing = true;
  const f = pv.form;
  pv.title.textContent = f.name;
  pv.eyebrow.textContent = 'Prestige I · New form unlocked';
  pv.frame.classList.add('hidden'); pv.caption.classList.add('hidden');
  pv.art.classList.remove('hidden'); pv.walker.classList.remove('hidden');
  pv.perks.innerHTML = f.perks.map(p => `<li>${p}</li>`).join('') + `<li class="pv-cost">Cost: ◆ ${f.cost} <span>(you have ◆ ${META.shards})</span></li>`;
  pv.reveal.classList.remove('hidden');
  cancelAnimationFrame(pv.raf);
  pv.raf = requestAnimationFrame(drawPvReveal);
}

function drawPvReveal(ts) {
  if (state !== 'prestige' || !pv.revealing) return;
  const s = pv.form.sprite;
  if (s && s.ready) {
    const c = pv.art.getContext('2d');
    c.clearRect(0, 0, pv.art.width, pv.art.height);
    c.save();
    c.shadowColor = '#fbbf24'; c.shadowBlur = 24 + Math.sin(ts * 0.003) * 8;
    drawRegion(c, s, 'bigArt', pv.art.width / 2, pv.art.height / 2 + Math.sin(ts * 0.002) * 4, pv.art.height * 0.96, 0);
    c.restore();
    // Mini cameo walking along the bottom edge.
    const w = pv.walker.getContext('2d'), tiny = s.atlas.tiny;
    w.clearRect(0, 0, pv.walker.width, pv.walker.height);
    const x = ((ts * 0.07) % (pv.walker.width + 80)) - 40;
    const box = tiny[Math.floor(ts / 70) % tiny.length];
    w.save(); w.globalAlpha = 0.9; drawBox(w, s, box, x, 44, 64, 0); w.restore();
  }
  pv.raf = requestAnimationFrame(drawPvReveal);
}

function acceptPrestige() {
  if (!pv.revealing || META.shards < pv.form.cost) return;
  META.shards -= pv.form.cost;
  META.prestige[pv.id] = 1;
  META.form[pv.id] = 'prestige';
  saveMeta();
  closePrestige();
}

function closePrestige() {
  clearInterval(pv.typer); pv.typer = null;
  cancelAnimationFrame(pv.raf);
  pv.revealing = false;
  pv.overlay.classList.add('hidden');
  state = 'menu';
  showMenu();
}

function prestigeKey(e) {
  if (['Space', 'Enter', 'Escape'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (pv.revealing) { if (e.code === 'Escape') closePrestige(); else if (e.code === 'Enter') acceptPrestige(); }
  else if (e.code === 'Escape') showPvReveal();
  else if (e.code === 'Space' || e.code === 'Enter') advancePrestige();
}
pv.overlay.addEventListener('click', (e) => { if (!e.target.closest('.pv-reveal')) advancePrestige(); });
document.getElementById('pvAccept').addEventListener('click', acceptPrestige);
document.getElementById('pvLater').addEventListener('click', closePrestige);

// Prestige controls on a character card: unlock, or switch between base and prestige form.
function prestigeRow(base) {
  const f = PRESTIGE[base.id];
  if (!f) return null;
  const row = document.createElement('div');
  row.className = 'cc-prestige';
  const rank = prestigeRank(base.id);
  if (rank >= 1) {
    const on = META.form[base.id] !== 'base';
    row.innerHTML = `<button class="pr-btn ${on ? 'on' : ''}">★ ${f.name}: ${on ? 'ON' : 'OFF'}</button>`;
    row.firstChild.addEventListener('click', (e) => { e.stopPropagation(); META.form[base.id] = on ? 'base' : 'prestige'; saveMeta(); buildCharGrid(); });
  } else if ((META.charWins[base.id] || 0) >= 1) {
    const afford = META.shards >= f.cost;
    row.innerHTML = `<button class="pr-btn ${afford ? 'ready' : 'poor'}">★ Prestige · ◆ ${f.cost}</button>`;
    row.firstChild.addEventListener('click', (e) => { e.stopPropagation(); if (afford) startPrestige(base.id); });
  } else {
    row.innerHTML = '<span class="pr-lock">★ Prestige: win a run with this sorcerer</span>';
  }
  return row;
}
