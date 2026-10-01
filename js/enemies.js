'use strict';
// Cursed spirits: stats, spawning, AI, boss attacks and drawing.
// Loaded before game.js; everything here runs inside a game, so it can use game.js globals
// (game, ctx, canvas, damagePlayer, spawnText, worldToScreen, ...) at call time.

/* ===================== Roster ===================== */
// grade is shown on elites; `from` = seconds into a run before it starts spawning.
const ENEMY_DEFS = {
  fly:    { name: 'Fly Head',           grade: '4級', hp: 11,  dmg: 6,  speed: 120, radius: 11, xp: 3,  color: '#a78bfa' },
  grunt:  { name: 'Lowly Curse',        grade: '3級', hp: 22,  dmg: 9,  speed: 88,  radius: 15, xp: 4,  color: '#ef4444' },
  ranged: { name: 'Gazer',              grade: '3級', hp: 16,  dmg: 7,  speed: 66,  radius: 14, xp: 6,  color: '#c084fc' },
  husk:   { name: 'Transfigured Human', grade: '2級', hp: 60,  dmg: 13, speed: 56,  radius: 18, xp: 8,  color: '#d6c7b8' },
  elite:  { name: 'Finger Bearer',      grade: '1級', hp: 170, dmg: 18, speed: 74,  radius: 26, xp: 30, color: '#facc15' },
};

// Special Grade bosses arrive in a random order each run (game.bossOrder), reshuffled every cycle.
// `sprite` uses the same format as character sprites (loaded by game.js); bosses without one are drawn by hand
// (ENEMY_DRAW below). `art` is an optional big illustration for conversations, keyed against a flat background.
const BOSS_DEFS = [
  { id: 'jogo',   name: 'JOGO',   title: 'Disaster Flames',      hp: 950,  dmg: 24, speed: 62, radius: 50, color: '#f97316',
    sprite: { src: 'assets/sprites/curses/jogo_sheet_by_zenuchiha.jpg', bg: [18, 18, 18], flood: true, keyT: 30, fringeT: 60, erode: 0,
      idle: { x0: 40, x1: 250, y0: 36, y1: 362, count: 1, fps: 1 } },
    art: { src: 'assets/sprites/curses/jogo_art.webp', bg: [255, 255, 255] } },
  { id: 'hanami', name: 'HANAMI', title: 'Disaster Plants',      hp: 1200, dmg: 28, speed: 50, radius: 54, color: '#4ade80',
    sprite: { src: 'assets/sprites/curses/hanami_sheet_by_arisrad.jpg', bg: [53, 55, 70], flood: true, keyT: 36, fringeT: 60, erode: 0,
      idle: { x0: 44, x1: 396, y0: 104, y1: 164, count: 9, fps: 7 } } },
  { id: 'mahito', name: 'MAHITO', title: 'Disaster of Humanity', hp: 1050, dmg: 22, speed: 70, radius: 46, color: '#7dd3fc',
    sprite: { src: 'assets/sprites/curses/mahito_sheet_by_arisrad.jpg', bg: [72, 53, 85], flood: true, keyT: 36, fringeT: 60, erode: 0,
      idle: { x0: 76, x1: 242, y0: 140, y1: 194, count: 6, fps: 7, even: true } } },
];
// game.js's loader slices `idle` and `walk`; bosses only have one loop, so walk shares it.
for (const b of BOSS_DEFS) if (b.sprite && !b.sprite.walk) b.sprite.walk = b.sprite.idle;
const bossDef = (e) => BOSS_DEFS.find(b => b.id === e.boss);

// Big conversation art: flood-key the flat background in from the image edges.
// Wait for the window `load` event: floodKey lives in game.js, which loads after this file.
window.addEventListener('load', () => { for (const b of BOSS_DEFS) {
  if (!b.art) continue;
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    try {
      const data = cx.getImageData(0, 0, cv.width, cv.height);
      floodKey(data.data, cv.width, { x0: 0, x1: cv.width, y0: 0, y1: cv.height }, b.art.bg, b.art.keyT ?? 60, b.art.fringeT ?? 110);
      cx.putImageData(data, 0, 0);
    } catch (err) {
      // file:// canvas restriction in some browsers (see js/game.js loadSprite) — fall back to
      // the un-keyed image; callers already guard with `if (b.art && b.art.img)`.
      console.warn('Boss art keying skipped (file:// canvas restriction):', b.art.src, err.message);
    }
    b.art.img = cv;
  };
  img.src = b.art.src;
} });
const FIRST_BOSS_MS = 120000;
const BOSS_EVERY_MS = 150000;

const LOWLY_SKINS = ['#3b2d4f', '#2d3b30', '#4a2b2b', '#2b3446'];

