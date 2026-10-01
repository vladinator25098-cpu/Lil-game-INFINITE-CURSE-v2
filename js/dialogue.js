'use strict';
// Persona-style boss intro conversations. Shown when a Special Grade boss arrives.
// Lines are [speaker, text]: 'p' = the player's character, 'b' = the boss.
// Keyed by boss id, then character id. Characters without their own lines use `default`.
// Want lines for your character? Add a `yourid: [...]` entry under each boss.

const BOSS_DIALOGUE = {
  jogo: {
    itadori: [
      ['b', 'That presence... Sukuna? So the rumours were true. You\'ve finally woken up!'],
      ['p', 'A little volcano, come to pay tribute. How thoughtful.'],
      ['b', 'Tribute? I came to bring back the age of curses — with you leading it!'],
      ['p', 'Then entertain me. Land a single hit, and I\'ll consider it.'],
      ['b', 'Hah! I\'ll burn this whole district to prove I\'m worthy!'],
    ],
    megumi: [
      ['b', 'A Ten Shadows brat? Where\'s Gojo? I came to burn someone worth burning.'],
      ['p', 'He\'s busy. You\'ll have to settle for me.'],
      ['b', 'SETTLE?! You\'ll be ash before your dogs even bark!'],
      ['p', '...Divine Dogs. Let\'s go.'],
    ],
    gojo: [
      ['b', 'Satoru Gojo! I\'ve waited for this. Today the strongest falls!'],
      ['p', 'Oh, the volcano guy. Didn\'t we already do this?'],
      ['b', 'DON\'T look down on me! My flames will reach you this time!'],
      ['p', 'Sure. Throw everything you\'ve got. I\'m not going anywhere.'],
    ],
    default: [
      ['b', 'Another sorcerer who thinks they can stand against a Special Grade?'],
      ['p', 'I\'m here to exorcise you.'],
      ['b', 'Then burn, and let your ashes tell the others!'],
    ],
  },

  hanami: {
    itadori: [
      ['b', 'You stand on soil the earth wishes to reclaim. Humans have taken enough.'],
      ['p', 'Humans? Don\'t lump me in with those insects.'],
      ['b', 'Then step aside, King of Curses. Our quarrel is with them.'],
      ['p', 'Your quarrel bores me. And you\'re in my way.'],
      ['b', '...Then the forest will take you as well.'],
    ],
    megumi: [
      ['b', 'Your shikigami are children of nature. Why fight for those who poison it?'],
      ['p', 'I don\'t fight for everyone. I just choose who I save.'],
      ['b', 'Selfish, and yet honest. I will bury you gently.'],
      ['p', 'Not today.'],
    ],
    gojo: [
      ['b', 'Even you cannot hold back the earth forever, sorcerer.'],
      ['p', 'Forever\'s a long time. I\'ll just handle today.'],
      ['b', 'Your arrogance is a weed. I will pull it out by the roots.'],
      ['p', 'Cute. Come on then, before I get bored.'],
    ],
    default: [
      ['b', 'Humans rot the earth they walk on. You are no different.'],
      ['p', 'Maybe. But I\'m still not letting you through.'],
      ['b', 'Then return to the soil.'],
    ],
  },

  mahito: {
    itadori: [
      ['b', 'Ooh, the King himself! Can I touch your soul? Just a little poke?'],
      ['p', 'Lay a finger on my soul and you lose the hand. Then the rest of you.'],
      ['b', 'Scary! Fine, I\'ll reshape everyone around you instead.'],
      ['p', 'Do as you like, patchwork. Just know your place.'],
    ],
    megumi: [
      ['b', 'Shadows! Cute. Do your little animals have souls? Can I change them?'],
      ['p', 'Keep your hands off them.'],
      ['b', 'Then what do you treasure? Let\'s find it and make it ugly.'],
      ['p', 'You talk too much.'],
    ],
    gojo: [
      ['b', 'Hey, hey, the strongest sorcerer! Is your soul as pretty as your eyes?'],
      ['p', 'Wanna find out? You\'ll have to touch me first.'],
      ['b', '...Huh. My hand just stops. What IS that?'],
      ['p', 'Infinity. Now — how fast can you run?'],
    ],
    default: [
      ['b', 'A new toy! The soul comes before the body, you know. Let me show you.'],
      ['p', 'Stay back.'],
      ['b', 'Aw, don\'t be like that. Let\'s see what shape you really are!'],
    ],
  },
};

