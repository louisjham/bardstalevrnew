# AGENTS.md

This file provides guidance to agents when working with code in this repository.

> [!IMPORTANT]
> **Mandatory Startup Protocol**: At the start of any new session or task, read `MEMORY.md` and `TODO.md` before taking action. MEMORY.md is the authoritative source for current game state — it supersedes this file where they conflict.

---

## 🛠️ Commands

```bash
npm run dev        # HTTPS dev server on port 5173 (HTTPS required — WebXR won't work on HTTP)
npm run build      # Vite production bundle
npm test           # node --test src/**/*.test.js  (82/82 must pass)
```

**Run a single test file:**
```bash
node --test src/core/conditions/ConditionSystem.test.js
```

No linter or formatter is configured. No ESLint, Prettier, or TypeScript.

---

## ⚠️ Critical Non-Obvious Rules

### Tests
- Two incompatible test authoring styles coexist in the codebase:
  1. **`node:test` style** (preferred for new files): `import test from 'node:test'; import assert from 'node:assert/strict';` — tests run automatically by the runner.
  2. **Export style** (legacy): files export `runXxxTests()` that return `{ passed, total, results }` — these are NOT auto-discovered by `node --test`; they must be invoked manually or imported.
- Test files that use Three.js canvas APIs **must** mock `globalThis.document` and `globalThis.requestAnimationFrame` at the top if running headless. See `RetroRoom.test.js` for the canonical canvas mock pattern.
- Tests live **co-located** next to their source file (e.g. `src/core/conditions/ConditionSystem.test.js` alongside `ConditionSystem.js`).

### GameState Aliases (CRITICAL)
- `GameState.RETRO_ROOM` → now `INTRO_SCENE` (AmigaIntroScene, not RetroRoom)
- `GameState.TAVERN_INTRO` → now `ADVENTURERS_GUILD`
- Legacy aliases are preserved for backward compatibility but new code must use the new names.

### Dual VR + Desktop Compatibility (NON-NEGOTIABLE)
- Every feature must work in both **WebXR 6DOF VR** (Meta Quest 2/3, Vision Pro) and **Desktop fallback** (WASD, mouse, keyboard).
- Desktop eye height is locked at **`1.18m`**; WebXR rig is locked at **`0.0m`** (room-scale). Never change these.

### Dev Server
- Vite runs with `@vitejs/plugin-basic-ssl` — self-signed HTTPS is mandatory for WebXR. `npm run dev` automatically enables it on all network interfaces (`host: true`) for headset testing over LAN.

---

## 🏗️ Architecture

**Stack**: Vanilla JS ES modules + Three.js 0.170 + Vite 5. No framework (no React/Vue/Angular).

**Entry point**: `src/main.js` → `BardsTaleApp` class wires all systems.

**5-Location State Machine** (`src/core/game-loop/GameLoop.js`):
`INTRO_SCENE` → `ADVENTURERS_GUILD` → `GARTHS_SHOP` → `SKARA_BRAE_STREETS` → `COMBAT_ZONE`

**Key module map** (consult `MEMORY.md` for full detail):
- `src/core/combat/CombatEngine.js` — d20 CRPG engine; pre-allocated scratch buffers (`_scratchMessages`, `_aliveParty`, etc.) must never be replaced with new arrays — always clear and repopulate in-place.
- `src/core/encounter/EncounterGenerator.js` + `src/data/EncounterTables.js` — zero party scaling; strictly authentic 1985 difficulty tables.
- `src/data/SkaraBraeMapData.js` — `sourceToWorld()` / `worldToSource()` coordinate transforms between 1985 map coordinates and Three.js world space.
- `src/ui/spatial-hud/PalmBookMenu.js` — 512×512 canvas with `THREE.NearestFilter` (sharp retro pixel font). 4 tabs: MAP, PARTY, BUFFS, SPELLS.
- `src/xr/FreeLocomotion.js` — `halt()` must be called on encounter/combat entry; `revealTile()` drives fog-of-war on the Grimoire automap.

**GLB model pipeline**: `WeaponFactory.js`, `TavernFurnitureFactory.js`, `StreetPropsFactory.js`, `ArenaPropsFactory.js` each use `GLTFLoader` with full procedural fallback if `.glb` is missing — always implement the fallback when adding new prop factories.

---

## 📋 Lead XR Engineer Responsibilities & Workflow

1. **Design & Architecture**: Describe design and modular relationships first.
2. **Code Implementation**: Produce clean, modular, runnable code.
3. **Follow-up Tasks**: Consult `TODO.md` for roadmap tasks.

# Agent Rules <!-- tessl-managed -->

@.tessl/RULES.md follow the [instructions](.tessl/RULES.md)
