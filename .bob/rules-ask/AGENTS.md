# Project Documentation Rules (Non-Obvious Only)

- **`MEMORY.md` is authoritative** — it is more current than `AGENTS.md`. When they conflict, trust `MEMORY.md`.
- **`src/world/retro-room/RetroRoom.js` is legacy** — the intro scene was replaced by `src/world/intro/AmigaIntroScene.js` in Oct 2026, but RetroRoom still has test coverage and its source is retained.
- **`FullVRTavern.js` is the Adventurers Guild**, not a tavern used for gameplay — the building was repurposed. The filename is misleading.
- **`GameState.RETRO_ROOM` and `TAVERN_INTRO`** are legacy aliases that still appear in some comments but route to `INTRO_SCENE` and `ADVENTURERS_GUILD`.
- **82/82 tests** (not 30/30 as noted in the older AGENTS.md header) is the current expected count per `MEMORY.md` and `TODO.md`.
- **Dev server HTTPS is not optional** — WebXR requires HTTPS; `npm run dev` serves via self-signed SSL on port 5173, available on all network interfaces for LAN headset testing.