/* ===================== Dialogue player ===================== */
const dlg = {
  overlay: document.getElementById('dialogue-overlay'),
  left: document.getElementById('dlgLeft'),
  right: document.getElementById('dlgRight'),
  player: document.getElementById('dlgPlayer'),
  boss: document.getElementById('dlgBoss'),
  name: document.getElementById('dlgName'),
  text: document.getElementById('dlgText'),
  box: document.getElementById('dlgBox'),
  lines: [], idx: 0, shown: 0, typer: null, raf: 0, enemy: null, onDone: null,
};

function startBossDialogue(e, onDone) {
  const ch = game.character;
  const byBoss = BOSS_DIALOGUE[e.boss];
  const lines = byBoss && (byBoss[ch.id] || byBoss.default);
  if (!lines || !lines.length) { onDone && onDone(); return; }
  state = 'dialogue';
  Object.assign(dlg, { lines, idx: 0, enemy: e, onDone });
  dlg.overlay.style.setProperty('--pc', ch.color);
  dlg.overlay.style.setProperty('--bc', e.color);
  // Characters with portrait art get a big square bust; others a tall full-body sprite.
  const bust = !!(ch.sprite && ch.sprite.portrait);
  dlg.left.classList.toggle('bust', bust);
  dlg.player.width = bust ? 400 : 260;
  dlg.player.height = 400;
  dlg.overlay.classList.remove('hidden');
  dlg.overlay.classList.remove('leaving');
  showDialogueLine();
  cancelAnimationFrame(dlg.raf);
  dlg.raf = requestAnimationFrame(drawDialoguePortraits);
}

function showDialogueLine() {
  const [who, txt] = dlg.lines[dlg.idx];
  const isP = who === 'p';
  const ch = game.character;
  dlg.name.textContent = isP ? (ch.speaker || ch.name).toUpperCase() : dlg.enemy.name;
  dlg.overlay.classList.toggle('p-speaks', isP);
  dlg.overlay.classList.toggle('b-speaks', !isP);
  // Re-trigger the box "slam" animation for each line.
  dlg.box.style.animation = 'none';
  void dlg.box.offsetWidth;
  dlg.box.style.animation = '';
  dlg.text.textContent = '';
  dlg.shown = 0;
  clearInterval(dlg.typer);
  dlg.typer = setInterval(() => {
    dlg.shown++;
    dlg.text.textContent = txt.slice(0, dlg.shown);
    if (dlg.shown >= txt.length) { clearInterval(dlg.typer); dlg.typer = null; }
  }, 22);
}

function advanceDialogue() {
  if (state !== 'dialogue') return;
  if (dlg.typer) {
    clearInterval(dlg.typer); dlg.typer = null;
    dlg.text.textContent = dlg.lines[dlg.idx][1];
    return;
  }
  dlg.idx++;
  if (dlg.idx >= dlg.lines.length) endBossDialogue();
  else showDialogueLine();
}

function endBossDialogue() {
  clearInterval(dlg.typer); dlg.typer = null;
  cancelAnimationFrame(dlg.raf);
  dlg.overlay.classList.add('hidden');
  const done = dlg.onDone;
  dlg.onDone = null;
  resumeAfterOverlay();
  if (done) done();
}

