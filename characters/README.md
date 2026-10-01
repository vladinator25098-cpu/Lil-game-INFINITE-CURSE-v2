# Adding a character

1. Copy `_template.js` to `characters/yourname.js` and fill it in.
2. Add `<script src="characters/yourname.js"></script>` in `index.html`, below the other
   character scripts and above `game.js`. Menu order follows script order.
3. (Optional) put a sprite sheet in `assets/sprites/characters/` and point `sprite.src` at it.
4. Run the game (`python3 -m http.server` in this folder) and check your card shows up.

Your character can reuse any weapon in `WEAPON_DEFS` (`game.js`) via `startWeapons`
and `weapons`. Brand-new weapons/domains need code in `game.js` — open a separate PR for those.

Without a `sprite` the character shows as a coloured circle, which is fine for a first PR.
Check `itadori.js`, `megumi.js` and `gojo.js` for real examples.

## Manga-panel cut-ins (optional)

Give your character a `panels` object to have framed panels slam in during a run (see `gojo.js`):

```js
panels: {
  start:  { src: 'assets/panels/yourname/panel.jpg', cap: 'Caption under the panel' },  // run begins
  domain: { src: '...', cap: '...' },   // Domain Expansion
  crazy:  { src: '...', cap: '...' },   // first Hollow Purple / first time at low HP
  fuga:   { src: '...', cap: '...' },   // first Fuga arrow (King of Curses)
  win:    { src: '...', cap: '...' },   // victory
  death:  { src: '...', cap: '...' },   // shown on the game-over screen
}
```
Every key is optional. `tilt` (degrees) is an optional per-panel rotation.

## Prestige forms

A base character can have an evolved form unlocked from the menu after a win. Call `registerPrestige('baseid', { ... })` after the base character is registered (see `sukuna_heian.js`). The object overrides any field of the base character and adds `cost`, `perks` (shown on the reveal screen), an optional `prestigeScene` (cutscene panel and captions), and optionally `dash: { dist, cd, dur }` (SHIFT dash) and `parry` (guard chance). A `sprite` with an `atlas` uses pre-sliced frames (see `js/heian.js`) instead of the row-scanning loader.
