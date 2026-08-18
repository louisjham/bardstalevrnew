# 📜 The Bard's Tale VR - Project TODO & Development Roadmap

Welcome! This document outlines completed milestones and provides a clear foundation for continuing development on **The Bard's Tale VR**.

---

## ✅ Completed Features & Milestones

### 1. 💻 1980s Retro Room & Floppy Disk Boot Sequence
- [x] Created 3D Commodore 64, 1541 Disk Drive with working red LED, and CRT Monitor (`src/world/retro-room/RetroRoom.js`).
- [x] Implemented physical 5¼" floppy disk grab/insert interaction.
- [x] C64 BASIC screen boot sequence: `LOAD "THEBARDSTALEVR",8,1` ➔ `LOADING...` ➔ `READY. RUN`.
- [x] Head-in-Monitor portal trigger (leaning forward into the CRT screen transitions into the game).

### 2. 🍺 Skara Brae Tavern (Title Screen)
- [x] Atmospheric 3D Tavern with stone walls, wooden floor, fireplace, and stained glass window (`src/world/FullVRTavern.js`).
- [x] Bard performer on stage singing *"The Evil in Skara Brae"* with Web Audio API spatial lute synth and vocal formant oscillator (`src/audio/BardSinger.js`).
- [x] 3D Floating Speech Lyric Bubbles floating next to the Bard's head on stage.
- [x] Seated 3D patrons (*Human Paladin, Elf Wizard, Dwarf Warrior, Hobbit Rogue*).

### 3. 🛡️ Garth's Weapons & Wonders (Equipment Shoppe)
- [x] Garth Shopkeeper NPC behind wooden counter (`src/world/garths-shop/GarthsShop.js`).
- [x] Physical 3D weapons on counter (*Broadsword, Battleaxe, Shield, Staff*) that can be grabbed/tapped to equip onto hero slots.
- [x] Shop exit door leading into Skara Brae.

### 4. 📖 Palm-Flip 3D Grimoire / Player Book
- [x] Hand gesture tracking: Palm-Down to Palm-Up 180° rotation spawns 3D Grimoire (`src/ui/spatial-hud/PalmBookMenu.js`).
- [x] **Page 1 (Heroes & Inspection)**: Hero cards + Detailed Inspection View covering both pages. Dynamic State Portraits (*POISONED green tint & skull, CURSED purple shadow, DAMAGED blood splatters*).
- [x] **Page 2 (Diegetic Automap)**: Real-time map renderer drawing explored grid tiles, labeling locations of interest (*Tavern, Garth's Shop, Guild, Dungeon*), with dungeon fog-of-war.
- [x] **Page 3 (Spells & Live Testing)**: Live real-time spell testing outside combat (*Mage Flame dual hand fire emitters, Air Armor 6-inch amber shield bubble, Vorpal Plating electrical sparks*).

### 5. ⚔️ Dedicated 3D Spatial Combat Zone
- [x] 3D Battle Arena with glowing purple/red braziers & runic floor (`src/world/combat-zone/CombatArena.js`).
- [x] Classic CRPG scrolling battle log text window (*"You face death in the form of 4 Skeletons!"*).
- [x] Spatial party formation view (lowered front row vs back row) and 3D monster groups.
- [x] Quizzical hero formation swap gesture (tapping a hero makes them turn head quizzically, tapping second hero swaps positions).

### 6. ⚡ Party Creation & Locomotion
- [x] **Quick Auto-Generate Party (6 Heroes)** button rolling balanced party (*Paladin, Bard, Warrior, Rogue, Conjurer, Magician*).
- [x] Custom character creation modal (`src/ui/PartyCreationUI.js`).
### 7. 📖 Authentic 1985 Manual Integration & Data Systems
- [x] **Complete Spell Database (`src/data/SpellDatabase.js`)**: All 85+ spells across 4 schools (Conjurer, Magician, Sorcerer, Wizard) and 7 levels, complete with 4-letter codes, SP costs, range/duration, and effect formulas.
- [x] **6 Authentic Bard Songs (`src/data/BardSongs.js`)**: *Falkentyne's Fury, The Seeker's Ballad, Wayland's Watch, Badh'r Kilnfest, The Traveller's Tune, Lucklaran* with musical note sequences and exploration/combat mechanics.
- [x] **Garth's Equipment Shoppe Inventory (`src/data/ItemDatabase.js`)**: 22+ items across 10 categories with authentic class restrictions (Ø markers), AC calculations, and damage stats.
- [x] **Race & Class Rules Engine (`src/data/RaceClassData.js`)**: 7 races (genes + luck attribute roll), 10 classes (8 base + Sorcerer/Wizard/Archmage promotion pipeline), class-specific abilities (Warrior multi-attack, Hunter assassinate crits, Monk unarmed scaling, Paladin magic resist, Rogue hide in shadows).
- [x] **Expanded Bestiary (`src/data/MonsterDatabase.js`)**: 30+ monsters across 4 dungeon tiers, special abilities (drainLevel, poison, petrify, spellcaster), and Mangar boss encounter.
- [x] **Full Combat Engine Integration (`src/core/combat/CombatEngine.js` & `CombatArena.js`)**: Turn execution, front/back row melee rules, monster counter-attacks, AC mitigation, party buff tracking, and Special slot summons.
- [x] **XRRig Camera Rig Architecture (`src/xr/XRRig.js`)**: Decoupled WebXR physical 6DOF head tracking from locomotion to eliminate motion sickness.

---

## 🎯 Recommended Next Steps for the Next Agent

### 📌 High-Priority Tasks
1. **🏰 Skara Brae City & Dungeon Expansion**:
   - Add dungeon stairs leading down into *The Catacombs* and *Harken Castle*.
   - Implement dungeon traps (spinner tiles, darkness zones, pit traps) with Palm Grimoire automap cues.

2. **✨ 3D Spatial Rune Drawing Gestures**:
   - Add 3D spell casting gestures for VR controllers (drawing runes in VR space to trigger specific 4-letter spell codes).

3. **🎵 Bard Song Aura VFX**:
   - Render 3D glowing musical note particle fields surrounding party members during active song playback.

4. **💰 Garth's Shop Purchasing & Gold Economy**:
   - Connect gold piece deductions when purchasing/equipping weapons off Garth's counter.
   - Display weapon stat tooltip cards (*Damage, Armor Class bonus, Required Class*) when hovering/grabbing items.

5. **🔊 Audio & Voice Polish**:
   - Add ambient tavern chatter, crackling fireplace audio positional sound, and footsteps.

---

## 💻 Technical Verification
- Production build command: `npm run build` (Verified: 0 errors).
- Local dev command: `npm run dev`.