function drawDialoguePortraits(ts) {
  if (state !== 'dialogue') return;
  const t = ts / 1000;
  const ch = game.character;
  const pc = dlg.player.getContext('2d');
  pc.clearRect(0, 0, dlg.player.width, dlg.player.height);
  const sp = ch.sprite;
  const r = sp && sp.portrait;
  // Portrait from its own image file, or cut from the (keyed) sprite sheet.
  const pImg = r && (r.src ? r.img : sp.ready && sp.sheet);
  if (pImg) {
    const edge = r.src ? 0 : 2; // sheet regions: skip the 1px region border
    const x0 = r.x0 + edge, y0 = r.y0 + edge, w = r.x1 - r.x0 - edge * 2, h = r.y1 - r.y0 - edge;
    const k = Math.min(dlg.player.width / w, dlg.player.height / h);
    const bob = Math.sin(t * 2) * 3;
    pc.imageSmoothingEnabled = true;
    pc.drawImage(pImg, x0, y0, w, h, (dlg.player.width - w * k) / 2, dlg.player.height - h * k + bob + 4, w * k, h * k);
  } else if (sp && sp.ready) {
    drawSpriteFrame(pc, sp, 'idle', t, dlg.player.width / 2, dlg.player.height - 6, 1, dlg.player.height - 24);
  } else {
    pc.fillStyle = ch.color;
    pc.beginPath(); pc.arc(dlg.player.width / 2, dlg.player.height / 2, 70, 0, Math.PI * 2); pc.fill();
  }
  const bc = dlg.boss.getContext('2d');
  const W = dlg.boss.width, H = dlg.boss.height, e = dlg.enemy;
  bc.clearRect(0, 0, W, H);
  drawBossPortrait(bc, e, W, H, t);
  dlg.raf = requestAnimationFrame(drawDialoguePortraits);
}

dlg.overlay.addEventListener('click', advanceDialogue);

/* ===================== In-game banter ===================== */
// Short lines that pop up bottom-left during a run without pausing it.
// Keyed by character id (`default` for characters without their own), then by event:
//   start, newTech, domain, lowHp, elite, streak, bossHurt (reply to a hurt boss), bossDown, idle
// Each event picks one line at random. Add a `yourid: { ... }` entry to give your character a voice.
const BARKS = {
  itadori: {
    start: ['Hmph. Vermin, as far as the eye can see.', 'Let\'s see if any of you can make this interesting.', 'Bow, or be carved. Your choice.', 'Stand proud. You\'re strong. Well, you\'re not. But stand proud.'],
    newTech: ['Hm. That will do.', 'Another toy. Good.', 'Hah. Even my fingers are jealous.'],
    domain: ['Domain Expansion. Kneel.', 'Malevolent Shrine. Stand still and be cut.', 'No barrier, no walls. Cute, isn\'t it?', 'Let me cook.'],
    lowHp: ['...Tch. Annoying.', 'Don\'t get cocky, trash.', 'This body is a rental. I don\'t care about the damage deposit.', 'Hm. The brat is whining in my head again.'],
    elite: ['A Finger Bearer? It reeks of me.', 'Ah. Something with a little more meat.', 'Is that one of my fingers? Return it. Preferably by dying.'],
    streak: ['Is that all? I\'ve barely started.', 'Weak. Every last one.', 'I\'d call that a massacre, but a massacre implies a fight.', 'Twenty fingers and not one of you can keep up.'],
    bossHurt: ['Is that the best a Special Grade can do?', 'Finally, this is getting interesting.', 'Flames? Please. Let me show you flames.'],
    bossDown: ['Know your place.', 'Disappointing. Next.', 'Disgraced one, huh? That title suits you better.'],
    idle: ['How boring.', 'Fools, crawling to their own funerals.', 'Hah. Run, if you like. It changes nothing.', 'I\'m hungry. Somebody fetch me a meal. A human one, preferably.', 'Gojo Satoru isn\'t here. Shame. I was in a good mood.'],
  },
  megumi: {
    start: ['...Let\'s get this done.', 'Stay sharp. There\'s a lot of them.', 'Ten Shadows. Ready.', 'I\'m not a good person. I\'ll just save the ones I choose to. Starting with me.'],
    newTech: ['Another shikigami tamed.', 'That should help.', 'Nue, try not to electrocute me this time.'],
    domain: ['Domain Expansion: Chimera Shadow Garden.', 'Sink.', 'No barrier. The shadows are the barrier. Don\'t ask me how it works.'],
    lowHp: ['Damn... I can\'t fall here.', 'Need to pull back... no. Keep going.', 'Never mind. I\'ll just do something reckless.', 'I\'ve had enough... no. Not yet.'],
    elite: ['A Grade 1... careful.', 'That one\'s dangerous. Dogs, flank it.', 'Why is it always the big ones?'],
    streak: ['They just keep coming.', 'This isn\'t ending any time soon.', 'Gojo-sensei says to relax. Gojo-sensei is not here.'],
    bossHurt: ['Not yet. I\'m not done.', 'Then I\'ll go all out.', 'With this treasure, I summon... something that won\'t kill me. Hopefully.'],
    bossDown: ['...It\'s over.', 'Exorcised. Barely.', 'Tell Gojo-sensei I handled it. Don\'t tell him how.'],
    idle: ['Where are they all coming from?', 'Gojo-sensei would make this look easy.', 'Don\'t think. Just keep moving.', 'Toad, stop licking things.', 'Round Deer, please heal faster. I\'m begging.', 'Tsumiki would\'ve had a plan by now.'],
  },
  gojo: {
    start: ['Alright, let\'s make this quick. I\'ve got dinner plans.', 'Don\'t worry. I\'m the strongest.', 'Wow, that\'s a lot of curses. Cute.', 'Would I lose? Nah.'],
    newTech: ['Ooh, nice.', 'Limitless keeps on giving.', 'Oh? Did I just get stronger? Impossible. I was already the strongest.'],
    domain: ['Domain Expansion. Infinite Void.', 'Welcome to my world.', 'Please enjoy this complimentary infinite information.'],
    lowHp: ['Huh. I actually felt that.', 'Okay, okay. Getting serious now.', 'Throughout Heaven and Earth... I alone am the honored one. Probably.', 'Is this what an HP bar feels like? Gross.'],
    elite: ['A Finger Bearer? Someone\'s been careless.', 'Oh, a big one.'],
    streak: ['Is that all? I\'m barely warmed up.', 'Somebody keep count for me.', 'Am I the strongest because I\'m Gojo? Or am I Gojo because I\'m the strongest?'],
    bossHurt: ['Getting angry? Don\'t take it personally.', 'That\'s the spirit. Still not enough, though.'],
    bossDown: ['That\'s it? Thanks for coming.', 'Too easy. Next!', 'Nah, I\'d win.'],
    idle: ['I could do this blindfolded. Oh, wait.', 'The Six Eyes see everything, you know.', 'Someone get me something sweet after this.', 'Yaga would say I\'m being irresponsible. He\'s right.', 'Hey, Megumi, remind me to bring souvenirs.'],
  },
  default: {
    start: ['Here they come.'],
    domain: ['Domain Expansion!'],
    lowHp: ['I can\'t go down here...'],
    elite: ['That one looks strong.'],
    bossHurt: ['Keep pushing!'],
    bossDown: ['Exorcised.'],
  },
};

