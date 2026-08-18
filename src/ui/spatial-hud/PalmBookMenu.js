import * as THREE from 'three';
import { getKnownSpells, getSpellsBySchoolAndLevel, SpellSchool } from '../../data/SpellDatabase.js';
import { BardSongs } from '../../data/BardSongs.js';
export class PalmBookMenu {
  constructor(scene, camera, onSpellTested) {
    this.scene = scene;
    this.camera = camera;
    this.onSpellTested = onSpellTested;

    this.isOpen = false;
    this.bookGroup = new THREE.Group();
    this.bookGroup.visible = false;

    this.currentPage = 1; // 1: Heroes, 2: Automap, 3: Spells
    this.inspectedHeroIndex = null; // null or 0..3 for detailed inspection view

    this.leftPalmState = 'DOWN';
    this.party = [];
    this.skaraBraeGrid = null;

    // Interactive button bounding regions on the book canvas
    this.canvasButtons = [];

    this.initBookMesh();
    this.scene.add(this.bookGroup);
  }

  initBookMesh() {
    // 3D Leather Grimoire Cover & Parchment Pages
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x4c1d95, roughness: 0.5 }); // Deep Royal Purple
    const pageMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8 });  // Aged Parchment
    const goldTrim = new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.8, roughness: 0.2 });

    // Covers
    const leftCover = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.02), coverMat);
    leftCover.position.set(-0.16, 0, 0);
    this.bookGroup.add(leftCover);

    const rightCover = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.02), coverMat);
    rightCover.position.set(0.16, 0, 0);
    this.bookGroup.add(rightCover);

    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42), goldTrim);
    spine.position.set(0, 0, -0.01);
    this.bookGroup.add(spine);

    // Book Pages
    const leftPages = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.40, 0.03), pageMat);
    leftPages.position.set(-0.15, 0, 0.02);
    this.bookGroup.add(leftPages);

    const rightPages = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.40, 0.03), pageMat);
    rightPages.position.set(0.15, 0, 0.02);
    this.bookGroup.add(rightPages);

    // High Resolution Canvas for 2-Page Spread
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 420;
    this.pageCtx = canvas.getContext('2d');
    this.pageTexture = new THREE.CanvasTexture(canvas);

    const pageTextMat = new THREE.MeshBasicMaterial({
      map: this.pageTexture,
      transparent: true
    });

    this.textMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.60, 0.40), pageTextMat);
    this.textMesh.position.set(0, 0, 0.038);
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
    ctx.clearRect(0, 0, 640, 420);
    this.canvasButtons = [];

    // Background Book Spine Line
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(320, 10);
    ctx.lineTo(320, 410);
    ctx.stroke();

    // Top Navigation Tabs: [ Page 1: Heroes ] [ Page 2: Automap ] [ Page 3: Spells ]
    this.drawTab(ctx, 20, 10, 95, 30, '1. Heroes', this.currentPage === 1);
    this.drawTab(ctx, 120, 10, 95, 30, '2. Automap', this.currentPage === 2);
    this.drawTab(ctx, 220, 10, 95, 30, '3. Spells', this.currentPage === 3);

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
    ctx.fillText(`Class: ${hero.race} ${hero.class}`, 160, 115);
    ctx.fillText(`XP: ${hero.xp || 1200}`, 160, 140);
    ctx.fillText(`Gold: ${hero.gold || 150} GP`, 160, 165);
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

    // RIGHT PAGE: Inventory & Known Spells
    ctx.fillStyle = '#3b0764';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('🎒 INVENTORY & GEAR', 350, 72);

    const inv = hero.inventory || ['Broadsword', 'Iron Shield', 'Leather Armor', 'Brass Torch'];
    inv.forEach((item, i) => {
      ctx.fillStyle = '#f8fafc';
      ctx.font = '14px sans-serif';
      ctx.fillText(`• ${item}`, 350, 105 + i * 28);
    });

    ctx.fillStyle = '#3b0764';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('✨ KNOWN SPELLS / TUNES', 350, 245);

    const spells = hero.spells || ['Mage Flame', 'Air Armor', 'Vorpal Plating'];
    spells.forEach((sp, i) => {
      ctx.fillStyle = '#a855f7';
      ctx.font = '14px sans-serif';
      ctx.fillText(`• ${sp}`, 350, 278 + i * 28);
    });
  }

  // DYNAMIC HERO PORTRAIT REFLECTING DAMAGED / POISONED / CURSED STATE
  drawHeroPortrait(ctx, x, y, w, h, hero) {
    const status = hero.status || 'OK';

    // Portrait Background Frame
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = status === 'POISONED' ? '#22c55e' : status === 'CURSED' ? '#a855f7' : status === 'DAMAGED' ? '#ef4444' : '#f3cf65';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Basic Face Silhouettes
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.4, w * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // WOW FACTOR: Dynamic State Overlay Effects
    if (status === 'POISONED') {
      // Sickly Green Tint & Venom Skull Emblem
      ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('☠️ POISON', x + 5, y + h - 10);
    } else if (status === 'CURSED') {
      // Dark Purple Shadow Aura
      ctx.fillStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('🔮 CURSE', x + 5, y + h - 10);
    } else if (status === 'DAMAGED') {
      // Blood Splatters & Bruises
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('🩸 INJURED', x + 5, y + h - 10);
    }
  }

  drawStatusBadge(ctx, x, y, status) {
    const col = status === 'POISONED' ? '#22c55e' : status === 'CURSED' ? '#a855f7' : status === 'DAMAGED' ? '#ef4444' : '#10b981';
    ctx.fillStyle = col;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`STATUS: ${status || 'OK'}`, x, y + 14);
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
      { name: 'Scarlet Bard Tavern', color: '#f59e0b', desc: 'Title Screen & Songs' },
      { name: "Garth's Weapons & Wonders", color: '#10b981', desc: 'Party Gear & Fitting' },
      { name: 'Adventurers Guild', color: '#38bdf8', desc: 'Level Up & Roster' },
      { name: "Mangar's Catacombs", color: '#ef4444', desc: 'Dungeon Entrance' }
    ];

    locations.forEach((loc, idx) => {
      ctx.fillStyle = loc.color;
      ctx.fillRect(320, 95 + idx * 60, 16, 16);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px Georgia, serif';
      ctx.fillText(loc.name, 346, 108 + idx * 60);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText(loc.desc, 346, 128 + idx * 60);
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

  updateGesture(controllerOrHand) {
    if (!controllerOrHand) return;

    const euler = new THREE.Euler().setFromQuaternion(controllerOrHand.quaternion);
    const roll = euler.z;

    const isPalmUp = Math.abs(roll) > Math.PI * 0.55;

    if (isPalmUp && this.leftPalmState === 'DOWN') {
      this.leftPalmState = 'UP';
      this.toggleBook(true, controllerOrHand.position);
    } else if (!isPalmUp && this.leftPalmState === 'UP') {
      this.leftPalmState = 'DOWN';
      this.toggleBook(false);
    }

    if (this.isOpen && controllerOrHand) {
      this.bookGroup.position.copy(controllerOrHand.position).add(new THREE.Vector3(0, 0.25, -0.1));
      this.bookGroup.lookAt(this.camera.position);
    }
  }

  toggleBook(open, handPos = null) {
    this.isOpen = open;
    this.bookGroup.visible = open;
    if (open) {
      this.renderBook();
      if (handPos) {
        this.bookGroup.position.copy(handPos).add(new THREE.Vector3(0, 0.25, -0.1));
        this.bookGroup.lookAt(this.camera.position);
      }
    }
  }
}
