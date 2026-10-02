# 📜 The Bard's Tale VR - Project TODO & Development Roadmap

Welcome! This document outlines completed milestones and provides a clear foundation for continuing development on **The Bard's Tale VR**.

---

## ✅ Completed Features & Milestones

### ✅ Amiga-Style VR Intro Scene & Adventurers Guild Menu (Oct 2026)
- [x] **AmigaIntroScene (`src/world/intro/AmigaIntroScene.js`)**: Replaced Retro Room with animated VR intro screen.
  - Full-screen cinema quad (3.2m × 2.4m) with animated Bard sprite, copper bar effect, scrolling Skara Brae story text.
  - Procedural 8-bit BardSynth music. Any controller button/key press → reveals main menu.
  - Main menu: New Game (wired to ADVENTURERS_GUILD), Continue, Options, Credits (stubs).
- [x] **GameLoop renamed** (`src/core/game-loop/GameLoop.js`): `RETRO_ROOM` → `INTRO_SCENE`, `TAVERN_INTRO` → `ADVENTURERS_GUILD`. Legacy aliases preserved for backward compat.
- [x] **GuildMenuPanel (`src/ui/spatial-hud/GuildMenuPanel.js`)**: Spatial 2D draggable guild management panel.
  - Point at Bard + trigger → opens. Grab any edge to drag. Room-bounded. X/B button closes.
  - Top-level options: Create New Character, Add/Remove Character, Name Party, Save Party, Delete Character, Delete Party.
- [x] **main.js integrated**: All state machine, interaction handlers, render loop, gamepad handlers updated to new states. 82/82 tests still passing.

### 1. 💻 1980s Retro Room [REMOVED — replaced by AmigaIntroScene]
- ~~RetroRoom intro sequence replaced with Amiga-style VR intro in Oct 2026.~~
- Source preserved at `src/world/retro-room/RetroRoom.js` (test coverage retained).

### 2. 🍺 Skara Brae Tavern → Adventurers Guild (`src/world/FullVRTavern.js`)
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
- [x] **Tactile Tavern Raycast Recruitment**:
  - Replaced static Tavern dialogs with direct tactile recruitment phase upon clicking patrons or the Bard.
  - Recruited characters perform an animated 0.2m hop with gold tint (`0xffea00`) and are queued into `pendingRecruits` (up to 6 members).
  - Interactable colliders are removed from raycaster once recruited to prevent duplicate selection.
  - Interactive toast notifications announce recruitment progress (`🍻 [NAME] joins your company! ([X]/6)`).
- [x] **Quest 2 Touch Controller Door Interaction**: Highlight frame + large doorway trigger box; opens upon highlight + **ANY button press** on Meta Quest 2/3 Touch controllers.

### 3. 🛡️ Garth's Weapons & Wonders (`src/world/garths-shop/GarthsShop.js`)
- [x] **Equipment Shoppe Environment**: Stone walls, volumetric wall torches, crossed display blades, and shop banner.
- [x] **Recruit Roster Display Billboard**:
  - 2.0×2.0 4-frame animated sprite billboard (`bt1_01.png`) positioned physically behind Garth's counter at `(1.4, 1.35, -3.1)` facing the player.
  - Dynamic 3D canvas text banner showing `"Next Up: [Name]"` and pending queue count.
  - Automatically hides and triggers celebration toast (`"🛡️ Party fully assembled! The streets of Skara Brae await."`) once all pending recruits are equipped.
- [x] **Physical Weapon Class Bestowal**:
  - Picking or clicking weapons on the counter physically bestows the character class upon the next recruit in queue:
    - *Bard Lute* ➔ **Bard**
    - *Oak Staff* ➔ **Magician**
    - *Dagger* ➔ **Rogue**
    - *Broadsword / Battleaxe / Warhammer* ➔ **Warrior**
  - Newly created heroes are automatically equipped (`autoEquipCharacter`) with starter gear and added to the active party roster.