// What a boss shouts when it drops below half HP (the player answers with `bossHurt`).
const BOSS_BARKS = {
  jogo: ['Why won\'t you BURN?!', 'I\'ll turn you to ash if it\'s the last thing I do!'],
  hanami: ['Even trampled, the forest grows back.', 'You only make the earth angrier.'],
  mahito: ['Ha! That actually hurt! Let\'s keep playing!', 'Ooh, your soul is shaking. I love it!'],
};

const bark = {
  el: document.getElementById('bark'),
  face: document.getElementById('barkFace'),
  name: document.getElementById('barkName'),
  text: document.getElementById('barkText'),
};

// Queue a line. who: 'p' for the player's character, or a boss enemy object.
// Low-priority lines are dropped if someone spoke recently, so it never gets spammy.
function sayLine(who, text, lowPriority) {
  if (!game || !text) return;
  if (lowPriority && (game.barkQueue.length || game.time - game.lastBarkAt < 9000)) return;
  game.barkQueue.push({ who, text });
}

function playerBark(event, lowPriority, chance) {
  if (!game || (chance !== undefined && Math.random() > chance)) return;
  if (companionBark(event, lowPriority)) return; // the prologue partner takes it; the sorcerer answers
  const set = BARKS[game.character.id] || BARKS.default;
  const lines = set[event] || BARKS.default[event];
  if (lines && lines.length) sayLine('p', choice(lines), lowPriority);
}

function bossBark(e) {
  const lines = BOSS_BARKS[e.boss];
  if (lines) sayLine(e, choice(lines));
}

