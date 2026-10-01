'use strict';
// The prologue's partner (Takaba, Kenjaku, Gojo...) tags along during the run. They pop up in the top-right
// corner and comment on what's happening; your sorcerer answers in the usual bottom-left popup.
//
// COMPANION_LINES[speakerKey][event] is a list of lines. A line is a string, or [text, { charId: reply }]
// for a reply written for a specific sorcerer. Lines without one get a random pick from REPLIES.
// Events: start, newTech, domain, lowHp, elite, streak, boss, bossDown, idle.

let RUN_COMPANION = null; // SPEAKERS key of this run's companion, set by the prologue

// Face crop = [x, y, w, h] as fractions of the panel image (trimmed to a centred square).
const COMPANION_FACES = {
  GOJO:    { panel: 'gj_win',       crop: [0.02, 0.3, 0.65, 0.45] },
  SUKUNA:  { panel: 'sk_disgraced', crop: [0.23, 0, 0.5, 1] },
  TOJI:    { panel: 'toji',         crop: [0.2, 0, 0.5625, 1] },
  TAKABA:  { panel: 'takaba',       crop: [0, 0, 1, 1] },
  KENJAKU: { panel: 'kenjaku',      crop: [0.22, 0, 0.6, 0.6] },
};

const REPLIES = {
  itadori: ['Silence, insect.', 'Hmph. Spare me the commentary.', 'Talk less. Watch more.', 'Tch. Keep talking and I\'ll cut your tongue out.', 'Hah. Amusing.'],
  gojo:    ['Ha! You\'re welcome.', 'Yeah, yeah. I know, I\'m awesome.', 'Relax. I\'ve got this.', 'Wow, thanks for the feedback.', 'Mm-hm. Noted.'],
  megumi:  ['...Please just stay out of the way.', 'I\'m trying to focus.', 'Not now.', '...Whatever.', 'I heard you the first time.'],
  default: ['Noted.', 'Focus.', 'Not now.', '...'],
};

const COMPANION_LINES = {
  GOJO: {
    start:   ['Yo, Sukuna! Don\'t mind me, I\'m just the audience.', 'Try not to blow up the whole district. Only half.'],
    newTech: ['Oooh, a new trick. Cute. Show-off.'],
    domain:  ['A Domain? Ugh, I hate the smell of old bones.'],
    lowHp:   ['Hey, you\'re bleeding. That\'s a first. I\'d take a picture.', 'Careful! Losing to curses would be so embarrassing.'],
    elite:   ['Is that one of your fingers? It looks lonely.'],
    streak:  ['I lost count. Show-off.', 'That\'s a lot of dead curses. Who\'s the strongest now? Me. But still.'],
    boss:    ['Special Grade on the way! Want me to hold your coat?', 'Oh, this one has personality. Make him cry.'],
    bossDown:[['Not bad. I\'d have done it faster. But not bad.', { itadori: 'Hmph. Say that again after you\'ve bled for it.' }], 'Nice! Do it again, I wasn\'t looking.'],
    idle:    ['Is it too late for a snack? There\'s a konbini three blocks away.', 'Yaga\'s going to be so mad about this mess.', ['Hey, Sukuna, what\'s your favourite sweet? Mine\'s all of them.', { itadori: 'I eat souls, brat. Not dessert.' }]],
  },
  SUKUNA: {
    start:   ['Hmph. Two lives, one body, and you still walk toward me.', 'Entertain me, sorcerer.'],
    newTech: ['Hm. A small improvement. Don\'t let it go to your head.'],
    domain:  [['A Domain? How quaint. Mine has better decor.', { gojo: 'Yours is a shrine of bones. Mine\'s the whole universe. Decor wins.' }]],
    lowHp:   ['Dying already? I\'d hate to lose my favourite toy.', 'Is this what weakness looks like? Fascinating.'],
    elite:   ['That one reeks of my fingers. Take it back for me.'],
    streak:  ['A pile of corpses. Finally something I can respect.', 'Keep going. I\'m almost impressed.'],
    boss:    ['Oh, now it gets interesting. Disaster-grade?', 'Another Special Grade. Let me watch you bleed.'],
    bossDown:['Not bad. For a mortal.', ['Hah! Even I felt that one.', { megumi: '...I hate that you\'re smiling.' }]],
    idle:    ['Boring. Hurry up.', 'This city smells of fear. Delicious.', 'Do keep going. I\'m taking notes.'],
  },
  TOJI: {
    start:   ['Don\'t expect help. I\'m only here for the paycheck.', 'Heard there\'d be a fight. Let\'s see if you\'re worth the price.'],
    newTech: ['More tricks. Tricks never beat a good knife.'],
    domain:  ['Fancy barriers. Never needed one.'],
    lowHp:   ['You\'re bleeding. Learn to dodge.', ['Sloppy. Keep your guard up.', { megumi: '...I know. I don\'t need you telling me.' }]],
    elite:   ['Big one. Aim for the soft spot.'],
    streak:  ['Not bad. Not good either.', 'The count\'s climbing. Anyone still paying?'],
    boss:    ['Special Grade. Somebody\'s getting a bonus.', 'Tch. Expensive.'],
    bossDown:[['Clean work. Don\'t let it go to your head.', { megumi: '...I didn\'t do it for your approval.' }], 'Huh. Maybe you\'re worth the price.'],
    idle:    ['This job\'s slow. Anyone got a horse tip?', 'Quiet night. Too quiet.', 'I\'d bet on myself. Always.'],
  },
  TAKABA: {
    start:   ['Okay okay okay, you fight, I commentate! Deal?', 'Hey, is there a gift shop? No? Disappointing.'],
    newTech: ['Ooooh! New move! Does it come with a catchphrase?'],
    domain:  [['Whoa, whoa! Is that legal?! Can I get a ticket?', { gojo: 'Front row seats are free. Enjoy.' }]],
    lowHp:   ['Hey, hey! You okay?! Do I need to do my stand-up for morale?', 'Careful! I\'m not paid to carry anyone!'],
    elite:   ['That one\'s HUGE. I\'ll stand way back here. Very strategic.'],
    streak:  ['That\'s like fifty! Okay, five hundred! I\'m bad at math!', 'Who needs a crowd when you\'ve got a body count?'],
    boss:    ['Oh no. Oh no no no. That one has a TITLE.', 'Big scary boss! Quick, say something cool!'],
    bossDown:[['YEAAAH! Encore! Encore!', { gojo: 'Thank you, thank you. I\'ll be here all night.', megumi: '...Please don\'t encourage him.' }], 'Did you see that?! I saw that!'],
    idle:    ['So, uh, how many curses is too many curses?', 'Fun fact: I\'m out of jokes. Not really.', 'I\'d tell a joke but the curses don\'t laugh.'],
  },
  KENJAKU: {
    start:   ['Go on. Show me what a thousand years of waiting has made of you.', 'Don\'t mind me. I\'m only taking notes.'],
    newTech: ['Interesting. Another variable in the experiment.'],
    domain:  ['A Domain. Everything proceeds according to plan.'],
    lowHp:   ['So fragile. Don\'t die yet. You still have a role to play.', 'Hm. Tell me if you need to be wrapped up again.'],
    elite:   ['That one will make a fine specimen.'],
    streak:  ['Impressive. Truly. Keep going.', 'The numbers fit the model.'],
    boss:    ['A Disaster-class curse. How convenient.', ['Ah, one of my children. Try not to hurt him too much.', { gojo: 'Your kids are the worst. Have you tried a hug?' }]],
    bossDown:['A shame. But he served his purpose.', 'Splendid. The data is delightful.'],
    idle:    ['Time is the one thing I have in abundance.', 'Every battle is another page in the plan.', 'Do continue. I\'m enjoying this.'],
  },
};

