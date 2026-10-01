# 🍺 The Bard's Tale VR

[![Tests](https://img.shields.io/badge/Tests-82%2F82%20Passing-brightgreen.svg)](src/)
[![WebXR](https://img.shields.io/badge/WebXR-VR%20%2B%20AR%20%2B%20Desktop-purple.svg)](https://immersiveweb.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r170-blue.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg)](https://vitejs.dev/)

> *In 1985, a 5¼″ floppy disk swallowed a generation of gamers whole. This is what it felt like inside.*

An immersive WebXR adaptation of Interplay's legendary 1985 CRPG **The Bard's Tale: Tales of the Unknown** — rebuilt from the ground up for VR, with the soul of the original preserved at the byte level.

---

## 🗺️ If you've never played it (for the straights)

Imagine a dungeon-crawling adventure set in the medieval city of Skara Brae, under siege by dark magic. You assemble a party of up to six heroes — warriors, wizards, rogues, and a bard whose songs literally buff your party — then explore a 30×30 city grid, delve dungeons, and fight turn-based tactical battles against 127 different monsters. It was *Skyrim* before *Skyrim*, rendered in 16 colors.

This project puts you **inside** that world. You start seated at a 1980s bedroom desk, slide a floppy into a Commodore 1541 disk drive, type `LOAD "Louis F Ham presents",8,1` on a real PETSCII keyboard… and fall through the CRT screen into Skara Brae itself.

---

## 🕹️ For the purists

This isn't "inspired by." The game's DNA was recovered, not remembered:

- **Reverse-engineered from the original disks.** Encounter tables, monster AI behaviors, XP awards, and the encounter algorithm were extracted from actual C64 disk images with custom analyzer tooling (see `research/` — `d64_analyzer.mjs`, the monster XP audit, the encounter test matrix). When a pack of 4–16 Hobbits jumps you on a dark street, that's the 1985 math doing it.
- **Canon data, all of it.** 127 monsters. 105 spells. 6 bard songs. 10 equipment categories. Every race, every class, the full 30×30 Skara Brae grid.
- **Authentic 1985 sprites.** The tavern patrons, the bard on stage, the monsters in the combat arena — original Amiga/Atari sprite sheets, billboarded in 3D space, animated the way you remember.
- **The little things.** The 1541 drive's red activity LED flickers while the disk loads. The CRT has barrel distortion, scanlines, and phosphor bloom. The bard on stage performs *"The Evil in Skara Brae"* — sung by a real-time vocal formant synthesizer, accompanied by a Karplus-Strong string physical model. No samples. No recordings. Math, the way it was always meant to be.

---

## 🌌 The experience

```
💻 1980s bedroom → 📀 floppy boot → 🌀 dimensional vortex
  → 🍺 Skara Brae Tavern (assemble your party)
  → 🗡️  Garth's Equipment Shoppe
  → 🏰 the 30×30 city grid → ⚔️  spatial combat arena
  → 📜 review board & temples → back to the streets
```

- **Diegetic everything.** Your spellbook is a grimoire you flip open with your palm. Tutorials come from the tavern patrons themselves — ask the Dwarf about traps, the Wizard about spell tiers, the Hobbit about races. The UI is the world.
- **Full VR + desktop fallback.** Quest 2/3/Pro, Vision Pro, and desktop browsers with WASD, mouse, and gamepad support. No headset required to play.
- **Tactile combat.** Target enemies by reaching out and touching them. Seeded, deterministic dice under the hood — every roll is fair and reproducible.

---

## 🧪 Under the hood

Built for correctness first, spectacle second:

- **Pure headless game logic.** Combat, encounters, dice, conditions, recovery — all framework-free ES modules with zero Three.js dependencies. The 3D world is a presentation layer over a provably correct engine.
- **82 automated tests, all passing** (`npm test`) — combat resolution, encounter generation, monster factory, spell database, map data, UI state.
- **Vanilla Three.js + Vite.** No engine, no framework overhead — direct control over the render pipeline, custom GLSL shaders (CRT, torch flame, vortex portal), and draw-call-optimized sprite batching.
- **Procedural audio.** Web Audio node graphs: Karplus-Strong lute synthesis, vocal formant filters, 3D positional HRTF attenuation.

---

## 🚀 Run it

```bash
npm install
npm run dev      # https dev server (required for WebXR on Quest)
npm test         # 82 tests
npm run build
```

Then open the printed URL — on desktop, or on your Quest's browser (same Wi-Fi network) and hit **Enter VR**.

---

## 🗺️ Roadmap

The city streets, tavern, shop, combat arena, temples, and review board are in. Dungeons, the full quest chain, and save/character persistence are next. This is a living tribute — check `TODO.md` for the current milestone board.

---

*Unofficial fan tribute. Not affiliated with Interplay or inXile Entertainment. The Bard's Tale is a trademark of its respective owner. Made with love, 16 colors, and one very patient 1541 disk drive.*