- [x] **Authentic 1985 Garth Sprite Billboard**: 4-frame animated sprite billboard of Garth (`bt1_56.png` / `garth.png`) behind the weapons counter.
- [x] **Garth Roster & Party Dialog**:
  - Tapping Garth opens an interactive Spatial UI modal with:
    - `[🎲 Create New Party]` — Launches the 6-hero custom party creation UI.
    - `[⚔️ Use Starter Party (6)]` — Instantly activates the canonical starter party (*Paladin, Warrior, Hunter, Rogue, Conjurer, Magician*).
- [x] **Automatic Starter Weapons & Armor**: Every newly created hero (standard or custom) is automatically equipped with authentic class-appropriate weapons, armor, helmets, shields, and instruments (`autoEquipCharacter`).
- [x] **Physical 3D Weapon Grabbing & Physics Swinging**:
  - 3D weapons (*Broadsword, Battleaxe, Oak Staff, Bard Lute, Iron Warhammer, Dagger*) rest on pedestals on the counter.
  - **Grabbing**: Hold Grip/Squeeze in VR or click/press `[G]`/`[E]` on Desktop to pick up and hold in hand.
  - **Swinging Physics**: Rapid hand movement ($> 1.6\text{ m/s}$ in VR) or `[Left Click]`/`[Space]` on Desktop plays procedural whoosh sound effects (`playSwordSwing()`), haptic vibration, and spawns blade-tip spark trails.
  - **Releasing**: Press `[G]`/`[E]` or Right-Click to return the weapon to its counter pedestal.
- [x] **Auto-Equip Station & Ledger**: Golden anvil auto-equip station & parchment ledger for inspecting equipment and character stats.

### 4. 📖 Palm-Flip 3D Grimoire / Diegetic Field Command Deck (`src/ui/spatial-hud/PalmBookMenu.js`)
- [x] **High-Resolution Retro Monospace Canvas**: Internal 512×512 canvas resolution using `THREE.NearestFilter` on `minFilter` and `magFilter` for razor-sharp pixelated text in WebXR and desktop.
- [x] **4-Tab Navigation Index**: Outer edge tabs `[1: MAP] [2: PARTY] [3: BUFFS] [4: SPELLS]` + `[🔄 C64 DESK]` accessible via raycast clicks, gamepad bumpers `[LB]`/`[RB]`, or keyboard keys `[1]`–`[4]`.
- [x] **Tab 1 (Live Automap)**:
  - 16×16 local grid centered dynamically on the player's source coordinates `(cx, cy)`.
  - Directional player chevron rotated according to camera/XRRig heading with cardinal orientation label (`NORTH`, `EAST`, `SOUTH`, `WEST`).
  - Landmark icons for Garth's Shoppe (`⚔️`), Tavern (`🍺`), Guild (`🛡️`), Review Board (`📜`), and Temples (`🏛️`).
  - Dynamic fog of war exploration synced in real time as player moves through `FreeLocomotion.js` (`revealTile`).
- [x] **Tab 2 (Party Vitals & Inspection)**:
  - 6 compact hero rows displaying Name, Class, Level, HP bar with numeric values, SP bar, and Condition badges (`OK`, `POISONED`, `DEAD`, etc.).
  - Prominent red alert styling (`rgba(239, 68, 68, 0.18)` background + `#ef4444` border) triggered when hero HP < 25% or condition !== `OK`.
- [x] **Tab 3 (World Time & Active Buffs)**:
  - Real-time Day/Night phase status card (`DAY`, `DUSK`, `NIGHT`, `DAWN`) with countdown timer formatted as `mm:ss`.
  - Town services status indicator (Open during daytime, Closed during nightfall).
  - Active Bard song tracking with turns remaining and buff details (`combatEngine.activeBardSong`).
  - Active party buff roster with stat modifiers and turn durations (`combatEngine.partyBuffs`).
- [x] **Tab 4 (Spellbook & Out-of-Combat Testing)**:
  - Out-of-combat spells grouped by caster from party spellcasters.
  - Interactive cast buttons verifying current SP vs cost; deducts SP and triggers live VFX emitters (`FLAME` for Mage Flame, `ARMOR` for Air Armor, `VORPAL` for Vorpal Plating).
