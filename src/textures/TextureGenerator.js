import * as THREE from 'three';

export class TextureGenerator {
  static createStoneWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base dark stone color
    ctx.fillStyle = '#1c1c24';
    ctx.fillRect(0, 0, 512, 512);

    // Draw irregular stone bricks
    ctx.strokeStyle = '#0d0d12';
    ctx.lineWidth = 6;

    const rows = 8;
    const cols = 4;
    const rowHeight = 512 / rows;

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (512 / cols / 2);
      for (let c = -1; c <= cols; c++) {
        const x = c * (512 / cols) + offset;
        const y = r * rowHeight;
        const w = 512 / cols;

        // Brick color variation
        const shade = Math.floor(25 + Math.random() * 25);
        ctx.fillStyle = `rgb(${shade + 5}, ${shade}, ${shade + 10})`;
        ctx.fillRect(x + 2, y + 2, w - 4, rowHeight - 4);
        ctx.strokeRect(x + 2, y + 2, w - 4, rowHeight - 4);

        // Add noise/speckles for stone texture
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let n = 0; n < 30; n++) {
          const nx = x + Math.random() * w;
          const ny = y + Math.random() * rowHeight;
          ctx.fillRect(nx, ny, 2, 2);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  static createWoodPlankTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base wood color
    ctx.fillStyle = '#4a2c17';
    ctx.fillRect(0, 0, 512, 512);

    // Plank lines
    const plankWidth = 512 / 6;
    for (let p = 0; p < 6; p++) {
      const x = p * plankWidth;

      // Plank color variance
      const colorShift = Math.floor(Math.random() * 20 - 10);
      ctx.fillStyle = `rgb(${74 + colorShift}, ${44 + colorShift}, ${23 + colorShift})`;
      ctx.fillRect(x, 0, plankWidth, 512);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(25, 12, 5, 0.4)';
      ctx.lineWidth = 1.5;
      for (let g = 0; g < 15; g++) {
        const gx = x + Math.random() * plankWidth;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.bezierCurveTo(gx + 10, 170, gx - 10, 340, gx, 512);
        ctx.stroke();
      }

      // Plank seam border
      ctx.fillStyle = '#150a04';
      ctx.fillRect(x + plankWidth - 3, 0, 3, 512);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  static createFabricTexture(baseColor = '#8b2626') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);

    // Cloth weave pattern
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let x = 0; x < 256; x += 4) {
      ctx.fillRect(x, 0, 2, 256);
    }
    for (let y = 0; y < 256; y += 4) {
      ctx.fillRect(0, y, 256, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createScrollPaperTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Parchment color
    ctx.fillStyle = '#d4c097';
    ctx.fillRect(0, 0, 512, 512);

    // Aged edges
    const grad = ctx.createRadialGradient(256, 256, 150, 256, 256, 280);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(80, 50, 20, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createFireParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 230, 150, 1.0)');
    grad.addColorStop(0.3, 'rgba(255, 120, 20, 0.8)');
    grad.addColorStop(0.7, 'rgba(200, 40, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    return new THREE.CanvasTexture(canvas);
  }
}
