import * as THREE from 'three';
import { GameState, GameLoop } from './core/game-loop/GameLoop.js';
import { WorldTimeEngine, TimeOfDay, TIME_RULES } from './core/time/WorldTimeEngine.js';
import { RecoveryEngine, CharacterStatus } from './core/recovery/RecoverySystem.js';
import { BardSynth } from './audio/BardSynth.js';
import { BardSinger } from './audio/BardSinger.js';
import { XRManager } from './xr/XRManager.js';
import { XRRig } from './xr/XRRig.js';
import { FreeLocomotion } from './xr/FreeLocomotion.js';
import { GamepadManager, GamepadButtons, GamepadAxes } from './xr/GamepadManager.js';
import { RetroRoom } from './world/retro-room/RetroRoom.js';
import { FullVRTavern } from './world/FullVRTavern.js';
import { GarthsShop } from './world/garths-shop/GarthsShop.js';
import { SkaraBraeGrid } from './world/skara-brae/SkaraBraeGrid.js';
import { SkaraBraeStreetScene } from './world/skara-brae/SkaraBraeStreetScene.js';
import { CombatArena } from './world/combat-zone/CombatArena.js';
import { PalmBookMenu } from './ui/spatial-hud/PalmBookMenu.js';
import { GrimoireTutorialWindow } from './ui/spatial-hud/GrimoireTutorialWindow.js';
import { PartyCreationUI } from './ui/PartyCreationUI.js';
import { CharacterCardUI } from './ui/CharacterCardUI.js';
import { TempleUI } from './ui/TempleUI.js';
import { RoscoeUI } from './ui/RoscoeUI.js';
import { ReviewBoardUI } from './ui/ReviewBoardUI.js';
import { GameDirector } from './agents/game-director/GameDirector.js';

class BardsTaleApp {
  constructor() {
    this.container = document.getElementById('canvas-container');

    // Three.js Scene Setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 1.18, 0); // Eye height (1.18m matching Bard and seated patrons)

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Audio Engine & Singer
    this.synth = new BardSynth();
    this.singer = new BardSinger(this.synth, (lyricText) => {
      if (this.tavern) this.tavern.updateLyricText(lyricText);
    });

    // Game Director AI & State Machine
    this.gameDirector = new GameDirector();
    this.gameLoop = new GameLoop((newState) => this.handleStateTransition(newState));

    // Authentic Day / Night World Time Engine
    this.timeEngine = new WorldTimeEngine(
      this.gameLoop.party,
      (newPhase, oldPhase, rules) => {
        if (this.streetScene) {
          this.streetScene.setDayNightMode(newPhase);
        }
        if (newPhase === TimeOfDay.DUSK) {
          this.synth.init();
          this.synth.playSequence(['E4', 'C4', 'A3'], 250);
        } else if (newPhase === TimeOfDay.NIGHT) {
          this.synth.init();
          this.synth.playSequence(['D3', 'F3', 'D2'], 350);
        } else if (newPhase === TimeOfDay.DAWN || newPhase === TimeOfDay.DAY) {
          this.synth.init();
          this.synth.playSequence(['C4', 'E4', 'G4', 'C5'], 180);
        }
      },
      (notificationMsg, phase) => {
        this.showToast(notificationMsg);
        if (phase === TimeOfDay.NIGHT || phase === TimeOfDay.DUSK) {
          this.gamepad.vibrate(0.4, 150);
        }
      }
    );

    // Skara Brae City & Dungeon Grid
    this.skaraBraeGrid = new SkaraBraeGrid(this.scene);

    // Temple, Roscoe, and Review Board Sanctuary UI Modals
    this.templeUI = new TempleUI(this.gameLoop.party, (msg) => {
      this.showToast(msg);
      this.synth.init();
      this.synth.playSequence(['F4', 'A4', 'C5', 'F5'], 180);
      this.gamepad.vibrate(0.4, 150);
    });

    this.roscoeUI = new RoscoeUI(this.gameLoop.party, (msg) => {
      this.showToast(msg);
      this.synth.init();
      this.synth.playSequence(['D4', 'G4', 'B4', 'D5'], 150);
      this.gamepad.vibrate(0.4, 120);
    });

    this.reviewBoardUI = new ReviewBoardUI(this.gameLoop.party, (msg) => {
      this.showToast(msg);
      this.synth.init();
      this.synth.playSequence(['C4', 'E4', 'G4', 'C5'], 180);
      this.gamepad.vibrate(0.5, 200);
    });

    // Skara Brae Street 3D Environment with Real-Time Storefronts
    this.streetScene = new SkaraBraeStreetScene(
      this.scene,
      this.camera,
      () => {
        if (this.timeEngine.areTownServicesOpen) {
          this.gameLoop.setState(GameState.GARTHS_SHOP);
        } else {
          this.showToast("🚪 Garth's Equipment Shoppe is shuttered for the night. Return at daybreak or rest at the Adventurers Guild!");
          this.gamepad.vibrate(0.3, 100);
        }
      },
      () => this.gameLoop.setState(GameState.TAVERN_INTRO),
      () => {
        this.timeEngine.restUntilMorning();
        this.partyUI.show();
      },
      () => {
        if (this.timeEngine.areTownServicesOpen) {
          this.reviewBoardUI.show(this.gameLoop.party);
        } else {
          this.showToast("📜 The Review Board is closed until morning light. Seek shelter at the Adventurers Guild.");
          this.gamepad.vibrate(0.3, 100);
        }
      },
      (templeName, isTarjan) => {
        this.templeUI.show(templeName, isTarjan);
      },
      () => {
        this.roscoeUI.show(this.gameLoop.party);
      }
    );

    // Live Spell Visual Effect Emitters (Mage Flame, Air Armor, Vorpal Plating)
    this.activeSpellEffects = [];
    this.airArmorShield = null;

    // Palm-Flip 3D Grimoire / Player Book
    this.grimoire = new PalmBookMenu(
      this.scene,
      this.camera,
      (spellType, spellName) => {
        this.triggerLiveSpellTesting(spellType, spellName);
      },
      () => {
        this.restartGame();
      }
    );
    this.grimoire.setGridReference(this.skaraBraeGrid);

    // Spatially Locked Transparent Grimoire Tutorial Window (5-second auto fade)
    this.grimoireTutorial = new GrimoireTutorialWindow(this.scene);

    // Character Cards & Inventory Management Modal
    this.characterCardUI = new CharacterCardUI(this.gameLoop.party, (msg) => this.showToast(msg));

    // XR Camera Rig (camera lives inside this group; locomotion moves the rig, not the camera)
    this.xrRig = new XRRig(this.camera, this.scene);

    // Standard Gamepad Controller Engine (Xbox, PlayStation, Generic USB/BT)
    this.gamepad = new GamepadManager({
      onConnect: (pad, name) => {
        this.showToast(`🎮 Gamepad Connected: ${name}`);
        this.updateGamepadHUDStatus(true, name);
      },
      onDisconnect: (pad, name) => {
        this.showToast(`🎮 Gamepad Disconnected: ${name}`);
        this.updateGamepadHUDStatus(false);
      }
    });

    // Free Locomotion & XR Manager (both operate on the rig)
    this.locomotion = new FreeLocomotion(this.camera, this.scene, this.xrRig, this.gamepad);
    this.xr = new XRManager(this.renderer, this.camera, this.scene, this.xrRig);
    this.locomotion.setXRManager(this.xr);
    this.locomotion.setGridReference(this.skaraBraeGrid);
    this.locomotion.onBounce = () => {
      this.gamepad.vibrate(0.5, 90);
    };

    // 1. Location 1: 1980s Retro Room (C64 & Floppy Load)
    this.retroRoom = new RetroRoom(this.scene, this.camera, () => {
      this.gameLoop.setState(GameState.TAVERN_INTRO);
    }, this.xrRig);

    // 2. Location 2: Skara Brae Tavern (Title Screen)
    this.tavern = new FullVRTavern(
      this.scene,
      () => this.partyUI.show(),
      () => this.gameLoop.setState(GameState.GARTHS_SHOP)
    );
    this.tavern.setVisible(false);

    // 3. Location 3: Garth's Weapons & Wonders (Shop & Party Gear)
    this.garthsShop = new GarthsShop(
      this.scene,
      this.camera,
      () => this.gameLoop.setState(GameState.SKARA_BRAE_STREETS),
      this.gameLoop.party,
      () => this.characterCardUI.show(this.gameLoop.party)
    );

    // 4. Location 4: Dedicated 3D Spatial Combat Arena
    this.combatArena = new CombatArena(this.scene, this.camera, (victory) => {
      this.gameLoop.setState(GameState.TAVERN_INTRO);
      this.showToast(victory ? "🏆 Returned to Tavern!" : "💀 Escaped Combat!");
    });

    // Party Creation UI
    this.partyUI = new PartyCreationUI((party) => {
      this.gameLoop.setParty(party);
      this.garthsShop.party = party; // Keep shop's party reference in sync
      this.timeEngine.setParty(party);
      this.templeUI.setParty(party);
      this.roscoeUI.setParty(party);
      this.reviewBoardUI.setParty(party);
      this.characterCardUI.setParty(party);
      this.grimoire.updatePartyData(party);
      this.showToast(`⚔️ Party Assembled (${party.length} Heroes)! Proceeding to Garth's Shop...`);
      this.gameLoop.setState(GameState.GARTHS_SHOP);
    });

    // Raycasters (Mouse pointer and Center-Screen Aiming Reticle)
    this.mouseRaycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.centerRaycaster = new THREE.Raycaster();
    this.focusedTarget = null;
    this.gridInspector = null;

    this.bindEvents();
    this.handleStateTransition(GameState.RETRO_ROOM);
    this.startLoop();
  }

