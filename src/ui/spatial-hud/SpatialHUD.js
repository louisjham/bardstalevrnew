import * as THREE from 'three';

// SpatialHUD.js - Diegetic 3D Spatial UI & Wrist Panels
export class SpatialHUD {
  constructor(camera) {
    this.camera = camera;
    this.hudGroup = new THREE.Group();
  }

  attachToWrist(controller) {
    // Attach spatial menu panel to player's left VR controller/wrist
    controller.add(this.hudGroup);
  }
}
