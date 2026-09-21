import * as THREE from 'three';
import { TextureGenerator } from '../../textures/TextureGenerator.js';
import { GARTH_STANDARD_ITEMS, canClassUseItem, ItemCategory, autoEquipParty } from '../../data/ItemDatabase.js';
import { TorchFlameShader } from '../../shaders/TorchFlameShader.js';
import { AnimatedSpriteManager } from '../../textures/AnimatedSprite.js';

export class GarthsShop {
  constructor(scene, camera, onExitToSkaraBrae, party, onOpenCharacterCards) {
    this.scene = scene;
    this.camera = camera;
    this.onExitToSkaraBrae = onExitToSkaraBrae;
    this.onOpenCharacterCards = onOpenCharacterCards;

    this.spriteManager = new AnimatedSpriteManager();
    this.animatedUpdaters = [];

    this.shopGroup = new THREE.Group();
    this.shopGroup.name = 'GarthsShop';
    this.shopGroup.visible = false;

    this.party = party || [];

    this.interactableObjects = [];
    this.torches = [];
    this.flameMeshes = [];
    this.weaponBadges = [];
    this.weapons = [];
    this.weaponTrails = [];
    this.garthGroup = null;

    this.initShopEnvironment();
    this.initLightingAndTorches();
    this.initGarthAndCounter();
    this.initPhysicalWeapons();
    this.initQuickEquipAndLedger();
    this.initExitDoor();

    this.scene.add(this.shopGroup);
  }

