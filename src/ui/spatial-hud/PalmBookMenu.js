import * as THREE from 'three';
import { getKnownSpells, getSpellsBySchoolAndLevel, SpellSchool } from '../../data/SpellDatabase.js';
import { BardSongs } from '../../data/BardSongs.js';
import { COLLISION_LAYER } from './SpatialCollisionLayers.js';
import { SKARA_BRAE_GRID, LandmarkId, TerrainType, worldToSource } from '../../data/SkaraBraeMapData.js';

/**
 * PalmBookMenu - Diegetic Field Command Deck (WebXR 3D Spatial Survival Tool)
 *
 * Capabilities:
 * - 512x512 internal 2D canvas with THREE.NearestFilter for crisp retro rendering
 * - 4-tab index along outer edge: [1: MAP] [2: PARTY] [3: BUFFS] [4: SPELLS]
 * - Tab 1 (Live Automap): 16x16 local grid centered on player with directional arrow and landmark icons
 * - Tab 2 (Party Vitals): 6 compact hero rows with HP/SP bars, condition codes, and red danger highlight (<25% HP / non-OK)
 * - Tab 3 (World & Buffs): Day/Night phase timer, town services status, active Bard song, and party buffs
 * - Tab 4 (Spellbook): Out-of-combat spells grouped by caster with SP check and live casting
 * - Tab switching via controller raycast clicks, [LB]/[RB] bumpers, or [1]..[4] keys
 */
