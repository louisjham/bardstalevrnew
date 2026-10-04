import * as THREE from 'three';
import { TextureGenerator } from '../../textures/TextureGenerator.js';
import { TorchFlameShader } from '../../shaders/TorchFlameShader.js';
import { AnimatedSpriteManager } from '../../textures/AnimatedSprite.js';

/**
 * RoscoeEmporium — Interior 3D arcane laboratory for Roscoe's Energy Emporium.
 *
 * Pattern matches GarthsShop: 10×10×4m room, stone walls, timber beams,
 * animated Roscoe sprite on back wall, exit door on front wall.
 *
 * Sprite used: roscoe.png (4-frame spritesheet — green-robed wizard with black cat)
 * Services: 15 GP per SP recharge for all mage-class party members (via RoscoeUI)
 */
export class RoscoeEmporium {
  constructor(scene, camera, onExitToSkaraBrae, party, onOpenRoscoeUI, onToast) {
    this.scene             = scene;
    this.camera            = camera;
    this.onExitToSkaraBrae = onExitToSkaraBrae;
    this.party             = party || [];
    this.onOpenRoscoeUI    = onOpenRoscoeUI;
    this.onToast           = onToast;

    this.spriteManager    = new AnimatedSpriteManager();
    this.animatedUpdaters = [];

    this.roomGroup = new THREE.Group();
    this.roomGroup.name = 'RoscoeEmporium';
    this.roomGroup.visible = false;

    this.interactableObjects = [];
    this.flameMeshes  = [];
    this.heroLight    = null;

    this._build();
    this.scene.add(this.roomGroup);
  }

  // ─── Room construction ──────────────────────────────────────────────────────

  _build() {
    this._buildEnvironment();
    this._buildLighting();
    this._buildNPCAndCounter();
    this._buildExitDoor();
  }

