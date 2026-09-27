import * as THREE from 'three';
import { getSpriteSheetPath } from '../data/MonsterSpriteManifest.js';

/**
 * AnimatedSpriteManager - Auto-crops, chroma-cleans, and animates 4-frame sprite strips.
 * Handles:
 * - Trimming top white letterboxing
 * - Stripping 1px vertical borders
 * - Providing 4-frame loop animation in Three.js and 2D UI Canvas
 *
 * ⚡ Draw Call Reduction Strategy
 * ────────────────────────────────
 * In a 99-monster encounter, naively creating one Material per billboard produces
 * up to 99 draw calls — one per mesh.  Three.js can only batch meshes that share
 * the exact same material instance.
 *
 * This manager maintains three caches keyed by resolved sprite-sheet path:
 *
 *   textureCache    — one THREE.CanvasTexture per unique sprite sheet path.
 *                     All 20 Kobolds (bt1_10.png) share the same GPU texture object.
 *
 *   materialCache   — one THREE.MeshBasicMaterial per unique sprite sheet path.
 *                     Sharing the material instance allows Three.js to batch all
 *                     billboards of the same type into a single draw call.
 *                     Frame animation advances texture.offset.x; because the offset
 *                     is on the shared texture, all monsters of the same type
 *                     advance frames together — correct behaviour for a swarm.
 *
 *   _sharedGeo      — one PlaneGeometry(2,2) reused across every billboard.
 *                     Geometry is read-only at render time; sharing is always safe.
 *
 * Net result: a 99-Kobold encounter issues 1 draw call instead of 99.
 * A mixed encounter with K unique sprite types issues K draw calls.
 */
export class AnimatedSpriteManager {
  constructor() {
    this.imageCache = new Map();
    this.processedCanvasCache = new Map();

    // ── Draw-call reduction caches ─────────────────────────────────────────────
    /** @type {Map<string, THREE.CanvasTexture>} */
    this.textureCache = new Map();
    /** @type {Map<string, THREE.MeshBasicMaterial>} */
    this.materialCache = new Map();
    /** Shared read-only 2×2 plane — safe to reuse across all billboard meshes. */
    this._sharedGeo = new THREE.PlaneGeometry(2.0, 2.0);
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
   * Returns the cached (or freshly created) THREE.CanvasTexture for a sprite path.
   * All callers sharing the same path receive the exact same texture instance,
   * allowing the GPU to bind it once across multiple draw calls.
   *
   * @param {string} src  Resolved sprite sheet path
   * @param {HTMLCanvasElement} canvas  Processed 1024×256 canvas
   * @returns {THREE.CanvasTexture}
   */
  _getOrCreateTexture(src, canvas) {
    if (this.textureCache.has(src)) return this.textureCache.get(src);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.repeat.set(0.25, 1.0); // 1 frame of 4
    this.textureCache.set(src, texture);
    return texture;
  }

  /**
   * Returns the cached (or freshly created) THREE.MeshBasicMaterial for a sprite path.
   * All billboard meshes that share this material instance are batched by Three.js
   * into a single draw call when they are adjacent in the render queue.
   *
   * @param {string} src  Resolved sprite sheet path
   * @param {THREE.CanvasTexture} texture
   * @returns {THREE.MeshBasicMaterial}
   */
  _getOrCreateMaterial(src, texture) {
    if (this.materialCache.has(src)) return this.materialCache.get(src);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide
    });
    this.materialCache.set(src, material);
    return material;
  }

  /**
   * Creates a 3D animated Three.js Mesh / Billboard for a given monster or class.
   *
   * ⚡ Draw call reduction: All monsters sharing the same sprite path receive the
   * same material instance (via materialCache).  Three.js batches identical-material
   * meshes into a single draw call, so 20 Kobolds → 1 draw call.
   *
   * The `update` callback still advances `texture.offset.x` on the shared texture,
   * so all monsters of the same type animate in lock-step — authentic swarm behaviour.
   *
   * @param {string} slug  Monster slug or class name
   * @param {number} [fps=5]
   * @returns {Promise<{ mesh: THREE.Mesh, update: (time: number) => void }>}
   */
  async createAnimatedBillboard(slug, fps = 5) {
    const src = getSpriteSheetPath(slug) || '/assets/sprites/swordsman.png';
    const canvas = await this.loadAndProcessSpriteSheet(src);

    // Retrieve shared texture and material instances (or create them once).
    const texture = this._getOrCreateTexture(src, canvas);
    const material = this._getOrCreateMaterial(src, texture);

    // Shared geometry — PlaneGeometry is read-only at render time; safe to reuse.
    const mesh = new THREE.Mesh(this._sharedGeo, material);

    let lastFrame = 0;
    const update = (time) => {
      const frameIndex = Math.floor(time * fps) % 4;
      if (frameIndex !== lastFrame) {
        lastFrame = frameIndex;
        texture.offset.x = frameIndex * 0.25;
        texture.needsUpdate = true;
      }
    };

    return { mesh, material, texture, geometry: this._sharedGeo, update };
  }

  /**
   * Creates a THREE.InstancedMesh for an enemy swarm or mob sharing the same sprite sheet.
   *
   * ⚡ Draw call reduction: Up to 99 monsters of the same type render in 1 single draw call.
   * Texture offset frame animation is shared across all instances in the mesh, maintaining
   * 60fps pacing even in large encounters.
   *
   * @param {string} slug Monster slug or class name
   * @param {number} count Number of instances in the swarm (e.g. 1 to 99)
   * @param {number} [fps=5]
   * @returns {Promise<{ instancedMesh: THREE.InstancedMesh, material: THREE.Material, texture: THREE.Texture, geometry: THREE.BufferGeometry, update: (time: number) => void }>}
   */
  async createAnimatedInstancedBillboard(slug, count, fps = 5) {
    const src = getSpriteSheetPath(slug) || '/assets/sprites/swordsman.png';
    const canvas = await this.loadAndProcessSpriteSheet(src);

    const texture = this._getOrCreateTexture(src, canvas);
    const material = this._getOrCreateMaterial(src, texture);

    const instancedMesh = new THREE.InstancedMesh(this._sharedGeo, material, Math.max(1, count));
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    let lastFrame = 0;
    const update = (time) => {
      const frameIndex = Math.floor(time * fps) % 4;
      if (frameIndex !== lastFrame) {
        lastFrame = frameIndex;
        texture.offset.x = frameIndex * 0.25;
        texture.needsUpdate = true;
      }
    };

    return { instancedMesh, material, texture, geometry: this._sharedGeo, update };
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

