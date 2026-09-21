import * as THREE from 'three';

/**
 * SpatialInstructionWindow
 * Premium 3D floating Glassmorphism instruction & tutorial window.
 * Matches the beloved Grimoire Tutorial aesthetic:
 * - Translucent obsidian/violet backdrop with dual golden borders
 * - Radiant arcane header banners
 * - Animated 1985 pixel-art sprite portrait medallions
 * - Multi-page navigation (Next, Prev, Close)
 * - Spatially locks in world space directly in front of the player's view
 */
export class SpatialInstructionWindow {
  /**
   * @param {THREE.Scene} scene
   * @param {Object} [options]
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.onAction = options.onAction || null;

    this.group = new THREE.Group();
    this.group.name = 'SpatialInstructionWindow';
    this.group.visible = false;
    this.scene.add(this.group);

    this.active = false;
    this.timer = 0;
    this.autoDismissDuration = 0; // 0 = persistent until user closes / navigates

    this.currentData = null;
    this.currentPage = 0;
    this.portraitImages = new Map();
    this.buttons = [];

    this.initMesh();
  }

  initMesh() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 960;
    this.canvas.height = 600;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);

    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // 0.96m wide x 0.60m high floating panel
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.60), this.material);
    this.mesh.userData = { isSpatialInstructionMesh: true };
    this.group.add(this.mesh);
  }

  /**
   * Displays tutorial content with the glassmorphism aesthetic.
   * @param {Object} contentConfig
   * {
   *   title: string,
   *   subtitle: string,
   *   sprite: string,
   *   pages: Array<{ heading: string, text: string, bullets?: Array<{ icon: string, title: string, desc: string, color?: string }> }>,
   *   primaryButton?: { label: string, actionKey: string },
   *   autoDismissSeconds?: number
   * }
   * @param {THREE.Vector3} headPos
   * @param {THREE.Quaternion} headQuat
   */
  show(contentConfig, headPos, headQuat) {
    if (!contentConfig) return;

    this.currentData = contentConfig;
    this.currentPage = 0;
    this.autoDismissDuration = contentConfig.autoDismissSeconds || 0;
    this.timer = 0;
    this.active = true;
    this.group.visible = true;
    this.material.opacity = 0.0;

    // Position 0.95m directly in front of the player's view at eye level
    if (headPos && headQuat) {
      const forward = new THREE.Vector3(0, 0, -0.92).applyQuaternion(headQuat);
      this.group.position.copy(headPos).add(forward);
      this.group.lookAt(headPos);
    }

    this.renderCanvas();
  }

  hide() {
    this.active = false;
    this.group.visible = false;
    this.material.opacity = 0.0;
    this.currentData = null;
  }

