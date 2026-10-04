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
 * IMPORTANT: No window.prompt() or window.confirm() — those block/freeze in WebXR.
 *            All input/confirmation is done via in-panel canvas sub-screens.
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
  confirmYes: '#2a7a2a',
  confirmNo:  '#7a2a2a',
};

// ─── Menu structure ───────────────────────────────────────────────────────────
const MENU_ITEMS = [
  { id: 'create_char',       icon: '✦', label: 'Create New Character',       desc: 'Roll stats and add a new hero to the roster' },
  { id: 'add_to_party',      icon: '➕', label: 'Add Character to Party',     desc: 'Add a roster character to the active party' },
  { id: 'remove_from_party', icon: '➖', label: 'Remove from Party',          desc: 'Move a party member back to the roster' },
  { id: 'name_party',        icon: '📜', label: 'Name Party',                 desc: 'Give your adventuring company a name' },
  { id: 'save_party',        icon: '💾', label: 'Save Party',                 desc: 'Save your party progress to local storage' },
  { id: 'delete_char',       icon: '☠',  label: 'Delete Character',           desc: 'Permanently remove a character from roster' },
  { id: 'delete_party',      icon: '💀', label: 'Delete Party',               desc: 'Disband and erase the entire party (cannot undo)' },
];

// ─── Sub-screen mode constants ────────────────────────────────────────────────
const MODE = {
  MAIN:        'MAIN',
  CONFIRM:     'CONFIRM',     // Yes/No dialog
  NAME_INPUT:  'NAME_INPUT',  // Virtual keyboard / letter picker
  CHAR_SELECT: 'CHAR_SELECT', // Pick a character from a list
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
    this.isOpen      = false;
    this.hoveredItem = -1;
    this.isDragging  = false;
    this.dragOffset  = new THREE.Vector3();

    // Sub-screen state
    this.mode          = MODE.MAIN;
    this.confirmMsg    = '';
    this.confirmAction = null;   // function to call on YES
    this.confirmHover  = -1;     // 0=Yes, 1=No
    this.charSelectList   = [];  // array of {label, value} for character picker
    this.charSelectAction = null;// function(value) called on selection
    this.charSelectHover  = -1;
    this.nameInputStr  = '';
    this.nameInputAction = null; // function(name) called on confirm

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
    this.mode        = MODE.MAIN;
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
    this.isOpen     = false;
    this.isDragging = false;
    this.mode       = MODE.MAIN;
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

    if (this.mode === MODE.CONFIRM) {
      this._handleConfirmClick(uv);
      return;
    }

    if (this.mode === MODE.CHAR_SELECT) {
      this._handleCharSelectClick(uv);
      return;
    }

    if (this.mode === MODE.NAME_INPUT) {
      this._handleNameInputClick(uv);
      return;
    }

    // MAIN mode — map UV to item index
    const idx = this._uvToItemIndex(uv);
    if (idx < 0 || idx >= MENU_ITEMS.length) return;
    this._activateItem(MENU_ITEMS[idx]);
  }

  /**
   * Update hover highlight.
   * @param {THREE.Vector2} uv
   */
  handleHover(uv) {
    if (!uv) {
      if (this.hoveredItem !== -1 || this.confirmHover !== -1 || this.charSelectHover !== -1) {
        this.hoveredItem = -1;
        this.confirmHover = -1;
        this.charSelectHover = -1;
        this._render();
      }
      return;
    }

    if (this.mode === MODE.CONFIRM) {
      const h = this._uvToConfirmBtn(uv);
      if (h !== this.confirmHover) { this.confirmHover = h; this._render(); }
      return;
    }
    if (this.mode === MODE.CHAR_SELECT) {
      const h = this._uvToCharSelectIdx(uv);
      if (h !== this.charSelectHover) { this.charSelectHover = h; this._render(); }
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
   * Set the party reference (called when party changes).
   */
  setParty(party) {
    this.party = party;
    if (this.isOpen) this._render();
  }

  /**
   * Returns all raycastable objects for this panel.
   * IMPORTANT: returns empty array when panel is closed so that
   * closed-panel colliders do NOT swallow bard-click events.
   */
  get interactableObjects() {
    if (!this.isOpen) return [];
    return [this.panelCollider, ...this.grabHandles];
  }

  // ─── UV → item index (MAIN mode) ─────────────────────────────────────────────
  _uvToItemIndex(uv) {
    const n = MENU_ITEMS.length;
    const yStart = 0.12;
    const yEnd   = 0.91;
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

  // ─── UV → confirm button (0=Yes, 1=No, -1=none) ──────────────────────────────
  _uvToConfirmBtn(uv) {
    // Yes button: left half, lower portion
    // No button: right half, lower portion
    if (uv.y > 0.55 || uv.y < 0.30) return -1;
    if (uv.x < 0.08 || uv.x > 0.92) return -1;
    return uv.x < 0.50 ? 0 : 1;
  }

  // ─── UV → char select index ───────────────────────────────────────────────────
  _uvToCharSelectIdx(uv) {
    const list = this.charSelectList;
    if (!list.length) return -1;
    const yStart = 0.20;
    const yEnd   = 0.82;
    if (uv.y < yStart || uv.y > yEnd) return -1;
    const fraction = (uv.y - yStart) / (yEnd - yStart);
    const idx = Math.floor((1.0 - fraction) * list.length);
    if (idx < 0 || idx >= list.length) return -1;
    return idx;
  }

  // ─── Sub-screen click handlers ────────────────────────────────────────────────

  _handleConfirmClick(uv) {
    const btn = this._uvToConfirmBtn(uv);
    if (btn === 0) {
      // Yes
      const action = this.confirmAction;
      this._returnToMain();
      if (action) action();
    } else if (btn === 1) {
      // No
      this._returnToMain();
    }
  }

  _handleCharSelectClick(uv) {
    const idx = this._uvToCharSelectIdx(uv);
    if (idx < 0 || idx >= this.charSelectList.length) {
      // Back button area (top)
      if (uv.y > 0.88) { this._returnToMain(); }
      return;
    }
    const entry = this.charSelectList[idx];
    const action = this.charSelectAction;
    this._returnToMain();
    if (action) action(entry.value, idx);
  }

  _handleNameInputClick(uv) {
    // Simple virtual keyboard: A-Z rows + confirm/back/clear
    // Confirm: y > 0.88 (top area in UV = bottom in canvas = confirm row)
    // Clear: bottom-left
    // Back/Cancel: bottom-right
    const keyResult = this._uvToNameKey(uv);
    if (!keyResult) return;

    if (keyResult === 'CONFIRM') {
      const name = this.nameInputStr.trim();
      const action = this.nameInputAction;
      this.nameInputStr = '';
      this._returnToMain();
      if (name && action) action(name);
      return;
    }
    if (keyResult === 'CANCEL') {
      this.nameInputStr = '';
      this._returnToMain();
      return;
    }
    if (keyResult === 'CLEAR') {
      this.nameInputStr = '';
      this._render();
      return;
    }
    if (keyResult === 'BACKSPACE') {
      this.nameInputStr = this.nameInputStr.slice(0, -1);
      this._render();
      return;
    }
    if (this.nameInputStr.length < 24) {
      this.nameInputStr += keyResult;
      this._render();
    }
  }

  // ─── Activate a main menu item ────────────────────────────────────────────────
  _activateItem(item) {
    switch (item.id) {
      case 'create_char':     this._handleCreateCharacter();  break;
      case 'add_to_party':    this._handleAddToParty();       break;
      case 'remove_from_party': this._handleRemoveFromParty(); break;
      case 'name_party':      this._handleNameParty();        break;
      case 'save_party':      this._handleSaveParty();        break;
      case 'delete_char':     this._handleDeleteCharacter();  break;
      case 'delete_party':    this._handleDeleteParty();      break;
      default:
        if (this.onAction) this.onAction(item.id, { item });
    }
    this._render();
  }

  // ─── Action handlers (NO window.prompt/confirm — all in-panel) ───────────────

  _handleCreateCharacter() {
    this.showToast?.('✦ Opening Character Creation...');
    this.close();
    if (this.onAction) this.onAction('create_char', {});
  }

  _handleAddToParty() {
    // Build roster = all characters NOT already in party
    const partyNames = new Set((this.party || []).map(c => c.name));
    const roster = this._getRoster().filter(c => !partyNames.has(c.name));

    if (!roster.length) {
      this.showToast?.('➕ No characters available to add. Create some first!');
      return;
    }

    this._showCharSelect(
      'Add Character to Party',
      roster.map(c => ({ label: `${c.name}  (${c.class || '?'}, Lv${c.level || 1})`, value: c })),
      (char) => {
        if (!this.party) this.party = [];
        if (this.party.length >= 6) {
          this.showToast?.('➕ Party is full! (6/6)');
          return;
        }
        this.party.push(char);
        this._saveRoster();
        this.showToast?.(`➕ ${char.name} joined the party! (${this.party.length}/6)`);
        if (this.onAction) this.onAction('add_to_party', { character: char, party: this.party });
      }
    );
  }

  _handleRemoveFromParty() {
    if (!this.party || this.party.length === 0) {
      this.showToast?.('➖ No party members to remove.');
      return;
    }

    this._showCharSelect(
      'Remove from Party',
      this.party.map(c => ({ label: `${c.name}  (${c.class || '?'}, Lv${c.level || 1})`, value: c })),
      (char, idx) => {
        this.party.splice(idx, 1);
        this._saveRoster();
        this.showToast?.(`➖ ${char.name} returned to the roster.`);
        if (this.onAction) this.onAction('remove_from_party', { character: char, party: this.party });
      }
    );
  }

  _handleNameParty() {
    const current = this._getSavedPartyName() || '';
    this._showNameInput(
      'Name Your Party',
      current,
      (name) => {
        localStorage.setItem('bt1_party_name', name);
        this.showToast?.(`📜 Party named: "${name}"`);
        if (this.onAction) this.onAction('name_party', { name });
      }
    );
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
    this._render();
  }

  _handleDeleteCharacter() {
    const roster = this._getRoster();
    if (!roster.length) {
      this.showToast?.('☠ No characters to delete.');
      return;
    }

    this._showCharSelect(
      'Delete Character (Permanent)',
      roster.map(c => ({ label: `${c.name}  (${c.class || '?'}, Lv${c.level || 1})`, value: c })),
      (char, idx) => {
        this._showConfirm(
          `☠ PERMANENTLY delete\n"${char.name}"?\nThis cannot be undone!`,
          () => {
            const r = this._getRoster();
            const ri = r.findIndex(c => c.name === char.name);
            if (ri >= 0) r.splice(ri, 1);
            this._setRoster(r);
            // Also remove from party if present
            if (this.party) {
              const pi = this.party.findIndex(c => c.name === char.name);
              if (pi >= 0) this.party.splice(pi, 1);
            }
            this.showToast?.(`☠ ${char.name} has been deleted.`);
            if (this.onAction) this.onAction('delete_char', { character: char });
          }
        );
      }
    );
  }

  _handleDeleteParty() {
    if (!this.party || this.party.length === 0) {
      this.showToast?.('💀 No active party to delete.');
      return;
    }
    this._showConfirm(
      `💀 DISBAND the entire party?\nAll members will be lost!\nThis cannot be undone!`,
      () => {
        this.party.length = 0;
        localStorage.removeItem('bt1_saved_party');
        this.showToast?.('💀 Party disbanded. The Guild awaits new heroes...');
        if (this.onAction) this.onAction('delete_party', {});
        this.close();
      }
    );
  }

  // ─── Sub-screen launchers ─────────────────────────────────────────────────────

  _showConfirm(message, onYes) {
    this.mode          = MODE.CONFIRM;
    this.confirmMsg    = message;
    this.confirmAction = onYes;
    this.confirmHover  = -1;
    this._render();
  }

  _showCharSelect(title, list, onSelect) {
    this.mode             = MODE.CHAR_SELECT;
    this.charSelectTitle  = title;
    this.charSelectList   = list;
    this.charSelectAction = onSelect;
    this.charSelectHover  = -1;
    this._render();
  }

  _showNameInput(title, currentValue, onConfirm) {
    this.mode            = MODE.NAME_INPUT;
    this.nameInputTitle  = title;
    this.nameInputStr    = currentValue || '';
    this.nameInputAction = onConfirm;
    this._render();
  }

  _returnToMain() {
    this.mode            = MODE.MAIN;
    this.confirmMsg      = '';
    this.confirmAction   = null;
    this.confirmHover    = -1;
    this.charSelectList  = [];
    this.charSelectAction = null;
    this.charSelectHover = -1;
    this.nameInputStr    = '';
    this.nameInputAction = null;
    this.hoveredItem     = -1;
    this._render();
  }

  // ─── Roster helpers (uses localStorage separate from party save) ──────────────
  _getRoster() {
    try {
      return JSON.parse(localStorage.getItem('bt1_roster') || '[]');
    } catch { return []; }
  }
  _setRoster(roster) {
    try { localStorage.setItem('bt1_roster', JSON.stringify(roster)); } catch {}
  }
  _saveRoster() {
    // Merge party back into full roster
    const roster = this._getRoster();
    for (const member of (this.party || [])) {
      if (!roster.find(c => c.name === member.name)) roster.push(member);
    }
    this._setRoster(roster);
  }
  _getSavedPartyName() {
    return localStorage.getItem('bt1_party_name') || null;
  }

  // ─── Name input keyboard UV map ───────────────────────────────────────────────
  // Virtual keyboard rows rendered in _renderNameInput
  _uvToNameKey(uv) {
    const W = this.CW; const H = this.CH;

    // Confirm button: UV y > 0.90 (top area)
    if (uv.y > 0.90 && uv.x > 0.55) return 'CONFIRM';
    if (uv.y > 0.90 && uv.x < 0.45) return 'CANCEL';

    // Backspace: bottom-left area approx y 0.08-0.16
    if (uv.y < 0.15 && uv.x > 0.65) return 'BACKSPACE';
    if (uv.y < 0.15 && uv.x < 0.35) return 'CLEAR';

    // Keyboard rows — 3 rows occupying UV y 0.20 to 0.78
    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM '];
    const rowYStart = 0.78;
    const rowYEnd   = 0.20;
    const rowH      = (rowYStart - rowYEnd) / rows.length;

    for (let r = 0; r < rows.length; r++) {
      const rowYTop = rowYStart - r * rowH;
      const rowYBot = rowYTop - rowH;
      if (uv.y <= rowYTop && uv.y >= rowYBot) {
        const chars = rows[r];
        const colW  = 1.0 / chars.length;
        const col   = Math.floor(uv.x / colW);
        if (col >= 0 && col < chars.length) {
          const ch = chars[col];
          return ch === ' ' ? ' ' : ch;
        }
      }
    }
    return null;
  }

  // ─── Clamp panel position to room bounds ─────────────────────────────────────
  _clampPosition(pos) {
    const hw = this.panelW / 2;
    const hh = this.panelH / 2;
    pos.x = Math.max(BOUNDS.xMin + hw, Math.min(BOUNDS.xMax - hw, pos.x));
    pos.y = Math.max(BOUNDS.yMin + hh, Math.min(BOUNDS.yMax - hh, pos.y));
    pos.z = Math.max(BOUNDS.zMin + 0.05, Math.min(BOUNDS.zMax - 0.05, pos.z));
  }

  // ─── Rendering dispatcher ─────────────────────────────────────────────────────
  _render() {
    switch (this.mode) {
      case MODE.CONFIRM:     this._renderConfirm();    break;
      case MODE.CHAR_SELECT: this._renderCharSelect(); break;
      case MODE.NAME_INPUT:  this._renderNameInput();  break;
      default:               this._renderMain();       break;
    }
    this.texture.needsUpdate = true;
  }

  // ─── Shared: draw frame & header ─────────────────────────────────────────────
  _drawFrame(title, subtitle = '') {
    const ctx = this.ctx;
    const W = this.CW;
    const H = this.CH;

    ctx.clearRect(0, 0, W, H);

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, C.bgGrad0);
    bg.addColorStop(1, C.bgGrad1);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(4, 4, W - 8, H - 8, 14);
    ctx.fill();

    // Outer gold border
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(4, 4, W - 8, H - 8, 14);
    ctx.stroke();

    // Inner accent border
    ctx.strokeStyle = 'rgba(100,60,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(14, 14, W - 28, H - 28, 10);
    ctx.stroke();

    // Corner decorations
    this._drawCornerDecoration(ctx, 18, 18);
    this._drawCornerDecoration(ctx, W - 18, 18);
    this._drawCornerDecoration(ctx, 18, H - 18);
    this._drawCornerDecoration(ctx, W - 18, H - 18);

    // Close button (X) – top right
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

    // Title
    const titleGrad = ctx.createLinearGradient(0, 40, 0, 80);
    titleGrad.addColorStop(0, '#ffe566');
    titleGrad.addColorStop(1, '#cc8800');
    ctx.fillStyle = titleGrad;
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255,150,0,0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText(title, W / 2, 66);
    ctx.shadowBlur = 0;

    if (subtitle) {
      ctx.fillStyle = C.titleSub;
      ctx.font = '14px "Courier New", monospace';
      ctx.fillText(subtitle, W / 2, 88);
    }

    // Separator
    const sepGrad = ctx.createLinearGradient(0, 100, W, 100);
    sepGrad.addColorStop(0, 'transparent');
    sepGrad.addColorStop(0.3, C.border);
    sepGrad.addColorStop(0.7, C.border);
    sepGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = sepGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 102);
    ctx.lineTo(W - 30, 102);
    ctx.stroke();
  }

  // ─── MAIN screen ─────────────────────────────────────────────────────────────
  _renderMain() {
    const ctx = this.ctx;
    const W   = this.CW;
    const H   = this.CH;

    this._drawFrame('Adventurers Guild', 'Character & Party Management');

    // Party name / member count
    const partyName = this._getSavedPartyName();
    ctx.textAlign = 'center';
    if (partyName) {
      ctx.fillStyle = 'rgba(140,110,60,0.8)';
      ctx.font = 'italic 13px "Courier New", monospace';
      ctx.fillText(`"${partyName}"  •  ${this.party.length} member${this.party.length !== 1 ? 's' : ''}`, W / 2, 116);
    } else {
      ctx.fillStyle = 'rgba(100,80,50,0.6)';
      ctx.font = '13px "Courier New", monospace';
      ctx.fillText(`${this.party.length} party member${this.party.length !== 1 ? 's' : ''}`, W / 2, 116);
    }

    // Menu items
    const n      = MENU_ITEMS.length;
    const startY = 128;
    const endY   = H - 44;
    const itemH  = (endY - startY) / n;
    const pad    = 5;

    for (let i = 0; i < n; i++) {
      const item  = MENU_ITEMS[i];
      const iy    = startY + i * itemH + pad;
      const ih    = itemH - pad * 2;
      const ix    = 20;
      const iw    = W - 40;
      const isHov = this.hoveredItem === i;

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
      ctx.beginPath();
      ctx.roundRect(ix, iy, iw, ih, 6);
      ctx.fill();

      // Item border
      ctx.strokeStyle = isHov ? C.itemBordHL : C.itemBord;
      ctx.lineWidth   = isHov ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.roundRect(ix, iy, iw, ih, 6);
      ctx.stroke();

      const tPad = 16;

      // Icon
      ctx.font      = `${Math.min(22, ih * 0.5)}px serif`;
      ctx.fillStyle = isHov ? '#ffffff' : C.itemNorm;
      ctx.textAlign = 'left';
      ctx.shadowColor = isHov ? 'rgba(180,100,255,0.8)' : 'transparent';
      ctx.shadowBlur  = isHov ? 8 : 0;
      ctx.fillText(item.icon, ix + tPad, iy + ih * 0.56);

      // Label
      const fSize = Math.min(16, ih * 0.38);
      ctx.font      = `bold ${fSize}px "Courier New", monospace`;
      ctx.fillStyle = isHov ? '#ffffff' : C.itemNorm;
      ctx.fillText(item.label, ix + tPad + 32, iy + ih * 0.45);

      // Description
      const dSize = Math.min(11, ih * 0.27);
      ctx.font      = `${dSize}px "Courier New", monospace`;
      ctx.fillStyle = isHov ? 'rgba(200,180,255,0.9)' : C.subText;
      ctx.shadowBlur = 0;
      ctx.fillText(item.desc, ix + tPad + 32, iy + ih * 0.74);

      // Hover arrow
      if (isHov) {
        ctx.fillStyle = '#cc99ff';
        ctx.font      = `${fSize}px "Courier New", monospace`;
        ctx.textAlign = 'right';
        ctx.fillText('▶', ix + iw - tPad, iy + ih * 0.56);
        ctx.textAlign = 'left';
      }
    }

    ctx.shadowBlur = 0;

    // Footer
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(20, H - 40, W - 40, 24, 4);
    ctx.fill();
    ctx.font      = '11px "Courier New", monospace';
    ctx.fillStyle = 'rgba(100,80,140,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('Point & trigger to select  •  Grab edge to move  •  ✕ to close', W / 2, H - 22);
    ctx.textAlign = 'left';
  }

  // ─── CONFIRM sub-screen ───────────────────────────────────────────────────────
  _renderConfirm() {
    const ctx = this.ctx;
    const W   = this.CW;
    const H   = this.CH;

    this._drawFrame('Confirm Action');

    // Message (multi-line)
    ctx.fillStyle = '#e0d0b0';
    ctx.font      = '18px "Courier New", monospace';
    ctx.textAlign = 'center';
    const lines = this.confirmMsg.split('\n');
    const lineH = 28;
    const startY = 200 - ((lines.length - 1) * lineH) / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], W / 2, startY + i * lineH);
    }

    // Yes / No buttons
    const btnW = 180;
    const btnH = 56;
    const btnY = 340;
    const yesX = W / 2 - 100 - btnW / 2;
    const noX  = W / 2 + 100 - btnW / 2;

    const yHov = this.confirmHover === 0;
    const nHov = this.confirmHover === 1;

    // YES
    ctx.fillStyle = yHov ? '#3a9a3a' : C.confirmYes;
    ctx.beginPath();
    ctx.roundRect(yesX, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.strokeStyle = yHov ? '#88ff88' : '#55aa55';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('✔  YES', yesX + btnW / 2, btnY + 36);

    // NO
    ctx.fillStyle = nHov ? '#cc4444' : C.confirmNo;
    ctx.beginPath();
    ctx.roundRect(noX, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.strokeStyle = nHov ? '#ff8888' : '#aa4444';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 22px "Courier New", monospace';
    ctx.fillText('✘  NO', noX + btnW / 2, btnY + 36);

    ctx.textAlign = 'left';
  }

  // ─── CHAR SELECT sub-screen ───────────────────────────────────────────────────
  _renderCharSelect() {
    const ctx  = this.ctx;
    const W    = this.CW;
    const H    = this.CH;
    const list = this.charSelectList;

    this._drawFrame(this.charSelectTitle || 'Select Character');

    if (!list.length) {
      ctx.fillStyle = 'rgba(180,140,80,0.8)';
      ctx.font      = '18px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No characters available.', W / 2, H / 2);
      ctx.textAlign = 'left';
      this._drawBackBtn();
      return;
    }

    const startY = 120;
    const endY   = H - 72;
    const itemH  = Math.min(68, (endY - startY) / list.length);
    const pad    = 4;

    for (let i = 0; i < list.length; i++) {
      const entry  = list[i];
      const iy     = startY + i * itemH + pad;
      const ih     = itemH - pad * 2;
      const ix     = 24;
      const iw     = W - 48;
      const isHov  = this.charSelectHover === i;

      ctx.fillStyle = isHov ? 'rgba(80,40,140,0.85)' : 'rgba(20,10,40,0.5)';
      ctx.beginPath();
      ctx.roundRect(ix, iy, iw, ih, 6);
      ctx.fill();

      ctx.strokeStyle = isHov ? C.itemBordHL : C.itemBord;
      ctx.lineWidth   = isHov ? 1.5 : 0.8;
      ctx.stroke();

      ctx.fillStyle   = isHov ? '#ffffff' : C.itemNorm;
      ctx.font        = `bold 16px "Courier New", monospace`;
      ctx.textAlign   = 'left';
      ctx.shadowColor = isHov ? 'rgba(180,100,255,0.8)' : 'transparent';
      ctx.shadowBlur  = isHov ? 6 : 0;
      ctx.fillText(entry.label, ix + 16, iy + ih * 0.62);
      ctx.shadowBlur  = 0;

      if (isHov) {
        ctx.fillStyle = '#cc99ff';
        ctx.textAlign = 'right';
        ctx.fillText('▶', ix + iw - 12, iy + ih * 0.62);
        ctx.textAlign = 'left';
      }
    }

    this._drawBackBtn();
  }

  // ─── NAME INPUT sub-screen ────────────────────────────────────────────────────
  _renderNameInput() {
    const ctx = this.ctx;
    const W   = this.CW;
    const H   = this.CH;

    this._drawFrame(this.nameInputTitle || 'Enter Name');

    // Current input display
    ctx.fillStyle = 'rgba(20,10,40,0.85)';
    ctx.beginPath();
    ctx.roundRect(30, 110, W - 60, 48, 8);
    ctx.fill();
    ctx.strokeStyle = C.borderHL;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const display = this.nameInputStr + (Date.now() % 800 < 400 ? '▌' : '');
    ctx.fillStyle = '#ffe566';
    ctx.font      = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(display || '▌', 44, 144);

    // Virtual keyboard
    const rows  = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM '];
    const keyH  = 52;
    const startY = 175;

    for (let r = 0; r < rows.length; r++) {
      const chars   = rows[r];
      const rowY    = startY + r * (keyH + 4);
      const keyW    = Math.floor((W - 40) / chars.length);
      const offsetX = 20 + (W - 40 - keyW * chars.length) / 2;

      for (let c = 0; c < chars.length; c++) {
        const ch = chars[c];
        const kx = offsetX + c * keyW;
        ctx.fillStyle = 'rgba(40,20,70,0.85)';
        ctx.beginPath();
        ctx.roundRect(kx + 2, rowY, keyW - 4, keyH, 5);
        ctx.fill();
        ctx.strokeStyle = C.itemBord;
        ctx.lineWidth   = 1;
        ctx.stroke();

        ctx.fillStyle = C.itemNorm;
        ctx.font      = `bold 16px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(ch === ' ' ? '⎵' : ch, kx + keyW / 2, rowY + keyH * 0.65);
      }
    }

    // BACKSPACE & CLEAR
    const utilY = startY + rows.length * (keyH + 4) + 4;
    ctx.fillStyle = 'rgba(80,20,20,0.8)';
    ctx.beginPath();
    ctx.roundRect(20, utilY, 160, 44, 6);
    ctx.fill();
    ctx.strokeStyle = '#aa3333'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ff9999'; ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⌫ CLEAR', 100, utilY + 28);

    ctx.fillStyle = 'rgba(40,20,80,0.8)';
    ctx.beginPath();
    ctx.roundRect(W - 200, utilY, 180, 44, 6);
    ctx.fill();
    ctx.strokeStyle = '#6644aa'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#cc99ff';
    ctx.fillText('⌫ BACK', W - 110, utilY + 28);

    // CONFIRM and CANCEL buttons
    const confirmY = H - 80;
    ctx.fillStyle = 'rgba(20,70,20,0.9)';
    ctx.beginPath();
    ctx.roundRect(20, confirmY, 220, 48, 8);
    ctx.fill();
    ctx.strokeStyle = '#55aa55'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#88ff88'; ctx.font = 'bold 17px "Courier New", monospace';
    ctx.fillText('✔  CONFIRM NAME', 130, confirmY + 31);

    ctx.fillStyle = 'rgba(70,20,20,0.9)';
    ctx.beginPath();
    ctx.roundRect(W - 240, confirmY, 220, 48, 8);
    ctx.fill();
    ctx.strokeStyle = '#aa4444'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ff8888';
    ctx.fillText('✘  CANCEL', W - 130, confirmY + 31);

    ctx.textAlign = 'left';
  }

  // ─── Shared helpers ───────────────────────────────────────────────────────────

  _drawBackBtn() {
    const ctx = this.ctx;
    const W   = this.CW;
    const H   = this.CH;
    ctx.fillStyle = 'rgba(40,20,80,0.7)';
    ctx.beginPath();
    ctx.roundRect(20, H - 56, 180, 36, 6);
    ctx.fill();
    ctx.strokeStyle = C.itemBord; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle   = C.back;
    ctx.font        = '14px "Courier New", monospace';
    ctx.textAlign   = 'center';
    ctx.fillText('◀  Back', 110, H - 32);
    ctx.textAlign   = 'left';
  }

  _drawCornerDecoration(ctx, x, y) {
    ctx.fillStyle = C.border;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
