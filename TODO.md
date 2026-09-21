# 📜 The Bard's Tale VR - Project TODO & Development Roadmap

Welcome! This document outlines completed milestones and provides a clear foundation for continuing development on **The Bard's Tale VR**.

---

## ✅ Completed Features & Milestones

### 1. 💻 1980s Retro Room & Floppy Disk Boot Sequence (`src/world/retro-room/RetroRoom.js`)
- [x] **3D Commodore 64 & 1541 Disk Drive**: Authentic C64 case, keyboard with PETSCII key legends, drive cooling vents, rotating latch lever, and flickering red drive activity LED.
- [x] **Curved Commodore 1702 CRT Monitor**: Real-time GLSL shader (`src/shaders/CRTMonitorShader.js`) with barrel tube distortion, scanlines, phosphor mask, and bloom.
- [x] **On-Rails Cinematic Intro**:
  - Aligned start at the back of the bedroom ($z = 2.4\text{m}$, $x = -0.10\text{m}$, $y = 1.18\text{m}$).
  - Dollies smoothly forward to the desk ($z = 0.15\text{m}$).
  - Camera tilts down to watch the 5¼" floppy disk slide into the 1541 disk drive.
  - Camera tilts up to watch the Commodore 64 boot sequence (`LOAD "Louis F Ham presents",8,1` ➔ `SEARCHING` ➔ `LOADING` ➔ `READY. RUN` ➔ Full Title Screen).
  - Swirling GLSL logarithmic vortex portal activates, 3D particle vortex disk spins up, sucking the player into the screen with a **360° perspective barrel roll** and fade to black.

### 2. 🍺 Skara Brae Tavern (`src/world/FullVRTavern.js`)
- [x] **Atmospheric Medieval Tavern**: Packed sand/dirt floor with bump normal maps, timber ceiling beams, iron wagon-wheel chandelier with volumetric flames (`TorchFlameShader.js`), stone fireplace, and stained glass.
- [x] **Live Stage Bard Performer (`src/audio/BardSinger.js` & `BardSynth.js`)**: Real-time Web Audio API procedural lute synthesizer + vocal formant oscillator performing *"The Evil in Skara Brae"* with 3D floating lyric speech bubbles and authentic 1985 Bard sprite billboard (`bt1_bard.png`).
- [x] **Authentic 1985 Sprite Patrons (`src/textures/AnimatedSprite.js` & `src/data/TavernTutorialData.js`)**:
  - Replaced 3D low-poly patrons with authentic 1985 animated sprite billboards (*Paladin, Wizard, Dwarf, Hobbit, Bard*).
  - **Interactive Tutorial Guides**: Clicking/tapping any patron or the Bard opens a diegetic Spatial UI window (`SpatialInstructionWindow.js`) with comprehensive CRPG instructions:
    - *Wizard*: Magic user classes (*Conjurer, Magician, Sorcerer, Wizard*), spell tiers, and daylight SP regeneration.
    - *Paladin / Knight*: Combat mechanics, armor class, party formation, party death, and temple revival.
    - *Dwarf*: Weapon & armor equipment, identifying traps, disarming chests, and item durability.
    - *Hobbit*: Character races (*Human, Elf, Dwarf, Hobbit, Half-Elf, Half-Orc, Gnome*), base attributes, and level-up stat gains.
    - *Bard*: Bard songs, party combat buffs, song durations, and replenishing voice at the tavern.
- [x] **Dimensional Entrance Transition**: Concentric golden/violet dimensional rift ripple expanding and dissolving upon entry.
- [x] **Quest 2 Touch Controller Door Interaction**: Highlight frame + large doorway trigger box; opens upon highlight + **ANY button press** on Meta Quest 2/3 Touch controllers.

### 3. 🛡️ Garth's Weapons & Wonders (`src/world/garths-shop/GarthsShop.js`)
- [x] **Equipment Shoppe Environment**: Stone walls, volumetric wall torches, crossed display blades, and shop banner.
- [x] **Authentic 1985 Garth Sprite Billboard**: 4-frame animated sprite billboard of Garth (`bt1_56.png` / `garth.png`) behind the weapons counter.
- [x] **Garth Roster & Party Dialog**:
  - Tapping Garth opens an interactive Spatial UI modal with:
    - `[🎲 Create New Party]` — Launches the 6-hero custom party creation UI.
    - `[⚔️ Use Starter Party (6)]` — Instantly activates the canonical starter party (*Paladin, Warrior, Hunter, Rogue, Conjurer, Magician*).
- [x] **Automatic Starter Weapons & Armor**: Every newly created hero (standard or custom) is automatically equipped with authentic class-appropriate weapons, armor, helmets, shields, and instruments (`autoEquipCharacter`).
- [x] **Physical 3D Weapon Grabbing & Physics Swinging**:
  - 3D weapons (*Broadsword, Battleaxe, Oak Staff, Iron Warhammer, Halberd, Silver Dagger, Shield*) rest on pedestals on the counter.
  - **Grabbing**: Hold Grip/Squeeze in VR or click/press `[G]`/`[E]` on Desktop to pick up and hold in hand.
  - **Swinging Physics**: Rapid hand movement ($> 1.6\text{ m/s}$ in VR) or `[Left Click]`/`[Space]` on Desktop plays procedural whoosh sound effects (`playSwordSwing()`), haptic vibration, and spawns blade-tip spark trails.
  - **Releasing**: Press `[G]`/`[E]` or Right-Click to return the weapon to its counter pedestal.
- [x] **Auto-Equip Station & Ledger**: Golden anvil auto-equip station & parchment ledger for inspecting equipment and character stats.

