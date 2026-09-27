/**
 * SpatialCollisionLayers.js
 * Bitmask collision layers for spatial computing & WebXR raycasting.
 *
 * Three.js layers use bitmask channels (0 to 31).
 * By default, all renderable visual meshes reside on Layer 0 (DEFAULT).
 *
 * Layer 1: SPATIAL_UI
 *   Reserved strictly for low-poly invisible primitive collision planes (2-triangle PlaneGeometry)
 *   or bounding boxes for PalmBookMenu, SpatialHUD wrist panels, and SpatialInstructionWindow.
 *   Configuring raycaster.layers.set(SPATIAL_UI) guarantees the raycaster ONLY tests
 *   UI colliders and completely ignores all complex world/model geometry.
 *
 * Layer 2: INTERACTABLES
 *   Reserved for low-poly trigger boxes (door trigger colliders, weapon grab colliders,
 *   NPC hitboxes).
 */
export const COLLISION_LAYER = {
  DEFAULT: 0,
  SPATIAL_UI: 1,
  INTERACTABLES: 2
};
