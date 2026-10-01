'use strict';
// Prestige-form engine: the sprite-atlas loader plus everything the Heian Sukuna sheet adds.
// Where each part of the sheet is used:
//   idle / walk / rush ...... standing, walking, and running while a Domain is up
//   intro ................... materialising at the start of a run (with the staffs planted beside you)
//   dash + dark afterimages . Heian Rush (SHIFT)
//   guard / hit ............. parry and damage
//   down / getup ............ death collapse and Second Wind
//   domain .................. Ultimate Action frames while the Domain stands
//   strike pool (21 rows) ... Dismantle casts: punches, kicks and combos
//   ult pool + jump ......... Cleave casts: staff and sword work, or a leaping strike
//   fuga + red orbs ......... Fuga wind-up and the orb it fires
//   rings + thrown blade .... Cleave effects
//   limbs + sparks .......... debris from kills, dashes and your own defeat
//   demon heads ............. Malevolent Shrine, behind the Domain
//   red eyes ................ blink above you at low HP
//   busts / big art ......... conversation portrait, prestige reveal
//   mini walker row ......... cameo on the prestige screen
// Frame data lives in characters/sukuna_heian_atlas.js (generated, see assets/sprites/characters/).

function loadAtlasSprite(c) {
  const s = c.sprite, A = s.atlas;
  const img = new Image();
  img.onload = () => {
    const mk = (names, fps) => {
      const frames = names.flatMap(n => A.anims[n]).map(i => { const [x, y, w, h, ax, fy] = A.frames[i]; return { x, y, w, h, ax, fy }; });
      return { frames, fps, maxH: Math.max(...frames.map(f => f.h)) };
    };
    s.sheet = img;
    s.idle = mk(['idle'], 4);
    s.walk = mk(['walk'], 12);
    s.actions = {};
    for (const name of Object.keys(A.anims)) if (name !== 'idle' && name !== 'walk') s.actions[name] = mk([name], 10);
    s.pools = A.pools;
    // The pool names double as plain actions (first member) so `actions.strike` exists for the usual checks.
    for (const [pool, names] of Object.entries(A.pools)) s.actions[pool] = s.actions[names[0]];
    const r = A.regions[s.portraitRegion || 'bustA'];
    s.portrait = { src: s.src, img, x0: r[0], x1: r[0] + r[2], y0: r[1], y1: r[1] + r[3] };
    s.ready = true;
    if (typeof buildCharGrid === 'function' && typeof el !== 'undefined' && state === 'menu') buildCharGrid();
  };
  img.src = s.src;
}

// The atlas sprite of the character in play, once loaded.
function atlasSprite() {
  const s = game && game.character.sprite;
  return s && s.atlas && s.ready ? s : null;
}

// Draws an [x, y, w, h] box of the sheet centred at (cx, cy), scaled so it is `h` px tall.
function drawBox(c2, s, box, cx, cy, h, rot, alpha, flip) {
  const [bx, by, bw, bh] = box, k = h / bh;
  c2.save();
  c2.translate(cx, cy);
  if (rot) c2.rotate(rot);
  if (flip) c2.scale(-1, 1);
  if (alpha !== undefined) c2.globalAlpha *= alpha;
  c2.imageSmoothingEnabled = false;
  c2.drawImage(s.sheet, bx, by, bw, bh, -bw * k / 2, -bh * k / 2, bw * k, bh * k);
  c2.restore();
}
const drawRegion = (c2, s, key, cx, cy, h, rot, alpha) => drawBox(c2, s, s.atlas.regions[key], cx, cy, h, rot, alpha);
const drawFrameIdx = (c2, s, idx, x, footY, h, alpha, flip) => {
  const [fx, fy, fw, fh] = s.atlas.frames[idx], k = h / fh;
  c2.save();
  c2.translate(x, footY);
  if (flip) c2.scale(-1, 1);
  if (alpha !== undefined) c2.globalAlpha *= alpha;
  c2.imageSmoothingEnabled = false;
  c2.drawImage(s.sheet, fx, fy, fw, fh, -fw * k / 2, -fh * k, fw * k, fh * k);
  c2.restore();
};

/* ---------- Effects ---------- */
const fxList = () => (game.fx = game.fx || []);

