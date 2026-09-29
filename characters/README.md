# Adding a character

1. Copy `_template.js` to `characters/yourname.js` and fill it in.
2. Add `<script src="characters/yourname.js"></script>` in `index.html`, below the other
   character scripts and above `game.js`. Menu order follows script order.
3. (Optional) put a sprite sheet in `Icons/` and point `sprite.src` at it.
4. Run the game (`python3 -m http.server` in this folder) and check your card shows up.

Your character can reuse any weapon in `WEAPON_DEFS` (`game.js`) via `startWeapons`
and `weapons`. Brand-new weapons/domains need code in `game.js` — open a separate PR for those.

Without a `sprite` the character shows as a coloured circle, which is fine for a first PR.
Check `itadori.js`, `megumi.js` and `gojo.js` for real examples.