  initShopEnvironment() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createStoneWallTexture(),
      roughness: 0.8
    });

    const woodPlankTex = TextureGenerator.createWornTavernPlankTexture();
    woodPlankTex.repeat.set(3, 3);
    const woodMat = new THREE.MeshStandardMaterial({
      map: woodPlankTex,
      roughness: 0.6
    });

    // Floor (10m x 10m)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), woodMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.shopGroup.add(floor);

    // Ceiling (10m x 10m at y = 4m)
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), woodMat);
    ceiling.position.y = 4.0;
    ceiling.rotation.x = Math.PI / 2;
    this.shopGroup.add(ceiling);

    // Walls
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMat);
    backWall.position.set(0, 2, -5);
    this.shopGroup.add(backWall);

    // Authentic C64 Garth Shoppe Feature Artwork Backdrop
    const garthArtTex = TextureGenerator.createAuthenticGarthShopBackdrop();
    const garthArtMat = new THREE.MeshBasicMaterial({ map: garthArtTex });
    const garthArtMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.0), garthArtMat);
    garthArtMesh.position.set(0, 2.0, -4.95);
    this.shopGroup.add(garthArtMesh);

    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMat);
    frontWall.position.set(0, 2, 5);
    frontWall.rotation.y = Math.PI;
    this.shopGroup.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMat);
    leftWall.position.set(-5, 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.shopGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMat);
    rightWall.position.set(5, 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.shopGroup.add(rightWall);

    // Timber Support Beams
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x3e2312, roughness: 0.7 });
    const beamPositions = [-4.8, 0, 4.8];
    beamPositions.forEach(x => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.0, 0.3), beamMat);
      beam.position.set(x, 2.0, -4.8);
      this.shopGroup.add(beam);
    });

    // Medieval Red & Gold Velvet Rug in front of Counter
    const rugCanvas = document.createElement('canvas');
    rugCanvas.width = 256;
    rugCanvas.height = 256;
    const rCtx = rugCanvas.getContext('2d');
    rCtx.fillStyle = '#7f1d1d'; // Crimson
    rCtx.fillRect(0, 0, 256, 256);
    rCtx.strokeStyle = '#f3cf65';
    rCtx.lineWidth = 12;
    rCtx.strokeRect(10, 10, 236, 236);
    rCtx.fillStyle = '#991b1b';
    rCtx.fillRect(24, 24, 208, 208);
    rCtx.fillStyle = '#f3cf65';
    rCtx.font = 'bold 36px serif';
    rCtx.textAlign = 'center';
    rCtx.fillText('⚔️ 🛡️ ⚔️', 128, 140);

    const rugTex = new THREE.CanvasTexture(rugCanvas);
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(4.0, 2.4),
      new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.85 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.01, -0.9);
    this.shopGroup.add(rug);
  }

  initLightingAndTorches() {
    // 1. Warm Ambient Lighting (Bright and clear)
    const ambient = new THREE.AmbientLight(0xffedd5, 1.4);
    this.shopGroup.add(ambient);

    // 2. Directional Ceiling Light focused on Counter
    const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.0);
    dirLight.position.set(0, 3.8, 0);
    this.shopGroup.add(dirLight);

    // 3. Counter Overhead Lantern
    const counterLanternLight = new THREE.PointLight(0xfde68a, 3.2, 7.5);
    counterLanternLight.position.set(0, 2.5, -2.0);
    this.shopGroup.add(counterLanternLight);

    const lanternHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.28, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.8 })
    );
    lanternHousing.position.set(0, 2.6, -2.0);
    this.shopGroup.add(lanternHousing);

    // 4. Wall Sconces & Torches
    const torchConfigs = [
      { pos: [-4.8, 2.2, -2.2], rotY: Math.PI / 2 },
      { pos: [4.8, 2.2, -2.2], rotY: -Math.PI / 2 },
      { pos: [-4.8, 2.2, 2.0], rotY: Math.PI / 2 },
      { pos: [4.8, 2.2, 2.0], rotY: -Math.PI / 2 },
      { pos: [1.2, 2.2, 4.8], rotY: Math.PI } // Near exit door
    ];

    torchConfigs.forEach(cfg => {
      const torchGroup = new THREE.Group();
      torchGroup.position.set(...cfg.pos);
      torchGroup.rotation.y = cfg.rotY;

      // Iron Sconce Holder
      const bracket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.35),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
      );
      bracket.rotation.z = -Math.PI / 6;
      torchGroup.add(bracket);

      // Flame Emitter Mesh with TorchFlameShader
      const flame = TorchFlameShader.createFlameMesh('fire');
      flame.scale.set(0.9, 0.95, 0.9);
      flame.position.set(0.08, 0.2, 0);
      torchGroup.add(flame);
      this.flameMeshes.push(flame);

      // Warm Point Light
      const light = new THREE.PointLight(0xf59e0b, 2.6, 8.0);
      light.position.set(0.08, 0.22, 0);
      torchGroup.add(light);

      this.torches.push({ flame, light, baseIntensity: 2.6 });
      this.shopGroup.add(torchGroup);
    });
  }

  initGarthAndCounter() {
    // Garth's Polished Wooden Counter
    const counterMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWornTavernPlankTexture(),
      roughness: 0.4
    });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.95, 0.9), counterMat);
    counter.position.set(0, 0.475, -2.2);
    this.shopGroup.add(counter);

    // 1985 Classic Animated Garth Sprite Billboard Behind Counter
    this.garthGroup = new THREE.Group();
    this.garthGroup.position.set(0, 0.45, -3.1);
    this.garthGroup.userData = { isGarthNPC: true, isGarth: true, name: "Garth" };

    // Interactive Hitbox for Garth
    const garthHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.2, 1.0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    garthHitbox.position.set(0, 0.95, 0);
    garthHitbox.userData = { isGarthNPC: true, isGarth: true, name: "Garth" };
    this.garthGroup.add(garthHitbox);

    (async () => {
      try {
        const animated = await this.spriteManager.createAnimatedBillboard('/assets/sprites/bt1_56.png', 4);
        animated.mesh.position.set(0, 0.95, 0);
        animated.mesh.scale.set(1.05, 1.05, 1.05);
        animated.mesh.userData = { isGarthNPC: true, isGarth: true, name: "Garth" };
        this.garthGroup.add(animated.mesh);
        this.animatedUpdaters.push(animated.update);
      } catch (e) {
        console.warn('Failed to load Garth sprite:', e);
      }
    })();

    this.shopGroup.add(this.garthGroup);
    this.interactableObjects.push(garthHitbox, this.garthGroup);

    // Wall Weapon Display Racks Behind Garth
    const rackWood = new THREE.MeshStandardMaterial({ color: 0x2e1809, roughness: 0.6 });
    const rack1 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 0.15), rackWood);
    rack1.position.set(0, 2.2, -4.9);
    this.shopGroup.add(rack1);

    const rack2 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 0.15), rackWood);
    rack2.position.set(0, 1.4, -4.9);
    this.shopGroup.add(rack2);

    // Crossed Display Swords on Wall
    for (let i = -1; i <= 1; i += 2) {
      const swordBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 1.2, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 })
      );
      swordBlade.position.set(0, 2.2, -4.85);
      swordBlade.rotation.z = i * Math.PI / 4;
      this.shopGroup.add(swordBlade);
    }

    // Large Golden Shop Banner: "⚔️ GARTH'S WEAPONS & WONDERS 🛡️"
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 640;
    bannerCanvas.height = 140;
    const ctx = bannerCanvas.getContext('2d');
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 0, 640, 140);
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 624, 124);
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText("⚔️ GARTH'S WEAPONS & WONDERS 🛡️", 320, 60);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText("Finest Arms & Armor in Skara Brae • Tap / [A] to Equip", 320, 100);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 0.85),
      new THREE.MeshBasicMaterial({ map: bannerTex })
    );
    banner.position.set(0, 3.2, -4.85);
    this.shopGroup.add(banner);
  }

  initPhysicalWeapons() {
    // 3D Modeled Weapons on Garth's Counter
    const weaponItems = [
      { name: 'Broadsword', category: ItemCategory.WEAPON, damage: 8, bonus: '+8 DMG', modelType: 'SWORD' },
      { name: 'Battleaxe', category: ItemCategory.WEAPON, damage: 10, bonus: '+10 DMG', modelType: 'AXE' },
      { name: 'Iron Shield', category: ItemCategory.SHIELD, acBonus: 2, bonus: '+2 AC', modelType: 'SHIELD' },
      { name: 'Oak Staff', category: ItemCategory.WEAPON, damage: 4, bonus: '+4 DMG (Mages)', modelType: 'STAFF' },
      { name: 'Warhammer', category: ItemCategory.WEAPON, damage: 9, bonus: '+9 DMG', modelType: 'HAMMER' },
      { name: 'Dagger', category: ItemCategory.WEAPON, damage: 5, bonus: '+5 DMG (Rogues)', modelType: 'DAGGER' }
    ];

    const startX = -1.35;
    const spacing = 0.54;

    weaponItems.forEach((item, index) => {
      const weaponGroup = new THREE.Group();
      const xPos = startX + index * spacing;
      weaponGroup.position.set(xPos, 0.98, -2.15);

      // Construct detailed 3D model per weapon type
      if (item.modelType === 'SWORD') {
        // Broadsword
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.015, 0.6),
          new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.2 })
        );
        blade.position.set(0, 0.02, 0);
        weaponGroup.add(blade);

        const guard = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.02, 0.03),
          new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.3 })
        );
        guard.position.set(0, 0.02, 0.28);
        weaponGroup.add(guard);

        const grip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.018, 0.16),
          new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
        );
        grip.rotation.x = Math.PI / 2;
        grip.position.set(0, 0.02, 0.37);
        weaponGroup.add(grip);

        const pommel = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 })
        );
        pommel.position.set(0, 0.02, 0.46);
        weaponGroup.add(pommel);
      } else if (item.modelType === 'AXE') {
        // Battleaxe
        const haft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.65),
          new THREE.MeshStandardMaterial({ color: 0x5c2b0e, roughness: 0.7 })
        );
        haft.rotation.x = Math.PI / 2;
        haft.position.set(0, 0.02, 0.1);
        weaponGroup.add(haft);

        const bladeL = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.015, 0.18),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 })
        );
        bladeL.position.set(-0.08, 0.02, -0.16);
        weaponGroup.add(bladeL);

        const bladeR = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.015, 0.18),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 })
        );
        bladeR.position.set(0.08, 0.02, -0.16);
        weaponGroup.add(bladeR);
      } else if (item.modelType === 'SHIELD') {
        // Iron Heater Shield
        const shieldBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.03, 16),
          new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 })
        );
        shieldBody.rotation.x = Math.PI / 2;
        shieldBody.position.set(0, 0.03, 0);
        weaponGroup.add(shieldBody);

        const rim = new THREE.Mesh(
          new THREE.RingGeometry(0.17, 0.2, 16),
          new THREE.MeshStandardMaterial({ color: 0xf3cf65, side: THREE.DoubleSide, metalness: 0.8 })
        );
        rim.rotation.x = -Math.PI / 2;
        rim.position.set(0, 0.05, 0);
        weaponGroup.add(rim);

        const boss = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.9 })
        );
        boss.position.set(0, 0.05, 0);
        weaponGroup.add(boss);
      } else if (item.modelType === 'STAFF') {
        // Oak Staff with Glowing Crystal
        const staffHaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.018, 0.75),
          new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
        );
        staffHaft.rotation.x = Math.PI / 2;
        staffHaft.position.set(0, 0.02, 0.1);
        weaponGroup.add(staffHaft);

        const crystal = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.05),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.8, roughness: 0.1 })
        );
        crystal.position.set(0, 0.04, -0.28);
        weaponGroup.add(crystal);

        const crystalLight = new THREE.PointLight(0x38bdf8, 1.2, 2.0);
        crystalLight.position.set(0, 0.06, -0.28);
        weaponGroup.add(crystalLight);
      } else if (item.modelType === 'HAMMER') {
        // Warhammer
        const hammerShaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.55),
          new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 })
        );
        hammerShaft.rotation.x = Math.PI / 2;
        hammerShaft.position.set(0, 0.02, 0.1);
        weaponGroup.add(hammerShaft);

        const hammerHead = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.1, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 })
        );
        hammerHead.position.set(0, 0.03, -0.16);
        weaponGroup.add(hammerHead);
      } else {
        // Dagger
        const daggerBlade = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.01, 0.3),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.9, roughness: 0.1 })
        );
        daggerBlade.position.set(0, 0.015, -0.05);
        weaponGroup.add(daggerBlade);

        const daggerGuard = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.015, 0.02),
          new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.8 })
        );
        daggerGuard.position.set(0, 0.015, 0.1);
        weaponGroup.add(daggerGuard);

        const daggerGrip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.014, 0.014, 0.1),
          new THREE.MeshStandardMaterial({ color: 0x1e293b })
        );
        daggerGrip.rotation.x = Math.PI / 2;
        daggerGrip.position.set(0, 0.015, 0.16);
        weaponGroup.add(daggerGrip);
      }

      // Golden Pulsing Base Ring
      const baseRing = new THREE.Mesh(
        new THREE.RingGeometry(0.16, 0.19, 24),
        new THREE.MeshBasicMaterial({ color: 0xf3cf65, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
      );
      baseRing.rotation.x = -Math.PI / 2;
      baseRing.position.set(0, 0.01, 0);
      baseRing.name = 'baseRing';
      weaponGroup.add(baseRing);

      // Floating 3D Weapon Badge
      const badgeCanvas = document.createElement('canvas');
      badgeCanvas.width = 300;
      badgeCanvas.height = 80;
      const bCtx = badgeCanvas.getContext('2d');
      bCtx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      bCtx.strokeStyle = '#f3cf65';
      bCtx.lineWidth = 4;
      bCtx.beginPath();
      bCtx.roundRect(4, 4, 292, 72, 10);
      bCtx.fill();
      bCtx.stroke();

      bCtx.fillStyle = '#f3cf65';
      bCtx.font = 'bold 20px Georgia, serif';
      bCtx.textAlign = 'center';
      bCtx.fillText(item.name, 150, 34);

      bCtx.fillStyle = '#38bdf8';
      bCtx.font = 'bold 16px monospace';
      bCtx.fillText(`${item.bonus} • [A] Equip`, 150, 62);

      const badgeTex = new THREE.CanvasTexture(badgeCanvas);
      const badgeMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32, 0.085),
        new THREE.MeshBasicMaterial({ map: badgeTex, transparent: true })
      );
      badgeMesh.position.set(0, 0.28, 0);
      badgeMesh.name = 'badgeMesh';
      weaponGroup.add(badgeMesh);
      this.weaponBadges.push(badgeMesh);

      // Invisible Enriched Hit Box for Easy Reticle & Click Intersection
      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.45, 0.7),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitBox.position.set(0, 0.1, 0);
      weaponGroup.add(hitBox);

      const weaponRecord = {
        group: weaponGroup,
        baseRing: baseRing,
        badgeMesh: badgeMesh,
        hitBox: hitBox,
        initialPos: weaponGroup.position.clone(),
        initialRot: weaponGroup.rotation.clone(),
        itemData: item,
        name: item.name,
        isGrabbed: false,
        heldBy: null,
        heldIndex: null,
        lastPos: new THREE.Vector3(),
        lastSwingTime: 0,
        swingProgress: 0,
        isSwinging: false
      };

      weaponGroup.userData = {
        isWeapon: true,
        itemData: item,
        name: item.name,
        weaponRecord: weaponRecord
      };
      hitBox.userData = weaponGroup.userData;

      this.weapons.push(weaponRecord);
      this.shopGroup.add(weaponGroup);
      this.interactableObjects.push(hitBox, weaponGroup);
    });
  }

  initQuickEquipAndLedger() {
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.85, roughness: 0.2 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });

    // 1. AUTO-EQUIP ENTIRE PARTY 3D STATION (Left Counter)
    const equipGroup = new THREE.Group();
    equipGroup.position.set(-1.6, 0.95, -2.15);

    // Golden Anvil
    const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.18), goldMat);
    anvilBase.position.y = 0.05;
    equipGroup.add(anvilBase);

    const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.14), goldMat);
    anvilTop.position.set(0.04, 0.13, 0);
    equipGroup.add(anvilTop);

    // Mini Shield on Anvil
    const shield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 })
    );
    shield.rotation.x = Math.PI / 2;
    shield.position.set(0, 0.18, 0.05);
    equipGroup.add(shield);

    // Golden Pulsing Base Ring
    const ring1 = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.22, 24),
      new THREE.MeshBasicMaterial({ color: 0xf3cf65, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.01;
    equipGroup.add(ring1);

    // Floating 3D Badge: "🛡️ [A] Auto-Equip Entire Party"
    const equipBadgeCanvas = document.createElement('canvas');
    equipBadgeCanvas.width = 380;
    equipBadgeCanvas.height = 80;
    const ebCtx = equipBadgeCanvas.getContext('2d');
    ebCtx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ebCtx.strokeStyle = '#f3cf65';
    ebCtx.lineWidth = 5;
    ebCtx.beginPath();
    ebCtx.roundRect(4, 4, 372, 72, 10);
    ebCtx.fill();
    ebCtx.stroke();
    ebCtx.fillStyle = '#f3cf65';
    ebCtx.font = 'bold 22px Georgia, serif';
    ebCtx.textAlign = 'center';
    ebCtx.fillText("🛡️ Auto-Equip Party", 190, 36);
    ebCtx.fillStyle = '#38bdf8';
    ebCtx.font = 'bold 16px monospace';
    ebCtx.fillText("Press [A] for Full Kit", 190, 64);

    const equipBadgeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.09),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(equipBadgeCanvas), transparent: true })
    );
    equipBadgeMesh.position.set(0, 0.32, 0);
    equipGroup.add(equipBadgeMesh);
    this.weaponBadges.push(equipBadgeMesh);

    // Hitbox for Auto-Equip Station
    const hitBox1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox1.position.y = 0.15;
    equipGroup.add(hitBox1);

    equipGroup.userData = { isAutoEquipParty: true };
    this.shopGroup.add(equipGroup);
    this.interactableObjects.push(hitBox1, equipGroup);

    // 2. CHARACTER CARDS & INVENTORY 3D LEDGER (Right Counter)
    const ledgerGroup = new THREE.Group();
    ledgerGroup.position.set(1.6, 0.95, -2.15);

    // Open Leather Grimoire / Ledger Book
    const bookCover = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.26), leatherMat);
    bookCover.position.y = 0.015;
    ledgerGroup.add(bookCover);

    const bookPages = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.02, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.9 })
    );
    bookPages.position.y = 0.035;
    ledgerGroup.add(bookPages);

    // Inkpot & Feather Quill
    const inkpot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 0.06, 12),
      ironMat
    );
    inkpot.position.set(0.18, 0.04, -0.08);
    ledgerGroup.add(inkpot);

    const quill = new THREE.Mesh(
      new THREE.ConeGeometry(0.015, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc })
    );
    quill.position.set(0.18, 0.12, -0.08);
    quill.rotation.z = Math.PI / 6;
    ledgerGroup.add(quill);

    // Golden Pulsing Base Ring
    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.22, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.01;
    ledgerGroup.add(ring2);

    // Floating 3D Badge: "📜 [A] Character Cards & Inventory"
    const cardsBadgeCanvas = document.createElement('canvas');
    cardsBadgeCanvas.width = 380;
    cardsBadgeCanvas.height = 80;
    const cbCtx = cardsBadgeCanvas.getContext('2d');
    cbCtx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    cbCtx.strokeStyle = '#38bdf8';
    cbCtx.lineWidth = 5;
    cbCtx.beginPath();
    cbCtx.roundRect(4, 4, 372, 72, 10);
    cbCtx.fill();
    cbCtx.stroke();
    cbCtx.fillStyle = '#38bdf8';
    cbCtx.font = 'bold 22px Georgia, serif';
    cbCtx.textAlign = 'center';
    cbCtx.fillText("📜 Character Cards", 190, 36);
    cbCtx.fillStyle = '#f3cf65';
    cbCtx.font = 'bold 16px monospace';
    cbCtx.fillText("Press [A] for Inventory", 190, 64);

    const cardsBadgeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.09),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cardsBadgeCanvas), transparent: true })
    );
    cardsBadgeMesh.position.set(0, 0.32, 0);
    ledgerGroup.add(cardsBadgeMesh);
    this.weaponBadges.push(cardsBadgeMesh);

    // Hitbox for Ledger
    const hitBox2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox2.position.y = 0.15;
    ledgerGroup.add(hitBox2);

    ledgerGroup.userData = { isCharacterCards: true };
    this.shopGroup.add(ledgerGroup);
    this.interactableObjects.push(hitBox2, ledgerGroup);
  }

  autoEquipEntireParty(showToast) {
    if (this.party && this.party.length > 0) {
      autoEquipParty(this.party);
      if (showToast) {
        showToast("🛡️ Garth has outfitted your entire party with mid-grade arms, armor & torches!");
      }
    } else {
      if (showToast) {
        showToast("⚠️ No party members found! Assemble your heroes at the Tavern first.");
      }
    }
  }

  initExitDoor() {
    // Door to Skara Brae Streets / Combat
    const doorMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWoodPlankTexture(),
      roughness: 0.6
    });

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.0, 0.15), doorMat);
    door.position.set(0, 1.5, 4.85);

    // Iron Door Handle & Straps
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const strapTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.18), ironMat);
    strapTop.position.set(0, 2.4, 4.86);
    this.shopGroup.add(strapTop);

    const strapBottom = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.18), ironMat);
    strapBottom.position.set(0, 0.6, 4.86);
    this.shopGroup.add(strapBottom);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3), ironMat);
    handle.position.set(0.6, 1.4, 4.75);
    this.shopGroup.add(handle);

    // Glowing Sign: "🏰 EXIT TO SKARA BRAE STREETS"
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
    ctx.font = 'bold 24px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText("🏰 EXIT TO SKARA BRAE", 240, 42);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px monospace';
    ctx.fillText("Press [A] or Click Door to Exit", 240, 76);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.38),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) })
    );
    sign.position.set(0, 3.3, 4.75);
    this.shopGroup.add(sign);

    door.userData = { isExitDoor: true };
    this.shopGroup.add(door);
    this.interactableObjects.push(door);
  }

  equipItem(itemInput, showToast) {
    if (!itemInput) return;
    const itemData = typeof itemInput === 'string'
      ? (GARTH_STANDARD_ITEMS.find(i => i.name === itemInput) || { name: itemInput, category: ItemCategory.WEAPON, damage: 8, usableBy: ['Paladin', 'Warrior', 'Hunter', 'Monk', 'Bard', 'Rogue'] })
      : itemInput;

    if (this.party && this.party.length > 0) {
      const hero = this.party[0];

      if (!canClassUseItem(hero.class, itemData)) {
        if (showToast) {
          showToast(`❌ ${hero.name} (${hero.class}) cannot equip ${itemData.name}!`);
        }
        return;
      }

      if (!hero.equipped) {
        hero.equipped = {};
      }

      let slot = 'weapon';
      let bonusText = '';

      if (itemData.category === ItemCategory.WEAPON) {
        slot = 'weapon';
        bonusText = `(+${itemData.damage} DMG)`;
      } else if (itemData.category === ItemCategory.SHIELD) {
        slot = 'shield';
        bonusText = `(${itemData.acBonus} AC)`;
      } else if (itemData.category === ItemCategory.ARMOR) {
        slot = 'armor';
        bonusText = `(${itemData.acBonus} AC)`;
      } else if (itemData.category === ItemCategory.HELM) {
        slot = 'helm';
        bonusText = `(${itemData.acBonus} AC)`;
      } else if (itemData.category === ItemCategory.GLOVES) {
        slot = 'gloves';
        bonusText = `(${itemData.acBonus} AC)`;
      } else if (itemData.category === ItemCategory.INSTRUMENT) {
        slot = 'instrument';
      }

      hero.equipped[slot] = itemData;

      if (slot === 'weapon') {
        hero.weapon = itemData.name;
      }

      if (showToast) {
        showToast(`⚔️ Equipped ${itemData.name} ${bonusText} onto ${hero.name} (${hero.class})!`);
      }
    }
  }

  /**
   * Grab and hold a physical 3D weapon in hand (VR controller or Desktop first-person view).
   */
  grabWeapon(weaponTarget, holder, holderIndex, synth = null, xrManager = null) {
    const weaponRecord = weaponTarget?.userData?.weaponRecord || 
      (weaponTarget?.group ? weaponTarget : this.weapons.find(w => w.group === weaponTarget || w.hitBox === weaponTarget));
    if (!weaponRecord) return null;

    // If weapon is already held, release from previous holder first
    if (weaponRecord.isGrabbed && weaponRecord.heldBy) {
      this.releaseWeapon(weaponRecord, synth, xrManager);
    }

    // Release any other weapon currently held by this exact holder
    const previouslyHeld = this.getHeldWeapon(holderIndex);
    if (previouslyHeld && previouslyHeld !== weaponRecord) {
      this.releaseWeapon(previouslyHeld, synth, xrManager);
    }

    weaponRecord.isGrabbed = true;
    weaponRecord.heldBy = holder;
    weaponRecord.heldIndex = holderIndex;
    weaponRecord.isSwinging = false;
    weaponRecord.swingProgress = 0;

    if (weaponRecord.badgeMesh) weaponRecord.badgeMesh.visible = false;
    if (weaponRecord.baseRing) weaponRecord.baseRing.visible = false;

    holder.add(weaponRecord.group);

    if (holderIndex === 'desktop') {
      // First-person held weapon view in bottom-right of player viewport
      weaponRecord.group.position.set(0.26, -0.22, -0.45);
      weaponRecord.group.rotation.set(Math.PI / 4, -Math.PI / 6, Math.PI / 8);
    } else {
      // Natural grip orientation for VR 6DOF controller
      if (weaponRecord.itemData.modelType === 'SHIELD') {
        weaponRecord.group.position.set(0, 0, -0.1);
        weaponRecord.group.rotation.set(0, 0, 0);
      } else {
        weaponRecord.group.position.set(0, -0.04, -0.16);
        weaponRecord.group.rotation.set(Math.PI / 3, 0, 0);
      }
    }

    weaponRecord.group.getWorldPosition(weaponRecord.lastPos);

    if (synth && synth.playSwordDraw) {
      synth.playSwordDraw();
    }
    if (xrManager && typeof holderIndex === 'number') {
      xrManager.triggerHaptics(holderIndex, 0.8, 80);
    }

    return weaponRecord;
  }

  /**
   * Release and return weapon to its display pedestal on the counter.
   */
  releaseWeapon(weaponTarget, synth = null, xrManager = null) {
    const weaponRecord = weaponTarget?.userData?.weaponRecord || 
      (weaponTarget?.group ? weaponTarget : this.weapons.find(w => w.group === weaponTarget || w.hitBox === weaponTarget));
    if (!weaponRecord || !weaponRecord.isGrabbed) return;

    this.shopGroup.add(weaponRecord.group);
    weaponRecord.group.position.copy(weaponRecord.initialPos);
    weaponRecord.group.rotation.copy(weaponRecord.initialRot);

    if (weaponRecord.badgeMesh) weaponRecord.badgeMesh.visible = true;
    if (weaponRecord.baseRing) weaponRecord.baseRing.visible = true;

    weaponRecord.isGrabbed = false;
    weaponRecord.heldBy = null;
    weaponRecord.heldIndex = null;
    weaponRecord.isSwinging = false;
    weaponRecord.swingProgress = 0;

    if (synth && synth.playSwordSwing) {
      synth.playSwordSwing(1.3);
    }
  }

  /**
   * Get weapon currently held by holderIndex (0, 1, or 'desktop').
   */
  getHeldWeapon(holderIndex) {
    return this.weapons.find(w => w.isGrabbed && w.heldIndex === holderIndex);
  }

  /**
   * Trigger dynamic desktop swing / slash attack animation.
   */
  triggerDesktopSwing(synth = null) {
    const held = this.getHeldWeapon('desktop');
    if (!held || held.isSwinging) return false;

    held.isSwinging = true;
    held.swingProgress = 0;

    if (synth && synth.playSwordSwing) {
      synth.playSwordSwing(1.0 + (Math.random() - 0.5) * 0.25);
    }
    this.spawnWeaponTrail(held.group);
    return true;
  }

  /**
   * Spawn luminous weapon trail and sparks during high-velocity swing.
   */
  spawnWeaponTrail(weaponGroup) {
    if (!weaponGroup) return;
    const worldPos = new THREE.Vector3();
    weaponGroup.getWorldPosition(worldPos);

    const count = 10;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = worldPos.x + (Math.random() - 0.5) * 0.22;
      positions[i * 3 + 1] = worldPos.y + (Math.random() - 0.5) * 0.22;
      positions[i * 3 + 2] = worldPos.z + (Math.random() - 0.5) * 0.22;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xf3cf65,
      size: 0.045,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const pSystem = new THREE.Points(geo, mat);
    this.shopGroup.add(pSystem);
    this.weaponTrails.push({ pSystem, life: 0.22 });
  }

  update(time, deltaTime = 0.016, xrManager = null, synth = null) {
    // 1. Update Volumetric Torch Flame Shaders
    this.flameMeshes.forEach(f => {
      if (f && f.update) {
        f.update(time);
      }
    });

    // 2. Flicker Torches
    this.torches.forEach((t, i) => {
      t.light.intensity = t.baseIntensity + (Math.sin(time * 8 + i * 2) * 0.4 + (Math.random() - 0.5) * 0.2);
    });

    // 3. Update Animated Sprites (Garth NPC)
    this.animatedUpdaters.forEach(fn => fn(time));

    // 4. Update Grabbed / Held Weapons & Velocity Physics
    const curPos = new THREE.Vector3();
    this.weapons.forEach(weapon => {
      if (!weapon.isGrabbed) return;

      weapon.group.getWorldPosition(curPos);
      const dist = curPos.distanceTo(weapon.lastPos);
      const speed = deltaTime > 0 ? (dist / deltaTime) : 0;
      weapon.lastPos.copy(curPos);

      if (typeof weapon.heldIndex === 'number') {
        // VR 6DOF Controller dynamic physics swing detection
        if (speed > 1.6 && (time - weapon.lastSwingTime > 0.22)) {
          weapon.lastSwingTime = time;
          if (synth && synth.playSwordSwing) {
            synth.playSwordSwing(Math.min(1.8, 0.85 + speed * 0.18));
          }
          if (xrManager) {
            xrManager.triggerHaptics(weapon.heldIndex, Math.min(1.0, 0.4 + speed * 0.1), 60);
          }
          this.spawnWeaponTrail(weapon.group);
        }
      } else if (weapon.heldIndex === 'desktop') {
        // Desktop Swing Animation
        if (weapon.isSwinging) {
          weapon.swingProgress += deltaTime * 4.8;
          if (weapon.swingProgress >= 1.0) {
            weapon.isSwinging = false;
            weapon.swingProgress = 0;
          }
          const slashCurve = Math.sin(weapon.swingProgress * Math.PI);
          weapon.group.position.set(0.26 - slashCurve * 0.16, -0.22 - slashCurve * 0.1, -0.45 - slashCurve * 0.14);
          weapon.group.rotation.set(Math.PI / 4 + slashCurve * 0.95, -Math.PI / 6 - slashCurve * 0.6, Math.PI / 8 - slashCurve * 0.4);
        } else {
          // Subtle first-person idle sway
          const idleSway = Math.sin(time * 2.5) * 0.006;
          weapon.group.position.set(0.26, -0.22 + idleSway, -0.45);
          weapon.group.rotation.set(Math.PI / 4 + idleSway * 0.4, -Math.PI / 6, Math.PI / 8);
        }
      }
    });

    // 5. Update and Fade Weapon Trail Particles
    for (let i = this.weaponTrails.length - 1; i >= 0; i--) {
      const trail = this.weaponTrails[i];
      trail.life -= deltaTime;
      if (trail.life <= 0) {
        this.shopGroup.remove(trail.pSystem);
        this.weaponTrails.splice(i, 1);
      }
    }

    // 6. Billboard weapon badges to face camera when not held
    if (this.camera) {
      this.weaponBadges.forEach(badge => {
        if (badge.visible) {
          badge.lookAt(this.camera.position);
        }
      });
    }
  }

  setVisible(visible) {
    this.shopGroup.visible = visible;
  }
}
