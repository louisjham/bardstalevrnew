import * as THREE from 'three';
import { TextureGenerator } from '../../textures/TextureGenerator.js';
import { TorchFlameShader } from '../../shaders/TorchFlameShader.js';
import { AnimatedSpriteManager } from '../../textures/AnimatedSprite.js';

/**
 * TempleRoom — Interior 3D sanctuary room for Temple of the Divine Light
 * and Temple of the Mad God Tarjan.
 *
 * Pattern matches GarthsShop: same 10×10×4m room, stone walls, timber beams,
 * animated NPC sprite on back wall, exit door on front wall.
 *
 * Sprite used: high_priest.png (4-frame spritesheet — red-robed priest)
 */
export class TempleRoom {
  constructor(scene, camera, onExitToSkaraBrae, party, onOpenTempleUI, onToast) {
    this.scene              = scene;
    this.camera             = camera;
    this.onExitToSkaraBrae  = onExitToSkaraBrae;
    this.party              = party || [];
    this.onOpenTempleUI     = onOpenTempleUI;
    this.onToast            = onToast;

    // Which temple is currently shown (set before calling setVisible(true))
    this.isTarjan   = false;
    this.templeName = 'Temple of the Divine Light';

    this.spriteManager    = new AnimatedSpriteManager();
    this.animatedUpdaters = [];

    this.roomGroup = new THREE.Group();
    this.roomGroup.name = 'TempleRoom';
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
      map: TextureGenerator.createStoneWallTexture(),
      roughness: 0.85
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

    const backdropTex = TextureGenerator.createAuthenticTempleBackdrop();
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
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x3e2312, roughness: 0.7 });
    for (const bx of [-4.8, 0, 4.8]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.0, 0.3), beamMat);
      beam.position.set(bx, 2.0, -4.8);
      this.roomGroup.add(beam);
    }

    // Devotional rug — gold/white with holy symbol
    const rugCanvas = document.createElement('canvas');
    rugCanvas.width = 256; rugCanvas.height = 256;
    const rc = rugCanvas.getContext('2d');
    rc.fillStyle = '#1e1b4b';
    rc.fillRect(0, 0, 256, 256);
    rc.strokeStyle = '#c9a227'; rc.lineWidth = 10;
    rc.strokeRect(10, 10, 236, 236);
    rc.fillStyle = '#312e81';
    rc.fillRect(24, 24, 208, 208);
    rc.fillStyle = '#c9a227';
    rc.font = 'bold 48px serif'; rc.textAlign = 'center';
    rc.fillText('✝️', 128, 150);
    const rugTex = new THREE.CanvasTexture(rugCanvas);
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(4.0, 2.4),
      new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.85 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.01, -0.9);
    this.roomGroup.add(rug);
  }

  _buildLighting() {
    // Warm golden ambient for day-lit sanctuary
    const hemi = new THREE.HemisphereLight(0xfff8e7, 0x1a1005, 1.5);
    this.roomGroup.add(hemi);

    // Single hero point light over the altar area
    const altarLight = new THREE.PointLight(0xfde68a, 3.0, 8.0);
    altarLight.position.set(0, 2.5, -2.5);
    this.roomGroup.add(altarLight);
    this.heroLight = { light: altarLight, baseIntensity: 3.0, phase: 0.0 };

    // Lantern housing above altar
    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.28, 8),
      new THREE.MeshStandardMaterial({
        color: 0xc9a227, metalness: 0.8,
        emissive: 0xfde68a, emissiveIntensity: 0.4
      })
    );
    lantern.position.set(0, 2.6, -2.5);
    this.roomGroup.add(lantern);

    // Wall sconce torches — visual only, no extra PointLights
    const bracketMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, metalness: 0.8,
      emissive: 0xf97316, emissiveIntensity: 0.9
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
      const flame = TorchFlameShader.createFlameMesh('fire');
      flame.scale.set(0.9, 0.95, 0.9);
      flame.position.set(0.08, 0.2, 0);
      g.add(flame);
      this.flameMeshes.push(flame);
      this.roomGroup.add(g);
    });
  }

  _buildNPCAndCounter() {
    // Offering table / counter
    const counterMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWornTavernPlankTexture(), roughness: 0.5
    });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.95, 0.9), counterMat);
    counter.position.set(0, 0.475, -2.2);
    this.roomGroup.add(counter);

    // Animated Priest sprite billboard
    this.npcGroup = new THREE.Group();
    this.npcGroup.position.set(0, 0.45, -3.1);
    this.npcGroup.userData = { isTempleNPC: true, name: 'High Priest' };

    const npcHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.2, 1.0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    npcHitbox.position.set(0, 0.95, 0);
    npcHitbox.userData = { isTempleNPC: true, name: 'High Priest' };
    this.npcGroup.add(npcHitbox);

    (async () => {
      try {
        const animated = await this.spriteManager.createAnimatedBillboard('/assets/sprites/high_priest.png', 4);
        animated.mesh.position.set(0, 0.95, 0);
        animated.mesh.scale.set(1.05, 1.05, 1.05);
        animated.mesh.userData = { isTempleNPC: true, name: 'High Priest' };
        this.npcGroup.add(animated.mesh);
        this.animatedUpdaters.push(animated.update);
      } catch (e) {
        console.warn('TempleRoom: failed to load high_priest sprite:', e);
      }
    })();

    this.roomGroup.add(this.npcGroup);
    this.interactableObjects.push(npcHitbox, this.npcGroup);

    // Candle holders flanking NPC
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.8, roughness: 0.2 });
    for (const cx of [-1.0, 1.0]) {
      const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.2, 8), goldMat);
      holder.position.set(cx, 0.97, -4.82);
      this.roomGroup.add(holder);
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8),
        new THREE.MeshStandardMaterial({ color: 0xfef9c3 })
      );
      candle.position.set(cx, 1.26, -4.82);
      this.roomGroup.add(candle);
    }

    // "TEMPLE OF THE DIVINE LIGHT" banner
    this._buildBanner();
  }

  _buildBanner() {
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 640; bannerCanvas.height = 140;
    const ctx = bannerCanvas.getContext('2d');
    ctx.fillStyle = '#1c1108';
    ctx.fillRect(0, 0, 640, 140);
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 624, 124);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏛️ TEMPLE OF THE DIVINE LIGHT 🏛️', 320, 58);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Healing • Purification • Resurrection  •  Tap / [A] to Pray', 320, 100);
    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    this._bannerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 0.85),
      new THREE.MeshBasicMaterial({ map: bannerTex })
    );
    this._bannerMesh.position.set(0, 3.2, -4.85);
    this.roomGroup.add(this._bannerMesh);
    this._bannerTex = bannerTex;
    this._bannerCanvas = bannerCanvas;
    this._bannerCtx = ctx;
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
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 480, 100);
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 468, 88);
    ctx.fillStyle = '#fde68a';
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

  /**
   * Call before setVisible(true) to configure which temple is shown.
   * @param {string} templeName
   * @param {boolean} isTarjan
   */
  configure(templeName, isTarjan = false) {
    this.templeName = templeName;
    this.isTarjan   = isTarjan;
    // Re-paint banner to reflect the temple's identity
    if (this._bannerCtx && this._bannerCanvas && this._bannerTex) {
      const ctx = this._bannerCtx;
      const w = this._bannerCanvas.width, h = this._bannerCanvas.height;
      ctx.fillStyle = '#1c1108'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = isTarjan ? '#a855f7' : '#c9a227';
      ctx.lineWidth = 10; ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = isTarjan ? '#e9d5ff' : '#fde68a';
      ctx.font = 'bold 28px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText(isTarjan ? '🗡️ TEMPLE OF THE MAD GOD 🗡️' : '🏛️ TEMPLE OF THE DIVINE LIGHT 🏛️', w / 2, 58);
      ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 17px sans-serif';
      ctx.fillText(isTarjan ? 'FREE Healing for Rogues  •  Tap / [A] to Pray' : 'Healing • Purification • Resurrection  •  Tap / [A] to Pray', w / 2, 100);
      this._bannerTex.needsUpdate = true;
    }
  }

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
      this.heroLight.light.intensity = this.heroLight.baseIntensity
        + Math.sin(t * 9.3) * 0.25 + Math.sin(t * 17.1) * 0.1;
    }
    if (this.animatedUpdaters.length > 0) {
      this.animatedUpdaters.forEach(u => u(t));
    }
    this.flameMeshes.forEach(f => { if (f && f.update) f.update(t); });
  }
}
