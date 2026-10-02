import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureGenerator } from '../../textures/TextureGenerator.js';

const gltfLoader = new GLTFLoader();

/**
 * Maps tavern furniture asset names to optional GLB asset paths in public/assets/models/tavern/
 */
const TAVERN_GLB_MAP = {
  TABLE: '/assets/models/tavern/table.glb',
  BENCH: '/assets/models/tavern/bench.glb',
  COUNTER: '/assets/models/tavern/bar_counter.glb',
  BARREL: '/assets/models/tavern/barrel.glb',
  MUG: '/assets/models/tavern/mug.glb',
  CHANDELIER: '/assets/models/tavern/chandelier.glb'
};

/**
 * Creates a high-fidelity 3D Heavy Oak Tavern Table with iron corner brackets and carved legs.
 * Supports async GLTF/GLB replacement when available.
 */
export function createTavernTable(onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = 'TavernTableContainer';

  // 1. High-Detail Procedural Fallback
  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'proceduralTable';

  const oakWoodMat = new THREE.MeshStandardMaterial({
    map: TextureGenerator.createWoodPlankTexture(),
    roughness: 0.48,
    metalness: 0.05
  });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.88, roughness: 0.3 });

  // Heavy Slab Tabletop with chamfered edge trim
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.095, 1.15), oakWoodMat);
  tableTop.position.y = 0.76;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  proceduralGroup.add(tableTop);

  // Underside Frame Beams
  const frameL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), oakWoodMat);
  frameL.position.set(0, 0.68, 0.42);
  proceduralGroup.add(frameL);

  const frameR = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), oakWoodMat);
  frameR.position.set(0, 0.68, -0.42);
  proceduralGroup.add(frameR);

  // Iron Corner Bracket Straps with Rivets
  for (let x of [-1, 1]) {
    for (let z of [-1, 1]) {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.10, 0.13), ironMat);
      bracket.position.set(x * 0.76, 0.76, z * 0.51);
      proceduralGroup.add(bracket);

      for (let rx of [-1, 1]) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), ironMat);
        rivet.position.set(x * 0.76 + rx * 0.04, 0.81, z * 0.51);
        proceduralGroup.add(rivet);
      }
    }
  }

  // 4 Heavy Turned Oak Legs
  for (let x of [-1, 1]) {
    for (let z of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.72, 12), oakWoodMat);
      leg.position.set(x * 0.66, 0.36, z * 0.42);
      leg.castShadow = true;
      proceduralGroup.add(leg);

      // Leg Base Ring
      const legBase = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 12), oakWoodMat);
      legBase.position.set(x * 0.66, 0.03, z * 0.42);
      proceduralGroup.add(legBase);
    }
  }

  container.add(proceduralGroup);

  // 2. Async GLTF Load
  tryLoadGLB(TAVERN_GLB_MAP.TABLE, container, proceduralGroup, 1.6, onGLBLoaded);

  return container;
}

/**
 * Creates a high-fidelity 3D Heavy Oak Bench with iron studs.
 */
export function createTavernBench(onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = 'TavernBenchContainer';

  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'proceduralBench';

  const oakWoodMat = new THREE.MeshStandardMaterial({
    map: TextureGenerator.createWoodPlankTexture(),
    roughness: 0.52
  });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 });

  // Seat Top Slab
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 0.38), oakWoodMat);
  seat.position.y = 0.42;
  seat.castShadow = true;
  proceduralGroup.add(seat);

  // 2 Trestle Leg Supports
  for (let x of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.39, 0.32), oakWoodMat);
    leg.position.set(x * 0.55, 0.195, 0);
    proceduralGroup.add(leg);

    // Iron Base Shoe
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.36), ironMat);
    shoe.position.set(x * 0.55, 0.015, 0);
    proceduralGroup.add(shoe);
  }

  // Cross Stretcher Beam
  const stretcher = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.06), oakWoodMat);
  stretcher.position.set(0, 0.15, 0);
  proceduralGroup.add(stretcher);

  container.add(proceduralGroup);

  tryLoadGLB(TAVERN_GLB_MAP.BENCH, container, proceduralGroup, 1.4, onGLBLoaded);

  return container;
}

/**
 * Creates a realistic 3D Wooden Ale Tankard with frothy amber foam surface.
 */
export function createTavernMug(onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = 'TavernMugContainer';

  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'proceduralMug';

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.55 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.88, roughness: 0.3 });
  const aleMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.1 });
  const foamMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.9 });

  // Tapered Stave Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.18, 16), woodMat);
  proceduralGroup.add(body);

  // Dual Iron Bands
  for (let h of [-1, 1]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.008, 8, 16), ironMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = h * 0.055;
    proceduralGroup.add(band);
  }

  // Carved Handle
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 8, 12, Math.PI), woodMat);
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(0.085, 0, 0);
  proceduralGroup.add(handle);

  // Amber Liquid Surface
  const aleSurface = new THREE.Mesh(new THREE.CircleGeometry(0.068, 16), aleMat);
  aleSurface.rotation.x = -Math.PI / 2;
  aleSurface.position.y = 0.078;
  aleSurface.name = 'aleSurface';
  proceduralGroup.add(aleSurface);

  // Foam Ring
  const foam = new THREE.Mesh(new THREE.RingGeometry(0.038, 0.07, 16), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = 0.081;
  proceduralGroup.add(foam);

  container.add(proceduralGroup);

  tryLoadGLB(TAVERN_GLB_MAP.MUG, container, proceduralGroup, 0.2, onGLBLoaded);

  return container;
}

/**
 * Creates a high-detail 3D Wooden Wine Barrel with iron hoops and spigot.
 */
export function createWineBarrel(onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = 'WineBarrelContainer';

  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'proceduralBarrel';

  const woodMat = new THREE.MeshStandardMaterial({
    map: TextureGenerator.createWoodPlankTexture(),
    roughness: 0.6
  });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.25 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85 });

  // Bulging Barrel Body (simulated via scaled sphere/cylinder)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.0, 16), woodMat);
  body.scale.set(1.12, 1.0, 1.12);
  body.castShadow = true;
  proceduralGroup.add(body);

  // 4 Iron Hoops
  for (let yPos of [-0.4, -0.2, 0.2, 0.4]) {
    const scaleFactor = 1.0 + (0.4 - Math.abs(yPos)) * 0.25;
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.38 * scaleFactor, 0.015, 8, 20), ironMat);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = yPos;
    proceduralGroup.add(hoop);
  }

  // Brass Tap Spigot
  const spigot = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.14, 8), brassMat);
  spigot.rotation.x = Math.PI / 2;
  spigot.position.set(0, -0.15, 0.45);
  proceduralGroup.add(spigot);

  const tapValve = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), brassMat);
  tapValve.position.set(0, -0.10, 0.45);
  proceduralGroup.add(tapValve);

  container.add(proceduralGroup);

  tryLoadGLB(TAVERN_GLB_MAP.BARREL, container, proceduralGroup, 1.0, onGLBLoaded);

  return container;
}

/**
 * Helper to safely load GLB assets in browser environment.
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
          scene.name = 'glbTavernMesh';
          container.add(scene);

          if (onComplete) onComplete(container, scene);
        },
        undefined,
        () => {}
      );
    } catch (e) {}
  }
}
