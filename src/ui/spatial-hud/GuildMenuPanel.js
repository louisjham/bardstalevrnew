/**
 * GuildMenuPanel.js
 *
 * Authentic Adventurers Guild management menu — a floating 2D spatial panel
 * invoked by pointing at the Bard with a controller and pressing the trigger.
 *
 * Features:
 *  - Movable: point at any edge → grab with trigger → move freely in VR space
 *  - Bounded: cannot be pushed into walls, floor, ceiling, or objects
 *  - Closeable: X button in upper-right dismisses the panel
 *  - Retro BT1 aesthetic: dark parchment, gold borders, monospace font
 *  - Top-level Guild functions:
 *      Create New Character | Add Character to Party | Remove Character from Party
 *      Name Party | Save Party | Delete Character | Delete Party
 *
 * WebXR + Desktop dual compatible.
 */

import * as THREE from 'three';

// ─── Room bounds for clamping ─────────────────────────────────────────────────
const BOUNDS = {
  xMin: -7.5,  xMax:  7.5,
  yMin:  0.5,  yMax:  3.8,
  zMin: -6.5,  zMax:  1.5,
};

// ─── Menu color palette ───────────────────────────────────────────────────────
const C = {
  bg:         'rgba(6,4,18,0.97)',
  bgGrad0:    '#0a0618',
  bgGrad1:    '#14082e',
  border:     '#8b6300',
  borderHL:   '#ffcc44',
  title:      '#ffe566',
  titleSub:   '#886644',
  itemNorm:   '#b8a870',
  itemHover:  '#ffffff',
  itemBgNorm: 'rgba(20,10,40,0.5)',
  itemBgHov:  'rgba(80,40,140,0.85)',
  itemBord:   '#3d2860',
  itemBordHL: '#9966ff',
  subText:    'rgba(140,110,180,0.8)',
  closeBtn:   '#cc4444',
  closeBtnHL: '#ff6666',
  grabHandle: 'rgba(120,80,20,0.6)',
  grabHandleHL: 'rgba(200,150,50,0.8)',
  separator:  '#2a1a40',
  breadcrumb: '#665577',
  back:       '#8855cc',
};

// ─── Menu structure ───────────────────────────────────────────────────────────
const MENU_PAGES = {
  main: {
    title: 'Adventurers Guild',
    subtitle: 'Character & Party Management',
    items: [
      { id: 'create_char',     icon: '✦', label: 'Create New Character',       desc: 'Roll stats and add a new hero to the roster' },
      { id: 'add_to_party',    icon: '➕', label: 'Add Character to Party',     desc: 'Add a roster character to the active party' },
      { id: 'remove_from_party', icon: '➖', label: 'Remove from Party',         desc: 'Move a party member back to the roster' },
      { id: 'name_party',      icon: '📜', label: 'Name Party',                 desc: 'Give your adventuring company a name' },
      { id: 'save_party',      icon: '💾', label: 'Save Party',                 desc: 'Save your party progress to local storage' },
      { id: 'delete_char',     icon: '☠', label: 'Delete Character',            desc: 'Permanently remove a character from roster' },
      { id: 'delete_party',    icon: '💀', label: 'Delete Party',               desc: 'Disband and erase the entire party (cannot undo)' },
    ],
  },
};

export class GuildMenuPanel {
  /**
   * @param {THREE.Scene}   scene
   * @param {THREE.Camera}  camera
   * @param {object}        party         — current party array
   * @param {Function}      onAction      — callback(actionId, data)
   * @param {Function}      showToast     — callback(msg)
   */
  constructor(scene, camera, party, onAction, showToast) {
    this.scene     = scene;
    this.camera    = camera;
    this.party     = party || [];
    this.onAction  = onAction;
    this.showToast = showToast;

    // Panel state
    this.isOpen       = false;
    this.currentPage  = 'main';
    this.hoveredItem  = -1;
    this.isDragging   = false;
    this.dragOffset   = new THREE.Vector3();

    // Breadcrumb navigation
    this.pageStack    = [];

    // Canvas dimensions
    this.CW = 640;
    this.CH = 720;

    // Panel world dimensions
    this.panelW = 1.6;  // metres
    this.panelH = 1.8;

    // Build Three.js objects
    this.panelGroup = new THREE.Group();
    this.panelGroup.name = 'GuildMenuPanel';
    this.panelGroup.visible = false;
    this.scene.add(this.panelGroup);

    this._buildPanel();
    this._buildGrabHandles();
  }