function spawnLimbs(x, y, n) {
  const s = atlasSprite();
  if (!s) return;
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), sp = rand(80, 260);
    fxList().push({ kind: 'limb', box: choice(s.atlas.limbs), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: rand(0, 6), vr: rand(-9, 9), t: 0, life: rand(500, 900) });
  }
}
function spawnSparks(x, y, n) {
  const s = atlasSprite();
  if (!s) return;
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), sp = rand(120, 320);
    fxList().push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: a, t: 0, life: rand(200, 380) });
  }
}

// Cleave: a thrown blade crosses to the target and a ring of cutting wind opens on it.
function heianCleaveFx(player, t) {
  const s = atlasSprite();
  if (!s || !t) return;
  fxList().push({ kind: 'blade', x0: player.x, y0: player.y - 6, x1: t.x, y1: t.y, t: 0, life: 200 });
  fxList().push({ kind: 'ring', x: t.x, y: t.y, t: 0, life: 520, size: 190 });
  if (Math.random() < 0.35) playAnim(player, 'jump', 460, t.x);
}
function heianDismantleFx(t) {
  if (!atlasSprite() || !t || Math.random() > 0.3) return;
  fxList().push({ kind: 'ring', x: t.x, y: t.y, t: 0, life: 380, size: 100 });
}
function heianKill(e) {
  if (!atlasSprite()) return;
  spawnLimbs(e.x, e.y, e.isBoss ? 12 : Math.random() < 0.3 ? 2 : 0);
}
function heianDeath(player) { spawnLimbs(player.x, player.y, 14); spawnSparks(player.x, player.y, 8); }

function updateHeianFx(dt) {
  if (!game.fx) return;
  for (const f of game.fx) {
    f.t += dt;
    if (f.kind === 'limb' || f.kind === 'spark') {
      f.x += f.vx * (dt / 1000); f.y += f.vy * (dt / 1000);
      f.vx *= 0.94; f.vy *= 0.94;
      if (f.kind === 'limb') f.rot += f.vr * (dt / 1000);
    }
  }
  game.fx = game.fx.filter(f => f.t < f.life);
}

