import * as THREE from 'three';

/**
 * Creates an HTML canvas element or a headless mock if running in Node.js unit tests.
 */
function createCompatibleCanvas(width = 512, height = 512) {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  // Headless environment fallback (for Node tests)
  return {
    width,
    height,
    getContext: () => ({
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      textBaseline: 'alphabetic',
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      fillText: () => {},
      drawImage: () => {},
      measureText: (txt) => ({ width: (txt || '').length * 9 }),
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {}
    })
  };
}

/**
 * SpatialCombatScroll - WebXR 3D Curved Parchment Combat Narrative Scroll
 *
 * Implements an authentic 1985 asynchronous typewriter text display mapped onto
 * a curved cylinder in the player's camera FOV.
 */
export class SpatialCombatScroll {
  /**
   * @param {Object} [options]
   * @param {number} [options.radius=2.0] Cylinder radius
   * @param {number} [options.height=1.0] Cylinder height
   * @param {number} [options.radialSegments=32] Radial segments
   * @param {number} [options.thetaLength=0.6] Arc angle in radians (~34.4 degrees)
   * @param {number} [options.lineHeight=26] Line height in pixels
   */
  constructor(options = {}) {
    this.radius = options.radius ?? 2.0;
    this.height = options.height ?? 1.0;
    this.radialSegments = options.radialSegments ?? 32;
    this.thetaLength = options.thetaLength ?? 0.6;
    this.lineHeight = options.lineHeight ?? 26;

    this.canvasWidth = 512;
    this.canvasHeight = 512;

    this.paddingLeft = 24;
    this.paddingRight = 24;
    this.paddingTop = 64;
    this.paddingBottom = 24;

    this.currentX = this.paddingLeft;
    this.currentY = this.paddingTop;
    this.currentColor = '#f1f5f9';
    this.backgroundColor = 'rgba(11, 14, 23, 0.94)';

    // 1. Create off-screen 512x512 HTML Canvas
    this.canvas = createCompatibleCanvas(this.canvasWidth, this.canvasHeight);
    this.ctx = this.canvas.getContext('2d');

    // 2. Map Canvas to THREE.CanvasTexture with NearestFilter for crisp retro pixel fonts
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    // Repeat and offset flip horizontally so inner concave cylinder face reads left-to-right
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.repeat.set(-1, 1);
    this.texture.offset.set(1, 0);

    // 3. Create THREE.CylinderGeometry (radius 2.0, height 1.0, radialSegments 32, thetaLength 0.6)
    // Centered around theta = 0 so the arc spans [-0.3, +0.3]
    this.geometry = new THREE.CylinderGeometry(
      this.radius,
      this.radius,
      this.height,
      this.radialSegments,
      1,
      true,
      -this.thetaLength / 2,
      this.thetaLength
    );
    this.geometry.center();

    // 4. Material and Mesh
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'SpatialCombatScroll';

    // Position mesh in xrRig camera space (lower-right quadrant, angled slightly inward)
    this.resetCameraSpaceTransform();
    this.mesh.visible = false;

    // Draw initial parchment frame and banner
    this.clear();
  }

  /**
   * Set lower-right quadrant position and inward angle in camera space.
   */
  resetCameraSpaceTransform() {
    // Camera-relative coordinates:
    // +X: to the right
    // -Y: downward (lower quadrant)
    // -Z: forward into the scene
    this.mesh.position.set(0.62, -0.38, -1.75);

    // Angled slightly inward towards player's eyes:
    // Y: turned slightly to face player head center (-16 degrees)
    // X: tilted slightly up towards eye level (-7 degrees)
    this.mesh.rotation.set(-0.12, -0.28, 0);

    // Scale to comfortable VR viewing proportions
    this.mesh.scale.set(0.72, 0.72, 0.72);
  }

