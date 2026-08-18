import * as THREE from 'three';

/**
 * FreeLocomotion - WASD Keyboard + WebXR Thumbstick Locomotion
 *
 * Moves an XRRig (or fallback camera) through the scene. In VR, the rig is
 * moved so the user's physical head tracking is never overridden.
 *
 * Controls:
 *   Desktop: WASD movement, Q/E (or Arrow L/R) rotation
 *   VR:      Left thumbstick = move, Right thumbstick = smooth turn
 */
export class FreeLocomotion {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {THREE.Scene} scene
   * @param {import('./XRRig.js').XRRig} [xrRig=null] - XRRig instance. If null, falls back to moving camera directly (desktop-only legacy mode).
   */
  constructor(camera, scene, xrRig = null) {
    this.camera = camera;
    this.scene = scene;
    this.xrRig = xrRig;

    this.moveSpeed = 3.2; // 3.2 m/s
    this.rotateSpeed = 1.8;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      rotLeft: false,
      rotRight: false
    };

    this.velocity = new THREE.Vector3();
    this.moveDirection = new THREE.Vector3();

    // Pre-allocated reusable vectors to avoid per-frame allocations
    this._forward = new THREE.Vector3();
    this._side = new THREE.Vector3();
    this._deltaPos = new THREE.Vector3();

    this.bindKeyboard();
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
        case 'KeyA': this.keys.left = true; break;
        case 'KeyD': this.keys.right = true; break;
        case 'KeyQ': case 'ArrowLeft': this.keys.rotLeft = true; break;
        case 'KeyE': case 'ArrowRight': this.keys.rotRight = true; break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
        case 'KeyA': this.keys.left = false; break;
        case 'KeyD': this.keys.right = false; break;
        case 'KeyQ': case 'ArrowLeft': this.keys.rotLeft = false; break;
        case 'KeyE': case 'ArrowRight': this.keys.rotRight = false; break;
      }
    });
  }

  /**
   * Get the movement target - either the XRRig or the camera (desktop fallback).
   * @returns {THREE.Object3D}
   * @private
   */
  _getMovementTarget() {
    return this.xrRig ? this.xrRig.rig : this.camera;
  }

  // Update Free Locomotion per frame (Desktop Keyboard + WebXR Thumbstick)
  update(deltaTime, xrSession = null) {
    if (!deltaTime) return;

    this.moveDirection.set(0, 0, 0);

    // 1. Keyboard Controls
    if (this.keys.forward) this.moveDirection.z -= 1;
    if (this.keys.backward) this.moveDirection.z += 1;
    if (this.keys.left) this.moveDirection.x -= 1;
    if (this.keys.right) this.moveDirection.x += 1;

    const target = this._getMovementTarget();

    // Smooth Keyboard Rotation (Q / E or Arrow Keys)
    // Rotate the rig (not the camera) so VR head tracking is preserved
    if (this.keys.rotLeft) target.rotation.y += this.rotateSpeed * deltaTime;
    if (this.keys.rotRight) target.rotation.y -= this.rotateSpeed * deltaTime;

    // 2. WebXR VR Controller Thumbstick Input
    if (xrSession) {
      for (const inputSource of xrSession.inputSources) {
        if (!inputSource.gamepad || !inputSource.gamepad.axes) continue;

        const axes = inputSource.gamepad.axes;

        if (inputSource.handedness === 'left') {
          // Left Thumbstick: Movement
          // Use explicit array length check instead of || fallback to avoid
          // axes[0] (touchpad) bleeding into axes[2] (thumbstick) when centered
          const thumbX = axes.length > 2 ? axes[2] : axes[0] ?? 0;
          const thumbY = axes.length > 3 ? axes[3] : axes[1] ?? 0;
          if (Math.abs(thumbX) > 0.15) this.moveDirection.x += thumbX;
          if (Math.abs(thumbY) > 0.15) this.moveDirection.z += thumbY;
        } else if (inputSource.handedness === 'right') {
          // Right Thumbstick: Smooth Rotation on the rig
          const thumbX = axes.length > 2 ? axes[2] : axes[0] ?? 0;
          if (Math.abs(thumbX) > 0.2) {
            target.rotation.y -= thumbX * this.rotateSpeed * deltaTime;
          }
        }
      }
    }

    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize();

      // Forward direction relative to camera orientation (reuse cached vectors)
      this._forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
      this._forward.y = 0;
      this._forward.normalize();

      this._side.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
      this._side.y = 0;
      this._side.normalize();

      this._deltaPos.set(0, 0, 0)
        .addScaledVector(this._forward, -this.moveDirection.z * this.moveSpeed * deltaTime)
        .addScaledVector(this._side, this.moveDirection.x * this.moveSpeed * deltaTime);

      // Move the rig (or camera in desktop fallback), NOT the camera in VR
      target.position.add(this._deltaPos);

      // In desktop (non-VR) mode without an XRRig, maintain floor height.
      // In VR mode with XRRig, the rig's Y stays at 0 (floor level) and
      // the camera's local Y is controlled by physical head tracking.
      if (!this.xrRig) {
        this.camera.position.y = 1.4;
      }
    }
  }
}
