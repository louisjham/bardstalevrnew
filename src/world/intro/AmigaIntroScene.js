/**
 * AmigaIntroScene.js
 *
 * Amiga-style animated intro sequence replacing the 1980s Retro Room.
 * Renders a large VR-space quad (like a cinema screen) showing:
 *  - Animated Amiga Bard sprite (bt1_bard.png or bt1_01.png frames)
 *  - Scrolling story text narrating the fall of Skara Brae
 *  - 8-bit procedural music via BardSynth
 *
 * Pressing ANY controller button or keyboard key interrupts the animation
 * and shows a VR-space main menu (New Game / Continue / Options / Credits).
 *
 * WebXR + Desktop dual compatible.
 */

import * as THREE from 'three';

// ─── Story text for the intro scroll ────────────────────────────────────────
const INTRO_STORY_LINES = [
  '',
  '  THE BARD\'S TALE',
  '',
  '  In the kingdom of Skara Brae,',
  '  an age of darkness has fallen...',
  '',
  '  The Mad God Mangar the Dark',
  '  has cast an eternal winter',
  '  upon the city, trapping all',
  '  within its frozen walls.',
  '',
  '  His minions roam the streets',
  '  and dungeons, slaying all',
  '  who dare oppose him.',
  '',
  '  The city\'s heroes are dead.',
  '  Its temples lay silent.',
  '  Its taverns have grown cold.',
  '',
  '  Only one hope remains...',
  '',
  '  A company of adventurers,',
  '  bold enough to face the dark,',
  '  wise enough to find the way,',
  '  and strong enough to prevail.',
  '',
  '  Will YOU be that company?',
  '',
  '  The Bard raises his lute,',
  '  his song a beacon in the dark...',
  '',
  '  ~ Press any button to begin ~',
  '',
];

// ─── Amiga color palette (copper bars aesthetic) ─────────────────────────────
const COPPER_COLORS = [
  '#8b0000', '#a00020', '#b40040', '#c80060',
  '#dc0080', '#c800a0', '#b400c0', '#a000e0',
  '#8c00ff', '#7800e0', '#6400c0', '#5000a0',
];

// ─── Bard "singing" animation note sequence ──────────────────────────────────
const BARD_SONG_NOTES = [
  ['E4','G4','B4'],
  ['A4','C5','E5'],
  ['D4','F#4','A4'],
  ['G4','B4','D5'],
  ['C4','E4','G4'],
  ['F4','A4','C5'],
];

export class AmigaIntroScene {
  /**
   * @param {THREE.Scene} scene
   * @param {Function} onComplete   — called when "New Game" is selected
   * @param {object}   synth        — BardSynth instance
   * @param {object}   xrRig        — XRRig (for controller button listening)
   */
  constructor(scene, onComplete, synth, xrRig = null) {
    this.scene      = scene;
    this.onComplete = onComplete;
    this.synth      = synth;
    this.xrRig      = xrRig;

    this.group = new THREE.Group();
    this.group.name = 'AmigaIntroScene';
    this.group.visible = false;
    this.scene.add(this.group);

    // State
    this.isActive        = false;
    this.isMenuVisible   = false;
    this.scrollY         = 0;           // pixels scrolled so far
    this.elapsed         = 0;
    this.bardFrame       = 0;
    this.bardFrameTimer  = 0;
    this.bardAnimSpeed   = 0.45;        // seconds per frame
    this.copperAngle     = 0;
    this.songNoteIndex   = 0;
    this.songTimer       = 0;
    this.songInterval    = 1.8;         // seconds between note groups

    // Canvas dimensions
    this.W = 1024;
    this.H = 768;

    // DOM / texture refs
    this.canvas       = null;
    this.ctx          = null;
    this.texture      = null;
    this.screenMesh   = null;

    // Menu canvas refs
    this.menuCanvas   = null;
    this.menuCtx      = null;
    this.menuTexture  = null;
    this.menuMesh     = null;
    this.menuGroup    = new THREE.Group();
    this.menuGroup.name = 'AmigaMainMenu';
    this.menuGroup.visible = false;
    this.group.add(this.menuGroup);

    // Menu button hit areas (UV-space)
    this.menuButtons = [];
    this.hoveredButton = -1;

    // Bard sprite image
    this.bardImages = [];
    this.bardLoaded = false;

    // Background image (full screen Amiga intro art)
    this.bgImage   = null;
    this.bgLoaded  = false;

    // Overlay (fade)
    this.overlayOpacity = 1.0;
    this.fadingIn       = false;
    this.fadeTimer      = 0;
    this.fadeDuration   = 1.5;

    // Any-press interrupt listener
    this._keyListener     = null;
    this._buttonListener  = null;

    this._buildScreen();
    this._buildMenuOverlay();
    this._loadSprites();
  }

