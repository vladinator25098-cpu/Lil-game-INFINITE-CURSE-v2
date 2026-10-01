# Infinite Curse

An endless cursed-technique survival roguelike that runs in the browser. Pick a sorcerer, exorcise curses, level up, and unlock your domain expansion.

## Open for everyone

I'm happy for people to use this project however they like: play it, fork it, build on it, or make your own version. Contributions are very welcome, whether that's new characters, maps, weapons, enemies or fixes. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## Play

No build step or dependencies. Serve the folder with any static server:

```bash
python3 -m http.server 8934
```

Then open http://localhost:8934.

## Shibuya Station Incident (mode)

Pick **Mode: Shibuya Station Incident** on the menu. Instead of the endless field you fight down five floors of Shibuya Station, joined by escalators:

| Floor | Objective | Unlocks |
| --- | --- | --- |
| Scramble Crossing | Exorcise 12 curses to break the veil | Station entrance |
| B1F Concourse | Exorcise 22 curses | Escalator to B2F |
| B2F Platforms | Cross the platform (through the trains), defeat Jogo | Escalator to B3F |
| B3F Tunnel Line | Reach the middle platform, defeat Hanami | Escalator to B5F |
| B5F Sealed Platform | Defeat Mahito | Ending |

Walk onto a glowing escalator to change floor (sealed ones are red until the objective is done). You can go back up at any time. Trains are hollow: walk in through the doorways and out the other side. Pillars, benches, walls, train walls and sealed escalators are solid, and curse projectiles stop at walls. Each floor has healing pickups and one optional memory (`?`). Story chapters play as you progress; they live in `SH_SCENES` in `js/shibuya.js`, and the Shibuya prologues are in the same file. Add `?debug` to the URL to draw collision boxes, escalators and boss zones.

## Controls

| Action | Key |
| --- | --- |
| Move | WASD / Arrow keys |
| Domain Expansion (when meter is full) | Space |
| Heian Rush dash (prestige Sukuna) | Shift |
| Pause | Esc |
| Pick character / upgrade | Number keys or click |

## Characters

| Character | Style |
| --- | --- |
| King of Curses | Dismantle, Cleave, Fuga. Domain: Malevolent Shrine |
| Shikigami User | Ten Shadows summons. Domain: Chimera Shadow Garden |
| Limitless | Infinity, Blue, Red, Hollow Purple. Domain: Infinite Void |

## Curses

| Curse | Grade | Behaviour |
| --- | --- | --- |
| Fly Head | 4 | Fast, erratic swarms of three |
| Lowly Curse | 3 | Toothy blob that just charges you |
| Gazer | 3 | Many-eyed floater that keeps its distance and spits cursed orbs |
| Transfigured Human | 2 | Mahito's victims: slow, lurching and tanky (after ~70s) |
| Finger Bearer | 1 | Elite: telegraphs, then lunges at you |
| Jogo | Special | Boss: Ember Insect rings and Maximum: Meteor |
| Hanami | Special | Boss: wooden root eruptions and slowing Cursed Buds |
| Mahito | Special | Boss: Idle Transfiguration summons and lunges |

The first Special Grade arrives at 2:00, then another every 2:30. Curses live in `enemies.js`.

When a boss arrives, your sorcerer and the curse have a short Persona-style exchange (SPACE / click to advance, ESC to skip). Every sorcerer has unique lines against each boss; to write lines for your own character, add an entry for its id in `dialogue.js`.

During a run, sorcerers also chat in a small popup (bottom-left) without pausing: at the start, on new techniques, Domain Expansion, low HP, Finger Bearers, kill milestones and boss fights, where bosses taunt back. Those lines live in `BARKS` in `dialogue.js`.

**Want to add your own?** See [CONTRIBUTING.md](CONTRIBUTING.md). It only takes one small file.

## Prestige

Win a run with a sorcerer, then evolve them from the menu with shards (the card shows a **★ Prestige** button). The first prestige form is the **Heian Era King** (Sukuna): more HP and speed, Fuga from the start, a 18% guard chance, and **SHIFT: Heian Rush**, an invulnerable dash that cuts curses. Its Domain brings the shrine's demon up behind you, and you sprint while it stands. You can switch between the base and prestige form on the card at any time.

The prestige form uses its own full sprite sheet: every row is in use (intro, idle, walk, dash, jump, guard, hit, down, get-up, Domain pose, and around twenty fist, kick, staff and sword attack rows that rotate through your casts), plus the effect sprites (rings, thrown blade, orbs, limb debris, demon heads). The code is in `js/heian.js`; the frame data in `characters/sukuna_heian_atlas.js` is generated from the sheet. To give another sorcerer a prestige form, call `registerPrestige('theirid', { ... })` (see `characters/sukuna_heian.js`).

## Prologues and Omens

Every run opens with a random manga-panel prologue for your sorcerer (Sukuna with Gojo, Gojo with Takaba, Megumi with Toji, and more), never the same one twice in a row. Each ends with a choice between two **Omens**: run modifiers with an upside and a downside, like +25% damage for -25 Max HP. SPACE advances, ESC skips to the choice, and 1 / 2 picks.

The scene's partner then tags along for the run: they pop up top-left to comment on what's happening (new techniques, low HP, bosses, Domains, kill streaks) and your sorcerer answers in the bottom-left popup. Their lines live in `js/companion.js`.

Scenes, panels and Omens all live in `js/story.js`. To add a scene, add a panel image under `assets/panels/` and push an entry into `SCENES`.

## Project layout

```
index.html        page + menu/HUD markup
css/
  style.css       styling
js/
  game.js         game engine, weapons, rendering
  enemies.js      curses: stats, spawning, AI, boss attacks, drawing
  dialogue.js     boss intro conversations, in-game banter, manga-panel cut-ins
  meta.js         shards / unlocks saved between runs
characters/       one file per playable character (add yours here)
assets/
  sprites/
    characters/   playable character sheets + portraits
    curses/       boss / enemy sheets and art
  fx/             weapon effect images (Blue, Red, slashes, shrine)
  maps/           the ground map image
  panels/         manga-panel cut-ins, one folder per character
  unused/         images not used by the game yet
```

## Credits

Character sprite sheets (Sukuna, Megumi, Gojo) are by **[finhj](https://www.deviantart.com/finhj)** on DeviantArt. All rights to those sprites belong to the artist. Please go check out their work and support them.

The Gojo manga-panel cut-ins use scans and fan drawings of Jujutsu Kaisen panels. If you know an artist who should be credited, please open an issue or PR.

The Heian Era Sukuna sprite sheet is a custom sheet by **Bitsverse644** (Bits Verse on YouTube). Its credits read: original sprites by DarkNightMugen and Inseph, with additional credit to knightmare4046, jazioxgaming, tio2599, AikijinXrAnimationMUGEN, jojostar20DryMugen, Pdiac, DrAnimationMUGEN and AikijinX. The manga panels used in cutscenes belong to Gege Akutami / Shueisha. All rights to the art belong to their creators.

This is a non-commercial fan project. Jujutsu Kaisen and its characters belong to Gege Akutami / Shueisha.
