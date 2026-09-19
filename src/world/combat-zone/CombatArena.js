import * as THREE from 'three';
import { TextureGenerator } from '../../textures/TextureGenerator.js';
import { PatronModels } from '../PatronModels.js';
import { CombatEngine } from '../../core/combat/CombatEngine.js';
import { BardSongs } from '../../data/BardSongs.js';

export class CombatArena {
  constructor(scene, camera, onCombatEnd) {
    this.scene = scene;
    this.camera = camera;
    this.onCombatEnd = onCombatEnd;
    
    this.combatEngine = new CombatEngine();
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

    this.battleLogLines = [];
    this.battleLogMesh = null;
    this.battleLogCanvasCtx = null;
    this.battleLogTexture = null;

    this.interactableButtons = [];
    this.interactableHeroes = [];

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

    // Ominous Magical Braziers
    const brazierPositions = [
      [-4.0, 0, -5.0],
      [4.0, 0, -5.0],
      [-4.0, 0, 1.0],
      [4.0, 0, 1.0]
    ];

    brazierPositions.forEach(pos => {
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.8 })
      );
      stand.position.set(...pos);
      this.arenaGroup.add(stand);

      const light = new THREE.PointLight(0xa855f7, 3.5, 9);
      light.position.set(pos[0], 1.4, pos[2]);
      this.arenaGroup.add(light);
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
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 70;
      const ctx = canvas.getContext('2d');
      const tex = new THREE.CanvasTexture(canvas);

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

