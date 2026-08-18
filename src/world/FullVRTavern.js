import * as THREE from 'three';
import { TextureGenerator } from '../textures/TextureGenerator.js';
import { PatronModels } from './PatronModels.js';

export class FullVRTavern {
  constructor(scene, onBardSelected, onDoorSelected) {
    this.scene = scene;
    this.onBardSelected = onBardSelected;
    this.onDoorSelected = onDoorSelected;

    this.interactableObjects = [];
    this.torches = [];
    this.embers = [];
    this.bardMesh = null;
    this.exitDoorMesh = null;
    this.speechBubbleMesh = null;
    this.speechCanvasCtx = null;
    this.speechTexture = null;

    this.initTavernRoom();
    this.initStageAndBard();
    this.initPatronsAndTables();
    this.initExitDoor();
    this.initFireplace();
    this.initFloatingSpeechBubble();
  }

  initTavernRoom() {
    // Atmospheric Fog & Lighting
    this.scene.fog = new THREE.FogExp2(0x0a0c10, 0.05);

    const ambientLight = new THREE.AmbientLight(0x38281a, 1.4);
    this.scene.add(ambientLight);

    // Stone Wall Material
    const stoneTex = TextureGenerator.createStoneWallTexture();
    stoneTex.repeat.set(4, 2);
    const wallMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.85
    });

    // Wood Plank Floor Material
    const woodTex = TextureGenerator.createWoodPlankTexture();
    woodTex.repeat.set(4, 4);
    const floorMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.7
    });

    // Room Dimensions: 14m wide x 10m deep x 5m high
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ceiling with Timber Beams
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), floorMat);
    ceiling.position.y = 5.0;
    ceiling.rotation.x = Math.PI / 2;
    this.scene.add(ceiling);

    // Walls
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), wallMat);
    backWall.position.set(0, 2.5, -6);
    this.scene.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), wallMat);
    frontWall.position.set(0, 2.5, 6);
    frontWall.rotation.y = Math.PI;
    this.scene.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), wallMat);
    leftWall.position.set(-7, 2.5, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), wallMat);
    rightWall.position.set(7, 2.5, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.scene.add(rightWall);

    // Stained Glass Window with Moonlit Beam
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
    const windowMesh = new THREE.Mesh(new THREE.CircleGeometry(1.2, 16), windowMat);
    windowMesh.position.set(0, 3.2, -5.95);
    this.scene.add(windowMesh);
  }

  initStageAndBard() {
    // Elevated Wooden Stage Platform (Front Center of Tavern)
    const stageGeo = new THREE.BoxGeometry(4.5, 0.4, 2.8);
    const woodTex = TextureGenerator.createWoodPlankTexture();
    const stageMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.5 });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.set(0, 0.2, -4.2);
    stage.receiveShadow = true;
    stage.castShadow = true;
    this.scene.add(stage);

    // Warm Spotlight on Stage
    const stageLight = new THREE.SpotLight(0xf3cf65, 3.5, 12, Math.PI / 4, 0.4);
    stageLight.position.set(0, 4.5, -2.5);
    stageLight.target = stage;
    this.scene.add(stageLight);

    // The Bard Model
    this.bardMesh = PatronModels.createBard();
    this.bardMesh.position.set(0, 0.4, -4.2);
    this.bardMesh.userData = { isBard: true, action: 'openPartyCreation' };
    this.scene.add(this.bardMesh);
    this.interactableObjects.push(this.bardMesh);

    // Stage Banner: "THE SCARLET BARD TAVERN"
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 512;
    bannerCanvas.height = 128;
    const ctx = bannerCanvas.getContext('2d');
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 108);
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 32px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚔️ SKARA BRAE TAVERN ⚔️', 256, 75);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.9),
      new THREE.MeshBasicMaterial({ map: bannerTex })
    );
    banner.position.set(0, 3.6, -5.9);
    this.scene.add(banner);
  }

  initPatronsAndTables() {
    // Scatter Tables & Seated Race/Class Patrons facing the Bard's stage
    const patronConfigs = [
      { createFn: PatronModels.createPaladin, pos: [-2.5, 0, -1.5], rot: Math.PI / 4, label: 'Human Paladin' },
      { createFn: PatronModels.createWizard, pos: [2.5, 0, -1.5], rot: -Math.PI / 4, label: 'Elf Wizard' },
      { createFn: PatronModels.createDwarf, pos: [-3.0, 0, 1.5], rot: Math.PI / 6, label: 'Dwarf Warrior' },
      { createFn: PatronModels.createHobbit, pos: [3.0, 0, 1.5], rot: -Math.PI / 6, label: 'Hobbit Rogue' }
    ];

    const tableMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWoodPlankTexture(),
      roughness: 0.6
    });

    patronConfigs.forEach(cfg => {
      // Table
      const tableGroup = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 16), tableMat);
      top.position.y = 0.75;
      tableGroup.add(top);

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.75), tableMat);
      leg.position.y = 0.375;
      tableGroup.add(leg);

      tableGroup.position.set(cfg.pos[0], 0, cfg.pos[2]);
      this.scene.add(tableGroup);

      // Ale Mug on Table
      const mug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x92400e })
      );
      mug.position.set(cfg.pos[0] + 0.2, 0.85, cfg.pos[2] + 0.1);
      this.scene.add(mug);

      // Candle Light on Table
      const candleLight = new THREE.PointLight(0xffaa33, 1.2, 4);
      candleLight.position.set(cfg.pos[0], 0.95, cfg.pos[2]);
      this.scene.add(candleLight);

      // Seated Patron Model
      const patron = cfg.createFn();
      patron.position.set(cfg.pos[0], 0, cfg.pos[2] + 0.6);
      patron.rotation.y = cfg.rot;
      this.scene.add(patron);
    });
  }

  initExitDoor() {
    // Tavern Exit Door (Right Wall)
    const doorGroup = new THREE.Group();
    doorGroup.position.set(6.9, 0, 0);
    doorGroup.rotation.y = -Math.PI / 2;

    const doorMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWoodPlankTexture(),
      roughness: 0.7
    });

    // Frame & Door Mesh
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.2, 0.15), doorMat);
    doorFrame.position.y = 1.6;
    doorGroup.add(doorFrame);

    // Door Plate & Handle
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), handleMat);
    handle.position.set(0.5, 1.5, 0.12);
    doorGroup.add(handle);

    // Sign Above Door: "EXIT TO SKARA BRAE"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256;
    signCanvas.height = 64;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = '#331a00';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚪 EXIT GAME', 128, 40);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.35),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    sign.position.set(0, 3.4, 0.1);
    doorGroup.add(sign);

    doorGroup.userData = { isDoor: true, action: 'exitGame' };
    this.exitDoorMesh = doorGroup;
    this.scene.add(doorGroup);
    this.interactableObjects.push(doorFrame);
  }

  initFireplace() {
    // Cozy Stone Fireplace on Left Wall
    const fireplace = new THREE.Group();
    fireplace.position.set(-6.8, 0, -2.5);
    fireplace.rotation.y = Math.PI / 2;

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.9 });
    const mantle = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 0.8), stoneMat);
    mantle.position.y = 1.2;
    fireplace.add(mantle);

    // Fire Point Light
    const fireLight = new THREE.PointLight(0xff5500, 3.5, 10);
    fireLight.position.set(0, 0.6, 0.5);
    fireplace.add(fireLight);
    this.torches.push({ light: fireLight, baseIntensity: 3.5, idx: 99 });

    this.scene.add(fireplace);
  }

  initFloatingSpeechBubble() {
    // Canvas texture for 3D Floating Speech Lyric next to Bard's face
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    this.speechCanvasCtx = canvas.getContext('2d');
    this.speechTexture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.MeshBasicMaterial({
      map: this.speechTexture,
      transparent: true,
      depthTest: false
    });

    this.speechBubbleMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), mat);
    this.speechBubbleMesh.position.set(1.3, 2.2, -4.2);
    this.scene.add(this.speechBubbleMesh);

    this.updateLyricText("🎵 The Evil in Skara Brae");
  }

  updateLyricText(text) {
    if (!this.speechCanvasCtx || !this.speechTexture) return;

    const ctx = this.speechCanvasCtx;
    ctx.clearRect(0, 0, 512, 128);

    if (text) {
      // Speech Bubble Background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#f3cf65';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(10, 10, 492, 108, 16);
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = '#f3cf65';
      ctx.font = 'bold 24px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, 256, 70);
    }

    this.speechTexture.needsUpdate = true;
  }

  update(time) {
    // Torch Flickering
    this.torches.forEach(t => {
      t.light.intensity = t.baseIntensity + Math.sin(time * 14 + t.idx) * 0.5 + Math.cos(time * 9) * 0.3;
    });

    // Make speech bubble float gently
    if (this.speechBubbleMesh) {
      this.speechBubbleMesh.position.y = 2.2 + Math.sin(time * 2) * 0.05;
    }
  }
}