function updateBarks(dt) {
  const showing = game.barkUntil > game.time;
  if (!showing && game.barkShown) { bark.el.classList.add('hidden'); game.barkShown = false; }
  // Ambient chatter every so often.
  game.idleBarkT -= dt;
  if (game.idleBarkT <= 0) { playerBark('idle', true); game.idleBarkT = rand(40000, 60000); }
  if (showing || !game.barkQueue.length) return;
  const { who, text } = game.barkQueue.shift();
  showBark(who, text);
  game.barkUntil = game.time + 1600 + text.length * 45;
  game.lastBarkAt = game.time;
  game.barkShown = true;
}

function showBark(who, text) {
  const isP = who === 'p';
  const ch = game.character;
  bark.name.textContent = isP ? (ch.speaker || ch.name).toUpperCase() : who.name;
  bark.text.textContent = text;
  bark.el.classList.toggle('boss', !isP);
  bark.el.style.setProperty('--c', isP ? ch.color : who.color);
  // Face: the character's portrait / sprite, or the boss drawing.
  const c = bark.face.getContext('2d'), S = bark.face.width;
  c.clearRect(0, 0, S, S);
  if (isP) {
    const sp = ch.sprite, r = sp && sp.portrait;
    const img = r && (r.src ? r.img : sp.ready && sp.sheet);
    if (img) {
      // Head-and-shoulders: the top ~70% of the bust art.
      const w = r.x1 - r.x0, h = (r.y1 - r.y0) * 0.72, k = S / Math.max(w * 0.8, h);
      c.imageSmoothingEnabled = true;
      c.drawImage(img, r.x0 + w * 0.1, r.y0 + 2, w * 0.8, h, (S - w * 0.8 * k) / 2, S - h * k, w * 0.8 * k, h * k);
    } else if (sp && sp.ready) {
      drawSpriteFrame(c, sp, 'idle', 0, S / 2, S * 1.55, 1, S * 1.6); // zoom in on the upper body
    } else {
      c.fillStyle = ch.color; c.beginPath(); c.arc(S / 2, S / 2, S * 0.35, 0, Math.PI * 2); c.fill();
    }
  } else {
    // Zoom in on the upper body: draw at 1.6x and show the top-centre square.
    c.save();
    c.translate(-S * 0.3, 0);
    drawBossPortrait(c, who, S * 1.6, S * 1.6, game.time / 1000);
    c.restore();
  }
  // Restart the slide-in animation.
  bark.el.classList.remove('hidden');
  bark.el.style.animation = 'none';
  void bark.el.offsetWidth;
  bark.el.style.animation = '';
}

function hideBarks() {
  bark.el.classList.add('hidden');
  hideCompanion();
  hidePanel();
}

/* ---------- Manga-panel cut-ins ----------
   A character can define `panels: { start, domain, crazy, win, death }`, each { src, cap, tilt? }.
   They slam in as a framed manga panel for a couple of seconds without pausing the game. */
const panel = {
  el: document.getElementById('panel'),
  img: document.getElementById('panelImg'),
  cap: document.getElementById('panelCap'),
  timer: 0,
};
const panelImgs = {};

function preloadPanels(ch) {
  for (const p of Object.values(ch.panels || {})) {
    if (!panelImgs[p.src]) { const i = new Image(); i.src = p.src; panelImgs[p.src] = i; }
  }
}

function showPanel(key, ms = 2600) {
  const p = game && game.character.panels && game.character.panels[key];
  if (!p) return;
  panel.img.src = p.src;
  panel.cap.textContent = p.cap || '';
  panel.el.style.setProperty('--tilt', (p.tilt ?? -3) + 'deg');
  panel.el.classList.remove('hidden');
  panel.el.style.animation = 'none';
  void panel.el.offsetWidth;
  panel.el.style.animation = '';
  clearTimeout(panel.timer);
  panel.timer = setTimeout(hidePanel, ms);
}

// Like showPanel, but only the first time per run.
function showPanelOnce(key, ms) {
  if (!game) return;
  game.panelsSeen = game.panelsSeen || {};
  if (game.panelsSeen[key]) return;
  game.panelsSeen[key] = true;
  showPanel(key, ms);
}

function hidePanel() {
  clearTimeout(panel.timer);
  panel.el.classList.add('hidden');
}
