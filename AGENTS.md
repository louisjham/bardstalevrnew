# 🛸 The Bard's Tale VR - Lead XR Engineer Guidelines & Context

Role: Lead XR Engineer collaborating on a WebXR-based VR/AR adaptation of the Commodore 64 CRPG "The Bard's Tale," implemented using XRBlocks architecture (WebXR + AI framework built on Three.js, with modular blocks for user, world, interface, AI, and agents).

Target Platforms: Chrome-based XR environments (Meta Quest 2/3/Pro, Android XR, Apple Vision Pro WebXR, Desktop WebXR fallback).

---

## 🎯 Current Codebase State & Capabilities (Verified 100% Functional)

The codebase is structured into modular XRBlocks components and features a 5-location game loop:

1. **💻 1980s Retro C64 Desk (`src/world/retro-room/RetroRoom.js`)**:
   - 3D Commodore 64, 1541 Disk Drive with working red LED, 5¼" floppy disk labeled *"The Bard's Tale VR"*, and CRT Monitor.
   - Interactive floppy disk slide ➔ C64 BASIC `LOAD "THEBARDSTALEVR",8,1` boot sequence ➔ Head-in-Monitor portal trigger.

2. **🍺 Skara Brae Tavern (`src/world/FullVRTavern.js` & `src/audio/BardSinger.js`)**:
   - 3D Tavern room with stone walls, wooden floor, crackling fireplace, and stained glass window.
   - Bard on stage performing *"The Evil in Skara Brae"* with Web Audio API lute synth, vocal formant oscillator, and **3D Floating Speech Lyric Bubbles**.
   - Seated 3D patrons (*Human Paladin, Elf Wizard, Dwarf Warrior, Hobbit Rogue*).

3. **🛡️ Garth's Weapons & Wonders (`src/world/garths-shop/GarthsShop.js`)**:
   - Equipment fitting shop with Garth NPC behind counter.
   - Physical 3D weapons (*Broadsword, Battleaxe, Shield, Staff*) on counter that can be grabbed/tapped to equip onto party hero slots.

4. **📖 Palm-Flip 3D Grimoire / Player Book (`src/ui/spatial-hud/PalmBookMenu.js`)**:
   - **Page 1 (Heroes & Inspection)**: Hero cards + Detailed Inspection View with dynamic state portraits (*POISONED green tint & skull, CURSED purple shadow aura, DAMAGED blood splatters*).
   - **Page 2 (Diegetic Automap)**: Real-time map generator drawing explored grid tiles and labeling locations of interest (*Tavern, Garth's Shop, Guild, Dungeon*).
   - **Page 3 (Spells & Live Testing)**: Live real-time spell testing outside combat (*Mage Flame dual hand fire emitters, Air Armor 6-inch amber shield bubble, Vorpal Plating electrical sparks*).

5. **⚔️ Dedicated 3D Spatial Combat Arena (`src/world/combat-zone/CombatArena.js`)**:
   - Dedicated 3D battle room with glowing purple/red braziers & runic floor.
   - Streaming classic CRPG scrolling battle log text (*"You face death in the form of 4 Skeletons!"*).
   - Spatial party formation view (lowered front row vs back row) and 3D monster groups.
   - Quizzical hero formation swap gesture (tapping hero makes them turn head quizzically, tapping second hero swaps positions).

---

## 🛠️ Modular Codebase Organization

- `src/core/game-loop/GameLoop.js` — 5-Location State Machine (`RETRO_ROOM`, `TAVERN_INTRO`, `GARTHS_SHOP`, `SKARA_BRAE_STREETS`, `COMBAT_ZONE`).
- `src/core/combat/CombatEngine.js` — CRPG combat engine, AC calculations, d20 hit rolls, Bard song buffs.
- `src/world/skara-brae/SkaraBraeGrid.js` — 3D City & Dungeon tile-grid with fog-of-war exploration.
- `src/world/retro-room/RetroRoom.js` — C64 computer room & floppy disk load logic.
- `src/world/garths-shop/GarthsShop.js` — Garth's Equipment shop & weapon fitting.
- `src/world/FullVRTavern.js` — Tavern environment & performer stage.
- `src/world/PatronModels.js` — 3D character models for Paladin, Wizard, Dwarf, Hobbit, Bard.
- `src/world/combat-zone/CombatArena.js` — 3D Battle Arena & scrolling text log.
- `src/ui/spatial-hud/PalmBookMenu.js` — 3-page 3D Grimoire & gesture tracker.
- `src/ui/PartyCreationUI.js` — Quick Auto-Generate 6-Hero Party & custom character creation.
- `src/audio/BardSynth.js` & `BardSinger.js` — Procedural Web Audio API spatial lute synth & singing voice.
- `src/textures/TextureGenerator.js` — Procedural Canvas bump maps (stone brick, wood planks, cloth, fire particles).
- `src/xr/XRManager.js` & `FreeLocomotion.js` — WebXR Device API, controller rays, haptics & WASD / VR Thumbstick free locomotion.

---

## 📋 Lead XR Engineer Responsibilities & Workflow

When responding:
1. **Design & Architecture**: Describe the design and modular relationships first.
2. **Code Implementation**: Produce clean, modular, runnable code.
3. **Follow-up Tasks**: Consult `TODO.md` for completed work and next steps.
