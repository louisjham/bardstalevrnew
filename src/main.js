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
import { SpatialInstructionWindow } from './ui/spatial-hud/SpatialInstructionWindow.js';
import { TAVERN_TUTORIAL_PATRONS } from './data/TavernTutorialData.js';
import { PartyCreationUI } from './ui/PartyCreationUI.js';
import { CharacterCardUI } from './ui/CharacterCardUI.js';
import { TempleUI } from './ui/TempleUI.js';
import { RoscoeUI } from './ui/RoscoeUI.js';
import { ReviewBoardUI } from './ui/ReviewBoardUI.js';
import { GameDirector } from './agents/game-director/GameDirector.js';
import { createCharacter } from './data/RaceClassData.js';
import { autoEquipParty } from './data/ItemDatabase.js';
import { sourceToWorld, worldToSource } from './data/SkaraBraeMapData.js';

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
    this.instructionWindow = new SpatialInstructionWindow(this.scene, {
      onAction: (key) => this.handleInstructionAction(key)
    });

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

  /**
   * Automatically initializes and equips the canonical 6-hero starter party if not present.
   */
  ensureStarterParty() {
    if (!this.gameLoop.party || this.gameLoop.party.length < 6) {
      const starterParty = [
        createCharacter('Elric', 'Human', 'Paladin'),
        createCharacter('Gaelen', 'Elf', 'Bard'),
        createCharacter('Thorin', 'Dwarf', 'Warrior'),
        createCharacter('Shadow', 'Hobbit', 'Rogue'),
        createCharacter('Kael', 'Half-Elf', 'Conjurer'),
        createCharacter('Morgana', 'Human', 'Magician')
      ];
      autoEquipParty(starterParty);
      this.syncParty(starterParty);
      console.log('[BardsTaleApp] Canonical starter party of 6 heroes assembled and auto-equipped.');
    }
  }

  /**
   * Synchronizes active party roster and status across all UI components and game systems.
   */
  syncParty(party) {
    this.gameLoop.setParty(party);
    if (this.garthsShop) this.garthsShop.party = party;
    if (this.timeEngine) this.timeEngine.setParty(party);
    if (this.templeUI) this.templeUI.setParty(party);
    if (this.roscoeUI) this.roscoeUI.setParty(party);
    if (this.reviewBoardUI) this.reviewBoardUI.setParty(party);
    if (this.characterCardUI) this.characterCardUI.setParty(party);
    if (this.grimoire) this.grimoire.updatePartyData(party);
  }

  /**
   * Teleports party to target grid coordinates with visual flash and sound.
   */
  triggerTeleport(targetCoords) {
    if (this._tpCooldown || !targetCoords) return;
    this._tpCooldown = true;

    const { worldX, worldZ } = sourceToWorld(targetCoords.x, targetCoords.y);
    this.xrRig.setPosition(worldX, 0, worldZ);
    this.skaraBraeGrid.revealTile(worldX, worldZ);

    this.synth.init();
    this.synth.playSequence(['C5', 'G4', 'E5', 'C6'], 90);
    this.gamepad.vibrate(0.7, 250);
    this.showToast(`✨ Whoosh! A magical vortex teleports your party to (${targetCoords.x}, ${targetCoords.y})!`);

    setTimeout(() => {
      this._tpCooldown = false;
    }, 2000);
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
      this.instructionWindow.hide();
      this.retroRoom.startCinematicSequence(() => {
        this.gameLoop.setState(GameState.TAVERN_INTRO);
      });
    } else if (newState === GameState.TAVERN_INTRO) {
      this.tavern.setVisible(true);
      this.grimoire.setEnabled(false);
      this.instructionWindow.hide();
      this.xrRig.setPosition(0, 0, 1.2);
      this.camera.position.set(0, 1.18, 0); // Desktop eye height locked at eye-level with Bard/patrons (1.18m)
      this.camera.rotation.z = 0; // Ensure roll is cleared
      this.synth.init();
      this.singer.startSong();
      this.tavern.playEntranceTransition();
      this.showToast("🍺 Welcome to Skara Brae Tavern! Click Bard or Patrons for guides.");
    } else if (newState === GameState.GARTHS_SHOP) {
      this.ensureStarterParty();
      this.singer.stopSong();
      this.garthsShop.setVisible(true);
      this.grimoire.setEnabled(true);
      this.xrRig.setPosition(0, 0, 1.8);
      this.camera.position.set(0, 1.18, 0); // Desktop eye height locked at eye-level (1.18m)
      this.camera.rotation.z = 0;

      // Introduce the book with the premium Glassmorphism SpatialInstructionWindow
      const headPos = new THREE.Vector3();
      const headQuat = new THREE.Quaternion();
      this.camera.getWorldPosition(headPos);
      this.camera.getWorldQuaternion(headQuat);

      this.instructionWindow.show({
        title: "The Bard's Grimoire Unlocked",
        subtitle: "Palm-Flip Grimoire & Diegetic Automap Calibrated",
        sprite: "/assets/sprites/bt1_04.png",
        pages: [
          {
            heading: "✨ Spatial Hand & Controller Instructions",
            bullets: [
              { icon: "🖐️", title: "FLIP PALM UP", desc: "Turn your hand palm-up to summon the 3D Grimoire near your face.", color: "#a855f7" },
              { icon: "🖐️", title: "FLIP PALM DOWN", desc: "Turn your hand palm-down or lower your arm to dispel & close the book.", color: "#a855f7" },
              { icon: "🎮", title: "CONTROLLER BUTTONS [Y] / [X] / [M]", desc: "Press [Y] or [X] on your left controller (or [M] on desktop) for HUD mode.", color: "#38bdf8" },
              { icon: "📖", title: "HEROES, AUTOMAP & LIVE SPELLS", desc: "Point your controller ray and pull trigger to inspect heroes or test spells live.", color: "#f59e0b" }
            ]
          }
        ],
        autoDismissSeconds: 7
      }, headPos, headQuat);

      this.synth.init();
      this.synth.playSequence(['E4', 'G4', 'B4', 'E5'], 140);
      this.showToast("✨ The Grimoire is now unlocked! Flip your palm UP to summon.");
      if (this.xr.isVRActive) {
        this.xr.triggerHaptics(0, 0.6, 120);
      }
    } else if (newState === GameState.SKARA_BRAE_STREETS) {
      this.ensureStarterParty();
      this.singer.stopSong();
      this.instructionWindow.hide();
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
      this.ensureStarterParty();
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

      // Check Spatial Instruction Glassmorphism Window touch/clicks if active
      if (this.instructionWindow && this.instructionWindow.active && this.instructionWindow.mesh) {
        const instIntersects = raycaster.intersectObject(this.instructionWindow.mesh);
        if (instIntersects.length > 0) {
          const hit = instIntersects[0];
          if (hit.uv) {
            if (controllerIndex !== null) this.xr.triggerHaptics(controllerIndex, 0.6, 80);
            this.synth.init();
            this.synth.playSequence(['E4', 'A4'], 80);
            this.instructionWindow.handleClick(hit.uv);
            return;
          }
        }
      }

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
          while (obj && !obj.userData.isWeapon && !obj.userData.isExitDoor && !obj.userData.isAutoEquipParty && !obj.userData.isCharacterCards && !obj.userData.isGarthNPC && obj.parent) {
            obj = obj.parent;
          }
          if (controllerIndex !== null) this.xr.triggerHaptics(controllerIndex, 0.75, 100);
          if (obj && obj.userData.isGarthNPC) {
            const headPos = new THREE.Vector3();
            const headQuat = new THREE.Quaternion();
            this.camera.getWorldPosition(headPos);
            this.camera.getWorldQuaternion(headQuat);
            this.instructionWindow.show({
              title: "Garth's Armory & Guild Roster",
              subtitle: "Master Blacksmith & Outfitter of Skara Brae",
              sprite: "/assets/sprites/bt1_56.png",
              pages: [
                {
                  heading: "⚔️ Assemble Your Adventuring Party",
                  text: "Greetings, traveler! I am Garth. Before you venture forth into Skara Brae, assemble your 6-hero guild party. You can craft a custom company or use the canonical starter party. All recruits start equipped with basic weapons and armor!"
                }
              ],
              buttons: [
                { label: "🎲 Create New Party", actionKey: "openPartyCreation", primary: true, width: 220 },
                { label: "⚔️ Use Starter Party (6)", actionKey: "useStarterParty", primary: false, width: 230 }
              ]
            }, headPos, headQuat);
            this.synth.init();
            this.synth.playSequence(['C4', 'E4', 'G4', 'C5'], 120);
            this.showToast("🛡️ Garth: \"Assemble your company, brave traveler!\"");
          } else if (obj && obj.userData.isWeapon) {
            const holder = controllerIndex !== null ? (this.xr.controllerGrips[controllerIndex] || this.xr.controllers[controllerIndex]) : this.camera;
            const holderIdx = controllerIndex !== null ? controllerIndex : 'desktop';
            const held = this.garthsShop.getHeldWeapon(holderIdx);
            if (held && (held.group === obj || held.hitBox === obj)) {
              this.garthsShop.releaseWeapon(obj, this.synth, this.xr);
              this.showToast(`⚔️ Returned ${obj.userData.name} to display counter.`);
            } else {
              this.garthsShop.grabWeapon(obj, holder, holderIdx, this.synth, this.xr);
              this.showToast(`⚔️ Holding ${obj.userData.name}! ${controllerIndex !== null ? 'Swing your controller' : 'Left Click / [Space]'} to swing, [G] to return.`);
            }
          } else if (obj && obj.userData.isAutoEquipParty) {
            this.garthsShop.autoEquipEntireParty((msg) => this.showToast(msg));
            this.characterCardUI.setParty(this.gameLoop.party);
            this.grimoire.updatePartyData(this.gameLoop.party);
          } else if (obj && obj.userData.isCharacterCards) {
            this.characterCardUI.show(this.gameLoop.party);
          } else if (obj && obj.userData.isExitDoor) {
            this.gameLoop.setState(GameState.SKARA_BRAE_STREETS);
          }
        } else {
          // If clicked on empty space on desktop while holding a weapon, swing it!
          if (controllerIndex === null && this.garthsShop.getHeldWeapon('desktop')) {
            this.garthsShop.triggerDesktopSwing(this.synth);
          }
        }
      } else if (state === GameState.SKARA_BRAE_STREETS) {
        const intersects = raycaster.intersectObjects(this.streetScene.interactableObjects, true);
        if (intersects.length > 0) {
          let obj = intersects[0].object;
          while (obj && !obj.userData.isGarthDoor && !obj.userData.isTavernDoor && !obj.userData.isGuildDoor && !obj.userData.isReviewBoardDoor && !obj.userData.isTempleDoor && !obj.userData.isRoscoeDoor && !obj.userData.isStatue && !obj.userData.isLandmark && !obj.userData.isCityGate && !obj.userData.isDungeonEntrance && !obj.userData.isTeleporter && obj.parent) {
            obj = obj.parent;
          }
          if (controllerIndex !== null) this.xr.triggerHaptics(controllerIndex, 0.75, 100);
          if (obj) {
            if (obj.userData.isGarthDoor) {
              if (this.timeEngine.areTownServicesOpen) {
                this.gameLoop.setState(GameState.GARTHS_SHOP);
                this.showToast("🛡️ Entering Garth's Equipment Shoppe...");
              } else {
                this.showToast("🚪 Garth's Equipment Shoppe is shuttered for the night. Return at daybreak or rest at the Adventurers Guild!");
              }
            } else if (obj.userData.isTavernDoor) {
              this.gameLoop.setState(GameState.TAVERN_INTRO);
              this.showToast("🍺 Entering The Scarlet Bard Tavern...");
            } else if (obj.userData.isGuildDoor) {
              this.timeEngine.restUntilMorning();
              this.synth.init();
              this.synth.playSequence(['C4', 'E4', 'G4', 'C5'], 180);
              this.partyUI.show();
            } else if (obj.userData.isReviewBoardDoor) {
              if (this.timeEngine.areTownServicesOpen) {
                this.reviewBoardUI.show(this.gameLoop.party);
              } else {
                this.showToast("📜 The Review Board is closed until morning light. Seek shelter at the Adventurers Guild.");
              }
            } else if (obj.userData.isTempleDoor) {
              this.templeUI.show(obj.userData.templeName, obj.userData.isTarjan);
            } else if (obj.userData.isRoscoeDoor) {
              this.roscoeUI.show(this.gameLoop.party);
            } else if (obj.userData.isStatue) {
              this.synth.init();
              this.synth.playSequence(['D4', 'A4', 'D5'], 150);
              this.showToast(`🗿 ${obj.userData.name}: "${obj.userData.description}"`);
            } else if (obj.userData.isLandmark) {
              this.synth.init();
              this.synth.playSequence(['E4', 'G4', 'C5'], 150);
              this.showToast(`🏛️ ${obj.userData.name}: "${obj.userData.description}"`);
            } else if (obj.userData.isCityGate) {
              this.synth.init();
              this.synth.playSequence(['C3', 'E3', 'G3'], 220);
              this.showToast(`❄️ ${obj.userData.name}: "${obj.userData.description}"`);
            } else if (obj.userData.isDungeonEntrance) {
              this.synth.init();
              this.synth.playSequence(['D3', 'F3', 'A3', 'D4'], 180);
              this.showToast(`🏰 ${obj.userData.name}: "${obj.userData.description}"`);
            } else if (obj.userData.isTeleporter) {
              this.triggerTeleport(obj.userData.targetCoords);
            }
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
        // First check if clicking inside 3D dialogue window
        if (this.tavern.dialogueMesh && this.tavern.dialogueGroup && this.tavern.dialogueGroup.visible) {
          const dialogueIntersects = raycaster.intersectObjects([this.tavern.dialogueMesh], true);
          if (dialogueIntersects.length > 0) {
            const hit = dialogueIntersects[0];
            if (hit.uv) {
              if (controllerIndex !== null) this.xr.triggerHaptics(controllerIndex, 0.6, 60);
              this.synth.init();
              this.synth.playSequence(['E4', 'A4'], 80);
              this.tavern.handleDialogueClick(hit.uv);
              return;
            }
          }
        }

        const intersects = raycaster.intersectObjects(this.tavern.interactableObjects, true);
        if (intersects.length > 0) {
          let obj = intersects[0].object;
          while (obj && !obj.userData.isPatron && !obj.userData.isBard && !obj.userData.isDoor && !obj.userData.isAleMug && !obj.userData.isTavernDialogue && obj.parent) {
            obj = obj.parent;
          }
          if (controllerIndex !== null) this.xr.triggerHaptics(controllerIndex, 0.75, 100);

          if (obj && obj.userData.isTavernDialogue) {
            const hit = intersects[0];
            if (hit.uv) {
              this.synth.init();
              this.synth.playSequence(['E4', 'A4'], 80);
              this.tavern.handleDialogueClick(hit.uv);
            }
          } else if (obj && (obj.userData.isPatron || obj.userData.isBard)) {
            const key = obj.userData.patronKey || 'bard';
            const patronData = TAVERN_TUTORIAL_PATRONS[key];
            if (patronData) {
              const headPos = new THREE.Vector3();
              const headQuat = new THREE.Quaternion();
              this.camera.getWorldPosition(headPos);
              this.camera.getWorldQuaternion(headQuat);
              this.instructionWindow.show(patronData, headPos, headQuat);
              this.synth.init();
              this.synth.playSequence(['C4', 'E4', 'G4', 'C5'], 120);
              this.showToast(`📜 ${patronData.name}: "${patronData.greeting}"`);
            }
          } else if (obj && obj.userData.isDoor) {
            this.gameLoop.setState(GameState.GARTHS_SHOP);
          } else if (obj && obj.userData.isAleMug) {
            this.synth.init();
            this.synth.playSequence(['G3', 'C4', 'E4'], 120);
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
    this.xr.onSqueezeEnd = (controllerIndex, controller, raycaster) => {
      if (this.gameLoop.currentState === GameState.GARTHS_SHOP) {
        const held = this.garthsShop.getHeldWeapon(controllerIndex);
        if (held) {
          this.garthsShop.releaseWeapon(held, this.synth, this.xr);
          this.showToast(`⚔️ Released ${held.name} back to counter.`);
        }
      }
    };

    // Right-click or Desktop shortcut to release/drop weapon or swing
    window.addEventListener('contextmenu', (e) => {
      if (this.gameLoop.currentState === GameState.GARTHS_SHOP) {
        const held = this.garthsShop.getHeldWeapon('desktop');
        if (held) {
          e.preventDefault();
          this.garthsShop.releaseWeapon(held, this.synth);
          this.showToast(`⚔️ Returned ${held.name} to counter.`);
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyG' || e.code === 'KeyE') {
        if (this.gameLoop.currentState === GameState.GARTHS_SHOP) {
          const held = this.garthsShop.getHeldWeapon('desktop');
          if (held) {
            this.garthsShop.releaseWeapon(held, this.synth);
            this.showToast(`⚔️ Returned ${held.name} to counter.`);
          } else if (this.focusedTarget && this.focusedTarget.type === 'GARTH_WEAPON') {
            this.garthsShop.grabWeapon(this.focusedTarget.object, this.camera, 'desktop', this.synth);
            this.showToast(`⚔️ Grabbed ${this.focusedTarget.object.userData.name}! Left click to swing, [G] to return.`);
          }
        }
      } else if (e.code === 'Space') {
        if (this.gameLoop.currentState === GameState.GARTHS_SHOP) {
          const held = this.garthsShop.getHeldWeapon('desktop');
          if (held) {
            e.preventDefault();
            this.garthsShop.triggerDesktopSwing(this.synth);
          }
        }
      }
    });

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
          while (obj && !obj.userData.isWeapon && !obj.userData.isExitDoor && !obj.userData.isAutoEquipParty && !obj.userData.isCharacterCards && !obj.userData.isGarthNPC && obj.parent) {
            obj = obj.parent;
          }
          if (obj && obj.userData.isGarthNPC) {
            this.focusedTarget = { type: 'GARTH_NPC', object: obj };
            promptText = "🛡️ [A] Talk to Garth (Party Creation)";
          } else if (obj && obj.userData.isWeapon) {
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
          while (obj && !obj.userData.isPatron && !obj.userData.isBard && !obj.userData.isDoor && !obj.userData.isAleMug && !obj.userData.isTavernDialogue && obj.parent) {
            obj = obj.parent;
          }
          if (obj && obj.userData.isTavernDialogue) {
            this.focusedTarget = { type: 'TAVERN_DIALOGUE', hit: intersects[0] };
            promptText = '📜 [A] Click Dialogue Button';
          } else if (obj && obj.userData.isPatron) {
            this.focusedTarget = { type: 'TAVERN_PATRON', object: obj, patronKey: obj.userData.patronKey };
            promptText = `📜 [A] Talk to ${obj.userData.name} (Game Guide)`;
          } else if (obj && obj.userData.isBard) {
            this.focusedTarget = { type: 'TAVERN_BARD', object: obj };
            promptText = '🎵 [A] Talk to Bard (Songs & Party)';
          } else if (obj && obj.userData.isDoor) {
            this.focusedTarget = { type: 'TAVERN_DOOR', object: obj };
            promptText = "🚪 [A] Enter Garth's Shop";
            doorHit = true;
          } else if (obj && obj.userData.isAleMug) {
            this.focusedTarget = { type: 'TAVERN_ALE', object: obj };
            promptText = "🍺 [A] Drink Skara Brae Dark Ale";
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
    } else if (target.type === 'TAVERN_PATRON' || target.type === 'TAVERN_BARD') {
      const key = target.patronKey || (target.type === 'TAVERN_BARD' ? 'bard' : 'wizard');
      const patronData = TAVERN_TUTORIAL_PATRONS[key];
      if (patronData) {
        const headPos = new THREE.Vector3();
        const headQuat = new THREE.Quaternion();
        this.camera.getWorldPosition(headPos);
        this.camera.getWorldQuaternion(headQuat);
        this.instructionWindow.show(patronData, headPos, headQuat);
        this.synth.init();
        this.synth.playSequence(['C4', 'E4', 'G4', 'C5'], 120);
        this.showToast(`📜 ${patronData.name}: "${patronData.greeting}"`);
      }
      this.gamepad.vibrate(0.4, 100);
    } else if (target.type === 'TAVERN_DIALOGUE') {
      if (target.hit && target.hit.uv) {
        this.synth.init();
        this.synth.playSequence(['E4', 'A4'], 80);
        this.instructionWindow.handleClick(target.hit.uv);
      }
    } else if (target.type === 'TAVERN_DOOR') {
      this.gameLoop.setState(GameState.GARTHS_SHOP);
      this.gamepad.vibrate(0.4, 120);
    } else if (target.type === 'TAVERN_ALE') {
      this.tavern.drinkMug(target.object, (msg) => this.showToast(msg));
      this.gamepad.vibrate(0.5, 200);
    } else if (target.type === 'GARTH_NPC') {
      const headPos = new THREE.Vector3();
      const headQuat = new THREE.Quaternion();
      this.camera.getWorldPosition(headPos);
      this.camera.getWorldQuaternion(headQuat);
      this.instructionWindow.show({
        title: "Garth's Armory & Guild Roster",
        subtitle: "Master Blacksmith & Outfitter of Skara Brae",
        sprite: "/assets/sprites/bt1_56.png",
        pages: [
          {
            heading: "⚔️ Assemble Your Adventuring Party",
            text: "Greetings, traveler! I am Garth. Before you venture forth into Skara Brae, assemble your 6-hero guild party. You can craft a custom company or use the canonical starter party. All recruits start equipped with basic weapons and armor!"
          }
        ],
        buttons: [
          { label: "🎲 Create New Party", actionKey: "openPartyCreation", primary: true, width: 220 },
          { label: "⚔️ Use Starter Party (6)", actionKey: "useStarterParty", primary: false, width: 230 }
        ]
      }, headPos, headQuat);
      this.synth.init();
      this.synth.playSequence(['C4', 'E4', 'G4', 'C5'], 120);
      this.showToast("🛡️ Garth: \"Assemble your company, brave traveler!\"");
      this.gamepad.vibrate(0.4, 100);
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

  handleInstructionAction(actionKey) {
    if (actionKey === 'openPartyCreation') {
      this.partyUI.show();
    } else if (actionKey === 'useStarterParty') {
      this.ensureStarterParty();
      this.showToast("⚔️ Starter Party (6 Heroes) equipped and ready for adventure!");
      this.synth.init();
      this.synth.playSequence(['C4', 'E4', 'G4', 'C5'], 140);
    } else if (actionKey === 'enterGarth') {
      this.gameLoop.setState(GameState.GARTHS_SHOP);
    } else if (actionKey === 'openGrimoire') {
      this.grimoire.toggleBookDesktop();
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

        // Quest 2 Touch Controller Polling (Door Highlight & Grimoire Toggle)
        if (xrSession && xrSession.inputSources) {
          // Check Tavern Door Hover in VR (Highlight when controller points directly at door)
          if (this.gameLoop.currentState === GameState.TAVERN_INTRO) {
            let isRayOnDoor = false;

            for (let cIdx = 0; cIdx < 2; cIdx++) {
              if (this.xr.controllers[cIdx]) {
                const ray = this.xr.getControllerRaycaster(this.xr.controllers[cIdx]);
                const hits = ray.intersectObjects(this.tavern.interactableObjects, true);
                if (hits.length > 0) {
                  let topHit = hits[0].object;
                  while (topHit && !topHit.userData.isDoor && topHit.parent) topHit = topHit.parent;
                  if (topHit && topHit.userData.isDoor) {
                    isRayOnDoor = true;
                    break;
                  }
                }
              }
            }

            this.tavern.setDoorHighlighted(isRayOnDoor);
            this.isTavernDoorHighlighted = isRayOnDoor;
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

      // Update Spatial Instruction Window
      if (this.instructionWindow) {
        this.instructionWindow.update(deltaTime);
      }

      // Render Frame
      if (this.gameLoop.currentState === GameState.TAVERN_INTRO) {
        this.tavern.update(time, deltaTime);
      } else if (this.gameLoop.currentState === GameState.GARTHS_SHOP) {
        this.garthsShop.update(time);
      } else if (this.gameLoop.currentState === GameState.SKARA_BRAE_STREETS) {
        this.streetScene.update(deltaTime);
        const headPos = this.xrRig.getWorldHeadPosition();
        this.skaraBraeGrid.revealTile(headPos.x, headPos.z);

        // Step-on Teleporter check
        if (!this._tpCooldown) {
          const { sourceX, sourceY } = worldToSource(headPos.x, headPos.z);
          if (sourceX === 25 && sourceY === 2) {
            this.triggerTeleport({ x: 25, y: 7 });
          } else if (sourceX === 25 && sourceY === 7) {
            this.triggerTeleport({ x: 25, y: 2 });
          }
        }
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


