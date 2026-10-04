# Project Architecture Rules (Non-Obvious Only)

- **No framework, no build-time bundling of game logic** — vanilla JS ES modules loaded by Vite. All game systems are plain classes; no reactive state, no DI container.
- **Encounter system is intentionally non-scaling** — `EncounterGenerator.js` preserves authentic 1985 Interplay difficulty. Never add party-level scaling.
- **`main.js` is the integration hub** — all scene modules, UI panels, state machine transitions, gamepad handlers, and the render loop are wired together in `BardsTaleApp`. New systems must be registered there.
- **Combat scratch buffers are an architectural constraint** — `CombatEngine` pre-allocates reusable arrays to avoid per-tick GC; any combat system refactor must preserve this pattern.
- **GLB models are optional enhancements** — every 3D prop factory (`WeaponFactory`, `TavernFurnitureFactory`, `StreetPropsFactory`, `ArenaPropsFactory`) loads `.glb` dynamically and falls back to procedural Three.js geometry. The fallback is load-bearing, not optional.
- **Dual-path interaction** (WebXR raycast + desktop mouse/keyboard) must be maintained for every interactive element — no feature can be VR-only or desktop-only.
- **`FreeLocomotion.halt()`** is a state boundary: call it immediately when entering combat or a triggered encounter. Missing a `halt()` call causes locomotion to continue during combat.
- **Canvas UIs use `THREE.NearestFilter`** on both `minFilter` and `magFilter` for retro pixel-sharp rendering — never use linear filtering on game UI canvas textures.
- **Two coordinate systems** exist simultaneously: 1985 source map grid (integers, NW-origin) and Three.js world space. Always use `sourceToWorld()` / `worldToSource()` from `SkaraBraeMapData.js` to convert — hard-coded offsets will break on map layout changes.
