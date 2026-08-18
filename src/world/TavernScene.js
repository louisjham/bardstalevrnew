import * as THREE from 'three';

export class TavernScene {
  constructor(scene) {
    this.scene = scene;
    this.interactableObjects = [];
    this.strings = [];
    this.torches = [];
    this.spellParticles = [];
    this.luteGroup = new THREE.Group();

    this.initEnvironment();
    this.initTorches();
    this.initLute();
    this.initSpellPedestals();
  }

  initEnvironment() {
    // Atmospheric Fog
    this.scene.fog = new THREE.FogExp2(0x0a0c10, 0.08);

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0x221a10, 1.2);
    this.scene.add(ambientLight);

    // Tavern Floor (Cobblestone)
    const floorGeo = new THREE.PlaneGeometry(12, 12, 16, 16);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1f1915,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Tavern Walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x151210,
      roughness: 0.9,
    });

    // Back Wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMat);
    backWall.position.set(0, 3, -6);
    this.scene.add(backWall);

    // Side Walls
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMat);
    leftWall.position.set(-6, 3, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wallMat);
    rightWall.position.set(6, 3, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.scene.add(rightWall);

    // Wooden Tavern Table (Centerpiece)
    const tableGroup = new THREE.Group();
    const topMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.7 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.4), topMat);
    tableTop.position.set(0, 0.8, -1.8);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    // Table Legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8);
    const legPositions = [
      [-1.0, 0.4, -2.3],
      [1.0, 0.4, -2.3],
      [-1.0, 0.4, -1.3],
      [1.0, 0.4, -1.3]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, topMat);
      leg.position.set(...pos);
      tableGroup.add(leg);
    });

    this.scene.add(tableGroup);
  }

  initTorches() {
    // Create 2 flickering torches on side walls
    const torchPositions = [
      [-3.5, 2.8, -4.0],
      [3.5, 2.8, -4.0]
    ];

    torchPositions.forEach((pos, idx) => {
      const torchHolder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.05, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
      );
      torchHolder.position.set(...pos);
      this.scene.add(torchHolder);

      // Flickering Torch Point Light
      const light = new THREE.PointLight(0xff7700, 2.5, 8);
      light.position.set(pos[0], pos[1] + 0.2, pos[2]);
      light.castShadow = true;
      this.scene.add(light);

      this.torches.push({ light, baseIntensity: 2.5, idx });
    });
  }

  initLute() {
    // Construct 3D Bard's Lute
    this.luteGroup.position.set(0, 0.88, -1.8);
    this.luteGroup.rotation.x = -Math.PI / 12;

    // Lute Body (Pear-shaped wood)
    const bodyGeo = new THREE.SphereGeometry(0.32, 16, 16);
    bodyGeo.scale(0.8, 1.2, 0.4);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.4,
      metalness: 0.1
    });
    const luteBody = new THREE.Mesh(bodyGeo, woodMat);
    luteBody.rotation.x = Math.PI / 2;
    this.luteGroup.add(luteBody);

    // Soundhole (Rose)
    const holeGeo = new THREE.CircleGeometry(0.08, 16);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const soundHole = new THREE.Mesh(holeGeo, holeMat);
    soundHole.position.set(0, 0.08, 0.08);
    soundHole.rotation.x = -Math.PI / 2;
    this.luteGroup.add(soundHole);

    // Lute Neck & Pegbox
    const neckGeo = new THREE.BoxGeometry(0.12, 0.6, 0.06);
    const neck = new THREE.Mesh(neckGeo, woodMat);
    neck.position.set(0, 0.4, 0);
    this.luteGroup.add(neck);

    // 3D Pluckable Strings
    const stringNotes = ['G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
    const startX = -0.05;
    const stringSpacing = 0.01;

    stringNotes.forEach((note, i) => {
      const stringGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.7);
      const stringMat = new THREE.MeshStandardMaterial({
        color: 0xf3cf65,
        emissive: 0x332500,
        metalness: 0.9,
        roughness: 0.2
      });
      const stringMesh = new THREE.Mesh(stringGeo, stringMat);
      const xPos = startX + i * stringSpacing;
      stringMesh.position.set(xPos, 0.35, 0.04);
      stringMesh.userData = { note, originalX: xPos, isString: true };

      this.luteGroup.add(stringMesh);
      this.strings.push(stringMesh);
      this.interactableObjects.push(stringMesh);
    });

    this.scene.add(this.luteGroup);
  }

  initSpellPedestals() {
    // 3 Floating Runic Orbs for Instant Spell Triggers in VR
    const orbConfigs = [
      { color: 0x10b981, pos: [-0.9, 1.2, -1.8], name: 'Healing Aura', notes: ['C4', 'E4', 'G4', 'C5'] },
      { color: 0xf59e0b, pos: [0, 1.35, -2.1], name: 'Firestorm', notes: ['A3', 'D4', 'F4', 'A4'] },
      { color: 0x38bdf8, pos: [0.9, 1.2, -1.8], name: 'Starlight', notes: ['G3', 'B3', 'D4', 'G4'] }
    ];

    orbConfigs.forEach(config => {
      const orbGeo = new THREE.IcosahedronGeometry(0.1, 2);
      const orbMat = new THREE.MeshStandardMaterial({
        color: config.color,
        emissive: config.color,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.8
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(...config.pos);
      orb.userData = { isOrb: true, name: config.name, notes: config.notes, color: config.color };

      // Inner Light
      const light = new THREE.PointLight(config.color, 1.0, 2);
      orb.add(light);

      this.scene.add(orb);
      this.interactableObjects.push(orb);
    });
  }

  triggerParticleSpell(colorHex = 0xf3cf65) {
    // Burst of magical spell particles above the table
    const particleCount = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1.5;
      positions[i * 3 + 1] = 1.0 + Math.random() * 1.5;
      positions[i * 3 + 2] = -1.8 + (Math.random() - 0.5) * 1.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.06,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const pSystem = new THREE.Points(geometry, material);
    this.scene.add(pSystem);
    this.spellParticles.push({ pSystem, life: 1.0 });
  }

  update(time) {
    // Torch Flickering
    this.torches.forEach(t => {
      t.light.intensity = t.baseIntensity + (Math.sin(time * 12 + t.idx) * 0.4 + Math.cos(time * 7) * 0.3);
    });

    // Animate Lute Strings vibration if plucked
    this.strings.forEach(s => {
      if (s.userData.vibTime > 0) {
        s.position.x = s.userData.originalX + Math.sin(time * 60) * 0.003 * s.userData.vibTime;
        s.userData.vibTime -= 0.05;
      } else {
        s.position.x = s.userData.originalX;
      }
    });

    // Update Spell Particles
    for (let i = this.spellParticles.length - 1; i >= 0; i--) {
      const p = this.spellParticles[i];
      p.life -= 0.02;
      p.pSystem.material.opacity = p.life;
      p.pSystem.position.y += 0.005;

      if (p.life <= 0) {
        this.scene.remove(p.pSystem);
        p.pSystem.geometry.dispose();
        p.pSystem.material.dispose();
        this.spellParticles.splice(i, 1);
      }
    }
  }
}
