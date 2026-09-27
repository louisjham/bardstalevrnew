import * as THREE from 'three';
import { COLLISION_LAYER } from './SpatialCollisionLayers.js';

/**
 * SpatialHUD - Diegetic 3D Spatial Wrist Panel & Quick Actions HUD
 *
 * ⚡ Performance & Raycasting Optimization Strategy
 * ────────────────────────────────────────────────
 * Rather than raycasting recursively against the full visual hierarchy of the
 * wrist mesh, strap, bevels, and decorative borders, SpatialHUD assigns invisible,
 * low-poly primitive planes or bounding boxes (BoxGeometry / PlaneGeometry) to each
 * interactive button and the panel surface.
 *
 * All collision proxies are assigned exclusively to `COLLISION_LAYER.SPATIAL_UI`.
 * Configuring the raycaster to only intersect with this collision layer eliminates
 * CPU spikes during continuous rAF controller polling and center-reticle updates.
 */
export class SpatialHUD {
  /**
   * @param {THREE.Camera} camera
   * @param {Object} [options]
   * @param {() => void} [options.onToggleGrimoire]
   * @param {() => void} [options.onToggleAudio]
   * @param {() => void} [options.onToggleMap]
   */
  constructor(camera, options = {}) {
    this.camera = camera;
    this.onToggleGrimoire = options.onToggleGrimoire || null;
    this.onToggleAudio = options.onToggleAudio || null;
    this.onToggleMap = options.onToggleMap || null;

    this.hudGroup = new THREE.Group();
    this.hudGroup.name = 'SpatialHUD';

    /** @type {THREE.Mesh[]} Invisible low-poly primitive colliders for raycast intersection */
    this.colliders = [];
    this.buttons = [];

    this.isMuted = false;
    this.attachedController = null;

    this.initWristPanel();
  }

  initWristPanel() {
    // 1. Diegetic Visual Wrist Slate (0.16m wide x 0.12m high x 0.015m thick)
    const slateMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      metalness: 0.85,
      roughness: 0.25
    });
    const slateMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.012), slateMat);
    slateMesh.position.set(0, 0.03, 0);
    this.hudGroup.add(slateMesh);

    // Decorative Gold Rim Bezel
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xf3cf65,
      metalness: 0.9,
      roughness: 0.2
    });
    const rimMesh = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.125, 0.004), rimMat);
    rimMesh.position.set(0, 0.03, -0.005);
    this.hudGroup.add(rimMesh);

    // 2. High-DPI Canvas for Buttons & Quick Status
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 384;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);

    const displayMat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true
    });
    const displayMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.11), displayMat);
    displayMesh.position.set(0, 0.03, 0.007);
    this.hudGroup.add(displayMesh);

    // ⚡ 3. Invisible Low-Poly Primitive Collision Planes for Interactive UI Buttons
    // Each button gets a simple 2-triangle PlaneGeometry collider assigned to COLLISION_LAYER.SPATIAL_UI
    const buttonConfigs = [
      { id: 'GRIMOIRE', label: '📖 BOOK', x: -0.04, y: 0.055, w: 0.065, h: 0.035, action: () => this.onToggleGrimoire && this.onToggleGrimoire() },
      { id: 'MAP',      label: '🗺️ MAP',  x:  0.04, y: 0.055, w: 0.065, h: 0.035, action: () => this.onToggleMap && this.onToggleMap() },
      { id: 'AUDIO',    label: '🔊 SND',  x: -0.04, y: 0.015, w: 0.065, h: 0.035, action: () => this.toggleAudio() },
      { id: 'STATUS',   label: '🛡️ HERO', x:  0.04, y: 0.015, w: 0.065, h: 0.035, action: () => this.onToggleGrimoire && this.onToggleGrimoire() }
    ];

    const colliderMat = new THREE.MeshBasicMaterial({ visible: false });

    buttonConfigs.forEach(cfg => {
      const colGeo = new THREE.PlaneGeometry(cfg.w, cfg.h);
      const colMesh = new THREE.Mesh(colGeo, colliderMat);
      colMesh.position.set(cfg.x, cfg.y, 0.009); // Slightly in front of display
      colMesh.layers.set(COLLISION_LAYER.SPATIAL_UI);
      colMesh.userData = {
        isUICollider: true,
        buttonId: cfg.id,
        action: cfg.action,
        hud: this
      };

      this.hudGroup.add(colMesh);
      this.colliders.push(colMesh);
      this.buttons.push({ cfg, mesh: colMesh });
    });

    this.renderCanvas();
  }

  toggleAudio() {
    this.isMuted = !this.isMuted;
    if (this.onToggleAudio) this.onToggleAudio(this.isMuted);
    this.renderCanvas();
  }

  renderCanvas() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 512, 384);

    // Dark parchment background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 368, 16);
    ctx.fill();

    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Header Title
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText("THE BARD'S TALE", 256, 42);

    // Button Visuals
    // Row 1: [ 📖 GRIMOIRE ] [ 🗺️ AUTOMAP ]
    this.drawButton(ctx, 24, 60, 220, 110, '📖 GRIMOIRE', '#7c3aed');
    this.drawButton(ctx, 268, 60, 220, 110, '🗺️ AUTOMAP', '#0284c7');

    // Row 2: [ 🔊 AUDIO ] [ 🛡️ PARTY ]
    const audioLabel = this.isMuted ? '🔇 MUTED' : '🔊 AUDIO';
    const audioColor = this.isMuted ? '#b91c1c' : '#16a34a';
    this.drawButton(ctx, 24, 190, 220, 110, audioLabel, audioColor);
    this.drawButton(ctx, 268, 190, 220, 110, '🛡️ HEROES', '#b45309');

    // Footer Quick Help
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('⚡ TOUCH TO INTERACT', 256, 345);

    this.texture.needsUpdate = true;
  }

  drawButton(ctx, x, y, w, h, label, accentColor) {
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 8);
  }

  /**
   * Raycast intersection test against ONLY the low-poly primitive colliders.
   * Eliminates recursive traversal of visual meshes.
   *
   * @param {THREE.Raycaster} raycaster
   * @returns {boolean} True if an interactive button was hit
   */
  handleRaycast(raycaster) {
    if (!raycaster || !this.hudGroup.visible) return false;

    // Fast, non-recursive intersection against only the 4 primitive plane colliders
    const hits = raycaster.intersectObjects(this.colliders, false);
    if (hits.length > 0) {
      const hit = hits[0];
      if (hit.object && hit.object.userData && hit.object.userData.action) {
        hit.object.userData.action();
        return true;
      }
    }
    return false;
  }

  attachToWrist(controller) {
    if (!controller) return;
    this.attachedController = controller;

    // Position comfortably on inner forearm / wrist
    this.hudGroup.position.set(0, 0.05, 0.08);
    this.hudGroup.rotation.set(-Math.PI / 4, 0, 0);
    controller.add(this.hudGroup);
  }

  setVisible(visible) {
    this.hudGroup.visible = visible;
  }
}
