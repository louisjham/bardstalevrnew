import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FreeLocomotion } from './FreeLocomotion.js';

test('FreeLocomotion Suite', async (t) => {
  await t.test('1. Planar Lock: Avatar position Y is strictly locked to eye-level (1.18m) above floor in fallback rig', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const mockRig = {
      rig: new THREE.Group(),
      getWorldHeadPosition: () => new THREE.Vector3(0, 1.18, 0)
    };
    mockRig.rig.position.set(0, 5.0, 0);

    const locomotion = new FreeLocomotion(camera, scene, mockRig);
    locomotion.update(0.016);

    assert.equal(mockRig.rig.position.y, 1.18, 'Rig Y position must be locked strictly to eye-level (1.18m)');
  });

  await t.test('2. Rolling Office Chair: Fast walking acceleration when fist is pushed', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.quaternion.set(0, 0, 0, 1); // Facing -Z
    const scene = new THREE.Scene();
    const mockRig = { rig: new THREE.Group() };

    const locomotion = new FreeLocomotion(camera, scene, mockRig);
    locomotion.keys.fistPush = true; // Simulate fist push

    // Simulate 2.0s of pushing
    for (let i = 0; i < 120; i++) {
      locomotion.update(0.016);
    }

    const maxVel = locomotion.chairVelocity.length();
    assert.ok(maxVel >= 2.2 && maxVel <= 2.41, `Velocity (${maxVel}) should reach fast walking speed (~2.4 m/s)`);
  });

  await t.test('3. Rolling Office Chair: Smooth coasting deceleration to a stop when fist released', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const mockRig = { rig: new THREE.Group() };

    const locomotion = new FreeLocomotion(camera, scene, mockRig);
    locomotion.chairVelocity.set(0, 0, -2.4);

    locomotion.keys.fistPush = false; // Fist released

    // Simulate 2.5 seconds of coasting
    for (let i = 0; i < 150; i++) {
      locomotion.update(0.016);
    }

    assert.equal(locomotion.chairVelocity.length(), 0, 'Chair should smoothly roll to a complete stop');
  });

  await t.test('4. Directional Steering: Move arm left spins counter-clockwise & retains momentum', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.6, 0);
    camera.quaternion.set(0, 0, 0, 1);
    const scene = new THREE.Scene();
    const mockRig = { rig: new THREE.Group() };

    // Create mock hand with raised fist moved to the LEFT (x = -0.06m)
    const mockHand = new THREE.Group();
    mockHand.position.set(-0.06, 1.4, -0.4);
    mockHand.joints = {
      'wrist': { position: new THREE.Vector3(0, 0, 0) },
      'index-finger-tip': { position: new THREE.Vector3(0.02, 0.05, 0.04) },
      'middle-finger-tip': { position: new THREE.Vector3(0.01, 0.05, 0.04) },
      'ring-finger-tip': { position: new THREE.Vector3(-0.01, 0.05, 0.04) },
      'pinky-finger-tip': { position: new THREE.Vector3(-0.02, 0.05, 0.04) }
    };

    const mockXRManager = { hands: [mockHand] };
    const locomotion = new FreeLocomotion(camera, scene, mockRig, null, mockXRManager);
    locomotion.chairVelocity.set(0, 0, -2.0); // 2.0 m/s forward momentum

    const initialSpeed = locomotion.chairVelocity.length();
    const initialRotY = mockRig.rig.rotation.y;

    locomotion.update(0.1);

    assert.ok(mockRig.rig.rotation.y > initialRotY, 'Rig should rotate counter-clockwise (positive yaw)');
    const finalSpeed = locomotion.chairVelocity.length();
    assert.ok(Math.abs(finalSpeed - initialSpeed) < 0.2, 'Momentum magnitude should be retained while spinning');
  });

  await t.test('5. Directional Steering: Move arm right spins clockwise & retains momentum', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.6, 0);
    camera.quaternion.set(0, 0, 0, 1);
    const scene = new THREE.Scene();
    const mockRig = { rig: new THREE.Group() };

    // Create mock hand with raised fist moved to the RIGHT (x = +0.35m)
    const mockHand = new THREE.Group();
    mockHand.position.set(0.35, 1.4, -0.4);
    mockHand.joints = {
      'wrist': { position: new THREE.Vector3(0, 0, 0) },
      'index-finger-tip': { position: new THREE.Vector3(0.02, 0.05, 0.04) },
      'middle-finger-tip': { position: new THREE.Vector3(0.01, 0.05, 0.04) },
      'ring-finger-tip': { position: new THREE.Vector3(-0.01, 0.05, 0.04) },
      'pinky-finger-tip': { position: new THREE.Vector3(-0.02, 0.05, 0.04) }
    };

    const mockXRManager = { hands: [mockHand] };
    const locomotion = new FreeLocomotion(camera, scene, mockRig, null, mockXRManager);
    locomotion.chairVelocity.set(0, 0, -2.0);

    const initialRotY = mockRig.rig.rotation.y;

    locomotion.update(0.1);

    assert.ok(mockRig.rig.rotation.y < initialRotY, 'Rig should rotate clockwise (negative yaw)');
  });

  await t.test('6. 2D Bumper Car Collision: Bounces off 2D room perimeter walls and reflects velocity', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const mockRig = { rig: new THREE.Group() };
    mockRig.rig.position.set(0, 0, 5.7); // Near Tavern 2D back wall at z = 5.8

    const locomotion = new FreeLocomotion(camera, scene, mockRig);
    locomotion.chairVelocity.set(0, 0, 2.0); // Moving +Z toward back wall

    let bounced = false;
    locomotion.onBounce = (normal) => {
      bounced = true;
      assert.ok(normal.z < 0, 'Collision normal should point away from back wall (-Z)');
    };

    locomotion.update(0.016, null, null, null, 'TAVERN_INTRO');

    assert.ok(bounced, 'Bumper car should register bounce on wall contact');
    assert.ok(locomotion.chairVelocity.z < 0, 'Velocity should be reflected in opposite direction (-Z)');
    assert.ok(mockRig.rig.position.z <= 5.8 - locomotion.bumperRadius, 'Position should be separated inside boundary');
  });

  await t.test('7. 2D Bumper Car Collision: Bounces off 2D furniture obstacle (Bar Counter)', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const mockRig = { rig: new THREE.Group() };
    mockRig.rig.position.set(1.9, 0, -2.0); // Approaching Tavern Bar Counter at [1.8..4.8] x [-4.4..-0.6]

    const locomotion = new FreeLocomotion(camera, scene, mockRig);
    locomotion.chairVelocity.set(1.5, 0, 0); // Moving +X directly into counter

    let bounced = false;
    locomotion.onBounce = () => { bounced = true; };

    locomotion.update(0.016, null, null, null, 'TAVERN_INTRO');

    assert.ok(bounced, 'Should bounce off bar counter');
    assert.ok(locomotion.chairVelocity.x < 0, 'Velocity X should bounce backwards');
  });

  await t.test('8. Raised Arm + Fist Gesture: Ignores fist when arm is lowered down at hips', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.6, 0);
    const scene = new THREE.Scene();
    const mockRig = { rig: new THREE.Group() };

    // Hand hanging down at hips (y = 0.8m, >0.65m below head)
    const mockHand = new THREE.Group();
    mockHand.position.set(0.2, 0.7, 0.0);
    mockHand.joints = {
      'wrist': { position: new THREE.Vector3(0, 0, 0) },
      'index-finger-tip': { position: new THREE.Vector3(0.02, 0.05, 0.04) }
    };

    const mockXRManager = { hands: [mockHand] };
    const locomotion = new FreeLocomotion(camera, scene, mockRig, null, mockXRManager);
    const gesture = locomotion._checkRaisedFistAndSteering(null, null, null);

    assert.equal(gesture.isFist, false, 'Should ignore fist when arm is lowered down at hips');
  });

  await t.test('9. Native WebXR Frame: Right hand moved left across chest spins Counter-Clockwise (CCW)', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const mockRig = { rig: new THREE.Group() };
    const locomotion = new FreeLocomotion(camera, scene, mockRig);

    // Mock WebXR Frame, Session, and RefSpace
    const mockRefSpace = {};
    const mockSession = {
      inputSources: [{
        handedness: 'right',
        hand: {
          get: (name) => name
        }
      }]
    };

    const mockFrame = {
      getViewerPose: (ref) => ({
        transform: {
          position: { x: 0, y: 1.6, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 }
        }
      }),
      getJointPose: (joint, ref) => {
        if (joint === 'wrist') {
          // Moved left across chest to x = -0.05m
          return { transform: { position: { x: -0.05, y: 1.4, z: -0.4 } } };
        }
        if (joint === 'index-finger-tip') {
          return { transform: { position: { x: -0.05, y: 1.44, z: -0.36 } } };
        }
        return { transform: { position: { x: -0.05, y: 1.44, z: -0.36 } } };
      }
    };

    const gesture = locomotion._checkRaisedFistAndSteering(mockSession, mockFrame, mockRefSpace);
    assert.equal(gesture.isFist, true, 'Fist should be detected');
    assert.ok(gesture.spinRate > 0, `Spin rate (${gesture.spinRate}) should be positive for Counter-Clockwise spin`);

    locomotion.update(0.1, mockSession, mockFrame, mockRefSpace);
    assert.ok(mockRig.rig.rotation.y > 0, 'Rig should rotate counter-clockwise (positive yaw)');
  });

  await t.test('10. Native WebXR Frame: Right hand moved right outward spins Clockwise (CW)', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const mockRig = { rig: new THREE.Group() };
    const locomotion = new FreeLocomotion(camera, scene, mockRig);

    const mockRefSpace = {};
    const mockSession = {
      inputSources: [{
        handedness: 'right',
        hand: {
          get: (name) => name
        }
      }]
    };

    const mockFrame = {
      getViewerPose: (ref) => ({
        transform: {
          position: { x: 0, y: 1.6, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 }
        }
      }),
      getJointPose: (joint, ref) => {
        if (joint === 'wrist') {
          // Moved right outward to x = +0.35m
          return { transform: { position: { x: 0.35, y: 1.4, z: -0.4 } } };
        }
        if (joint === 'index-finger-tip') {
          return { transform: { position: { x: 0.35, y: 1.44, z: -0.36 } } };
        }
        return { transform: { position: { x: 0.35, y: 1.44, z: -0.36 } } };
      }
    };

    const gesture = locomotion._checkRaisedFistAndSteering(mockSession, mockFrame, mockRefSpace);
    assert.equal(gesture.isFist, true, 'Fist should be detected');
    assert.ok(gesture.spinRate < 0, `Spin rate (${gesture.spinRate}) should be negative for Clockwise spin`);

    locomotion.update(0.1, mockSession, mockFrame, mockRefSpace);
    assert.ok(mockRig.rig.rotation.y < 0, 'Rig should rotate clockwise (negative yaw)');
  });

  await t.test('11. PalmBookMenu: Turning hand over from Palm Down to Palm Up triggers Summoning Animation', async () => {
    const { PalmBookMenu } = await import('../ui/spatial-hud/PalmBookMenu.js');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.524, 0);

    const grimoire = new PalmBookMenu(scene, camera, () => {});
    grimoire.setEnabled(true);

    assert.equal(grimoire.isOpen, false);
    assert.equal(grimoire.animState, 'CLOSED');
    assert.equal(grimoire.bookGroup.visible, false);

    // Mock controller/hand in palm up position
    const mockController = new THREE.Group();
    mockController.position.set(-0.20, 1.35, -0.40);
    mockController.quaternion.set(0, 0, 0, 1);

    grimoire.updateGesture(mockController, null, null, 0.016);

    assert.equal(grimoire.isOpen, true, 'Grimoire should be opened');
    assert.equal(grimoire.animState, 'SUMMONING', 'Anim state should transition to SUMMONING');
    assert.equal(grimoire.bookGroup.visible, true, 'Mesh should become visible');

    // Simulate 0.4s of summoning frames
    for (let i = 0; i < 30; i++) {
      grimoire.updateGesture(mockController, null, null, 0.016);
    }

    assert.equal(grimoire.animState, 'OPEN', 'Anim state should reach OPEN after summon completes');
    assert.equal(grimoire.bookGroup.scale.x, 1.0, 'Scale should reach 1.0 (full size)');
  });

  await t.test('12. PalmBookMenu: Dropping Palm Up pose triggers Dispelling Animation and vanishes', async () => {
    const { PalmBookMenu } = await import('../ui/spatial-hud/PalmBookMenu.js');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.524, 0);

    const grimoire = new PalmBookMenu(scene, camera, () => {});
    grimoire.setEnabled(true);

    const mockController = new THREE.Group();
    mockController.position.set(-0.20, 1.35, -0.40);
    mockController.quaternion.set(0, 0, 0, 1);

    // First open the book
    for (let i = 0; i < 30; i++) {
      grimoire.updateGesture(mockController, null, null, 0.016);
    }
    assert.equal(grimoire.animState, 'OPEN');

    // Now turn hand palm down (rotate 180 degrees around Z)
    mockController.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);

    grimoire.updateGesture(mockController, null, null, 0.016);
    assert.equal(grimoire.animState, 'DISPELLING', 'Should transition to DISPELLING on palm down');

    // Simulate 0.35s of dispelling frames
    for (let i = 0; i < 30; i++) {
      grimoire.updateGesture(mockController, null, null, 0.016);
    }

    assert.equal(grimoire.animState, 'CLOSED', 'Should finish in CLOSED state');
    assert.equal(grimoire.isOpen, false, 'isOpen should be false');
    assert.equal(grimoire.bookGroup.visible, false, 'Mesh should vanish');
  });
});
