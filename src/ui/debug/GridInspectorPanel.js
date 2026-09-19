// GridInspectorPanel.js - Development-only Grid & Cell Inspector Panel
// Gated behind import.meta.env.DEV

import {
  SKARA_BRAE_GRID,
  MAP_WIDTH,
  MAP_HEIGHT,
  getCell,
  isWalkable,
  sourceToWorld,
  worldToSource,
  GARTH_SPAWN
} from '../../data/SkaraBraeMapData.js';

export class GridInspectorPanel {
  constructor(onToggleGridOverlay = null) {
    this.onToggleGridOverlay = onToggleGridOverlay;
    this.selectedX = GARTH_SPAWN.sourceCell.x;
    this.selectedY = GARTH_SPAWN.sourceCell.y;
    this.isOpen = false;
    this.followPlayer = true;

    this.container = null;
    this.createPanel();
  }

  createPanel() {
    this.container = document.createElement('div');
    this.container.id = 'grid-inspector-panel';
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 320px;
      max-height: 85vh;
      background: rgba(15, 23, 42, 0.95);
      border: 2px solid #38bdf8;
      border-radius: 8px;
      padding: 12px;
      color: #f8fafc;
      font-family: monospace;
      font-size: 12px;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
      display: none;
      overflow-y: auto;
    `;

    this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #38bdf8; padding-bottom: 6px; margin-bottom: 8px;">
        <span style="font-weight: bold; color: #38bdf8;">🗺️ SKARA BRAE GRID INSPECTOR</span>
        <button id="close-grid-inspector-btn" style="background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer;">&times;</button>
      </div>

      <div style="margin-bottom: 8px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <label><input type="checkbox" id="inspector-follow-player" checked /> Follow Player</label>
        <label><input type="checkbox" id="inspector-show-3d-grid" /> 3D Grid Overlay</label>
      </div>

      <div style="margin-bottom: 8px; display: flex; gap: 8px;">
        <div>
          <label>X: <input type="number" id="inspector-x" min="0" max="29" value="${this.selectedX}" style="width: 45px; background: #1e293b; border: 1px solid #475569; color: #fff; padding: 2px 4px;" /></label>
        </div>
        <div>
          <label>Y: <input type="number" id="inspector-y" min="0" max="29" value="${this.selectedY}" style="width: 45px; background: #1e293b; border: 1px solid #475569; color: #fff; padding: 2px 4px;" /></label>
        </div>
        <button id="inspector-inspect-btn" style="background: #0284c7; border: none; color: #fff; border-radius: 4px; padding: 2px 8px; cursor: pointer;">Query</button>
      </div>

      <div id="inspector-data-body" style="background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 8px; line-height: 1.5;">
        <!-- Data populated dynamically -->
      </div>

      <div style="margin-top: 8px; border-top: 1px solid #334155; padding-top: 6px;">
        <div style="font-weight: bold; color: #f3cf65; margin-bottom: 4px;">🎮 PLAYER STATE</div>
        <div id="inspector-player-body">
          <!-- Player pos & facing -->
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    // Bind events
    this.container.querySelector('#close-grid-inspector-btn').addEventListener('click', () => this.hide());
    const followCheck = this.container.querySelector('#inspector-follow-player');
    followCheck.addEventListener('change', (e) => {
      this.followPlayer = e.target.checked;
    });

    const gridOverlayCheck = this.container.querySelector('#inspector-show-3d-grid');
    if (gridOverlayCheck) {
      gridOverlayCheck.addEventListener('change', (e) => {
        if (this.onToggleGridOverlay) {
          this.onToggleGridOverlay(e.target.checked);
        }
      });
    }

    const xInput = this.container.querySelector('#inspector-x');
    const yInput = this.container.querySelector('#inspector-y');
    this.container.querySelector('#inspector-inspect-btn').addEventListener('click', () => {
      this.selectedX = parseInt(xInput.value) || 0;
      this.selectedY = parseInt(yInput.value) || 0;
      this.followPlayer = false;
      followCheck.checked = false;
      this.updateDisplay();
    });

    // Keyboard shortcut `F2` or `KeyG` to toggle inspector
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F2' || (e.ctrlKey && e.code === 'KeyG')) {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  show() {
    this.isOpen = true;
    this.container.style.display = 'block';
    this.updateDisplay();
  }

  hide() {
    this.isOpen = false;
    this.container.style.display = 'none';
  }

  toggle() {
    if (this.isOpen) this.hide();
    else this.show();
  }

  update(worldX = null, worldZ = null, rigYaw = null) {
    if (!this.isOpen) return;

    if (this.followPlayer && worldX !== null && worldZ !== null) {
      const src = worldToSource(worldX, worldZ);
      if (src.inBounds) {
        this.selectedX = src.x;
        this.selectedY = src.y;
        const xInput = this.container.querySelector('#inspector-x');
        const yInput = this.container.querySelector('#inspector-y');
        if (xInput) xInput.value = src.x;
        if (yInput) yInput.value = src.y;
      }
    }

    this.updateDisplay(worldX, worldZ, rigYaw);
  }

  updateDisplay(worldX = null, worldZ = null, rigYaw = null) {
    const dataBody = this.container.querySelector('#inspector-data-body');
    const playerBody = this.container.querySelector('#inspector-player-body');
    if (!dataBody || !playerBody) return;

    const cell = getCell(this.selectedX, this.selectedY);
    if (!cell) {
      dataBody.innerHTML = `<span style="color: #ef4444;">Cell (${this.selectedX}, ${this.selectedY}) Out of Bounds</span>`;
      return;
    }

    const { worldX: cx, worldZ: cz } = sourceToWorld(this.selectedX, this.selectedY);
    const walkableColor = cell.walkable ? '#4ade80' : '#f87171';

    dataBody.innerHTML = `
      <div><strong>Source (X, Y):</strong> <span style="color: #38bdf8;">(${cell.x}, ${cell.y})</span></div>
      <div><strong>World (X, Z):</strong> <span style="color: #cbd5e1;">(${cx.toFixed(1)}m, ${cz.toFixed(1)}m)</span></div>
      <div><strong>Terrain:</strong> <span style="color: #fbbf24;">${cell.terrain}</span></div>
      <div><strong>Walkable:</strong> <span style="color: ${walkableColor}; font-weight: bold;">${cell.walkable}</span></div>
      <div><strong>Landmark ID:</strong> <span style="color: #c084fc;">${cell.landmarkId || 'none'}</span></div>
      <div><strong>Source Marker:</strong> <span style="color: #f43f5e;">${cell.sourceMarker || 'none'}</span></div>
      <div><strong>Special Type:</strong> <span style="color: #a78bfa;">${cell.specialType || 'none'}</span></div>
      <div><strong>Unresolved:</strong> <span style="color: ${cell.unresolved ? '#f59e0b' : '#64748b'};">${cell.unresolved || false}</span></div>
      <div><strong>Source Notes:</strong> <span style="color: #94a3b8;">${cell.sourceNotes ? cell.sourceNotes.join(', ') : 'none'}</span></div>
    `;

    // Player state
    if (worldX !== null && worldZ !== null) {
      let facingStr = 'Unknown';
      if (rigYaw !== null) {
        const deg = ((rigYaw * 180 / Math.PI) % 360 + 360) % 360;
        if (deg >= 45 && deg < 135) facingStr = `West (${deg.toFixed(0)}°)`;
        else if (deg >= 135 && deg < 225) facingStr = `South (${deg.toFixed(0)}°)`;
        else if (deg >= 225 && deg < 315) facingStr = `East (${deg.toFixed(0)}°)`;
        else facingStr = `North (${deg.toFixed(0)}°)`;
      }

      playerBody.innerHTML = `
        <div><strong>Pos:</strong> (${worldX.toFixed(2)}m, ${worldZ.toFixed(2)}m)</div>
        <div><strong>Facing:</strong> ${facingStr}</div>
      `;
    }
  }

  mount() {
    this.show();
  }
}

export function createGridInspectorPanel(getRigCallback = null, getFacingCallback = null) {
  return new GridInspectorPanel(getRigCallback, getFacingCallback);
}
