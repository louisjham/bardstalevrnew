import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RetroRoom } from './RetroRoom.js';

// Setup lightweight canvas & requestAnimationFrame mock if in headless Node
if (typeof document === 'undefined' || !document.createElement('canvas').getContext) {
  const mockCtx = new Proxy({
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    getImageData: () => ({ data: new Uint8ClampedArray(1024) }),
    roundRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {}
  }, {
    get: (target, prop) => (prop in target ? target[prop] : () => {})
  });

  globalThis.document = {
    createElement: () => ({
      width: 512,
      height: 512,
      getContext: () => mockCtx,
      addEventListener: () => {}
    })
  };
}

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
}

test('RetroRoom Suite - Stationary Intro & Fade Transitions', async (t) => {
  const setupTestEnv = () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 100);
    const mockRig = {
      position: new THREE.Vector3(),
      yRotation: 0,
      setPosition: function (x, y, z) { this.position.set(x, y, z); },
      setYRotation: function (y) { this.yRotation = y; }
    };
    const room = new RetroRoom(scene, camera, () => {}, mockRig);
    return { scene, camera, mockRig, room };
  };

  await t.test('1. RetroRoom initializes stationary intro void group, flare mesh, sparks, and screen overlay', () => {
    const { camera, room } = setupTestEnv();

    assert.ok(room.introVoidGroup, 'introVoidGroup must be created');
    assert.equal(room.introVoidGroup.visible, false, 'introVoidGroup should be hidden initially');
    assert.ok(room.flareMesh, 'flareMesh must be initialized');
    assert.ok(room.sparkParticles, 'sparkParticles must be initialized');
    assert.ok(room.titleCardMesh, 'titleCardMesh must be initialized');
    assert.ok(room.screenOverlay, 'screenOverlay must be created');
    assert.equal(room.screenOverlay.parent, camera, 'screenOverlay must be child of camera for screen-space rendering');
    assert.equal(room.screenOverlay.material.opacity, 0.0, 'screenOverlay opacity should start at 0.0');
  });

  await t.test('2. triggerFlashPaperIntro spawns player stationary in dark void without auto-walk', () => {
    const { camera, mockRig, room } = setupTestEnv();

    // Set rig and camera to non-zero values to test stationary reset
    mockRig.setPosition(10, 5, 20);
    camera.position.set(2, 3, 4);
    camera.rotation.set(0.5, 0.2, 0.8);

    room.triggerFlashPaperIntro();

    assert.equal(mockRig.position.x, 0, 'Rig X should be 0');
    assert.equal(mockRig.position.y, 0, 'Rig Y should be 0');
    assert.equal(mockRig.position.z, 0, 'Rig Z should be 0');
    assert.equal(mockRig.yRotation, 0, 'Rig Y rotation should be 0');

    assert.equal(camera.position.x, 0, 'Camera X should be 0');
    assert.equal(camera.position.y, 1.18, 'Camera Y should be locked at 1.18m');
    assert.equal(camera.position.z, 0, 'Camera Z should be 0');
    assert.equal(camera.rotation.x, 0, 'Camera rot X should be 0');
    assert.equal(camera.rotation.y, 0, 'Camera rot Y should be 0');
    assert.equal(camera.rotation.z, 0, 'Camera rot Z should be 0');

    assert.equal(room.roomGroup.visible, false, 'Bedroom roomGroup must be hidden for dark void');
    assert.equal(room.introVoidGroup.visible, true, 'Intro void group must be visible');
    assert.equal(room.flareMesh.visible, true, 'Flare mesh must be visible');
    assert.equal(room.sparkParticles.visible, true, 'Spark particles must be visible');
    assert.equal(room.titleCardMesh.visible, true, 'Title card mesh must be visible');
  });

  await t.test('3. startCinematicSequence forwards to triggerFlashPaperIntro without on-rails movement', () => {
    const { camera, mockRig, room } = setupTestEnv();
    let completed = false;

    room.startCinematicSequence(() => {
      completed = true;
    });

    assert.equal(mockRig.position.z, 0, 'Rig Z must be stationary (0), NOT dollied on-rails (2.6)');
    assert.equal(camera.position.y, 1.18, 'Camera height locked to 1.18m');
    assert.equal(room.isFlashPaperActive, true, 'isFlashPaperActive must be true');
  });

  await t.test('4. update() performs zero camera or rig interpolation (no auto-walk, no barrel roll)', () => {
    const { camera, mockRig, room } = setupTestEnv();

    mockRig.setPosition(0, 0, 0);
    camera.position.set(0, 1.18, 0);
    camera.rotation.set(0, 0, 0);

    // Call update over multiple frames simulating passage of time
    for (let i = 0; i < 60; i++) {
      room.update(i * 0.016, 0.016);
    }

    assert.equal(mockRig.position.x, 0, 'Rig X must not change during update');
    assert.equal(mockRig.position.y, 0, 'Rig Y must not change during update');
    assert.equal(mockRig.position.z, 0, 'Rig Z must not change during update');
    assert.equal(camera.position.x, 0, 'Camera X must not change');
    assert.equal(camera.position.y, 1.18, 'Camera Y must stay 1.18m');
    assert.equal(camera.position.z, 0, 'Camera Z must not change');
    assert.equal(camera.rotation.z, 0, 'Camera rotation Z must remain 0 (no barrel roll)');
  });

  await t.test('5. fadeInFromBlack smoothly tweens screen overlay opacity from 1.0 to 0.0', async () => {
    const { room } = setupTestEnv();
    room.screenOverlay.material.opacity = 1.0;

    await new Promise((resolve) => {
      room.fadeInFromBlack(50, () => {
        resolve();
      });
    });

    assert.equal(room.screenOverlay.material.opacity, 0.0, 'screenOverlay opacity must reach 0.0 after fade');
    assert.equal(room.isFadingIn, false, 'isFadingIn must reset to false');
  });

  await t.test('6. reset() restores roomGroup and hides introVoidGroup', () => {
    const { room } = setupTestEnv();
    room.triggerFlashPaperIntro();
    assert.equal(room.roomGroup.visible, false);
    assert.equal(room.introVoidGroup.visible, true);

    room.reset();
    assert.equal(room.roomGroup.visible, true, 'roomGroup must be visible after reset');
    assert.equal(room.introVoidGroup.visible, false, 'introVoidGroup must be hidden after reset');
    assert.equal(room.isFlashPaperActive, false, 'isFlashPaperActive must be false');
    assert.equal(room.screenOverlay.material.opacity, 0.0, 'screenOverlay opacity must be 0.0');
  });
});