  _buildEnvironment() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createStoneWallTexture(), roughness: 0.85
    });
    const floorTex = TextureGenerator.createWornTavernPlankTexture();
    floorTex.repeat.set(3, 3);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 });

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.roomGroup.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), wallMat);
    ceiling.position.y = 4.0;
    ceiling.rotation.x = Math.PI / 2;
    this.roomGroup.add(ceiling);

    // Back wall + backdrop artwork
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMat);
    backWall.position.set(0, 2, -5);
    this.roomGroup.add(backWall);

    const backdropTex = TextureGenerator.createAuthenticRoscoeBackdrop();
    const backdropMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 4.0),
      new THREE.MeshBasicMaterial({ map: backdropTex })
    );
    backdropMesh.position.set(0, 2.0, -4.95);
    this.roomGroup.add(backdropMesh);

    // Front wall
    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMat);
    frontWall.position.set(0, 2, 5);
    frontWall.rotation.y = Math.PI;
    this.roomGroup.add(frontWall);

    // Side walls
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMat);
    leftWall.position.set(-5, 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.roomGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMat);
    rightWall.position.set(5, 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.roomGroup.add(rightWall);

    // Timber support beams
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x1a3a0a, roughness: 0.7 });
    for (const bx of [-4.8, 0, 4.8]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.0, 0.3), beamMat);
      beam.position.set(bx, 2.0, -4.8);
      this.roomGroup.add(beam);
    }

    // Arcane floor rug — cyan-tinted with energy circle
    const rugCanvas = document.createElement('canvas');
    rugCanvas.width = 256; rugCanvas.height = 256;
    const rc = rugCanvas.getContext('2d');
    rc.fillStyle = '#022c22';
    rc.fillRect(0, 0, 256, 256);
    rc.strokeStyle = '#34d399'; rc.lineWidth = 10;
    rc.strokeRect(10, 10, 236, 236);
    rc.fillStyle = '#065f46';
    rc.fillRect(24, 24, 208, 208);
    rc.strokeStyle = '#38bdf8'; rc.lineWidth = 4;
    rc.beginPath(); rc.arc(128, 128, 70, 0, Math.PI * 2); rc.stroke();
    rc.fillStyle = '#6ee7b7';
    rc.font = 'bold 44px serif'; rc.textAlign = 'center';
    rc.fillText('⚡', 128, 148);
    const rugTex = new THREE.CanvasTexture(rugCanvas);
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(4.0, 2.4),
      new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.85 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.01, -0.9);
    this.roomGroup.add(rug);

    // Potion shelf on left wall — 3D shelves with coloured flask meshes
    this._buildPotionShelves();
  }

  _buildPotionShelves() {
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x0f2d18, roughness: 0.7 });
    const flaskColors = [0x4ade80, 0xf472b6, 0xfb923c, 0xa78bfa, 0x38bdf8, 0xfde047];
    const shelfYs = [2.6, 2.0, 1.4];

    shelfYs.forEach(sy => {
      // Shelf plank
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.25), shelfMat);
      shelf.position.set(-4.75, sy, -1.0);
      this.roomGroup.add(shelf);
      // Flask potions on shelf
      for (let i = 0; i < 5; i++) {
        const col = flaskColors[i % flaskColors.length];
        const flask = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.07, 0.22, 8),
          new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.82, roughness: 0.3 })
        );
        flask.position.set(-4.75 + (i - 2) * 0.38, sy + 0.16, -1.0);
        this.roomGroup.add(flask);
        // Emissive stopper
        const stopper = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 6, 4),
          new THREE.MeshBasicMaterial({ color: col })
        );
        stopper.position.set(-4.75 + (i - 2) * 0.38, sy + 0.30, -1.0);
        this.roomGroup.add(stopper);
      }
    });
  }

  _buildLighting() {
    // Cool emerald-tinted ambient
    const hemi = new THREE.HemisphereLight(0xd1fae5, 0x022c22, 1.5);
    this.roomGroup.add(hemi);

    // Single hero point light — cyan tint over Roscoe's counter
    const orbLight = new THREE.PointLight(0x67e8f9, 3.2, 8.0);
    orbLight.position.set(0, 2.5, -2.5);
    this.roomGroup.add(orbLight);
    this.heroLight = { light: orbLight, baseIntensity: 3.2, phase: 0.0 };

    // Lantern housing (glowing cyan)
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 6),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8, emissive: 0x67e8f9, emissiveIntensity: 0.8,
        transparent: true, opacity: 0.75
      })
    );
    lantern.position.set(0, 2.65, -2.5);
    this.roomGroup.add(lantern);

    // Wall sconce torches — arcane cyan flames, no extra PointLights
    const bracketMat = new THREE.MeshStandardMaterial({
      color: 0x065f46, metalness: 0.7,
      emissive: 0x06b6d4, emissiveIntensity: 0.9
    });
    const sconces = [
      { pos: [-4.8, 2.2, -2.2], rotY:  Math.PI / 2 },
      { pos: [ 4.8, 2.2, -2.2], rotY: -Math.PI / 2 },
      { pos: [-4.8, 2.2,  2.0], rotY:  Math.PI / 2 },
      { pos: [ 4.8, 2.2,  2.0], rotY: -Math.PI / 2 },
    ];
    sconces.forEach(cfg => {
      const g = new THREE.Group();
      g.position.set(...cfg.pos);
      g.rotation.y = cfg.rotY;
      const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35), bracketMat);
      bracket.rotation.z = -Math.PI / 6;
      g.add(bracket);
      const flame = TorchFlameShader.createFlameMesh('arcane');
      flame.scale.set(0.9, 0.95, 0.9);
      flame.position.set(0.08, 0.2, 0);
      g.add(flame);
      this.flameMeshes.push(flame);
      this.roomGroup.add(g);
    });
  }

  _buildNPCAndCounter() {
    // Counter
    const counterMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWornTavernPlankTexture(), roughness: 0.5
    });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.95, 0.9), counterMat);
    counter.position.set(0, 0.475, -2.2);
    this.roomGroup.add(counter);

    // Animated Roscoe sprite billboard
    this.npcGroup = new THREE.Group();
    this.npcGroup.position.set(0, 0.45, -3.1);
    this.npcGroup.userData = { isRoscoeNPC: true, name: 'Roscoe' };

    const npcHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.2, 1.0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    npcHitbox.position.set(0, 0.95, 0);
    npcHitbox.userData = { isRoscoeNPC: true, name: 'Roscoe' };
    this.npcGroup.add(npcHitbox);

    (async () => {
      try {
        const animated = await this.spriteManager.createAnimatedBillboard('/assets/sprites/roscoe.png', 4);
        animated.mesh.position.set(0, 0.95, 0);
        animated.mesh.scale.set(1.05, 1.05, 1.05);
        animated.mesh.userData = { isRoscoeNPC: true, name: 'Roscoe' };
        this.npcGroup.add(animated.mesh);
        this.animatedUpdaters.push(animated.update);
      } catch (e) {
        console.warn('RoscoeEmporium: failed to load roscoe sprite:', e);
      }
    })();

    this.roomGroup.add(this.npcGroup);
    this.interactableObjects.push(npcHitbox, this.npcGroup);

    // Crystal orb prop on counter — glowing cyan sphere
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 12),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8, transparent: true, opacity: 0.78,
        roughness: 0.0, metalness: 0.1,
        emissive: 0x67e8f9, emissiveIntensity: 0.5
      })
    );
    orb.position.set(0.8, 1.1, -2.15);
    this.roomGroup.add(orb);
    // Orb base ring
    const orbBase = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.24, 24),
      new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    orbBase.rotation.x = -Math.PI / 2;
    orbBase.position.set(0.8, 0.97, -2.15);
    this.roomGroup.add(orbBase);

    // Service badge on counter
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 380; badgeCanvas.height = 80;
    const bc = badgeCanvas.getContext('2d');
    bc.fillStyle = 'rgba(2,44,34,0.96)';
    bc.strokeStyle = '#34d399'; bc.lineWidth = 5;
    bc.beginPath(); bc.roundRect(4, 4, 372, 72, 10); bc.fill(); bc.stroke();
    bc.fillStyle = '#6ee7b7';
    bc.font = 'bold 22px Georgia, serif'; bc.textAlign = 'center';
    bc.fillText("⚡ Recharge Spell Points", 190, 36);
    bc.fillStyle = '#fde68a';
    bc.font = 'bold 16px monospace';
    bc.fillText("15 GP per SP  •  Press [A] to Recharge", 190, 64);
    const badgeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.095),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(badgeCanvas), transparent: true })
    );
    badgeMesh.position.set(-0.4, 1.12, -2.15);
    this.roomGroup.add(badgeMesh);

    // Main banner
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 640; bannerCanvas.height = 140;
    const ctx = bannerCanvas.getContext('2d');
    ctx.fillStyle = '#031a12';
    ctx.fillRect(0, 0, 640, 140);
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 624, 124);
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 30px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText("⚡ ROSCOE'S ENERGY EMPORIUM ⚡", 320, 58);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText("Spell Point Recharge  •  15 GP per SP  •  Tap / [A] to Visit Roscoe", 320, 100);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 0.85),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bannerCanvas) })
    );
    banner.position.set(0, 3.2, -4.85);
    this.roomGroup.add(banner);
  }

  _buildExitDoor() {
    const doorMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWoodPlankTexture(), roughness: 0.6
    });
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.0, 0.15), doorMat);
    door.position.set(0, 1.5, 4.85);
    door.userData = { isExitDoor: true };
    this.roomGroup.add(door);
    this.interactableObjects.push(door);

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const strap1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.18), ironMat);
    strap1.position.set(0, 2.4, 4.86); this.roomGroup.add(strap1);
    const strap2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.18), ironMat);
    strap2.position.set(0, 0.6, 4.86); this.roomGroup.add(strap2);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3), ironMat);
    handle.position.set(0.6, 1.4, 4.75); this.roomGroup.add(handle);

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 480; signCanvas.height = 100;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = '#031a12';
    ctx.fillRect(0, 0, 480, 100);
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 468, 88);
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 24px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('🏰 EXIT TO SKARA BRAE', 240, 42);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Press [A] or Click Door to Exit', 240, 76);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.38),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) })
    );
    sign.position.set(0, 3.3, 4.75);
    this.roomGroup.add(sign);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  setVisible(v) {
    this.roomGroup.visible = v;
  }

  setParty(party) {
    this.party = party || [];
  }

  update(time) {
    if (!this.roomGroup.visible) return;
    const t = time * 0.001;
    if (this.heroLight) {
      // Pulsing cyan flicker — faster than a torch, more arcane
      this.heroLight.light.intensity = this.heroLight.baseIntensity
        + Math.sin(t * 11.3) * 0.4 + Math.sin(t * 23.7) * 0.18;
    }
    if (this.animatedUpdaters.length > 0) {
      this.animatedUpdaters.forEach(u => u(t));
    }
    this.flameMeshes.forEach(f => { if (f && f.update) f.update(t); });
  }
}