/* ===================== Spawning ===================== */
let enemyIdCounter = 1;
// at: optional { x, y } (exact position) or { angle } (spawn off-screen in that direction).
function spawnEnemy(kind, at) {
  const player = game.player;
  const t = game.time / 1000 + (game.shibuya ? game.shibuya.cur.def.depth * 15 : 0);
  let x, y;
  if (at && at.x !== undefined) { x = at.x; y = at.y; } else if (game.shibuya) {
    ({ x, y } = levelSpawnPos(at && at.angle));
  } else {
    const angle = at && at.angle !== undefined ? at.angle : rand(0, Math.PI * 2);
    const spawnDist = Math.max(canvas.width, canvas.height) / 2 + 80;
    x = player.x + Math.cos(angle) * spawnDist;
    y = player.y + Math.sin(angle) * spawnDist;
  }

  const hpMult = (1 + t / 42) * (RUN_MODS.enemyHp || 1);
  const dmgMult = (1 + t / 75) * (RUN_MODS.enemyDmg || 1);
  const spdMult = Math.min(1 + t / 320, 1.55);

  let e;
  if (kind === 'boss') {
    if (game.bossIdx > 0 && game.bossIdx % BOSS_DEFS.length === 0) game.bossOrder = shuffle(BOSS_DEFS.map((_, i) => i));
    const b = BOSS_DEFS[game.bossOrder[game.bossIdx % BOSS_DEFS.length]];
    game.bossIdx++;
    e = { hp: b.hp * hpMult, maxHp: b.hp * hpMult, dmg: b.dmg * dmgMult, speed: b.speed * spdMult, radius: b.radius,
      color: b.color, xpValue: 120, type: 'boss', boss: b.id, name: b.name, title: b.title, isBoss: true,
      atkA: 2500, atkB: 6000 };
  } else {
    const d = ENEMY_DEFS[kind];
    e = { hp: d.hp * hpMult, maxHp: d.hp * hpMult, dmg: d.dmg * dmgMult, speed: d.speed * spdMult, radius: d.radius,
      color: d.color, xpValue: d.xp, type: kind, name: d.name, grade: d.grade };
    if (kind === 'ranged') e.shootCd = rand(400, 1400);
    if (kind === 'grunt') e.skin = choice(LOWLY_SKINS);
  }
  e.id = enemyIdCounter++;
  e.seed = Math.random() * 1000;
  e.x = x; e.y = y; e.dead = false; e.slowUntil = 0; e.stunUntil = 0; e.kvx = 0; e.kvy = 0;
  e.flash = 0; e.face = 1; e.mode = 'chase'; e.modeT = 0; e.dashCd = rand(1500, 3000);
  game.enemies.push(e);
  return e;
}

function pickSpawnKind(t) {
  const table = [
    ['fly', t < 40 ? 45 : 28],
    ['grunt', 36],
    ['ranged', t < 20 ? 6 : 18],
    ['husk', t < 70 ? 0 : 12 + Math.min(18, (t - 70) / 8)],
  ];
  let r = Math.random() * table.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of table) { if ((r -= w) < 0) return k; }
  return 'grunt';
}

function updateSpawning(dt) {
  const t = game.time / 1000;
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0 && game.enemies.length < 220) {
    const perSpawn = 1 + Math.min(5, Math.floor(t / 35));
    for (let i = 0; i < perSpawn; i++) {
      const kind = pickSpawnKind(t);
      if (kind === 'fly') {
        // Fly Heads come in buzzing little swarms.
        const a = rand(0, Math.PI * 2);
        for (let j = 0; j < 3; j++) spawnEnemy('fly', { angle: a + rand(-0.12, 0.12) });
      } else spawnEnemy(kind);
    }
    game.spawnTimer = Math.max(160, 1300 - t * 3.2) * (RUN_MODS.spawn || 1);
  }
  game.eliteTimer -= dt;
  if (game.eliteTimer <= 0) { spawnEnemy('elite'); game.eliteTimer = 26000; playerBark('elite', true, 0.7); }
  game.bossTimer -= dt;
  if (game.bossTimer <= 0) {
    const b = spawnEnemy('boss');
    game.bossTimer = BOSS_EVERY_MS;
    // Bring the boss on-screen for the conversation, then let the fight start.
    const a = rand(0, Math.PI * 2);
    b.x = game.player.x + Math.cos(a) * 260; b.y = game.player.y + Math.sin(a) * 200;
    startBossDialogue(b, () => {
      showBanner('特級呪霊', b.name, `Special Grade Curse · ${b.title}`);
      game.camera.shake = Math.max(game.camera.shake, 14);
      companionBark('boss', false);
    });
  }
}

/* ===================== AI ===================== */
// Shared lunge: stop and telegraph, then charge in a straight line.
function updateDash(e, dt, d, opts) {
  const player = game.player;
  e.modeT -= dt;
  if (e.mode === 'chase') {
    e.dashCd -= dt;
    if (e.dashCd <= 0 && d < opts.range) {
      e.mode = 'wind'; e.modeT = opts.wind;
      e.dashAng = Math.atan2(player.y - e.y, player.x - e.x);
    }
    return false;
  }
  if (e.mode === 'wind') {
    if (e.modeT <= 0) { e.mode = 'dash'; e.modeT = opts.dur; }
    return true;
  }
  // dash
  const k = dt / 1000;
  e.x += Math.cos(e.dashAng) * opts.speed * k;
  e.y += Math.sin(e.dashAng) * opts.speed * k;
  if (Math.random() < 0.5) game.particles.push({ x: e.x, y: e.y, vx: rand(-30, 30), vy: rand(-30, 30), life: 300, t: 0, color: e.color });
  if (e.modeT <= 0) { e.mode = 'chase'; e.dashCd = opts.cd; }
  return true;
}

function enemyShoot(e, ang, speed, radius, color, dmg) {
  game.projectiles.push({ x: e.x, y: e.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, radius, dmg: dmg ?? e.dmg, color, friendly: false, life: 3200 });
}

