# 🧠 The Bard's Tale VR - Agent Memory & Context

This file serves as persistent memory between agent sessions. Any agent starting work on this project should read this file, `AGENTS.md`, and `TODO.md`.

---

## 🎯 Current Project State & Architecture

The Bard's Tale VR is a WebXR + Three.js immersive VR/Desktop adaptation of the 1985 CRPG *The Bard's Tale*.

### 🕹️ 5-Location Game Loop (`src/core/game-loop/GameLoop.js`)
1. **🎵 Amiga-Style VR Intro Scene (`src/world/intro/AmigaIntroScene.js`)** — `GameState.INTRO_SCENE`:
   - Full-screen VR cinema quad showing animated Amiga Bard sprite + copper bar effect + scrolling story text.
   - 8-bit procedural music. Any button → main menu (New Game / Continue / Options / Credits). New Game → Guild.
   - Legacy alias: `GameState.RETRO_ROOM` maps to `INTRO_SCENE`.
2. **🛡️ Adventurers Guild (`src/world/FullVRTavern.js`)** — `GameState.ADVENTURERS_GUILD` (was `TAVERN_INTRO`):
   - Same tavern environment repurposed as Adventurers Guild.
   - **Guild Menu (`src/ui/spatial-hud/GuildMenuPanel.js`)**: Point at Bard + trigger → opens movable 2D spatial panel. Grab edges to drag. Bounded by room. X/B to close.
   - Top-level options: Create New Character, Add/Remove from Party, Name Party, Save Party, Delete Character, Delete Party.
   - Legacy alias: `GameState.TAVERN_INTRO` maps to `ADVENTURERS_GUILD`.
     - Includes high-detail 3D procedural fallbacks for Commodore 64 (rainbow C= logo & slanted PETSCII keyboard), 1541 Disk Drive (top cooling vents, drive slot, red/green LEDs), Atari 8-way Joystick (fire button), and Lava Lamp (pulsing glow).
   - **6-Phase Automated Cinematic Intro** (zero player interaction, zero camera motion for WebXR motion-sickness safety):
     - Phase 1 **FADE_IN** (1500ms): Black screen fades in to reveal the full 1980s bedroom with C64, disk drive, and floppy disk directly in front of the player.
     - Phase 2 **DISK_INSERT** (800ms): Floppy disk auto-slides into the 1541 drive with eased animation, red drive LED activates.
     - Phase 3 **BOOT_SEQUENCE** (3500ms): CRT blinks on (brief static burst), then types C64 BASIC boot text character-by-character (`**** COMMODORE 64 BASIC V2 ****`, `LOAD "Louis F Ham presents",8,1`, `SEARCHING...`, `LOADING`, `RUN`) with blinking cursor and drive LED flicker.
     - Phase 4 **FADE_TO_BLACK** (800ms): Screen fades to solid black.
     - Phase 5 **TITLE_CARD** (2800ms): Golden "The Bard's Tale" title card ignites with vortex flash-paper flare and particle burst in dark void.
     - Phase 6 **TRANSITION**: Fires callback → enters Tavern with 500ms fade-in-from-black.
   - Total cinematic duration: ~10.3 seconds. `skipCinematic()` available for instant skip.