### 4. 📖 Palm-Flip 3D Grimoire / Player Book (`src/ui/spatial-hud/PalmBookMenu.js`)
- [x] **Natural Palm Gesture Tracking**: Turning hand over from palm-down to palm-up summons the glowing Grimoire with a summoning animation; dropping the pose dispels it.
- [x] **Dual VR Controller Button Support**: Pressing **Y** or **X** on the left Touch controller toggles the Grimoire in HUD mode.
- [x] **Page 1 (Heroes & Inspection)**: 6-hero status cards + detailed inspection view with dynamic condition portraits (*POISONED green tint & skull, CURSED purple shadow aura, DAMAGED blood splatters*).
- [x] **Page 2 (Diegetic Automap)**: Real-time map generator rendering explored grid tiles, landmarks (*Tavern, Garth's Shop, Guild, Temples, Review Board, Roscoe's*), with fog-of-war.
- [x] **Page 3 (Spells & Live Testing)**: Live testing of spells outside combat (*Mage Flame dual hand fire emitters, Air Armor 6-inch amber shield bubble, Vorpal Plating electrical sparks*).
- [x] **C64 Desk Quick Reset**: Instant reset button to jump back to the 1985 C64 desk.

### 5. 🏰 Canonical 30×30 Skara Brae City Grid (`src/world/skara-brae/SkaraBraeStreetScene.js`)
- [x] **Full 30×30 Map**: Complete city grid matching the original 1985 Interplay map with cobblestone streets, dynamic sky dome, and authentic C64 pixel art building facades.
- [x] **Interactive Storefronts & Sanctuaries**:
  - **Adventurers Guild & Tavern**: Safe havens to rest and advance time to morning.
  - **Temple of Divine Light & Temple of Tarjan (`src/ui/TempleUI.js`)**: Healing, purification, and resurrection services (100% free for Rogues at Tarjan).
  - **Review Board (`src/ui/ReviewBoardUI.js`)**: Character level-ups, attribute rolls, spell tier training, and class changes (*Conjurer/Magician ➔ Sorcerer ➔ Wizard*).
  - **Roscoe's Energy Emporium (`src/ui/RoscoeUI.js`)**: Spell Point recharges for 15 GP/SP.

### 6. ☀️🌙 Canonical Day / Night Cycle (`src/core/time/WorldTimeEngine.js`)
- [x] **Continuous World Clock**: Cycles through `DAY` (3 min) ➔ `DUSK` (30s) ➔ `NIGHT` (2.5 min) ➔ `DAWN` (20s).
- [x] **Service Hours**: Garth's Shop and the Review Board shutter at night.
- [x] **Natural SP Regeneration**: Mages recover +1 SP per tick during daytime; stops at night.
- [x] **Nighttime Street Danger**: Day spawns 1 enemy group; Night spawns 1–4 dangerous monster groups.

### 7. ⚔️ Dedicated 3D Spatial Combat Arena (`src/world/combat-zone/CombatArena.js`)
- [x] **Tactical 3D Arena**: Rune-inscribed arena floor, glowing braziers, spatial party formation (front row melee vs back row caster), and 3D monster groups.
- [x] **Scrolling Combat Log**: Classic CRPG battle text log (*"You face death in the form of 4 Skeletons!"*).
- [x] **Hero Formation Swap**: Tap hero to make them turn head quizzically, tap second hero to swap battle order.
- [x] **CRPG Mechanics (`src/core/combat/CombatEngine.js`)**: AC mitigation, d20 hit rolls, 4-action monster AI slots, on-hit status afflictions, breath attacks, and survivor XP splits.

### 8. 🏃 Locomotion & Physics (`src/xr/FreeLocomotion.js`)
- [x] **Calibrated Avatar Height**: Desktop fallback eye height locked at **`1.18m`** (matches seated patrons and Bard); WebXR 6DOF VR rig locked at **`0.0m`** so room-scale physical head height is natural.
- [x] **Rolling Office Chair Gesture Locomotion**: Raising arm and forming a fist propels the player forward with gradual acceleration and caster drag friction. Moving the arm left/right spins the avatar while preserving momentum.
- [x] **2D Bumper Car Collisions**: Planar elastic bounce off walls, furniture, and counters with VR haptics.
- [x] **Controller Thumbstick & WASD**: Standard smooth locomotion and snap/smooth turning.

---

## 🎯 Recommended Next Steps for the Next Agent

### 📌 High-Priority Tasks
1. **🏰 Skara Brae City & Dungeon Expansion**:
   - Add dungeon entrance stairs in Skara Brae leading down into *The Wine Cellar* (under the Tavern), *The Catacombs* (Mad God temple), and *Harkyn's Castle*.
   - Implement dungeon traps (spinner tiles, darkness zones, pit traps, anti-magic zones) with Palm Grimoire automap cues.

2. **✨ 3D Spatial Rune Drawing Gestures**:
   - Add 3D spell casting gestures for VR controllers (drawing runes in VR space to trigger specific 4-letter spell codes like `MAFL`, `ARFI`, `VOBP`).

3. **🎵 Bard Song Aura VFX & Spatial Audio**:
   - Render 3D glowing musical note particle fields and color aura rings surrounding party members during active song playback.
   - Add tavern ambient crowd murmurs and crackling fireplace spatial audio.

4. **💰 Garth's Shop Purchasing & Gold Economy**:
   - Connect gold piece deductions when purchasing/equipping weapons off Garth's counter.
   - Display floating 3D weapon stat tooltip cards (*Damage, Armor Class bonus, Required Class, Value in GP*) when hovering/grabbing items.

---

## 💻 Technical Verification
- **Automated Unit Tests**: `node --test src/**/*.test.js` (30/30 Passing).
- **Production Build**: `npm run build` (Verified 0 errors).
- **Local Dev Server**: `npm run dev` (HTTPS port 5173).

