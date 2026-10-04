# Project Coding Rules (Non-Obvious Only)

- **Test runner is Node.js built-in** (`node --test`), not Jest/Vitest. New test files must use `import test from 'node:test'; import assert from 'node:assert/strict'` — NOT the legacy `export function runXxxTests()` pattern (those are not auto-discovered).
- **Single test**: `node --test src/path/to/file.test.js`
- **Canvas mock required** in any test that touches Three.js canvas APIs — copy the `globalThis.document` / `globalThis.requestAnimationFrame` mock block from `src/world/retro-room/RetroRoom.test.js`.
- **`CombatEngine` scratch buffers** (`_scratchMessages`, `_aliveParty`, `_frontRowScratch`, `_tempTargets`, etc.) are pre-allocated for GC pressure avoidance — never replace them with new arrays; always `.length = 0` then push in-place.
- **GameState names**: Use `INTRO_SCENE` and `ADVENTURERS_GUILD`; the old `RETRO_ROOM` and `TAVERN_INTRO` aliases exist only for backward compat.
- **Coordinate transforms**: Always use `sourceToWorld()` / `worldToSource()` from `src/data/SkaraBraeMapData.js` when converting between 1985 map grid coords and Three.js world space. Never hard-code the offset.
- **Prop factories must always include a procedural fallback** for when `.glb` models are missing. See `WeaponFactory.js`, `TavernFurnitureFactory.js`, `StreetPropsFactory.js`, `ArenaPropsFactory.js` as templates.
- **Eye height constants are non-negotiable**: Desktop = `1.18m`, WebXR rig = `0.0m`. Do not adjust.
- **No linter, no formatter, no TypeScript** — follow the existing vanilla JS ES-module style.
