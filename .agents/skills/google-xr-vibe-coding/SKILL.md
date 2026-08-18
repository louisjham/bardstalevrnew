---
name: google-xr-vibe-coding
description: "Google XR Vibe Coding Gem: Expert guidance, design patterns, and spatial computing workflows for building immersive WebXR, 3D VR/AR experiences, spatial audio, and interactive VR games with Google Antigravity aesthetic and engineering standards."
---

# 🛸 Google XR Vibe Coding Gem

The **Google XR Vibe Coding Gem** is an AI-first spatial computing specialization designed for crafting rich, highly interactive, aesthetic 3D VR/AR web and native experiences.

---

## 🌟 Core Vibe Coding Philosophy

1. **Spatial First, Seamless Fallback**: Design primarily for 6DOF VR headsets (Meta Quest, Apple Vision Pro, Android XR) while offering desktop mouse/WASD and mobile touch fallbacks.
2. **Tactile Haptic & Audio Feedback**: Every interaction emits spatialized 3D positional audio and subtle haptic pulses on VR controllers.
3. **Immersive Atmosphere**: Rich lighting, fog, procedural audio, fantasy/sci-fi styling, particle effects, and dynamic low-latency rendering.
4. **Performance Budget**: Target **90 FPS** in WebXR / Native VR headsets (11.1ms per eye frame) and **60 FPS** on web desktop fallback.
5. **Fluid Micro-Interactions**: Direct grab physics, ray-casting UI panels, song-based spellcasting / instrument playing, dynamic UI menus attached to wrist/hand or floating in 3D space.

---

## 🛠️ Technology Stack & WebXR Architecture

- **Engine & Graphics**: Three.js / React Three Fiber / WebGL2 / WebGPU
- **VR/XR API**: WebXR Device API (`navigator.xr`), `VRButton` / `ARButton`
- **Audio System**: Web Audio API with `AudioListener`, `PositionalAudio`, and procedural Synthesizer nodes (ideal for Bard lute/songs)
- **Physics & Collisions**: Cannon-es / Rapier3D / Custom Raycasting
- **Input System**: `XRControllerModelFactory`, Hand Tracking (`XRHand`), WebXR Controller Select/Squeeze events, WASD/Orbit Controls desktop fallback

---

## 📜 Bard RPG & Spatial Gameplay Mechanics

- **Instrument Mechanics**: Interactive 3D Lute / Strings triggering procedural musical notes and spell effects.
- **Spellcasting Songs**: Musical pattern detection (playing chord/note sequences triggers visual magical particle effects and gameplay events).
- **Environment**: Immersive medieval taverns, mysterious dungeons, atmospheric torchlight, fog, volumetric soundscapes.
- **VR UI & HUD**: Non-intrusive 3D wrist menu, spatial floating panels, hands-free voice or gesture controls.

---

## ⚡ Performance Guidelines

- Max 100k polygons per scene on mobile WebXR devices.
- Texture compression: WebP / Basis Universal / GLTF Draco compression.
- Batching: `InstancedMesh` for repeated objects (torches, pillars, dungeon walls).
- Dynamic Shadows: 1 main directional light shadow caster + baked ambient light / lightmaps.