  updateGamepadHUDStatus(connected, name = 'Standard Gamepad') {
    const statusEl = document.getElementById('gamepad-status');
    const hudNameEl = document.getElementById('gamepad-hud-name');
    if (statusEl) {
      statusEl.textContent = connected ? `🎮 ${name}` : '🎮 Gamepad Ready';
      if (connected) statusEl.classList.add('active');
      else statusEl.classList.remove('active');
    }
    if (hudNameEl) {
      hudNameEl.textContent = connected ? name : 'Controller';
    }
  }

  // LIVE SPELL TESTING OUTSIDE COMBAT (Mage Flame, Air Armor, Vorpal Plating)
  triggerLiveSpellTesting(spellType, spellName) {
    this.synth.init();
    this.synth.playSequence(['G3', 'B3', 'D4', 'G4'], 180);
    this.showToast(`✨ LIVE SPELL TESTED: ${spellName}!`);
    this.gamepad.vibrate(0.5, 180);

    if (spellType === 'FLAME') {
      // Mage Flame: Ignite both hands in real-time flames & particle embers
      const count = 40;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 0.4;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
        pos[i * 3 + 2] = -0.5 + (Math.random() - 0.5) * 0.4;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pSystem = new THREE.Points(
        geo,
        new THREE.PointsMaterial({ color: 0xf97316, size: 0.05, transparent: true, blending: THREE.AdditiveBlending })
      );
      this.camera.add(pSystem);
      this.activeSpellEffects.push({ pSystem, life: 2.0 });
    } else if (spellType === 'ARMOR') {
      // Air Armor: Translucent amber shield 6 inches from skin that moves with player
      if (this.airArmorShield) {
        this.camera.remove(this.airArmorShield);
      }
      const shieldGeo = new THREE.SphereGeometry(0.55, 16, 16);
      const shieldMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.35,
        wireframe: true
      });
      this.airArmorShield = new THREE.Mesh(shieldGeo, shieldMat);
      this.airArmorShield.position.set(0, -0.1, -0.4);
      this.camera.add(this.airArmorShield);
    }
  }

  handleStateTransition(newState) {
    this.showToast(`🌌 Transitioning Location: ${newState}`);

    this.retroRoom.setVisible(false);
    this.tavern.setVisible(false);
    this.garthsShop.setVisible(false);
    this.streetScene.setVisible(false);
    this.skaraBraeGrid.setVisible(false);
    this.combatArena.arenaGroup.visible = false;
    this.scene.fog = null;

    const songbookPanel = document.querySelector('.songbook-panel');
    if (songbookPanel) {
      if (newState === GameState.RETRO_ROOM || newState === GameState.COMBAT_ZONE) {
        songbookPanel.style.display = 'none';
      } else {
        songbookPanel.style.display = 'block';
      }
    }

    // Position the XRRig (floor-level). In desktop mode, camera local Y provides
    // eye height (1.18m). In VR, physical head tracking provides the offset.
    if (newState === GameState.RETRO_ROOM) {
      this.retroRoom.setVisible(true);
      this.grimoire.setEnabled(false);
      this.grimoireTutorial.hide();
      this.retroRoom.startCinematicSequence(() => {
        this.gameLoop.setState(GameState.TAVERN_INTRO);
      });
    } else if (newState === GameState.TAVERN_INTRO) {
      this.tavern.setVisible(true);
      this.grimoire.setEnabled(false);
      this.grimoireTutorial.hide();
      this.xrRig.setPosition(0, 0, 1.2);
      this.camera.position.set(0, 1.18, 0); // Desktop eye height locked at eye-level with Bard/patrons (1.18m)
      this.camera.rotation.z = 0; // Ensure roll is cleared
      this.synth.init();
      this.singer.startSong();
      this.tavern.playEntranceTransition();
      this.showToast("🍺 Welcome to Skara Brae Tavern!");
    } else if (newState === GameState.GARTHS_SHOP) {
      this.singer.stopSong();
      this.garthsShop.setVisible(true);
      this.grimoire.setEnabled(true);
      this.xrRig.setPosition(0, 0, 1.8);
      this.camera.position.set(0, 1.18, 0); // Desktop eye height locked at eye-level (1.18m)
      this.camera.rotation.z = 0;

      // Introduce the book and show spatially locked transparent tutorial menu
      const headPos = new THREE.Vector3();
      const headQuat = new THREE.Quaternion();
      this.camera.getWorldPosition(headPos);
      this.camera.getWorldQuaternion(headQuat);
      this.grimoireTutorial.show(headPos, headQuat);
      this.synth.init();
      this.synth.playSequence(['E4', 'G4', 'B4', 'E5'], 140);
      this.showToast("✨ The Grimoire is now unlocked! Flip your palm UP to summon.");
      if (this.xr.isVRActive) {
        this.xr.triggerHaptics(0, 0.6, 120);
      }
    } else if (newState === GameState.SKARA_BRAE_STREETS) {
      this.singer.stopSong();
      this.streetScene.setVisible(true);
      this.skaraBraeGrid.setVisible(true);
      this.grimoire.setEnabled(true);
      this.scene.fog = new THREE.FogExp2(0x090d16, 0.035);
      // Spawn outside Garth's Shop at (25, 18), facing West
      this.xrRig.setPosition(31.5, 0, -10.5);
      this.xrRig.setYRotation(Math.PI / 2);
      this.camera.position.set(0, 1.18, 0); // Desktop eye height locked at eye-level (1.18m)
      this.camera.rotation.z = 0;
      this.skaraBraeGrid.revealTile(31.5, -10.5);
      this.showToast("🏰 You step out into the streets of Skara Brae outside Garth's Shoppe");
    } else if (newState === GameState.COMBAT_ZONE) {
      this.grimoire.setEnabled(true);
      this.xrRig.setPosition(0, 0, 0);
      this.camera.position.set(0, 1.18, 0); // Desktop eye height locked at eye-level (1.18m)
      this.camera.rotation.z = 0;
      const isNight = this.timeEngine ? this.timeEngine.isNight : false;
      const monsters = this.gameDirector.generateEncounter(1, isNight);
      this.combatArena.enterCombat(this.gameLoop.party, monsters);
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Keyboard Shortcuts: M / Tab for Grimoire, C / I for Character Cards, N for Day/Night Advance, 1/2/3 for Pages
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' || e.code === 'Tab') {
        e.preventDefault();
        if (!this.grimoire.enabled) {
          this.showToast("🔒 The Grimoire unlocks once you assemble your party and visit Garth's Shop!");
          return;
        }
        this.grimoire.toggleBookDesktop();
        this.showToast(this.grimoire.isOpen ? "📖 Grimoire & Automap Opened" : "📖 Grimoire Closed");
      } else if (e.code === 'KeyC' || e.code === 'KeyI') {
        e.preventDefault();
        this.characterCardUI.toggle(this.gameLoop.party);
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        this.restartGame();
      } else if (e.code === 'KeyN') {
        this.timeEngine.advanceToNextPhase();
      } else if (this.grimoire.isOpen) {
        if (e.code === 'Digit1') this.grimoire.setPage(1);
        else if (e.code === 'Digit2') this.grimoire.setPage(2);
        else if (e.code === 'Digit3') this.grimoire.setPage(3);
      }
    });

    // Unified Interaction Handler across Desktop Mouse & WebXR Controllers (Select & Squeeze/Grip)
    const handleInteraction = (raycaster, controllerIndex = null, isGrip = false) => {
      if (!raycaster) return;

      // Check Grimoire Canvas Touch Clicks if open
      if (this.grimoire.isOpen) {
        const bookIntersects = raycaster.intersectObject(this.grimoire.textMesh);
        if (bookIntersects.length > 0) {
          if (controllerIndex !== null) this.xr.triggerHaptics(controllerIndex, 0.6, 80);
          this.grimoire.handleCanvasClick(bookIntersects[0].uv, (msg) => this.showToast(msg));
          return;
        }
      }

      const state = this.gameLoop.currentState;

      if (state === GameState.RETRO_ROOM) {
        const intersects = raycaster.intersectObjects(this.retroRoom.interactableObjects, true);

        // Generous Proximity Grab Fallback for VR controllers near the floppy disk on desk (0.14, 0.77, -0.38)
        let proximityGrab = false;
        if (controllerIndex !== null && this.xr.controllers[controllerIndex]) {
          const controller = this.xr.controllers[controllerIndex];
          const ctrlWorldPos = new THREE.Vector3();
          controller.getWorldPosition(ctrlWorldPos);
          const diskWorldPos = new THREE.Vector3(0.14, 0.77, -0.38);
          if (ctrlWorldPos.distanceTo(diskWorldPos) < 0.45) {
            proximityGrab = true;
          }
        }

        if (intersects.length > 0 || proximityGrab) {
          if (controllerIndex !== null) this.xr.triggerHaptics(controllerIndex, 0.95, 140);
          if (this.retroRoom.isBootComplete) {
            this.gameLoop.setState(GameState.TAVERN_INTRO);
            this.showToast("🍺 Entering Skara Brae Tavern...");
          } else {
            this.synth.init();
            this.synth.playSequence(['E5', 'B4', 'G5'], 90);
            this.retroRoom.insertFloppyDisk();
            this.showToast("💾 Inserting Floppy Disk into 1541 Drive...");
          }
        }
      } else if (state === GameState.GARTHS_SHOP) {
        const intersects = raycaster.intersectObjects(this.garthsShop.interactableObjects, true);
        if (intersects.length > 0) {
          let obj = intersects[0].object;
          while (obj && !obj.userData.isWeapon && !obj.userData.isExitDoor && !obj.userData.isAutoEquipParty && !obj.userData.isCharacterCards && obj.parent) {
            obj = obj.parent;
          }
          if (controllerIndex !== null) this.xr.triggerHaptics(controllerIndex, 0.75, 100);
          if (obj && obj.userData.isWeapon) {
            this.garthsShop.equipItem(obj.userData.itemData || obj.userData.name, (msg) => this.showToast(msg));
          } else if (obj && obj.userData.isAutoEquipParty) {
            this.garthsShop.autoEquipEntireParty((msg) => this.showToast(msg));
            this.characterCardUI.setParty(this.gameLoop.party);
            this.grimoire.updatePartyData(this.gameLoop.party);
          } else if (obj && obj.userData.isCharacterCards) {
            this.characterCardUI.show(this.gameLoop.party);
          } else if (obj && obj.userData.isExitDoor) {
            this.gameLoop.setState(GameState.SKARA_BRAE_STREETS);
          }
        }
      } else if (state === GameState.SKARA_BRAE_STREETS) {
        const intersects = raycaster.intersectObjects(this.streetScene.interactableObjects, true);
        if (intersects.length > 0) {
          let obj = intersects[0].object;
          while (obj && !obj.userData.isGarthDoor && !obj.userData.isTavernDoor && !obj.userData.isGuildDoor && !obj.userData.isReviewBoardDoor && !obj.userData.isTempleDoor && !obj.userData.isRoscoeDoor && obj.parent) {
            obj = obj.parent;
          }
          if (controllerIndex !== null) this.xr.triggerHaptics(controllerIndex, 0.75, 100);
          if (obj && obj.userData.isGarthDoor) {
            if (this.timeEngine.areTownServicesOpen) {
              this.gameLoop.setState(GameState.GARTHS_SHOP);
              this.showToast("🛡️ Entering Garth's Equipment Shoppe...");
            } else {
              this.showToast("🚪 Garth's Equipment Shoppe is shuttered for the night. Return at daybreak or rest at the Adventurers Guild!");
            }
          } else if (obj && obj.userData.isTavernDoor) {
            this.gameLoop.setState(GameState.TAVERN_INTRO);
            this.showToast("🍺 Entering The Scarlet Bard Tavern...");
          } else if (obj && obj.userData.isGuildDoor) {
            this.timeEngine.restUntilMorning();
            this.synth.init();
            this.synth.playSequence(['C4', 'E4', 'G4', 'C5'], 180);
            this.partyUI.show();
          } else if (obj && obj.userData.isReviewBoardDoor) {
            if (this.timeEngine.areTownServicesOpen) {
              this.reviewBoardUI.show(this.gameLoop.party);
            } else {
              this.showToast("📜 The Review Board is closed until morning light. Seek shelter at the Adventurers Guild.");
            }
          } else if (obj && obj.userData.isTempleDoor) {
            this.templeUI.show(obj.userData.templeName, obj.userData.isTarjan);
          } else if (obj && obj.userData.isRoscoeDoor) {
            this.roscoeUI.show(this.gameLoop.party);
          }
        }
      } else if (state === GameState.COMBAT_ZONE) {
        const heroIntersects = raycaster.intersectObjects(this.combatArena.interactableHeroes, true);
        if (heroIntersects.length > 0) {
          let mesh = heroIntersects[0].object;
          while (mesh && !mesh.userData.isHeroMesh && mesh.parent) {
            mesh = mesh.parent;
          }
          if (mesh && mesh.userData.isHeroMesh) {
            if (controllerIndex !== null) this.xr.triggerHaptics(controllerIndex, 0.8, 120);
            this.combatArena.handleHeroSwapClick(mesh, (msg) => this.showToast(msg));
            return;
          }
        }

        const btnIntersects = raycaster.intersectObjects(this.combatArena.interactableButtons, true);
        if (btnIntersects.length > 0) {
          if (controllerIndex !== null) this.xr.triggerHaptics(controllerIndex, 0.8, 120);
          const action = btnIntersects[0].object.userData.action;
          this.combatArena.executeCommand(action, this.synth, (i, int, d) => this.xr.triggerHaptics(i, int, d));
        }
      } else if (state === GameState.TAVERN_INTRO) {
        const intersects = raycaster.intersectObjects(this.tavern.interactableObjects, true);
        if (intersects.length > 0) {
          let obj = intersects[0].object;
          while (obj && !obj.userData.isBard && !obj.userData.isDoor && !obj.userData.isAleMug && obj.parent) {
            obj = obj.parent;
          }
          if (controllerIndex !== null) this.xr.triggerHaptics(controllerIndex, 0.75, 100);
          if (obj && obj.userData.isBard) {
            this.partyUI.show();
          } else if (obj && obj.userData.isDoor) {
            this.gameLoop.setState(GameState.GARTHS_SHOP);
          } else if (obj && obj.userData.isAleMug) {
            this.tavern.drinkMug(obj, (msg) => this.showToast(msg));
          }
        }
      }
    };

    // 1. Desktop Pointer / Mouse Click
    window.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.hud-overlay') || e.target.closest('.hud-header') || e.target.closest('.party-modal') || e.target.closest('.character-cards-modal')) return;

      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.mouseRaycaster.setFromCamera(this.mouse, this.camera);
      handleInteraction(this.mouseRaycaster, null, false);
    });

    // 2. WebXR Controller Trigger (Select) and Grip (Squeeze) Listeners
    this.xr.onSelectStart = (controllerIndex, controller, raycaster) => {
      handleInteraction(raycaster, controllerIndex, false);
    };
    this.xr.onSelect = (controllerIndex, controller, raycaster) => {
      handleInteraction(raycaster, controllerIndex, false);
    };
    this.xr.onSqueezeStart = (controllerIndex, controller, raycaster) => {
      handleInteraction(raycaster, controllerIndex, true);
    };
    this.xr.onSqueeze = (controllerIndex, controller, raycaster) => {
      handleInteraction(raycaster, controllerIndex, true);
    };

    // HUD Action Buttons
    document.getElementById('open-party-hud-btn').addEventListener('click', () => {
      this.partyUI.show();
    });

    document.getElementById('restart-song-btn').addEventListener('click', () => {
      this.singer.stopSong();
      this.singer.startSong();
      this.showToast("🎵 Bard is singing 'The Evil in Skara Brae'");
    });

    const restartHeaderBtn = document.getElementById('restart-c64-header-btn');
    if (restartHeaderBtn) {
      restartHeaderBtn.addEventListener('click', () => this.restartGame());
    }

    const restartBtn = document.getElementById('restart-c64-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restartGame());
    }

    document.getElementById('exit-game-hud-btn').addEventListener('click', () => {
      this.restartGame();
    });

    const hudActions = document.querySelector('.hud-actions');
    if (hudActions) {
      const cardsBtn = document.createElement('button');
      cardsBtn.className = 'action-btn gold-btn';
      cardsBtn.textContent = '📜 Character Cards';
      cardsBtn.addEventListener('click', () => this.characterCardUI.toggle(this.gameLoop.party));
      hudActions.appendChild(cardsBtn);

      const streetsBtn = document.createElement('button');
      streetsBtn.className = 'action-btn gold-btn';
      streetsBtn.textContent = "🏰 Skara Brae";
      streetsBtn.addEventListener('click', () => this.gameLoop.setState(GameState.SKARA_BRAE_STREETS));
      hudActions.appendChild(streetsBtn);

      const dayNightBtn = document.createElement('button');
      dayNightBtn.className = 'action-btn gold-btn';
      dayNightBtn.textContent = "☀️/🌙 Day/Night";
      dayNightBtn.addEventListener('click', () => {
        this.streetScene.toggleDayNight();
        this.showToast(`☀️ Sky Toggled: ${this.streetScene.dayNightMode.toUpperCase()} Mode`);
      });
      hudActions.appendChild(dayNightBtn);

      const garthBtn = document.createElement('button');
      garthBtn.className = 'action-btn gold-btn';
      garthBtn.textContent = "🛡️ Garth's Shop";
      garthBtn.addEventListener('click', () => this.gameLoop.setState(GameState.GARTHS_SHOP));
      hudActions.appendChild(garthBtn);

      const combatBtn = document.createElement('button');
      combatBtn.className = 'action-btn gold-btn';
      combatBtn.textContent = '⚔️ 3D Combat';
      combatBtn.addEventListener('click', () => this.gameLoop.setState(GameState.COMBAT_ZONE));
      hudActions.appendChild(combatBtn);
    }
  }

  // Update Center Aiming Reticle Raycasting
  updateCenterReticle() {
    this.centerRaycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const reticleEl = document.getElementById('center-reticle');
    const promptEl = document.getElementById('reticle-prompt');
    if (!reticleEl || !promptEl) return;

    this.focusedTarget = null;
    let promptText = '';

    // If Grimoire is open, raycast into book canvas
    if (this.grimoire.isOpen && this.grimoire.textMesh) {
      const bookIntersects = this.centerRaycaster.intersectObject(this.grimoire.textMesh);
      if (bookIntersects.length > 0) {
        this.focusedTarget = { type: 'GRIMOIRE', uv: bookIntersects[0].uv };
        promptText = '📖 [A] Select / Test';
      }
    }

    if (!this.focusedTarget) {
      const state = this.gameLoop.currentState;
      if (state === GameState.RETRO_ROOM) {
        const intersects = this.centerRaycaster.intersectObjects(this.retroRoom.interactableObjects, true);
        if (intersects.length > 0) {
          if (this.retroRoom.isBootComplete) {
            this.focusedTarget = { type: 'RETRO_ENTER', object: intersects[0].object };
            promptText = '🎮 [A] Enter Skara Brae Tavern';
          } else {
            this.focusedTarget = { type: 'RETRO_FLOPPY', object: intersects[0].object };
            promptText = '💾 [A] Insert Floppy Disk';
          }
        }
      } else if (state === GameState.GARTHS_SHOP) {
        const intersects = this.centerRaycaster.intersectObjects(this.garthsShop.interactableObjects, true);
        if (intersects.length > 0) {
          let obj = intersects[0].object;
          while (obj && !obj.userData.isWeapon && !obj.userData.isExitDoor && !obj.userData.isAutoEquipParty && !obj.userData.isCharacterCards && obj.parent) {
            obj = obj.parent;
          }
          if (obj && obj.userData.isWeapon) {
            const name = obj.userData.name || 'Weapon';
            this.focusedTarget = { type: 'GARTH_WEAPON', object: obj };
            promptText = `⚔️ [A] Equip ${name}`;
          } else if (obj && obj.userData.isAutoEquipParty) {
            this.focusedTarget = { type: 'GARTH_AUTO_EQUIP', object: obj };
            promptText = '🛡️ [A] Auto-Equip Entire Party';
          } else if (obj && obj.userData.isCharacterCards) {
            this.focusedTarget = { type: 'GARTH_CARDS', object: obj };
            promptText = '📜 [A] Inspect Character Cards & Inventory';
          } else if (obj && obj.userData.isExitDoor) {
            this.focusedTarget = { type: 'GARTH_DOOR', object: obj };
            promptText = '🚪 [A] Exit to Skara Brae Streets';
          }
        }
      } else if (state === GameState.SKARA_BRAE_STREETS) {
        const intersects = this.centerRaycaster.intersectObjects(this.streetScene.interactableObjects, true);
        if (intersects.length > 0) {
          let obj = intersects[0].object;
          while (obj && !obj.userData.isGarthDoor && !obj.userData.isTavernDoor && !obj.userData.isGuildDoor && !obj.userData.isReviewBoardDoor && !obj.userData.isTempleDoor && !obj.userData.isRoscoeDoor && obj.parent) {
            obj = obj.parent;
          }
          if (obj && obj.userData.isGarthDoor) {
            this.focusedTarget = { type: 'STREET_GARTH_DOOR', object: obj };
            promptText = this.timeEngine.areTownServicesOpen ? "🛡️ [A] Enter Garth's Equipment Shoppe" : "🚪 [A] Garth's Shoppe (Closed at Night)";
          } else if (obj && obj.userData.isTavernDoor) {
            this.focusedTarget = { type: 'STREET_TAVERN_DOOR', object: obj };
            promptText = "🍺 [A] Enter The Scarlet Bard Tavern";
          } else if (obj && obj.userData.isGuildDoor) {
            this.focusedTarget = { type: 'STREET_GUILD_DOOR', object: obj };
            promptText = "🛡️ [A] Rest at Adventurers Guild (Safe Haven)";
          } else if (obj && obj.userData.isReviewBoardDoor) {
            this.focusedTarget = { type: 'STREET_REVIEW_BOARD_DOOR', object: obj };
            promptText = this.timeEngine.areTownServicesOpen ? "📜 [A] Enter Review Board (Level Up)" : "📜 [A] Review Board (Closed at Night)";
          } else if (obj && obj.userData.isTempleDoor) {
            this.focusedTarget = { type: 'STREET_TEMPLE_DOOR', object: obj };
            promptText = obj.userData.isTarjan ? "🗡️ [A] Enter Temple of Tarjan (Free for Rogues)" : "🏛️ [A] Enter Temple of Divine Light (Heal & Purify)";
          } else if (obj && obj.userData.isRoscoeDoor) {
            this.focusedTarget = { type: 'STREET_ROSCOE_DOOR', object: obj };
            promptText = "⚡ [A] Enter Roscoe's Emporium (Recharge SP)";
          }
        }
      } else if (state === GameState.COMBAT_ZONE) {
        const btnIntersects = this.centerRaycaster.intersectObjects(this.combatArena.interactableButtons, true);
        if (btnIntersects.length > 0) {
          const btn = btnIntersects[0].object;
          this.focusedTarget = { type: 'COMBAT_BUTTON', object: btn, action: btn.userData.action };
          promptText = `⚔️ [A] ${btn.userData.action}`;
        } else {
          const heroIntersects = this.centerRaycaster.intersectObjects(this.combatArena.interactableHeroes, true);
          if (heroIntersects.length > 0) {
            let mesh = heroIntersects[0].object;
            while (mesh && !mesh.userData.isHeroMesh && mesh.parent) {
              mesh = mesh.parent;
            }
            if (mesh && mesh.userData.isHeroMesh) {
              this.focusedTarget = { type: 'COMBAT_HERO', mesh };
              promptText = `🔄 [A] Swap ${mesh.userData.heroData?.name || 'Hero'}`;
            }
          }
        }
      } else if (state === GameState.TAVERN_INTRO) {
        const intersects = this.centerRaycaster.intersectObjects(this.tavern.interactableObjects, true);
        let doorHit = false;
        if (intersects.length > 0) {
          let obj = intersects[0].object;
          while (obj && !obj.userData.isBard && !obj.userData.isDoor && !obj.userData.isAleMug && obj.parent) {
            obj = obj.parent;
          }
          if (obj && obj.userData.isBard) {
            this.focusedTarget = { type: 'TAVERN_BARD', object: obj };
            promptText = '📜 [A] Talk to Bard (Party Creation)';
          } else if (obj && obj.userData.isDoor) {
            this.focusedTarget = { type: 'TAVERN_DOOR', object: obj };
            promptText = "🚪 [A] Enter Garth's Shop";
            doorHit = true;
          } else if (obj && obj.userData.isAleMug) {
            this.focusedTarget = { type: 'TAVERN_ALE', object: obj };
            promptText = "🍺 [A] Drink Skara Brae Dark Ale";
          }
        }

        if (!doorHit) {
          const headPos = this.xrRig.getWorldHeadPosition();
          if (this.tavern.checkDoorProximity(headPos, 2.5)) {
            this.focusedTarget = { type: 'TAVERN_DOOR' };
            promptText = "🚪 [A] Enter Garth's Shop";
            doorHit = true;
          }
        }

        this.tavern.setDoorHighlighted(doorHit);
        this.isTavernDoorHighlighted = doorHit;
      }
    }

    if (this.focusedTarget && promptText) {
      reticleEl.classList.add('focused');
      promptEl.textContent = promptText;
      promptEl.classList.remove('hidden');
    } else {
      reticleEl.classList.remove('focused');
      promptEl.classList.add('hidden');
    }
  }

  executeTargetInteraction(target) {
    if (!target) return;
    this.synth.init();

    if (target.type === 'GRIMOIRE') {
      this.grimoire.handleCanvasClick(target.uv, (msg) => this.showToast(msg));
      this.gamepad.vibrate(0.3, 80);
    } else if (target.type === 'RETRO_ENTER') {
      this.gameLoop.setState(GameState.TAVERN_INTRO);
      this.gamepad.vibrate(0.4, 120);
    } else if (target.type === 'RETRO_FLOPPY') {
      if (this.retroRoom.isBootComplete) {
        this.gameLoop.setState(GameState.TAVERN_INTRO);
        this.gamepad.vibrate(0.4, 120);
      } else {
        this.retroRoom.insertFloppyDisk();
        this.showToast("💾 Sliding Floppy Disk into 1541 Drive...");
        this.gamepad.vibrate(0.4, 150);
      }
    } else if (target.type === 'TAVERN_BARD') {
      this.partyUI.show();
      this.gamepad.vibrate(0.3, 100);
    } else if (target.type === 'TAVERN_DOOR') {
      this.gameLoop.setState(GameState.GARTHS_SHOP);
      this.gamepad.vibrate(0.4, 120);
    } else if (target.type === 'TAVERN_ALE') {
      this.tavern.drinkMug(target.object, (msg) => this.showToast(msg));
      this.gamepad.vibrate(0.5, 200);
    } else if (target.type === 'GARTH_WEAPON') {
      const obj = target.object;
      this.garthsShop.equipItem(obj.userData.itemData || obj.userData.name, (msg) => this.showToast(msg));
      this.gamepad.vibrate(0.5, 120);
    } else if (target.type === 'GARTH_AUTO_EQUIP') {
      this.garthsShop.autoEquipEntireParty((msg) => this.showToast(msg));
      this.characterCardUI.setParty(this.gameLoop.party);
      this.grimoire.updatePartyData(this.gameLoop.party);
      this.gamepad.vibrate(0.6, 250);
    } else if (target.type === 'GARTH_CARDS') {
      this.characterCardUI.show(this.gameLoop.party);
      this.gamepad.vibrate(0.3, 100);
    } else if (target.type === 'GARTH_DOOR') {
      this.gameLoop.setState(GameState.SKARA_BRAE_STREETS);
      this.gamepad.vibrate(0.3, 100);
    } else if (target.type === 'STREET_GARTH_DOOR') {
      if (this.timeEngine.areTownServicesOpen) {
        this.gameLoop.setState(GameState.GARTHS_SHOP);
        this.showToast("🛡️ Entering Garth's Equipment Shoppe...");
        this.gamepad.vibrate(0.4, 120);
      } else {
        this.showToast("🚪 Garth's Equipment Shoppe is shuttered for the night. Return at daybreak or rest at the Adventurers Guild!");
        this.gamepad.vibrate(0.3, 100);
      }
    } else if (target.type === 'STREET_TAVERN_DOOR') {
      this.gameLoop.setState(GameState.TAVERN_INTRO);
      this.showToast("🍺 Entering The Scarlet Bard Tavern...");
      this.gamepad.vibrate(0.4, 120);
    } else if (target.type === 'STREET_GUILD_DOOR') {
      this.timeEngine.restUntilMorning();
      this.synth.init();
      this.synth.playSequence(['C4', 'E4', 'G4', 'C5'], 180);
      this.gamepad.vibrate(0.5, 200);
      this.partyUI.show();
    } else if (target.type === 'STREET_REVIEW_BOARD_DOOR') {
      if (this.timeEngine.areTownServicesOpen) {
        this.reviewBoardUI.show(this.gameLoop.party);
      } else {
        this.showToast("📜 The Review Board is closed until morning light. Seek shelter at the Adventurers Guild.");
        this.gamepad.vibrate(0.3, 100);
      }
    } else if (target.type === 'STREET_TEMPLE_DOOR') {
      this.templeUI.show(target.object.userData.templeName, target.object.userData.isTarjan);
    } else if (target.type === 'STREET_ROSCOE_DOOR') {
      this.roscoeUI.show(this.gameLoop.party);
    } else if (target.type === 'COMBAT_BUTTON') {
      this.combatArena.executeCommand(target.action, this.synth, (i, int, d) => this.gamepad.vibrate(int, d));
    } else if (target.type === 'COMBAT_HERO') {
      this.combatArena.handleHeroSwapClick(target.mesh, (msg) => this.showToast(msg));
      this.gamepad.vibrate(0.3, 80);
    }
  }

  // Handle Gamepad Controller Button Events
  handleGamepadInput() {
    if (!this.gamepad.connected) return;

    // Button A (0) or RT (7): Primary Action / Interact with focused target or execute command
    if (this.gamepad.justPressed(GamepadButtons.A) || this.gamepad.justPressed(GamepadButtons.RT)) {
      if (this.partyUI && this.partyUI.overlay && !this.partyUI.overlay.classList.contains('hidden')) {
        this.partyUI.autoGenerateParty();
        this.gamepad.vibrate(0.4, 100);
        return;
      }

      if (this.focusedTarget) {
        this.executeTargetInteraction(this.focusedTarget);
      } else if (this.gameLoop.currentState === GameState.COMBAT_ZONE) {
        const action = this.combatArena.getSelectedAction();
        this.combatArena.executeCommand(action, this.synth, (i, int, d) => this.gamepad.vibrate(int, d));
      } else if (this.gameLoop.currentState === GameState.RETRO_ROOM && !this.retroRoom.isDiskInserted) {
        this.retroRoom.insertFloppyDisk();
        this.showToast("💾 Sliding Floppy Disk into 1541 Drive...");
        this.gamepad.vibrate(0.4, 150);
      }
    }

    // Button Y (3) or SELECT (8): Toggle 3D Grimoire / Automap Book
    if (this.gamepad.justPressed(GamepadButtons.Y) || this.gamepad.justPressed(GamepadButtons.SELECT)) {
      if (!this.grimoire.enabled) {
        this.showToast("🔒 The Grimoire unlocks upon visiting Garth's Shop!");
        this.gamepad.vibrate(0.2, 50);
        return;
      }
      this.grimoire.toggleBookDesktop();
      this.gamepad.vibrate(0.25, 70);
      this.showToast(this.grimoire.isOpen ? "📖 Grimoire & Automap Opened" : "📖 Grimoire Closed");
    }

    // Button B (1): Cancel / Back / Defend
    if (this.gamepad.justPressed(GamepadButtons.B)) {
      if (this.partyUI && this.partyUI.overlay && !this.partyUI.overlay.classList.contains('hidden')) {
        this.partyUI.hide();
        this.gamepad.vibrate(0.2, 50);
        return;
      }
      if (this.grimoire.isOpen) {
        this.grimoire.toggleBookDesktop(false);
        this.gamepad.vibrate(0.2, 50);
        this.showToast("📖 Grimoire Closed");
        return;
      }
      if (this.gameLoop.currentState === GameState.COMBAT_ZONE) {
        this.combatArena.executeCommand('DEFEND', this.synth, (i, int, d) => this.gamepad.vibrate(int, d));
      }
    }

    // Button X (2): Quick Party UI / Song
    if (this.gamepad.justPressed(GamepadButtons.X)) {
      if (this.gameLoop.currentState === GameState.TAVERN_INTRO) {
        this.partyUI.show();
        this.gamepad.vibrate(0.3, 80);
      } else if (this.gameLoop.currentState === GameState.COMBAT_ZONE) {
        this.combatArena.executeCommand('SONG', this.synth, (i, int, d) => this.gamepad.vibrate(int, d));
      } else {
        this.partyUI.show();
        this.gamepad.vibrate(0.3, 80);
      }
    }

    // Bumpers LB (4) / RB (5) & D-Pad Left (14) / Right (15): Page flips or Combat Commands
    if (this.grimoire.isOpen) {
      if (this.gamepad.justPressed(GamepadButtons.LB) || this.gamepad.justPressed(GamepadButtons.DPAD_LEFT)) {
        this.grimoire.prevPage();
        this.gamepad.vibrate(0.2, 50);
      }
      if (this.gamepad.justPressed(GamepadButtons.RB) || this.gamepad.justPressed(GamepadButtons.DPAD_RIGHT)) {
        this.grimoire.nextPage();
        this.gamepad.vibrate(0.2, 50);
      }
    } else if (this.gameLoop.currentState === GameState.COMBAT_ZONE) {
      if (this.gamepad.justPressed(GamepadButtons.LB) || this.gamepad.justPressed(GamepadButtons.DPAD_LEFT) || this.gamepad.justPressed(GamepadButtons.DPAD_UP)) {
        this.combatArena.cycleCommand(-1);
        this.gamepad.vibrate(0.2, 40);
      }
      if (this.gamepad.justPressed(GamepadButtons.RB) || this.gamepad.justPressed(GamepadButtons.DPAD_RIGHT) || this.gamepad.justPressed(GamepadButtons.DPAD_DOWN)) {
        this.combatArena.cycleCommand(1);
        this.gamepad.vibrate(0.2, 40);
      }
    }

    // Start (9): Quick Controls Help
    if (this.gamepad.justPressed(GamepadButtons.START)) {
      this.showToast("🎮 Controls: [L-Stick] Move  [R-Stick] Look  [A] Interact  [Y] Grimoire  [LB/RB] Page/Cmd");
      this.gamepad.vibrate(0.3, 80);
    }
  }

  exitGame() {
    this.showToast("🚪 Exiting Game... Goodbye Adventurer!");
    if (this.renderer.xr.isPresenting) {
      const session = this.renderer.xr.getSession();
      if (session) session.end();
    }
  }

  restartGame() {
    this.singer.stopSong();
    this.synth.init();
    this.synth.playSequence(['G4', 'E4', 'C4'], 120);

    // Reset Retro Room 1541 disk & CRT monitor
    this.retroRoom.reset();

    // Reset Grimoire availability and tutorial window
    this.grimoire.setEnabled(false);
    if (this.grimoireTutorial) {
      this.grimoireTutorial.hide();
      this.grimoireTutorial.hasBeenShown = false;
    }

    // Reset game state back to 1980s retro room
    this.gameLoop.setState(GameState.RETRO_ROOM);
    this.showToast("🔄 Game Restarted: Back at the 1985 C64 Desk!");

    if (this.grimoire.isOpen) {
      this.grimoire.toggleBookDesktop(false);
    }
  }

  showToast(message) {
    const toast = document.getElementById('toast-notification');
    if (toast) {
      toast.textContent = message;
      toast.classList.remove('hidden');
      clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
      }, 3200);
    }
  }

  startLoop() {
    let lastTime = performance.now();

    this.renderer.setAnimationLoop((timestamp, frame) => {
      const now = timestamp || performance.now();
      const deltaTime = Math.min((now - lastTime) * 0.001, 0.1);
      lastTime = now;
      const time = now * 0.001;

      const xrSession = this.renderer.xr.getSession();
      const refSpace = this.renderer.xr.getReferenceSpace();

      // Poll Gamepad Controller state
      this.gamepad.update();
      this.handleGamepadInput();

      // Free Locomotion & Grid Tile Exploration
      if (this.gameLoop.currentState !== GameState.COMBAT_ZONE) {
        this.locomotion.update(deltaTime, xrSession, frame, refSpace, this.gameLoop.currentState);
        const headPos = this.xrRig.getWorldHeadPosition();
        this.skaraBraeGrid.revealTile(headPos.x, headPos.z);
        if (this.gridInspector) {
          this.gridInspector.update(headPos.x, headPos.z, this.xrRig.rig.rotation.y);
        }
      }

      // Update Center Aiming Reticle (Desktop / Gamepad Mode)
      if (!this.xr.isVRActive) {
        this.updateCenterReticle();
      }
      if (this.grimoire.isOpen) {
        this.grimoire.updateDesktop();
      }

      // Update Retro Room C64
      if (this.gameLoop.currentState === GameState.RETRO_ROOM) {
        this.retroRoom.update(time, deltaTime);
      }

      // Smooth fade-from-black transition when entering Tavern
      if (this.retroRoom && this.retroRoom.screenOverlay && this.retroRoom.screenOverlay.material.opacity > 0) {
        this.retroRoom.screenOverlay.material.opacity = Math.max(0, this.retroRoom.screenOverlay.material.opacity - deltaTime * 0.9);
      }

      // Update Spatially Locked Grimoire Tutorial Window (5s Auto-Fade)
      if (this.grimoireTutorial) {
        this.grimoireTutorial.update(deltaTime);
      }

      // Palm Flip Grimoire & VR Controller Button Polling
      if (this.xr.isVRActive) {
        this.grimoire.updateGesture(
          this.xr.controllers[0],
          this.xr.controllers[1],
          (intensity, duration) => this.xr.triggerHaptics(0, intensity, duration),
          deltaTime,
          this.xr.hands
        );

        // Quest 2 Touch Controller Polling (Door Opening & Grimoire Toggle)
        if (xrSession && xrSession.inputSources) {
          // Check Tavern Door Interaction in VR: Any Button on Quest 2 Opens Door when near or pointing at it
          if (this.gameLoop.currentState === GameState.TAVERN_INTRO) {
            const headPos = this.xrRig.getWorldHeadPosition();
            const isNearDoor = this.tavern.checkDoorProximity(headPos, 2.6);
            let isRayOnDoor = false;

            for (let cIdx = 0; cIdx < 2; cIdx++) {
              if (this.xr.controllers[cIdx]) {
                const ray = this.xr.getControllerRaycaster(this.xr.controllers[cIdx]);
                const hits = ray.intersectObjects(this.tavern.interactableObjects, true);
                if (hits.length > 0 && hits.some(h => {
                  let cur = h.object;
                  while (cur && !cur.userData.isDoor && cur.parent) cur = cur.parent;
                  return cur && cur.userData.isDoor;
                })) {
                  isRayOnDoor = true;
                  break;
                }
              }
            }

            const isDoorActive = isNearDoor || isRayOnDoor;
            this.tavern.setDoorHighlighted(isDoorActive);
            this.isTavernDoorHighlighted = isDoorActive;

            if (isDoorActive) {
              for (let idx = 0; idx < xrSession.inputSources.length; idx++) {
                const src = xrSession.inputSources[idx];
                if (src && src.gamepad && src.gamepad.buttons) {
                  const anyPressed = src.gamepad.buttons.some(b => b && (b.pressed || b.value > 0.35));
                  if (anyPressed && !this._doorCooldown) {
                    this._doorCooldown = true;
                    this.gameLoop.setState(GameState.GARTHS_SHOP);
                    this.showToast("🛡️ Entering Garth's Equipment Shoppe...");
                    this.xr.triggerHaptics(idx, 0.85, 140);
                    setTimeout(() => { this._doorCooldown = false; }, 500);
                    break;
                  }
                }
              }
            }
          }

          // Check WebXR Controller Y / X Button Press for Grimoire Toggle
          for (let idx = 0; idx < xrSession.inputSources.length; idx++) {
            const src = xrSession.inputSources[idx];
            if (src && src.gamepad && src.gamepad.buttons) {
              const btnX = src.gamepad.buttons[4]; // X on left touch controller
              const btnY = src.gamepad.buttons[5]; // Y on left touch controller
              if ((btnY && btnY.pressed) || (btnX && btnX.pressed)) {
                if (this.grimoire.enabled && !this._vrButtonCooldown) {
                  this._vrButtonCooldown = true;
                  this.grimoire.toggleBookDesktop();
                  this.xr.triggerHaptics(idx, 0.5, 100);
                  this.showToast(this.grimoire.isOpen ? "📖 Grimoire & Automap Opened" : "📖 Grimoire Closed");
                  setTimeout(() => { this._vrButtonCooldown = false; }, 400);
                }
              }
            }
          }
        }
      }

      // Update Live Spell Effects
      for (let i = this.activeSpellEffects.length - 1; i >= 0; i--) {
        const item = this.activeSpellEffects[i];
        item.life -= deltaTime;
        if (item.life <= 0) {
          this.camera.remove(item.pSystem);
          this.activeSpellEffects.splice(i, 1);
        }
      }

      // Update Day / Night World Time Engine
      if (this.timeEngine) {
        this.timeEngine.update(deltaTime);
        const clockIcon = document.getElementById('day-night-icon');
        const clockText = document.getElementById('day-night-text');
        const clockServices = document.getElementById('day-night-services');
        if (clockIcon && clockText && clockServices) {
          const isNight = this.timeEngine.isNight;
          const isDusk = this.timeEngine.isDusk;
          const isDawn = this.timeEngine.currentPhase === TimeOfDay.DAWN;
          clockIcon.textContent = isNight ? '🌙' : isDusk ? '🌆' : isDawn ? '🌅' : '☀️';
          const mins = Math.floor(this.timeEngine.phaseRemainingSeconds / 60);
          const secs = Math.floor(this.timeEngine.phaseRemainingSeconds % 60).toString().padStart(2, '0');
          clockText.textContent = `${this.timeEngine.rules.name.toUpperCase()} (${mins}:${secs})`;
          if (isNight) {
            clockServices.textContent = 'SERVICES CLOSED';
            clockServices.className = 'services-badge closed';
          } else if (isDusk) {
            clockServices.textContent = 'CLOSING SOON';
            clockServices.className = 'services-badge warning';
          } else {
            clockServices.textContent = 'SERVICES OPEN';
            clockServices.className = 'services-badge open';
          }
        }
      }

      // Render Frame
      if (this.gameLoop.currentState === GameState.TAVERN_INTRO) {
        this.tavern.update(time, deltaTime);
      } else if (this.gameLoop.currentState === GameState.GARTHS_SHOP) {
        this.garthsShop.update(time);
      } else if (this.gameLoop.currentState === GameState.SKARA_BRAE_STREETS) {
        this.streetScene.update(deltaTime);
      } else if (this.gameLoop.currentState === GameState.COMBAT_ZONE) {
        this.combatArena.update(time);
      }

      this.renderer.render(this.scene, this.camera);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new BardsTaleApp();

  // Developer-only Debug Panels
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
    import('./ui/debug/CombatSandboxPanel.js').then(({ createCombatSandboxPanel }) => {
      const sandboxPanel = createCombatSandboxPanel();
      sandboxPanel.mount();
    });
    import('./ui/debug/GridInspectorPanel.js').then(({ createGridInspectorPanel }) => {
      app.gridInspector = createGridInspectorPanel((showGrid) => {
        if (app.streetScene) {
          app.streetScene.setDebugGridVisible(showGrid);
        }
      });
    });
  }
});


