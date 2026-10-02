import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

/**
 * Maps weapon model types to optional GLB asset paths in public/assets/models/weapons/
 */
const GLB_ASSET_MAP = {
  SWORD: '/assets/models/weapons/magic-sword.glb',
  AXE: '/assets/models/weapons/battleaxe.glb',
  SHIELD: '/assets/models/weapons/shield.glb',
  STAFF: '/assets/models/weapons/staff.glb',
  LUTE: '/assets/models/weapons/lute.glb',
  HAMMER: '/assets/models/weapons/warhammer.glb',
  DAGGER: '/assets/models/weapons/dagger.glb'
};

/**
 * Creates a high-fidelity 3D weapon model group for Garth's Shop counter pedestals.
 * Features ultra-detailed procedural fallback geometry with smooth async GLTF loading if available.
 *
 * @param {string} modelType - 'SWORD' | 'AXE' | 'SHIELD' | 'STAFF' | 'LUTE' | 'HAMMER' | 'DAGGER'
 * @param {function} [onGLBLoaded] - Callback fired when a GLB file is asynchronously loaded and replaces procedural mesh
 * @returns {THREE.Group}
 */
export function createWeaponModel(modelType, onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = `WeaponModel_${modelType}`;

  // 1. Build initial procedural high-detail 3D geometry fallback
  const proceduralGroup = buildProceduralWeapon(modelType);
  proceduralGroup.name = 'proceduralMesh';
  container.add(proceduralGroup);

  // 2. Attempt async GLTF/GLB loading if asset file exists and running in a browser environment
  const glbPath = GLB_ASSET_MAP[modelType];
  if (glbPath && typeof window !== 'undefined' && window.location) {
    try {
      gltfLoader.load(
        glbPath,
        (gltf) => {
          const glbScene = gltf.scene;

          // Auto-scale GLB model to fit 0.6m pedestal envelope
          const bbox = new THREE.Box3().setFromObject(glbScene);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);

          if (maxDim > 0) {
            const targetScale = 0.55 / maxDim;
            glbScene.scale.set(targetScale, targetScale, targetScale);
          }

          // Center pivot
          const center = new THREE.Vector3();
          bbox.getCenter(center);
          glbScene.position.sub(center.multiplyScalar(glbScene.scale.x));

          glbScene.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.metalness = Math.max(child.material.metalness || 0, 0.7);
                child.material.roughness = Math.min(child.material.roughness || 1, 0.35);
              }
            }
          });

          // Hide procedural fallback and reveal loaded GLB
          proceduralGroup.visible = false;
          glbScene.name = 'glbMesh';
          container.add(glbScene);

          if (onGLBLoaded) onGLBLoaded(container, glbScene);
        },
        undefined,
        (err) => {
          // Silent fallback to procedural geometry if GLB file isn't present
        }
      );
    } catch (e) {
      // Ignore network errors in non-browser environments
    }
  }

  return container;
}

/**
 * Builds high-fidelity procedural 3D weapon geometry with realistic blades, hilts, grips, and facets.
 */