// How often a companion jumps in on an event (when it would otherwise be the sorcerer's own bark).
const COMPANION_CHANCE = { start: 1, boss: 1, bossDown: 0.85, lowHp: 0.7, domain: 0.6, newTech: 0.5, elite: 0.6, streak: 0.7, idle: 0.8 };

const comp = {
  el: document.getElementById('companion'),
  face: document.getElementById('compFace'),
  name: document.getElementById('compName'),
  text: document.getElementById('compText'),
  imgs: {},
};

function companionFaceImg(key) {
  const f = COMPANION_FACES[key];
  if (!f) return null;
  if (!comp.imgs[key]) {
    const i = new Image();
    i.onload = () => { if (RUN_COMPANION === key) drawCompanionFace(key); }; // redraw if the popup beat the download
    i.src = PANELS[f.panel];
    comp.imgs[key] = i;
  }
  return comp.imgs[key];
}

function drawCompanionFace(key) {
  const f = COMPANION_FACES[key], img = companionFaceImg(key), S = comp.face.width;
  const c = comp.face.getContext('2d');
  c.clearRect(0, 0, S, S);
  if (!img || !img.complete || !img.naturalWidth) return;
  const [fx, fy, fw, fh] = f.crop;
  const w = fw * img.naturalWidth, h = fh * img.naturalHeight, side = Math.min(w, h);
  c.imageSmoothingEnabled = true;
  c.drawImage(img, fx * img.naturalWidth + (w - side) / 2, fy * img.naturalHeight + (h - side) / 2, side, side, 0, 0, S, S);
}

// Returns true if the companion took this event (so the sorcerer shouldn't also bark it).
// Low-priority events skip if anyone spoke recently, same idea as sayLine.
function companionBark(event, lowPriority) {
  if (!game || !RUN_COMPANION) return false;
  const pool = COMPANION_LINES[RUN_COMPANION] && COMPANION_LINES[RUN_COMPANION][event];
  if (!pool || !pool.length) return false;
  if (Math.random() > (COMPANION_CHANCE[event] ?? 0.6)) return false;
  if (lowPriority && (game.barkQueue.length || game.time - (game.lastCompAt ?? -1e9) < 14000 || game.time - game.lastBarkAt < 5000)) return false;

  const pick = choice(pool);
  const [text, replies] = Array.isArray(pick) ? pick : [pick, null];
  const cid = game.character.id;
  const reply = (replies && replies[cid]) || choice(REPLIES[cid] || REPLIES.default);

  const sp = SPEAKERS[RUN_COMPANION];
  comp.name.textContent = sp.name;
  comp.text.textContent = text;
  comp.el.style.setProperty('--c', sp.color);
  drawCompanionFace(RUN_COMPANION);
  comp.el.classList.remove('hidden');
  comp.el.style.animation = 'none'; void comp.el.offsetWidth; comp.el.style.animation = '';
  game.compUntil = game.time + 2200 + text.length * 45;
  game.compShown = true;
  game.lastCompAt = game.time;
  // The sorcerer answers a beat later in their own popup.
  game.delayed.push({ t: 1400 + text.length * 22, fn: () => sayLine('p', reply) });
  return true;
}

function updateCompanion() {
  if (game.compShown && game.time > game.compUntil) { comp.el.classList.add('hidden'); game.compShown = false; }
}

function hideCompanion() { comp.el.classList.add('hidden'); }