    this.updateButtonVisuals();
  }

  updateButtonVisuals() {
    this.buttonData.forEach((b, idx) => {
      const isSelected = idx === this.selectedButtonIndex;
      const ctx = b.ctx;
      ctx.clearRect(0, 0, 240, 70);

      // Background
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

      b.tex.needsUpdate = true;
    });
  }

  cycleCommand(delta = 1) {
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

    const startMessages = this.combatEngine.startEncounter(party, monsters);
    startMessages.forEach(msg => this.addLogLine(msg));

    this.activeParty = this.combatEngine.party;
    this.activeMonsters = this.combatEngine.monsters;

    this.renderPartyFormation();
    this.renderMonsterFormation();
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
    // Clear previous monster models
    while (this.monsterGroupMesh.children.length > 0) {
      this.monsterGroupMesh.remove(this.monsterGroupMesh.children[0]);
    }

    // Position Monster Group at a Distance (z = -4.2m)
    this.activeMonsters.forEach((m, idx) => {
      const xPos = (idx - (this.activeMonsters.length - 1) / 2) * 1.3;

      const monsterMesh = new THREE.Group();
      monsterMesh.position.set(xPos, 0, -4.2);

      const bodyMat = new THREE.MeshStandardMaterial({
        color: m.name.includes('Skeleton') ? 0xe2e8f0 : 0xb91c1c,
        roughness: 0.6
      });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 1.2), bodyMat);
      body.position.y = 0.6;
      monsterMesh.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), bodyMat);
      head.position.y = 1.35;
      monsterMesh.add(head);

      const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      eyes.position.set(0, 1.37, 0.18);
      monsterMesh.add(eyes);

      this.monsterGroupMesh.add(monsterMesh);
    });
  }

  // Handle Hero Selection / Swap Formation Tapping
  handleHeroSwapClick(heroMesh, showToast) {
    const heroIndex = heroMesh.userData.partyIndex;
    const hero = heroMesh.userData.heroData;

    if (this.selectedHeroForSwap === null) {
      // First hero tapped -> Look quizzically at player + highlight ring
      this.selectedHeroForSwap = heroIndex;

      // Turn hero head towards player quizzically
      heroMesh.rotation.y = Math.PI / 6;
      const ring = heroMesh.getObjectByName('swapRing');
      if (ring) ring.visible = true;

      if (showToast) {
        showToast(`❓ ${hero.name} looks at you quizzically... Tap another hero to swap positions!`);
      }
      this.addLogLine(`${hero.name} waits for formation swap...`);
    } else {
      // Second hero tapped -> Swap positions in formation!
      const targetIndex = heroIndex;
      if (this.selectedHeroForSwap !== targetIndex) {
        const temp = this.activeParty[this.selectedHeroForSwap];
        this.activeParty[this.selectedHeroForSwap] = this.activeParty[targetIndex];
        this.activeParty[targetIndex] = temp;

        this.addLogLine(`🔄 Swapped ${temp.name} with ${this.activeParty[this.selectedHeroForSwap].name}!`);
        if (showToast) {
          showToast(`🔄 Formation Swapped: ${temp.name} ↔ ${this.activeParty[this.selectedHeroForSwap].name}`);
        }
      }

      this.selectedHeroForSwap = null;
      this.renderPartyFormation();
    }
  }

  // Execute Combat Command & Stream Classic CRPG Scrolling Battle Text
  executeCommand(action, synth, triggerHaptics) {
    if (this.activeMonsters.length === 0) return;

    const frontHero = this.activeParty.find(h => (h.currentHp ?? h.hp ?? 0) > 0) || this.activeParty[0];
    const target = this.combatEngine.monsters[0];

    if (action === 'ATTACK') {
      const result = this.combatEngine.executeTurnAction(frontHero, 'ATTACK', target);
      result.messages.forEach(msg => this.addLogLine(msg));

      const monsterMessages = this.combatEngine.executeMonsterPhase();
      monsterMessages.forEach(msg => this.addLogLine(msg));
      this.combatEngine.advanceTurn();
    } else if (action === 'SONG') {
      const bard = this.activeParty.find(h => h.class === 'Bard');
      if (!bard) {
        this.addLogLine("No Bard in the party!");
      } else {
        const songNumber = this.currentSongIndex + 1;
        const song = BardSongs[this.currentSongIndex];
        const result = this.combatEngine.executeTurnAction(bard, 'SING_BARD_SONG', null, { songNumber });
        result.messages.forEach(msg => this.addLogLine(msg));
        
        if (synth && song) {
          synth.playSequence(song.notes, song.tempo);
        }
        this.currentSongIndex = (this.currentSongIndex + 1) % 6;

        const monsterMessages = this.combatEngine.executeMonsterPhase();
        monsterMessages.forEach(msg => this.addLogLine(msg));
        this.combatEngine.advanceTurn();
      }
    } else if (action === 'SPELL') {
      const mage = this.activeParty.find(h => ['Conjurer','Magician','Sorcerer','Wizard'].includes(h.class) && (h.currentHp ?? h.hp ?? 0) > 0);
      if (!mage) {
        this.addLogLine("No magic user available!");
      } else {
        let spellCode = 'ARFI'; // Default Conjurer
        if (mage.class === 'Magician') spellCode = 'STFL';
        else if (mage.class === 'Sorcerer') spellCode = 'MIJA';
        else if (mage.class === 'Wizard') spellCode = 'REDE';
        
        const result = this.combatEngine.executeTurnAction(mage, 'CAST_SPELL', target, { spellCode });
        result.messages.forEach(msg => this.addLogLine(msg));

        const monsterMessages = this.combatEngine.executeMonsterPhase();
        monsterMessages.forEach(msg => this.addLogLine(msg));
        this.combatEngine.advanceTurn();
      }
    } else if (action === 'DEFEND') {
      const result = this.combatEngine.executeTurnAction(frontHero, 'DEFEND');
      result.messages.forEach(msg => this.addLogLine(msg));

      const monsterMessages = this.combatEngine.executeMonsterPhase();
      monsterMessages.forEach(msg => this.addLogLine(msg));
      this.combatEngine.advanceTurn();
    } else if (action === 'RUN') {
      this.addLogLine("🏃 Party flees from combat!");
      setTimeout(() => this.leaveCombat(false), 1200);
      return;
    }

    if (action !== 'RUN') {
      if (this.combatEngine.isVictory()) {
        const rewardResult = this.combatEngine.calculateAndAwardVictoryRewards();
        rewardResult.messages.forEach(msg => this.addLogLine(msg));
        setTimeout(() => this.leaveCombat(true), 3200);
      } else if (this.combatEngine.isPartyWiped()) {
        this.addLogLine('💀 The party has been defeated...');
        setTimeout(() => this.leaveCombat(false), 2500);
      } else {
        this.renderMonsterFormation();
        this.renderPartyFormation();
      }
    }
  }

  leaveCombat(victory = true) {
    this.combatEngine.endEncounter();
    this.arenaGroup.visible = false;
    if (this.onCombatEnd) this.onCombatEnd(victory);
  }

  update(time) {
    // Gentle rotation animation for selected swap hero looking quizzically
    if (this.selectedHeroForSwap !== null && this.interactableHeroes[this.selectedHeroForSwap]) {
      const heroMesh = this.interactableHeroes[this.selectedHeroForSwap];
      heroMesh.rotation.y = Math.sin(time * 4) * 0.15 + Math.PI / 8;
    }
  }
}
