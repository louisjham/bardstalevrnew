# 🥽 The Bard's Tale VR — Meta Quest 2 Manual Verification Test Matrix

**Scope**: 6DOF Spatial Computing, Tactile Interactions, Positional Audio & WebXR Hardware Edge Cases  
**Target Device**: Meta Quest 2 (via High-Speed USB-C Link / Meta Quest Browser over ADB Reverse)  
**Dev Server**: `https://localhost:5173` / `https://<PC-LAN-IP>:5173`  
**Complementary to**: Automated Unit Test Suites (`ReviewBoardEngine.test.js`, `ConditionSystem.test.js`, `EncounterGenerator.test.js`, `CombatSandbox.test.js`)

---

## 🚀 Quick Setup & Launch Guide

### Option A: Meta Quest Browser via USB Port Forwarding (Recommended Standalone WebXR)
1. **ADB Port Forwarding** *(already configured)*:
   ```bash
   adb reverse tcp:5173 tcp:5173
   ```
2. **Start Vite Dev Server**:
   ```bash
   npm run dev
   ```
3. **Inside Quest 2**:
   - Put on the headset.
   - Open **Meta Quest Browser**.
   - Navigate to `https://localhost:5173`.
   - If a self-signed SSL warning appears (*due to local basicSsl*), click **"Advanced"** $\rightarrow$ **"Proceed to localhost (unsafe)"**.
   - Click the glowing runic **"ENTER VR"** button on the bottom overlay.
4. **Live Chrome Remote Debugging**:
   - On your PC Chrome browser, navigate to `chrome://inspect/#devices`.
   - Click **"inspect"** under Meta Quest Browser to view real-time console logs, errors, and performance traces.

---

### Option B: Meta Quest Link (Oculus Link PC VR Stream)
1. Ensure the **Meta Quest Link** desktop app is open and running on your PC.
2. Inside Quest 2, open **Quick Settings** $\rightarrow$ select **Quest Link** $\rightarrow$ **Launch**.
3. On your PC desktop in Chrome/Edge, navigate to `https://localhost:5173`.
4. Click **"ENTER VR"** — the OpenXR runtime will immediately stream WebXR into your headset.

---

## 📋 Comprehensive Manual Verification Test Matrix

