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

This project puts you **inside** that world. The animated Amiga bard performs on a cinema-sized VR screen while the story of Skara Brae's fall scrolls past. One button press and you're standing in the tavern.

---

## 🕹️ For the purists

This isn't "inspired by." The game's DNA was recovered, not remembered:

- **Reverse-engineered from the original disks.** Encounter tables, monster AI behaviors, XP awards, and the encounter algorithm were extracted from actual C64 disk images with custom analyzer tooling (see `research/` — `d64_analyzer.mjs`, the monster XP audit, the encounter test matrix). When a pack of 4–16 Hobbits jumps you on a dark street, that's the 1985 math doing it.
- **Canon data, all of it.** 127 monsters. 105 spells. 6 bard songs. 10 equipment categories. Every race, every class, the full 30×30 Skara Brae grid.
- **Authentic 1985 sprites.** The tavern patrons, the bard on stage, the monsters in the combat arena — original Amiga/Atari sprite sheets, billboarded in 3D space, animated the way you remember. The animated bard on the title screen cycles through all four frames of his spritesheet, one frame at a time.
- **The little things.** The bard on stage performs *"The Evil in Skara Brae"* — sung by a real-time vocal formant synthesizer, accompanied by a Karplus-Strong string physical model. No samples. No recordings. Math, the way it was always meant to be.

---

## 🌌 The experience

```
🎬 Amiga VR intro cinema (animated bard + scrolling story)
  → [any button] → Main Menu
  → 🍺 Adventurers Guild (recruit your party from the tavern patrons)
  → 🛡️  Garth's Equipment Shoppe (weapon bestowal + auto-equip)
  → 🏰 30×30 Skara Brae city grid (day/night cycle, random encounters)
  → ⚔️  Spatial combat arena (raycast targeting, blitz, narrative scroll)
  → 🏛️  Temple of the Divine Light / Mad God Tarjan (healing & resurrection)
  → ⚡  Roscoe's Energy Emporium (spell point recharge, 15 GP/SP)
  → 📜  Review Board (level up, class promotion, spell training)
```

- **Diegetic everything.** Your spellbook is a grimoire you flip open with your palm. Tutorials come from the tavern patrons themselves — ask the Dwarf about traps, the Wizard about spell tiers, the Hobbit about races. The UI is the world.
- **Full VR + desktop fallback.** Quest 2/3/Pro, Vision Pro, and desktop browsers with WASD, mouse, and gamepad support. No headset required to play.
- **Tactile combat.** Target enemies by reaching out and touching them. Seeded, deterministic dice under the hood — every roll is fair and reproducible.

---

## 🏛️ Locations

| Location | Status | Notes |
|---|---|---|
| Amiga VR Intro Cinema | ✅ | Animated bard spritesheet, copper bars, scrolling story text, 8-bit procedural music |
| Adventurers Guild (Tavern) | ✅ | Bard on stage, tactile patron recruitment, Guild Menu panel |
| Garth's Equipment Shoppe | ✅ | 3D weapon grab/swing, class bestowal, auto-equip station |
| Skara Brae City Grid | ✅ | Full 30×30 canonical map, day/night cycle, storefronts, teleporters |
| Spatial Combat Arena | ✅ | Raycast monster targeting, BLITZ mechanic, narrative combat scroll |
| Temple of the Divine Light | ✅ | 3D sanctuary room, animated High Priest sprite, stained-glass backdrop, full healing UI |
| Temple of the Mad God Tarjan | ✅ | Same room, purple variant — free healing for Rogues |
| Roscoe's Energy Emporium | ✅ | 3D arcane lab, animated Roscoe sprite, crystal orb, potion shelves, SP recharge UI |
| Review Board | ✅ | Level-up, attribute rolls, spell tier training, class promotion |
| Dungeons (Wine Cellar, Catacombs…) | 🔜 | Encounter tables ready, geometry TBD |

---

## 🧪 Under the hood

Built for correctness first, spectacle second:

- **Pure headless game logic.** Combat, encounters, dice, conditions, recovery — all framework-free ES modules with zero Three.js dependencies. The 3D world is a presentation layer over a provably correct engine.
- **82 automated tests, all passing** (`npm test`) — combat resolution, encounter generation, monster factory, spell database, map data, UI state.
- **Vanilla Three.js + Vite.** No engine, no framework overhead — direct control over the render pipeline, custom GLSL shaders (CRT, torch flame, vortex portal), and draw-call-optimized sprite batching.
- **Procedural audio.** Web Audio node graphs: Karplus-Strong lute synthesis, vocal formant filters, 3D positional HRTF attenuation.
- **Quest 2 optimised.** Pixel ratio capped at 1.0 (compositor super-samples), shadow maps disabled, ~28 decorative PointLights replaced with emissive mesh spheres, sky dome tracks the camera to prevent far-clip artifacts, `MeshLambertMaterial` on static geometry.

---

## 🚀 Run it

```bash
npm install
npm run dev      # HTTPS dev server on port 5173 (required for WebXR on Quest)
npm test         # 82/82 tests
npm run build    # Production Vite bundle
```

Open the printed HTTPS URL on desktop, or point your Quest browser at `https://<your-ip>:5173` on the same Wi-Fi network and hit **Enter VR**.

> **Single test:** `node --test src/path/to/file.test.js`

---

## 🗺️ Roadmap

The city streets, all interior locations (tavern, shop, temples, Roscoe's), combat arena, and review board are complete. Dungeons, the full quest chain, 3D spatial rune-drawing gestures, bard song aura VFX, and save/party persistence are next. Check `TODO.md` for the current milestone board.

---

*Unofficial fan tribute. Not affiliated with Interplay or inXile Entertainment. The Bard's Tale is a trademark of its respective owner. Made with love, 16 colors, and one very patient High Priest.*
