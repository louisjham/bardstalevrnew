import * as THREE from 'three';

/**
 * XRRig - Camera Rig for WebXR + Desktop Dual Support
 *
 * Standard WebXR pattern: the camera lives inside a THREE.Group (the "rig").
 * All locomotion and scene positioning moves the rig, never the camera directly.
 * This preserves the user's physical 6DOF head tracking in VR while still
 * allowing smooth locomotion via thumbstick or keyboard.
 *
 * In desktop mode, the camera's local position IS the effective position,
 * so moving the rig works identically.
 *
 * Scene hierarchy:
 *   scene
 *     └── xrRig (THREE.Group)  ← locomotion moves THIS
 *           └── camera          ← WebXR Device API controls THIS
 */
export class XRRig {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {THREE.Scene} scene
   */
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;

    // Create the rig group and parent the camera inside it
    this.rig = new THREE.Group();
    this.rig.name = 'XRRig';
    this.rig.add(this.camera);
    this.scene.add(this.rig);

    // Reusable vector for world-space head position queries (avoid per-frame alloc)
    this._worldHeadPos = new THREE.Vector3();
  }

  /**
   * Get the rig group (use this for adding controllers, locomotion targets, etc.)
   * @returns {THREE.Group}
   */
  get group() {
    return this.rig;
  }

  /**
   * Get the world-space position of the user's head (camera).
   * In VR this accounts for physical head movement within the rig.
   * @returns {THREE.Vector3}
   */
  getWorldHeadPosition() {
    this.camera.getWorldPosition(this._worldHeadPos);
    return this._worldHeadPos;
  }

  /**
   * Set the rig's position (i.e. teleport or reposition the player).
   * In VR, the camera's local offset from head tracking is preserved.
   * In desktop, the camera's local position (e.g. eye height) is preserved.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setPosition(x, y, z) {
    this.rig.position.set(x, y, z);
  }

  /**
   * Move the rig by a delta vector (for locomotion).
   * @param {THREE.Vector3} delta
   */
  move(delta) {
    this.rig.position.add(delta);
  }

  /**
   * Set the rig's Y rotation (horizontal facing direction).
   * @param {number} yRotation - Radians
   */
  setYRotation(yRotation) {
    this.rig.rotation.y = yRotation;
  }

  /**
   * Rotate the rig around the Y axis by a delta (for smooth/snap turn).
   * @param {number} deltaY - Radians to rotate
   */
  rotateY(deltaY) {
    this.rig.rotation.y += deltaY;
  }
}
