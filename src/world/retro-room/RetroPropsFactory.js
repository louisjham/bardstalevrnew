import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureGenerator } from '../../textures/TextureGenerator.js';

const gltfLoader = new GLTFLoader();

const RETRO_GLB_MAP = {
  C64: '/assets/models/retro/c64.glb',
  DRIVE: '/assets/models/retro/1541_drive.glb',
  FLOPPY: '/assets/models/retro/floppy_disk.glb',
  JOYSTICK: '/assets/models/retro/joystick.glb',
  LAVA_LAMP: '/assets/models/retro/lava_lamp.glb',
  DESK: '/assets/models/retro/desk.glb',
  CHAIR: '/assets/models/retro/chair.glb'
};

/**
 * Creates a high-fidelity 3D Commodore 64 "Breadbox" computer model.
 * Features rounded wedge base, slanted PETSCII keyboard tray, and rainbow C= badge.
 */
export function createCommodore64(onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = 'C64Container';

  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'proceduralC64';

  const c64CaseTex = TextureGenerator.createC64CaseTexture();
  const c64CaseMat = new THREE.MeshStandardMaterial({ map: c64CaseTex, roughness: 0.55 });
  const keyboardTex = TextureGenerator.createC64KeyboardTexture();
  const keyboardMat = new THREE.MeshStandardMaterial({ map: keyboardTex, roughness: 0.6 });

  // Rounded wedge base
  const baseWedge = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.22), c64CaseMat);
  baseWedge.position.set(0, 0.03, 0);
  baseWedge.castShadow = true;
  proceduralGroup.add(baseWedge);

  // Slanted Keyboard Tray
  const slantTray = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.16), c64CaseMat);
  slantTray.rotation.x = -Math.PI / 16;
  slantTray.position.set(0, 0.06, 0.02);
  proceduralGroup.add(slantTray);

  // Detailed PETSCII Keyboard Keys
  const keysMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.02, 0.13), keyboardMat);
  keysMesh.rotation.x = -Math.PI / 16;
  keysMesh.position.set(0, 0.08, 0.02);
  proceduralGroup.add(keysMesh);

  // Iconic Rainbow Commodore Badge Logo (C=)
  const badgeCanvas = document.createElement('canvas');
  badgeCanvas.width = 128;
  badgeCanvas.height = 32;
  const bCtx = badgeCanvas.getContext('2d');
  bCtx.fillStyle = '#b89f80';
  bCtx.fillRect(0, 0, 128, 32);
  const rainbow = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
  rainbow.forEach((color, idx) => {
    bCtx.fillStyle = color;
    bCtx.fillRect(4 + idx * 8, 8, 6, 16);
  });
  bCtx.fillStyle = '#1e1b4b';
  bCtx.font = 'bold 13px sans-serif';
  bCtx.fillText('commodore 64', 48, 21);

  const badgeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 0.025),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(badgeCanvas) })
  );
  badgeMesh.rotation.x = -Math.PI / 2;
  badgeMesh.position.set(-0.12, 0.065, -0.075);
  proceduralGroup.add(badgeMesh);

  // Red Power LED
  const c64Led = new THREE.Mesh(
    new THREE.SphereGeometry(0.008, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  c64Led.position.set(0.18, 0.065, -0.075);
  proceduralGroup.add(c64Led);

  container.add(proceduralGroup);

  tryLoadGLB(RETRO_GLB_MAP.C64, container, proceduralGroup, 0.44, onGLBLoaded);

  return container;
}

/**
 * Creates a high-fidelity 3D Commodore 1541 Disk Drive model.
 */
export function createDiskDrive1541(onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = '1541DriveContainer';

  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'procedural1541Drive';

  const drive1541Tex = TextureGenerator.create1541DriveTexture();
  const driveMat = new THREE.MeshStandardMaterial({ map: drive1541Tex, roughness: 0.55 });
  const driveBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.38), driveMat);
  driveBody.position.y = 0.07;
  driveBody.castShadow = true;
  proceduralGroup.add(driveBody);

  // Top cooling vent slats
  for (let i = -3; i <= 3; i++) {
    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.005, 0.015),
      new THREE.MeshBasicMaterial({ color: 0x334155 })
    );
    vent.position.set(0, 0.142, i * 0.035 - 0.05);
    proceduralGroup.add(vent);
  }

  // Front Faceplate & Drive Slot
  const slotMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.012, 0.02),
    new THREE.MeshBasicMaterial({ color: 0x0f172a })
  );
  slotMesh.position.set(0, 0.07, 0.191);
  proceduralGroup.add(slotMesh);

  // Drive Door Rotating Locking Lever
  const latchMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.018, 0.015),
    new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 })
  );
  latchMesh.position.set(0.06, 0.07, 0.195);
  proceduralGroup.add(latchMesh);

  // Power (Green) LED
  const greenLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.006, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  );
  greenLed.position.set(-0.08, 0.11, 0.195);
  proceduralGroup.add(greenLed);

  container.add(proceduralGroup);

  tryLoadGLB(RETRO_GLB_MAP.DRIVE, container, proceduralGroup, 0.38, onGLBLoaded);

  return container;
}

/**
 * Creates a high-fidelity 3D Atari 2600 / C64 8-way Joystick model.
 */
export function createJoystickAtari(onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = 'JoystickContainer';

  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'proceduralJoystick';

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
  const stickMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
  const redBtnMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });

  // Base Box
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.14), baseMat);
  base.position.y = 0.0225;
  base.castShadow = true;
  proceduralGroup.add(base);

  // Rubber Boot
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.02, 12), baseMat);
  boot.position.y = 0.055;
  proceduralGroup.add(boot);

  // Steel Stick Shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 12), stickMat);
  shaft.position.y = 0.115;
  proceduralGroup.add(shaft);

  // Top Handle Ball Knob
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), baseMat);
  knob.position.y = 0.175;
  proceduralGroup.add(knob);

  // Red Fire Button
  const fireBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 12), redBtnMat);
  fireBtn.position.set(0.035, 0.045, -0.035);
  proceduralGroup.add(fireBtn);

  container.add(proceduralGroup);

  tryLoadGLB(RETRO_GLB_MAP.JOYSTICK, container, proceduralGroup, 0.18, onGLBLoaded);

  return container;
}

/**
 * Creates a 1980s Retro Lava Lamp model with gentle pulsing light.
 */
export function createLavaLamp(onGLBLoaded = null) {
  const container = new THREE.Group();
  container.name = 'LavaLampContainer';

  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'proceduralLavaLamp';

  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.75,
    roughness: 0.1
  });

  // Metallic Base Cone
  const base = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 16), chromeMat);
  base.position.y = 0.07;
  base.castShadow = true;
  proceduralGroup.add(base);

  // Glass Liquid Bottle
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.26, 16), glassMat);
  bottle.position.y = 0.26;
  proceduralGroup.add(bottle);

  // Top Cap
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.08, 16), chromeMat);
  cap.position.y = 0.41;
  proceduralGroup.add(cap);

  container.add(proceduralGroup);

  tryLoadGLB(RETRO_GLB_MAP.LAVA_LAMP, container, proceduralGroup, 0.45, onGLBLoaded);

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
          scene.name = 'glbRetroMesh';
          container.add(scene);

          if (onComplete) onComplete(container, scene);
        },
        undefined,
        () => {}
      );
    } catch (e) {}
  }
}
