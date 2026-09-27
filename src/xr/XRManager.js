import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { COLLISION_LAYER } from '../ui/spatial-hud/SpatialCollisionLayers.js';

export class XRManager {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.PerspectiveCamera} camera
   * @param {THREE.Scene} scene
   * @param {import('./XRRig.js').XRRig} [xrRig=null] - If provided, controllers are parented to the rig group
   */
  constructor(renderer, camera, scene, xrRig = null) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;
    this.xrRig = xrRig;

    this.controllers = [];
    this.controllerGrips = [];
    this.orbitControls = null;

    this.raycaster = new THREE.Raycaster();
    this.uiRaycaster = new THREE.Raycaster();
    this.uiRaycaster.layers.set(COLLISION_LAYER.SPATIAL_UI);

    this.workingMatrix = new THREE.Matrix4();
    this.isVRActive = false;

    this.initXR();
    this.initDesktopFallback();
  }

  initXR() {
    this.renderer.xr.enabled = true;

    // Attach VR Button to DOM
    const vrButton = VRButton.createButton(this.renderer);
    const container = document.getElementById('vr-button-container');
    if (container) {
      container.appendChild(vrButton);
    }

    // Set up WebXR Controllers (0 & 1 for Left & Right hands)
    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i);
      controller.userData = { index: i };

      // Add visual ray pointer line to controller
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -3.5)
      ]);
      const material = new THREE.LineBasicMaterial({
        color: 0xf3cf65,
        transparent: true,
        opacity: 0.75
      });
      const line = new THREE.Line(geometry, material);
      line.name = 'rayLine';
      controller.add(line);

      // WebXR Controller Event Listeners
      controller.addEventListener('selectstart', (e) => {
        const raycaster = this.getControllerRaycaster(controller);
        if (this.onSelectStart) this.onSelectStart(i, controller, raycaster);
      });

      controller.addEventListener('select', (e) => {
        const raycaster = this.getControllerRaycaster(controller);
        if (this.onSelect) this.onSelect(i, controller, raycaster);
      });

      controller.addEventListener('selectend', (e) => {
        const raycaster = this.getControllerRaycaster(controller);
        if (this.onSelectEnd) this.onSelectEnd(i, controller, raycaster);
      });

      controller.addEventListener('squeezestart', (e) => {
        const raycaster = this.getControllerRaycaster(controller);
        if (this.onSqueezeStart) this.onSqueezeStart(i, controller, raycaster);
      });

      controller.addEventListener('squeeze', (e) => {
        const raycaster = this.getControllerRaycaster(controller);
        if (this.onSqueeze) this.onSqueeze(i, controller, raycaster);
      });

      controller.addEventListener('squeezeend', (e) => {
        const raycaster = this.getControllerRaycaster(controller);
        if (this.onSqueezeEnd) this.onSqueezeEnd(i, controller, raycaster);
      });

      // Controller Grip Representation
      const grip = this.renderer.xr.getControllerGrip(i);
      const gripMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })
      );
      grip.add(gripMesh);

      // Parent controllers to the rig group so they track with locomotion
      const controllerParent = this.xrRig ? this.xrRig.group : this.scene;
      controllerParent.add(controller);
      controllerParent.add(grip);

      this.controllers.push(controller);
      this.controllerGrips.push(grip);
    }

    // Set up WebXR Hand Tracking (0 & 1 for Left & Right hands)
    this.hands = [];
    const controllerParent = this.xrRig ? this.xrRig.group : this.scene;
    for (let i = 0; i < 2; i++) {
      const hand = this.renderer.xr.getHand(i);
      hand.userData = { index: i };
      controllerParent.add(hand);
      this.hands.push(hand);
    }

    // Callbacks for interactions
    this.onSelect = null;
    this.onSelectStart = null;
    this.onSqueeze = null;
    this.onSqueezeStart = null;

    // ── VR Mode Material Targets ───────────────────────────────────────────────
    // Any object that implements setVRMode(bool) can register here.
    // XRManager calls setVRMode(true) on sessionstart and setVRMode(false) on
    // sessionend, allowing world modules (e.g. RetroRoom) to swap expensive
    // ShaderMaterials for lightweight fallbacks while a headset is active.
    this.vrModeTargets = [];

    // XR Session Start / End listeners
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.isVRActive = true;
      if (this.orbitControls) this.orbitControls.enabled = false;
      const statusEl = document.getElementById('xr-status');
      if (statusEl) statusEl.textContent = '🟢 VR Session Active';
      // Notify all registered VR-mode targets to swap to lightweight materials.
      for (const target of this.vrModeTargets) target.setVRMode(true);
    });

    this.renderer.xr.addEventListener('sessionend', () => {
      this.isVRActive = false;
      if (this.orbitControls) this.orbitControls.enabled = true;
      const statusEl = document.getElementById('xr-status');
      if (statusEl) statusEl.textContent = 'WebXR Available';
      // Restore full-quality materials for Desktop rendering.
      for (const target of this.vrModeTargets) target.setVRMode(false);
    });
  }

  /**
   * Register a world object to receive VR mode toggle notifications.
   * The target must implement `setVRMode(isVR: boolean)`.
   * Call this after the object is constructed (e.g. after `new RetroRoom(...)`).
   *
   * @param {{ setVRMode: (isVR: boolean) => void }} target
   */
  registerVRModeTarget(target) {
    if (target && typeof target.setVRMode === 'function' && !this.vrModeTargets.includes(target)) {
      this.vrModeTargets.push(target);
      // If a VR session is already active when this is called, sync immediately.
      if (this.isVRActive) target.setVRMode(true);
    }
  }

  initDesktopFallback() {
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't clip below floor
    this.orbitControls.minDistance = 1.0;
    this.orbitControls.maxDistance = 10.0;
  }

  // Trigger haptic pulse on controller
  triggerHaptics(controllerIndex = 0, intensity = 0.8, duration = 100) {
    const session = this.renderer.xr.getSession();
    if (session && session.inputSources && session.inputSources[controllerIndex]) {
      const gamepad = session.inputSources[controllerIndex].gamepad;
      if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
        gamepad.hapticActuators[0].pulse(intensity, duration);
      }
    }
  }

  // Get active raycaster pointing forward from VR controller in world space
  getControllerRaycaster(controller) {
    this.workingMatrix.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix).normalize();
    return this.raycaster;
  }

  // ⚡ Fast, dedicated UI raycaster restricted exclusively to COLLISION_LAYER.SPATIAL_UI
  getControllerUIRaycaster(controller) {
    this.workingMatrix.identity().extractRotation(controller.matrixWorld);
    this.uiRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.uiRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix).normalize();
    return this.uiRaycaster;
  }

  // Fast, non-recursive UI collision intersection test (avoids traversing complex meshes)
  getControllerUIIntersections(controller, uiColliders) {
    if (!uiColliders || uiColliders.length === 0) return [];
    const ray = this.getControllerUIRaycaster(controller);
    return ray.intersectObjects(uiColliders, false);
  }

  // Perform Raycasting from VR controller into interactive objects
  getControllerIntersections(controller, interactableObjects) {
    const raycaster = this.getControllerRaycaster(controller);
    return raycaster.intersectObjects(interactableObjects, true);
  }

  update() {
    if (!this.isVRActive && this.orbitControls) {
      this.orbitControls.update();
    }
  }
}
