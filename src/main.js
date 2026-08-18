import * as THREE from 'three';
import { GameState, GameLoop } from './core/game-loop/GameLoop.js';
import { BardSynth } from './audio/BardSynth.js';
import { BardSinger } from './audio/BardSinger.js';
import { XRManager } from './xr/XRManager.js';
import { XRRig } from './xr/XRRig.js';
import { FreeLocomotion } from './xr/FreeLocomotion.js';
import { RetroRoom } from './world/retro-room/RetroRoom.js';
import { FullVRTavern } from './world/FullVRTavern.js';
import { GarthsShop } from './world/garths-shop/GarthsShop.js';
import { SkaraBraeGrid } from './world/skara-brae/SkaraBraeGrid.js';
import { CombatArena } from './world/combat-zone/CombatArena.js';
import { PalmBookMenu } from './ui/spatial-hud/PalmBookMenu.js';
import { PartyCreationUI } from './ui/PartyCreationUI.js';
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
    this.camera.position.set(0, 1.1, 0); // Eye height at desk

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

    // Skara Brae City & Dungeon Grid
    this.skaraBraeGrid = new SkaraBraeGrid(this.scene);

    // Live Spell Visual Effect Emitters (Mage Flame, Air Armor, Vorpal Plating)
    this.activeSpellEffects = [];
    this.airArmorShield = null;

    // Palm-Flip 3D Grimoire / Player Book
    this.grimoire = new PalmBookMenu(this.scene, this.camera, (spellType, spellName) => {
      this.triggerLiveSpellTesting(spellType, spellName);
    });
    this.grimoire.setGridReference(this.skaraBraeGrid);

    // XR Camera Rig (camera lives inside this group; locomotion moves the rig, not the camera)
    this.xrRig = new XRRig(this.camera, this.scene);

    // Free Locomotion & XR Manager (both operate on the rig)
    this.locomotion = new FreeLocomotion(this.camera, this.scene, this.xrRig);
    this.xr = new XRManager(this.renderer, this.camera, this.scene, this.xrRig);

    // 1. Location 1: 1980s Retro Room (C64 & Floppy Load)
    this.retroRoom = new RetroRoom(this.scene, this.camera, () => {
      this.gameLoop.setState(GameState.TAVERN_INTRO);
    });

    // 2. Location 2: Skara Brae Tavern (Title Screen)
    this.tavern = new FullVRTavern(
      this.scene,
      () => this.partyUI.show(),
      () => this.gameLoop.setState(GameState.GARTHS_SHOP)
    );
    this.tavern.scene.visible = false;

    // 3. Location 3: Garth's Weapons & Wonders (Shop & Party Gear)
    this.garthsShop = new GarthsShop(this.scene, this.camera, () => {
      this.gameLoop.setState(GameState.COMBAT_ZONE);
    }, this.gameLoop.party);

    // 4. Location 4: Dedicated 3D Spatial Combat Arena
    this.combatArena = new CombatArena(this.scene, this.camera, (victory) => {
      this.gameLoop.setState(GameState.TAVERN_INTRO);
      this.showToast(victory ? "🏆 Returned to Tavern!" : "💀 Escaped Combat!");
    });

    // Party Creation UI
    this.partyUI = new PartyCreationUI((party) => {
      this.gameLoop.setParty(party);
      this.garthsShop.party = party; // Keep shop's party reference in sync
      this.grimoire.updatePartyData(party);
      this.showToast(`⚔️ Party Assembled (${party.length} Heroes)! Proceeding to Garth's Shop...`);
      this.gameLoop.setState(GameState.GARTHS_SHOP);
    });

    // Raycaster
    this.mouseRaycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.bindEvents();
    this.startLoop();
  }

  // LIVE SPELL TESTING OUTSIDE COMBAT (Mage Flame, Air Armor, Vorpal Plating)
  triggerLiveSpellTesting(spellType, spellName) {
    this.synth.init();
    this.synth.playSequence(['G3', 'B3', 'D4', 'G4'], 180);
    this.showToast(`✨ LIVE SPELL TESTED: ${spellName}!`);

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
    this.garthsShop.setVisible(false);
    this.combatArena.arenaGroup.visible = false;

    // Position the XRRig (floor-level). In desktop mode, camera local Y provides
    // eye height (1.1-1.4m). In VR, physical head tracking provides the offset.
    if (newState === GameState.RETRO_ROOM) {
      this.retroRoom.setVisible(true);
      this.xrRig.setPosition(0, 0, 0);
      this.camera.position.set(0, 1.1, 0); // Desktop eye height at desk
    } else if (newState === GameState.TAVERN_INTRO) {
      this.xrRig.setPosition(0, 0, 1.2);
      this.camera.position.set(0, 1.4, 0); // Desktop standing eye height
      this.synth.init();
      this.singer.startSong();
    } else if (newState === GameState.GARTHS_SHOP) {
      this.singer.stopSong();
      this.garthsShop.setVisible(true);
      this.xrRig.setPosition(0, 0, 1.8);
      this.camera.position.set(0, 1.4, 0); // Desktop standing eye height
    } else if (newState === GameState.COMBAT_ZONE) {
      this.xrRig.setPosition(0, 0, 0);
      this.camera.position.set(0, 1.4, 0);
      const monsters = this.gameDirector.generateEncounter(1);
      this.combatArena.enterCombat(this.gameLoop.party, monsters);
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Pointer Click Interaction per Location State
    window.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.hud-overlay') || e.target.closest('.hud-header') || e.target.closest('.party-modal')) return;

      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.mouseRaycaster.setFromCamera(this.mouse, this.camera);

      // Check Grimoire Canvas Touch Clicks if open
      if (this.grimoire.isOpen) {
        const bookIntersects = this.mouseRaycaster.intersectObject(this.grimoire.textMesh);
        if (bookIntersects.length > 0) {
          this.grimoire.handleCanvasClick(bookIntersects[0].uv, (msg) => this.showToast(msg));
          return;
        }
      }

      const state = this.gameLoop.currentState;

      if (state === GameState.RETRO_ROOM) {
        const intersects = this.mouseRaycaster.intersectObjects(this.retroRoom.interactableObjects, true);
        if (intersects.length > 0) {
          this.retroRoom.insertFloppyDisk();
          this.showToast("💾 Sliding Floppy Disk into 1541 Drive...");
        }
      } else if (state === GameState.GARTHS_SHOP) {
        const intersects = this.mouseRaycaster.intersectObjects(this.garthsShop.interactableObjects, true);
        if (intersects.length > 0) {
          const obj = intersects[0].object;
          if (obj.userData.isWeapon) {
            this.garthsShop.equipItem(obj.userData.itemData || obj.userData.name, (msg) => this.showToast(msg));
          } else if (obj.userData.isExitDoor) {
            this.gameLoop.setState(GameState.COMBAT_ZONE);
          }
        }
      } else if (state === GameState.COMBAT_ZONE) {
        const heroIntersects = this.mouseRaycaster.intersectObjects(this.combatArena.interactableHeroes, true);
        if (heroIntersects.length > 0) {
          let mesh = heroIntersects[0].object;
          while (mesh && !mesh.userData.isHeroMesh && mesh.parent) {
            mesh = mesh.parent;
          }
          if (mesh && mesh.userData.isHeroMesh) {
            this.combatArena.handleHeroSwapClick(mesh, (msg) => this.showToast(msg));
            return;
          }
        }

        const btnIntersects = this.mouseRaycaster.intersectObjects(this.combatArena.interactableButtons, true);
        if (btnIntersects.length > 0) {
          const action = btnIntersects[0].object.userData.action;
          this.combatArena.executeCommand(action, this.synth, (i, int, d) => this.xr.triggerHaptics(i, int, d));
        }
      } else if (state === GameState.TAVERN_INTRO) {
        const intersects = this.mouseRaycaster.intersectObjects(this.tavern.interactableObjects, true);
        if (intersects.length > 0) {
          let obj = intersects[0].object;
          while (obj && !obj.userData.isBard && !obj.userData.isDoor && obj.parent) {
            obj = obj.parent;
          }
          if (obj && obj.userData.isBard) {
            this.partyUI.show();
          } else if (obj && obj.userData.isDoor) {
            this.gameLoop.setState(GameState.GARTHS_SHOP);
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

    document.getElementById('exit-game-hud-btn').addEventListener('click', () => {
      this.exitGame();
    });

    const hudActions = document.querySelector('.hud-actions');
    if (hudActions) {
      const garthBtn = document.createElement('button');
      garthBtn.className = 'action-btn gold-btn';
      garthBtn.textContent = "🛡️ Garth's Shop";
      garthBtn.addEventListener('click', () => this.gameLoop.setState(GameState.GARTHS_SHOP));
      hudActions.appendChild(garthBtn);

      const combatBtn = document.createElement('button');
      combatBtn.className = 'action-btn gold-btn';
      combatBtn.textContent = '⚔️ Enter 3D Combat Zone';
      combatBtn.addEventListener('click', () => this.gameLoop.setState(GameState.COMBAT_ZONE));
      hudActions.appendChild(combatBtn);
    }
  }

  exitGame() {
    this.showToast("🚪 Exiting Game... Goodbye Adventurer!");
    if (this.renderer.xr.isPresenting) {
      const session = this.renderer.xr.getSession();
      if (session) session.end();
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

      // Free Locomotion & Grid Tile Exploration
      if (this.gameLoop.currentState !== GameState.COMBAT_ZONE) {
        this.locomotion.update(deltaTime, xrSession);
        const headPos = this.xrRig.getWorldHeadPosition();
        this.skaraBraeGrid.revealTile(headPos.x, headPos.z);
      }

      // Update Retro Room C64
      if (this.gameLoop.currentState === GameState.RETRO_ROOM) {
        this.retroRoom.update(time);
      }

      // Palm Flip Grimoire
      if (this.xr.isVRActive && this.xr.controllers[0]) {
        this.grimoire.updateGesture(this.xr.controllers[0]);
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

      // Render Frame
      this.tavern.update(time);
      if (this.gameLoop.currentState === GameState.COMBAT_ZONE) {
        this.combatArena.update(time);
      }

      this.renderer.render(this.scene, this.camera);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new BardsTaleApp();

  // Developer-only Combat Sandbox Panel
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
    import('./ui/debug/CombatSandboxPanel.js').then(({ createCombatSandboxPanel }) => {
      const sandboxPanel = createCombatSandboxPanel();
      sandboxPanel.mount();
    });
  }
});