2. **Skara Brae Tavern (`src/world/FullVRTavern.js`)**:
   - 1985 authentic animated sprite billboards (`AnimatedSprite.js`) for the 4 seated patrons (*Paladin, Wizard, Dwarf, Hobbit*) and the Bard on stage.
   - **Tactile Tavern Raycast Recruitment**: Replaced static tavern dialogue with direct raycast recruitment of seated patrons and the Bard. Recruits hop 0.2m with gold tint (`0xffea00`), colliders are removed from raycaster to prevent duplicates, and recruits queue into `pendingRecruits` (up to 6 heroes).
   - **Modular 3D Tavern Furniture Factory (`src/world/tavern/TavernFurnitureFactory.js`)**:
     - Built dedicated 3D tavern furniture construction module with dynamic `GLTFLoader` support for `.glb` models (`table.glb`, `bench.glb`, `bar_counter.glb`, `barrel.glb`, `mug.glb`, `chandelier.glb`).
     - Includes detailed 3D procedural fallbacks for Heavy Oak Slab Tables (iron corner brackets & rivets), Trestle Benches, Ale Tankards (amber liquid surface & white foam ring), and Oak Wine Barrels with iron hoops & brass tap spigot.
   - Live procedural lute & singing voice (`BardSynth.js`, `BardSinger.js`) with 3D floating lyric bubbles.
   - Quest 2/3 Touch controller door interaction (any button press enters Skara Brae / Garth's Shop).
3. **Garth's Weapons & Wonders (`src/world/garths-shop/GarthsShop.js`)**:
   - 1985 animated Garth sprite billboard behind the counter.
   - **Recruit Roster Display Billboard**: 2.0×2.0 4-frame animated sprite billboard (`bt1_01.png`) positioned physically behind Garth's counter at `(1.4, 1.35, -3.1)` with 3D text banner showing `"Next Up: [Name]"` and queue count. Automatically hides and triggers celebration toast when party is complete.
   - **Physical Weapon Class Bestowal**:
     - *Bard Lute* ➔ **Bard**
     - *Oak Staff* ➔ **Magician**
     - *Dagger* ➔ **Rogue**
     - *Broadsword / Battleaxe / Warhammer* ➔ **Warrior**
   - Automatically equips starter gear (`autoEquipCharacter`) and syncs party across HUD/Grimoire.
   - Physical 3D weapons on counter pedestals with 6DOF VR Grip grab and Desktop click/`[G]`/`[E]` grab.
   - **Modular 3D Weapon Factory & GLTFLoader Pipeline (`src/world/garths-shop/WeaponFactory.js`)**:
     - Integrated `GLTFLoader` to dynamically stream `.glb` weapon models from `public/assets/models/weapons/` (e.g. `magic-sword.glb`, `broadsword.glb`, `battleaxe.glb`, `shield.glb`, `staff.glb`, `lute.glb`, `warhammer.glb`, `dagger.glb`).
     - Includes ultra-detailed 3D procedural fallback models for all 7 weapon types (fuller-grooved broadsword with flared brass quillons, double-bevelled battleaxe with iron bands, heater shield with rivets & boss, wizard staff with crown claw & glowing mana crystal, 12-string acoustic lute with rosette soundboard, steel-flanged warhammer with armor-piercing spike, brass S-guard dagger).
   - Dynamic weapon physics swinging ($> 1.6\text{ m/s}$ in VR or Left Click/Space on Desktop) with whoosh audio (`playSwordSwing()`), haptic vibration, and blade spark trails.
4. **Canonical 30×30 Skara Brae City Grid (`src/world/skara-brae/SkaraBraeStreetScene.js`)**:
   - Exact 1985 30×30 city grid with Adventurers Guild, Temples (Tarjan & Divine Light), Review Board, Roscoe's Energy Emporium, and dynamic Day/Night lighting and SP regeneration.
   - **Modular 3D Street Props Factory (`src/world/skara-brae/StreetPropsFactory.js`)**:
     - Built dedicated 3D street prop construction module with dynamic `GLTFLoader` support for `.glb` models (`lamp_post.glb`, `door.glb`, `obelisk.glb`).
     - Includes high-detail 3D procedural fallbacks for Medieval Street Lamp Posts (turned iron shaft, crossbar brackets, glowing amber glass orb), Storefront Arched Wooden Doors (iron strap hinges, rivets, brass ring handle), and Gran Plaz White Marble Obelisk Monument (two-tiered octagonal plinth steps & 4-sided spire).
5. **3D Combat Arena (`src/world/combat-zone/CombatArena.js`)**:
   - Runic arena floor, front/back row party formation, monster sprites, and full CRPG d20 combat mechanics.
   - **Modular 3D Arena Props Factory (`src/world/combat-zone/ArenaPropsFactory.js`)**:
     - Built dedicated 3D arena/dungeon prop construction module with dynamic `GLTFLoader` support for `.glb` models (`brazier.glb`, `pillar.glb`, `chest.glb`).
     - Includes high-detail 3D procedural fallbacks for Standing Magical Braziers (tripod legs, fluted shaft, flared spiked fire bowl, glowing runic ember orb), Carved Dungeon Stone Pillars, and Iron-Banded Treasure Chests with keyhole lockplates.
   - **WebXR Spatial Narrative Combat Scroll (`src/ui/spatial-hud/SpatialCombatScroll.js`, `src/core/utils/MessageSpooler.js`, `src/core/combat/CombatNarrativeGrammar.js`)**:
     - Cylindrical curved wraparound parchment UI (`THREE.CylinderGeometry`, radius 2.0, height 1.0, radialSegments 32, thetaLength 0.6) locked in player's FOV (lower-right quadrant, angled inward).
     - 512×512 CanvasTexture with `THREE.NearestFilter` for authentic retro monospace pixel text.
     - **Modular Token-Replacement Grammar (`CombatNarrativeGrammar.js`)**: Dynamic sentence structure `[Subject] [Action Verb] [Target] [Resolution][Conditional Modifier]` based on weapon types (sword $\to$ "swings at", axe $\to$ "heaves at", dagger $\to$ "lunges at", bow $\to$ "fires an arrow at", unarmed $\to$ "strikes at", etc.) and monster attack kinds (snaps at, claws at, bashes at, stings at, breathes fire, etc.).
     - **Suspenseful Action-by-Action Pacing**: Asynchronous FIFO `MessageSpooler` yielding typewriter characters at ~20ms per character with an 800ms line delay. Individual combatant resolution evaluates one hero or monster action, prints character-by-character with mechanical clicks, pauses, updates 3D formations in real time upon hits/kills, and then proceeds to the next combatant.
     - Procedural mechanical typewriter click audio synthesized via `BardSynth.playTypewriterClick()`.
    - Physical terminal pixel scrolling via `ctx.drawImage(canvas, 0, -lineHeight)` and `ctx.clearRect()`.
    - Command attack buttons auto-disabled while narrative scroll or round is active (`isRoundInProgress`) to prevent action spamming.
    - **Modern 3D Combat Arena - Visual Feedback & Tactile Targeting (`CombatArena.js`)**:
      - `triggerHitAnimation(monsterMesh, isCritical)`: 50ms pure white (`0xffffff`) material flash + 200ms Z-axis knockback (-0.3 units) with elastic snapback oscillation.
      - `triggerDeathAnimation(monsterMesh)`: 300ms scale-down to 0 accompanied by vertical floor sink (-1.5 units) and an instant 28-particle `THREE.Points` amber spark burst (`createDeathParticleBurst`) with velocity, gravity decay, and additive blending.
      - **Tactile Raycast Monster Targeting**:
        - Selecting `[⚔️ Attack]` or `[✨ Cast Spell]` enters Targeting Mode instead of immediately firing.
        - Living monster billboards activate pulsating red ground targeting rings (`targetRing`) and radiant golden highlight tints (`0xfef08a`).
        - WebXR controller raycast (`xr.onSelect`), center reticle gaze (`[A]`), and desktop pointer clicks intersect monster billboards via `interactableMonsters` and route directly to `handleMonsterClick()`.
        - Clicking a designated monster immediately evaluates the turn action with that target, triggering hit/crit/death feedback and scrolling narrative log text.
      - **"⚡ BLITZ" Anti-Grind Mechanic**:
        - `CombatEngine.canBlitz()` calculates party average level vs highest monster level (threshold: party $\ge$ monster level + 3).
        - Renders a prominent golden-bordered `[⚡ BLITZ (AUTO-WIN)]` button on the combat command panel when eligible.
        - Clicking Blitz executes an instantaneous mathematical simulation loop without animation or spooler delays, rapidly awarding full XP and gold split to surviving heroes.

### 📖 Diegetic Field Command Deck / Spatial Grimoire (`src/ui/spatial-hud/PalmBookMenu.js`)
- Supinating hand (palm-up) summons the Grimoire; pronating (palm-down) dispels it. Left controller **Y** or **X** button toggles HUD mode.
- Internal 512×512 resolution canvas with `THREE.NearestFilter` for sharp retro pixel text in VR and Desktop.
- 4-Tab Navigation Index along outer edge: `[1: MAP] [2: PARTY] [3: BUFFS] [4: SPELLS]` + `[🔄 C64 DESK]`.
- **Tab 1 (Live Automap)**: 16×16 local grid centered on player source coordinates, directional chevron rotated by camera/rig heading with cardinal labels, landmark icons (`⚔️`, `🍺`, `🛡️`, `📜`, `🏛️`), and real-time fog of war discovery via `FreeLocomotion.js` (`revealTile`).
- **Tab 2 (Party Vitals)**: 6 hero rows with HP/SP bars, condition badges, and red warning cards (<25% HP / non-OK status).
- **Tab 3 (World Time & Buffs)**: Day/Night phase countdown (`mm:ss`), town services status, active Bard song turns remaining, and party buff list.
- **Tab 4 (Spellbook)**: Out-of-combat spells grouped by caster with SP verification, SP deduction, and live casting testing (`FLAME`, `ARMOR`, `VORPAL`).

### 🎲 1985-Accurate Encounter Generation Algorithm (`src/core/encounter/EncounterGenerator.js` & `src/data/EncounterTables.js`)
- Zero dynamic party scaling: strictly authentic area- and time-based encounter tables parsed from `bt1-encounter-tables.csv`.
- Spatial hash map parsed from `bt1-forced-encounters.csv` keyed by `{zone}_{x}_{y}` (Kylearan 99 Berserkers, Wine Cellar ambushes, Mangar guardians).
- 4-step pipeline: Step 1 (Forced Trigger Check) -> Step 2 (10% RNG Step Check & Table Selection) -> Step 3 (Group Count Roll) -> Step 4 (Group Ingestion).
- Group payload: array of structured monster objects with `name`, `quantity`, `ac`, `hpPerUnit`, and `spriteSlug`.
- Movement integration: `SkaraBraeGrid.checkStepTransition` evaluates `EncounterGenerator.evaluateStep` on walkable cell entries, halts locomotion (`locomotion.halt()`), locks HUD, and enters `GameState.COMBAT_ZONE`.

---

## 📋 Critical Guidelines for Any Incoming Agent
1. **Always verify tests and build**:
   - Run `npm test` (82/82 unit tests must pass).
   - Run `npm run build` (Vite production bundle must compile cleanly).
2. **Preserve Dual VR + Desktop Support**:
   - Every single feature must work in both WebXR 6DOF VR (Meta Quest, Vision Pro) and Desktop fallback (WASD, Mouse, Keybinds).
3. **Check `TODO.md` for Roadmap Tasks**:
   - Dungeon stairs/cellar transitions beneath Tavern & Skara Brae.
   - 3D spatial rune drawing gestures.
   - Bard song visual aura fields.
