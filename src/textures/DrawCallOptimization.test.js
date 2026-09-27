// DrawCallOptimization.test.js - Unit tests for draw call reductions & instancing
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';
import { AnimatedSpriteManager } from './AnimatedSprite.js';
import { PalmBookMenu } from '../ui/spatial-hud/PalmBookMenu.js';
import { SpatialHUD } from '../ui/spatial-hud/SpatialHUD.js';
import { COLLISION_LAYER } from '../ui/spatial-hud/SpatialCollisionLayers.js';

test('1. TextureGenerator caches procedural textures and returns identical instances', () => {
  // Mock document.createElement if running in headless node without DOM
  if (typeof document === 'undefined' || !document.createElement('canvas').getContext('2d').setTransform) {
    const mockCtx = new Proxy({
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      getImageData: () => ({ data: new Uint8ClampedArray(1024) })
    }, {
      get: (target, prop) => (prop in target ? target[prop] : () => {})
    });

    globalThis.document = {
      createElement: () => ({
        width: 512,
        height: 512,
        getContext: () => mockCtx
      })
    };
  }

  const tex1 = TextureGenerator.createStoneWallTexture();
  const tex2 = TextureGenerator.createStoneWallTexture();
  assert.equal(tex1, tex2, 'createStoneWallTexture must return the cached texture reference');

  const wood1 = TextureGenerator.createWoodPlankTexture();
  const wood2 = TextureGenerator.createWoodPlankTexture();
  assert.equal(wood1, wood2, 'createWoodPlankTexture must return the cached texture reference');

  const cobble1 = TextureGenerator.createRoughCobblestoneTexture();
  const cobble2 = TextureGenerator.createRoughCobblestoneTexture();
  assert.equal(cobble1, cobble2, 'createRoughCobblestoneTexture must return the cached texture reference');
});

test('2. AnimatedSpriteManager creates THREE.InstancedMesh for 99-monster swarms', async () => {
  const manager = new AnimatedSpriteManager();

  // Mock loadImage and loadAndProcessSpriteSheet to avoid filesystem / network dependency in test
  manager.loadAndProcessSpriteSheet = async () => ({
    width: 1024,
    height: 256
  });

  const swarmCount = 99;
  const { instancedMesh, material, update } = await manager.createAnimatedInstancedBillboard('skeleton', swarmCount, 4);

  assert.ok(instancedMesh instanceof THREE.InstancedMesh, 'Must produce a THREE.InstancedMesh instance');
  assert.equal(instancedMesh.count, 99, 'InstancedMesh count must equal 99');
  assert.equal(instancedMesh.material, material, 'InstancedMesh must use the shared material');
  assert.equal(typeof update, 'function', 'Must provide an update function for synchronized frame animation');
});

test('3. AnimatedSpriteManager shares materialCache and textureCache across swarms and billboards of the same type', async () => {
  const manager = new AnimatedSpriteManager();
  manager.loadAndProcessSpriteSheet = async () => ({ width: 1024, height: 256 });

  const b1 = await manager.createAnimatedBillboard('kobold', 4);
  const b2 = await manager.createAnimatedBillboard('kobold', 4);
  const swarm = await manager.createAnimatedInstancedBillboard('kobold', 50, 4);

  assert.equal(b1.material, b2.material, 'Individual billboards of same monster must share the same material instance');
  assert.equal(b1.material, swarm.material, 'Instanced swarm and billboards must share the same material instance');
  assert.equal(b1.texture, swarm.texture, 'Textures must be shared to avoid duplicate GPU texture uploads');
});

test('4. PalmBookMenu provides a low-poly primitive collision plane on SPATIAL_UI layer', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();

  const menu = new PalmBookMenu(scene, camera, () => {});
  const collider = menu.getInteractionCollider();

  assert.ok(collider, 'Menu must provide an interaction collider');
  assert.ok(collider.geometry instanceof THREE.PlaneGeometry, 'Collider geometry must be a low-poly PlaneGeometry');
  assert.equal(collider.layers.isEnabled(COLLISION_LAYER.SPATIAL_UI), true, 'Collider must be on SPATIAL_UI collision layer');
});

test('5. SpatialHUD configures low-poly primitive colliders on SPATIAL_UI layer and tests non-recursively', () => {
  const camera = new THREE.PerspectiveCamera();

  let grimoireToggled = false;
  const hud = new SpatialHUD(camera, {
    onToggleGrimoire: () => { grimoireToggled = true; }
  });

  assert.ok(hud.colliders.length > 0, 'SpatialHUD must create low-poly colliders for interactive buttons');
  for (const col of hud.colliders) {
    assert.ok(col.geometry instanceof THREE.PlaneGeometry || col.geometry instanceof THREE.BoxGeometry, 'Collider must be a primitive plane or box');
    assert.equal(col.layers.isEnabled(COLLISION_LAYER.SPATIAL_UI), true, 'Colliders must be on SPATIAL_UI collision layer');
  }

  // Update matrix world so colliders can be intersected
  hud.hudGroup.updateMatrixWorld(true);

  // Simulate a ray hitting the first button collider
  const raycaster = new THREE.Raycaster();
  raycaster.layers.set(COLLISION_LAYER.SPATIAL_UI);
  raycaster.ray.origin.set(-0.04, 0.055, 1.0);
  raycaster.ray.direction.set(0, 0, -1);

  const hit = hud.handleRaycast(raycaster);
  assert.equal(hit, true, 'handleRaycast must return true when hitting a button collider');
  assert.equal(grimoireToggled, true, 'Triggering collider must execute button action');
});

