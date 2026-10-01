'use strict';
// Holds every playable character. Menu order = order of the <script> tags in index.html.
const CHARACTERS = [];
function registerCharacter(c) {
  const missing = ['id', 'name', 'sub', 'color', 'desc', 'startWeapons'].filter(k => c[k] === undefined);
  if (missing.length) { console.error('registerCharacter: missing', missing.join(', '), 'in', c.id || c.name); return; }
  if (CHARACTERS.some(x => x.id === c.id)) { console.error('registerCharacter: duplicate id', c.id); return; }
  CHARACTERS.push({ kanji: '呪', grade: 'Grade 1', hpBonus: 0, speedMult: 1, energyRegenMult: 1, domainUnlockLevel: 5, ...c });
}

// Prestige forms: an evolved version of a base character, unlocked from the menu after a win.
// Holds one form per base character id. See characters/sukuna_heian.js.
const PRESTIGE = {};
function registerPrestige(id, def) {
  const base = CHARACTERS.find(c => c.id === id);
  if (!base) { console.error('registerPrestige: no base character', id); return; }
  PRESTIGE[id] = { ...base, ...def, id, prestige: true, baseName: base.name };
}
