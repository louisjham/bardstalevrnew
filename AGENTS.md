# 🛸 The Bard's Tale VR - Lead XR Engineer Guidelines & Context

Role: Lead XR Engineer collaborating on a WebXR-based VR/AR adaptation of the Commodore 64 CRPG "The Bard's Tale," implemented using XRBlocks architecture (WebXR + AI framework built on Three.js, with modular blocks for user, world, interface, AI, and agents).

Target Platforms: Chrome-based XR environments (Meta Quest 2/3/Pro, Android XR, Apple Vision Pro WebXR, Desktop WebXR fallback).

---

## 🎯 Current Codebase State & Capabilities (Verified 100% Functional)

The codebase is structured into modular XRBlocks components and features a 5-location game loop with production-grade visual shaders, authentic 1985 data engines, and calibrated spatial computing interactions:

1. **💻 1980s Retro C64 Desk (`src/world/retro-room/RetroRoom.js`)**:
   - 3D Commodore 64, 1541 Disk Drive with working red LED, 5¼" floppy disk labeled *"The Bard's Tale VR"*, 1980s bedroom posters, and curved Commodore 1702 CRT Monitor.
   - **Shaders**: `CRTMonitorShader.js` (barrel distortion, scanlines, phosphor mask, bloom) and `VortexPortalShader.js` (logarithmic spiral warp, chromatic rings, 3D particle vortex disk).
   - **Cinematic Sequence**: Aligned at back of bedroom ($z = 2.4\text{m}$, $x = -0.10\text{m}$, $y = 1.18\text{m}$) ➔ smooth dolly forward to desk ($z = 0.15\text{m}$) ➔ look down at floppy insertion into 1541 drive ➔ look up at C64 BASIC boot (`LOAD "Louis F Ham presents",8,1` ➔ full Title Screen) ➔ vortex portal opens ➔ suck-in with **360° perspective barrel roll** ($\Delta\text{roll} = 2\pi$) ➔ fade to black overlay.

2. **🍺 Skara Brae Tavern (`src/world/FullVRTavern.js` & `src/audio/BardSinger.js`)**:
   - PBR packed sand/dirt floor with bump normal maps, timber ceiling beams, iron wagon-wheel chandelier with volumetric flames (`TorchFlameShader.js`), stone fireplace, and stained glass.
   - Bard on stage performing *"The Evil in Skara Brae"* with Web Audio API lute synth, vocal formant oscillator, 3D Floating Speech Lyric Bubbles, and authentic 1985 Bard sprite billboard (`bt1_bard.png`).
   - Authentic 1985 animated sprite patrons (*Paladin, Wizard, Dwarf, Hobbit*) seated at tables (`src/textures/AnimatedSprite.js`).
   - **Interactive Diegetic Guide Windows (`src/ui/spatial-hud/SpatialInstructionWindow.js`)**: Clicking any patron or the Bard opens a spatial instruction modal explaining game mechanics (Spells/Schools, Combat/Death, Items/Traps, Races/Attributes, Bard Songs).
   - **Dimensional Entrance Transition**: Expanding golden/violet rift ripple dissolve and smooth fade-from-black.
   - **Quest 2 Touch Controller Door Interaction**: Highlight frame + large doorway trigger box; opens upon highlight + **ANY button press** on Quest 2/3 Touch controllers.

3. **🛡️ Garth's Weapons & Wonders (`src/world/garths-shop/GarthsShop.js`)**:
   - Equipment fitting shop with 1985 animated Garth NPC billboard (`bt1_56.png` / `garth.png`) behind counter.
   - Tapping Garth triggers the Spatial UI dialog with `[🎲 Create New Party]` and `[⚔️ Use Starter Party (6)]`.
   - Automatic starter gear kit auto-equipped to every newly created hero (`autoEquipCharacter`).
   - Physical 3D weapons (*Broadsword, Battleaxe, Shield, Staff, Warhammer, Halberd, Dagger*) on counter pedestals with 6DOF VR Controller Grab (Squeeze/Grip) and Desktop Grab (`[G]`/`[E]`/Click) with swing momentum, whoosh audio, haptics, and blade spark trails.
   - Golden Anvil auto-equip station & parchment ledger for inventory inspection.

4. **📖 Palm-Flip 3D Grimoire / Player Book (`src/ui/spatial-hud/PalmBookMenu.js`)**:
   - **Natural Gesture**: Supinating hand (palm-up) summons the Grimoire with summoning animation; pronating hand (palm-down) dispels it.
   - **VR Controller Toggle**: **Y** or **X** button on left Touch controller toggles HUD mode.
   - **Page 1 (Heroes & Inspection)**: Hero cards + Detailed Inspection View with dynamic state portraits (*POISONED green tint & skull, CURSED purple shadow aura, DAMAGED blood splatters*).
   - **Page 2 (Diegetic Automap)**: Real-time map generator drawing explored grid tiles and labeling locations of interest (*Tavern, Garth's Shop, Guild, Temples, Review Board, Roscoe's*).
   - **Page 3 (Spells & Live Testing)**: Live real-time spell testing outside combat (*Mage Flame dual hand fire emitters, Air Armor 6-inch amber shield bubble, Vorpal Plating electrical sparks*).