function updateBoss(e, dt, d) {
  const player = game.player;
  const toP = Math.atan2(player.y - e.y, player.x - e.x);
  e.atkA -= dt; e.atkB -= dt;
  if (e.boss === 'jogo') {
    if (Math.random() < 0.25) game.particles.push({ x: e.x + rand(-6, 6), y: e.y - e.radius * 1.3, vx: rand(-25, 25), vy: rand(-140, -60), life: rand(300, 600), t: 0, color: Math.random() < 0.5 ? '#fb923c' : '#fde047' });
    if (e.atkA <= 0) {
      // Ember Insects: a ring of fire bugs.
      const n = 12;
      const off = rand(0, Math.PI);
      for (let i = 0; i < n; i++) enemyShoot(e, off + (i / n) * Math.PI * 2, 190, 7, '#fb923c', e.dmg * 0.45);
      e.atkA = 2800;
    }
    if (e.atkB <= 0) {
      // Maximum: Meteor — drops where the player stands.
      game.hazards.push({ kind: 'meteor', x: player.x, y: player.y, r: 130, telegraph: 1300, life: 300, t: 0, dmg: e.dmg * 1.4, color: '#f97316' });
      spawnText(e.x, e.y - 70, 'MAXIMUM: METEOR', '#fb923c', true);
      e.atkB = 7000;
    }
    return false;
  }
  if (e.boss === 'hanami') {
    if (e.atkA <= 0) {
      // Wooden roots tear up the ground toward the player.
      for (let i = -1; i <= 1; i++) {
        game.hazards.push({ kind: 'root', x: e.x, y: e.y, angle: toP + i * 0.32, length: 560, width: 36, telegraph: 800, life: 600, t: 0, dmg: e.dmg * 0.9, color: '#65a30d' });
      }
      e.atkA = 3200;
    }
    if (e.atkB <= 0) {
      // Cursed Buds: a flower field that saps the player's strength.
      game.hazards.push({ kind: 'bloom', x: player.x, y: player.y, r: 150, telegraph: 900, life: 2600, t: 0, dmg: e.dmg * 0.5, color: '#f9a8d4', seed: Math.random() * 100 });
      spawnText(e.x, e.y - 70, 'CURSED BUDS', '#f9a8d4', true);
      e.atkB = 8000;
    }
    return false;
  }
  if (e.boss === 'mahito') {
    if (e.atkB <= 0) {
      // Idle Transfiguration: reshapes souls into husks.
      for (let i = 0; i < 3; i++) {
        const a = rand(0, Math.PI * 2);
        const h = spawnEnemy('husk', { x: e.x + Math.cos(a) * 70, y: e.y + Math.sin(a) * 70 });
        spawnParticles(h.x, h.y, '#7dd3fc', 10);
      }
      spawnText(e.x, e.y - 70, 'IDLE TRANSFIGURATION', '#7dd3fc', true);
      e.atkB = 6500;
    }
    return updateDash(e, dt, d, { range: 420, wind: 550, dur: 420, speed: 720, cd: 3600 });
  }
  return false;
}

function updateEnemies(dt) {
  const player = game.player;
  const k = dt / 1000;
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    const slowed = e.slowUntil > game.time;
    const stunned = e.stunUntil > game.time;
    let spd = e.speed * (slowed ? 0.5 : 1);
    let d = dist(player.x, player.y, e.x, e.y) || 1;
    e.face = player.x < e.x ? -1 : 1;
    if (player.barrier) {
      // Infinity: approach slows toward zero the closer they get.
      const gap = d - player.barrier - e.radius;
      if (gap < 120) spd *= clamp(gap / 120, 0.08, 1);
    }
    if (!stunned) {
      const ux = (player.x - e.x) / d, uy = (player.y - e.y) / d;
      let busy = false;
      if (e.isBoss) busy = updateBoss(e, dt, d);
      else if (e.type === 'elite') busy = updateDash(e, dt, d, { range: 360, wind: 650, dur: 380, speed: 640, cd: 3200 });
      if (busy) {
        // winding up or mid-dash: no normal movement
      } else if (e.type === 'ranged') {
        if (d > 230) { e.x += ux * spd * k; e.y += uy * spd * k; }
        else if (d < 160) { e.x -= ux * spd * k; e.y -= uy * spd * k; }
        e.shootCd = Math.max(0, e.shootCd - dt);
        if (e.shootCd <= 0 && d < 440) {
          const ang = Math.atan2(player.y - e.y, player.x - e.x);
          if (game.time > 90000) { for (const s of [-0.22, 0, 0.22]) enemyShoot(e, ang + s, 220, 5, '#c084fc'); }
          else enemyShoot(e, ang, 220, 5, '#c084fc');
          e.shootCd = rand(1500, 2200);
        }
      } else if (e.type === 'fly') {
        // Erratic buzzing.
        const wob = Math.sin(game.time * 0.009 + e.seed) * 0.9;
        e.x += (ux - uy * wob) * spd * k;
        e.y += (uy + ux * wob) * spd * k;
      } else if (e.type === 'husk') {
        const lurch = 0.45 + 0.75 * Math.max(0, Math.sin(game.time * 0.006 + e.seed));
        e.x += ux * spd * lurch * k; e.y += uy * spd * lurch * k;
      } else {
        e.x += ux * spd * k;
        e.y += uy * spd * k;
      }
    }
    if (e.kvx || e.kvy) {
      e.x += e.kvx * k; e.y += e.kvy * k;
      const decay = Math.exp(-6 * k);
      e.kvx *= decay; e.kvy *= decay;
      if (Math.abs(e.kvx) + Math.abs(e.kvy) < 4) { e.kvx = 0; e.kvy = 0; }
    }
    pushOutOfBuildings(e, 0, e.radius);
    d = dist(player.x, player.y, e.x, e.y) || 1;
    if (player.barrier && d < player.barrier + e.radius) {
      const m = player.barrier + e.radius;
      e.x = player.x + (e.x - player.x) / d * m;
      e.y = player.y + (e.y - player.y) / d * m;
      d = m;
      if (e.mode === 'dash') { e.mode = 'chase'; e.dashCd = 2000; }
    }
    if (!stunned && d < e.radius + 15) damagePlayer(e.dmg * k * 3.2 * (e.mode === 'dash' ? 4 : 1));
  }
  game.enemies = game.enemies.filter(e => !e.dead);
}

/* ===================== Boss hazards ===================== */
function hazardHits(h, x, y, pad) {
  if (h.kind === 'root') {
    const ex = h.x + Math.cos(h.angle) * h.length, ey = h.y + Math.sin(h.angle) * h.length;
    const t2 = clamp(((x - h.x) * (ex - h.x) + (y - h.y) * (ey - h.y)) / (h.length * h.length), 0, 1);
    return dist(h.x + (ex - h.x) * t2, h.y + (ey - h.y) * t2, x, y) <= h.width / 2 + pad;
  }
  return dist(h.x, h.y, x, y) <= h.r + pad;
}