  // ─── Build main panel ───────────────────────────────────────────────────────
  _buildPanel() {
    this.canvas = document.createElement('canvas');
    this.canvas.width  = this.CW;
    this.canvas.height = this.CH;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    const geo = new THREE.PlaneGeometry(this.panelW, this.panelH);
    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
    });

    this.panelMesh = new THREE.Mesh(geo, mat);
    this.panelMesh.name = 'GuildMenuPanel';
    this.panelMesh.userData.isGuildMenu = true;
    this.panelGroup.add(this.panelMesh);

    // Interaction collider (behind the panel face)
    const collGeo = new THREE.PlaneGeometry(this.panelW, this.panelH);
    const collMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.FrontSide });
    this.panelCollider = new THREE.Mesh(collGeo, collMat);
    this.panelCollider.userData.isGuildMenu = true;
    this.panelCollider.userData.isGuildMenuFace = true;
    this.panelGroup.add(this.panelCollider);
  }

  // ─── Build edge grab handles ────────────────────────────────────────────────
  _buildGrabHandles() {
    const handleMat = new THREE.MeshBasicMaterial({
      color: 0x8b6300,
      transparent: true,
      opacity: 0.0,  // invisible but raycastable
      side: THREE.FrontSide,
    });

    const thickness = 0.06;
    const handles = [
      // top
      { pos: [0,  this.panelH/2 - thickness/2, 0.001], size: [this.panelW, thickness], id: 'top'    },
      // bottom
      { pos: [0, -this.panelH/2 + thickness/2, 0.001], size: [this.panelW, thickness], id: 'bottom' },
      // left
      { pos: [-this.panelW/2 + thickness/2, 0, 0.001], size: [thickness, this.panelH], id: 'left'   },
      // right
      { pos: [ this.panelW/2 - thickness/2, 0, 0.001], size: [thickness, this.panelH], id: 'right'  },
    ];

    this.grabHandles = [];
    for (const h of handles) {
      const geo  = new THREE.PlaneGeometry(h.size[0], h.size[1]);
      const mesh = new THREE.Mesh(geo, handleMat.clone());
      mesh.position.set(...h.pos);
      mesh.userData.isGuildMenuHandle = true;
      mesh.userData.handleId = h.id;
      this.panelGroup.add(mesh);
      this.grabHandles.push(mesh);
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Open the panel in front of the player. */
  open(party) {
    if (party) this.party = party;
    this.isOpen      = true;
    this.currentPage = 'main';
    this.pageStack   = [];
    this.hoveredItem = -1;

    // Position: 1.5m in front of camera, at eye height, face the camera
    const camPos = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    this.camera.getWorldPosition(camPos);
    this.camera.getWorldDirection(camDir);

    const pos = camPos.clone().add(camDir.multiplyScalar(1.5));
    pos.y = Math.max(BOUNDS.yMin + this.panelH / 2, Math.min(BOUNDS.yMax - this.panelH / 2, camPos.y));

    this.panelGroup.position.copy(pos);

    // Face the camera (look at camera from panel position)
    const lookTarget = camPos.clone();
    lookTarget.y = this.panelGroup.position.y; // keep upright
    this.panelGroup.lookAt(lookTarget);

    this.panelGroup.visible = true;
    this._render();
  }

  /** Close and hide the panel. */
  close() {
    this.isOpen = false;
    this.isDragging = false;
    this.panelGroup.visible = false;
  }

  /**
   * Handle a trigger/click hit on the panel face.
   * @param {THREE.Vector2} uv   — UV coordinates of hit point
   */
  handleClick(uv) {
    if (!uv) return;

    // Check close button (upper-right corner, approx UV 0.87-0.99, 0.92-1.00)
    if (uv.x > 0.87 && uv.y > 0.93) {
      this.close();
      return;
    }

    // Map UV to item index
    const idx = this._uvToItemIndex(uv);
    if (idx < 0) return;

    const page = MENU_PAGES[this.currentPage];
    if (!page || idx >= page.items.length) return;

    const item = page.items[idx];
    this._activateItem(item);
  }

  /**
   * Update hover highlight.
   * @param {THREE.Vector2} uv
   */
  handleHover(uv) {
    if (!uv) {
      if (this.hoveredItem !== -1) {
        this.hoveredItem = -1;
        this._render();
      }
      return;
    }
    const idx = this._uvToItemIndex(uv);
    if (idx !== this.hoveredItem) {
      this.hoveredItem = idx;
      this._render();
    }
  }

  /**
   * Start dragging the panel (called when controller grabs an edge handle).
   * @param {THREE.Vector3} controllerWorldPos
   */
  startDrag(controllerWorldPos) {
    this.isDragging = true;
    this.dragOffset.copy(this.panelGroup.position).sub(controllerWorldPos);
  }

  /**
   * Update panel position during drag.
   * @param {THREE.Vector3} controllerWorldPos
   */
  updateDrag(controllerWorldPos) {
    if (!this.isDragging) return;
    const newPos = controllerWorldPos.clone().add(this.dragOffset);
    this._clampPosition(newPos);
    this.panelGroup.position.copy(newPos);
  }

  /**
   * End the drag operation.
   */
  endDrag() {
    this.isDragging = false;
  }

  /**
   * Called every frame to update drag if controller data is provided.
   * @param {THREE.Vector3|null} controllerWorldPos
   */
  update(controllerWorldPos = null) {
    if (this.isDragging && controllerWorldPos) {
      this.updateDrag(controllerWorldPos);
    }
  }

  /**
   * Set the party reference (called when party changes).
   */
  setParty(party) {
    this.party = party;
    if (this.isOpen) this._render();
  }

  /**
   * Returns all raycastable objects for this panel.
   */
  get interactableObjects() {
    const objs = [this.panelCollider, ...this.grabHandles];
    return objs;
  }

  // ─── UV → item index ─────────────────────────────────────────────────────────
  _uvToItemIndex(uv) {
    // Menu items occupy roughly UV y range [0.12 ... 0.90], each item evenly spaced.
    const page = MENU_PAGES[this.currentPage];
    if (!page) return -1;

    const n = page.items.length;
    const yStart = 0.12;  // top of item list in UV
    const yEnd   = 0.91;  // bottom of item list
    const xStart = 0.04;
    const xEnd   = 0.96;

    if (uv.x < xStart || uv.x > xEnd) return -1;
    if (uv.y < yStart || uv.y > yEnd) return -1;

    const fraction = (uv.y - yStart) / (yEnd - yStart);
    // UV y=0 is bottom in Three.js; items are rendered top-to-bottom
    const idx = Math.floor((1.0 - fraction) * n);
    if (idx < 0 || idx >= n) return -1;
    return idx;
  }

  // ─── Activate an item ────────────────────────────────────────────────────────
  _activateItem(item) {
    switch (item.id) {
      case 'create_char':
        this._handleCreateCharacter();
        break;
      case 'add_to_party':
        this._handleAddToParty();
        break;
      case 'remove_from_party':
        this._handleRemoveFromParty();
        break;
      case 'name_party':
        this._handleNameParty();
        break;
      case 'save_party':
        this._handleSaveParty();
        break;
      case 'delete_char':
        this._handleDeleteCharacter();
        break;
      case 'delete_party':
        this._handleDeleteParty();
        break;
      default:
        if (this.onAction) this.onAction(item.id, { item });
    }
    this._render();
  }

  // ─── Action handlers ──────────────────────────────────────────────────────────

  _handleCreateCharacter() {
    this.showToast?.('✦ Opening Character Creation...');
    this.close();
    if (this.onAction) this.onAction('create_char', {});
  }

  _handleAddToParty() {
    this.showToast?.('➕ Select a character from the roster to join the party.');
    if (this.onAction) this.onAction('add_to_party', { party: this.party });
  }

  _handleRemoveFromParty() {
    if (!this.party || this.party.length === 0) {
      this.showToast?.('➖ No party members to remove.');
      return;
    }
    this.showToast?.('➖ Select a party member to return to the roster.');
    if (this.onAction) this.onAction('remove_from_party', { party: this.party });
  }

  _handleNameParty() {
    const currentName = this._getSavedPartyName() || 'The Unnamed Company';
    const newName = window.prompt('Enter party name:', currentName);
    if (newName && newName.trim()) {
      const name = newName.trim().slice(0, 32);
      localStorage.setItem('bt1_party_name', name);
      this.showToast?.(`📜 Party named: "${name}"`);
      if (this.onAction) this.onAction('name_party', { name });
    }
  }

  _handleSaveParty() {
    if (!this.party || this.party.length === 0) {
      this.showToast?.('💾 No party to save.');
      return;
    }
    try {
      const saveData = {
        party: this.party,
        name: this._getSavedPartyName() || 'The Unnamed Company',
        savedAt: new Date().toISOString(),
        version: 1,
      };
      localStorage.setItem('bt1_saved_party', JSON.stringify(saveData));
      this.showToast?.(`💾 Party saved! "${saveData.name}" (${this.party.length} heroes)`);
      if (this.onAction) this.onAction('save_party', saveData);
    } catch (e) {
      this.showToast?.('💾 Save failed — localStorage may be unavailable.');
    }
  }

  _handleDeleteCharacter() {
    if (!this.party || this.party.length === 0) {
      this.showToast?.('☠ No characters to delete.');
      return;
    }
    const names = this.party.map((c, i) => `${i + 1}. ${c.name} (${c.class})`).join('\n');
    const choice = window.prompt(`Which character to DELETE? (enter number)\n${names}`, '');
    if (choice) {
      const idx = parseInt(choice, 10) - 1;
      if (idx >= 0 && idx < this.party.length) {
        const removed = this.party.splice(idx, 1)[0];
        this.showToast?.(`☠ ${removed.name} has been deleted from the roster.`);
        if (this.onAction) this.onAction('delete_char', { character: removed, party: this.party });
      }
    }
  }

  _handleDeleteParty() {
    const confirm = window.confirm('Delete the ENTIRE party? This cannot be undone!');
    if (confirm) {
      this.party.length = 0;
      localStorage.removeItem('bt1_saved_party');
      this.showToast?.('💀 Party disbanded. The Guild awaits new heroes...');
      if (this.onAction) this.onAction('delete_party', {});
      this.close();
    }
  }

  _getSavedPartyName() {
    return localStorage.getItem('bt1_party_name') || null;
  }

  // ─── Clamp panel position to room bounds ─────────────────────────────────────
  _clampPosition(pos) {
    const hw = this.panelW / 2;
    const hh = this.panelH / 2;
    pos.x = Math.max(BOUNDS.xMin + hw, Math.min(BOUNDS.xMax - hw, pos.x));
    pos.y = Math.max(BOUNDS.yMin + hh, Math.min(BOUNDS.yMax - hh, pos.y));
    pos.z = Math.max(BOUNDS.zMin + 0.05, Math.min(BOUNDS.zMax - 0.05, pos.z));
  }

  // ─── Rendering ───────────────────────────────────────────────────────────────

  _render() {
    const ctx = this.ctx;
    const W   = this.CW;
    const H   = this.CH;

    // Clear
    ctx.clearRect(0, 0, W, H);

    const page = MENU_PAGES[this.currentPage];

    // ── Background ────────────────────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, C.bgGrad0);
    bg.addColorStop(1, C.bgGrad1);
    ctx.fillStyle = bg;
    ctx.roundRect(4, 4, W - 8, H - 8, 14);
    ctx.fill();

    // ── Outer gold border ─────────────────────────────────────────────────────
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 3;
    ctx.roundRect(4, 4, W - 8, H - 8, 14);
    ctx.stroke();

    // ── Inner accent border ───────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(100,60,0,0.3)';
    ctx.lineWidth = 1;
    ctx.roundRect(14, 14, W - 28, H - 28, 10);
    ctx.stroke();

    // ── Corner decorations ────────────────────────────────────────────────────
    this._drawCornerDecoration(ctx, 18, 18);
    this._drawCornerDecoration(ctx, W - 18, 18);
    this._drawCornerDecoration(ctx, 18, H - 18);
    this._drawCornerDecoration(ctx, W - 18, H - 18);

    // ── Close button (X) – top right ──────────────────────────────────────────
    const cx = W - 34;
    const cy = 34;
    const cr = 16;
    ctx.fillStyle = 'rgba(120, 20, 20, 0.7)';
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cc4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ff8888';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('✕', cx, cy + 6);

    // ── Title ─────────────────────────────────────────────────────────────────
    const titleGrad = ctx.createLinearGradient(0, 40, 0, 80);
    titleGrad.addColorStop(0, '#ffe566');
    titleGrad.addColorStop(1, '#cc8800');
    ctx.fillStyle = titleGrad;
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255,150,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.fillText(page.title, W / 2, 68);
    ctx.shadowBlur = 0;

    ctx.fillStyle = C.titleSub;
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText(page.subtitle, W / 2, 90);

    // Party name and member count
    const partyName = this._getSavedPartyName();
    if (partyName) {
      ctx.fillStyle = 'rgba(140,110,60,0.8)';
      ctx.font = 'italic 13px "Courier New", monospace';
      ctx.fillText(`"${partyName}"  •  ${this.party.length} member${this.party.length !== 1 ? 's' : ''}`, W / 2, 108);
    } else {
      ctx.fillStyle = 'rgba(100,80,50,0.6)';
      ctx.font = '13px "Courier New", monospace';
      ctx.fillText(`${this.party.length} party member${this.party.length !== 1 ? 's' : ''}`, W / 2, 108);
    }

    // Separator
    const sepGrad = ctx.createLinearGradient(0, 118, W, 118);
    sepGrad.addColorStop(0, 'transparent');
    sepGrad.addColorStop(0.3, C.border);
    sepGrad.addColorStop(0.7, C.border);
    sepGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = sepGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 120);
    ctx.lineTo(W - 30, 120);
    ctx.stroke();

    // ── Menu items ────────────────────────────────────────────────────────────
    const n       = page.items.length;
    const startY  = 132;
    const endY    = H - 48;
    const itemH   = (endY - startY) / n;
    const pad     = 5;
    const textPad = 16;

    for (let i = 0; i < n; i++) {
      const item    = page.items[i];
      const iy      = startY + i * itemH + pad;
      const ih      = itemH - pad * 2;
      const ix      = 20;
      const iw      = W - 40;
      const isHov   = this.hoveredItem === i;

      // Item background
      if (isHov) {
        const hGrad = ctx.createLinearGradient(ix, iy, ix + iw, iy);
        hGrad.addColorStop(0, 'rgba(60,30,120,0.7)');
        hGrad.addColorStop(0.5, 'rgba(100,50,180,0.9)');
        hGrad.addColorStop(1, 'rgba(60,30,120,0.7)');
        ctx.fillStyle = hGrad;
      } else {
        ctx.fillStyle = C.itemBgNorm;
      }
      ctx.roundRect(ix, iy, iw, ih, 6);
      ctx.fill();

      // Item border
      ctx.strokeStyle = isHov ? C.itemBordHL : C.itemBord;
      ctx.lineWidth = isHov ? 1.5 : 0.8;
      ctx.roundRect(ix, iy, iw, ih, 6);
      ctx.stroke();

      // Icon
      ctx.font = `${Math.min(24, ih * 0.5)}px serif`;
      ctx.fillStyle = isHov ? '#ffffff' : C.itemNorm;
      ctx.textAlign = 'left';
      ctx.shadowColor = isHov ? 'rgba(180,100,255,0.8)' : 'transparent';
      ctx.shadowBlur = isHov ? 8 : 0;
      ctx.fillText(item.icon, ix + textPad, iy + ih * 0.55);

      // Label
      const fontSize = Math.min(17, ih * 0.38);
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = isHov ? '#ffffff' : C.itemNorm;
      ctx.fillText(item.label, ix + textPad + 34, iy + ih * 0.45);

      // Description
      const descSize = Math.min(12, ih * 0.27);
      ctx.font = `${descSize}px "Courier New", monospace`;
      ctx.fillStyle = isHov ? 'rgba(200,180,255,0.9)' : C.subText;
      ctx.shadowBlur = 0;
      ctx.fillText(item.desc, ix + textPad + 34, iy + ih * 0.72);

      // Hover arrow
      if (isHov) {
        ctx.fillStyle = '#cc99ff';
        ctx.font = `${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'right';
        ctx.fillText('▶', ix + iw - textPad, iy + ih * 0.55);
        ctx.textAlign = 'left';
      }
    }

    ctx.shadowBlur = 0;

    // ── Footer ────────────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.roundRect(20, H - 42, W - 40, 26, 4);
    ctx.fill();

    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = 'rgba(100,80,140,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('Point & trigger to select  •  Grab edge to move  •  ✕ to close', W / 2, H - 24);
    ctx.textAlign = 'left';

    this.texture.needsUpdate = true;
  }

  _drawCornerDecoration(ctx, x, y) {
    ctx.fillStyle = C.border;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
