import * as THREE from 'three';
import { TextureGenerator } from '../textures/TextureGenerator.js';
import { TorchFlameShader } from '../shaders/TorchFlameShader.js';
import { AnimatedSpriteManager } from '../textures/AnimatedSprite.js';
import { TAVERN_TUTORIAL_PATRONS } from '../data/TavernTutorialData.js';
import { COLLISION_LAYER } from '../ui/spatial-hud/SpatialCollisionLayers.js';
import { createTavernTable, createTavernBench, createTavernMug, createWineBarrel } from './tavern/TavernFurnitureFactory.js';

export class FullVRTavern {
  constructor(scene, onBardSelected, onDoorSelected) {
    this.scene = scene;
    this.onBardSelected = onBardSelected;
    this.onDoorSelected = onDoorSelected;

    this.spriteManager = new AnimatedSpriteManager();
    this.animatedUpdaters = [];
    this.portraitImages = new Map();

    this.interactableObjects = [];
    this.patronObjects = [];
    this.torches = [];
    this.flameMeshes = [];
    this.embers = [];
    this.smokeParticles = [];
    this.aleMugs = [];
    this.bardMesh = null;
    this.exitDoorMesh = null;
    this.speechBubbleMesh = null;
    this.speechCanvasCtx = null;
    this.speechTexture = null;

    this.activePatronKey = null;
    this.dialoguePage = 0;
    this.dialogueCanvas = null;
    this.dialogueCtx = null;
    this.dialogueTexture = null;
    this.dialogueMesh = null;
    this.dialogueGroup = null;
    this.dialogueButtons = [];

    this.tavernGroup = new THREE.Group();
    this.tavernGroup.name = 'FullVRTavern';
    this.tavernGroup.visible = false;

    this.initTavernRoom();
    this.initLightingAndChandelier();
    this.initStageAndBard();
    this.initPatronsAndOakTables();
    this.initMountedTrophiesAndWeapons();
    this.initExitDoor();
    this.initFireplace();
    this.initFloatingSpeechBubble();
    this.initEntranceTransition();

    this.scene.add(this.tavernGroup);
  }

