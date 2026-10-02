import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

const ARENA_GLB_MAP = {
  BRAZIER: '/assets/models/arena/brazier.glb',
  PILLAR: '/assets/models/arena/pillar.glb',
  CHEST: '/assets/models/arena/chest.glb'
};

/**
 * Creates a high-fidelity 3D Standing Magical Brazier with iron tripod legs, flared fire bowl, and glowing runic ember orb.
 * Supports async GLTF/GLB asset loading when available.
 *
 * @param {function} [onGLBLoaded]
 * @returns {THREE.Group}
 */
export function createStandingBrazier(onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = 'BrazierContainer';

  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'proceduralBrazier';

  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.88, roughness: 0.25 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.3 });
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0xa855f7,
    emissiveIntensity: 1.35,
    roughness: 0.2
  });

  // 1. Octagonal Stone Base Pad
  const basePad = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.08, 8), ironMat);
  basePad.position.y = 0.04;
  proceduralGroup.add(basePad);

  // 2. Fluted Central Pedestal Shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.85, 12), ironMat);
  shaft.position.y = 0.505;
  shaft.castShadow = true;
  proceduralGroup.add(shaft);

  // Decorative Brass Ring Bands
  for (let yPos of [0.22, 0.52, 0.82]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.015, 8, 16), brassMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = yPos;
    proceduralGroup.add(ring);
  }

  // 3. Tripod Arched Iron Support Legs
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.75, 8), ironMat);
    leg.rotation.z = 0.25;
    leg.rotation.y = angle;
    leg.position.set(Math.cos(angle) * 0.22, 0.45, Math.sin(angle) * 0.22);
    proceduralGroup.add(leg);
  }

  // 4. Flared Fire Basin Bowl
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.22, 0.28, 16, 1, true), ironMat);
  bowl.position.y = 1.05;
  proceduralGroup.add(bowl);

  const bowlBottom = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), ironMat);
  bowlBottom.rotation.x = Math.PI / 2;
  bowlBottom.position.y = 0.91;
  proceduralGroup.add(bowlBottom);

  // Spiked Rim Ring
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.018, 8, 24), brassMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.19;
  proceduralGroup.add(rim);

  // 5. Glowing Runic Ember Orb
  const flameOrb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), flameMat);
  flameOrb.position.y = 1.25;
  flameOrb.name = 'flameOrb';
  proceduralGroup.add(flameOrb);

  container.add(proceduralGroup);

  tryLoadGLB(ARENA_GLB_MAP.BRAZIER, container, proceduralGroup, 1.35, onGLBLoaded);

  return container;
}

/**
 * Creates a 3D Carved Dungeon Stone Pillar with runic capital.
 */
export function createArenaPillar(onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = 'PillarContainer';

  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'proceduralPillar';

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.3 });

  // Plinth Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.7), stoneMat);
  base.position.y = 0.125;
  proceduralGroup.add(base);

  // Pillar Shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 3.2, 12), stoneMat);
  shaft.position.y = 1.85;
  shaft.castShadow = true;
  proceduralGroup.add(shaft);

  // Brass Capital Ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.02, 8, 16), brassMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 3.35;
  proceduralGroup.add(ring);

  // Capital Top
  const capital = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.25, 0.75), stoneMat);
  capital.position.y = 3.5;
  proceduralGroup.add(capital);

  container.add(proceduralGroup);

  tryLoadGLB(ARENA_GLB_MAP.PILLAR, container, proceduralGroup, 3.6, onGLBLoaded);

  return container;
}

/**
 * Creates a 3D Iron-Banded Treasure Chest with keyhole lockplate.
 */
export function createTreasureChest(onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = 'ChestContainer';

  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'proceduralChest';

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.25 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.85, roughness: 0.2 });

  // Chest Base Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 0.55), woodMat);
  body.position.y = 0.225;
  body.castShadow = true;
  proceduralGroup.add(body);

  // Curved Lid
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.85, 16, 1, false, 0, Math.PI), woodMat);
  lid.rotation.z = Math.PI / 2;
  lid.position.y = 0.45;
  proceduralGroup.add(lid);

  // Iron Banding Straps
  for (let xPos of [-0.35, 0, 0.35]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 0.57), ironMat);
    strap.position.set(xPos, 0.23, 0);
    proceduralGroup.add(strap);
  }

  // Golden Lockplate
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.02), goldMat);
  lock.position.set(0, 0.35, 0.28);
  proceduralGroup.add(lock);

  container.add(proceduralGroup);

  tryLoadGLB(ARENA_GLB_MAP.CHEST, container, proceduralGroup, 0.7, onGLBLoaded);

  return container;
}

/**
 * Helper to safely load GLB models in browser environment.
 */
function tryLoadGLB(glbUrl, container, fallbackMesh, targetDim, onComplete = null) {
  if (glbUrl && typeof window !== 'undefined' && window.location) {
    try {
      gltfLoader.load(
        glbUrl,
        (gltf) => {
          const scene = gltf.scene;
          const bbox = new THREE.Box3().setFromObject(scene);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);

          if (maxDim > 0 && targetDim > 0) {
            const scale = targetDim / maxDim;
            scene.scale.set(scale, scale, scale);
          }

          const center = new THREE.Vector3();
          bbox.getCenter(center);
          scene.position.sub(center.multiplyScalar(scene.scale.x));

          scene.traverse((c) => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });

          fallbackMesh.visible = false;
          scene.name = 'glbArenaMesh';
          container.add(scene);

          if (onComplete) onComplete(container, scene);
        },
        undefined,
        () => {}
      );
    } catch (e) {}
  }
}
