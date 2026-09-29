'use strict';
// Holds every playable character. Menu order = order of the <script> tags in index.html.
const CHARACTERS = [];
function registerCharacter(c) {
  const missing = ['id', 'name', 'sub', 'color', 'desc', 'startWeapons'].filter(k => c[k] === undefined);
  if (missing.length) { console.error('registerCharacter: missing', missing.join(', '), 'in', c.id || c.name); return; }
  if (CHARACTERS.some(x => x.id === c.id)) { console.error('registerCharacter: duplicate id', c.id); return; }
  CHARACTERS.push({ hpBonus: 0, speedMult: 1, energyRegenMult: 1, domainUnlockLevel: 5, ...c });
}