  initTavernRoom() {
    this.scene.fog = new THREE.FogExp2(0x0a0c10, 0.04);

    const stoneTex = TextureGenerator.createStoneWallTexture();
    stoneTex.repeat.set(4, 2);
    const wallMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.85
    });

    const woodTex = TextureGenerator.createWoodPlankTexture();
    woodTex.repeat.set(4, 4);
    const ceilingMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.65
    });

    // PBR Packed Dirt & Gritty Sand Floor with Bump Normal Map (16m wide x 14m deep)
    const dirtTex = TextureGenerator.createDirtSandFloorTexture();
    dirtTex.repeat.set(4, 4);
    const dirtNormal = TextureGenerator.createDirtSandFloorNormalMap();
    dirtNormal.repeat.set(4, 4);
    const floorMat = new THREE.MeshStandardMaterial({
      map: dirtTex,
      normalMap: dirtNormal,
      roughness: 0.88,
      metalness: 0.05
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.tavernGroup.add(floor);

    // High Timber Ceiling (y = 5.2m)
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), ceilingMat);
    ceiling.position.y = 5.2;
    ceiling.rotation.x = Math.PI / 2;
    this.tavernGroup.add(ceiling);

    // Heavy Timber Ceiling Beams
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x3e2312, roughness: 0.8 });
    for (let z = -5; z <= 5; z += 2.5) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(16, 0.35, 0.35), beamMat);
      beam.position.set(0, 5.0, z);
      this.tavernGroup.add(beam);
    }

    // 4 Walls
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 5.2), wallMat);
    backWall.position.set(0, 2.6, -7);
    this.tavernGroup.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 5.2), wallMat);
    frontWall.position.set(0, 2.6, 7);
    frontWall.rotation.y = Math.PI;
    this.tavernGroup.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 5.2), wallMat);
    leftWall.position.set(-8, 2.6, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.tavernGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 5.2), wallMat);
    rightWall.position.set(8, 2.6, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.tavernGroup.add(rightWall);

    // Stained Glass Window with Moonlit Light Ray (Back Wall)
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    const windowMesh = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), windowMat);
    windowMesh.position.set(0, 3.6, -6.95);
    this.tavernGroup.add(windowMesh);

    // Volumetric Moonlit Light Beam
    const beamGeo = new THREE.CylinderGeometry(0.8, 2.2, 7.0, 16, 1, true);
    const beamMatMesh = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const lightCone = new THREE.Mesh(beamGeo, beamMatMesh);
    lightCone.position.set(0, 2.0, -3.8);
    lightCone.rotation.x = Math.PI / 4;
    this.tavernGroup.add(lightCone);
  }

  initLightingAndChandelier() {
    // ── Baked Global Illumination Substitute ──────────────────────────────────
    // A HemisphereLight is evaluated in a single GPU pass (it's just two
    // directional gradient inputs baked into the GGX BRDF).  It replaces the
    // old AmbientLight and eliminates the "flat" look without requiring any
    // additional shadow or per-fragment light evaluation.
    //
    // ⚡ WebXR Budget note: Every PointLight costs O(mesh_count × fragment_count)
    // per eye per frame.  12 flickering PointLights across the tavern was the
    // single largest frame-time sink.  We now run with:
    //   • 1 HemisphereLight  — zero fragment cost (baked into vertex shader)
    //   • 1 hero PointLight  (chandelier, radius 14)  — keeps full-tavern flicker
    //   • 1 hero PointLight  (fireplace, radius 12)   — kept in initFireplace()
    //   All 10 removed PointLights are replaced with emissive glow on nearby meshes.
    const hemiLight = new THREE.HemisphereLight(
      0x6b3a1f,  // Sky colour: warm amber (torchlit ceiling)
      0x1a0d05,  // Ground colour: dark ember shadow floor
      1.8        // Intensity — replaces old AmbientLight(0x451a03, 1.5)
    );
    this.tavernGroup.add(hemiLight);

    // Hanging Iron Wagon-Wheel Chandelier
    const chandelierGroup = new THREE.Group();
    chandelierGroup.position.set(0, 4.2, 0);

    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.08, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 })
    );
    wheel.rotation.x = Math.PI / 2;
    chandelierGroup.add(wheel);

    // 4 Hanging Chains
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2), chainMat);
      chain.position.set(Math.cos(angle) * 0.7, 0.55, Math.sin(angle) * 0.7);
      chain.rotation.z = Math.cos(angle) * 0.3;
      chain.rotation.x = Math.sin(angle) * 0.3;
      chandelierGroup.add(chain);
    }

    // 8 Chandelier Candles with Volumetric Flame Shaders
    // The candle wax mesh now has emissive glow to fake local warmth —
    // no per-candle PointLight needed.
    const candleEmissiveMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.3,
      emissive: 0xf97316,
      emissiveIntensity: 0.6  // Baked warm glow — zero fragment cost vs PointLight
    });
    for (let c = 0; c < 8; c++) {
      const cAngle = (c * Math.PI) / 4;
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.15),
        candleEmissiveMat
      );
      candle.position.set(Math.cos(cAngle) * 1.4, 0.1, Math.sin(cAngle) * 1.4);
      chandelierGroup.add(candle);

      const cFlame = TorchFlameShader.createFlameMesh('fire');
      cFlame.scale.set(0.35, 0.4, 0.35);
      cFlame.position.set(Math.cos(cAngle) * 1.4, 0.18, Math.sin(cAngle) * 1.4);
      chandelierGroup.add(cFlame);
      this.flameMeshes.push(cFlame);
    }

    // Single hero PointLight on the chandelier — covers the entire tavern (radius 14).
    // This is the only real-time PointLight in the upper lighting rig; its flicker
    // gives the illusion that all 8 candles and all 6 wall sconces are alive.
    const chandelierLight = new THREE.PointLight(0xf59e0b, 3.5, 14);
    chandelierLight.position.set(0, 0.2, 0);
    chandelierGroup.add(chandelierLight);
    // Stored for the simplified flicker update in update().
    this.heroLights = [{ light: chandelierLight, baseIntensity: 3.5, phase: 1.0 }];

    this.tavernGroup.add(chandelierGroup);

    // Wall Sconces with Volumetric GLSL Smoky Torches
    // PointLights REMOVED from each sconce — the chandelier hero light and
    // the emissive torch-head materials provide all necessary warmth cues.
    const torchPositions = [
      { pos: [-7.8, 2.8, -4.0], rotY: Math.PI / 2 },
      { pos: [-7.8, 2.8,  3.5], rotY: Math.PI / 2 },
      { pos: [ 7.8, 2.8, -4.0], rotY: -Math.PI / 2 },
      { pos: [ 7.8, 2.8,  3.5], rotY: -Math.PI / 2 },
      { pos: [-3.5, 2.8, -6.8], rotY: 0 },
      { pos: [ 3.5, 2.8, -6.8], rotY: 0 }
    ];

    // Shared emissive material for all torch heads — baked orange glow.
    const torchHeadMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.9,
      emissive: 0xf97316,
      emissiveIntensity: 1.2   // Strong emissive simulates local warmth; zero GPU light eval
    });

    torchPositions.forEach((cfg) => {
      const torchGroup = new THREE.Group();
      torchGroup.position.set(...cfg.pos);
      torchGroup.rotation.y = cfg.rotY;

      // Iron Bracket
      const bracket = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.35, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 })
      );
      torchGroup.add(bracket);

      // Wooden Torch Shaft with emissive head — replaces PointLight for local warmth
      const torchWood = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.03, 0.35),
        torchHeadMat
      );
      torchWood.position.set(0, 0.15, 0.12);
      torchWood.rotation.x = Math.PI / 8;
      torchGroup.add(torchWood);

      // Volumetric GLSL Flame Shader (visual only — no light emitted from here)
      const tFlame = TorchFlameShader.createFlameMesh('fire');
      tFlame.scale.set(1.0, 1.0, 1.0);
      tFlame.position.set(0, 0.30, 0.15);
      torchGroup.add(tFlame);
      this.flameMeshes.push(tFlame);

      // ⚡ No PointLight added here — removed 6 PointLights vs original.
      //    Warmth cue = emissive torchHeadMat + chandelier hero PointLight flicker.

      // Rising Smoke Particles
      for (let s = 0; s < 4; s++) {
        const smoke = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.35 })
        );
        smoke.position.set(cfg.pos[0] + (Math.random() - 0.5) * 0.1, cfg.pos[1] + 0.4 + s * 0.2, cfg.pos[2]);
        this.smokeParticles.push({ mesh: smoke, baseY: cfg.pos[1] + 0.4, speed: 0.3 + Math.random() * 0.2 });
        this.tavernGroup.add(smoke);
      }

      this.tavernGroup.add(torchGroup);
    });
  }

  initStageAndBard() {
    // Elevated Heavy Oak Stage (Front Center)
    const stageGeo = new THREE.BoxGeometry(5.0, 0.45, 3.2);
    const woodTex = TextureGenerator.createWoodPlankTexture();
    // ⚡ Stage emissive glow replaces the old SpotLight(0xfde68a, 4.2, 14).
    // SpotLights require a full shadow frustum calculation + per-fragment
    // evaluation over the entire lit area — the most expensive single light
    // in the scene.  A subtle emissive tint on the stage mesh costs nothing
    // at runtime and reads as "warmly lit" under the HemisphereLight.
    const stageMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.55,
      emissive: 0x2a1000,
      emissiveIntensity: 0.4
    });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.set(0, 0.225, -4.8);
    stage.receiveShadow = true;
    stage.castShadow = true;
    this.tavernGroup.add(stage);

    // 1985 Animated Bard Billboard on Stage with Interactive Hitbox
    const bardGroup = new THREE.Group();
    bardGroup.position.set(0, 0.45, -4.8);
    this.bardMesh = bardGroup;
    this.bardMesh.userData = { isBard: true, isPatron: true, patronKey: 'bard', name: 'The Scarlet Bard' };

    const bardHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.0, 1.0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    bardHitbox.position.set(0, 0.9, 0);
    bardHitbox.userData = this.bardMesh.userData;
    bardGroup.add(bardHitbox);

    (async () => {
      try {
        const animated = await this.spriteManager.createAnimatedBillboard('/assets/sprites/bt1_04.png', 4);
        animated.mesh.position.set(0, 0.9, 0);
        animated.mesh.scale.set(0.9, 0.9, 0.9);
        animated.mesh.userData = this.bardMesh.userData;
        bardGroup.add(animated.mesh);
        this.animatedUpdaters.push(animated.update);
      } catch (e) {
        console.warn('Failed to load bard sprite:', e);
      }
    })();

    this.tavernGroup.add(bardGroup);
    this.interactableObjects.push(bardHitbox, bardGroup);
    this.patronObjects.push(bardHitbox, bardGroup);

    // Stage Banner: "⚔️ SKARA BRAE TAVERN ⚔️"
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 640;
    bannerCanvas.height = 140;
    const ctx = bannerCanvas.getContext('2d');
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(0, 0, 640, 140);
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 624, 124);
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 36px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚔️ SKARA BRAE TAVERN ⚔️', 320, 62);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.fillText('Click Bard or Patrons for Game Lore & Guides', 320, 105);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 0.95),
      new THREE.MeshBasicMaterial({ map: bannerTex })
    );
    banner.position.set(0, 3.8, -6.85);
    this.tavernGroup.add(banner);
  }

  initPatronsAndOakTables() {
    const oakWoodMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWoodPlankTexture(),
      roughness: 0.5
    });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 });

    const patronConfigs = [
      { pos: [-2.8, 0, -1.8], rot: Math.PI / 4, label: 'Human Paladin', patronKey: 'paladin', sprite: '/assets/sprites/bt1_02.png' },
      { pos: [2.8, 0, -1.8], rot: -Math.PI / 4, label: 'Elf Wizard', patronKey: 'wizard', sprite: '/assets/sprites/bt1_08.png' },
      { pos: [-3.2, 0, 1.8], rot: Math.PI / 6, label: 'Dwarf Warrior', patronKey: 'dwarf', sprite: '/assets/sprites/bt1_01.png' },
      { pos: [3.2, 0, 1.8], rot: -Math.PI / 6, label: 'Hobbit Rogue', patronKey: 'hobbit', sprite: '/assets/sprites/bt1_03.png' }
    ];

    patronConfigs.forEach((cfg, idx) => {
      // 1. Heavy Slab Oak Table
      const tableGroup = createTavernTable();
      tableGroup.position.set(cfg.pos[0], 0, cfg.pos[2]);

      // 2. Oak Bench
      const benchGroup = createTavernBench();
      benchGroup.position.set(0, 0, 0.75);
      tableGroup.add(benchGroup);

      this.tavernGroup.add(tableGroup);

      // 3. Realistic Ale Mug with Sloshing Amber Liquid & Foam
      const mugGroup = createTavernMug();
      mugGroup.position.set(cfg.pos[0] + 0.25, 0.81, cfg.pos[2] + 0.15);

      // Invisible Hit Box for Easy Clicking & Reticle Aiming
      const mugHitBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.28, 0.24),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      mugHitBox.position.y = 0.05;
      mugGroup.add(mugHitBox);

      mugGroup.userData = {
        isAleMug: true,
        mugIdx: idx,
        isDrinking: false,
        fillLevel: 1.0
      };

      this.aleMugs.push(mugGroup);
      this.tavernGroup.add(mugGroup);
      this.interactableObjects.push(mugHitBox, mugGroup);

      // 4. Magical Multi-Colored Candle on Table
      // ⚡ PointLight removed — emissive candle wax provides local warmth cue at
      //    zero GPU fragment cost.  TorchFlameShader visual is unchanged.
      const candleColors = ['fire', 'blue', 'fire', 'violet'];
      const candleEmissives = [0xf97316, 0x38bdf8, 0xf97316, 0xc084fc];

      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.03, 0.12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xfef9c3,
          roughness: 0.4,
          emissive: candleEmissives[idx],
          emissiveIntensity: 0.55  // Tinted emissive per candle colour, no PointLight needed
        })
      );
      candle.position.set(cfg.pos[0] - 0.35, 0.87, cfg.pos[2]);
      this.tavernGroup.add(candle);

      const tableFlame = TorchFlameShader.createFlameMesh(candleColors[idx]);
      tableFlame.scale.set(0.4, 0.45, 0.4);
      tableFlame.position.set(cfg.pos[0] - 0.35, 0.93, cfg.pos[2]);
      this.tavernGroup.add(tableFlame);
      this.flameMeshes.push(tableFlame);

      // 5. Seated Animated 1985 Sprite Patron + Interactive Hitbox (Replacing low-poly 3D models)
      const patronGroup = new THREE.Group();
      patronGroup.position.set(cfg.pos[0], 0, cfg.pos[2] + 0.65);
      patronGroup.rotation.y = cfg.rot;

      const patronData = {
        isPatron: true,
        patronKey: cfg.patronKey,
        name: cfg.label
      };
      patronGroup.userData = patronData;

      // Generous Patron Hitbox for raycast aiming & clicking
      const patronHitbox = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.6, 0.8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      patronHitbox.position.set(0, 0.75, 0);
      patronHitbox.userData = patronData;
      patronGroup.add(patronHitbox);

      (async () => {
        try {
          const animated = await this.spriteManager.createAnimatedBillboard(cfg.sprite, 4);
          animated.mesh.position.set(0, 0.75, 0);
          animated.mesh.scale.set(0.75, 0.75, 0.75);
          animated.mesh.userData = patronData;
          patronGroup.add(animated.mesh);
          this.animatedUpdaters.push(animated.update);
        } catch (e) {
          console.warn('Failed to load patron sprite:', cfg.label, e);
        }
      })();

      this.tavernGroup.add(patronGroup);
      this.interactableObjects.push(patronHitbox, patronGroup);
      this.patronObjects.push(patronHitbox, patronGroup);
    });

    this.initDialogueWindow();
  }

  initDialogueWindow() {
    this.dialogueGroup = new THREE.Group();
    this.dialogueGroup.position.set(0, 1.35, -2.4);
    this.dialogueGroup.visible = false;

    this.dialogueCanvas = document.createElement('canvas');
    this.dialogueCanvas.width = 680;
    this.dialogueCanvas.height = 380;
    this.dialogueCtx = this.dialogueCanvas.getContext('2d');
    this.dialogueTexture = new THREE.CanvasTexture(this.dialogueCanvas);

    const mat = new THREE.MeshBasicMaterial({
      map: this.dialogueTexture,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.dialogueMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.18), mat);
    this.dialogueMesh.userData = { isTavernDialogue: true };
    this.dialogueGroup.add(this.dialogueMesh);
    this.interactableObjects.push(this.dialogueMesh);

    this.tavernGroup.add(this.dialogueGroup);
  }

  openPatronDialogue(patronKey, cameraPos = null) {
    const data = TAVERN_TUTORIAL_PATRONS[patronKey];
    if (!data) return;

    this.activePatronKey = patronKey;
    this.dialoguePage = 0;
    this.dialogueGroup.visible = true;

    // Position dialogue scroll facing player
    if (cameraPos) {
      this.dialogueGroup.lookAt(cameraPos.x, this.dialogueGroup.position.y, cameraPos.z);
    }

    this.renderPatronDialogue();
  }

  closePatronDialogue() {
    this.activePatronKey = null;
    this.dialoguePage = 0;
    this.dialogueGroup.visible = false;
  }

  renderPatronDialogue() {
    if (!this.activePatronKey || !this.dialogueCtx || !this.dialogueTexture) return;

    const data = TAVERN_TUTORIAL_PATRONS[this.activePatronKey];
    if (!data) return;

    const ctx = this.dialogueCtx;
    const cw = 680;
    const ch = 380;
    ctx.clearRect(0, 0, cw, ch);
    this.dialogueButtons = [];

    // 1. Parchment Outer Frame & Dark Wood Trim
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.beginPath();
    ctx.roundRect(8, 8, cw - 16, ch - 16, 18);
    ctx.fill();

    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(243, 207, 101, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(14, 14, cw - 28, ch - 28, 14);
    ctx.stroke();

    // 2. Left Portrait Box (130 x 130)
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(24, 26, 120, 130);
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(24, 26, 120, 130);

    // Draw Speaker Sprite
    if (data.sprite) {
      if (this.portraitImages.has(data.sprite)) {
        const img = this.portraitImages.get(data.sprite);
        if (img && img.complete && img.naturalWidth > 0) {
          const fw = img.naturalWidth / 4;
          const fh = img.naturalHeight;
          ctx.drawImage(img, 2, 0, fw - 4, fh, 26, 28, 116, 126);
        }
      } else {
        const img = new Image();
        img.src = data.sprite;
        img.onload = () => {
          this.portraitImages.set(data.sprite, img);
          this.renderPatronDialogue();
        };
        this.portraitImages.set(data.sprite, null);
      }
    }

    // 3. Title & Header
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(data.name, 160, 48);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`📜 ${data.title.toUpperCase()}`, 160, 70);

    ctx.strokeStyle = 'rgba(243, 207, 101, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(160, 80);
    ctx.lineTo(cw - 24, 80);
    ctx.stroke();

    // 4. Current Page Content
    const pageIndex = Math.min(this.dialoguePage, data.pages.length - 1);
    const currentPage = data.pages[pageIndex] || { heading: '', text: '' };

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 17px Georgia, serif';
    ctx.fillText(currentPage.heading, 160, 108);

    // Word Wrap Description Text
    ctx.fillStyle = '#f8fafc';
    ctx.font = '14.5px sans-serif';
    this.wrapText(ctx, currentPage.text, 160, 135, cw - 184, 22);

    // 5. Bottom Navigation Controls & Buttons
    const totalPages = data.pages.length;
    const btnY = ch - 54;

    // [ ⬅️ PREV ]
    if (pageIndex > 0) {
      this.drawDialogBtn(ctx, 24, btnY, 110, 36, '⬅️ Prev', () => {
        this.dialoguePage = Math.max(0, this.dialoguePage - 1);
        this.renderPatronDialogue();
      }, false);
    }

    // Page Indicator Badge
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Page ${pageIndex + 1} / ${totalPages}`, cw / 2, btnY + 23);

    // [ NEXT ➡️ ]
    if (pageIndex < totalPages - 1) {
      this.drawDialogBtn(ctx, cw - 264, btnY, 110, 36, 'Next ➡️', () => {
        this.dialoguePage = Math.min(totalPages - 1, this.dialoguePage + 1);
        this.renderPatronDialogue();
      }, true);
    } else if (this.activePatronKey === 'bard') {
      this.drawDialogBtn(ctx, cw - 280, btnY, 130, 36, '⚔️ Party Build', () => {
        this.closePatronDialogue();
        if (this.onBardSelected) this.onBardSelected();
      }, true);
    }

    // [ ✖️ CLOSE ]
    this.drawDialogBtn(ctx, cw - 138, btnY, 114, 36, '✖️ Close', () => {
      this.closePatronDialogue();
    }, false);

    this.dialogueTexture.needsUpdate = true;
  }

  drawDialogBtn(ctx, x, y, w, h, label, action, isPrimary = false) {
    ctx.fillStyle = isPrimary ? '#f59e0b' : 'rgba(30, 41, 59, 0.9)';
    ctx.strokeStyle = isPrimary ? '#ffffff' : '#f3cf65';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isPrimary ? '#0f172a' : '#f3cf65';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + 23);

    this.dialogueButtons.push({ x, y, w, h, action });
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currY);
        line = words[n] + ' ';
        currY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currY);
  }

  handleDialogueClick(uv) {
    if (!uv || !this.dialogueGroup.visible) return false;

    // Convert UV coordinates (0..1) to Canvas pixels (680 x 380)
    const px = uv.x * 680;
    const py = (1 - uv.y) * 380;

    for (const btn of this.dialogueButtons) {
      if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
        btn.action();
        return true;
      }
    }
    return false;
  }

  initMountedTrophiesAndWeapons() {
    const shieldWood = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.85 });

    // 1. MOUNTED GREEN DRAGON HEAD TROPHY (Back Wall Left)
    const dragonPlaque = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.1), shieldWood);
    dragonPlaque.position.set(-4.5, 3.2, -6.9);
    this.tavernGroup.add(dragonPlaque);

    const dragonGroup = new THREE.Group();
    dragonGroup.position.set(-4.5, 3.2, -6.8);

    // Green Scaled Snout & Head
    const dragonMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const dHead = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 8), dragonMat);
    dHead.rotation.x = Math.PI / 2;
    dragonGroup.add(dHead);

    // Golden Horns
    for (let i = -1; i <= 1; i += 2) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 8), goldMat);
      horn.position.set(i * 0.22, 0.25, -0.15);
      horn.rotation.z = (i * Math.PI) / 4;
      dragonGroup.add(horn);
    }

    // Glowing Yellow Eyes
    for (let i = -1; i <= 1; i += 2) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      eye.position.set(i * 0.16, 0.12, 0.15);
      dragonGroup.add(eye);
    }
    this.tavernGroup.add(dragonGroup);

    // 2. MOUNTED DIRE WOLF TROPHY (Right Wall)
    const wolfPlaque = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 1.2), shieldWood);
    wolfPlaque.position.set(7.9, 3.2, -1.5);
    this.tavernGroup.add(wolfPlaque);

    const wolfGroup = new THREE.Group();
    wolfGroup.position.set(7.8, 3.2, -1.5);
    wolfGroup.rotation.y = -Math.PI / 2;

    const furMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const wolfSnout = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.65, 8), furMat);
    wolfSnout.rotation.x = Math.PI / 2;
    wolfGroup.add(wolfSnout);

    // Wolf Fangs
    for (let i = -1; i <= 1; i += 2) {
      const fang = new THREE.Mesh(
        new THREE.ConeGeometry(0.02, 0.08, 6),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc })
      );
      fang.position.set(i * 0.08, -0.06, 0.28);
      fang.rotation.x = Math.PI;
      wolfGroup.add(fang);
    }
    this.tavernGroup.add(wolfGroup);

    // 3. MOUNTED CROSSED WEAPONS & HEATER SHIELD (Back Wall Right)
    const wallShield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5 })
    );
    wallShield.rotation.x = Math.PI / 2;
    wallShield.position.set(4.5, 3.2, -6.9);
    this.tavernGroup.add(wallShield);

    for (let i = -1; i <= 1; i += 2) {
      const crossedSword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.02), steelMat);
      crossedSword.position.set(4.5, 3.2, -6.85);
      crossedSword.rotation.z = (i * Math.PI) / 4;
      this.tavernGroup.add(crossedSword);
    }

    // 4. STACKED ALE CASKS & BARRELS (Back Right Corner)
    const barrelWood = new THREE.MeshStandardMaterial({ color: 0x5c2b0e, roughness: 0.7 });
    for (let b = 0; b < 3; b++) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.9, 16), barrelWood);
      barrel.position.set(6.8 - b * 0.45, 0.45, -5.8);
      this.tavernGroup.add(barrel);

      const spigot = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12), goldMat);
      spigot.rotation.x = Math.PI / 2;
      spigot.position.set(6.8 - b * 0.45, 0.35, -5.35);
      this.tavernGroup.add(spigot);
    }
  }

  initExitDoor() {
    // Tavern Exit Door (Right Wall at x = 7.85)
    const doorGroup = new THREE.Group();
    doorGroup.position.set(7.85, 0, 0);
    doorGroup.rotation.y = -Math.PI / 2;

    const doorMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWoodPlankTexture(),
      roughness: 0.65
    });

    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.2, 0.18), doorMat);
    doorFrame.position.y = 1.6;
    doorFrame.userData = { isDoor: true, action: 'exitGame' };
    doorGroup.add(doorFrame);

    // Wrought Iron Straps & Handle
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const strapTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.22), ironMat);
    strapTop.position.set(0, 2.5, 0);
    strapTop.userData = { isDoor: true, action: 'exitGame' };
    doorGroup.add(strapTop);

    const strapBottom = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.22), ironMat);
    strapBottom.position.set(0, 0.7, 0);
    strapBottom.userData = { isDoor: true, action: 'exitGame' };
    doorGroup.add(strapBottom);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32), ironMat);
    handle.position.set(0.6, 1.5, 0.14);
    handle.userData = { isDoor: true, action: 'exitGame' };
    doorGroup.add(handle);

    // Golden Emissive Glowing Highlight Frame Outline (visible on hover / proximity)
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xf3cf65,
      wireframe: true,
      transparent: true,
      opacity: 0.0,
      visible: false
    });
    this.doorHighlightFrame = new THREE.Mesh(new THREE.BoxGeometry(1.88, 3.28, 0.24), highlightMat);
    this.doorHighlightFrame.position.y = 1.6;
    this.doorHighlightFrame.userData = { isDoor: true, action: 'exitGame' };
    doorGroup.add(this.doorHighlightFrame);

    // Glowing Sign Above Door: "🚪 EXIT TO SKARA BRAE"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 480;
    signCanvas.height = 100;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 480, 100);
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 468, 88);
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText("🚪 EXIT TO SKARA BRAE", 240, 42);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px monospace';
    ctx.fillText("Enter Garth's Shop / Streets", 240, 76);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.36),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    sign.position.set(0, 3.4, 0.12);
    sign.userData = { isDoor: true, action: 'exitGame' };
    doorGroup.add(sign);
    this.doorSignMesh = sign;

    // Precise Doorway Trigger Collider matching door frame
    const doorCollider = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 3.2, 0.3),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    doorCollider.position.y = 1.6;
    doorCollider.userData = { isDoor: true, action: 'exitGame' };
    doorCollider.layers.set(COLLISION_LAYER.INTERACTABLES);
    doorGroup.add(doorCollider);

    doorGroup.userData = { isDoor: true, action: 'exitGame' };
    this.exitDoorMesh = doorGroup;
    this.doorCollider = doorCollider;
    this.tavernGroup.add(doorGroup);
    this.interactableObjects.push(doorCollider, doorFrame, strapTop, strapBottom, handle, sign, doorGroup);
  }

  setDoorHighlighted(isHighlighted) {
    this.isDoorHighlighted = !!isHighlighted;
    if (this.doorHighlightFrame) {
      this.doorHighlightFrame.visible = this.isDoorHighlighted;
      this.doorHighlightFrame.material.opacity = this.isDoorHighlighted ? 0.95 : 0.0;
    }
    if (this.doorSignMesh) {
      this.doorSignMesh.scale.setScalar(this.isDoorHighlighted ? 1.06 : 1.0);
    }
  }

  checkDoorProximity(worldPos, maxDistance = 2.5) {
    if (!worldPos) return false;
    const doorX = 7.85;
    const doorZ = 0.0;
    const dist = Math.hypot(worldPos.x - doorX, worldPos.z - doorZ);
    return dist <= maxDistance;
  }

  initFireplace() {
    // Grand Stone Hearth on Left Wall
    const fireplace = new THREE.Group();
    fireplace.position.set(-7.8, 0, -2.0);
    fireplace.rotation.y = Math.PI / 2;

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.95 });

    // Mantle & Chimney Stack
    const mantle = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.8, 1.0), stoneMat);
    mantle.position.y = 1.4;
    fireplace.add(mantle);

    // Firebox Cavity
    const cavity = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.4, 0.7),
      new THREE.MeshBasicMaterial({ color: 0x0a0a0a })
    );
    cavity.position.set(0, 0.7, 0.2);
    fireplace.add(cavity);

    // Burning Oak Logs
    const logMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    for (let l = 0; l < 3; l++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8), logMat);
      log.rotation.z = Math.PI / 2 + (l - 1) * 0.2;
      log.position.set(0, 0.2 + l * 0.08, 0.25);
      fireplace.add(log);
    }

    // Glowing Volumetric Flame Core
    const fireCore = TorchFlameShader.createFlameMesh('fire');
    fireCore.scale.set(2.4, 2.8, 2.4);
    fireCore.position.set(0, 0.35, 0.25);
    fireplace.add(fireCore);
    this.flameMeshes.push(fireCore);

    // Fireplace Point Light — the second and final hero PointLight.
    // Kept because the fireplace is the primary anchor of the left-wall atmosphere;
    // its flicker (via heroLights in update()) drives the entire room's perceived warmth.
    const fireLight = new THREE.PointLight(0xff5500, 4.5, 12);
    fireLight.position.set(0, 0.6, 0.6);
    fireplace.add(fireLight);
    this.heroLights.push({ light: fireLight, baseIntensity: 4.5, phase: 2.7 });

    this.tavernGroup.add(fireplace);
  }

  initFloatingSpeechBubble() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    this.speechCanvasCtx = canvas.getContext('2d');
    this.speechTexture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.MeshBasicMaterial({
      map: this.speechTexture,
      transparent: true,
      depthTest: false
    });

    this.speechBubbleMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), mat);
    this.speechBubbleMesh.position.set(1.4, 2.3, -4.8);
    this.tavernGroup.add(this.speechBubbleMesh);

    this.updateLyricText("🎵 The Evil in Skara Brae");
  }

  updateLyricText(text) {
    if (!this.speechCanvasCtx || !this.speechTexture) return;

    const ctx = this.speechCanvasCtx;
    ctx.clearRect(0, 0, 512, 128);

    if (text) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#f3cf65';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(10, 10, 492, 108, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f3cf65';
      ctx.font = 'bold 24px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, 256, 70);
    }

    this.speechTexture.needsUpdate = true;
  }

  drinkMug(mugGroup, onToast) {
    if (!mugGroup) return;

    // Trigger drink animation
    mugGroup.userData.isDrinking = true;
    mugGroup.position.y += 0.08;
    mugGroup.rotation.x = -Math.PI / 6;

    if (onToast) {
      onToast("🍺 *Glug glug glug* A refreshing pint of Skara Brae Dark Ale!");
    }

    setTimeout(() => {
      mugGroup.rotation.x = 0;
      mugGroup.position.y -= 0.08;
      mugGroup.userData.isDrinking = false;
    }, 1200);
  }

  initEntranceTransition() {
    // Dimensional Golden Rift / Ripple Entrance Effect at spawn point (x = 0, y = 1.18, z = 1.2)
    const riftGroup = new THREE.Group();
    riftGroup.position.set(0, 1.18, 0.4);

    for (let r = 0; r < 4; r++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: r % 2 === 0 ? 0xf3cf65 : 0xa855f7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending
      });

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.08 + r * 0.12, 0.14 + r * 0.12, 32),
        ringMat
      );
      ring.name = `riftRing_${r}`;
      riftGroup.add(ring);
    }

    this.riftEffectGroup = riftGroup;
    this.riftEffectGroup.visible = false;
    this.tavernGroup.add(riftGroup);
  }

  playEntranceTransition() {
    if (!this.riftEffectGroup) return;
    this.riftEffectGroup.visible = true;
    this.riftTransitionTime = 0.0;
    this.isRiftActive = true;
  }

  update(time, deltaTime = 0.016) {
    if (!this.tavernGroup.visible) return;

    // 0. Update Animated Sprite Billboards & Badges
    if (this.animatedUpdaters && this.animatedUpdaters.length > 0) {
      this.animatedUpdaters.forEach(updater => updater(time));
    }

    // 1. Update Volumetric Torch, Chandelier & Candle Flame Shaders
    this.flameMeshes.forEach(f => {
      if (f && f.update) {
        f.update(time);
      }
    });

    // 2. Hero Light Flicker — only 2 real-time PointLights remain in the scene
    //    (chandelier + fireplace).  Each uses an independent phase offset so they
    //    flicker differently, preserving the illusion of many independent sources.
    //    ⚡ This replaces the old loop that updated 12 lights every frame.
    if (this.heroLights) {
      for (const h of this.heroLights) {
        h.light.intensity = h.baseIntensity
          + Math.sin(time * 12.0 + h.phase) * 0.45
          + Math.cos(time *  8.0 + h.phase * 0.5) * 0.25;
      }
    }

    // 3. Rising Smoke Particles
    this.smokeParticles.forEach(p => {
      p.mesh.position.y += 0.005 * p.speed;
      if (p.mesh.position.y > p.baseY + 1.2) {
        p.mesh.position.y = p.baseY;
      }
    });

    // 4. Sloshing Ale Liquid Surfaces
    this.aleMugs.forEach((m, idx) => {
      const surface = m.getObjectByName('aleSurface');
      if (surface) {
        surface.rotation.z = Math.sin(time * 4 + idx) * 0.08;
      }
    });

    // 5. Bard Strumming Arm Animation during Performance
    if (this.bardMesh) {
      const strumArm = this.bardMesh.getObjectByName('strummingArm');
      if (strumArm) {
        strumArm.rotation.z = 0.6 + Math.sin(time * 6) * 0.12;
      }
    }

    // 6. Speech Bubble Gentle Float
    if (this.speechBubbleMesh) {
      this.speechBubbleMesh.position.y = 2.3 + Math.sin(time * 2) * 0.06;
    }

    // 7. Dimensional Golden Rift Entrance Dissolve Animation
    if (this.isRiftActive && this.riftEffectGroup) {
      this.riftTransitionTime = (this.riftTransitionTime || 0) + (deltaTime || 0.016);
      const duration = 1.4;
      const progress = Math.min(1.0, this.riftTransitionTime / duration);

      this.riftEffectGroup.children.forEach((ring, idx) => {
        const ringProgress = Math.max(0, Math.min(1.0, progress * 1.4 - idx * 0.15));
        const scale = 1.0 + ringProgress * (3.8 + idx * 0.9);
        ring.scale.set(scale, scale, 1.0);
        ring.material.opacity = (1.0 - ringProgress) * 0.95;
      });

      if (progress >= 1.0) {
        this.isRiftActive = false;
        this.riftEffectGroup.visible = false;
      }
    }
  }

  setVisible(visible) {
    this.tavernGroup.visible = visible;
  }
}