  renderCanvas() {
    if (!this.ctx || !this.currentData) return;

    const ctx = this.ctx;
    const cw = 960;
    const ch = 600;
    ctx.clearRect(0, 0, cw, ch);
    this.buttons = [];

    const data = this.currentData;
    const pages = data.pages || [];
    const pageIdx = Math.min(this.currentPage, Math.max(0, pages.length - 1));
    const page = pages[pageIdx] || { heading: '', text: '' };

    // 1. Premium Glassmorphism Card Background
    ctx.fillStyle = 'rgba(15, 7, 32, 0.92)';
    ctx.beginPath();
    ctx.roundRect(10, 10, cw - 20, ch - 20, 24);
    ctx.fill();

    // Outer Gold Filigree Border
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Inner Subtle Violet/Gold Border
    ctx.strokeStyle = 'rgba(243, 207, 101, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(22, 22, cw - 44, ch - 44, 16);
    ctx.stroke();

    // 2. Header Glow Banner
    ctx.fillStyle = 'rgba(126, 34, 206, 0.45)';
    ctx.beginPath();
    ctx.roundRect(30, 30, cw - 60, 96, 14);
    ctx.fill();

    // Header Gold Divider
    ctx.strokeStyle = 'rgba(243, 207, 101, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Speaker / Concept Animated Sprite Portrait (Top Left in Banner)
    const hasSprite = !!data.sprite;
    if (hasSprite) {
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(44, 38, 80, 80);
      ctx.strokeStyle = '#f3cf65';
      ctx.lineWidth = 2;
      ctx.strokeRect(44, 38, 80, 80);

      if (this.portraitImages.has(data.sprite)) {
        const img = this.portraitImages.get(data.sprite);
        if (img && img.complete && img.naturalWidth > 0) {
          const fw = img.naturalWidth / 4;
          const fh = img.naturalHeight;
          ctx.drawImage(img, 2, 0, fw - 4, fh, 46, 40, 76, 76);
        }
      } else {
        const img = new Image();
        img.src = data.sprite;
        img.onload = () => {
          this.portraitImages.set(data.sprite, img);
          this.renderCanvas();
        };
        this.portraitImages.set(data.sprite, null);
      }
    }

    // 4. Header Titles
    const titleX = hasSprite ? 142 : cw / 2;
    const titleAlign = hasSprite ? 'left' : 'center';

    ctx.textAlign = titleAlign;
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillText(data.title.toUpperCase(), titleX, 74);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '15px sans-serif';
    ctx.fillText(data.subtitle || 'The Bard\'s Tale VR Interactive Guide', titleX, 106);

    // 5. Page Heading
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText(page.heading || '', 48, 168);

    // 6. Main Content Body or Structured Bullets
    if (page.bullets && page.bullets.length > 0) {
      let bulletY = 210;
      page.bullets.forEach((b) => {
        ctx.fillStyle = b.color || '#a855f7';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`${b.icon || '✨'} ${b.title}`, 48, bulletY);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '16px sans-serif';
        this.wrapText(ctx, b.desc, 48, bulletY + 26, cw - 96, 22);

        bulletY += 68;
      });
    } else if (page.text) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = '19px sans-serif';
      this.wrapText(ctx, page.text, 48, 215, cw - 96, 32);
    }

    // 7. Bottom Navigation Bar
    const totalPages = Math.max(1, pages.length);
    const navY = ch - 72;

    if (data.buttons && data.buttons.length > 0) {
      let btnRightX = cw - 170;
      // Close button on far right
      this.drawButton(ctx, btnRightX, navY, 130, 44, '✖️ Close', () => {
        this.hide();
      }, false);

      // Render custom buttons to the left of Close button
      let currX = btnRightX;
      for (let i = data.buttons.length - 1; i >= 0; i--) {
        const btnDef = data.buttons[i];
        const btnW = btnDef.width || 210;
        currX -= (btnW + 16);
        this.drawButton(ctx, currX, navY, btnW, 44, btnDef.label, () => {
          this.hide();
          if (this.onAction) this.onAction(btnDef.actionKey);
        }, !!btnDef.primary);
      }
    } else {
      // [ ⬅️ PREVIOUS PAGE ]
      if (pageIdx > 0) {
        this.drawButton(ctx, 48, navY, 140, 44, '⬅️ Previous', () => {
          this.currentPage = Math.max(0, this.currentPage - 1);
          this.renderCanvas();
        }, false);
      }

      // Page Number Indicator
      if (totalPages > 1) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Page ${pageIdx + 1} of ${totalPages}`, cw / 2, navY + 28);
      }

      // [ NEXT PAGE ➡️ ]
      if (pageIdx < totalPages - 1) {
        this.drawButton(ctx, cw - 360, navY, 140, 44, 'Next ➡️', () => {
          this.currentPage = Math.min(totalPages - 1, this.currentPage + 1);
          this.renderCanvas();
        }, true);
      } else if (data.primaryButton) {
        this.drawButton(ctx, cw - 380, navY, 160, 44, data.primaryButton.label, () => {
          this.hide();
          if (this.onAction) this.onAction(data.primaryButton.actionKey);
        }, true);
      }

      // [ ✖️ CLOSE / DISMISS ]
      this.drawButton(ctx, cw - 190, navY, 142, 44, '✖️ Close', () => {
        this.hide();
      }, false);
    }

    // Auto-dismiss countdown footer if timed
    if (this.autoDismissDuration > 0) {
      const remaining = Math.max(0, Math.ceil(this.autoDismissDuration - this.timer));
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Auto-dismissing in ${remaining}s...`, cw / 2, ch - 16);
    }

    this.texture.needsUpdate = true;
  }

  drawButton(ctx, x, y, w, h, label, action, isPrimary = false) {
    ctx.fillStyle = isPrimary ? '#f59e0b' : 'rgba(30, 41, 59, 0.9)';
    ctx.strokeStyle = isPrimary ? '#ffffff' : '#f3cf65';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isPrimary ? '#0f172a' : '#f3cf65';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + 28);

    this.buttons.push({ x, y, w, h, action });
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

  /**
   * Raycast UV click handler
   * @param {THREE.Vector2} uv
   * @returns {boolean} True if a button was clicked
   */
  handleClick(uv) {
    if (!uv || !this.active) return false;

    // Convert UV coordinates (0..1) to Canvas pixels (960 x 600)
    const px = uv.x * 960;
    const py = (1 - uv.y) * 600;

    for (const btn of this.buttons) {
      if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
        btn.action();
        return true;
      }
    }
    return false;
  }

  /**
   * Per-frame update for smooth fade-in/fade-out & auto-dismissal
   * @param {number} deltaTime
   */
  update(deltaTime) {
    if (!this.active) return;

    this.timer += deltaTime;

    // Smooth opacity fade in
    if (this.material.opacity < 0.98) {
      this.material.opacity = Math.min(1.0, this.material.opacity + deltaTime * 3.5);
    }

    // Auto-dismiss countdown if configured
    if (this.autoDismissDuration > 0 && this.timer >= this.autoDismissDuration) {
      this.hide();
    }
  }
}
