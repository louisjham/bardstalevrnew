import * as THREE from 'three';
import { getKnownSpells, getSpellsBySchoolAndLevel, SpellSchool } from '../../data/SpellDatabase.js';
import { BardSongs } from '../../data/BardSongs.js';
import { getXPForNextLevel } from '../../data/RaceClassData.js';
import { getSpriteSheetPath } from '../../data/MonsterSpriteManifest.js';

export class PalmBookMenu {
  constructor(scene, camera, onSpellTested, onRestartGame = null) {
    this.scene = scene;
    this.camera = camera;
    this.onSpellTested = onSpellTested;
    this.onRestartGame = onRestartGame;
    this.portraitImages = new Map();

    this.isOpen = false;
    this.bookGroup = new THREE.Group();
    this.bookGroup.visible = false;

    this.currentPage = 1; // 1: Heroes, 2: Automap, 3: Spells
    this.inspectedHeroIndex = null; // null or 0..3 for detailed inspection view

    this.leftPalmState = 'DOWN';
    this.activeHand = null;
    this.party = [];
    this.skaraBraeGrid = null;
    this.summonProgress = 0.0;
    this.animState = 'CLOSED'; // 'CLOSED', 'SUMMONING', 'OPEN', 'DISPELLING'
    this.animProgress = 0.0;   // 0.0 = completely closed, 1.0 = fully summoned & open
    this.lastHandPos = new THREE.Vector3();
    this.lastDirToHead = new THREE.Vector3(0, 0, 1);
    this.enabled = false; // Suppressed until entering Garth's Shop

    // Interactive button bounding regions on the book canvas
    this.canvasButtons = [];

    this.initBookMesh();
    this.scene.add(this.bookGroup);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && this.isOpen) {
      this.toggleBook(false);
      this.leftPalmState = 'DOWN';
    }
  }

  initBookMesh() {
    // 3D Leather Grimoire Cover & Parchment Pages (Calibrated Grimoire Spread: 0.60m W x 0.42m H - 25% scaled down)
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x4c1d95, roughness: 0.5 }); // Deep Royal Purple
    const pageMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8 });  // Aged Parchment
    const goldTrim = new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.8, roughness: 0.2 });

    // Covers (0.30m x 0.42m each side = 0.60m total cover width)
    const leftCover = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.42, 0.016), coverMat);
    leftCover.position.set(-0.15, 0, 0);
    this.bookGroup.add(leftCover);

    const rightCover = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.42, 0.016), coverMat);
    rightCover.position.set(0.15, 0, 0);
    this.bookGroup.add(rightCover);

    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.42), goldTrim);
    spine.position.set(0, 0, -0.01);
    this.bookGroup.add(spine);

    // Book Pages (0.285m x 0.40m each side)
    const leftPages = new THREE.Mesh(new THREE.BoxGeometry(0.285, 0.40, 0.02), pageMat);
    leftPages.position.set(-0.145, 0, 0.012);
    this.bookGroup.add(leftPages);

    const rightPages = new THREE.Mesh(new THREE.BoxGeometry(0.285, 0.40, 0.02), pageMat);
    rightPages.position.set(0.145, 0, 0.012);
    this.bookGroup.add(rightPages);

    // High Resolution Retina Canvas for 2-Page Spread (1280 x 840)
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 840;
      this.pageCtx = canvas.getContext('2d');
      this.pageTexture = new THREE.CanvasTexture(canvas);
    } else {
      this.pageCtx = null;
      this.pageTexture = new THREE.Texture();
    }

    const pageTextMat = new THREE.MeshBasicMaterial({
      map: this.pageTexture,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.textMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.57, 0.40), pageTextMat);
    this.textMesh.position.set(0, 0, 0.025);
    this.bookGroup.add(this.textMesh);

    this.renderBook();
  }

  setGridReference(grid) {
    this.skaraBraeGrid = grid;
  }

  updatePartyData(party) {
    this.party = party || [];
    this.renderBook();
  }

  renderBook() {
    if (!this.pageCtx) return;
    const ctx = this.pageCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 1280, 840);
    ctx.scale(2, 2);
    this.canvasButtons = [];

    // Background Book Spine Line
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(320, 10);
    ctx.lineTo(320, 410);
    ctx.stroke();

    // Top Navigation Tabs: [ Page 1: Heroes ] [ Page 2: Automap ] [ Page 3: Spells ] ... [ 🔄 C64 Desk ]
    this.drawTab(ctx, 20, 10, 95, 30, '1. Heroes', this.currentPage === 1);
    this.drawTab(ctx, 120, 10, 95, 30, '2. Automap', this.currentPage === 2);
    this.drawTab(ctx, 220, 10, 95, 30, '3. Spells', this.currentPage === 3);

    // Top Right Restart / Return to C64 Desk Button
    this.drawRestartTab(ctx, 510, 10, 110, 30);

    // Page Content Rendering
    if (this.currentPage === 1) {
      if (this.inspectedHeroIndex !== null && this.party[this.inspectedHeroIndex]) {
        this.renderHeroDetailView(ctx, this.party[this.inspectedHeroIndex]);
      } else {
        this.renderHeroListView(ctx);
      }
    } else if (this.currentPage === 2) {
      this.renderAutomapView(ctx);
    } else if (this.currentPage === 3) {
      this.renderSpellsView(ctx);
    }

    this.pageTexture.needsUpdate = true;
  }

  drawRestartTab(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(185, 28, 28, 0.85)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔄 C64 Desk', x + w / 2, y + 20);

    this.canvasButtons.push({
      x, y, w, h,
      action: () => {
        if (this.onRestartGame) {
          this.onRestartGame();
        }
      }
    });
  }

  drawTab(ctx, x, y, w, h, label, isActive) {
    ctx.fillStyle = isActive ? '#f3cf65' : 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isActive ? '#0f172a' : '#f3cf65';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + 20);

    this.canvasButtons.push({
      x, y, w, h,
      action: () => {
        const pageNum = parseInt(label.charAt(0));
        this.currentPage = pageNum;
        this.inspectedHeroIndex = null;
        this.renderBook();
      }
    });
  }

  // Handle Raycasting Pointer Clicks on Book Canvas Buttons
  handleCanvasClick(uv, showToast) {
    if (!uv) return;

    // Convert UV coordinates (0..1) to Canvas pixels (640 x 420)
    const px = uv.x * 640;
    const py = (1 - uv.y) * 420;

    this.canvasButtons.forEach(btn => {
      if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
        btn.action();
      }
    });
  }

  /**
   * Evaluates if a given VR controller or hand is supinating / palm turned upwards towards head
   */
  _checkControllerPalmUp(controller, isLeftHand, headPos) {
    if (!controller) return { isPalmUp: false, isPalmDown: true, handPos: null, dirToHead: null };

    const handPos = new THREE.Vector3();
    if (controller.joints && controller.joints['wrist'] && typeof controller.joints['wrist'].getWorldPosition === 'function') {
      controller.joints['wrist'].getWorldPosition(handPos);
    } else {
      controller.getWorldPosition(handPos);
    }

    const handQuat = new THREE.Quaternion();
    controller.getWorldQuaternion(handQuat);

    // Vector from hand to head
    const dirToHead = headPos.clone().sub(handPos).normalize();
    const distToHead = handPos.distanceTo(headPos);

    // Hand should be within comfortable viewing distance (0.12m to 1.10m from head)
    if (distToHead < 0.12 || distToHead > 1.10) {
      return { isPalmUp: false, isPalmDown: true, handPos, dirToHead };
    }

    // Palm surface normal in controller/hand local coordinates:
    // When turning hand over from palm down to palm up facing ceiling/head:
    // Left hand palm faces +X (inward to the right) and +Y (tilted up)
    // Right hand palm faces -X (inward to the left) and +Y (tilted up)
    const localPalm = isLeftHand 
      ? new THREE.Vector3(0.7, 0.6, 0.2).normalize()
      : new THREE.Vector3(-0.7, 0.6, 0.2).normalize();

    const palmNormalWorld = localPalm.applyQuaternion(handQuat);
    const topVectorWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(handQuat);

    const palmUpDot = palmNormalWorld.y;
    const palmHeadDot = palmNormalWorld.dot(dirToHead);
    const topUpDot = topVectorWorld.y;
    const topHeadDot = topVectorWorld.dot(dirToHead);

    const upScore = Math.max(palmUpDot, topUpDot * 0.85);
    const headScore = Math.max(palmHeadDot, topHeadDot * 0.85);

    // Hysteresis thresholds for natural gesture
    // Turning hand over at regular speed from palm down -> palm up
    const isPalmUp = upScore > 0.28 && headScore > 0.12;
    const isPalmDown = upScore < 0.14 || headScore < 0.06;

    return { isPalmUp, isPalmDown, handPos, dirToHead };
  }

  /**
   * Update gesture and drive summoning / dispelling animations per frame.
   * Turning hand from Palm Down -> Palm Up plays summoning animation.
   * Dropping Palm Up pose plays dispelling animation.
   */
  updateGesture(leftController, rightController = null, onHaptics = null, deltaTime = 0.016, hands = null) {
    const dt = Math.min(deltaTime || 0.016, 0.1);

    if (!this.enabled) {
      if (this.isOpen || this.animState !== 'CLOSED') {
        this.isOpen = false;
        this.animState = 'CLOSED';
        this.animProgress = 0.0;
        this.bookGroup.visible = false;
        this.leftPalmState = 'DOWN';
      }
      return;
    }

    const headPos = new THREE.Vector3();
    this.camera.getWorldPosition(headPos);

    // Prefer active hand tracking if provided, else fallback to controllers
    const leftSource = (hands && hands[0]) || leftController;
    const rightSource = (hands && hands[1]) || rightController;

    const leftCheck = this._checkControllerPalmUp(leftSource, true, headPos);
    const rightCheck = this._checkControllerPalmUp(rightSource, false, headPos);

    let activeCheck = null;
    let isLeft = true;

    if (leftCheck.isPalmUp) {
      activeCheck = leftCheck;
      isLeft = true;
    } else if (rightCheck.isPalmUp) {
      activeCheck = rightCheck;
      isLeft = false;
    } else if (this.leftPalmState === 'UP') {
      activeCheck = this.activeHand === 'right' ? rightCheck : leftCheck;
    } else {
      activeCheck = leftCheck;
    }

    // Gesture State Machine:
    // From Palm Down -> Turn hand over to Palm Up -> Trigger Summoning Animation
    // From Palm Up -> Drop hand pose -> Trigger Dispelling Animation
    if (activeCheck && activeCheck.isPalmUp) {
      if (this.leftPalmState !== 'UP') {
        this.leftPalmState = 'UP';
        this.activeHand = isLeft ? 'left' : 'right';
        this.animState = 'SUMMONING';
        this.isOpen = true;
        this.bookGroup.visible = true;
        this.renderBook();

        if (activeCheck.handPos) {
          this.lastHandPos.copy(activeCheck.handPos);
          if (activeCheck.dirToHead) this.lastDirToHead.copy(activeCheck.dirToHead);
        }

        if (onHaptics) onHaptics(0.4, 80);
      }
    } else if (activeCheck && activeCheck.isPalmDown) {
      if (this.leftPalmState === 'UP') {
        this.leftPalmState = 'DOWN';
        this.activeHand = null;
        this.animState = 'DISPELLING';
        if (onHaptics) onHaptics(0.2, 40);
      }
    }

    if (activeCheck && activeCheck.handPos) {
      this.lastHandPos.copy(activeCheck.handPos);
      if (activeCheck.dirToHead) this.lastDirToHead.copy(activeCheck.dirToHead);
    }

    // Process Summoning & Dispelling Animations
    if (this.animState === 'SUMMONING') {
      this.animProgress = Math.min(1.0, this.animProgress + dt * 3.0); // ~0.33s smooth summon animation
      const t = 1 - Math.pow(1 - this.animProgress, 3); // Ease-out cubic

      // Hand origin position (where the book materializes just above palm)
      const handHoverPos = this.lastHandPos.clone().add(new THREE.Vector3(0, 0.08, 0)).addScaledVector(this.lastDirToHead, 0.04);
      // Ergonomic reading position in front of face (~0.68m from eyes, lowered 8cm)
      const readingPos = headPos.clone().addScaledVector(this.lastDirToHead, -0.68).add(new THREE.Vector3(0, -0.08, 0));

      const targetPos = new THREE.Vector3().lerpVectors(handHoverPos, readingPos, t);
      const currentScale = THREE.MathUtils.lerp(0.08, 1.0, t);

      this.bookGroup.position.lerp(targetPos, 0.28);
      this.bookGroup.scale.set(currentScale, currentScale, currentScale);
      this.bookGroup.lookAt(headPos);

      if (this.animProgress >= 1.0) {
        this.animState = 'OPEN';
        this.bookGroup.scale.set(1.0, 1.0, 1.0);
      }
    } else if (this.animState === 'OPEN') {
      // While open and held up, track comfortable reading position (0.68m)
      const readingPos = headPos.clone().addScaledVector(this.lastDirToHead, -0.68).add(new THREE.Vector3(0, -0.08, 0));
      this.bookGroup.position.lerp(readingPos, 0.22);
      this.bookGroup.scale.set(1.0, 1.0, 1.0);
      this.bookGroup.lookAt(headPos);
    } else if (this.animState === 'DISPELLING') {
      this.animProgress = Math.max(0.0, this.animProgress - dt * 3.8); // ~0.26s smooth dispel animation
      const t = Math.pow(this.animProgress, 2); // Ease-in quad

      const handHoverPos = this.lastHandPos.clone().add(new THREE.Vector3(0, 0.06, 0));
      const readingPos = headPos.clone().addScaledVector(this.lastDirToHead, -0.68).add(new THREE.Vector3(0, -0.08, 0));

      const targetPos = new THREE.Vector3().lerpVectors(handHoverPos, readingPos, t);
      const currentScale = THREE.MathUtils.lerp(0.02, 1.0, t);

      this.bookGroup.position.lerp(targetPos, 0.35);
      this.bookGroup.scale.set(currentScale, currentScale, currentScale);
      this.bookGroup.lookAt(headPos);

      if (this.animProgress <= 0.001) {
        this.animState = 'CLOSED';
        this.isOpen = false;
        this.bookGroup.visible = false;
        this.bookGroup.scale.set(0.001, 0.001, 0.001);
      }
    }
  }

  toggleBook(open, handPos = null, headPos = null) {
    if (!this.enabled && open) return;
    this.isOpen = open;
    if (open) {
      this.animState = 'SUMMONING';
      this.animProgress = 0.0;
      this.bookGroup.visible = true;
      this.renderBook();
      if (handPos && headPos) {
        this.lastHandPos.copy(handPos);
        const dirToHead = headPos.clone().sub(handPos).normalize();
        this.lastDirToHead.copy(dirToHead);
        const initialPos = handPos.clone().add(new THREE.Vector3(0, 0.08, 0)).addScaledVector(dirToHead, 0.04);
        this.bookGroup.position.copy(initialPos);
        this.bookGroup.scale.set(0.08, 0.08, 0.08);
        this.bookGroup.lookAt(headPos);
      }
    } else {
      this.animState = 'DISPELLING';
    }
  }

  /**
   * Toggle the 3D Grimoire in Desktop / Gamepad / VR Button mode.
   * Floating directly in front of the player camera at ergonomic reading distance.
   * @param {boolean|null} [open=null]
   */
  toggleBookDesktop(open = null) {
    if (!this.enabled) {
      if (this.isOpen || this.animState !== 'CLOSED') {
        this.isOpen = false;
        this.animState = 'CLOSED';
        this.animProgress = 0.0;
        this.bookGroup.visible = false;
        this.leftPalmState = 'DOWN';
      }
      return;
    }
    const nextState = open !== null ? open : !this.isOpen;
    this.isOpen = nextState;
    if (nextState) {
      this.animState = 'OPEN';
      this.animProgress = 1.0;
      this.bookGroup.visible = true;
      this.leftPalmState = 'BUTTON_OPEN';
      this.renderBook();
      this.positionInFrontOfCamera();
    } else {
      this.animState = 'CLOSED';
      this.animProgress = 0.0;
      this.bookGroup.visible = false;
      this.leftPalmState = 'DOWN';
    }
  }

  positionInFrontOfCamera() {
    // 0.68m in front of camera, slightly lowered, facing camera
    const headPos = new THREE.Vector3();
    const headQuat = new THREE.Quaternion();
    this.camera.getWorldPosition(headPos);
    this.camera.getWorldQuaternion(headQuat);

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(headQuat);
    const targetPos = headPos.clone().addScaledVector(fwd, 0.68).add(new THREE.Vector3(0, -0.08, 0));
    this.bookGroup.position.copy(targetPos);
    this.bookGroup.scale.set(1.0, 1.0, 1.0);
    this.bookGroup.lookAt(headPos);
  }

  updateDesktop() {
    if (this.isOpen && this.leftPalmState !== 'UP') {
      this.positionInFrontOfCamera();
    }
  }

  nextPage() {
    this.currentPage = (this.currentPage % 3) + 1;
    this.inspectedHeroIndex = null;
    this.renderBook();
  }

  prevPage() {
    this.currentPage = this.currentPage === 1 ? 3 : this.currentPage - 1;
    this.inspectedHeroIndex = null;
    this.renderBook();
  }

  setPage(pageNum) {
    if (pageNum >= 1 && pageNum <= 3) {
      this.currentPage = pageNum;
      this.inspectedHeroIndex = null;
      this.renderBook();
    }
  }

  // PAGE 1: HERO LIST VIEW (2 Heroes per Page Spread)
  renderHeroListView(ctx) {
    ctx.fillStyle = '#3b0764';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('📜 ACTIVE PARTY HEROES', 30, 70);

    const defaultParty = [
      { name: 'Elric', race: 'Human', class: 'Paladin', st: 17, iq: 12, dx: 15, cn: 16, lk: 14, hp: 28, maxHp: 28, status: 'OK', xp: 1420, gold: 120, spells: ['Light'], inventory: ['Broadsword', 'Iron Shield'] },
      { name: 'Gaelen', race: 'Elf', class: 'Bard', st: 14, iq: 15, dx: 17, cn: 13, lk: 16, hp: 16, maxHp: 22, status: 'POISONED', xp: 1100, gold: 85, spells: ['Sir Robin Tune'], inventory: ['Lute', 'Leather Vest'] },
      { name: 'Shadow', race: 'Hobbit', class: 'Rogue', st: 11, iq: 14, dx: 18, cn: 12, lk: 18, hp: 19, maxHp: 19, status: 'CURSED', xp: 980, gold: 210, spells: ['Lockpick'], inventory: ['Dagger', 'Cloak'] },
      { name: 'Kael', race: 'Half-Elf', class: 'Wizard', st: 10, iq: 18, dx: 15, cn: 14, lk: 15, hp: 12, maxHp: 18, status: 'DAMAGED', xp: 1650, gold: 140, spells: ['Mage Flame', 'Air Armor'], inventory: ['Oak Staff', 'Robe'] }
    ];

    const heroes = this.party.length > 0 ? this.party : defaultParty;

    heroes.slice(0, 4).forEach((hero, idx) => {
      const isRightPage = idx >= 2;
      const x = isRightPage ? 350 : 30;
      const y = 90 + (idx % 2) * 150;

      // Hero Card Container
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = '#f3cf65';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, 260, 135, 10);
      ctx.fill();
      ctx.stroke();

      // Dynamic State Portrait
      this.drawHeroPortrait(ctx, x + 12, y + 15, 65, 80, hero);

      // Hero Basic Info
      ctx.fillStyle = '#f3cf65';
      ctx.font = 'bold 16px Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText(hero.name, x + 90, y + 32);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px sans-serif';
      ctx.fillText(`${hero.race} ${hero.class}`, x + 90, y + 54);

      ctx.fillStyle = '#10b981';
      ctx.fillText(`HP: ${hero.hp}/${hero.maxHp || hero.hp}`, x + 90, y + 74);

      // Status Badge
      this.drawStatusBadge(ctx, x + 90, y + 84, hero.status);

      // Tap Card to Inspect
      this.canvasButtons.push({
        x, y, w: 260, h: 135,
        action: () => {
          this.inspectedHeroIndex = idx;
          this.renderBook();
        }
      });
    });
  }

  // PAGE 1 (DETAILED HERO INSPECTION VIEW OVER BOTH PAGES)
  renderHeroDetailView(ctx, hero) {
    // Back & Exit Buttons
    this.drawTab(ctx, 30, 50, 75, 28, '⬅️ Back', false);
    this.canvasButtons.push({
      x: 30, y: 50, w: 75, h: 28,
      action: () => { this.inspectedHeroIndex = null; this.renderBook(); }
    });

    // LEFT PAGE: Portrait, Name, Attributes & Status
    ctx.fillStyle = '#3b0764';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText(hero.name.toUpperCase(), 120, 72);

    this.drawHeroPortrait(ctx, 30, 95, 110, 130, hero);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Class: ${hero.race} ${hero.class} (Lvl ${hero.level || 1})`, 160, 115);
    ctx.fillText(`XP: ${(hero.xp || 0).toLocaleString()} / ${getXPForNextLevel(hero.class, hero.level || 1).toLocaleString()}`, 160, 140);
    ctx.fillText(`Gold: ${(hero.gold || 0).toLocaleString()} GP`, 160, 165);
    this.drawStatusBadge(ctx, 160, 175, hero.status);

    // Attributes Box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(30, 245, 250, 135);
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText('CHARACTER ATTRIBUTES', 45, 270);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '14px monospace';
    ctx.fillText(`ST: ${hero.st || 15}  IQ: ${hero.iq || 14}  DX: ${hero.dx || 16}`, 45, 305);
    ctx.fillText(`CN: ${hero.cn || 14}  LK: ${hero.lk || 15}`, 45, 335);

    // RIGHT PAGE: Equipped Gear & Backpack
    ctx.fillStyle = '#3b0764';
    ctx.font = 'bold 18px Georgia, serif';
    ctx.fillText('⚔️ EQUIPPED GEAR', 350, 72);

    const eq = hero.equipped || {};
    const equipLines = [
      `Wpn: ${eq.weapon ? (eq.weapon.name || eq.weapon) : 'Fists'}`,
      `Shld: ${eq.shield ? (eq.shield.name || eq.shield) : 'None'}`,
      `Armr: ${eq.armor ? (eq.armor.name || eq.armor) : 'None (AC 10)'}`,
      `Helm: ${eq.helm ? (eq.helm.name || eq.helm) : 'None'}`,
      `Glvs: ${eq.gloves ? (eq.gloves.name || eq.gloves) : 'None'}`
    ];
    if (eq.instrument) equipLines.push(`Inst: ${eq.instrument.name || eq.instrument}`);

    equipLines.forEach((line, i) => {
      ctx.fillStyle = '#fef08a';
      ctx.font = '13px sans-serif';
      ctx.fillText(`• ${line}`, 350, 95 + i * 20);
    });

    ctx.fillStyle = '#3b0764';
    ctx.font = 'bold 18px Georgia, serif';
    ctx.fillText('🎒 BACKPACK ITEMS', 350, 220);

    const inv = hero.inventory || [];
    if (inv.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 13px sans-serif';
      ctx.fillText('(Backpack is empty)', 350, 245);
    } else {
      inv.slice(0, 5).forEach((item, i) => {
        const itemName = typeof item === 'string' ? item : item.name;
        ctx.fillStyle = '#f8fafc';
        ctx.font = '13px sans-serif';
        ctx.fillText(`• ${itemName}`, 350, 245 + i * 20);
      });
    }

    ctx.fillStyle = '#3b0764';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.fillText('✨ SPELLS / TUNES', 350, 350);

    const spells = hero.spells || (hero.class === 'Bard' ? ["Sir Robin Tune"] : ['Mage Flame', 'Air Armor']);
    spells.slice(0, 2).forEach((sp, i) => {
      ctx.fillStyle = '#c084fc';
      ctx.font = '13px sans-serif';
      ctx.fillText(`• ${sp}`, 350, 372 + i * 18);
    });
  }

  // DYNAMIC HERO PORTRAIT REFLECTING 8 CANONICAL BT1 CONDITIONS (ALIVE, POIS, OLD, DEAD, STON, PARA, POSS, NUTS)
  drawHeroPortrait(ctx, x, y, w, h, hero) {
    const rawStatus = (hero.condition || hero.status || 'ALIVE').toUpperCase();
    const isDead = rawStatus === 'DEAD' || (hero.hp <= 0 && hero.hp !== undefined);
    const status = isDead ? 'DEAD' :
                   (rawStatus === 'POIS' || rawStatus === 'POISONED') ? 'POIS' :
                   (rawStatus === 'OLD' || rawStatus === 'WITHERED') ? 'OLD' :
                   (rawStatus === 'PARA' || rawStatus === 'PARALYZED') ? 'PARA' :
                   (rawStatus === 'POSS' || rawStatus === 'POSSESSED') ? 'POSS' :
                   (rawStatus === 'NUTS' || rawStatus === 'INSANE') ? 'NUTS' :
                   (rawStatus === 'STON' || rawStatus === 'STONED') ? 'STON' :
                   (hero.hp < (hero.maxHp || hero.hp)) ? 'DAMAGED' : 'ALIVE';

    // Portrait Background Frame
    ctx.fillStyle = status === 'DEAD' ? '#090d16' : '#1e1b4b';
    ctx.fillRect(x, y, w, h);

    // Draw Authentic 1985 Sprite Portrait
    const spritePath = getSpriteSheetPath(hero.class || hero.race || 'warrior');
    let imageDrawn = false;
    if (spritePath) {
      if (this.portraitImages.has(spritePath)) {
        const cachedImg = this.portraitImages.get(spritePath);
        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
          const frameW = cachedImg.naturalWidth / 4;
          const frameH = cachedImg.naturalHeight;
          ctx.drawImage(cachedImg, 2, 0, frameW - 4, frameH, x + 2, y + 2, w - 4, h - 4);
          imageDrawn = true;
        }
      } else {
        // Start async pre-load
        const img = new Image();
        img.src = spritePath;
        img.onload = () => {
          this.portraitImages.set(spritePath, img);
          this.renderBook();
        };
        this.portraitImages.set(spritePath, null);
      }
    }

    // Fallback silhouette if image not yet loaded
    if (!imageDrawn) {
      ctx.fillStyle = status === 'STON' ? '#64748b' : status === 'DEAD' ? '#475569' : '#fde047';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.4, w * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dynamic State Overlay Effects
    if (status === 'DEAD') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('💀 DEAD', x + 5, y + h - 10);
    } else if (status === 'POIS') {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('☠️ POIS', x + 5, y + h - 10);
    } else if (status === 'PARA') {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('⚡ PARA', x + 5, y + h - 10);
    } else if (status === 'POSS') {
      ctx.fillStyle = 'rgba(225, 29, 72, 0.55)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('😈 POSS', x + 5, y + h - 10);
    } else if (status === 'NUTS') {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('🌀 NUTS', x + 5, y + h - 10);
    } else if (status === 'OLD') {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.45)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#fb923c';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('🍂 OLD', x + 5, y + h - 10);
    } else if (status === 'STON') {
      ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('🗿 STON', x + 5, y + h - 10);
    } else if (status === 'DAMAGED') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('🩸 HURT', x + 5, y + h - 10);
    }
  }

  drawStatusBadge(ctx, x, y, status) {
    const s = String(status || 'ALIVE').toUpperCase();
    const col = s === 'DEAD' ? '#ef4444' :
                (s === 'POIS' || s === 'POISONED') ? '#22c55e' :
                (s === 'PARA' || s === 'PARALYZED') ? '#facc15' :
                (s === 'POSS' || s === 'POSSESSED') ? '#f43f5e' :
                (s === 'NUTS' || s === 'INSANE') ? '#a855f7' :
                (s === 'OLD' || s === 'WITHERED') ? '#f97316' :
                (s === 'STON' || s === 'STONED') ? '#94a3b8' :
                s === 'DAMAGED' ? '#ef4444' : '#10b981';
    ctx.fillStyle = col;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`STATUS: ${s}`, x, y + 14);
  }

  // PAGE 2: DIEGETIC AUTOMAP (Draws exploration grid, labels locations)
  renderAutomapView(ctx) {
    ctx.fillStyle = '#3b0764';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('🗺️ SKARA BRAE DIEGETIC AUTOMAP', 30, 65);

    // Automap Render Frame
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(30, 80, 260, 260);
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 80, 260, 260);

    // Draw Real-Time Map Grid if Grid exists
    if (this.skaraBraeGrid) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 240;
      tempCanvas.height = 240;
      this.skaraBraeGrid.renderDiegeticMapCanvas(tempCanvas.getContext('2d'));
      ctx.drawImage(tempCanvas, 40, 90, 240, 240);
    } else {
      ctx.fillStyle = '#a8a29e';
      ctx.font = '14px sans-serif';
      ctx.fillText('Map rendering...', 50, 200);
    }

    // RIGHT PAGE: Locations of Interest Legend
    ctx.fillStyle = '#3b0764';
    ctx.font = 'bold 18px Georgia, serif';
    ctx.fillText('📍 LOCATIONS OF INTEREST', 320, 65);

    const locations = [
      { name: 'Scarlet Bard Tavern', sprite: '/assets/sprites/bt1_33.png', desc: 'Ale, Lore & Songs' },
      { name: "Garth's Armory Shoppe", sprite: '/assets/sprites/bt1_31.png', desc: 'Party Gear & Fitting' },
      { name: 'Adventurers Guild', sprite: '/assets/sprites/bt1_34.png', desc: 'Roster & Quests' },
      { name: 'Review Board', sprite: '/assets/sprites/bt1_35.png', desc: 'Levels & Spell Tiers' },
      { name: "Roscoe's Emporium", sprite: '/assets/sprites/bt1_32.png', desc: 'Spell Point Recharging' },
      { name: 'Temple of Divine Light', sprite: '/assets/sprites/bt1_36.png', desc: 'Healing & Restoration' }
    ];

    locations.forEach((loc, idx) => {
      const yPos = 85 + idx * 52;

      // Draw sprite thumbnail
      if (loc.sprite) {
        if (this.portraitImages.has(loc.sprite)) {
          const img = this.portraitImages.get(loc.sprite);
          if (img && img.complete && img.naturalWidth > 0) {
            const fw = img.naturalWidth / 4;
            const fh = img.naturalHeight;
            ctx.drawImage(img, 2, 0, fw - 4, fh, 320, yPos, 38, 38);
          }
        } else {
          const img = new Image();
          img.src = loc.sprite;
          img.onload = () => {
            this.portraitImages.set(loc.sprite, img);
            this.renderBook();
          };
          this.portraitImages.set(loc.sprite, null);
        }
      }

      ctx.strokeStyle = '#f3cf65';
      ctx.lineWidth = 1;
      ctx.strokeRect(320, yPos, 38, 38);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.fillText(loc.name, 368, yPos + 18);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText(loc.desc, 368, yPos + 34);
    });
  }

  // PAGE 3: SPELLS & LIVE SPELL TESTING OUTSIDE COMBAT
  renderSpellsView(ctx) {
    ctx.fillStyle = '#3b0764';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('✨ SPELLS & LIVE SPELL TESTING', 30, 65);

    ctx.fillStyle = '#6b21a8';
    ctx.font = '13px sans-serif';
    ctx.fillText('WOW FACTOR: Touch any spell to test its particle effect live in real time!', 30, 88);

    let spellList = [];
    const caster = this.party.find(h => h.schoolLevels && Object.keys(h.schoolLevels).length > 0);
    if (caster) {
      spellList = getKnownSpells(caster);
    } else {
      spellList = getSpellsBySchoolAndLevel(SpellSchool.CONJURER, 1)
        .concat(getSpellsBySchoolAndLevel(SpellSchool.MAGICIAN, 1));
    }
    spellList = spellList.slice(0, 4);

    spellList.forEach((sp, idx) => {
      const isRight = idx >= 2;
      const x = isRight ? 330 : 30;
      const y = 115 + (idx % 2) * 135;

      ctx.fillStyle = 'rgba(126, 34, 206, 0.15)';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, 270, 120, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f3cf65';
      ctx.font = 'bold 17px Georgia, serif';
      ctx.fillText(`✨ ${sp.name} [${sp.code}]`, x + 15, y + 28);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      const schoolAbbr = sp.school ? sp.school.substring(0, 4).toUpperCase() : 'UNKN';
      ctx.fillText(`SP Cost: ${sp.spCost} | School: ${schoolAbbr}`, x + 15, y + 46);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px sans-serif';
      const desc = sp.description || sp.desc || '';
      ctx.fillText(desc.substring(0, 42) + (desc.length > 42 ? '...' : ''), x + 15, y + 64);

      let vfxType = 'SPARK';
      if (sp.effectType === 'light' || sp.code === 'MAFL') vfxType = 'FLAME';
      else if (sp.code === 'AIAR' || (sp.effectType === 'buff' && sp.effect && sp.effect.type === 'acBonus')) vfxType = 'ARMOR';
      else if (sp.code === 'VOPL' || (sp.effectType === 'buff' && sp.effect && sp.effect.type === 'damageBonus')) vfxType = 'VORPAL';
      else if (sp.effectType === 'damage') vfxType = 'FLAME';

      // Live Test Spell Button
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(x + 15, y + 78, 130, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('🔥 TEST SPELL', x + 30, y + 98);

      this.canvasButtons.push({
        x: x + 15, y: y + 78, w: 130, h: 30,
        action: () => {
          if (this.onSpellTested) {
            this.onSpellTested(vfxType, sp.name);
          }
        }
      });
    });
  }
}