  // ─── Build main intro screen ────────────────────────────────────────────────
  _buildScreen() {
    this.canvas = document.createElement('canvas');
    this.canvas.width  = this.W;
    this.canvas.height = this.H;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    // Large cinema screen: 3.2m wide × 2.4m tall, 2.5m in front of player
    const geo = new THREE.PlaneGeometry(3.2, 2.4);
    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      side: THREE.FrontSide,
      transparent: false,
    });

    this.screenMesh = new THREE.Mesh(geo, mat);
    this.screenMesh.position.set(0, 1.4, -2.5);
    this.screenMesh.name = 'IntroScreen';
    this.group.add(this.screenMesh);

    // Interaction collider (for raycasting)
    const collGeo = new THREE.PlaneGeometry(3.2, 2.4);
    const collMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.FrontSide });
    this.interactionCollider = new THREE.Mesh(collGeo, collMat);
    this.interactionCollider.position.copy(this.screenMesh.position);
    this.interactionCollider.name = 'IntroScreenCollider';
    this.interactionCollider.userData.isIntroScreen = true;
    this.group.add(this.interactionCollider);

    // Dark ambient environment
    const ambient = new THREE.AmbientLight(0x111122, 0.3);
    this.group.add(ambient);

    // Subtle point light behind the screen for atmosphere
    const backlight = new THREE.PointLight(0x2244aa, 0.8, 8);
    backlight.position.set(0, 1.4, -2.2);
    this.group.add(backlight);
  }

  // ─── Build main menu VR overlay ─────────────────────────────────────────────
  _buildMenuOverlay() {
    const MW = 768;
    const MH = 512;

    this.menuCanvas = document.createElement('canvas');
    this.menuCanvas.width  = MW;
    this.menuCanvas.height = MH;
    this.menuCtx = this.menuCanvas.getContext('2d');

    this.menuTexture = new THREE.CanvasTexture(this.menuCanvas);
    this.menuTexture.minFilter = THREE.LinearFilter;
    this.menuTexture.magFilter = THREE.LinearFilter;

    const geo = new THREE.PlaneGeometry(2.4, 1.6);
    const mat = new THREE.MeshBasicMaterial({
      map: this.menuTexture,
      side: THREE.FrontSide,
      transparent: true,
    });

    this.menuMesh = new THREE.Mesh(geo, mat);
    this.menuMesh.position.set(0, 1.4, -2.49); // Slightly in front of screen
    this.menuMesh.name = 'MainMenuOverlay';
    this.menuMesh.userData.isMainMenu = true;
    this.menuGroup.add(this.menuMesh);

    // Interaction collider for menu
    const collGeo = new THREE.PlaneGeometry(2.4, 1.6);
    const collMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.FrontSide });
    this.menuCollider = new THREE.Mesh(collGeo, collMat);
    this.menuCollider.position.copy(this.menuMesh.position);
    this.menuCollider.name = 'MainMenuCollider';
    this.menuCollider.userData.isMainMenu = true;
    this.menuGroup.add(this.menuCollider);
  }

  // ─── Load Amiga sprite frames ────────────────────────────────────────────────
  _loadSprites() {
    // Load bard animation frames (bt1_bard.png is the main sprite)
    const bardSpriteUrls = [
      '/assets/sprites/bt1_bard.png',
      '/assets/sprites/bard.png',
      '/assets/sprites/bt1_01.png',
    ];

    // Try to load each bard image, use first that succeeds
    const tryLoad = (urls, index = 0) => {
      if (index >= urls.length) {
        this.bardLoaded = false;
        return;
      }
      const img = new Image();
      img.onload = () => {
        this.bardImages.push(img);
        this.bardLoaded = true;
        // Also try to load a second frame for animation
        if (index + 1 < urls.length) {
          const img2 = new Image();
          img2.onload = () => { this.bardImages.push(img2); };
          img2.src = urls[index + 1];
        }
      };
      img.onerror = () => tryLoad(urls, index + 1);
      img.src = urls[index];
    };
    tryLoad(bardSpriteUrls);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  setVisible(v) {
    this.group.visible = v;
  }

  /**
   * Begin the intro sequence.
   */
  start() {
    this.isActive       = true;
    this.isMenuVisible  = false;
    this.scrollY        = 0;
    this.elapsed        = 0;
    this.overlayOpacity = 1.0;
    this.fadingIn       = true;
    this.fadeTimer      = 0;
    this.bardFrame      = 0;
    this.copperAngle    = 0;
    this.group.visible  = true;
    this.menuGroup.visible = false;

    // Register any-button/key interrupt
    this._keyListener = (e) => {
      if (!this.isMenuVisible) {
        e.preventDefault();
        this._showMainMenu();
      }
    };
    window.addEventListener('keydown', this._keyListener, { once: false });

    // Start bard song
    if (this.synth) {
      this.synth.init();
      this._playNextNote();
    }
  }

  /**
   * Stop the scene and clean up listeners.
   */
  stop() {
    this.isActive = false;
    if (this._keyListener) {
      window.removeEventListener('keydown', this._keyListener);
      this._keyListener = null;
    }
  }

  /**
   * Called from main.js XR controller button events to interrupt the intro.
   */
  onControllerButton() {
    if (this.isActive && !this.isMenuVisible) {
      this._showMainMenu();
    }
  }

  /**
   * Handle raycaster UV click on the screen or menu.
   * @param {THREE.Vector2} uv
   * @param {Function} showToast
   */
  handleClick(uv, showToast) {
    if (!this.isActive) return;
    if (!this.isMenuVisible) {
      this._showMainMenu();
      return;
    }
    // Map UV to menu button
    const btnIdx = this._uvToMenuButton(uv);
    if (btnIdx >= 0) {
      this._selectMenuButton(btnIdx, showToast);
    }
  }

  /**
   * Update hover highlight on menu.
   * @param {THREE.Vector2} uv
   */
  handleHover(uv) {
    if (!this.isMenuVisible) return;
    const btnIdx = this._uvToMenuButton(uv);
    if (btnIdx !== this.hoveredButton) {
      this.hoveredButton = btnIdx;
      this._renderMenu();
    }
  }

  /**
   * Main update loop — called from main.js render loop.
   * @param {number} delta  seconds since last frame
   */
  update(delta) {
    if (!this.isActive) return;

    this.elapsed += delta;

    // Fade-in from black
    if (this.fadingIn) {
      this.fadeTimer += delta;
      this.overlayOpacity = Math.max(0, 1.0 - (this.fadeTimer / this.fadeDuration));
      if (this.overlayOpacity <= 0) {
        this.fadingIn = false;
      }
    }

    // Copper bar animation
    this.copperAngle += delta * 0.8;

    // Bard sprite animation
    this.bardFrameTimer += delta;
    if (this.bardFrameTimer >= this.bardAnimSpeed) {
      this.bardFrameTimer = 0;
      this.bardFrame = (this.bardFrame + 1) % Math.max(1, this.bardImages.length);
    }

    // Story text scroll (80 pixels/sec)
    if (!this.isMenuVisible) {
      this.scrollY += delta * 35;
    }

    // Procedural music
    this.songTimer += delta;
    if (this.songTimer >= this.songInterval) {
      this.songTimer = 0;
      this._playNextNote();
    }

    // Render the frame
    this._renderIntro();

    // If menu is visible, render menu on top
    if (this.isMenuVisible) {
      this._renderMenu();
    }

    this.texture.needsUpdate = true;
    if (this.isMenuVisible) this.menuTexture.needsUpdate = true;
  }

  // ─── Fade in from black ──────────────────────────────────────────────────────
  fadeInFromBlack(duration = 1500, onComplete = null) {
    this.overlayOpacity = 1.0;
    this.fadingIn = true;
    this.fadeTimer = 0;
    this.fadeDuration = duration / 1000;
    if (onComplete) {
      setTimeout(onComplete, duration);
    }
  }

  // ─── Rendering ───────────────────────────────────────────────────────────────

  _renderIntro() {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;

    // Deep space black background
    ctx.fillStyle = '#000008';
    ctx.fillRect(0, 0, W, H);

    // ── Amiga copper bar effect (horizontal color bands) ──────────────────────
    const numBars = 8;
    const barH = H / numBars;
    for (let i = 0; i < numBars; i++) {
      const colorIdx = Math.floor((i + Math.floor(this.copperAngle * 2)) % COPPER_COLORS.length);
      const color = COPPER_COLORS[Math.abs(colorIdx)];
      const gradient = ctx.createLinearGradient(0, i * barH, 0, (i + 1) * barH);
      gradient.addColorStop(0, color + '08');
      gradient.addColorStop(0.5, color + '18');
      gradient.addColorStop(1, color + '04');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, i * barH, W, barH);
    }

    // ── Starfield ────────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    // Use seeded positions (static stars)
    const stars = AmigaIntroScene._STARS;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(this.elapsed * s.speed + s.phase));
      ctx.globalAlpha = twinkle * 0.7;
      ctx.fillRect(s.x * W, s.y * H, s.size, s.size);
    }
    ctx.globalAlpha = 1.0;

    // ── Bard sprite (left side) ───────────────────────────────────────────────
    if (this.bardLoaded && this.bardImages.length > 0) {
      const frame = this.bardImages[this.bardFrame % this.bardImages.length];
      const bx = 30;
      const by = 60;
      const bw = 280;
      const bh = 380;

      // Glow behind bard
      const grd = ctx.createRadialGradient(bx + bw/2, by + bh/2, 20, bx + bw/2, by + bh/2, bw * 0.8);
      grd.addColorStop(0, 'rgba(120,60,200,0.25)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, bx + bw + 50, H);

      // Slight scale pulse
      const pulse = 1.0 + 0.015 * Math.sin(this.elapsed * 2.5);
      ctx.save();
      ctx.translate(bx + bw/2, by + bh/2);
      ctx.scale(pulse, pulse);
      ctx.translate(-(bx + bw/2), -(by + bh/2));
      ctx.drawImage(frame, bx, by, bw, bh);
      ctx.restore();

      // Musical note particles floating up from bard
      const noteCount = 5;
      for (let i = 0; i < noteCount; i++) {
        const t = ((this.elapsed * 0.7 + i * 0.4) % 2.5) / 2.5;
        const nx = bx + bw * 0.6 + Math.sin(i * 2.1 + this.elapsed) * 30;
        const ny = by + bh * 0.3 - t * 200;
        const na = 1.0 - t;
        ctx.globalAlpha = na * 0.85;
        ctx.fillStyle = '#ffdd88';
        ctx.font = `${16 + i * 3}px serif`;
        ctx.fillText(['♪','♫','♩','♬','♭'][i % 5], nx, ny);
      }
      ctx.globalAlpha = 1.0;
    } else {
      // Fallback: Draw a stylized bard silhouette
      ctx.fillStyle = 'rgba(100,50,180,0.6)';
      ctx.fillRect(60, 80, 180, 320);
      ctx.fillStyle = '#ffdd88';
      ctx.font = 'bold 80px serif';
      ctx.fillText('🎵', 80, 280);
    }

    // ── Title banner ──────────────────────────────────────────────────────────
    const titleX = 320;
    const titleY = 80;
    const titleW = W - titleX - 20;

    // Title gold gradient
    const titleGrad = ctx.createLinearGradient(titleX, titleY - 50, titleX, titleY + 10);
    titleGrad.addColorStop(0, '#ffe566');
    titleGrad.addColorStop(0.5, '#ffaa00');
    titleGrad.addColorStop(1, '#cc7700');

    ctx.shadowColor = 'rgba(200,100,0,0.8)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = titleGrad;
    ctx.font = 'bold 52px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText("THE BARD'S TALE", titleX + titleW / 2, titleY);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#aa8833';
    ctx.font = '20px "Courier New", monospace';
    ctx.fillText('Tales of the Unknown', titleX + titleW / 2, titleY + 32);

    // Decorative line under title
    ctx.strokeStyle = '#aa6600';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(titleX + 20, titleY + 48);
    ctx.lineTo(titleX + titleW - 20, titleY + 48);
    ctx.stroke();

    // ── Scrolling story text ──────────────────────────────────────────────────
    const textX = titleX;
    const textY = titleY + 70;
    const textW = titleW;
    const textH = H - textY - 20;

    // Clipping region for scroll area
    ctx.save();
    ctx.beginPath();
    ctx.rect(textX, textY, textW, textH);
    ctx.clip();

    const lineH = 28;
    const totalTextH = INTRO_STORY_LINES.length * lineH;
    // Loop when scrolled past all text
    const loopScroll = this.scrollY % (totalTextH + textH);
    const startY = textY + textH - loopScroll;

    ctx.font = '18px "Courier New", monospace';
    ctx.textAlign = 'center';

    for (let i = 0; i < INTRO_STORY_LINES.length; i++) {
      const ly = startY + i * lineH;
      if (ly < textY - lineH || ly > textY + textH + lineH) continue;

      const line = INTRO_STORY_LINES[i];
      // Color: gold for "important" lines, white for normal
      if (line.includes('THE BARD') || line.includes('Mangar') || line.includes('Will YOU')) {
        ctx.fillStyle = '#ffcc44';
        ctx.shadowColor = 'rgba(255,150,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.font = 'bold 20px "Courier New", monospace';
      } else if (line.includes('~ Press')) {
        // Blinking prompt
        const blink = Math.sin(this.elapsed * 3) > 0;
        ctx.fillStyle = blink ? '#88ffcc' : '#44aa88';
        ctx.shadowBlur = 4;
        ctx.font = 'bold 18px "Courier New", monospace';
      } else {
        ctx.fillStyle = '#ccddee';
        ctx.shadowBlur = 0;
        ctx.font = '18px "Courier New", monospace';
      }
      ctx.fillText(line, textX + textW / 2, ly);
    }

    ctx.shadowBlur = 0;
    ctx.restore(); // end clip

    // ── Bottom bar ────────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, H - 40, W, 40);
    ctx.fillStyle = 'rgba(80,40,160,0.4)';
    ctx.fillRect(0, H - 40, W, 2);

    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = '#6677aa';
    ctx.textAlign = 'left';
    ctx.fillText('© 1985 Interplay Productions  |  WebXR Adaptation', 16, H - 12);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#557766';
    ctx.fillText('Press any button to continue', W - 16, H - 12);
    ctx.textAlign = 'left';

    // ── Fade overlay ──────────────────────────────────────────────────────────
    if (this.overlayOpacity > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.overlayOpacity})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  _renderMenu() {
    const ctx = this.menuCtx;
    const MW = 768;
    const MH = 512;

    // Clear
    ctx.clearRect(0, 0, MW, MH);

    // ── Parchment-style background ────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, MH);
    bg.addColorStop(0, 'rgba(8,4,20,0.97)');
    bg.addColorStop(1, 'rgba(16,8,32,0.97)');
    ctx.fillStyle = bg;
    ctx.roundRect(20, 20, MW - 40, MH - 40, 16);
    ctx.fill();

    // Gold border
    ctx.strokeStyle = '#aa7700';
    ctx.lineWidth = 3;
    ctx.roundRect(20, 20, MW - 40, MH - 40, 16);
    ctx.stroke();

    // Inner gold border
    ctx.strokeStyle = 'rgba(180,120,0,0.4)';
    ctx.lineWidth = 1;
    ctx.roundRect(28, 28, MW - 56, MH - 56, 12);
    ctx.stroke();

    // ── Title ─────────────────────────────────────────────────────────────────
    ctx.textAlign = 'center';
    const titleGrad = ctx.createLinearGradient(0, 50, 0, 90);
    titleGrad.addColorStop(0, '#ffe566');
    titleGrad.addColorStop(1, '#cc8800');
    ctx.fillStyle = titleGrad;
    ctx.font = 'bold 38px "Courier New", monospace';
    ctx.shadowColor = 'rgba(255,150,0,0.8)';
    ctx.shadowBlur = 16;
    ctx.fillText("THE BARD'S TALE", MW / 2, 85);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#886644';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('Tales of the Unknown', MW / 2, 112);

    // Separator
    ctx.strokeStyle = '#664400';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 128);
    ctx.lineTo(MW - 60, 128);
    ctx.stroke();

    // ── Menu options ──────────────────────────────────────────────────────────
    const menuItems = [
      { label: '▶  NEW GAME',   key: 'new_game',  color: '#88ffcc', desc: 'Begin your adventure in Skara Brae' },
      { label: '■  CONTINUE',   key: 'continue',  color: '#aaddff', desc: 'Load a saved party' },
      { label: '⚙  OPTIONS',    key: 'options',   color: '#ddbbff', desc: 'Sound, display and gameplay settings' },
      { label: '✦  CREDITS',    key: 'credits',   color: '#ffeeaa', desc: 'The people behind the legend' },
    ];

    this.menuButtons = [];
    const startY = 155;
    const itemH   = 72;

    for (let i = 0; i < menuItems.length; i++) {
      const item = menuItems[i];
      const by   = startY + i * itemH;
      const bx   = 60;
      const bw   = MW - 120;
      const bh   = itemH - 10;

      const isHovered = this.hoveredButton === i;

      // Store button bounds in UV space (0..1)
      this.menuButtons.push({
        u0: bx / MW,
        v0: 1 - (by + bh) / MH,
        u1: (bx + bw) / MW,
        v1: 1 - by / MH,
        key: item.key,
        index: i,
      });

      // Button background
      if (isHovered) {
        const hGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
        hGrad.addColorStop(0, 'rgba(80,40,160,0.7)');
        hGrad.addColorStop(0.5, 'rgba(120,60,200,0.9)');
        hGrad.addColorStop(1, 'rgba(80,40,160,0.7)');
        ctx.fillStyle = hGrad;
      } else {
        ctx.fillStyle = 'rgba(20,10,40,0.6)';
      }
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();

      // Button border
      ctx.strokeStyle = isHovered ? '#aa66ff' : '#443366';
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.stroke();

      // Label
      ctx.font = `bold 22px "Courier New", monospace`;
      ctx.fillStyle = isHovered ? '#ffffff' : item.color;
      ctx.textAlign = 'left';
      ctx.shadowColor = isHovered ? 'rgba(180,100,255,0.8)' : 'transparent';
      ctx.shadowBlur = isHovered ? 10 : 0;
      ctx.fillText(item.label, bx + 24, by + 32);

      // Description
      ctx.font = '13px "Courier New", monospace';
      ctx.fillStyle = isHovered ? 'rgba(200,200,255,0.9)' : 'rgba(120,100,160,0.8)';
      ctx.shadowBlur = 0;
      ctx.fillText(item.desc, bx + 24, by + 52);
    }

    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';

    // ── Version footer ────────────────────────────────────────────────────────
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = '#443355';
    ctx.textAlign = 'center';
    ctx.fillText('Point and trigger to select • Any button to cancel', MW / 2, MH - 36);
  }

  // ─── Show main menu ──────────────────────────────────────────────────────────
  _showMainMenu() {
    this.isMenuVisible = true;
    this.menuGroup.visible = true;
    this.hoveredButton = -1;
    this._renderMenu();
    this.menuTexture.needsUpdate = true;
  }

  // ─── UV → button hit-test ─────────────────────────────────────────────────
  _uvToMenuButton(uv) {
    if (!uv) return -1;
    for (let i = 0; i < this.menuButtons.length; i++) {
      const b = this.menuButtons[i];
      if (uv.x >= b.u0 && uv.x <= b.u1 && uv.y >= b.v0 && uv.y <= b.v1) {
        return i;
      }
    }
    return -1;
  }

  // ─── Select a menu button ─────────────────────────────────────────────────
  _selectMenuButton(idx, showToast) {
    const keys = ['new_game', 'continue', 'options', 'credits'];
    const key = keys[idx];

    if (key === 'new_game') {
      this.stop();
      this.group.visible = false;
      if (this.onComplete) this.onComplete('new_game');
    } else if (key === 'continue') {
      if (showToast) showToast('📂 Continue: No saved parties found yet.');
    } else if (key === 'options') {
      if (showToast) showToast('⚙ Options: Coming soon!');
    } else if (key === 'credits') {
      if (showToast) showToast('✦ The Bard\'s Tale VR — WebXR Adaptation  |  Original: Interplay 1985');
    }
  }

  // ─── Play next bard note group ────────────────────────────────────────────
  _playNextNote() {
    if (!this.synth) return;
    const notes = BARD_SONG_NOTES[this.songNoteIndex % BARD_SONG_NOTES.length];
    this.synth.playSequence(notes, 300);
    this.songNoteIndex++;
  }

  /**
   * Expose interactable objects for raycasting from main.js
   * Returns both the screen and the menu collider.
   */
  get interactableObjects() {
    const objs = [this.interactionCollider];
    if (this.isMenuVisible) objs.push(this.menuCollider);
    return objs;
  }
}

// ─── Static star field (generated once, reused every frame) ──────────────────
AmigaIntroScene._STARS = (() => {
  const stars = [];
  const rng = (() => { let s = 42; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }; })();
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: rng(),
      y: rng(),
      size: rng() < 0.85 ? 1 : 2,
      speed: 0.5 + rng() * 1.5,
      phase: rng() * Math.PI * 2,
    });
  }
  return stars;
})();
