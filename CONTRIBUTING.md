# Contributing

Thanks for helping out! The easiest way to contribute is to add a character.

## Running the game locally

```bash
python3 -m http.server 8934
```

Open http://localhost:8934 (hard-refresh if you don't see changes). Check the browser console for errors.

## Adding a character

1. Copy `characters/_template.js` to `characters/yourname.js` and fill it in.
2. Add `<script src="characters/yourname.js"></script>` to `index.html`, after the other character scripts and before `game.js`.
3. Run the game and make sure your card appears on the menu and a run starts.

Full details are in [characters/README.md](characters/README.md). A few tips:

- Reuse existing weapons from `WEAPON_DEFS` in `game.js` via `startWeapons` and `weapons`.
- A sprite is optional. Without one your character shows as a coloured circle, which is fine for a first PR.
- Keep `id` unique, lowercase, with no spaces.

## Adding sprites and art

- Only submit art you made or have permission to use.
- **Credit the artist** in the "Credits" section of `README.md` with a link to their page.
- Put sheets in `Icons/` and keep files reasonably small.

## Other contributions

- **New weapons, domains, enemies or engine changes** touch `game.js`. Open an issue first to discuss, and keep those PRs separate from character PRs.
- **Bug reports:** include your browser, steps to reproduce, and any console errors.

## Pull requests

- One character or one change per PR.
- Keep the existing code style: plain JavaScript, no build tools or dependencies.
- Describe what you changed and how you tested it.
- Be kind and respectful in reviews and discussions.