function updateHazards(dt) {
  const player = game.player;
  for (const h of game.hazards) {
    h.t += dt;
    const inside = hazardHits(h, player.x, player.y, 12);
    if (!h.fired && h.t >= h.telegraph) {
      h.fired = true;
      if (h.kind === 'meteor') {
        if (inside) damagePlayer(h.dmg);
        game.camera.shake = Math.max(game.camera.shake, 16);
        spawnParticles(h.x, h.y, '#fb923c', 28);
        spawnParticles(h.x, h.y, '#fde047', 14);
        game.hazards.push({ kind: 'magma', x: h.x, y: h.y, r: h.r * 0.75, telegraph: 0, fired: true, life: 3500, t: 0, dmg: h.dmg * 0.25 });
      } else if (h.kind === 'root') {
        if (inside) damagePlayer(h.dmg);
        game.camera.shake = Math.max(game.camera.shake, 6);
      }
    }
    if (h.fired && inside) {
      if (h.kind === 'magma') damagePlayer(h.dmg);
      if (h.kind === 'bloom') { player.slowUntil = game.time + 400; damagePlayer(h.dmg); }
    }
  }
  game.hazards = game.hazards.filter(h => h.t < h.telegraph + h.life);
}

function drawHazards() {
  for (const h of game.hazards) {
    const [sx, sy] = worldToScreen(h.x, h.y);
    const prog = clamp(h.t / (h.telegraph || 1), 0, 1);
    const after = h.t - h.telegraph;
    const fade = h.fired ? clamp(1 - after / h.life, 0, 1) : 1;
    ctx.save();
    if (h.kind === 'root') {
      const ex = sx + Math.cos(h.angle) * h.length, ey = sy + Math.sin(h.angle) * h.length;
      if (!h.fired) {
        ctx.strokeStyle = 'rgba(215,25,43,0.25)';
        ctx.lineWidth = h.width;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,90,100,0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (ex - sx) * prog, sy + (ey - sy) * prog); ctx.stroke();
      } else {
        // Jagged wooden spikes along the line.
        ctx.globalAlpha = fade;
        const n = 14;
        const nx = -Math.sin(h.angle), ny = Math.cos(h.angle);
        for (let i = 0; i < n; i++) {
          const f = (i + 0.5) / n;
          const bx = sx + (ex - sx) * f, by = sy + (ey - sy) * f;
          const side = i % 2 ? 1 : -1;
          const hgt = h.width * (0.8 + 0.5 * Math.sin(i * 7.1));
          ctx.fillStyle = i % 3 ? '#5b3a1e' : '#3f2a14';
          ctx.beginPath();
          ctx.moveTo(bx - Math.cos(h.angle) * 10, by - Math.sin(h.angle) * 10);
          ctx.lineTo(bx + nx * side * hgt * 0.4, by + ny * side * hgt * 0.4 - hgt);
          ctx.lineTo(bx + Math.cos(h.angle) * 10, by + Math.sin(h.angle) * 10);
          ctx.closePath(); ctx.fill();
          if (i % 4 === 0) { ctx.fillStyle = '#65a30d'; ctx.beginPath(); ctx.arc(bx + nx * side * hgt * 0.4, by - hgt, 4, 0, Math.PI * 2); ctx.fill(); }
        }
      }
    } else if (h.kind === 'meteor') {
      if (!h.fired) {
        ctx.fillStyle = `rgba(249,115,22,${0.08 + prog * 0.22})`;
        ctx.beginPath(); ctx.arc(sx, sy, h.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,90,60,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([12, 8]);
        ctx.beginPath(); ctx.arc(sx, sy, h.r, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(sx, sy, h.r * prog, 0, Math.PI * 2); ctx.stroke();
        // The meteor itself, falling in from above.
        const my = sy - (1 - prog) * 520, mr = 30 + prog * 40;
        const g = ctx.createRadialGradient(sx, my, 4, sx, my, mr);
        g.addColorStop(0, '#fff7cc'); g.addColorStop(0.35, '#fb923c'); g.addColorStop(1, 'rgba(120,20,0,0.9)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sx, my, mr, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalAlpha = fade;
        ctx.fillStyle = '#fff1c2';
        ctx.beginPath(); ctx.arc(sx, sy, h.r * (1 + after / 400), 0, Math.PI * 2); ctx.fill();
      }
    } else if (h.kind === 'magma') {
      ctx.globalAlpha = fade;
      const g = ctx.createRadialGradient(sx, sy, h.r * 0.2, sx, sy, h.r);
      g.addColorStop(0, 'rgba(253,224,71,0.55)'); g.addColorStop(0.5, 'rgba(234,88,12,0.45)'); g.addColorStop(1, 'rgba(120,20,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, h.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde047';
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3 + h.t * 0.001, rr = h.r * 0.55 * ((i * 0.37) % 1);
        ctx.beginPath(); ctx.arc(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr, 2 + Math.abs(Math.sin(h.t * 0.006 + i)) * 4, 0, Math.PI * 2); ctx.fill();
      }
    } else if (h.kind === 'bloom') {
      ctx.globalAlpha = h.fired ? fade : 1;
      ctx.fillStyle = h.fired ? 'rgba(74,222,128,0.12)' : `rgba(249,168,212,${0.05 + prog * 0.15})`;
      ctx.strokeStyle = h.fired ? 'rgba(74,222,128,0.5)' : 'rgba(249,168,212,0.8)';
      ctx.lineWidth = 2;
      if (!h.fired) ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(sx, sy, h.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      const grow = h.fired ? 1 : prog;
      for (let i = 0; i < 16; i++) {
        const a = h.seed + i * 2.39, rr = h.r * Math.sqrt(((i * 0.618) % 1) * 0.9 + 0.05);
        const fx = sx + Math.cos(a) * rr, fy = sy + Math.sin(a) * rr, s = 6 * grow;
        ctx.fillStyle = i % 3 ? '#f9a8d4' : '#fef08a';
        for (let p = 0; p < 5; p++) {
          const pa = p / 5 * Math.PI * 2 + h.t * 0.001;
          ctx.beginPath(); ctx.arc(fx + Math.cos(pa) * s * 0.6, fy + Math.sin(pa) * s * 0.6, s * 0.45, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#7c2d12';
        ctx.beginPath(); ctx.arc(fx, fy, s * 0.3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
}

/* ===================== Drawing ===================== */
// Curse drawings paint onto `dc`, so the same art can go to the game canvas or a portrait canvas.
let dc = null;
function eyeball(x, y, r, iris, lookX, lookY, sclera) {
  dc.fillStyle = sclera || '#f2ead6';
  dc.beginPath(); dc.arc(x, y, r, 0, Math.PI * 2); dc.fill();
  dc.fillStyle = iris;
  dc.beginPath(); dc.arc(x + lookX * r * 0.35, y + lookY * r * 0.35, r * 0.55, 0, Math.PI * 2); dc.fill();
  dc.fillStyle = '#000';
  dc.beginPath(); dc.arc(x + lookX * r * 0.45, y + lookY * r * 0.45, r * 0.25, 0, Math.PI * 2); dc.fill();
}

function toothyMouth(cx, cy, w, h, teeth, gum) {
  dc.fillStyle = gum || '#4c0710';
  dc.beginPath(); dc.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); dc.fill();
  dc.fillStyle = '#f5efe0';
  for (let i = 0; i < teeth; i++) {
    const tx = cx - w / 2 + (i + 0.5) * (w / teeth);
    const span = Math.sqrt(Math.max(0, 1 - ((tx - cx) / (w / 2)) ** 2)) * h / 2;
    dc.beginPath(); dc.moveTo(tx - w / teeth / 2, cy - span); dc.lineTo(tx + w / teeth / 2, cy - span); dc.lineTo(tx, cy - span + h * 0.35); dc.fill();
    dc.beginPath(); dc.moveTo(tx - w / teeth / 2, cy + span); dc.lineTo(tx + w / teeth / 2, cy + span); dc.lineTo(tx, cy + span - h * 0.35); dc.fill();
  }
}

function blobPath(r, n, wob, t, seed) {
  dc.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + wob * Math.sin(i * 2.7 + t * 5 + seed));
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.92;
    i ? dc.lineTo(x, y) : dc.moveTo(x, y);
  }
  dc.closePath();
}

function stitches(x0, y0, x1, y1, n) {
  dc.strokeStyle = '#2a1a1a'; dc.lineWidth = 1.5;
  dc.beginPath(); dc.moveTo(x0, y0); dc.lineTo(x1, y1); dc.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * 3, ny = Math.cos(a) * 3;
  dc.beginPath();
  for (let i = 1; i < n; i++) {
    const f = i / n, px = x0 + (x1 - x0) * f, py = y0 + (y1 - y0) * f;
    dc.moveTo(px - nx, py - ny); dc.lineTo(px + nx, py + ny);
  }
  dc.stroke();
}

const ENEMY_DRAW = {
  fly(e, t, lx, ly) {
    const r = e.radius;
    const flap = 0.35 + 0.65 * Math.abs(Math.sin(t * 38 + e.seed));
    dc.fillStyle = 'rgba(210,214,235,0.4)';
    dc.strokeStyle = 'rgba(255,255,255,0.35)';
    dc.lineWidth = 1;
    for (const s of [-1, 1]) {
      dc.beginPath(); dc.ellipse(s * r * 0.8, -r * 0.8, r * 0.9, r * 0.45 * flap, s * 0.5, 0, Math.PI * 2); dc.fill(); dc.stroke();
    }
    dc.strokeStyle = '#1a141f'; dc.lineWidth = 1.5;
    dc.beginPath();
    for (let i = -1; i <= 1; i++) { dc.moveTo(i * r * 0.4, r * 0.7); dc.lineTo(i * r * 0.6, r * 1.25 + Math.sin(t * 9 + i) * 2); }
    dc.stroke();
    dc.fillStyle = '#2b2333';
    dc.beginPath(); dc.arc(0, 0, r, 0, Math.PI * 2); dc.fill();
    dc.strokeStyle = '#120d16'; dc.lineWidth = 2; dc.stroke();
    eyeball(0, -r * 0.05, r * 0.62, '#b91c1c', lx, ly);
  },

  grunt(e, t, lx, ly) {
    const r = e.radius;
    dc.fillStyle = '#0b0709';
    for (const s of [-1, 1]) {
      dc.beginPath(); dc.moveTo(s * r * 0.35, -r * 0.7); dc.lineTo(s * r * 0.7, -r * 1.45); dc.lineTo(s * r * 0.75, -r * 0.55); dc.fill();
    }
    blobPath(r, 16, 0.07, t, e.seed);
    dc.fillStyle = e.skin; dc.fill();
    dc.strokeStyle = '#0b0709'; dc.lineWidth = 2.5; dc.stroke();
    // Little arms reaching forward.
    dc.strokeStyle = e.skin; dc.lineWidth = 4; dc.lineCap = 'round';
    const reach = Math.sin(t * 8 + e.seed) * 3;
    dc.beginPath(); dc.moveTo(r * 0.7, r * 0.2); dc.lineTo(r * 1.25, r * 0.35 + reach); dc.stroke();
    toothyMouth(r * 0.1, r * 0.35, r * 1.2, r * 0.7 + Math.sin(t * 10 + e.seed) * 2, 5);
    eyeball(-r * 0.3, -r * 0.35, r * 0.2, '#facc15', lx, ly);
    eyeball(r * 0.25, -r * 0.45, r * 0.26, '#facc15', lx, ly);
    eyeball(r * 0.62, -r * 0.05, r * 0.14, '#facc15', lx, ly);
  },

  ranged(e, t, lx, ly) {
    const r = e.radius;
    const bob = Math.sin(t * 3 + e.seed) * 3;
    dc.translate(0, bob - 6);
    dc.strokeStyle = '#3b1366'; dc.lineWidth = 3; dc.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const bx = (i - 2) * r * 0.35;
      dc.beginPath(); dc.moveTo(bx, r * 0.6);
      dc.quadraticCurveTo(bx + Math.sin(t * 5 + i + e.seed) * 8, r * 1.3, bx + Math.sin(t * 4 + i) * 5, r * 1.9);
      dc.stroke();
    }
    const cd = clamp(e.shootCd, 0, 450);
    const charging = cd < 450;
    dc.fillStyle = '#1e1530';
    dc.beginPath(); dc.arc(0, 0, r, 0, Math.PI * 2); dc.fill();
    dc.strokeStyle = charging ? '#e9d5ff' : '#7c3aed'; dc.lineWidth = 2; dc.stroke();
    if (charging) {
      dc.strokeStyle = `rgba(192,132,252,${1 - cd / 450})`;
      dc.beginPath(); dc.arc(0, 0, r + 6 + cd / 60, 0, Math.PI * 2); dc.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + e.seed;
      eyeball(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.17, '#9333ea', lx, ly);
    }
    eyeball(0, 0, r * 0.42, charging ? '#f0abfc' : '#a855f7', lx, ly);
  },

  husk(e, t, lx, ly) {
    const r = e.radius;
    const sway = Math.sin(t * 6 + e.seed) * 0.12;
    dc.rotate(sway);
    dc.fillStyle = '#a8917c';
    dc.beginPath(); dc.arc(r * 0.45, r * 0.35, r * 0.6, 0, Math.PI * 2); dc.fill();
    dc.fillStyle = '#cdb9a6';
    dc.beginPath(); dc.arc(-r * 0.15, 0, r * 0.85, 0, Math.PI * 2); dc.fill();
    dc.beginPath(); dc.arc(r * 0.3, -r * 0.55, r * 0.5, 0, Math.PI * 2); dc.fill();
    dc.strokeStyle = '#6b5544'; dc.lineWidth = 2;
    dc.beginPath(); dc.arc(-r * 0.15, 0, r * 0.85, 0, Math.PI * 2); dc.stroke();
    // A misplaced, flailing arm.
    dc.strokeStyle = '#cdb9a6'; dc.lineWidth = 5; dc.lineCap = 'round';
    const fl = Math.sin(t * 7 + e.seed) * 0.6;
    dc.beginPath(); dc.moveTo(-r * 0.8, -r * 0.3); dc.lineTo(-r * 1.4, -r * 0.9 + fl * 6); dc.stroke();
    dc.fillStyle = '#cdb9a6';
    dc.beginPath(); dc.arc(-r * 1.45, -r * 0.95 + fl * 6, 4, 0, Math.PI * 2); dc.fill();
    stitches(-r * 0.7, -r * 0.6, r * 0.5, r * 0.5, 7);
    eyeball(-r * 0.35, -r * 0.2, r * 0.26, '#111', lx, ly, '#e9e2d0');
    eyeball(r * 0.35, -r * 0.65, r * 0.13, '#111', lx, ly, '#e9e2d0');
    dc.fillStyle = '#2a0f0f';
    dc.beginPath(); dc.ellipse(-r * 0.05, r * 0.35, r * 0.18, r * 0.3 + Math.abs(Math.sin(t * 4 + e.seed)) * 3, 0, 0, Math.PI * 2); dc.fill();
  },

  elite(e, t, lx, ly) {
    const r = e.radius;
    if (e.mode === 'wind') { dc.translate(rand(-2, 2), rand(-2, 2)); }
    dc.fillStyle = '#0d0809';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.85 + i * 0.42;
      dc.beginPath();
      dc.moveTo(Math.cos(a - 0.2) * r * 0.85, Math.sin(a - 0.2) * r * 0.85);
      dc.lineTo(Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6);
      dc.lineTo(Math.cos(a + 0.2) * r * 0.85, Math.sin(a + 0.2) * r * 0.85);
      dc.fill();
    }
    blobPath(r, 20, 0.05, t * 0.6, e.seed);
    dc.fillStyle = '#1f1416'; dc.fill();
    dc.strokeStyle = e.mode !== 'chase' ? '#ff3b4e' : '#0a0506'; dc.lineWidth = 3; dc.stroke();
    dc.strokeStyle = 'rgba(215,25,43,0.55)'; dc.lineWidth = 1.5;
    dc.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = e.seed + i * 1.7;
      dc.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
      dc.quadraticCurveTo(Math.cos(a + 0.4) * r * 0.6, Math.sin(a + 0.4) * r * 0.6, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
    }
    dc.stroke();
    toothyMouth(-r * 0.05, r * 0.42, r * 1.1, r * 0.5, 7);
    toothyMouth(r * 0.55, -r * 0.05, r * 0.45, r * 0.3, 4);
    const glow = e.mode !== 'chase' ? '#ff3b4e' : '#facc15';
    for (let i = 0; i < 5; i++) eyeball(-r * 0.55 + i * r * 0.27, -r * 0.35 - Math.abs(i - 2) * -r * 0.08, r * (i === 2 ? 0.2 : 0.12), glow, lx, ly, '#1a0a00');
  },

  jogo(e, t, lx, ly) {
    const r = e.radius;
    dc.fillStyle = '#2a1a12';
    dc.beginPath(); dc.moveTo(-r * 0.8, r * 1.1); dc.lineTo(-r * 0.55, r * 0.2); dc.lineTo(r * 0.55, r * 0.2); dc.lineTo(r * 0.8, r * 1.1); dc.closePath(); dc.fill();
    dc.strokeStyle = '#c2410c'; dc.lineWidth = 2;
    dc.beginPath(); dc.moveTo(0, r * 0.25); dc.lineTo(0, r * 1.1); dc.stroke();
    // Volcano head.
    dc.fillStyle = '#e8dcc4';
    dc.beginPath();
    dc.moveTo(-r * 0.6, r * 0.3);
    dc.quadraticCurveTo(-r * 0.75, -r * 0.3, -r * 0.32, -r * 1.05);
    dc.lineTo(r * 0.32, -r * 1.05);
    dc.quadraticCurveTo(r * 0.75, -r * 0.3, r * 0.6, r * 0.3);
    dc.closePath(); dc.fill();
    dc.strokeStyle = '#7c6a55'; dc.lineWidth = 2; dc.stroke();
    const g = dc.createRadialGradient(0, -r * 1.05, 2, 0, -r * 1.05, r * 0.5);
    g.addColorStop(0, '#fff7cc'); g.addColorStop(0.4, '#fb923c'); g.addColorStop(1, 'rgba(249,115,22,0)');
    dc.fillStyle = g;
    dc.beginPath(); dc.ellipse(0, -r * 1.05, r * 0.5, r * 0.3 + Math.sin(t * 8) * 2, 0, 0, Math.PI * 2); dc.fill();
    dc.fillStyle = '#5c1a06';
    dc.beginPath(); dc.ellipse(0, -r * 1.05, r * 0.3, r * 0.1, 0, 0, Math.PI * 2); dc.fill();
    eyeball(-r * 0.22, -r * 0.3, r * 0.2, '#111', lx, ly, '#f97316');
    dc.fillStyle = '#3a2a1c';
    dc.beginPath(); dc.arc(r * 0.25, -r * 0.28, r * 0.09, 0, Math.PI * 2); dc.fill();
    toothyMouth(0, r * 0.05, r * 0.7, r * 0.3, 8, '#3a0a04');
  },

  hanami(e, t, lx, ly) {
    const r = e.radius;
    dc.fillStyle = '#1c241c';
    dc.beginPath(); dc.moveTo(-r * 0.9, r * 1.1); dc.quadraticCurveTo(-r, r * 0.1, -r * 0.4, -r * 0.1); dc.lineTo(r * 0.4, -r * 0.1); dc.quadraticCurveTo(r, r * 0.1, r * 0.9, r * 1.1); dc.closePath(); dc.fill();
    dc.strokeStyle = '#e5e7eb'; dc.lineWidth = 2;
    for (const s of [-1, 1]) { dc.beginPath(); dc.arc(s * r * 0.5, r * 0.4, r * 0.25, 0, Math.PI * 2); dc.stroke(); }
    dc.fillStyle = '#f9a8d4';
    for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2 + t; dc.beginPath(); dc.arc(r * 0.65 + Math.cos(a) * 6, Math.sin(a) * 6, 5, 0, Math.PI * 2); dc.fill(); }
    dc.fillStyle = '#fef08a'; dc.beginPath(); dc.arc(r * 0.65, 0, 3, 0, Math.PI * 2); dc.fill();
    // Branches grow out of its eye sockets.
    dc.strokeStyle = '#6b3f1d'; dc.lineWidth = 5; dc.lineCap = 'round';
    for (const s of [-1, 1]) {
      dc.beginPath(); dc.moveTo(s * r * 0.18, -r * 0.6);
      dc.quadraticCurveTo(s * r * 0.55, -r * 1.1, s * r * 0.45, -r * 1.55); dc.stroke();
      dc.lineWidth = 3;
      dc.beginPath(); dc.moveTo(s * r * 0.45, -r * 1.05); dc.lineTo(s * r * 0.8, -r * 1.25); dc.stroke();
      dc.lineWidth = 5;
      dc.fillStyle = '#4ade80';
      dc.beginPath(); dc.ellipse(s * r * 0.82, -r * 1.3, 6, 3, s * 0.6, 0, Math.PI * 2); dc.fill();
      dc.beginPath(); dc.ellipse(s * r * 0.45, -r * 1.6, 6, 3, -s * 0.6, 0, Math.PI * 2); dc.fill();
    }
    dc.fillStyle = '#9ca3af';
    dc.beginPath(); dc.ellipse(0, -r * 0.5, r * 0.36, r * 0.42, 0, 0, Math.PI * 2); dc.fill();
    dc.strokeStyle = '#f3f4f6'; dc.lineWidth = 1.5;
    dc.beginPath(); dc.moveTo(-r * 0.3, -r * 0.35); dc.lineTo(r * 0.3, -r * 0.35); dc.moveTo(0, -r * 0.2); dc.lineTo(0, -r * 0.1); dc.stroke();
    dc.fillStyle = '#3f2a14';
    for (const s of [-1, 1]) { dc.beginPath(); dc.arc(s * r * 0.16, -r * 0.6, r * 0.08, 0, Math.PI * 2); dc.fill(); }
  },

  mahito(e, t, lx, ly) {
    const r = e.radius;
    if (e.mode === 'wind') dc.translate(rand(-2, 2), rand(-2, 2));
    dc.strokeStyle = '#5b6b85'; dc.lineWidth = 4; dc.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = -r * 0.55 + i * r * 0.14;
      dc.beginPath(); dc.moveTo(x, -r * 0.9);
      dc.quadraticCurveTo(x + Math.sin(t * 3 + i) * 4 - r * 0.1, -r * 0.2, x - r * 0.05 + Math.sin(t * 2 + i) * 5, r * 0.6);
      dc.stroke();
    }
    dc.fillStyle = '#1f2937';
    dc.beginPath(); dc.moveTo(-r * 0.75, r * 1.1); dc.lineTo(-r * 0.5, r * 0.25); dc.lineTo(r * 0.5, r * 0.25); dc.lineTo(r * 0.75, r * 1.1); dc.closePath(); dc.fill();
    dc.fillStyle = '#334155';
    dc.fillRect(-r * 0.2, r * 0.45, r * 0.4, r * 0.35);
    stitches(-r * 0.45, r * 0.4, r * 0.5, r * 0.95, 6);
    dc.fillStyle = '#ddd6cf';
    dc.beginPath(); dc.ellipse(0, -r * 0.35, r * 0.42, r * 0.52, 0, 0, Math.PI * 2); dc.fill();
    dc.fillStyle = '#6b7f99';
    dc.beginPath(); dc.ellipse(0, -r * 0.8, r * 0.48, r * 0.2, 0, Math.PI, 0); dc.fill();
    stitches(-r * 0.4, -r * 0.6, r * 0.38, -r * 0.05, 8);
    stitches(-r * 0.35, r * 0.0, -r * 0.05, -r * 0.4, 4);
    eyeball(-r * 0.17, -r * 0.4, r * 0.1, '#94a3b8', lx, ly);
    eyeball(r * 0.17, -r * 0.4, r * 0.1, '#2dd4bf', lx, ly);
    dc.strokeStyle = '#3b0d0d'; dc.lineWidth = 2;
    dc.beginPath(); dc.arc(0, -r * 0.2, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI); dc.stroke();
    dc.fillStyle = '#f5efe0';
    dc.beginPath(); dc.moveTo(-r * 0.15, -r * 0.08); dc.lineTo(r * 0.15, -r * 0.08); dc.lineTo(0, -r * 0.0); dc.fill();
  },
};

function drawEnemies() {
  dc = ctx;
  const t = game.time / 1000;
  for (const e of game.enemies) {
    const [sx, sy] = worldToScreen(e.x, e.y);
    const pad = e.radius * 2 + 20;
    if (sx < -pad || sx > canvas.width + pad || sy < -pad || sy > canvas.height + pad) continue;
    const player = game.player;
    const dd = dist(player.x, player.y, e.x, e.y) || 1;
    const lx = (player.x - e.x) / dd * e.face, ly = (player.y - e.y) / dd;

    // Lunge telegraph.
    if (e.mode === 'wind') {
      const len = e.isBoss ? 340 : 280;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,59,78,0.55)'; ctx.lineWidth = e.radius * 1.4;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(e.dashAng) * len, sy + Math.sin(e.dashAng) * len); ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, sy + e.radius * (e.isBoss ? 1.1 : 0.95), e.radius * 0.9, e.radius * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    if (e.isBoss) {
      const g = ctx.createRadialGradient(sx, sy, e.radius * 0.5, sx, sy, e.radius * 2.2);
      g.addColorStop(0, e.color + '55'); g.addColorStop(1, e.color + '00');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, e.radius * 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.translate(sx, sy);
    ctx.scale(e.face, 1);
    ctx.lineJoin = 'round';
    const stunned = e.stunUntil > game.time, slowed = e.slowUntil > game.time;
    // Sprite bosses tint the sprite itself for hit / stun / slow (a round overlay would look like a bubble).
    if (e.isBoss) ctx.filter = e.flash > 0 ? 'brightness(2.4)' : stunned ? 'saturate(0) brightness(1.6)' : slowed ? 'sepia(1) hue-rotate(170deg) saturate(2.5)' : 'none';
    const spriteDrawn = e.isBoss && drawBossSprite(e, t);
    ctx.filter = 'none';
    if (!spriteDrawn) (ENEMY_DRAW[e.isBoss ? e.boss : e.type] || ENEMY_DRAW.grunt)(e, t, lx, ly);
    ctx.restore();

    if (!spriteDrawn && (e.flash > 0 || stunned || slowed)) {
      ctx.save();
      ctx.globalAlpha = e.flash > 0 ? 0.55 : stunned ? 0.35 : 0.22;
      ctx.fillStyle = e.flash > 0 || stunned ? '#ffffff' : '#60a5fa';
      ctx.beginPath(); ctx.arc(sx, sy, e.radius * 1.05, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    if (e.type === 'elite') {
      const w = e.radius * 2.4, y = sy - e.radius * 1.75 - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(sx - w / 2, y, w, 5);
      ctx.fillStyle = '#d7192b';
      ctx.fillRect(sx - w / 2, y, w * clamp(e.hp / e.maxHp, 0, 1), 5);
      ctx.font = "800 11px 'Shippori Mincho B1', serif";
      ctx.textAlign = 'center';
      ctx.fillStyle = '#facc15';
      ctx.fillText(e.grade + ' ' + e.name, sx, y - 4);
    }
  }
}

// Draws a boss from its sprite sheet (feet on its shadow). Returns false if it has none / not loaded yet.
function drawBossSprite(e, t) {
  const sp = bossDef(e).sprite;
  if (!sp || !sp.ready || !sp.idle.frames.length) return false;
  if (e.mode === 'wind') dc.translate(rand(-2, 2), rand(-2, 2));
  const foot = e.radius * 1.1;
  // Single-frame sprites (Jogo) breathe with a little squash and stretch instead.
  if (sp.idle.frames.length === 1) {
    const s = Math.sin(t * 3 + e.seed) * 0.035;
    dc.translate(0, foot); dc.scale(1 + s, 1 - s); dc.translate(0, -foot);
  }
  drawSpriteFrame(dc, sp, 'idle', t + e.seed, 0, foot, 1, e.radius * 2.6);
  return true;
}

// Boss picture for conversations / the banter popup: big art if it has some, else its sprite, else the hand drawing.
function drawBossPortrait(c, e, W, H, t) {
  const b = bossDef(e);
  c.save();
  if (b.art && b.art.img) {
    const img = b.art.img, k = Math.min(W / img.width, H / img.height);
    c.imageSmoothingEnabled = true;
    c.drawImage(img, (W - img.width * k) / 2, H - img.height * k, img.width * k, img.height * k);
  } else if (b.sprite && b.sprite.ready) {
    drawSpriteFrame(c, b.sprite, 'idle', t, W / 2, H * 0.97, -1, H * 0.9); // face left, toward the player
  } else {
    const k = (H * 0.27) / e.radius;
    c.translate(W / 2, H * 0.6);
    c.scale(-k, k);
    c.lineJoin = 'round';
    dc = c;
    ENEMY_DRAW[e.boss]({ ...e, mode: 'chase', flash: 0 }, t, 1, 0.1);
    dc = ctx;
  }
  c.restore();
}

/* ===================== Boss arrival banner ===================== */
let bannerTimer = null;
function showBanner(jp, name, sub) {
  el.banner.innerHTML = `<span class="b-jp">${jp}</span><span class="b-name">${name}</span><span class="b-sub">${sub}</span>`;
  el.banner.classList.remove('hidden');
  el.banner.style.animation = 'none';
  void el.banner.offsetWidth;
  el.banner.style.animation = '';
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.banner.classList.add('hidden'), 2800);
}
