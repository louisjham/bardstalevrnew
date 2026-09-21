# 🛸 The Bard's Tale VR - Workspace Guidelines (Google XR Vibe Coding Gem)

Welcome to **The Bard's Tale VR**, powered by Google XR Vibe Coding principles!

## 🎯 Project Vision
An immersive WebXR 3D VR experience bringing medieval bard legend to life! Players can explore atmospheric taverns and dungeons, play interactive 3D musical instruments (Lute/Harp), cast song-based spells with spatial audio effects, and embark on quests in virtual reality or browser desktop fallback.

## 🛠️ Stack & Architecture
- **Framework**: Vite + Vanilla JavaScript / Three.js + XRBlocks Modular Architecture
- **XR Capabilities**: WebXR Device API (Headset 6DOF VR + Controller Ray/Grab + Hand Tracking + Desktop Orbit/WASD fallback)
- **Audio Engine**: Web Audio API (Spatial 3D Positional Audio, Procedural Bard Musical Instrument Synthesizer)
- **Styling**: Modern dark fantasy UI, glowing runic HUD elements, glassmorphism overlays

## 🚀 Key Directives & Startup Protocol
1. **Mandatory Session Startup Protocol**: When beginning any new session or task, you MUST consult `MEMORY.md`, `AGENTS.md`, and `TODO.md` to ground your understanding of current state, architecture, and pending roadmap items.
2. **Always maintain WebXR + Desktop dual support**: Ensure the app works seamlessly in VR headsets and non-VR browsers.
3. **Prioritize 3D Spatial Audio**: Sound is fundamental to a Bard game. Every note, spell, and ambient torch sound must use 3D positional audio.
4. **High Aesthetic Standards**: Dynamic lighting, atmospheric fog, particle systems, tactile interactive 3D objects.
5. **Adhere to AGENTS.md**: Follow all lead XR engineer guidelines specified in `AGENTS.md`.