| ID | Category | Subsystem / Location | Specific Test Action | Expected Sensory & Functional Outcome | Verification Status |
|:---|:---|:---|:---|:---|:---:|
| **VR-01** | **Boot & Desk** | Retro C64 Room | Look down at 1985 wooden desk. Grab 5¼" floppy disk labeled *"The Bard's Tale VR"*. | Controller triggers haptic buzz on grab. Disk translates smoothly with controller grip. | 🔲 Pass / Fail |
| **VR-02** | **Boot & Desk** | 1541 Disk Drive | Insert floppy disk into 1541 drive slot. | Disk smoothly snaps into drive with mechanical click sound. Drive red LED illuminates. | 🔲 Pass / Fail |
| **VR-03** | **Boot & Desk** | CRT Monitor Portal | Watch C64 BASIC `LOAD "THEBARDSTALEVR",8,1` boot text on CRT. Physically lean head into the monitor screen. | Screen glow intensifies; passing head threshold triggers magical portal transition sound and transports player into the Tavern. | 🔲 Pass / Fail |
| **VR-04** | **Spatial Audio** | Skara Brae Tavern | Walk/teleport around the Tavern while the Bard sings *"The Evil in Skara Brae"*. | Audio accurately pans between left/right ear relative to head orientation. Volume attenuates naturally with distance from the performer stage. | 🔲 Pass / Fail |
| **VR-05** | **Spatial Audio** | Fireplace Hearth | Walk toward crackling stone fireplace on the right tavern wall. | 3D crackling wood and ember positional audio grows louder in the right ear as you approach. | 🔲 Pass / Fail |
| **VR-06** | **Diegetic UI** | 3D Floating Lyrics | Observe floating 3D speech lyric bubbles emanating from Bard. | Runic lyric bubbles billboard toward player's head orientation, floating upward and fading gently without visual clipping. | 🔲 Pass / Fail |
| **VR-07** | **Tactile Weapons** | Garth's Weapons Shoppe | Reach out controller to grab Broadsword, Battleaxe, Staff, and Shield from Garth's counter. | Weapon snaps into virtual hand with haptic click. Tapping weapon onto character slot equips item with audio confirmation. | 🔲 Pass / Fail |
| **VR-08** | **Diegetic HUD** | Palm-Flip Grimoire | Flip left wrist palm upward toward headset face. | 3D Grimoire book smoothly summons into palm with parchment opening sound. | 🔲 Pass / Fail |
| **VR-09** | **Diegetic HUD** | Grimoire Tab Navigation | Aim right controller laser ray at tabs (`1. Heroes`, `2. Automap`, `3. Spells`) and squeeze trigger. | Pages flip with audio response. Selected tab highlights in glowing purple/gold. | 🔲 Pass / Fail |
| **VR-10** | **Live Spell VFX** | Grimoire Page 3 Spells | Activate `Mage Flame`, `Air Armor`, or `Vorpal Plating` in Grimoire live spell sandbox. | Dual hand flame particle emitters attach to controllers; 6-inch amber shield bubble encases hand; electrical sparks emit on weapon swing. | 🔲 Pass / Fail |
| **VR-11** | **Locomotion** | Skara Brae Streets | Push left thumbstick forward (Free Locomotion) / right thumbstick (Snap Turn). | Player moves smoothly down cobblestone streets at 2.8 m/s without nausea; snap turn increments by 45° cleanly. | 🔲 Pass / Fail |
| **VR-12** | **Day/Night Lighting**| Skara Brae Streets | Observe lighting and sky transition between daylight sun and midnight moon. | Directional shadows rotate; torch point lights cast warm dynamic flicker on stone walls. | 🔲 Pass / Fail |
| **VR-13** | **Storefront Gating** | Review Board Door (`23, 20`)| Approach Review Board during Day vs Night. | Day: Door opens into Elder advancement chamber. Night: Door remains locked with wooden shutter notice *"Closed until Dawn"*. | 🔲 Pass / Fail |
| **VR-14** | **3D Combat Arena**| Combat Zone Entry | Encounter roaming monsters or step on encounter tile. | Smooth camera fade into 3D Battle Room with glowing runic floor & burning purple/red braziers. | 🔲 Pass / Fail |
| **VR-15** | **Combat Hierarchy**| Spatial Party Formation | Observe party formation in Combat Arena. | Front 3 heroes appear lower and closer; Back 3 heroes appear elevated and further back. | 🔲 Pass / Fail |
| **VR-16** | **Tactile Combat** | Quizzical Formation Swap| Aim controller at Hero A (pull trigger), then aim at Hero B (pull trigger). | Hero A quizzically turns head toward controller; clicking Hero B swaps their spatial formation slots with a swift transition. | 🔲 Pass / Fail |
| **VR-17** | **3D Text Readability**| Scrolling Battle Log | Read scrolling CRPG battle log text in VR space from 1.5–2 meters away. | Font is sharp, non-aliasing, and fully legible without headset eye strain. | 🔲 Pass / Fail |
| **VR-18** | **Status Afflictions**| Hero Condition Display | Have party suffer Poison (`POIS`), Withered (`OLD`), Stoned (`STON`), or Paralysis (`PARA`). | Portrait in Grimoire Page 1 dynamically updates with green poison skull, purple curse shadow, or stone texture. | 🔲 Pass / Fail |

---

## 🔍 Playtesting Notes & Feedback Log

| Test ID | Tester Name | Headset Firmware | FPS / Framerate | Comfort Rating (1–5) | Observations / Defects Found |
|:---:|:---:|:---:|:---:|:---:|:---|
| | | | | | |
| | | | | | |
| | | | | | |
