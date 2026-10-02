import * as THREE from 'three';
import { TextureGenerator } from '../../textures/TextureGenerator.js';
import { PatronModels } from '../PatronModels.js';
import { CombatEngine } from '../../core/combat/CombatEngine.js';
import { BardSongs } from '../../data/BardSongs.js';
import { AnimatedSpriteManager } from '../../textures/AnimatedSprite.js';
import { SpatialCombatScroll } from '../../ui/spatial-hud/SpatialCombatScroll.js';
import { MessageSpooler } from '../../core/utils/MessageSpooler.js';
import { EncounterGenerator } from '../../core/encounter/EncounterGenerator.js';
import { createStandingBrazier, createArenaPillar, createTreasureChest } from './ArenaPropsFactory.js';

export class CombatArena {
  constructor(scene, camera, onCombatEnd, xrRig = null, synth = null) {
    this.scene = scene;
    this.camera = camera;
    this.onCombatEnd = onCombatEnd;
    this.xrRig = xrRig;
    this.synth = synth;
    
    this.combatEngine = new CombatEngine();
    this.spriteManager = new AnimatedSpriteManager();
    this.animatedUpdaters = [];
    this.currentSongIndex = 0;

    this.arenaGroup = new THREE.Group();
    this.arenaGroup.visible = false;

    this.monsterGroupMesh = new THREE.Group();
    this.partyGroupMesh = new THREE.Group();
    this.arenaGroup.add(this.monsterGroupMesh);
    this.arenaGroup.add(this.partyGroupMesh);

    this.activeMonsters = [];
    this.activeParty = [];
    this.selectedHeroForSwap = null;
    this.pendingCombatExit = null;
    this.isRoundInProgress = false;

    this.battleLogLines = [];
    this.battleLogMesh = null;
    this.battleLogCanvasCtx = null;
    this.battleLogTexture = null;

    this.interactableButtons = [];
    this.interactableHeroes = [];
    this.interactableMonsters = [];
    this.isTargetingMode = false;
    this.pendingTargetAction = null;
    this.blitzButtonMesh = null;
    this.blitzCtx = null;
    this.blitzTex = null;

    // ⚡ Pre-allocated scratch objects for InstancedMesh swarms & formation rendering
    this._dummyTransform = new THREE.Object3D();
    this._shadowRingGeo = new THREE.RingGeometry(0.3, 0.6, 16);
    this._shadowRingMat = new THREE.MeshBasicMaterial({
      color: 0xb91c1c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });

    // 📜 1. Spatial Combat Narrative Scroll in Camera Space (WebXR FOV locked)
    this.combatScroll = new SpatialCombatScroll();
    const cameraTarget = (this.xrRig && this.xrRig.camera) || this.camera;
    if (cameraTarget && typeof cameraTarget.add === 'function') {
      cameraTarget.add(this.combatScroll.mesh);
    } else if (this.scene && typeof this.scene.add === 'function') {
      this.scene.add(this.combatScroll.mesh);
    }

    // 📜 2. MessageSpooler with ~20ms char pacing, 800ms line delay, audio clicks
    this.messageSpooler = new MessageSpooler({
      charDelay: 20,
      lineDelay: 800,
      synth: this.synth,
      onLineStart: (msg) => {
        if (this.combatScroll) {
          this.combatScroll.startMessage(msg);
        }
      },
      onChar: (char) => {
        if (this.combatScroll) {
          this.combatScroll.writeChar(char);
        }
      },
      onAudioClick: () => {
        if (this.synth && typeof this.synth.playTypewriterClick === 'function') {
          this.synth.playTypewriterClick();
        }
      },
      onStateChange: () => {
        this.updateButtonVisuals();
      },
      onComplete: () => {
        this.updateButtonVisuals();
        this.renderMonsterFormation();
        this.renderPartyFormation();
        if (this.pendingCombatExit) {
          const exitInfo = this.pendingCombatExit;
          this.pendingCombatExit = null;
          setTimeout(() => {
            this.leaveCombat(exitInfo.victory);
          }, exitInfo.delay || 800);
        }
      }
    });

    this.initArenaArchitecture();
    this.initBattleLogWindow();
    this.initCombatUI();
    this.scene.add(this.arenaGroup);
  }

  initArenaArchitecture() {
    // Dark Runic Arena Floor
    const floorGeo = new THREE.PlaneGeometry(12, 12);
    const stoneTex = TextureGenerator.createStoneWallTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.arenaGroup.add(floor);

    // ⚡ HemisphereLight replaces flat lighting + 4 separate PointLights
    const hemiLight = new THREE.HemisphereLight(0x7c3aed, 0x1e1b4b, 1.8);
    this.arenaGroup.add(hemiLight);

    // Single hero PointLight illuminating the battle zone
    const heroLight = new THREE.PointLight(0xa855f7, 3.2, 12);
    heroLight.position.set(0, 2.8, -2.5);
    this.arenaGroup.add(heroLight);

    // Ominous Magical Braziers with emissive tops (zero fragment light cost)
    const brazierPositions = [
      [-4.0, 0, -5.0],
      [4.0, 0, -5.0],
      [-4.0, 0, 1.0],
      [4.0, 0, 1.0]
    ];

    brazierPositions.forEach(pos => {
      const brazier = createStandingBrazier();
      brazier.position.set(...pos);
      this.arenaGroup.add(brazier);
    });
  }

