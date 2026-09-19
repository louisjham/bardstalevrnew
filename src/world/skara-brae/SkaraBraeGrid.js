import * as THREE from 'three';
import {
  SKARA_BRAE_GRID,
  MAP_WIDTH,
  MAP_HEIGHT,
  CELL_SIZE_METERS,
  getCell,
  isWalkable,
  sourceToWorld,
  worldToSource,
  LandmarkId,
  TerrainType
} from '../../data/SkaraBraeMapData.js';

// SkaraBraeGrid.js - 30x30 First-Person City Grid & Diegetic Spatial Auto-Mapper
export class SkaraBraeGrid {
  constructor(scene = null) {
    this.scene = scene;
    this.width = MAP_WIDTH;
    this.height = MAP_HEIGHT;
    this.cellSize = CELL_SIZE_METERS;

    // 30x30 Fog-of-war exploration matrix [y][x]
    this.exploredGrid = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => false)
    );

    this.mapGroup = new THREE.Group();
    this.mapGroup.name = 'SkaraBraeGrid';
    this.mapGroup.visible = false;

    if (this.scene) {
      this.scene.add(this.mapGroup);
    }
  }

  /**
   * Check if a cell is walkable.
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isWalkable(x, y) {
    return isWalkable(x, y);
  }

  /**
   * Get metadata for a specific cell.
   * @param {number} x
   * @param {number} y
   * @returns {object|null}
   */
  getCell(x, y) {
    return getCell(x, y);
  }

  /**
   * Convert source coordinates to world position.
   * @param {number} x
   * @param {number} y
   * @returns {{ worldX: number, worldZ: number, worldY: number }}
   */
  sourceToWorld(x, y) {
    return sourceToWorld(x, y);
  }

  /**
   * Convert world position to source grid coordinates.
   * @param {number} worldX
   * @param {number} worldZ
   * @returns {{ x: number, y: number, inBounds: boolean }}
   */
  worldToSource(worldX, worldZ) {
    return worldToSource(worldX, worldZ);
  }

  /**
   * Check if a cell is explored.
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isExplored(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.exploredGrid[y][x];
  }

  /**
   * Manually reveal a cell in fog of war.
   * @param {number} x
   * @param {number} y
   */
  revealCell(x, y) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.exploredGrid[y][x] = true;
    }
  }

  /**
   * Update Fog of War Exploration when player is at a world position.
   * @param {number} playerX - World X coordinate
   * @param {number} playerZ - World Z coordinate
   * @returns {{ x: number, y: number }|null} Revealed cell or null if out of bounds
   */
  revealTile(playerX, playerZ) {
    const { x, y, inBounds } = this.worldToSource(playerX, playerZ);

    if (inBounds) {
      this.exploredGrid[y][x] = true;
      return { x, y };
    }
    return null;
  }

  /**
   * Generate 2D Canvas Map for the Palm-Flip Grimoire Auto-Mapper (Page 2).
   * @param {CanvasRenderingContext2D} canvasCtx
   */
  renderDiegeticMapCanvas(canvasCtx) {
    if (!canvasCtx) return;
    const ctx = canvasCtx;

    // Dark parchment background
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(0, 0, 240, 240);

    const tileW = 240 / this.width;
    const tileH = 240 / this.height;

    // Y=29 is North (top of canvas, r=0), Y=0 is South (bottom of canvas, r=29)
    for (let y = 0; y < this.height; y++) {
      const r = 29 - y;
      for (let x = 0; x < this.width; x++) {
        const isExplored = this.exploredGrid[y][x];
        const cell = SKARA_BRAE_GRID[y][x];

        if (!isExplored) {
          ctx.fillStyle = '#0c0a09'; // Unexplored Fog of War
        } else if (cell.terrain === TerrainType.WALL) {
          ctx.fillStyle = '#57534e'; // Stone Wall
        } else if (cell.landmarkId === LandmarkId.GARTHS_SHOP) {
          ctx.fillStyle = '#10b981'; // Garth's Shoppe (Green)
        } else if (cell.landmarkId === LandmarkId.ADVENTURERS_GUILD) {
          ctx.fillStyle = '#3b82f6'; // Guild (Blue)
        } else if (cell.landmarkId === LandmarkId.REVIEW_BOARD) {
          ctx.fillStyle = '#a855f7'; // Review Board (Purple)
        } else if (cell.landmarkId === LandmarkId.ROSCOES_EMPORIUM) {
          ctx.fillStyle = '#ec4899'; // Roscoe's (Pink)
        } else if (cell.landmarkId === LandmarkId.SCARLET_BARD) {
          ctx.fillStyle = '#f59e0b'; // Scarlet Bard / Tavern (Amber)
        } else if (cell.landmarkId === LandmarkId.GRAN_PLAZ) {
          ctx.fillStyle = '#d97706'; // Gran Plaz
        } else if (cell.terrain === TerrainType.BUILDING) {
          ctx.fillStyle = '#78716c'; // Generic Building
        } else {
          ctx.fillStyle = '#292524'; // Street
        }

        ctx.fillRect(x * tileW, r * tileH, Math.max(1, tileW - 0.5), Math.max(1, tileH - 0.5));
      }
    }
  }

  setVisible(visible) {
    this.mapGroup.visible = visible;
  }
}
