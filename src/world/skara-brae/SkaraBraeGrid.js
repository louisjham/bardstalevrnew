import * as THREE from 'three';

// SkaraBraeGrid.js - First-Person 3D City/Dungeon Grid with Diegetic Spatial Auto-Mapper
export class SkaraBraeGrid {
  constructor(scene) {
    this.scene = scene;
    this.gridSize = 16;
    this.cellSize = 3.0; // 3 meters per tile

    // Map: 1 = Wall, 0 = Empty Path, 2 = Tavern, 3 = Garth's Shop, 4 = Dungeon Stairs
    this.map = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 3, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 4, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];

    // Revealed tiles matrix for Diegetic Auto-Mapper (Fog of War)
    this.exploredGrid = Array(this.map.length).fill(0).map(() => Array(this.gridSize).fill(false));

    this.mapGroup = new THREE.Group();
    this.mapGroup.visible = false;
    this.scene.add(this.mapGroup);
  }

  // Update Fog of War Exploration when player steps on a grid tile
  revealTile(playerX, playerZ) {
    const gridX = Math.floor((playerX + (this.gridSize * this.cellSize) / 2) / this.cellSize);
    const gridZ = Math.floor((playerZ + (this.map.length * this.cellSize) / 2) / this.cellSize);

    if (gridZ >= 0 && gridZ < this.map.length && gridX >= 0 && gridX < this.gridSize) {
      this.exploredGrid[gridZ][gridX] = true;
    }
  }

  // Generate 2D Canvas Map for the Palm-Flip Grimoire Auto-Mapper
  renderDiegeticMapCanvas(canvasCtx) {
    if (!canvasCtx) return;
    const ctx = canvasCtx;

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, 240, 240);

    const tileW = 240 / this.gridSize;
    const tileH = 240 / this.map.length;

    for (let r = 0; r < this.map.length; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const isExplored = this.exploredGrid[r][c];
        const tileType = this.map[r][c];

        if (!isExplored) {
          ctx.fillStyle = '#0c0a09'; // Unexplored Fog of War
        } else if (tileType === 1) {
          ctx.fillStyle = '#78716c'; // Stone Wall
        } else if (tileType === 2) {
          ctx.fillStyle = '#f59e0b'; // Tavern Door
        } else if (tileType === 3) {
          ctx.fillStyle = '#10b981'; // Garth's Shop
        } else if (tileType === 4) {
          ctx.fillStyle = '#ef4444'; // Dungeon Stairs
        } else {
          ctx.fillStyle = '#27272a'; // Empty Path
        }

        ctx.fillRect(c * tileW, r * tileH, tileW - 1, tileH - 1);
      }
    }
  }
}
