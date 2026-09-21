import * as THREE from 'three';
import { getSpriteSheetPath } from '../data/MonsterSpriteManifest.js';

/**
 * AnimatedSpriteManager - Auto-crops, chroma-cleans, and animates 4-frame sprite strips.
 * Handles:
 * - Trimming top white letterboxing
 * - Stripping 1px vertical borders
 * - Providing 4-frame loop animation in Three.js and 2D UI Canvas
 */
export class AnimatedSpriteManager {
  constructor() {
    this.imageCache = new Map();
    this.processedCanvasCache = new Map();
  }

  /**
   * Loads and auto-processes a 4-frame sprite sheet image.
   * @param {string} src
   * @returns {Promise<HTMLCanvasElement>} Clean 4-frame canvas (1024x256 or 512x128)
   */
  async loadAndProcessSpriteSheet(src) {
    if (this.processedCanvasCache.has(src)) {
      return this.processedCanvasCache.get(src);
    }

    const img = await this.loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Auto-detect character content bounds (excluding top white padding)
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = img.naturalWidth || img.width;
    rawCanvas.height = img.naturalHeight || img.height;
    const rawCtx = rawCanvas.getContext('2d');
    rawCtx.drawImage(img, 0, 0);

    const rawW = rawCanvas.width;
    const rawH = rawCanvas.height;
    const frameW = rawW / 4;

    // Scan for top non-white content boundary
    let topY = 0;
    const imgData = rawCtx.getImageData(0, 0, rawW, rawH);
    const data = imgData.data;

    for (let y = 0; y < rawH; y++) {
      let nonWhiteFound = false;
      for (let x = 0; x < rawW; x += 8) {
        const idx = (y * rawW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        // If not white / transparent header
        if (a > 50 && !(r > 240 && g > 240 && b > 240)) {
          nonWhiteFound = true;
          break;
        }
      }
      if (nonWhiteFound) {
        topY = y;
        break;
      }
    }

    const contentH = Math.max(10, rawH - topY);

    // Draw 4 clean frames onto output canvas without vertical dividers
    for (let f = 0; f < 4; f++) {
      const srcX = f * frameW + 2; // Inset 2px to avoid 1px divider border
      const srcY = topY;
      const srcW = frameW - 4;     // Inset 4px total
      const destX = f * 256;
      const destY = 0;
      const destW = 256;
      const destH = 256;

      ctx.drawImage(rawCanvas, srcX, srcY, srcW, contentH, destX, destY, destW, destH);
    }

    this.processedCanvasCache.set(src, canvas);
    return canvas;
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      if (this.imageCache.has(src)) {
        return resolve(this.imageCache.get(src));
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * Creates a 3D animated Three.js Mesh / Billboard for a given monster or class.
   * @param {string} slug
   * @param {number} [fps=5]
   * @returns {Promise<{ mesh: THREE.Mesh, update: (time: number) => void }>}
   */
  async createAnimatedBillboard(slug, fps = 5) {
    const src = getSpriteSheetPath(slug) || '/assets/sprites/swordsman.png';
    const canvas = await this.loadAndProcessSpriteSheet(src);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.repeat.set(0.25, 1.0); // 1 frame of 4

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide
    });

    const geometry = new THREE.PlaneGeometry(2.0, 2.0);
    const mesh = new THREE.Mesh(geometry, material);

    let lastFrame = 0;
    const update = (time) => {
      const frameIndex = Math.floor(time * fps) % 4;
      if (frameIndex !== lastFrame) {
        lastFrame = frameIndex;
        texture.offset.x = frameIndex * 0.25;
        texture.needsUpdate = true;
      }
    };

    return { mesh, material, texture, geometry, update };
  }

  /**
   * Draws an animated frame onto a 2D Canvas context (for Grimoire / HUD portraits).
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} slug
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number} [frameIndex=0]
   */
  drawFrameTo2DContext(ctx, slug, x, y, width, height, frameIndex = 0) {
    const src = getSpriteSheetPath(slug);
    if (!src || !this.processedCanvasCache.has(src)) return false;

    const canvas = this.processedCanvasCache.get(src);
    const f = Math.abs(Math.floor(frameIndex)) % 4;
    const srcX = f * 256;

    ctx.drawImage(canvas, srcX, 0, 256, 256, x, y, width, height);
    return true;
  }
}

export const animatedSpriteManager = new AnimatedSpriteManager();