  initBattleLogWindow() {
    // Classic Bard's Tale Scrolling Battle Text Window
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 240;
    this.battleLogCanvasCtx = canvas.getContext('2d');
    this.battleLogTexture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.MeshBasicMaterial({
      map: this.battleLogTexture,
      transparent: true
    });

    this.battleLogMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.05), mat);
    this.battleLogMesh.position.set(0, 2.2, -2.8);
    this.arenaGroup.add(this.battleLogMesh);

    this.addLogLine("⚔️ BARD'S TALE COMBAT ENGAGED!");
  }

  addLogLine(line) {
    this.battleLogLines.push(line);
    if (this.battleLogLines.length > 5) {
      this.battleLogLines.shift(); // Keep latest 5 scrolling lines
    }

    if (!this.battleLogCanvasCtx || !this.battleLogTexture) return;

    const ctx = this.battleLogCanvasCtx;
    ctx.clearRect(0, 0, 640, 240);

    // Window Frame
    ctx.fillStyle = 'rgba(10, 12, 18, 0.92)';
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(10, 10, 620, 220, 14);
    ctx.fill();
    ctx.stroke();

    // Log Title
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('📜 BATTLE LOG', 30, 42);
    ctx.strokeStyle = 'rgba(243, 207, 101, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 52);
    ctx.lineTo(610, 52);
    ctx.stroke();

    // Render Scrolling Log Lines
    ctx.font = '17px monospace';
    this.battleLogLines.forEach((msg, idx) => {
      ctx.fillStyle = msg.includes('slain') || msg.includes('DEFEATED') ? '#ef4444'
        : msg.includes('face death') ? '#f59e0b'
        : msg.includes('plays') || msg.includes('Casting') ? '#a855f7'
        : '#f8fafc';
      ctx.fillText(msg, 30, 85 + idx * 30);
    });

    this.battleLogTexture.needsUpdate = true;
  }

  initCombatUI() {
    // 3D Battle Command Buttons
    this.commandPanel = new THREE.Group();
    this.commandPanel.position.set(0, 0.95, -1.2);
    this.arenaGroup.add(this.commandPanel);

    this.selectedButtonIndex = 0;
    this.buttonConfigs = [
      { label: '⚔️ Attack', action: 'ATTACK', pos: [-0.4, 0.15, 0] },
      { label: '🎵 Bard Song', action: 'SONG', pos: [0.4, 0.15, 0] },
      { label: '✨ Cast Spell', action: 'SPELL', pos: [-0.4, -0.12, 0] },
      { label: '🛡️ Defend', action: 'DEFEND', pos: [0.4, -0.12, 0] },
      { label: '🏃 Flee Run', action: 'RUN', pos: [0, -0.36, 0] }
    ];
    this.buttonData = [];

    this.buttonConfigs.forEach((cfg, idx) => {
      let canvas = null;
      let ctx = null;
      let tex = null;

      if (typeof document !== 'undefined') {
        canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 70;
        ctx = canvas.getContext('2d');
        tex = new THREE.CanvasTexture(canvas);
      } else {
        tex = new THREE.Texture();
      }

      const btnMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.34, 0.11),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      btnMesh.position.set(...cfg.pos);
      btnMesh.userData = { isCombatButton: true, action: cfg.action, buttonIndex: idx };

      this.commandPanel.add(btnMesh);
      this.interactableButtons.push(btnMesh);
      this.buttonData.push({ canvas, ctx, tex, cfg, mesh: btnMesh });
    });

    // Prominent "⚡ BLITZ" Anti-Grind Button (Visible when canBlitz() is true)
    let blitzCanvas = null;
    if (typeof document !== 'undefined') {
      blitzCanvas = document.createElement('canvas');
      blitzCanvas.width = 300;
      blitzCanvas.height = 80;
      this.blitzCtx = blitzCanvas.getContext('2d');
      this.blitzTex = new THREE.CanvasTexture(blitzCanvas);
    } else {
      this.blitzCtx = null;
      this.blitzTex = new THREE.Texture();
    }

    const blitzMat = new THREE.MeshBasicMaterial({ map: this.blitzTex, transparent: true });
    this.blitzButtonMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.12), blitzMat);
    this.blitzButtonMesh.position.set(0, 0.38, 0);
    this.blitzButtonMesh.userData = { isCombatButton: true, action: 'BLITZ' };
    this.blitzButtonMesh.visible = false;
    this.commandPanel.add(this.blitzButtonMesh);

    this.updateButtonVisuals();
  }

  updateButtonVisuals() {
    const isProcessing = !!(this.messageSpooler && this.messageSpooler.isProcessing) || !!this.isRoundInProgress;

    // 1. Standard Command Buttons
    this.buttonData.forEach((b, idx) => {
      const isSelected = idx === this.selectedButtonIndex;
      const ctx = b.ctx;
      if (!ctx) return;
      ctx.clearRect(0, 0, 240, 70);

      if (isProcessing) {
        // Disabled state: dim styling while typewriter scroll is processing
        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(6, 6, 228, 58, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 20px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.cfg.label, 120, 42);
      } else if (this.isTargetingMode && b.cfg.action === this.pendingTargetAction) {
        // Targeting Mode Active Highlight
        ctx.fillStyle = '#dc2626';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.roundRect(6, 6, 228, 58, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎯 TARGET FOE', 120, 42);
      } else {
        // Active state
        ctx.fillStyle = isSelected ? '#f3cf65' : 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = isSelected ? '#ffffff' : '#f3cf65';
        ctx.lineWidth = isSelected ? 6 : 3;
        ctx.beginPath();
        ctx.roundRect(6, 6, 228, 58, 10);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = isSelected ? '#0f172a' : '#f3cf65';
        ctx.font = 'bold 22px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.cfg.label, 120, 42);
      }

      if (b.tex) b.tex.needsUpdate = true;
    });

    // 2. Blitz Button Visuals
    const canBlitz = !!(this.combatEngine && typeof this.combatEngine.canBlitz === 'function' && this.combatEngine.canBlitz());
    if (this.blitzButtonMesh) {
      if (canBlitz && !isProcessing) {
        this.blitzButtonMesh.visible = true;
        if (!this.interactableButtons.includes(this.blitzButtonMesh)) {
          this.interactableButtons.push(this.blitzButtonMesh);
        }

        if (this.blitzCtx) {
          const bctx = this.blitzCtx;
          bctx.clearRect(0, 0, 300, 80);

          // Glowing Golden/Amber Border
          bctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
          bctx.strokeStyle = '#f59e0b';
          bctx.lineWidth = 4;
          bctx.beginPath();
          bctx.roundRect(4, 4, 292, 72, 12);
          bctx.fill();
          bctx.stroke();

          bctx.fillStyle = '#fef08a';
          bctx.font = 'bold 24px Georgia, serif';
          bctx.textAlign = 'center';
          bctx.textBaseline = 'middle';
          bctx.fillText('⚡ BLITZ (AUTO-WIN)', 150, 40);

          if (this.blitzTex) this.blitzTex.needsUpdate = true;
        }
      } else {
        this.blitzButtonMesh.visible = false;
        const bIdx = this.interactableButtons.indexOf(this.blitzButtonMesh);
        if (bIdx !== -1) {
          this.interactableButtons.splice(bIdx, 1);
        }
      }
    }
  }

  handleButtonClick(action, synth, triggerHaptics) {
    if ((this.messageSpooler && this.messageSpooler.isProcessing) || this.isRoundInProgress) return;

    if (action === 'BLITZ') {
      this.executeBlitz();
      return;
    }

    if (action === 'ATTACK' || action === 'SPELL') {
      // If already in targeting mode with this action, cancel it; otherwise enter targeting mode
      if (this.isTargetingMode && this.pendingTargetAction === action) {
        this.setTargetingMode(false);
      } else {
        this.setTargetingMode(true, action);
      }
      return;
    }

    // Direct actions (SONG, DEFEND, RUN)
    this.setTargetingMode(false);
    this.executeCommand(action, synth, triggerHaptics);
  }

  setTargetingMode(enabled, pendingAction = 'ATTACK') {
    this.isTargetingMode = enabled;
    this.pendingTargetAction = enabled ? pendingAction : null;

    if (enabled) {
      this.addLogLine(`🎯 TARGETING: Choose target for ${pendingAction}!`);
      if (this.combatScroll) {
        this.combatScroll.startMessage(`🎯 SELECT TARGET FOR ${pendingAction}!`);
      }
    }

    if (this.interactableMonsters) {
      this.interactableMonsters.forEach(mMesh => {
        const ring = mMesh.getObjectByName('targetRing');
        if (ring) {
          ring.visible = enabled;
        }
        if (enabled) {
          if (mMesh.material && mMesh.material.color) {
            mMesh.material.color.setHex(0xfef08a);
          }
        } else {
          if (mMesh.material && mMesh.material.color) {
            mMesh.material.color.setHex(mMesh.userData?.originalColor ?? 0xffffff);
          }
        }
      });
    }

    this.updateButtonVisuals();
  }

  handleMonsterClick(monsterMesh, synth, triggerHaptics) {
    if ((this.messageSpooler && this.messageSpooler.isProcessing) || this.isRoundInProgress) return;
    if (!monsterMesh || !monsterMesh.userData || !monsterMesh.userData.monsterData) return;

    const targetMonster = monsterMesh.userData.monsterData;
    if ((targetMonster.currentHp ?? targetMonster.hp ?? 0) <= 0) return;

    const action = this.isTargetingMode ? (this.pendingTargetAction || 'ATTACK') : 'ATTACK';
    this.setTargetingMode(false);
    this.executeCommand(action, synth, triggerHaptics, targetMonster, monsterMesh);
  }

  cycleCommand(delta = 1) {
    if ((this.messageSpooler && this.messageSpooler.isProcessing) || this.isRoundInProgress) {
      return this.getSelectedAction();
    }
    this.selectedButtonIndex = (this.selectedButtonIndex + delta + this.buttonConfigs.length) % this.buttonConfigs.length;
    this.updateButtonVisuals();
    return this.getSelectedAction();
  }

  getSelectedAction() {
    return this.buttonConfigs[this.selectedButtonIndex].action;
  }

  // Enter Dedicated Combat Zone
  enterCombat(party, monsters) {
    this.arenaGroup.visible = true;
    this.selectedHeroForSwap = null;
    this.pendingCombatExit = null;
    this.isRoundInProgress = false;

    if (this.combatScroll) {
      this.combatScroll.clear();
      this.combatScroll.setVisible(true);
    }

    const flattenedMonsters = (Array.isArray(monsters) && monsters.some(m => m && (m.quantity > 1 || m.count > 1)))
      ? EncounterGenerator.flattenEncounterToMonsters(monsters)
      : monsters;

    const startMessages = this.combatEngine.startEncounter(party, flattenedMonsters);
    if (this.messageSpooler) {
      this.messageSpooler.clear();
      this.messageSpooler.enqueue(startMessages);
    } else {
      startMessages.forEach(msg => this.addLogLine(msg));
    }

    this.activeParty = this.combatEngine.party;
    this.activeMonsters = this.combatEngine.monsters;

    this.renderPartyFormation();
    this.renderMonsterFormation();
    this.updateButtonVisuals();
  }

  renderPartyFormation() {
    // Clear previous party models
    while (this.partyGroupMesh.children.length > 0) {
      this.partyGroupMesh.remove(this.partyGroupMesh.children[0]);
    }
    this.interactableHeroes = [];

    // Position Party Members in Front of Player, Slightly Lowered (y = 0.2)
    // Row 1 (Front: slots 0, 1, 2) vs Row 2 (Back: slots 3, 4, 5)
    this.activeParty.forEach((hero, idx) => {
      const isFrontRow = idx < 3;
      const col = idx % 3;
      const xPos = (col - 1) * 0.9;
      const zPos = isFrontRow ? -1.6 : -2.3;

      let model;
      if (hero.class === 'Paladin') model = PatronModels.createPaladin();
      else if (hero.class === 'Wizard' || hero.class === 'Conjurer' || hero.class === 'Magician') model = PatronModels.createWizard();
      else if (hero.class === 'Dwarf' || hero.class === 'Warrior') model = PatronModels.createDwarf();
      else if (hero.class === 'Rogue' || hero.class === 'Hobbit') model = PatronModels.createHobbit();
      else model = PatronModels.createBard();

      model.position.set(xPos, 0, zPos);
      model.userData = { isHeroMesh: true, partyIndex: idx, heroData: hero };

      // Highlight Ring under selected hero for swapping
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.25, 0.3, 16),
        new THREE.MeshBasicMaterial({ color: 0xf3cf65, side: THREE.DoubleSide })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.02;
      ring.name = 'swapRing';
      ring.visible = false;
      model.add(ring);

      this.partyGroupMesh.add(model);
      this.interactableHeroes.push(model);
    });
  }

  renderMonsterFormation() {
    // Clear previous monster models and updaters
    while (this.monsterGroupMesh.children.length > 0) {
      this.monsterGroupMesh.remove(this.monsterGroupMesh.children[0]);
    }
    this.animatedUpdaters = [];
    this.interactableMonsters = [];

    const livingMonsters = this.combatEngine.monsters
      ? this.combatEngine.monsters.filter(m => (m.currentHp ?? m.hp ?? 0) > 0)
      : [];

    if (livingMonsters.length === 0) return;

    // Group living monsters by slug to batch identical swarms into layout columns
    const groups = new Map();
    livingMonsters.forEach((m, idx) => {
      const slug = m.slug || m.name.toLowerCase().replace(/\s+/g, '_');
      if (!groups.has(slug)) groups.set(slug, []);
      groups.get(slug).push({ monster: m, originalIndex: idx });
    });

    const numGroups = groups.size;
    let groupIdx = 0;

    groups.forEach((groupEntries, slug) => {
      const count = groupEntries.length;
      const groupXOffset = numGroups > 1
        ? (groupIdx - (numGroups - 1) / 2) * Math.min(3.5, 7.0 / numGroups)
        : 0;

      // Arrange swarm in ranks (columns x rows)
      const cols = Math.min(6, Math.ceil(Math.sqrt(count * 1.5)));
      const colSpacing = Math.min(1.2, 6.0 / Math.max(1, cols));
      const rowSpacing = 0.8;

      groupEntries.forEach((entry, i) => {
        const monster = entry.monster;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = groupXOffset + (col - (cols - 1) / 2) * colSpacing;
        const z = -3.8 - row * rowSpacing;

        // Individual monster billboard mesh
        const geo = new THREE.PlaneGeometry(1.4, 1.4);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, 1.1, z);
        mesh.scale.set(1.4, 1.4, 1.4);
        mesh.name = `monster_${entry.originalIndex}_${slug}`;
        mesh.userData = {
          isMonsterMesh: true,
          monsterData: monster,
          monsterIndex: entry.originalIndex,
          originalColor: 0xffffff,
          originalScale: new THREE.Vector3(1.4, 1.4, 1.4),
          originalZ: z,
          originalY: 1.1
        };

        // Red Target Highlight Ring (active in Targeting Mode)
        const targetRing = new THREE.Mesh(
          new THREE.RingGeometry(0.35, 0.45, 16),
          new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
        );
        targetRing.rotation.x = Math.PI / 2;
        targetRing.position.y = -0.7;
        targetRing.name = 'targetRing';
        targetRing.visible = this.isTargetingMode;
        mesh.add(targetRing);

        // Shadow ring at base
        const shadow = new THREE.Mesh(
          this._shadowRingGeo,
          this._shadowRingMat
        );
        shadow.rotation.x = Math.PI / 2;
        shadow.position.set(0, -0.71, 0);
        mesh.add(shadow);

        // Connect sprite texture & animation updater
        this.spriteManager.createAnimatedBillboard(slug, 4).then(({ mesh: loadedMesh, update }) => {
          if (mesh.parent) {
            mesh.material.map = loadedMesh.material.map;
            mesh.material.needsUpdate = true;
          }
          if (update && !this.animatedUpdaters.includes(update)) {
            this.animatedUpdaters.push(update);
          }
        }).catch(() => {});

        this.monsterGroupMesh.add(mesh);
        this.interactableMonsters.push(mesh);
        monster._mesh = mesh;
      });

      groupIdx++;
    });
  }

  // Handle Hero Selection / Swap Formation Tapping
  handleHeroSwapClick(heroMesh, showToast) {
    if ((this.messageSpooler && this.messageSpooler.isProcessing) || this.isRoundInProgress) return;
    const heroIndex = heroMesh.userData.partyIndex;
    const hero = heroMesh.userData.heroData;

    if (this.selectedHeroForSwap === null) {
      // First hero tapped -> Look quizzically at player + highlight ring
      this.selectedHeroForSwap = heroIndex;

      // Turn hero head towards player quizzically
      heroMesh.rotation.y = Math.PI / 6;
      const ring = heroMesh.getObjectByName('swapRing');
      if (ring) ring.visible = true;

      const swapPrompt = `❓ ${hero.name} looks at you quizzically... Tap another hero to swap positions!`;
      if (this.messageSpooler) {
        this.messageSpooler.enqueue([swapPrompt]);
      } else if (showToast) {
        showToast(swapPrompt);
      }
      this.addLogLine(`${hero.name} waits for formation swap...`);
    } else {
      // Second hero tapped -> Swap positions in formation!
      const targetIndex = heroIndex;
      if (this.selectedHeroForSwap !== targetIndex) {
        const temp = this.activeParty[this.selectedHeroForSwap];
        this.activeParty[this.selectedHeroForSwap] = this.activeParty[targetIndex];
        this.activeParty[targetIndex] = temp;

        const swapSuccess = `🔄 Formation Swapped: ${temp.name} ↔ ${this.activeParty[this.selectedHeroForSwap].name}`;
        if (this.messageSpooler) {
          this.messageSpooler.enqueue([swapSuccess]);
        } else if (showToast) {
          showToast(swapSuccess);
        }
        this.addLogLine(`🔄 Swapped ${temp.name} with ${this.activeParty[this.selectedHeroForSwap].name}!`);
      }

      this.selectedHeroForSwap = null;
      this.renderPartyFormation();
    }
  }

  // Execute Combat Command & Stream Classic CRPG Scrolling Battle Text (Action-by-Action Pacing)
  async executeCommand(action, synth, triggerHaptics, targetMonster = null, targetMesh = null) {
    if (this.activeMonsters.length === 0) return;
    // Disable turn execution while MessageSpooler is processing or a round is currently in progress
    if ((this.messageSpooler && this.messageSpooler.isProcessing) || this.isRoundInProgress) return;

    this.isRoundInProgress = true;
    this.updateButtonVisuals();

    if (synth) {
      this.synth = synth;
      if (this.messageSpooler) this.messageSpooler.synth = synth;
    }

    // ── 0. FLEE / RUN COMMAND ──────────────────────────────────────────
    if (action === 'RUN') {
      const runMsgs = ["🏃 Party flees from combat!"];
      if (this.messageSpooler) {
        await this.messageSpooler.enqueueAndWait(runMsgs);
      } else {
        runMsgs.forEach(msg => this.addLogLine(msg));
      }
      this.isRoundInProgress = false;
      this.leaveCombat(false);
      return;
    }

    // ── 1. HERO ACTION EVALUATION ──────────────────────────────────────
    const frontHero = this.activeParty.find(h => (h.currentHp ?? h.hp ?? 0) > 0) || this.activeParty[0];
    const target = targetMonster || this.combatEngine.monsters.find(m => (m.currentHp ?? m.hp ?? 0) > 0) || this.combatEngine.monsters[0];
    const monsterMesh = targetMesh || (target ? (target._mesh || this.interactableMonsters.find(m => m.userData?.monsterData === target)) : null);

    let heroResult = null;
    let isSongAction = false;
    let playedSong = null;

    if (action === 'ATTACK') {
      heroResult = this.combatEngine.evaluateSingleTurnAction(frontHero, 'ATTACK', target);
    } else if (action === 'SONG') {
      const bard = this.activeParty.find(h => h.class === 'Bard' && (h.currentHp ?? h.hp ?? 0) > 0);
      if (!bard) {
        heroResult = { messages: ["No Bard in the party!"], message: "No Bard in the party!", killed: false };
      } else {
        const songNumber = this.currentSongIndex + 1;
        const song = BardSongs[this.currentSongIndex];
        heroResult = this.combatEngine.evaluateSingleTurnAction(bard, 'SING_BARD_SONG', null, { songNumber });
        playedSong = song;
        isSongAction = true;
        this.currentSongIndex = (this.currentSongIndex + 1) % 6;
      }
    } else if (action === 'SPELL') {
      const mage = this.activeParty.find(h => ['Conjurer', 'Magician', 'Sorcerer', 'Wizard'].includes(h.class) && (h.currentHp ?? h.hp ?? 0) > 0);
      if (!mage) {
        heroResult = { messages: ["No magic user available!"], message: "No magic user available!", killed: false };
      } else {
        let spellCode = 'ARFI'; // Default Conjurer
        if (mage.class === 'Magician') spellCode = 'STFL';
        else if (mage.class === 'Sorcerer') spellCode = 'MIJA';
        else if (mage.class === 'Wizard') spellCode = 'REDE';
        heroResult = this.combatEngine.evaluateSingleTurnAction(mage, 'CAST_SPELL', target, { spellCode });
      }
    } else if (action === 'DEFEND') {
      heroResult = this.combatEngine.evaluateSingleTurnAction(frontHero, 'DEFEND');
    }

    if (isSongAction && synth && playedSong) {
      try { synth.playSequence(playedSong.notes, playedSong.tempo); } catch {}
    }

    // Trigger visual hit or death feedback immediately on the targeted 3D monster billboard
    if (monsterMesh) {
      if (heroResult.killed || (target && (target.currentHp ?? target.hp ?? 0) <= 0)) {
        this.triggerDeathAnimation(monsterMesh);
      } else if (heroResult.messages && heroResult.messages.some(m => m.includes('hits') || m.includes('damage') || m.includes('strikes') || m.includes('slashes') || m.includes('casts'))) {
        const isCritical = heroResult.messages.some(m => m.includes('CRITICAL') || m.includes('vital spot'));
        this.triggerHitAnimation(monsterMesh, isCritical);
      }
    }

    // Await character-by-character typewriter spooling & 800ms line delay for hero action
    if (heroResult && heroResult.messages && heroResult.messages.length > 0) {
      if (this.messageSpooler) {
        await this.messageSpooler.enqueueAndWait(heroResult.messages);
      } else {
        heroResult.messages.forEach(msg => this.addLogLine(msg));
      }
    }

    if (!this.arenaGroup.visible) {
      this.isRoundInProgress = false;
      return;
    }

    // Update 3D formation models immediately on hero hit/kill
    this.renderMonsterFormation();
    this.renderPartyFormation();

    // ── 2. CHECK VICTORY AFTER HERO ACTION ─────────────────────────────
    if (this.combatEngine.isVictory()) {
      const rewardResult = this.combatEngine.calculateAndAwardVictoryRewards();
      if (this.messageSpooler) {
        await this.messageSpooler.enqueueAndWait(rewardResult.messages);
      } else {
        rewardResult.messages.forEach(msg => this.addLogLine(msg));
      }
      this.isRoundInProgress = false;
      this.leaveCombat(true);
      return;
    }

    // ── 3. SPECIAL SUMMON SLOT CREATURE ACTION (IF PRESENT) ────────────
    if (typeof this.combatEngine.evaluateSpecialSlotAction === 'function') {
      const specialResult = this.combatEngine.evaluateSpecialSlotAction();
      if (specialResult && specialResult.messages && specialResult.messages.length > 0) {
        if (this.messageSpooler) {
          await this.messageSpooler.enqueueAndWait(specialResult.messages);
        } else {
          specialResult.messages.forEach(msg => this.addLogLine(msg));
        }

        this.renderMonsterFormation();
        if (this.combatEngine.isVictory()) {
          const rewardResult = this.combatEngine.calculateAndAwardVictoryRewards();
          if (this.messageSpooler) {
            await this.messageSpooler.enqueueAndWait(rewardResult.messages);
          } else {
            rewardResult.messages.forEach(msg => this.addLogLine(msg));
          }
          this.isRoundInProgress = false;
          this.leaveCombat(true);
          return;
        }
      }
    }

    // ── 4. ACTION-BY-ACTION MONSTER COUNTER-ATTACK PHASE ───────────────
    const initialMonsterCount = this.combatEngine.monsters.length;
    for (let mi = 0; mi < initialMonsterCount; mi++) {
      if (!this.arenaGroup.visible) {
        this.isRoundInProgress = false;
        return;
      }
      if (this.combatEngine.isVictory() || this.combatEngine.isPartyWiped()) break;

      const monster = this.combatEngine.monsters[mi];
      if (!monster || (monster.currentHp !== undefined && monster.currentHp <= 0)) continue;

      const monsterResult = this.combatEngine.evaluateSingleMonsterAction(mi);
      if (monsterResult && monsterResult.messages && monsterResult.messages.length > 0) {
        if (this.messageSpooler) {
          await this.messageSpooler.enqueueAndWait(monsterResult.messages);
        } else {
          monsterResult.messages.forEach(msg => this.addLogLine(msg));
        }

        // Haptic feedback on hit
        if (triggerHaptics && monsterResult.hit) {
          try { triggerHaptics(0, 0.4, 150); } catch {}
        }

        // Update 3D party & monster formation meshes after each monster swing
        this.renderPartyFormation();
        this.renderMonsterFormation();

        if (this.combatEngine.isPartyWiped()) break;
      }
    }

    if (!this.arenaGroup.visible) {
      this.isRoundInProgress = false;
      return;
    }

    // ── 5. END-OF-ROUND EFFECTS (BARD SONG PASSIVE COMBAT HEALING) ─────
    if (typeof this.combatEngine.evaluateEndOfRoundEffects === 'function') {
      const endRoundMsgs = this.combatEngine.evaluateEndOfRoundEffects();
      if (endRoundMsgs && endRoundMsgs.length > 0) {
        if (this.messageSpooler) {
          await this.messageSpooler.enqueueAndWait(endRoundMsgs);
        } else {
          endRoundMsgs.forEach(msg => this.addLogLine(msg));
        }
        this.renderPartyFormation();
      }
    }

    // ── 6. CHECK DEFEAT ────────────────────────────────────────────────
    if (this.combatEngine.isPartyWiped()) {
      const wipeMsgs = ['💀 The party has been defeated...'];
      if (this.messageSpooler) {
        await this.messageSpooler.enqueueAndWait(wipeMsgs);
      } else {
        wipeMsgs.forEach(msg => this.addLogLine(msg));
      }
      this.isRoundInProgress = false;
      this.leaveCombat(false);
      return;
    }

    // ── 7. ADVANCE TURN & RE-ENABLE COMMAND BUTTONS ────────────────────
    this.combatEngine.advanceTurn();
    this.isRoundInProgress = false;
    this.updateButtonVisuals();
  }

  // ─── VISUAL FEEDBACK & ANIMATIONS ──────────────────────────────────────

  triggerHitAnimation(monsterMesh, isCritical = false) {
    if (!monsterMesh || !monsterMesh.position) return;

    // 1. Tint material pure white (0xffffff) for 50ms, then revert
    if (monsterMesh.material) {
      const origHex = monsterMesh.userData?.originalColor !== undefined
        ? monsterMesh.userData.originalColor
        : (monsterMesh.material.color ? monsterMesh.material.color.getHex() : 0xffffff);

      if (monsterMesh.material.color) {
        monsterMesh.material.color.setHex(0xffffff);
      }

      setTimeout(() => {
        if (monsterMesh && monsterMesh.material && monsterMesh.material.color) {
          monsterMesh.material.color.setHex(origHex);
        }
      }, 50);
    }

    // 2. Tween position.z backward by 0.3 units, then elastic-snap back over 200ms
    const startZ = monsterMesh.userData?.originalZ ?? monsterMesh.position.z;
    const duration = 200;
    const startTime = performance.now();

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / duration);

      if (progress < 0.3) {
        const p = progress / 0.3;
        monsterMesh.position.z = startZ - 0.3 * p;
      } else {
        const p = (progress - 0.3) / 0.7;
        const decay = Math.exp(-4 * p);
        const osc = Math.cos(p * Math.PI * 3);
        monsterMesh.position.z = startZ - (0.3 * (1 - p) + 0.08 * decay * osc);
      }

      if (progress >= 1.0) {
        monsterMesh.position.z = startZ;
        clearInterval(interval);
      }
    }, 16);
  }

  triggerDeathAnimation(monsterMesh) {
    if (!monsterMesh) return;

    // 1. Brief THREE.Points particle burst at mesh coordinates
    this.createDeathParticleBurst(monsterMesh.position);

    // 2. Tween scale to 0 over 300ms while dropping position.y into floor
    const startScale = monsterMesh.scale ? monsterMesh.scale.clone() : new THREE.Vector3(1, 1, 1);
    const startY = monsterMesh.position.y;
    const targetY = startY - 1.5;
    const duration = 300;
    const startTime = performance.now();

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      const ease = progress * progress;

      if (monsterMesh.scale) {
        monsterMesh.scale.set(
          Math.max(0, startScale.x * (1 - progress)),
          Math.max(0, startScale.y * (1 - progress)),
          Math.max(0, startScale.z * (1 - progress))
        );
      }
      monsterMesh.position.y = startY + (targetY - startY) * ease;

      if (progress >= 1.0) {
        if (monsterMesh.scale) monsterMesh.scale.set(0, 0, 0);
        monsterMesh.visible = false;
        clearInterval(interval);
      }
    }, 16);
  }

  createDeathParticleBurst(position) {
    const count = 28;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vels = [];

    const ox = position ? position.x : 0;
    const oy = position ? position.y : 1.0;
    const oz = position ? position.z : -3.8;

    for (let i = 0; i < count; i++) {
      pos[i * 3] = ox;
      pos[i * 3 + 1] = oy;
      pos[i * 3 + 2] = oz;

      const angle = Math.random() * Math.PI * 2;
      const spd = 1.0 + Math.random() * 2.2;
      vels.push({
        x: Math.cos(angle) * spd,
        y: Math.random() * 2.0 + 1.2,
        z: Math.sin(angle) * spd
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.1,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geo, mat);
    this.arenaGroup.add(points);

    const startTime = performance.now();
    const burstDuration = 450;

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / burstDuration);
      const dt = 0.016;

      const pArr = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        pArr[i * 3] += vels[i].x * dt;
        pArr[i * 3 + 1] += vels[i].y * dt;
        pArr[i * 3 + 2] += vels[i].z * dt;
        vels[i].y -= 4.0 * dt; // gravity
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = Math.max(0, 1.0 - progress);

      if (progress >= 1.0) {
        clearInterval(interval);
        this.arenaGroup.remove(points);
        geo.dispose();
        mat.dispose();
      }
    }, 16);
  }

  // ─── BLITZ ANTI-GRIND AUTO-RESOLVE ─────────────────────────────────────

  async executeBlitz() {
    if (!this.combatEngine.canBlitz()) return;
    if (this.isRoundInProgress) return;

    this.isRoundInProgress = true;
    this.setTargetingMode(false);
    this.updateButtonVisuals();

    if (this.messageSpooler) {
      this.messageSpooler.clear();
    }

    this.addLogLine("⚡ BLITZ AUTO-RESOLVE INITIATED!");

    let roundSafety = 0;
    while (!this.combatEngine.isVictory() && !this.combatEngine.isPartyWiped() && roundSafety < 100) {
      roundSafety++;

      // Evaluate party turn actions directly
      for (const hero of this.combatEngine.party) {
        if (!hero || (hero.currentHp ?? hero.hp ?? 0) <= 0) continue;
        if (this.combatEngine.isVictory()) break;

        const target = this.combatEngine.monsters.find(m => (m.currentHp ?? m.hp ?? 0) > 0);
        if (!target) break;

        const action = ['Conjurer', 'Magician', 'Sorcerer', 'Wizard'].includes(hero.class) ? 'CAST_SPELL' : 'ATTACK';
        this.combatEngine.executeTurnAction(hero, action, target);
      }

      if (this.combatEngine.isVictory() || this.combatEngine.isPartyWiped()) break;

      // Evaluate monster counter-attacks
      const mCount = this.combatEngine.monsters.length;
      for (let i = 0; i < mCount; i++) {
        if (this.combatEngine.isPartyWiped() || this.combatEngine.isVictory()) break;
        const m = this.combatEngine.monsters[i];
        if (!m || (m.currentHp ?? m.hp ?? 0) <= 0) continue;
        this.combatEngine.evaluateSingleMonsterAction(i);
      }

      this.combatEngine.advanceTurn();
    }

    if (this.combatEngine.isVictory()) {
      const rewardResult = this.combatEngine.calculateAndAwardVictoryRewards();
      this.addLogLine(`⚡ Encounter Blitzed in ${roundSafety} turn(s)!`);
      if (this.combatScroll) {
        this.combatScroll.clear();
        this.combatScroll.startMessage(`⚡ BLITZ VICTORY! (+${rewardResult.xpPerSurvivor} XP, +${rewardResult.goldPerSurvivor} GP)`);
      }
      this.renderMonsterFormation();
      this.renderPartyFormation();
      this.isRoundInProgress = false;
      this.leaveCombat(true);
    } else if (this.combatEngine.isPartyWiped()) {
      this.addLogLine("💀 Party wiped during Blitz...");
      this.isRoundInProgress = false;
      this.leaveCombat(false);
    } else {
      this.isRoundInProgress = false;
      this.updateButtonVisuals();
    }
  }

  leaveCombat(victory = true) {
    this.isRoundInProgress = false;
    this.setTargetingMode(false);
    if (this.messageSpooler) {
      this.messageSpooler.clear();
    }
    if (this.combatScroll) {
      this.combatScroll.setVisible(false);
    }
    this.pendingCombatExit = null;
    this.combatEngine.endEncounter();
    this.arenaGroup.visible = false;
    if (this.onCombatEnd) this.onCombatEnd(victory);
  }

  update(time) {
    // Update animated sprite billboard loops (monsters / heroes)
    if (this.animatedUpdaters && this.animatedUpdaters.length > 0) {
      this.animatedUpdaters.forEach(updater => updater(time));
    }

    // Gentle rotation animation for selected swap hero looking quizzically
    if (this.selectedHeroForSwap !== null && this.interactableHeroes[this.selectedHeroForSwap]) {
      const heroMesh = this.interactableHeroes[this.selectedHeroForSwap];
      heroMesh.rotation.y = Math.sin(time * 4) * 0.15 + Math.PI / 8;
    }

    // Pulse target rings on living monsters during Targeting Mode
    if (this.isTargetingMode && this.interactableMonsters && this.interactableMonsters.length > 0) {
      const pulse = 1.0 + Math.sin(time * 8) * 0.15;
      this.interactableMonsters.forEach(mMesh => {
        const ring = mMesh.getObjectByName('targetRing');
        if (ring) {
          ring.scale.set(pulse, pulse, 1.0);
        }
      });
    }
  }
}