5. **🏰 Canonical 30×30 Skara Brae City Grid (`src/world/skara-brae/SkaraBraeStreetScene.js`)**:
   - Complete 30×30 map matching the original 1985 Interplay map with cobblestones, dynamic sky dome, and authentic C64 pixel art building facades.
   - Interactive sanctuaries: Adventurers Guild, Temple of Divine Light, Temple of Tarjan, Review Board, Roscoe's Emporium.
   - Timer-driven **Day / Night Cycle** (`WorldTimeEngine.js`): Shuttered night services, daytime SP regeneration, dynamic nighttime 1–4 group encounters.

6. **⚔️ Dedicated 3D Spatial Combat Arena (`src/world/combat-zone/CombatArena.js`)**:
   - Dedicated 3D battle room with glowing purple/red braziers & runic floor.
   - Streaming classic CRPG scrolling battle log text (*"You face death in the form of 4 Skeletons!"*).
   - Spatial party formation view (lowered front row vs back row) and 3D monster groups.
   - Quizzical hero formation swap gesture.

7. **🏃 Calibrated 6DOF Locomotion & Height (`src/xr/FreeLocomotion.js`)**:
   - **Eye Height**: Desktop fallback eye height locked at **`1.18m`** (matches seated patrons and Bard); WebXR VR rig locked at **`0.0m`** so physical room-scale headset height is natural.
   - **Office Chair Gesture**: Raised arm + fist propels player forward with gradual acceleration and caster drag friction; moving arm left/right spins avatar while preserving momentum.
   - **2D Bumper Car Collisions**: Planar elastic bounce off room bounds, furniture, and counters with VR haptics.

---

## 🛠️ Modular Codebase Organization

- `src/core/game-loop/GameLoop.js` — 5-Location State Machine (`RETRO_ROOM`, `TAVERN_INTRO`, `GARTHS_SHOP`, `SKARA_BRAE_STREETS`, `COMBAT_ZONE`).
- `src/core/combat/CombatEngine.js` — CRPG combat engine, AC calculations, d20 hit rolls, Bard song buffs, survivor XP split.
- `src/core/conditions/ConditionSystem.js` — 8 canonical character conditions (`ALIVE`, `POISONED`, `OLD`, `DEAD`, `STONED`, `PARALYZED`, `POSSESSED`, `NUTS`).
- `src/core/encounter/EncounterGenerator.js` — Zone- and time-based encounter tables with fixed/scripted battles.
- `src/core/recovery/RecoverySystem.js` — Temple healing and status restoration rules.
- `src/core/review-board/ReviewBoardEngine.js` — Exact 1985 XP tables, level-up advancement, spell tier training, and class promotion.
- `src/core/time/WorldTimeEngine.js` — Day / Night World Time Engine with service hours and SP regeneration.
- `src/shaders/` — `CRTMonitorShader.js`, `VortexPortalShader.js`, `TorchFlameShader.js`.
- `src/textures/TextureGenerator.js` — Procedural Canvas bump maps (dirt floor, worn wood, C64 cases, 1980s posters).
- `src/world/skara-brae/` — `SkaraBraeGrid.js` & `SkaraBraeStreetScene.js`.
- `src/world/retro-room/RetroRoom.js` — C64 computer room, floppy disk load logic, and cinematic sequence.
- `src/world/garths-shop/GarthsShop.js` — Garth's Equipment shop & weapon fitting.
- `src/world/FullVRTavern.js` — Tavern environment, entrance transition, and Quest 2 door interaction.
- `src/world/PatronModels.js` — 3D character models for Paladin, Wizard, Dwarf, Hobbit, Bard.
- `src/world/combat-zone/CombatArena.js` — 3D Battle Arena & scrolling text log.
- `src/ui/spatial-hud/PalmBookMenu.js` — 3-page 3D Grimoire & gesture tracker.
- `src/ui/PartyCreationUI.js` — Quick Auto-Generate 6-Hero Party & custom character creation.
- `src/audio/BardSynth.js` & `BardSinger.js` — Procedural Web Audio API spatial lute synth & singing voice.
- `src/xr/XRManager.js` & `FreeLocomotion.js` — WebXR Device API, controller rays, haptics, office chair gesture & WASD/VR thumbstick locomotion.

---

## 📋 Lead XR Engineer Responsibilities & Workflow

When responding:
1. **Design & Architecture**: Describe the design and modular relationships first.
2. **Code Implementation**: Produce clean, modular, runnable code.
3. **Follow-up Tasks**: Consult `TODO.md` for completed work and next steps.
