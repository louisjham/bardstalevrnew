import * as THREE from 'three';
import { TextureGenerator } from '../../textures/TextureGenerator.js';

export class RetroRoom {
  constructor(scene, camera, onHeadInMonitor) {
    this.scene = scene;
    this.camera = camera;
    this.onHeadInMonitor = onHeadInMonitor;

    this.roomGroup = new THREE.Group();
    this.floppyDiskMesh = null;
    this.diskDriveMesh = null;
    this.crtMonitorMesh = null;
    this.driveLedLight = null;

    this.isDiskInserted = false;
    this.isBooting = false;
    this.isBootComplete = false;

    this.crtCanvasCtx = null;
    this.crtTexture = null;

    this.interactableObjects = [];

    this.initRetroRoom();
    this.scene.add(this.roomGroup);
  }

  initRetroRoom() {
    // 1980s Retro Bedroom Walls & Wooden Desk
    const deskGeo = new THREE.BoxGeometry(1.6, 0.75, 0.9);
    const woodMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWoodPlankTexture(),
      roughness: 0.6
    });
    const desk = new THREE.Mesh(deskGeo, woodMat);
    desk.position.set(0, 0.375, -0.6);
    this.roomGroup.add(desk);

    // Commodore 64 Computer Base
    const c64Geo = new THREE.BoxGeometry(0.42, 0.08, 0.24);
    const c64Mat = new THREE.MeshStandardMaterial({ color: 0xc4b5fd, roughness: 0.4 }); // Classic beige/tan
    const c64 = new THREE.Mesh(c64Geo, c64Mat);
    c64.position.set(-0.25, 0.79, -0.5);
    this.roomGroup.add(c64);

    // C64 Keyboard Keys
    const keysGeo = new THREE.BoxGeometry(0.38, 0.02, 0.16);
    const keysMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const keys = new THREE.Mesh(keysGeo, keysMat);
    keys.position.set(-0.25, 0.83, -0.48);
    this.roomGroup.add(keys);

    // 1541 Disk Drive (Beige box next to C64)
    const driveGroup = new THREE.Group();
    driveGroup.position.set(0.35, 0.85, -0.55);

    const driveBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.14, 0.38),
      c64Mat
    );
    driveGroup.add(driveBody);

    // Disk Drive Slot (Front opening)
    const slotMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.015, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x0f172a })
    );
    slotMesh.position.set(0, 0, 0.191);
    driveGroup.add(slotMesh);

    // Red LED Light on 1541 Drive
    this.driveLedLight = new THREE.PointLight(0xef4444, 0, 0.5);
    this.driveLedLight.position.set(0.08, 0.03, 0.195);
    driveGroup.add(this.driveLedLight);

    this.diskDriveMesh = driveGroup;
    this.roomGroup.add(driveGroup);
    this.interactableObjects.push(driveBody);

    // CRT Monitor
    const crtGroup = new THREE.Group();
    crtGroup.position.set(-0.25, 1.15, -0.65);

    const monitorHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.42, 0.42),
      c64Mat
    );
    crtGroup.add(monitorHousing);

    // CRT Screen Glass Frame
    const crtCanvas = document.createElement('canvas');
    crtCanvas.width = 512;
    crtCanvas.height = 384;
    this.crtCanvasCtx = crtCanvas.getContext('2d');
    this.crtTexture = new THREE.CanvasTexture(crtCanvas);

    const screenMat = new THREE.MeshBasicMaterial({
      map: this.crtTexture
    });

    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), screenMat);
    screenMesh.position.set(0, 0, 0.211);
    crtGroup.add(screenMesh);

    this.crtMonitorMesh = crtGroup;
    this.roomGroup.add(crtGroup);
    this.updateCRTScreen("C64 BASIC V2\n64K RAM SYSTEM 38911 BASIC BYTES FREE\n\nREADY.\n");

    // 5¼ Inch Floppy Disk labeled "The Bard's Tale VR" (Sitting on desk)
    const diskGroup = new THREE.Group();
    diskGroup.position.set(0.1, 0.77, -0.35);

    const diskCover = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.004, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }) // Black jacket
    );
    diskGroup.add(diskCover);

    // Label: "The Bard's Tale VR"
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const lCtx = labelCanvas.getContext('2d');
    lCtx.fillStyle = '#ffffff';
    lCtx.fillRect(0, 0, 256, 64);
    lCtx.fillStyle = '#1e3a8a';
    lCtx.font = 'bold 20px monospace';
    lCtx.fillText("THE BARD'S TALE VR", 10, 40);

    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.11, 0.04),
      new THREE.MeshBasicMaterial({ map: labelTex })
    );
    labelMesh.position.set(0, 0.003, -0.03);
    labelMesh.rotation.x = -Math.PI / 2;
    diskGroup.add(labelMesh);

    diskGroup.userData = { isFloppyDisk: true };
    this.floppyDiskMesh = diskGroup;
    this.roomGroup.add(diskGroup);
    this.interactableObjects.push(diskCover);

    // Instruction Banner
    const toastCanvas = document.createElement('canvas');
    toastCanvas.width = 512;
    toastCanvas.height = 80;
    const tCtx = toastCanvas.getContext('2d');
    tCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    tCtx.strokeStyle = '#f3cf65';
    tCtx.lineWidth = 4;
    tCtx.strokeRect(4, 4, 504, 72);
    tCtx.fillStyle = '#f3cf65';
    tCtx.font = 'bold 20px Georgia, serif';
    tCtx.textAlign = 'center';
    tCtx.fillText("💾 Click or Grab Floppy Disk & Insert into 1541 Drive!", 256, 46);

    const bannerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(toastCanvas), transparent: true })
    );
    bannerMesh.position.set(0, 1.6, -0.8);
    this.roomGroup.add(bannerMesh);
  }

  updateCRTScreen(text) {
    if (!this.crtCanvasCtx || !this.crtTexture) return;

    const ctx = this.crtCanvasCtx;
    ctx.fillStyle = '#3730a3'; // Commodore 64 Blue Screen
    ctx.fillRect(0, 0, 512, 384);

    ctx.fillStyle = '#a5b4fc'; // Light blue C64 text
    ctx.font = 'bold 18px monospace';

    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      ctx.fillText(line, 20, 40 + idx * 26);
    });

    this.crtTexture.needsUpdate = true;
  }

  insertFloppyDisk() {
    if (this.isDiskInserted) return;
    this.isDiskInserted = true;

    // Slide floppy disk smoothly into 1541 drive slot
    this.floppyDiskMesh.position.set(0.35, 0.85, -0.5);

    // Flicker Drive LED red & start boot sequence
    this.driveLedLight.intensity = 2.0;
    this.isBooting = true;

    this.updateCRTScreen("LOAD \"THEBARDSTALEVR\",8,1\n\nSEARCHING FOR THEBARDSTALEVR\nLOADING...");

    setTimeout(() => {
      this.updateCRTScreen("LOAD \"THEBARDSTALEVR\",8,1\n\nSEARCHING FOR THEBARDSTALEVR\nLOADING...\nREADY.\nRUN\n\n✨ BARD'S TALE VR LOADED!\n\n👉 LEAN FORWARD & PUT HEAD INTO MONITOR!");
      this.isBootComplete = true;
      this.driveLedLight.intensity = 0.5;
    }, 2400);
  }

  update(time) {
    // LED Flicker effect during drive read
    if (this.isBooting && !this.isBootComplete) {
      this.driveLedLight.intensity = Math.random() > 0.3 ? 2.5 : 0.2;
    }

    // Check if player leans forward into CRT Monitor (Head in Monitor trigger)
    if (this.isBootComplete) {
      const distToMonitor = this.camera.position.distanceTo(new THREE.Vector3(-0.25, 1.15, -0.65));
      if (distToMonitor < 0.45 && this.onHeadInMonitor) {
        this.onHeadInMonitor();
      }
    }
  }

  setVisible(visible) {
    this.roomGroup.visible = visible;
  }
}