  /**
   * Clears the parchment canvas and draws retro decorative border & header.
   */
  clear() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Background fill
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Gold parchment border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, this.canvasWidth - 12, this.canvasHeight - 12);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, this.canvasWidth - 20, this.canvasHeight - 20);

    // Header title
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText('⚔️ SKARA BRAE CHRONICLE', 22, 28);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText('1985 COMBAT NARRATIVE', 22, 46);

    ctx.strokeStyle = 'rgba(243, 207, 101, 0.4)';
    ctx.beginPath();
    ctx.moveTo(20, 52);
    ctx.lineTo(this.canvasWidth - 20, 52);
    ctx.stroke();

    this.currentX = this.paddingLeft;
    this.currentY = this.paddingTop;
    this.texture.needsUpdate = true;
  }

  /**
   * Begin receiving a new message string from MessageSpooler.
   * Advances to a fresh line and sets contextual color.
   * @param {string} message
   */
  startMessage(message) {
    if (this.currentX > this.paddingLeft) {
      this.newLine();
    }

    // Contextual CRPG palette
    const str = String(message || '');
    if (str.includes('slain') || str.includes('DEFEATED') || str.includes('DEAD') || str.includes('💀')) {
      this.currentColor = '#ef4444'; // Red for death / defeat
    } else if (str.includes('critical') || str.includes('damage') || str.includes('takes')) {
      this.currentColor = '#f87171'; // Light red for hit damage
    } else if (str.includes('plays') || str.includes('casts') || str.includes('Casting') || str.includes('Song') || str.includes('🎵')) {
      this.currentColor = '#c084fc'; // Purple for spells and bard songs
    } else if (str.includes('victory') || str.includes('awarded') || str.includes('XP') || str.includes('Gold') || str.includes('🏆')) {
      this.currentColor = '#facc15'; // Gold for victory rewards
    } else if (str.includes('face death') || str.includes('breathes') || str.includes('hesitates')) {
      this.currentColor = '#fb923c'; // Amber for danger
    } else {
      this.currentColor = '#f1f5f9'; // Crisp retro white
    }
  }

  /**
   * Write an incoming character from MessageSpooler using ctx.fillText().
   * Updates currentX and triggers text wrapping / canvas shifting as needed.
   * @param {string} char
   */
  writeChar(char) {
    if (!this.ctx || !char) return;

    if (char === '\n') {
      this.newLine();
      return;
    }

    this.ctx.font = 'bold 15px "Courier New", monospace';
    this.ctx.fillStyle = this.currentColor;
    this.ctx.textBaseline = 'alphabetic';

    const charMetrics = typeof this.ctx.measureText === 'function' ? this.ctx.measureText(char) : null;
    const charWidth = (charMetrics && charMetrics.width) || 9;

    // Check if character exceeds right margin
    if (this.currentX + charWidth > this.canvasWidth - this.paddingRight) {
      this.newLine();
    }

    // Write character
    this.ctx.fillText(char, this.currentX, this.currentY);
    this.currentX += charWidth;

    // texture.needsUpdate = true MUST be set every frame the canvas is mutated
    this.texture.needsUpdate = true;
  }

  /**
   * Advance to the next line. Shifts all pixels up if exceeding canvas height.
   */
  newLine() {
    this.currentX = this.paddingLeft;
    this.currentY += this.lineHeight;

    // When currentY exceeds the canvas height, execute ctx.drawImage(canvas, 0, -lineHeight)
    // to physically shift all pixels up.
    if (this.currentY > this.canvasHeight - this.paddingBottom) {
      this.scrollUp();
    }
  }

  /**
   * Physically shifts all canvas pixels up by lineHeight.
   */
  scrollUp() {
    if (!this.ctx) return;

    // Physically shift all pixels up by lineHeight
    this.ctx.drawImage(this.canvas, 0, -this.lineHeight);

    // Clear the bottom line using ctx.clearRect()
    this.ctx.clearRect(0, this.canvasHeight - this.lineHeight, this.canvasWidth, this.lineHeight);

    // Re-fill background for the bottom strip so parchment remains solid
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, this.canvasHeight - this.lineHeight, this.canvasWidth, this.lineHeight);

    // Re-stroke bottom borders
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(6, 6, this.canvasWidth - 12, this.canvasHeight - 12);

    this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(10, 10, this.canvasWidth - 20, this.canvasHeight - 20);

    // Maintain currentY on the bottom line
    this.currentY -= this.lineHeight;

    // Must set texture.needsUpdate = true
    this.texture.needsUpdate = true;
  }

  /**
   * Toggle visibility of the spatial scroll mesh.
   * @param {boolean} visible
   */
  setVisible(visible) {
    this.mesh.visible = !!visible;
  }

  /**
   * Dispose of WebGL resources.
   */
  dispose() {
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    if (this.texture) this.texture.dispose();
  }
}