- [x] **Natural Palm Gesture Tracking & Dual VR Controller Buttons**: Supinating hand (palm-up) summons the Grimoire with smooth scale-up animation; pronating hand (palm-down) dispels it. Left controller **Y** or **X** buttons toggle HUD mode.
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
- [x] **WebXR Spatial Narrative Combat Scroll (`src/ui/spatial-hud/SpatialCombatScroll.js`, `src/core/utils/MessageSpooler.js`, `src/core/combat/CombatNarrativeGrammar.js`)**:
  - Curved wraparound parchment UI (`THREE.CylinderGeometry`, radius 2.0, height 1.0, radialSegments 32, thetaLength 0.6) locked in player's FOV (lower-right quadrant, angled inward).
  - 512×512 off-screen canvas mapped to `THREE.CanvasTexture` with `THREE.NearestFilter` for crisp retro monospace pixel fonts.
  - **Authentic 1985 Modular Token-Replacement Grammar (`CombatNarrativeGrammar.js`)**: Sentence structure `[Subject] [Action Verb] [Target] [Resolution][Conditional Modifier]` mapped to weapon categories (`sword` $\to$ "swings at", `axe` $\to$ "heaves at", `dagger` $\to$ "lunges at", `bow` $\to$ "fires an arrow at", `unarmed` $\to$ "strikes at", `magic` $\to$ "casts", `instrument` $\to$ "plays") and monster attacks (`snaps at`, `claws at`, `bashes at`, `stings at`, `breathes fire`, `casts a spell at`).
  - **Suspenseful Action-by-Action Pacing**: Asynchronous FIFO `MessageSpooler` queue processing messages with ~20ms typewriter character pacing and 800ms line delay. Individual combatant resolution evaluates one hero or monster action, prints character-by-character with mechanical clicks, pauses, updates 3D formations in real time upon hits/kills, and then proceeds to the next combatant.
  - Procedural mechanical typewriter click audio synthesized via `BardSynth.playTypewriterClick()`.
  - Physical terminal pixel scrolling via `ctx.drawImage(canvas, 0, -lineHeight)` and `ctx.clearRect()`.
  - Command attack buttons auto-disabled while narrative scroll or round is active (`isRoundInProgress`) to prevent action spamming.
- [x] **Modern 3D Combat Arena - Visual Feedback & Tactile Targeting (`CombatArena.js`)**:
  - **Hit Visual Feedback (`triggerHitAnimation`)**: 50ms pure white (`0xffffff`) material flash + 200ms Z-axis knockback (-0.3 units) with elastic snapback oscillation.
  - **Death Visual Feedback (`triggerDeathAnimation`)**: 300ms scale-down to 0 accompanied by vertical floor sink (-1.5 units) and an instant 28-particle `THREE.Points` amber spark burst (`createDeathParticleBurst`) with velocity, gravity decay, and additive blending.
  - **Tactile Raycast Monster Targeting**:
    - Selecting `[⚔️ Attack]` or `[✨ Cast Spell]` enters Targeting Mode instead of immediately firing.
    - Living monster billboards activate pulsating red ground targeting rings (`targetRing`) and radiant golden highlight tints (`0xfef08a`).
    - WebXR controller raycast (`xr.onSelect`), center reticle gaze (`[A]`), and desktop pointer clicks intersect monster billboards via `interactableMonsters` and route directly to `handleMonsterClick()`.
    - Clicking a designated monster immediately evaluates the turn action with that target, triggering hit/crit/death feedback and scrolling narrative log text.
  - **"⚡ BLITZ" Anti-Grind Mechanic**:
    - `CombatEngine.canBlitz()` calculates party average level vs highest monster level (threshold: party $\ge$ monster level + 3).
    - Renders a prominent golden-bordered `[⚡ BLITZ (AUTO-WIN)]` button on the combat command panel when eligible.
    - Clicking Blitz executes an instantaneous mathematical simulation loop without animation or spooler delays, rapidly awarding full XP and gold split to surviving heroes.