function buildProceduralWeapon(modelType) {
  const group = new THREE.Group();

  if (modelType === 'SWORD') {
    // ⚔️ Steel Broadsword with Fuller Groove & Brass Quillons
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.92, roughness: 0.15 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });

    // Main Blade with taper
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.62), steelMat);
    blade.position.set(0, 0.02, 0);
    group.add(blade);

    // Fuller Groove (darkened steel recessed channel)
    const fullerMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.4 });
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.014, 0.48), fullerMat);
    fuller.position.set(0, 0.02, -0.04);
    group.add(fuller);

    // Flared Crossguard (Quillons)
    const guardMid = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.035), brassMat);
    guardMid.position.set(0, 0.02, 0.31);
    group.add(guardMid);

    for (let side of [-1, 1]) {
      const quillon = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.09, 8), brassMat);
      quillon.rotation.z = side * (Math.PI / 2.3);
      quillon.position.set(side * 0.075, 0.02, 0.31);
      group.add(quillon);
    }

    // Leather-wrapped Grip with Ribbing
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.16, 12), leatherMat);
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0, 0.02, 0.41);
    group.add(grip);

    // Ribbing rings on grip
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 8, 12), brassMat);
      ring.position.set(0, 0.02, 0.35 + i * 0.04);
      group.add(ring);
    }

    // Octagonal Brass Pommel
    const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 8), brassMat);
    pommel.rotation.x = Math.PI / 2;
    pommel.position.set(0, 0.02, 0.50);
    group.add(pommel);

  } else if (modelType === 'AXE') {
    // 🪓 Double-Bevelled Battleaxe with Iron Reinforcement Bands
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.88, roughness: 0.3 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c2b0e, roughness: 0.75 });

    // Main Shaft
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.68, 12), woodMat);
    haft.rotation.x = Math.PI / 2;
    haft.position.set(0, 0.02, 0.1);
    group.add(haft);

    // Iron Reinforcement Bands on Shaft
    for (let zPos of [-0.15, 0.05, 0.35]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.03, 12), ironMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(0, 0.02, zPos);
      group.add(band);
    }

    // Axe Head Central Socket Collar
    const socketCollar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.12), ironMat);
    socketCollar.position.set(0, 0.02, -0.16);
    group.add(socketCollar);

    // Dual Curved Axe Blades with Sharp Silver Edges
    for (let side of [-1, 1]) {
      const bladeBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.014, 0.18), ironMat);
      bladeBody.position.set(side * 0.08, 0.02, -0.16);
      group.add(bladeBody);

      const sharpEdge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.22), edgeMat);
      sharpEdge.position.set(side * 0.15, 0.02, -0.16);
      group.add(sharpEdge);
    }

    // Top Spike
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1, 8), ironMat);
    spike.rotation.x = -Math.PI / 2;
    spike.position.set(0, 0.02, -0.26);
    group.add(spike);

  } else if (modelType === 'SHIELD') {
    // 🛡️ Iron-Rimmed Heater Shield with Golden Boss
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.85, roughness: 0.25 });
    const bossMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });

    // Shield Body (Heater Shape)
    const shieldBody = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.18, 0.035, 16), bodyMat);
    shieldBody.rotation.x = Math.PI / 2;
    shieldBody.position.set(0, 0.03, 0);
    group.add(shieldBody);

    // Decorative Rim
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.215, 16), rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(0, 0.05, 0);
    group.add(rim);

    // Central Boss Cone
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), bossMat);
    boss.scale.set(1.0, 0.5, 1.0);
    boss.position.set(0, 0.05, 0);
    group.add(boss);

    // Iron Rivets around Rim
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const rx = Math.cos(angle) * 0.195;
      const rz = Math.sin(angle) * 0.195;
      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), bossMat);
      rivet.position.set(rx, 0.052, rz);
      group.add(rivet);
    }

  } else if (modelType === 'STAFF') {
    // 🪄 Oak Wizard Staff with Crown Claw & Glowing Mana Crystal
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.3 });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.1
    });

    // Tapered Gnarled Staff Shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.016, 0.78, 12), woodMat);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, 0.02, 0.1);
    group.add(shaft);

    // Brass Base Ferrule Spike
    const ferrule = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08, 8), brassMat);
    ferrule.rotation.x = Math.PI / 2;
    ferrule.position.set(0, 0.02, 0.52);
    group.add(ferrule);

    // Crown Claws holding crystal
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.024, 0.06, 12), brassMat);
    crownBase.rotation.x = Math.PI / 2;
    crownBase.position.set(0, 0.02, -0.24);
    group.add(crownBase);

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const claw = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.05, 0.012), brassMat);
      claw.position.set(Math.cos(angle) * 0.03, 0.02 + Math.sin(angle) * 0.03, -0.28);
      group.add(claw);
    }

    // Octahedron Glowing Mana Crystal
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.052), crystalMat);
    crystal.position.set(0, 0.03, -0.29);
    group.add(crystal);

  } else if (modelType === 'LUTE') {
    // 🪕 Bard's Acoustic 12-String Lute with Rosette & Tuning Pegs
    const bodyWood = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.35 });
    const faceWood = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3 });
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 });
    const pegMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7 });

    // Bowl Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 16), bodyWood);
    body.scale.set(1.0, 1.3, 0.55);
    body.position.set(0, 0.04, -0.06);
    group.add(body);

    // Spruce Soundboard
    const soundboard = new THREE.Mesh(new THREE.CircleGeometry(0.105, 16), faceWood);
    soundboard.scale.set(1.0, 1.25, 1.0);
    soundboard.rotation.x = -Math.PI / 2;
    soundboard.position.set(0, 0.072, -0.06);
    group.add(soundboard);

    // Carved Rosette Soundhole
    const rosetteOuter = new THREE.Mesh(new THREE.CircleGeometry(0.028, 16), darkWood);
    rosetteOuter.rotation.x = -Math.PI / 2;
    rosetteOuter.position.set(0, 0.074, -0.06);
    group.add(rosetteOuter);

    const rosetteInner = new THREE.Mesh(new THREE.RingGeometry(0.012, 0.024, 16), faceWood);
    rosetteInner.rotation.x = -Math.PI / 2;
    rosetteInner.position.set(0, 0.075, -0.06);
    group.add(rosetteInner);

    // Fretted Neck
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.022, 0.26), darkWood);
    neck.position.set(0, 0.05, 0.16);
    group.add(neck);

    // Angled Peghead
    const peghead = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 0.1), darkWood);
    peghead.rotation.x = Math.PI / 5;
    peghead.position.set(0, 0.07, 0.31);
    group.add(peghead);

    // Tuning Pegs
    for (let side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.025, 8), pegMat);
        peg.rotation.z = Math.PI / 2;
        peg.position.set(side * 0.028, 0.07 + i * 0.015, 0.28 + i * 0.02);
        group.add(peg);
      }
    }

  } else if (modelType === 'HAMMER') {
    // 🔨 Heavy Steel Warhammer with Armor-Piercing Spike
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.25 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85 });

    // Shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.58, 12), woodMat);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, 0.02, 0.1);
    group.add(shaft);

    // Shaft Collar Bands
    for (let zPos of [-0.08, 0.28]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.025, 12), brassMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(0, 0.02, zPos);
      group.add(band);
    }

    // Heavy Hammer Head (Striking Face)
    const headFace = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.1), steelMat);
    headFace.position.set(-0.04, 0.03, -0.16);
    group.add(headFace);

    // Bevelled striking surface grid
    const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.09), steelMat);
    facePlate.position.set(-0.105, 0.03, -0.16);
    group.add(facePlate);

    // Armor-Piercing Curved Rear Spike
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 4), steelMat);
    spike.rotation.z = -Math.PI / 2;
    spike.position.set(0.08, 0.03, -0.16);
    group.add(spike);

  } else {
    // 🗡️ Rogue Stiletto Dagger with Brass S-Guard & Gemmed Pommel
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.1 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.85, roughness: 0.2 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const gemMat = new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0xb45309, emissiveIntensity: 0.6 });

    // Double-edged Stiletto Blade
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.009, 0.32), steelMat);
    blade.position.set(0, 0.015, -0.06);
    group.add(blade);

    // Center ridge line
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, 0.30), steelMat);
    ridge.position.set(0, 0.015, -0.06);
    group.add(ridge);

    // S-Curved Brass Guard
    const guardMid = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.018, 0.02), brassMat);
    guardMid.position.set(0, 0.015, 0.10);
    group.add(guardMid);

    for (let side of [-1, 1]) {
      const quillon = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.05, 8), brassMat);
      quillon.rotation.z = side * (Math.PI / 3);
      quillon.position.set(side * 0.04, 0.015, 0.10);
      group.add(quillon);
    }

    // Diamond-textured Dark Grip
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.11, 12), gripMat);
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0, 0.015, 0.165);
    group.add(grip);

    // Brass Pommel with Inset Gem
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), brassMat);
    pommel.position.set(0, 0.015, 0.23);
    group.add(pommel);

    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.012), gemMat);
    gem.position.set(0, 0.015, 0.245);
    group.add(gem);
  }

  return group;
}