function drawHeianFx() {
  const s = atlasSprite();
  if (!s) return;
  const player = game.player, [px, py] = worldToScreen(player.x, player.y);
  // Intro props: the two staffs he arrives with, planted where the run began.
  if (game.time < 3800) {
    const a = clamp((3800 - game.time) / 600, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    for (const [key, ox] of [['staffA', -30], ['staffB', 30]]) {
      const [sx, sy] = worldToScreen(ox, 6);
      drawFrameIdx(ctx, s, s.atlas.props[key], sx, sy + 18, 54, 1, false);
    }
    ctx.restore();
  }
  for (const f of game.fx || []) {
    const [sx, sy] = worldToScreen(f.x !== undefined ? f.x : f.x0, f.y !== undefined ? f.y : f.y0);
    const u = f.t / f.life;
    ctx.save();
    if (f.kind === 'limb') {
      ctx.globalAlpha = clamp((1 - u) * 2, 0, 1);
      drawBox(ctx, s, f.box, sx, sy, f.box[3] * 2.4, f.rot);
    } else if (f.kind === 'spark') {
      ctx.globalAlpha = 1 - u;
      drawBox(ctx, s, s.atlas.sparks, sx, sy, 8, f.rot);
    } else if (f.kind === 'ring') {
      const rings = s.atlas.rings;
      ctx.globalAlpha = clamp((1 - u) * 1.6, 0, 1);
      ctx.globalCompositeOperation = 'lighter';
      drawBox(ctx, s, rings[Math.floor(f.t / 60) % rings.length], sx, sy, f.size * (0.35 + 0.65 * Math.min(1, u * 2.2)) * 0.35, f.t * 0.012);
    } else if (f.kind === 'blade') {
      const bx = f.x0 + (f.x1 - f.x0) * clamp(u * 1.4, 0, 1), by = f.y0 + (f.y1 - f.y0) * clamp(u * 1.4, 0, 1);
      const [bsx, bsy] = worldToScreen(bx, by);
      ctx.globalAlpha = clamp((1 - u) * 2, 0, 1);
      drawBox(ctx, s, s.atlas.blade, bsx, bsy, s.atlas.blade[3] * 2.6, Math.atan2(f.y1 - f.y0, f.x1 - f.x0));
    } else if (f.kind === 'ghost') {
      ctx.globalAlpha = 0.5 * (1 - u);
      ctx.shadowColor = '#7f1d1d'; ctx.shadowBlur = 12;
      drawSpriteFrame(ctx, s, 'dash', 0, sx, sy + 22, f.facing, 60);
    }
    ctx.restore();
  }
  // Red eyes blink above his head when he is hurt badly.
  if (player.hp < player.maxHp * 0.3 && !player.dead && Math.floor(game.time / 380) % 3 !== 0) {
    ctx.save();
    drawRegion(ctx, s, 'eyes', px, py - 44, 22, 0, 0.9);
    ctx.restore();
  }
}

// Orb sprite for Fuga while it flies (drawn instead of the plain flame arrow).
function heianOrb(p, sx, sy) {
  const s = atlasSprite();
  if (!s) return false;
  const orbs = s.atlas.orbs;
  const a = Math.atan2(p.vy, p.vx);
  for (let i = 3; i >= 0; i--) {
    const ox = sx - Math.cos(a) * i * 16, oy = sy - Math.sin(a) * i * 16;
    drawFrameIdx(ctx, s, orbs[Math.floor(game.time / 90 + i) % 2], ox, oy + 20, 40 - i * 5, 0.9 - i * 0.2, false);
  }
  return true;
}

// Malevolent Shrine: the demon head looms behind the Domain, and its smaller twin slams in at the start.
function drawHeianDomain(d, fade) {
  const s = atlasSprite();
  if (!s) return;
  const cx = canvas.width / 2, cy = canvas.height / 2;
  ctx.save();
  ctx.globalAlpha = fade * (0.34 + Math.sin(d.t * 0.004) * 0.05);
  drawRegion(ctx, s, 'headL', cx, cy, canvas.height * 1.0, Math.sin(d.t * 0.0013) * 0.03);
  ctx.restore();
  if (d.t < 800) {
    const u = d.t / 800;
    ctx.save();
    ctx.globalAlpha = (1 - u) * 0.95;
    drawRegion(ctx, s, 'headR', cx, cy, canvas.height * (1.55 - 0.55 * u), 0);
    ctx.restore();
  }
}

/* ---------- Heian Rush (dash) ---------- */
function tryDash() {
  if (state !== 'playing' || !game) return;
  const p = game.player, d = p.character.dash;
  if (!d || p.dead || p.dash || game.time < (p.dashReady || 0)) return;
  let dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
  if (!dx && !dy) dx = p.facing || 1;
  const len = Math.hypot(dx, dy); dx /= len; dy /= len;
  p.dash = { t: 0, dur: d.dur || 240, dx, dy, hit: new Set(), ghostAt: 0 };
  p.dashReady = game.time + d.cd * p.cdrMult;
  p.invuln = Math.max(p.invuln, p.dash.dur + 160);
  if (dx) p.facing = dx > 0 ? 1 : -1;
  playAnim(p, 'dash', p.dash.dur);
  spawnSparks(p.x, p.y, 6);
  game.camera.shake = Math.max(game.camera.shake, 3);
}

// Returns true while a dash is moving the player (replaces normal movement for that frame).
function updatePlayerDash(dt) {
  const p = game.player, dsh = p.dash;
  if (!dsh) return false;
  const d = p.character.dash;
  dsh.t += dt;
  const step = d.dist / dsh.dur * dt;
  p.x += dsh.dx * step; p.y += dsh.dy * step;
  pushOutOfBuildings(p);
  p.moving = true;
  dsh.ghostAt -= dt;
  if (dsh.ghostAt <= 0) { fxList().push({ kind: 'ghost', x: p.x, y: p.y, facing: p.facing || 1, t: 0, life: 280 }); dsh.ghostAt = 38; }
  for (const e of game.enemies) {
    if (e.dead || dsh.hit.has(e.id) || dist(p.x, p.y, e.x, e.y) > 34 + e.radius) continue;
    dsh.hit.add(e.id);
    damageEnemy(e, 14 + p.level * 3, { color: '#fca5a5' });
    knockback(e, p.x, p.y, 220);
    spawnSparks(e.x, e.y, 3);
  }
  if (dsh.t >= dsh.dur) p.dash = null;
  return true;
}

function updateDashHud() {
  const lab = document.getElementById('dashLabel');
  if (!lab) return;
  const d = game.player.character.dash;
  if (!d) { lab.textContent = ''; return; }
  const left = Math.max(0, (game.player.dashReady || 0) - game.time);
  lab.textContent = left > 0 ? `Heian Rush ${Math.ceil(left / 100) / 10}s` : 'Heian Rush ready (SHIFT)';
  lab.classList.toggle('ready', left <= 0);
}