- [x] **Hero Formation Swap**: Tap hero to make them turn head quizzically, tap second hero to swap battle order.
- [x] **CRPG Mechanics (`src/core/combat/CombatEngine.js`)**: AC mitigation, d20 hit rolls, 4-action monster AI slots, on-hit status afflictions, breath attacks, and survivor XP splits.

### 8. 🏃 Locomotion & Physics (`src/xr/FreeLocomotion.js`)
- [x] **Calibrated Avatar Height**: Desktop fallback eye height locked at **`1.18m`** (matches seated patrons and Bard); WebXR 6DOF VR rig locked at **`0.0m`** so room-scale physical head height is natural.
- [x] **Rolling Office Chair Gesture Locomotion**: Raising arm and forming a fist propels the player forward with gradual acceleration and caster drag friction. Moving the arm left/right spins the avatar while preserving momentum.
- [x] **2D Bumper Car Collisions**: Planar elastic bounce off walls, furniture, and counters with VR haptics.
- [x] **Controller Thumbstick & WASD**: Standard smooth locomotion and snap/smooth turning.
- [x] **Locomotion Halt (`halt()`)**: Immediate deceleration and key flush upon entering combat or triggering encounters.

### 9. 🎲 1985-Accurate Encounter Generation Algorithm (`src/core/encounter/EncounterGenerator.js` & `src/data/EncounterTables.js`)
- [x] **Data Parsers (`src/data/EncounterTables.js`)**:
  - Parsed `bt1-encounter-tables.csv` into a structured lookup dictionary mapped by Zone and Time (`SKARA_BRAE_DAY`, `SKARA_BRAE_NIGHT`, `WINE_CELLAR`, `CATACOMBS_L1`, `CATACOMBS_L2_3`, `HARKYNS_CASTLE`, `KYLEARANS_TOWER`, `MANGARS_TOWER`).
  - Parsed `bt1-forced-encounters.csv` into a spatial hash map keyed by `{zone}_{x}_{y}` (e.g. `kylearans_tower_0_15`, `wine_cellar_3_5`, `wine_cellar_7_12`).
  - Strict non-scaling design: Zero party scaling, preserving original 1985 Interplay difficulty curves.
- [x] **4-Step Encounter Pipeline (`EncounterGenerator.js`)**:
  - **Step 1 (Check Trigger)**: Evaluates `(zone, x, y, timeOfDay)` against the forced encounters spatial hash map. If matched (e.g. 4 groups of 99 Berserkers, Wine Cellar ambushes), immediately returns the fixed monster payload.
  - **Step 2 (RNG Check & Table Selection)**: For regular tiles, rolls a baseline encounter chance (10% per step). If triggered, selects the canonical table based on zone and time of day.
  - **Step 3 (Group Count Roll)**: Rolls group count strictly bounded by table constraints (`SKARA_BRAE_DAY` = strictly 1 group; `SKARA_BRAE_NIGHT` = 1–4 groups; `WINE_CELLAR` = 1–3 groups; Dungeons = 1–4 groups).
  - **Step 4 (Group Ingestion)**: Randomly selects monster IDs from the table's eligible pool (filtered from the 127 canonical monsters) and rolls quantity within capacity.
  - **Return Payload**: Returns an array of structured monster objects containing `name`, `quantity`, `ac`, `hpPerUnit`, and `spriteSlug` for animated sprite sheet rendering.
- [x] **Movement Loop Integration (`src/main.js` & `src/world/skara-brae/SkaraBraeGrid.js`)**:
  - `SkaraBraeGrid.checkStepTransition(playerX, playerZ)` detects transitions across walkable grid tiles.
  - Evaluates `EncounterGenerator.evaluateStep('streets', x, y, isNight)` on every new tile.
  - Upon encounter: halts locomotion (`locomotion.halt()`), dispels open HUD/Grimoire, queues `pendingCombatEncounter`, shows interactive encounter toast, and transitions state to `GameState.COMBAT_ZONE`.

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
- **Automated Unit Tests**: `node --test src/**/*.test.js` (82/82 Passing).
- **Production Build**: `npm run build` (Verified 0 errors).
- **Local Dev Server**: `npm run dev` (HTTPS port 5173).