export class PalmBookMenu {
  constructor(scene, camera, onSpellTested, onRestartGame = null) {
    this.scene = scene;
    this.camera = camera;
    this.onSpellTested = onSpellTested;
    this.onRestartGame = onRestartGame;

    this.isOpen = false;
    this.bookGroup = new THREE.Group();
    this.bookGroup.name = 'PalmBookMenu';
    this.bookGroup.visible = false;

    this.currentPage = 1; // 1: MAP, 2: PARTY, 3: BUFFS, 4: SPELLS

    this.leftPalmState = 'DOWN';
    this.activeHand = null;
    this.party = [];
    this.skaraBraeGrid = null;
    this.xrRig = null;
    this.timeEngine = null;
    this.combatEngine = null;

    this.summonProgress = 0.0;
    this.animState = 'CLOSED'; // 'CLOSED', 'SUMMONING', 'OPEN', 'DISPELLING'
    this.animProgress = 0.0;   // 0.0 = completely closed, 1.0 = fully summoned & open
    this.lastHandPos = new THREE.Vector3();
    this.lastDirToHead = new THREE.Vector3(0, 0, 1);
    this.enabled = false; // Suppressed until entering Garth's Shop

    // Interactive button bounding regions on the 512x512 canvas
    this.canvasButtons = [];

    /** @type {THREE.Mesh|null} Low-poly primitive collision plane for UI raycasting */
    this.interactionCollider = null;

    this._lastLiveRenderTime = 0;

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

  setGridReference(grid) {
    this.skaraBraeGrid = grid;
  }

  setXRReference(xrRig) {
    this.xrRig = xrRig;
  }

  setTimeEngine(timeEngine) {
    this.timeEngine = timeEngine;
  }

  setCombatEngine(combatEngine) {
    this.combatEngine = combatEngine;
  }

  updatePartyData(party) {
    this.party = party || [];
    this.renderBook();
  }

  initBookMesh() {
    // 3D Diegetic Field Command Deck Frame
    const slateMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.5 }); // Dark Indigo Obsidian Slate
    const goldTrim = new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.8, roughness: 0.2 });
    const silverTrim = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.3 });

    // Deck Base Slate (0.48m x 0.48m x 0.016m)
    const baseSlate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.016), slateMat);
    baseSlate.position.set(0, 0, 0);
    this.bookGroup.add(baseSlate);

    // Beveled Edge Bumpers
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.02, 0.022), goldTrim);
    topBar.position.set(0, 0.24, 0.002);
    this.bookGroup.add(topBar);

    const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.02, 0.022), goldTrim);
    bottomBar.position.set(0, -0.24, 0.002);
    this.bookGroup.add(bottomBar);

    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.50, 0.022), silverTrim);
    leftBar.position.set(-0.24, 0, 0.002);
    this.bookGroup.add(leftBar);

    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.50, 0.022), silverTrim);
    rightBar.position.set(0.24, 0, 0.002);
    this.bookGroup.add(rightBar);

    // High Resolution 512x512 Canvas with NearestFilter
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      this.pageCtx = canvas.getContext('2d');
      this.pageTexture = new THREE.CanvasTexture(canvas);
      this.pageTexture.minFilter = THREE.NearestFilter;
      this.pageTexture.magFilter = THREE.NearestFilter;
    } else {
      this.pageCtx = null;
      this.pageTexture = new THREE.Texture();
      this.pageTexture.minFilter = THREE.NearestFilter;
      this.pageTexture.magFilter = THREE.NearestFilter;
    }

    const pageTextMat = new THREE.MeshBasicMaterial({
      map: this.pageTexture,
      transparent: true,
      side: THREE.DoubleSide
    });

    // 0.46m x 0.46m display surface
    this.textMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), pageTextMat);
    this.textMesh.position.set(0, 0, 0.012);
    this.bookGroup.add(this.textMesh);

    // Low-poly primitive collision plane (2 triangles, layer = SPATIAL_UI)
    const colliderGeo = new THREE.PlaneGeometry(0.46, 0.46);
    const colliderMat = new THREE.MeshBasicMaterial({ visible: false });
    this.interactionCollider = new THREE.Mesh(colliderGeo, colliderMat);
    this.interactionCollider.position.set(0, 0, 0.014);
    this.interactionCollider.layers.set(COLLISION_LAYER.SPATIAL_UI);
    this.interactionCollider.userData = {
      isUICollider: true,
      isGrimoire: true,
      menu: this
    };
    this.bookGroup.add(this.interactionCollider);
    this.textMesh.layers.enable(COLLISION_LAYER.SPATIAL_UI);

    this.renderBook();
  }

  getInteractionCollider() {
    return this.interactionCollider || this.textMesh;
  }

  renderBook() {
    if (!this.pageCtx) return;
    const ctx = this.pageCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 512, 512);
    this.canvasButtons = [];

    // Background Deck Plate (Dark Slate with subtle metallic border)
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 508, 508);

    // Outer Edge 4-Tab Navigation Index: [1: MAP] [2: PARTY] [3: BUFFS] [4: SPELLS]
    const tabs = [
      { id: 1, label: '1: MAP', x: 8, w: 94 },
      { id: 2, label: '2: PARTY', x: 106, w: 94 },
      { id: 3, label: '3: BUFFS', x: 204, w: 94 },
      { id: 4, label: '4: SPELLS', x: 302, w: 94 }
    ];

    tabs.forEach(tab => {
      this.drawTab(ctx, tab.x, 8, tab.w, 32, tab.label, this.currentPage === tab.id, tab.id);
    });

    // Top-Right Quick Return to Retro C64 Desk button
    this.drawRestartTab(ctx, 404, 8, 100, 32);

    // Tab Content Rendering
    if (this.currentPage === 1) {
      this.renderAutomapView(ctx);
    } else if (this.currentPage === 2) {
      this.renderPartyVitalsView(ctx);
    } else if (this.currentPage === 3) {
      this.renderWorldAndBuffsView(ctx);
    } else if (this.currentPage === 4) {
      this.renderSpellbookView(ctx);
    }

    if (this.pageTexture) {
      this.pageTexture.needsUpdate = true;
    }
  }

  drawTab(ctx, x, y, w, h, label, isActive, tabId) {
    ctx.fillStyle = isActive ? '#f3cf65' : 'rgba(30, 41, 59, 0.85)';
    ctx.strokeStyle = isActive ? '#fde047' : '#64748b';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isActive ? '#0f172a' : '#f8fafc';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);

    this.canvasButtons.push({
      x, y, w, h,
      action: () => {
        this.currentPage = tabId;
        this.renderBook();
      }
    });
  }

  drawRestartTab(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(185, 28, 28, 0.8)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔄 C64 DESK', x + w / 2, y + h / 2);

    this.canvasButtons.push({
      x, y, w, h,
      action: () => {
        if (this.onRestartGame) {
          this.onRestartGame();
        }
      }
    });
  }

  // ─── TAB 1: LIVE AUTOMAP ───────────────────────────────────────────────────
  renderAutomapView(ctx) {
    let playerWorldX = 0, playerWorldZ = 0;
    if (this.xrRig && this.xrRig.rig) {
      playerWorldX = this.xrRig.rig.position.x;
      playerWorldZ = this.xrRig.rig.position.z;
    } else if (this.camera) {
      playerWorldX = this.camera.position.x;
      playerWorldZ = this.camera.position.z;
    }

    let sourcePos = { x: 15, y: 15, inBounds: true };
    if (this.skaraBraeGrid && typeof this.skaraBraeGrid.worldToSource === 'function') {
      sourcePos = this.skaraBraeGrid.worldToSource(playerWorldX, playerWorldZ);
    } else {
      sourcePos = worldToSource(playerWorldX, playerWorldZ);
    }
    const cx = sourcePos.inBounds ? sourcePos.x : 15;
    const cy = sourcePos.inBounds ? sourcePos.y : 15;

    // Heading direction
    const dir = new THREE.Vector3();
    if (this.camera && typeof this.camera.getWorldDirection === 'function') {
      this.camera.getWorldDirection(dir);
    } else {
      dir.set(0, 0, -1);
    }
    const headingAngle = Math.atan2(dir.x, -dir.z);

    // Cardinal direction label
    let cardinal = 'NORTH';
    const deg = (headingAngle * (180 / Math.PI) + 360) % 360;
    if (deg >= 315 || deg < 45) cardinal = 'NORTH';
    else if (deg >= 45 && deg < 135) cardinal = 'EAST';
    else if (deg >= 135 && deg < 225) cardinal = 'SOUTH';
    else cardinal = 'WEST';

    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`🗺️ LIVE AUTOMAP • POS: (${cx}, ${cy}) FACING: ${cardinal}`, 12, 48);

    // 16x16 Grid centered on player
    const mapSize = 368;
    const tileSize = 23; // 16 * 23 = 368px
    const mapLeft = 72;
    const mapTop = 68;

    ctx.fillStyle = '#05070d';
    ctx.fillRect(mapLeft, mapTop, mapSize, mapSize);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapLeft, mapTop, mapSize, mapSize);

    for (let row = 0; row < 16; row++) {
      const gridY = cy + 7 - row;
      for (let col = 0; col < 16; col++) {
        const gridX = cx - 8 + col;
        const tx = mapLeft + col * tileSize;
        const ty = mapTop + row * tileSize;

        if (gridX < 0 || gridX >= 30 || gridY < 0 || gridY >= 30) {
          ctx.fillStyle = '#020307';
          ctx.fillRect(tx, ty, tileSize, tileSize);
          continue;
        }

        const isExplored = this.skaraBraeGrid ? this.skaraBraeGrid.isExplored(gridX, gridY) : true;
        if (!isExplored) {
          ctx.fillStyle = '#090d16'; // Fog of war
          ctx.fillRect(tx, ty, tileSize, tileSize);
          continue;
        }

        const cell = SKARA_BRAE_GRID[gridY][gridX];
        let tileColor = '#1e293b';
        let icon = null;

        if (cell.terrain === TerrainType.WALL) {
          tileColor = '#475569';
        } else if (cell.landmarkId === LandmarkId.GARTHS_SHOP) {
          tileColor = '#065f46';
          icon = '⚔️';
        } else if (cell.landmarkId === LandmarkId.SCARLET_BARD) {
          tileColor = '#78350f';
          icon = '🍺';
        } else if (cell.landmarkId === LandmarkId.ADVENTURERS_GUILD) {
          tileColor = '#1e3a8a';
          icon = '🛡️';
        } else if (cell.landmarkId === LandmarkId.REVIEW_BOARD) {
          tileColor = '#581c87';
          icon = '📜';
        } else if (cell.landmarkId === LandmarkId.ROSCOES_EMPORIUM) {
          tileColor = '#831843';
          icon = '⚡';
        } else if (cell.landmarkId && cell.landmarkId.startsWith('TEMPLE')) {
          tileColor = '#0e7490';
          icon = '🏛️';
        } else if (cell.terrain === TerrainType.BUILDING) {
          tileColor = '#334155';
        }

        ctx.fillStyle = tileColor;
        ctx.fillRect(tx, ty, tileSize - 1, tileSize - 1);

        if (icon) {
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(icon, tx + tileSize / 2, ty + tileSize / 2);
        }
      }
    }

    // Directional Arrow for Player at center tile (col = 8, row = 7)
    const pCenterCol = 8;
    const pCenterRow = 7;
    const px = mapLeft + pCenterCol * tileSize + tileSize / 2;
    const py = mapTop + pCenterRow * tileSize + tileSize / 2;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(headingAngle);
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Map Legend Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('⚔️ Garth  🍺 Tavern  🛡️ Guild  📜 Board  🏛️ Temple  ⚡ Roscoe', 256, 478);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText('Center: Player Arrow • 16x16 Local Grid View', 256, 498);
  }

  // ─── TAB 2: PARTY VITALS ───────────────────────────────────────────────────
  renderPartyVitalsView(ctx) {
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('🛡️ ACTIVE GUILD PARTY VITALS', 14, 48);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.party.length}/6 Members`, 498, 48);

    const startY = 70;
    const rowH = 64;
    const gap = 6;

    for (let i = 0; i < 6; i++) {
      const y = startY + i * (rowH + gap);
      const hero = this.party[i];

      if (!hero) {
        // Empty Slot
        ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(14, y, 484, rowH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`[Slot ${i + 1}: Empty Hero Slot — Recruit at Tavern / Garth]`, 256, y + rowH / 2);
        continue;
      }

      const curHP = hero.currentHp ?? hero.hp ?? 0;
      const maxHP = hero.maxHp ?? hero.maxHP ?? hero.hp ?? 20;
      const curSP = hero.currentSp ?? hero.sp ?? 0;
      const maxSP = hero.maxSp ?? hero.maxSP ?? hero.sp ?? 0;
      const status = hero.status || hero.condition || 'OK';

      const isDanger = (maxHP > 0 && (curHP / maxHP < 0.25)) || (status !== 'OK' && status !== 'ALIVE');

      ctx.fillStyle = isDanger ? 'rgba(239, 68, 68, 0.18)' : 'rgba(30, 41, 59, 0.7)';
      ctx.strokeStyle = isDanger ? '#ef4444' : '#475569';
      ctx.lineWidth = isDanger ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(14, y, 484, rowH, 6);
      ctx.fill();
      ctx.stroke();

      // Hero Name, Class, Level
      ctx.fillStyle = isDanger ? '#fca5a5' : '#f8fafc';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${i + 1}. ${hero.name}`, 24, y + 10);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText(`[${hero.class} L${hero.level || 1}]`, 160, y + 11);

      // Condition Badge (Right aligned)
      const badgeW = 54;
      const badgeH = 22;
      const bx = 432;
      const by = y + 8;
      ctx.fillStyle = (status === 'OK' || status === 'ALIVE') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.3)';
      ctx.strokeStyle = (status === 'OK' || status === 'ALIVE') ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeW, badgeH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = (status === 'OK' || status === 'ALIVE') ? '#34d399' : '#f87171';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(status, bx + badgeW / 2, by + badgeH / 2);

      // HP Bar & Numeric
      const barW = 160;
      const barH = 10;
      const barX = 24;
      const hpY = y + 36;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(barX, hpY, barW, barH);
      const hpFrac = Math.max(0, Math.min(1, maxHP > 0 ? curHP / maxHP : 0));
      ctx.fillStyle = isDanger ? '#ef4444' : '#10b981';
      ctx.fillRect(barX, hpY, barW * hpFrac, barH);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(barX, hpY, barW, barH);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`HP: ${curHP}/${maxHP}`, barX + barW + 8, hpY);

      // SP Bar & Numeric
      const spX = 265;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(spX, hpY, barW - 35, barH);
      const spFrac = Math.max(0, Math.min(1, maxSP > 0 ? curSP / maxSP : 0));
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(spX, hpY, (barW - 35) * spFrac, barH);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(spX, hpY, barW - 35, barH);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`SP: ${curSP}/${maxSP}`, spX + barW - 27, hpY);
    }
  }

  // ─── TAB 3: WORLD & BUFFS ──────────────────────────────────────────────────
  renderWorldAndBuffsView(ctx) {
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('🌍 WORLD TIME & PARTY BUFFS', 14, 48);

    // 1. Time & Town Services Panel (y = 70 to 180)
    const currentPhase = this.timeEngine?.currentPhase || 'DAY';
    const remainingSecs = this.timeEngine?.phaseRemainingSeconds || 0;
    const mins = Math.floor(remainingSecs / 60).toString().padStart(2, '0');
    const secs = Math.floor(remainingSecs % 60).toString().padStart(2, '0');
    const areServicesOpen = this.timeEngine ? this.timeEngine.areTownServicesOpen : true;

    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(14, 72, 484, 110, 8);
    ctx.fill();
    ctx.stroke();

    let phaseIcon = '☀️';
    let phaseColor = '#f59e0b';
    if (currentPhase === 'NIGHT') { phaseIcon = '🌙'; phaseColor = '#38bdf8'; }
    else if (currentPhase === 'DAWN') { phaseIcon = '🌅'; phaseColor = '#fb923c'; }
    else if (currentPhase === 'DUSK') { phaseIcon = '🌆'; phaseColor = '#c084fc'; }

    ctx.fillStyle = phaseColor;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${phaseIcon} ${currentPhase} PHASE`, 28, 86);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`⏳ ${mins}:${secs} remaining`, 480, 88);

    ctx.fillStyle = areServicesOpen ? '#34d399' : '#f87171';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(areServicesOpen ? '🟢 Town Shops & Review Board: OPEN' : '🔴 Town Shops & Review Board: CLOSED (Nightfall)', 28, 120);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText('• Rest at Adventurers Guild or Scarlet Bard Tavern to advance time to morning.', 28, 145);
    ctx.fillText('• Daylight slowly restores Spell Points (SP) for magic users.', 28, 162);

    // 2. Active Party Buffs & Bard Song Panel (y = 194 to 495)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(14, 194, 484, 302, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('✨ ACTIVE PARTY BUFFS & SONGS', 28, 208);

    let contentY = 236;

    // Active Bard Song
    const activeSong = this.combatEngine?.activeBardSong;
    if (activeSong && activeSong.song) {
      ctx.fillStyle = 'rgba(217, 119, 6, 0.2)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(26, contentY, 460, 46, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`🎵 BARD SONG: ${activeSong.song.name}`, 36, contentY + 10);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px monospace';
      const desc = activeSong.song.combatEffect?.stat ? `Buffs ${activeSong.song.combatEffect.stat.toUpperCase()}` : 'Party combat buff';
      ctx.fillText(`${desc} • Duration: ${activeSong.turnsRemaining} turn(s) remaining`, 36, contentY + 28);
      contentY += 56;
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px monospace';
      ctx.fillText('🎵 No Bard Song currently playing. (Sing with [X] in combat)', 28, contentY);
      contentY += 28;
    }

    // Party Buffs (combatEngine.partyBuffs)
    const buffs = this.combatEngine?.partyBuffs || [];
    if (buffs.length > 0) {
      buffs.forEach(buff => {
        if (contentY > 440) return;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(26, contentY, 460, 40, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`🛡️ ${buff.source || 'Spell Buff'}`, 36, contentY + 8);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px monospace';
        ctx.fillText(`Stat: ${buff.stat?.toUpperCase()} +${buff.value} • ${buff.turnsRemaining} turn(s) left`, 36, contentY + 24);
        contentY += 48;
      });
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px monospace';
      ctx.fillText('🛡️ No active magical spell buffs (Air Armor, Vorpal Plating, etc.)', 28, contentY);
      contentY += 28;
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText('💡 Tip: Cast out-of-combat utility spells on Tab 4 to fortify party!', 28, 470);
  }

  // ─── TAB 4: SPELLBOOK (OUT-OF-COMBAT) ───────────────────────────────────────
  renderSpellbookView(ctx) {
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('📖 SPELLBOOK (OUT-OF-COMBAT)', 14, 48);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Click/Touch Spell to Cast', 498, 48);

    // Group out-of-combat spells by caster
    const casters = this.party.filter(h =>
      h.class === 'Conjurer' || h.class === 'Magician' || h.class === 'Sorcerer' || h.class === 'Wizard' ||
      (h.schoolLevels && Object.keys(h.schoolLevels).length > 0) || (h.sp !== undefined && h.sp > 0)
    );

    let spellEntries = [];
    if (casters.length > 0) {
      casters.forEach(caster => {
        const known = getKnownSpells(caster);
        const ooc = known.filter(s => s.outOfCombat);
        ooc.forEach(sp => {
          spellEntries.push({ caster, spell: sp });
        });
      });
    }

    // Fallback if party has no casters or no spells
    if (spellEntries.length === 0) {
      const fallbackConjurer = getSpellsBySchoolAndLevel(SpellSchool.CONJURER, 1).filter(s => s.outOfCombat);
      const fallbackMagician = getSpellsBySchoolAndLevel(SpellSchool.MAGICIAN, 1).filter(s => s.outOfCombat);
      const dummyCaster = this.party[0] || { name: 'Apprentice', class: 'Mage', sp: 18, maxSp: 18 };
      fallbackConjurer.concat(fallbackMagician).forEach(sp => {
        spellEntries.push({ caster: dummyCaster, spell: sp });
      });
    }

    // Display up to 4 spells neatly on the 512x512 canvas
    const displayed = spellEntries.slice(0, 4);
    const cardH = 96;
    const startY = 74;
    const gap = 8;

    displayed.forEach((entry, idx) => {
      const y = startY + idx * (cardH + gap);
      const { caster, spell } = entry;
      const spCost = spell.spCost || 3;
      const curSP = caster.currentSp ?? caster.sp ?? 0;
      const canCast = curSP >= spCost;

      ctx.fillStyle = canCast ? 'rgba(30, 41, 59, 0.7)' : 'rgba(23, 23, 23, 0.7)';
      ctx.strokeStyle = canCast ? '#a855f7' : '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(14, y, 484, cardH, 6);
      ctx.fill();
      ctx.stroke();

      // Caster & Spell Name
      ctx.fillStyle = '#f3cf65';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`✨ ${spell.name} [${spell.code || 'SPELL'}]`, 24, y + 10);

      ctx.fillStyle = '#a855f7';
      ctx.font = '11px monospace';
      ctx.fillText(`Caster: ${caster.name} (${caster.class}) • SP: ${curSP}/${caster.maxSp || curSP}`, 24, y + 30);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px sans-serif';
      const desc = spell.description || spell.desc || 'Magical effect';
      ctx.fillText(desc.length > 55 ? desc.substring(0, 52) + '...' : desc, 24, y + 48);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`School: ${spell.school || 'ARCANE'} • Cost: ${spCost} SP • Duration: ${spell.duration || 'instant'}`, 24, y + 70);

      // Cast Button (Right side)
      const btnW = 108;
      const btnH = 34;
      const btnX = 378;
      const btnY = y + 30;

      ctx.fillStyle = canCast ? '#7e22ce' : '#334155';
      ctx.strokeStyle = canCast ? '#c084fc' : '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = canCast ? '#ffffff' : '#94a3b8';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(canCast ? `🔥 CAST (${spCost})` : `NO SP (${spCost})`, btnX + btnW / 2, btnY + btnH / 2);

      let vfxType = 'SPARK';
      if (spell.effectType === 'light' || spell.code === 'MAFL') vfxType = 'FLAME';
      else if (spell.code === 'AIAR' || (spell.effectType === 'buff' && spell.effect && spell.effect.type === 'acBonus')) vfxType = 'ARMOR';
      else if (spell.code === 'VOPL' || (spell.effectType === 'buff' && spell.effect && spell.effect.type === 'damageBonus')) vfxType = 'VORPAL';
      else if (spell.effectType === 'damage') vfxType = 'FLAME';

      this.canvasButtons.push({
        x: btnX, y: btnY, w: btnW, h: btnH,
        action: (showToast) => {
          if (!canCast) {
            if (showToast) {
              showToast(`⚠️ ${caster.name} does not have enough SP (${curSP}/${spCost})!`);
            }
            return;
          }
          if (caster.currentSp !== undefined) caster.currentSp -= spCost;
          if (caster.sp !== undefined) caster.sp -= spCost;
          if (this.onSpellTested) {
            this.onSpellTested(vfxType, spell.name);
          }
          if (showToast) {
            showToast(`✨ Testing Spell: ${caster.name} casts ${spell.name}!`);
          }
          this.renderBook();
        }
      });
    });
  }

  // Handle Raycasting Pointer Clicks on Command Deck Canvas Buttons
  handleCanvasClick(uv, showToast) {
    if (!uv) return;

    // Convert UV coordinates (0..1) to Canvas pixels (512 x 512)
    const px = uv.x * 512;
    const py = (1 - uv.y) * 512;

    for (const btn of this.canvasButtons) {
      if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
        btn.action(showToast);
        break;
      }
    }
  }

  /**
   * Evaluates if a given VR controller or hand is supinating / palm turned upwards towards head
   */
  _checkControllerPalmUp(controller, isLeftHand, headPos) {
    if (!controller) return { isPalmUp: false, isPalmDown: true, handPos: null, dirToHead: null };

    const resolvedHead = (headPos && typeof headPos.clone === 'function')
      ? headPos
      : (this.camera && this.camera.position ? this.camera.position : new THREE.Vector3(0, 1.5, 0));

    const handPos = new THREE.Vector3();
    if (controller.joints && controller.joints['wrist'] && typeof controller.joints['wrist'].getWorldPosition === 'function') {
      controller.joints['wrist'].getWorldPosition(handPos);
    } else if (typeof controller.getWorldPosition === 'function') {
      controller.getWorldPosition(handPos);
    } else if (controller.position) {
      handPos.copy(controller.position);
    }

    const handQuat = new THREE.Quaternion();
    if (typeof controller.getWorldQuaternion === 'function') {
      controller.getWorldQuaternion(handQuat);
    } else if (controller.quaternion) {
      handQuat.copy(controller.quaternion);
    }

    // Natural resting palm direction for Touch controller is pointing along local +X or -Y
    const palmNormal = new THREE.Vector3(isLeftHand ? 1 : -1, 0.4, 0).applyQuaternion(handQuat).normalize();
    const dirToHead = resolvedHead.clone().sub(handPos).normalize();
    const alignment = palmNormal.dot(dirToHead);

    const isPalmUp = alignment > 0.45;
    const isPalmDown = alignment < -0.15;

    return { isPalmUp, isPalmDown, handPos, dirToHead };
  }

  /**
   * Called on every WebXR frame to track hand gestures
   */
  updateGesture(leftController, rightController, headPos, frame = null, refSpace = null) {
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

    if (this.leftPalmState === 'BUTTON_OPEN') {
      if (this.isOpen) {
        const now = performance.now();
        if (now - this._lastLiveRenderTime > 250) {
          this._lastLiveRenderTime = now;
          this.renderBook();
        }
      }
      return;
    }

    const resolvedHead = (headPos && typeof headPos.clone === 'function')
      ? headPos
      : (this.camera && this.camera.position ? this.camera.position : new THREE.Vector3(0, 1.5, 0));

    const leftCheck = this._checkControllerPalmUp(leftController, true, resolvedHead);

    if (leftCheck.isPalmUp && this.leftPalmState === 'DOWN') {
      this.leftPalmState = 'UP';
      this.toggleBook(true, leftCheck.handPos, resolvedHead);
    } else if (leftCheck.isPalmDown && this.leftPalmState === 'UP') {
      this.leftPalmState = 'DOWN';
      this.toggleBook(false);
    }

    // Animation progress handling
    if (this.animState === 'SUMMONING') {
      this.animProgress = Math.min(1.0, this.animProgress + 0.08);
      const easeScale = Math.sin((this.animProgress * Math.PI) / 2);
      this.bookGroup.scale.set(easeScale, easeScale, easeScale);

      if (leftCheck.handPos) {
        const dirToHead = resolvedHead.clone().sub(leftCheck.handPos).normalize();
        const targetPos = leftCheck.handPos.clone().add(new THREE.Vector3(0, 0.08, 0)).addScaledVector(dirToHead, 0.04);
        this.bookGroup.position.lerp(targetPos, 0.3);
        this.bookGroup.lookAt(resolvedHead);
      }

      if (this.animProgress >= 1.0) {
        this.animState = 'OPEN';
        this.bookGroup.scale.set(1.0, 1.0, 1.0);
      }
    } else if (this.animState === 'OPEN') {
      if (leftCheck.handPos) {
        const dirToHead = resolvedHead.clone().sub(leftCheck.handPos).normalize();
        const targetPos = leftCheck.handPos.clone().add(new THREE.Vector3(0, 0.08, 0)).addScaledVector(dirToHead, 0.04);
        this.bookGroup.position.lerp(targetPos, 0.2);
        this.bookGroup.lookAt(resolvedHead);
      }
      const now = performance.now();
      if (now - this._lastLiveRenderTime > 250) {
        this._lastLiveRenderTime = now;
        this.renderBook();
      }
    } else if (this.animState === 'DISPELLING') {
      this.animProgress = Math.max(0.0, this.animProgress - 0.12);
      const easeScale = this.animProgress;
      this.bookGroup.scale.set(easeScale, easeScale, easeScale);

      if (this.animProgress <= 0.0) {
        this.animState = 'CLOSED';
        this.bookGroup.visible = false;
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

      const resolvedHead = (headPos && typeof headPos.clone === 'function')
        ? headPos
        : (this.camera && this.camera.position ? this.camera.position : new THREE.Vector3(0, 1.5, 0));

      if (handPos) {
        const dirToHead = resolvedHead.clone().sub(handPos).normalize();
        this.lastDirToHead.copy(dirToHead);
        const initialPos = handPos.clone().add(new THREE.Vector3(0, 0.08, 0)).addScaledVector(dirToHead, 0.04);
        this.bookGroup.position.copy(initialPos);
        this.bookGroup.scale.set(0.08, 0.08, 0.08);
        this.bookGroup.lookAt(resolvedHead);
      }
    } else {
      this.animState = 'DISPELLING';
    }
  }

  /**
   * Toggle the 3D Grimoire in Desktop / Gamepad / VR Button mode.
   * Floating directly in front of the player camera at ergonomic reading distance.
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
    const headPos = new THREE.Vector3();
    const headQuat = new THREE.Quaternion();
    this.camera.getWorldPosition(headPos);
    this.camera.getWorldQuaternion(headQuat);

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(headQuat);
    const targetPos = headPos.clone().addScaledVector(fwd, 0.68).add(new THREE.Vector3(0, -0.06, 0));
    this.bookGroup.position.copy(targetPos);
    this.bookGroup.scale.set(1.0, 1.0, 1.0);
    this.bookGroup.lookAt(headPos);
  }

  updateDesktop() {
    if (this.isOpen && this.leftPalmState !== 'UP') {
      this.positionInFrontOfCamera();
    }
    if (this.isOpen) {
      const now = performance.now();
      if (now - this._lastLiveRenderTime > 250) {
        this._lastLiveRenderTime = now;
        this.renderBook();
      }
    }
  }

  nextPage() {
    this.currentPage = (this.currentPage % 4) + 1;
    this.renderBook();
  }

  prevPage() {
    this.currentPage = this.currentPage === 1 ? 4 : this.currentPage - 1;
    this.renderBook();
  }

  setPage(pageNum) {
    if (pageNum >= 1 && pageNum <= 4) {
      this.currentPage = pageNum;
      this.renderBook();
    }
  }
}
