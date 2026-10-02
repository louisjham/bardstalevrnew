import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

const STREET_GLB_MAP = {
  LAMP: '/assets/models/streets/lamp_post.glb',
  DOOR: '/assets/models/streets/door.glb',
  OBELISK: '/assets/models/streets/obelisk.glb'
};

/**
 * Creates a high-fidelity 3D Medieval Street Lamp Post with iron turned shaft, crossbar brackets, and brass lantern.
 */
export function createStreetLampPost(onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = 'StreetLampContainer';

  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'proceduralLampPost';

  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.3 });
  const glassMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

  // Octagonal Base Collar
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.3, 8), ironMat);
  base.position.y = 0.15;
  proceduralGroup.add(base);

  // Turned Iron Shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.5, 12), ironMat);
  shaft.position.y = 1.4;
  shaft.castShadow = true;
  proceduralGroup.add(shaft);

  // Crossbar Brackets
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.04), ironMat);
  crossbar.position.y = 2.65;
  proceduralGroup.add(crossbar);

  // Lantern Housing Base
  const lanternBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.04, 8), brassMat);
  lanternBase.position.y = 2.72;
  proceduralGroup.add(lanternBase);

  // Glowing Amber Glass Orb
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), glassMat);
  orb.position.y = 2.85;
  orb.name = 'lampOrb';
  proceduralGroup.add(orb);

  // Lantern Cap
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.1, 8), brassMat);
  cap.position.y = 3.0;
  proceduralGroup.add(cap);

  container.add(proceduralGroup);

  tryLoadGLB(STREET_GLB_MAP.LAMP, container, proceduralGroup, 2.8, onGLBLoaded);

  return container;
}

/**
 * Creates a high-fidelity 3D Storefront Arched Wooden Door with iron strap hinges and ring handle.
 */
export function createStorefrontDoor(onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = 'StorefrontDoorContainer';

  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'proceduralStorefrontDoor';

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.25 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.85, roughness: 0.3 });

  // Heavy Outer Archway Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.85, 2.85, 0.26), ironMat);
  frame.position.set(0, 1.425, 0);
  proceduralGroup.add(frame);

  // Carved Door Panel
  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.12), woodMat);
  doorMesh.position.set(0, 1.3, 0.04);
  doorMesh.castShadow = true;
  proceduralGroup.add(doorMesh);

  // Iron Hinge Strap Bars
  for (let yPos of [0.6, 2.0]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.16), ironMat);
    strap.position.set(0, yPos, 0.04);
    proceduralGroup.add(strap);

    for (let xPos of [-0.5, 0, 0.5]) {
      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), ironMat);
      rivet.position.set(xPos, yPos, 0.13);
      proceduralGroup.add(rivet);
    }
  }

  // Brass Ring Door Handle
  const handleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12), brassMat);
  handleBase.rotation.x = Math.PI / 2;
  handleBase.position.set(0.55, 1.25, 0.11);
  proceduralGroup.add(handleBase);

  const ringHandle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 16), brassMat);
  ringHandle.position.set(0.55, 1.2, 0.13);
  proceduralGroup.add(ringHandle);

  container.add(proceduralGroup);

  tryLoadGLB(STREET_GLB_MAP.DOOR, container, proceduralGroup, 2.85, onGLBLoaded);

  return container;
}

/**
 * Creates a high-fidelity 3D Gran Plaz White Marble Obelisk Monument.
 */
export function createGranPlazObelisk(onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = 'ObeliskContainer';

  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'proceduralObelisk';

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1 });

  // Plinth Base (Two-tiered octagonal steps)
  const step1 = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 0.25, 16), baseMat);
  step1.position.y = 0.125;
  proceduralGroup.add(step1);

  const step2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.35, 16), baseMat);
  step2.position.y = 0.425;
  proceduralGroup.add(step2);

  // 4-Sided Tapered Marble Obelisk Shaft with Pyramidion Tip
  const obelisk = new THREE.Mesh(new THREE.ConeGeometry(0.72, 3.6, 4), marbleMat);
  obelisk.position.y = 2.4;
  obelisk.rotation.y = Math.PI / 4;
  obelisk.castShadow = true;
  proceduralGroup.add(obelisk);

  container.add(proceduralGroup);

  tryLoadGLB(STREET_GLB_MAP.OBELISK, container, proceduralGroup, 3.6, onGLBLoaded);

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
          scene.name = 'glbStreetMesh';
          container.add(scene);

          if (onComplete) onComplete(container, scene);
        },
        undefined,
        () => {}
      );
    } catch (e) {}
  }
}
