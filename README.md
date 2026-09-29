# Infinite Curse

An endless cursed-technique survival roguelike that runs in the browser. Pick a sorcerer, exorcise curses, level up, and unlock your domain expansion.

## Play

No build step or dependencies. Serve the folder with any static server:

```bash
python3 -m http.server 8934
```

Then open http://localhost:8934.

## Controls

| Action | Key |
| --- | --- |
| Move | WASD / Arrow keys |
| Domain Expansion (when meter is full) | Space |
| Pause | Esc |
| Pick character / upgrade | Number keys or click |

## Characters

| Character | Style |
| --- | --- |
| King of Curses | Dismantle, Cleave, Fuga. Domain: Malevolent Shrine |
| Shikigami User | Ten Shadows summons. Domain: Chimera Shadow Garden |
| Limitless | Infinity, Blue, Red, Hollow Purple. Domain: Infinite Void |

**Want to add your own?** See [CONTRIBUTING.md](CONTRIBUTING.md). It only takes one small file.

## Project layout

```
index.html        page + menu/HUD markup
style.css         styling
game.js           game engine, weapons, enemies, rendering
characters/       one file per playable character (add yours here)
Icons/            sprite sheets
```

## Credits

Character sprite sheets (Sukuna, Megumi, Gojo) are by **[finhj](https://www.deviantart.com/finhj)** on DeviantArt. All rights to those sprites belong to the artist. Please go check out their work and support them.

This is a non-commercial fan project. Jujutsu Kaisen and its characters belong to Gege Akutami / Shueisha.
