# 🧠 The Bard's Tale VR - Agent Memory & Context

This file serves as persistent memory between agent sessions. Any agent starting work on this project should read this file, `AGENTS.md`, and `TODO.md`.

---

## 🎯 Current Project State & Architecture

The Bard's Tale VR is a WebXR + Three.js immersive VR/Desktop adaptation of the 1985 CRPG *The Bard's Tale*.

### 🕹️ 5-Location Game Loop (`src/core/game-loop/GameLoop.js`)
1. **1980s Retro C64 Desk (`src/world/retro-room/RetroRoom.js`)**:
   - 3D Commodore 64, 1541 floppy drive with LED, 5¼" floppy disk load animation, CRT barrel/scanline shader (`CRTMonitorShader.js`), and swirling vortex portal with a 360° perspective roll transition into the game.
2. **Skara Brae Tavern (`src/world/FullVRTavern.js`)**:
   - 1985 authentic animated sprite billboards (`AnimatedSprite.js`) for the 4 seated patrons (*Paladin, Wizard, Dwarf, Hobbit*) and the Bard on stage.
   - Live procedural lute & singing voice (`BardSynth.js`, `BardSinger.js`) with 3D floating lyric bubbles.
   - Interactive Spatial UI guide windows (`SpatialInstructionWindow.js`) on clicking any patron explaining CRPG game rules (Spells, Combat/Death, Items/Traps, Races/Attributes, Bard Songs).
   - Quest 2/3 Touch controller door interaction (any button press enters Skara Brae / Garth's Shop).
3. **Garth's Weapons & Wonders (`src/world/garths-shop/GarthsShop.js`)**:
   - 1985 animated Garth sprite billboard behind the counter.
   - Tapping Garth opens the party creation dialog (`[🎲 Create New Party]` or `[⚔️ Use Starter Party (6)]`).
   - Every created hero automatically starts with full starter weapons and armor kit (`autoEquipCharacter`).
   - Physical 3D weapons on counter pedestals with 6DOF VR Grip grab and Desktop click/`[G]`/`[E]` grab.
   - Dynamic weapon physics swinging ($> 1.6\text{ m/s}$ in VR or Left Click/Space on Desktop) with whoosh audio (`playSwordSwing()`), haptic vibration, and blade spark trails.
4. **Canonical 30×30 Skara Brae City Grid (`src/world/skara-brae/SkaraBraeStreetScene.js`)**:
   - Exact 1985 30×30 city grid with Adventurers Guild, Temples (Tarjan & Divine Light), Review Board, Roscoe's Energy Emporium, and dynamic Day/Night lighting and SP regeneration.
5. **3D Combat Arena (`src/world/combat-zone/CombatArena.js`)**:
   - Runic arena floor, scrolling battle text log, front/back row party formation, monster sprites, and full CRPG d20 combat mechanics.

### 📖 Spatial HUD / Player Book (`src/ui/spatial-hud/PalmBookMenu.js`)
- Supinating hand (palm-up) summons the Grimoire; pronating (palm-down) dispels it.
- Left controller **Y** or **X** button toggles HUD mode.
- 3 Pages: Hero Inspection with condition portraits, Real-Time Automap, and Live Spell Testing.

---

## 📋 Critical Guidelines for Any Incoming Agent
1. **Always verify tests and build**:
   - Run `npm test` (30/30 unit tests must pass).
   - Run `npm run build` (Vite production bundle must compile cleanly).
2. **Preserve Dual VR + Desktop Support**:
   - Every single feature must work in both WebXR 6DOF VR (Meta Quest, Vision Pro) and Desktop fallback (WASD, Mouse, Keybinds).
3. **Check `TODO.md` for Roadmap Tasks**:
   - Dungeon stairs/cellar transitions beneath Tavern & Skara Brae.
   - 3D spatial rune drawing gestures.
   - Bard song visual aura fields.
