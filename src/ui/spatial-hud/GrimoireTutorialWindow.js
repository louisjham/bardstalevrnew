import * as THREE from 'three';

/**
 * GrimoireTutorialWindow
 * Spatially locked transparent 3D tutorial window that appears in front of the
 * player when the Grimoire is first introduced in Garth's Shop, auto-fading after 5 seconds.
 */
export class GrimoireTutorialWindow {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.scene.add(this.group);

    this.timer = 0;
    this.duration = 5.0; // 5 seconds duration
    this.active = false;
    this.hasBeenShown = false;

    this.initMesh();
  }

  initMesh() {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 560;
    this.ctx = canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(canvas);

    this.renderCanvas();

    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // 0.85m wide x 0.53m high floating panel
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.53), this.material);
    this.group.add(this.mesh);
  }

  renderCanvas() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 900, 560);

    // Glassmorphism Card Background
    ctx.fillStyle = 'rgba(15, 7, 30, 0.88)';
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(10, 10, 880, 540, 24);
    ctx.fill();
    ctx.stroke();

    // Inner subtle gold border
    ctx.strokeStyle = 'rgba(243, 207, 101, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(22, 22, 856, 516, 16);
    ctx.stroke();

    // Header Glow Banner
    ctx.fillStyle = 'rgba(126, 34, 206, 0.4)';
    ctx.beginPath();
    ctx.roundRect(30, 30, 840, 90, 12);
    ctx.fill();

    // Header Title
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 32px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ THE BARD\'S GRIMOIRE UNLOCKED ✨', 450, 72);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px sans-serif';
    ctx.fillText('Palm-Flip Grimoire & Diegetic Automap Calibrated', 450, 104);

    // Instructions List
    ctx.textAlign = 'left';

    // 1. Palm Up
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('🖐️ FLIP PALM UP', 70, 170);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '18px sans-serif';
    ctx.fillText('Turn your hand palm-up to summon the 3D Grimoire near your face.', 70, 200);

    // 2. Palm Down
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('🖐️ FLIP PALM DOWN', 70, 250);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '18px sans-serif';
    ctx.fillText('Turn your hand palm-down or lower your arm to dispel & close the book.', 70, 280);

    // 3. Controller Buttons
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('🎮 CONTROLLER BUTTONS [Y] / [X] / [M]', 70, 330);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '18px sans-serif';
    ctx.fillText('Press [Y] / [X] on your left controller (or [M] / [Tab] on desktop) for HUD mode.', 70, 360);

    // 4. Content & Interaction
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('📖 PAGES: HEROES, AUTOMAP & LIVE SPELLS', 70, 410);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '18px sans-serif';
    ctx.fillText('Point your controller beam and pull trigger to switch tabs or test spells live.', 70, 440);

    // Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Auto-dismissing tutorial in 5 seconds...', 450, 510);

    this.texture.needsUpdate = true;
  }

  /**
   * Spatially locks the tutorial window in world space in front of the player's head.
   * @param {THREE.Vector3} headPos - World position of camera
   * @param {THREE.Quaternion} headQuat - World orientation of camera
   */
  show(headPos, headQuat) {
    this.active = true;
    this.timer = 0;
    this.hasBeenShown = true;
    this.group.visible = true;
    this.material.opacity = 0.0;

    // Spatially lock 0.95m directly in front of the player's view at eye level
    const forward = new THREE.Vector3(0, 0, -0.95).applyQuaternion(headQuat);
    this.group.position.copy(headPos).add(forward);
    this.group.lookAt(headPos);
  }

  hide() {
    this.active = false;
    this.group.visible = false;
    this.material.opacity = 0.0;
  }

  /**
   * Update animation & 5-second fade timer
   * @param {number} deltaTime
   */
  update(deltaTime) {
    if (!this.active) return;

    this.timer += deltaTime;

    // Fade in over first 0.3s
    if (this.timer < 0.3) {
      this.material.opacity = (this.timer / 0.3) * 0.95;
    }
    // Solid display from 0.3s to 4.2s
    else if (this.timer < 4.2) {
      this.material.opacity = 0.95;
    }
    // Fade out over last 0.8s (4.2s to 5.0s)
    else if (this.timer < this.duration) {
      const fadeProgress = (this.timer - 4.2) / 0.8;
      this.material.opacity = (1 - fadeProgress) * 0.95;
    }
    // Expired at 5.0s
    else {
      this.hide();
    }
  }
}
