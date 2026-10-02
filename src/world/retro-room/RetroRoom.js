import * as THREE from 'three';
import { TextureGenerator } from '../../textures/TextureGenerator.js';
import { CRTMonitorShader } from '../../shaders/CRTMonitorShader.js';
import { VortexPortalShader } from '../../shaders/VortexPortalShader.js';
import { createCommodore64, createDiskDrive1541, createJoystickAtari, createLavaLamp } from './RetroPropsFactory.js';

export class RetroRoom {
  constructor(scene, camera, onHeadInMonitor, xrRig = null) {
    this.scene = scene;
    this.camera = camera;
    this.onHeadInMonitor = onHeadInMonitor;
    this.xrRig = xrRig;

    this.roomGroup = new THREE.Group();
    this.roomGroup.name = 'RetroRoom';

    this.floppyDiskMesh = null;
    this.diskDriveMesh = null;
    this.crtMonitorMesh = null;
    /** @type {THREE.Mesh|null} The screen plane mesh that carries the CRT material. */
    this.crtScreenMesh = null;
    this.driveLedLight = null;
    this.lavaLampLight = null;
    this.portalMesh = null;

    this.isDiskInserted = false;
    this.isBooting = false;
    this.isBootComplete = false;

    // Flash-Paper Intro & Stationary Void State
    this.introVoidGroup = null;
    this.isFlashPaperActive = false;
    this.isFadingIn = false;
    this.flareMesh = null;
    this.flareShaderMat = null;
    this.sparkParticles = null;
    this.flarePointLight = null;
    this.titleCardMesh = null;
    this.titleCardMat = null;
    this.titleCardTex = null;
    this.screenOverlay = null;

    // Cinematic / Intro State Machine
    this.cinematicPhase = 'IDLE';
    this.cinematicTime = 0.0;
    this.onCinematicComplete = null;
    // Generation counter: incremented on every triggerCinematicIntro() call.
    // Each RAF loop closure captures the generation at start time; if the counter
    // has advanced by the time a tick fires, the old loop exits immediately.
    // This prevents two concurrent RAF loops from fighting over shared state when
    // the player restarts the game mid-cinematic.
    this._cinematicGeneration = 0;
    // Separate generation counter for fade-in / fade-out RAF loops.
    // Guarantees only one fade loop is active at any time regardless of how
    // quickly state transitions trigger fade calls.
    this._fadeGeneration = 0;

    this.crtCanvasCtx = null;
    this.crtTexture = null;

    this.interactableObjects = [];

    // ── Pre-allocated scratch Vector3s (avoids `new THREE.Vector3()` every frame
    //    inside the cinematic update loop — eliminates per-frame GC pressure).
    this._v3A = new THREE.Vector3();
    this._v3B = new THREE.Vector3();
    this._v3Lerp = new THREE.Vector3();

    // VR mode flag — set via setVRMode(). Controls material swap & uTime update.
    this._isVRMode = false;

    this.initRetroRoom();
    this.scene.add(this.roomGroup);
  }

  initRetroRoom() {
    // 1. Room Lighting
    const ambientLight = new THREE.AmbientLight(0xffedd5, 1.25);
    this.roomGroup.add(ambientLight);

    const ceilingLight = new THREE.DirectionalLight(0xe0e7ff, 0.75);
    ceilingLight.position.set(0, 3.2, 0.5);
    this.roomGroup.add(ceilingLight);

    // 2. Complete 4-Wall Bedroom Enclosure (6m x 6m x 3.2m)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 }); // Dark navy walls
    const woodMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWoodPlankTexture(),
      roughness: 0.55
    });

    // Floor with cozy 80s/90s patterned carpet/wood
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 6.0), woodMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0.5);
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // Ceiling
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 6.0), ceilingMat);
    ceiling.position.set(0, 3.2, 0.5);
    ceiling.rotation.x = Math.PI / 2;
    this.roomGroup.add(ceiling);

    // Ceiling Fan & Vintage Lamp Fixture
    const fixtureGroup = new THREE.Group();
    fixtureGroup.position.set(0, 3.05, 0.5);
    const fixtureBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 })
    );
    fixtureGroup.add(fixtureBase);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.015, 0.65),
        new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 })
      );
      blade.rotation.y = (i * Math.PI) / 2;
      blade.position.set(Math.sin((i * Math.PI) / 2) * 0.38, -0.02, Math.cos((i * Math.PI) / 2) * 0.38);
      fixtureGroup.add(blade);
    }
    const fanLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xfef08a, emissiveIntensity: 0.6 })
    );
    fanLight.position.y = -0.08;
    fixtureGroup.add(fanLight);
    this.roomGroup.add(fixtureGroup);

    // 4 Walls
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 3.2), wallMat);
    backWall.position.set(0, 1.6, -2.5);
    this.roomGroup.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 3.2), wallMat);
    frontWall.position.set(0, 1.6, 3.5);
    frontWall.rotation.y = Math.PI;
    this.roomGroup.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 3.2), wallMat);
    leftWall.position.set(-3.0, 1.6, 0.5);
    leftWall.rotation.y = Math.PI / 2;
    this.roomGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 3.2), wallMat);
    rightWall.position.set(3.0, 1.6, 0.5);
    rightWall.rotation.y = -Math.PI / 2;
    this.roomGroup.add(rightWall);

    // Dark Wood Baseboards around perimeter
    const bbMat = new THREE.MeshStandardMaterial({ color: 0x3e2312, roughness: 0.7 });
    const bbBack = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.12, 0.04), bbMat);
    bbBack.position.set(0, 0.06, -2.48);
    this.roomGroup.add(bbBack);

    const bbFront = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.12, 0.04), bbMat);
    bbFront.position.set(0, 0.06, 3.48);
    this.roomGroup.add(bbFront);

    const bbLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 6.0), bbMat);
    bbLeft.position.set(-2.98, 0.06, 0.5);
    this.roomGroup.add(bbLeft);

    const bbRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 6.0), bbMat);
    bbRight.position.set(2.98, 0.06, 0.5);
    this.roomGroup.add(bbRight);

    // 3. Doors & Windows
    // Bedroom Door on Front Wall (z = 3.46)
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.06), doorMat);
    door.position.set(0, 1.2, 3.46);
    this.roomGroup.add(door);

    const doorknob = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 })
    );
    doorknob.position.set(-0.45, 1.15, 3.42);
    this.roomGroup.add(doorknob);

    // Light switch on front wall
    const switchPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.12, 0.015),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9 })
    );
    switchPlate.position.set(0.8, 1.25, 3.48);
    this.roomGroup.add(switchPlate);

    // Bedroom Window on Left Wall with Blinds & Curtains
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.5, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    windowFrame.position.set(-2.96, 1.8, 0.5);
    this.roomGroup.add(windowFrame);

    const windowGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.4),
      new THREE.MeshBasicMaterial({ color: 0x0369a1, transparent: true, opacity: 0.5 })
    );
    windowGlass.position.set(-2.95, 1.8, 0.5);
    windowGlass.rotation.y = Math.PI / 2;
    this.roomGroup.add(windowGlass);

    // Horizontal Blinds Slats
    const blindsGroup = new THREE.Group();
    blindsGroup.position.set(-2.94, 1.8, 0.5);
    for (let i = -6; i <= 6; i++) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.03, 1.85),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
      );
      slat.rotation.z = Math.PI / 6;
      slat.position.set(0, i * 0.09, 0);
      blindsGroup.add(slat);
    }
    this.roomGroup.add(blindsGroup);

    // Velvet Bedroom Curtains
    const curtainMat = new THREE.MeshStandardMaterial({ color: 0x831843, roughness: 0.8 }); // Maroon velvet
    const curtainL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.25), curtainMat);
    curtainL.position.set(-2.92, 1.8, -0.55);
    this.roomGroup.add(curtainL);

    const curtainR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.25), curtainMat);
    curtainR.position.set(-2.92, 1.8, 1.55);
    this.roomGroup.add(curtainR);

    // 4. Cluttered 1980s/1990s Posters on Walls
    this.initPosters();

    // 5. Furniture: Bookshelves, Dresser, Clutter, Lava Lamp, Boombox
    this.initRoomFurniture();

    // 6. Wooden Desk & Chair
    this.initDeskAndChair(woodMat);

    // 7. Commodore 64 "Breadbox", 1541 Disk Drive, Cables, & Old School TV
    this.initCommodore64AndTV();

    // 8. Desktop Clutter & 5¼" Floppy Disk
    this.initDeskClutter();

    // 9. Flash-Paper Title Flare Intro & Camera Overlay
    this.initFlashPaperIntro();
  }

  initFlashPaperIntro() {
    this.introVoidGroup = new THREE.Group();
    this.introVoidGroup.name = 'IntroVoidGroup';
    this.introVoidGroup.visible = false;
    this.scene.add(this.introVoidGroup);

    // 1. Flash-Paper Title Card
    const titleCanvas = document.createElement('canvas');
    titleCanvas.width = 1024;
    titleCanvas.height = 512;
    const tCtx = titleCanvas.getContext('2d');

    // Dark parchment vignette background
    const grad = tCtx.createRadialGradient(512, 256, 40, 512, 256, 460);
    grad.addColorStop(0, 'rgba(28, 25, 23, 0.96)');
    grad.addColorStop(0.75, 'rgba(15, 23, 42, 0.98)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 1.0)');
    tCtx.fillStyle = grad;
    tCtx.fillRect(0, 0, 1024, 512);

    // Golden Filigree Border
    tCtx.strokeStyle = '#f3cf65';
    tCtx.lineWidth = 8;
    tCtx.strokeRect(20, 20, 984, 472);
    tCtx.strokeStyle = '#d97706';
    tCtx.lineWidth = 3;
    tCtx.strokeRect(32, 32, 960, 448);

    // Corner Ornaments
    const drawFlourish = (cx, cy) => {
      tCtx.fillStyle = '#f59e0b';
      tCtx.beginPath();
      tCtx.arc(cx, cy, 14, 0, Math.PI * 2);
      tCtx.fill();
    };
    drawFlourish(44, 44);
    drawFlourish(980, 44);
    drawFlourish(44, 468);
    drawFlourish(980, 468);

    // Header
    tCtx.fillStyle = '#fbbf24';
    tCtx.font = 'bold 26px Georgia, serif';
    tCtx.textAlign = 'center';
    tCtx.fillText('★ LOUIS J. HAM PRESENTS ★', 512, 105);

    // Glowing Title: THE BARD\'S TALE
    tCtx.shadowColor = '#f59e0b';
    tCtx.shadowBlur = 32;
    tCtx.fillStyle = '#fef08a';
    tCtx.font = '900 68px Georgia, serif';
    tCtx.fillText("THE BARD\'S TALE", 512, 210);
    tCtx.shadowBlur = 0;

    // Subtitle
    tCtx.fillStyle = '#38bdf8';
    tCtx.font = 'bold 28px monospace';
    tCtx.fillText('TALES OF THE UNKNOWN • VOLUME I', 512, 275);

    // Fantasy Glyphs
    tCtx.fillStyle = '#c084fc';
    tCtx.font = '40px sans-serif';
    tCtx.fillText('⚔️   🍺   📜   🏰', 512, 350);

    // Footer Credits
    tCtx.fillStyle = '#94a3b8';
    tCtx.font = '20px monospace';
    tCtx.fillText('ELECTRONIC ARTS / INTERPLAY 1985 • VIRTUAL REALITY ADAPTATION', 512, 415);

    this.titleCardTex = new THREE.CanvasTexture(titleCanvas);
    this.titleCardMat = new THREE.MeshBasicMaterial({
      map: this.titleCardTex,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.titleCardMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 1.0),
      this.titleCardMat
    );
    this.titleCardMesh.position.set(0, 1.18, -1.8);
    this.titleCardMesh.visible = false;
    this.introVoidGroup.add(this.titleCardMesh);

    // 2. Fiery Flare Mesh (using VortexPortalShader)
    this.flareShaderMat = VortexPortalShader.createMaterial();
    this.flareMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      this.flareShaderMat
    );
    this.flareMesh.position.set(0, 1.18, -1.85);
    this.flareMesh.visible = false;
    this.introVoidGroup.add(this.flareMesh);
    this.portalMesh = this.flareMesh;
    this.portalShaderMat = this.flareShaderMat;

    // 3. Orbiting Spark Particles (flash paper embers burst)
    this.sparkParticles = VortexPortalShader.createParticleVortex(260);
    this.sparkParticles.position.set(0, 1.18, -1.8);
    this.sparkParticles.visible = false;
    this.introVoidGroup.add(this.sparkParticles);
    this.particleVortex = this.sparkParticles;

    // 4. Golden Flare Point Light
    this.flarePointLight = new THREE.PointLight(0xffb703, 0.0, 12);
    this.flarePointLight.position.set(0, 1.18, -1.5);
    this.introVoidGroup.add(this.flarePointLight);

    // 5. Camera-attached Screen Overlay for smooth VR/Desktop blackouts and fade-to-black transitions
    this.screenOverlay = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 2.0),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.0,
        depthTest: false,
        depthWrite: false
      })
    );
    this.screenOverlay.position.set(0, 0, -0.15);
    this.screenOverlay.renderOrder = 99999;
    this.screenOverlay.frustumCulled = false;
    this.camera.add(this.screenOverlay);
  }

  initPosters() {
    // Poster 1: The Bard's Tale (1985) on Back Wall (Scanned 1985 Michael Whelan box art)
    const bardsPosterTex = TextureGenerator.createVintagePosterTexture('BARDS_TALE');
    const bardsPosterMat = new THREE.MeshStandardMaterial({ map: bardsPosterTex, roughness: 0.45 });
    const bardsPoster = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.15), bardsPosterMat);
    bardsPoster.position.set(1.4, 1.8, -2.48);
    this.roomGroup.add(bardsPoster);

    // Poster 2: 1980s Vintage D&D Overland Map on Right Wall
    const dndMapTex = TextureGenerator.createVintagePosterTexture('DND_MAP');
    const dndMapMat = new THREE.MeshStandardMaterial({ map: dndMapTex, roughness: 0.45 });
    const dndMapPoster = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.15), dndMapMat);
    dndMapPoster.position.set(2.98, 1.8, -0.8);
    dndMapPoster.rotation.y = -Math.PI / 2;
    this.roomGroup.add(dndMapPoster);

    // Poster 3: Heavy Metal / Iron Lute 1985 Tour on Right Wall
    const metalTex = TextureGenerator.createVintagePosterTexture('HEAVY_METAL');
    const metalMat = new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.45 });
    const metalPoster = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.1), metalMat);
    metalPoster.position.set(2.98, 1.8, 1.2);
    metalPoster.rotation.y = -Math.PI / 2;
    this.roomGroup.add(metalPoster);

    // Poster 4: Frank Frazetta Dragonslayer Fantasy Poster on Left Wall
    const frazettaTex = TextureGenerator.createVintagePosterTexture('FRAZETTA');
    const frazettaMat = new THREE.MeshStandardMaterial({ map: frazettaTex, roughness: 0.45 });
    const frazettaPoster = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.1), frazettaMat);
    frazettaPoster.position.set(-2.98, 1.8, -1.8);
    frazettaPoster.rotation.y = Math.PI / 2;
    this.roomGroup.add(frazettaPoster);
  }

  initRoomFurniture() {
    const shelfWood = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });

    // 1. Tall Bookshelf on Left Wall
    const bookshelf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 1.3), shelfWood);
    bookshelf.position.set(-2.75, 1.1, -1.4);
    this.roomGroup.add(bookshelf);

    // Big Box PC/C64 Games on Bookshelf (Ultima, Wizardry, Wasteland, King's Quest)
    const gameColors = [0x991b1b, 0x1e3a8a, 0x065f46, 0x854d0e, 0x581c87, 0x1e293b];
    gameColors.forEach((color, i) => {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.22, 0.06),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4 })
      );
      box.position.set(-2.72, 1.5, -1.8 + i * 0.08);
      box.rotation.y = Math.PI / 2;
      this.roomGroup.add(box);
    });

    // Vintage Dual-Cassette Boombox on Bookshelf
    const boombox = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.16, 0.48),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.5 })
    );
    boombox.position.set(-2.72, 0.95, -1.4);
    this.roomGroup.add(boombox);

    // Cassette Tapes on Shelf
    for (let i = 0; i < 4; i++) {
      const tape = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.015, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x1e293b })
      );
      tape.position.set(-2.72, 0.88, -1.05 + i * 0.04);
      this.roomGroup.add(tape);
    }

    // 2. Wall Shelf above Desk (z = -2.35, y = 2.05)
    const deskShelf = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.28), shelfWood);
    deskShelf.position.set(0, 2.05, -2.35);
    this.roomGroup.add(deskShelf);

    // Floppy disk storage caddy box on shelf
    const diskStorageBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.16, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    diskStorageBox.position.set(-0.6, 2.16, -2.35);
    this.roomGroup.add(diskStorageBox);

    // Fantasy RPG Manuals (D&D Player's Handbook, Dungeon Master's Guide)
    const manualColors = [0x7f1d1d, 0x14532d, 0x1e3a8a, 0x78350f];
    manualColors.forEach((color, i) => {
      const manual = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.2, 0.16),
        new THREE.MeshStandardMaterial({ color })
      );
      manual.position.set(0.1 + i * 0.055, 2.18, -2.35);
      this.roomGroup.add(manual);
    });

    // 3. Dresser / Nightstand on Right Wall
    const dresser = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.9, 1.2), shelfWood);
    dresser.position.set(2.65, 0.45, 0.2);
    this.roomGroup.add(dresser);

    // Red LED Digital Alarm Clock ("11:42 PM") on Dresser
    const clockBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.08, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    clockBody.position.set(2.65, 0.94, 0.2);
    this.roomGroup.add(clockBody);

    const clockCanvas = document.createElement('canvas');
    clockCanvas.width = 128;
    clockCanvas.height = 64;
    const clkCtx = clockCanvas.getContext('2d');
    clkCtx.fillStyle = '#000000';
    clkCtx.fillRect(0, 0, 128, 64);
    clkCtx.fillStyle = '#ef4444';
    clkCtx.font = 'bold 26px monospace';
    clkCtx.textAlign = 'center';
    clkCtx.fillText("11:42", 64, 42);

    const clockFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.06),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(clockCanvas) })
    );
    clockFace.position.set(2.56, 0.94, 0.2);
    clockFace.rotation.y = -Math.PI / 2;
    this.roomGroup.add(clockFace);

    // 4. Glowing 1990s Lava Lamp on Dresser
    const lavaGroup = createLavaLamp();
    lavaGroup.position.set(2.65, 0.9, 0.55);

    this.lavaLampLight = new THREE.PointLight(0xf43f5e, 1.8, 3.0);
    this.lavaLampLight.position.set(0, 0.22, 0);
    lavaGroup.add(this.lavaLampLight);

    this.roomGroup.add(lavaGroup);
  }

  initDeskAndChair(woodMat) {
    // Cluttered Wooden Computer Desk (1.7m wide x 0.75m high x 0.95m deep)
    const deskGeo = new THREE.BoxGeometry(1.7, 0.75, 0.95);
    const desk = new THREE.Mesh(deskGeo, woodMat);
    desk.position.set(0, 0.375, -0.6);
    this.roomGroup.add(desk);

    // Desk Drawers & Brass Pulls
    const drawerMat = new THREE.MeshStandardMaterial({ color: 0x3e2312, roughness: 0.6 });
    for (let i = 0; i < 3; i++) {
      const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.02), drawerMat);
      drawer.position.set(0.6, 0.6 - i * 0.22, -0.12);
      this.roomGroup.add(drawer);

      const pull = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.12),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 })
      );
      pull.rotation.z = Math.PI / 2;
      pull.position.set(0.6, 0.6 - i * 0.22, -0.1);
      this.roomGroup.add(pull);
    }

    // Retro Brass / Green Banker's Desk Lamp
    const lampGroup = new THREE.Group();
    lampGroup.position.set(-0.65, 0.75, -0.5);

    const lampBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.3 })
    );
    lampGroup.add(lampBase);

    const lampPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.3 })
    );
    lampPole.position.set(0, 0.18, 0);
    lampGroup.add(lampPole);

    const lampShade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.12, 0.09, 16),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.3 }) // Emerald green shade
    );
    lampShade.position.set(0.05, 0.34, 0);
    lampShade.rotation.z = -Math.PI / 8;
    lampGroup.add(lampShade);

    const deskLampLight = new THREE.PointLight(0xffedd5, 3.2, 3.5);
    deskLampLight.position.set(0.05, 0.32, 0);
    lampGroup.add(deskLampLight);

    this.roomGroup.add(lampGroup);

    // 80s Swivel Desk Chair (Behind player / desk)
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, 0.4);

    const chairSeat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    chairSeat.position.y = 0.48;
    chairGroup.add(chairSeat);

    const chairBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.38, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    chairBack.position.set(0, 0.72, 0.2);
    chairGroup.add(chairBack);

    const chairStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
    );
    chairStem.position.y = 0.24;
    chairGroup.add(chairStem);

    this.roomGroup.add(chairGroup);
  }

  initCommodore64AndTV() {
    // 1. COMMODORE 64 "BREADBOX" CHASSIS
    const c64Group = createCommodore64();
    c64Group.position.set(-0.18, 0.75, -0.42);
    c64Group.rotation.y = Math.PI;
    this.roomGroup.add(c64Group);

    // 2. COMMODORE 1541 DISK DRIVE
    const driveGroup = createDiskDrive1541();
    driveGroup.position.set(0.36, 0.75, -0.5);

    this.driveLedLight = new THREE.PointLight(0xef4444, 0, 0.8);
    this.driveLedLight.position.set(0.08, 0.11, 0.195);
    driveGroup.add(this.driveLedLight);

    this.diskDriveMesh = driveGroup;
    this.roomGroup.add(driveGroup);

    // 3. BLACK SERIAL IEC CABLE & POWER CABLES
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

    // IEC Serial Cable running from C64 rear to 1541 Drive rear
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.1, 0.78, -0.53),
      new THREE.Vector3(0.1, 0.76, -0.62),
      new THREE.Vector3(0.36, 0.78, -0.68)
    ]);
    const iecCable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 16, 0.008, 8, false), cableMat);
    this.roomGroup.add(iecCable);

    // Video/RF Cable running from C64 to TV
    const rfCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.25, 0.78, -0.53),
      new THREE.Vector3(-0.35, 0.85, -0.65),
      new THREE.Vector3(-0.25, 1.1, -0.85)
    ]);
    const rfCable = new THREE.Mesh(new THREE.TubeGeometry(rfCurve, 16, 0.008, 8, false), cableMat);
    this.roomGroup.add(rfCable);

    // 4. OLD SCHOOL COMMODORE 1702 CRT MONITOR / TV SET
    const tvGroup = new THREE.Group();
    tvGroup.position.set(-0.22, 1.15, -0.68);

    // Woodgrain TV Cabinet Housing
    const woodgrainCanvas = document.createElement('canvas');
    woodgrainCanvas.width = 256;
    woodgrainCanvas.height = 256;
    const wCtx = woodgrainCanvas.getContext('2d');
    wCtx.fillStyle = '#451a03'; // Rich dark walnut
    wCtx.fillRect(0, 0, 256, 256);
    wCtx.strokeStyle = '#2e1002';
    wCtx.lineWidth = 4;
    for (let y = 0; y < 256; y += 16) {
      wCtx.beginPath();
      wCtx.moveTo(0, y + (Math.random() - 0.5) * 8);
      wCtx.bezierCurveTo(80, y, 180, y + (Math.random() - 0.5) * 12, 256, y);
      wCtx.stroke();
    }

    const tvCabinetMat = new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(woodgrainCanvas),
      roughness: 0.5
    });

    const tvBody = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.44, 0.44), tvCabinetMat);
    tvGroup.add(tvBody);

    // Dark screen bezel
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.34, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 })
    );
    bezel.position.set(-0.06, 0, 0.221);
    tvGroup.add(bezel);

    // CRT Screen Glass Frame with Authentic CRTMonitorShader (scanlines + phosphor glow + tube curvature)
    const crtCanvas = document.createElement('canvas');
    crtCanvas.width = 512;
    crtCanvas.height = 384;
    this.crtCanvasCtx = crtCanvas.getContext('2d');
    this.crtTexture = new THREE.CanvasTexture(crtCanvas);

    this.crtShaderMat = CRTMonitorShader.createMaterial(this.crtTexture);
    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.3),
      this.crtShaderMat
    );
    screenMesh.position.set(-0.06, 0, 0.232);
    // Keep a direct reference so setVRMode() can swap the material without
    // traversing the scene graph every VR session start/end.
    this.crtScreenMesh = screenMesh;
    tvGroup.add(screenMesh);

    // Right-Side TV Control Panel (VHF/UHF rotary dials, volume knob, speaker grille)
    const panelMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.34, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
    );
    panelMesh.position.set(0.19, 0, 0.221);
    tvGroup.add(panelMesh);

    // Rotary Channel Dials (VHF & UHF)
    for (let i = 0; i < 2; i++) {
      const dial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.02, 16),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 })
      );
      dial.rotation.x = Math.PI / 2;
      dial.position.set(0.19, 0.08 - i * 0.08, 0.233);
      tvGroup.add(dial);
    }

    // Power / Volume Knob
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.015, 12),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 })
    );
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.19, -0.06, 0.233);
    tvGroup.add(knob);

    // Speaker Grille (Horizontal Slats)
    for (let s = 0; s < 5; s++) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.005, 0.005),
        new THREE.MeshBasicMaterial({ color: 0x0f172a })
      );
      slat.position.set(0.19, -0.11 - s * 0.012, 0.233);
      tvGroup.add(slat);
    }

    // Telescoping Chrome "Rabbit Ear" Antenna on top of TV
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
    const antBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.03, 12), antennaMat);
    antBase.position.set(0, 0.235, 0);
    tvGroup.add(antBase);

    const antL = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.45), antennaMat);
    antL.position.set(-0.12, 0.42, 0);
    antL.rotation.z = Math.PI / 6;
    tvGroup.add(antL);

    const antR = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.45), antennaMat);
    antR.position.set(0.12, 0.42, 0);
    antR.rotation.z = -Math.PI / 6;
    tvGroup.add(antR);

    this.crtMonitorMesh = tvGroup;
    this.roomGroup.add(tvGroup);
    this.updateCRTScreen("**** COMMODORE 64 BASIC V2 ****\n\n 64K RAM SYSTEM  38911 BASIC BYTES FREE\n\nREADY.\n");
  }

  initDeskClutter() {
    // 1. Classic 8-Way Digital Joystick (Black base with red ball-top & fire buttons)
    const joyGroup = new THREE.Group();
    joyGroup.position.set(-0.52, 0.75, -0.32);

    const joyBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.04, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 })
    );
    joyBase.position.y = 0.02;
    joyGroup.add(joyBase);

    const joyShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
    );
    joyShaft.position.y = 0.08;
    joyGroup.add(joyShaft);

    const joyBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.2 })
    );
    joyBall.position.y = 0.13;
    joyGroup.add(joyBall);

    // Red fire button on base
    const fireBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.01, 12),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 })
    );
    fireBtn.position.set(0.035, 0.045, -0.035);
    joyGroup.add(fireBtn);

    this.roomGroup.add(joyGroup);

    // 2. Open "The Bard's Tale Clue Book" on Desk
    const bookCanvas = document.createElement('canvas');
    bookCanvas.width = 256;
    bookCanvas.height = 160;
    const bkCtx = bookCanvas.getContext('2d');
    bkCtx.fillStyle = '#fef3c7'; // Aged parchment paper
    bkCtx.fillRect(0, 0, 256, 160);
    bkCtx.strokeStyle = '#78350f';
    bkCtx.lineWidth = 3;
    bkCtx.strokeRect(6, 6, 244, 148);
    bkCtx.fillStyle = '#78350f';
    bkCtx.font = 'bold 14px Georgia, serif';
    bkCtx.fillText("SKARA BRAE MAP", 14, 28);
    bkCtx.font = '10px monospace';
    bkCtx.fillStyle = '#1e1b4b';
    bkCtx.fillText("Tavern -> Garth's -> Catacombs", 14, 48);
    bkCtx.fillText("Spell: Arc Fire (ARFI)", 14, 68);
    bkCtx.fillText("Beware of Mangar's Guards!", 14, 88);

    const clueBook = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.16),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bookCanvas) })
    );
    clueBook.rotation.x = -Math.PI / 2;
    clueBook.position.set(-0.46, 0.755, -0.56);
    this.roomGroup.add(clueBook);

    // 3. Vintage Aluminum Soda Can (Jolt Cola / Surge)
    const canGroup = new THREE.Group();
    canGroup.position.set(0.62, 0.75, -0.35);

    const canBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.11, 16),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.3 })
    );
    canBody.position.y = 0.055;
    canGroup.add(canBody);

    const canRim = new THREE.Mesh(
      new THREE.RingGeometry(0.02, 0.032, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95 })
    );
    canRim.rotation.x = -Math.PI / 2;
    canRim.position.y = 0.111;
    canGroup.add(canRim);
    this.roomGroup.add(canGroup);

    // 4. Ceramic Pencil Mug with Pencils
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.035, 0.09, 16),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
    );
    mug.position.set(-0.62, 0.795, -0.68);
    this.roomGroup.add(mug);

    // 5. 5¼ Inch Floppy Disk labeled "The Bard's Tale VR" (Positioned in front of 1541 drive)
    const diskGroup = new THREE.Group();
    diskGroup.position.set(0.14, 0.77, -0.38);

    // Enlarged invisible grab / raycast collider to ensure generous target acquisition in VR from any angle
    const grabCollider = new THREE.Mesh(
      new THREE.BoxGeometry(0.30, 0.15, 0.30),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    grabCollider.name = 'grabCollider';
    grabCollider.userData = { isFloppyDisk: true };
    diskGroup.add(grabCollider);

    const diskCover = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.008, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 })
    );
    diskCover.userData = { isFloppyDisk: true };
    diskGroup.add(diskCover);

    const hubRing = new THREE.Mesh(
      new THREE.RingGeometry(0.015, 0.025, 16),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, side: THREE.DoubleSide, metalness: 0.6 })
    );
    hubRing.rotation.x = -Math.PI / 2;
    hubRing.position.set(0, 0.005, 0);
    hubRing.userData = { isFloppyDisk: true };
    diskGroup.add(hubRing);

    const windowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.02, 0.045),
      new THREE.MeshBasicMaterial({ color: 0x334155 })
    );
    windowMesh.rotation.x = -Math.PI / 2;
    windowMesh.position.set(0, 0.005, 0.035);
    windowMesh.userData = { isFloppyDisk: true };
    diskGroup.add(windowMesh);

    const notchTab = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.009, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 })
    );
    notchTab.position.set(0.08, 0, -0.04);
    notchTab.userData = { isFloppyDisk: true };
    diskGroup.add(notchTab);

    // Label
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 160;
    const lCtx = labelCanvas.getContext('2d');
    lCtx.fillStyle = '#ffffff';
    lCtx.fillRect(0, 0, 512, 160);
    lCtx.fillStyle = '#dc2626';
    lCtx.fillRect(0, 0, 512, 24);
    lCtx.fillStyle = '#2563eb';
    lCtx.fillRect(0, 24, 512, 8);
    lCtx.fillStyle = '#1e1b4b';
    lCtx.font = 'bold 36px monospace';
    lCtx.fillText("THE BARD'S TALE VR", 24, 80);
    lCtx.fillStyle = '#475569';
    lCtx.font = 'bold 22px monospace';
    lCtx.fillText("ELECTRONIC ARTS • SIDE A", 24, 118);
    lCtx.fillStyle = '#16a34a';
    lCtx.font = 'bold 18px monospace';
    lCtx.fillText("LOAD \"Louis F Ham presents\",8,1", 24, 144);

    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.05),
      new THREE.MeshBasicMaterial({ map: labelTex })
    );
    labelMesh.position.set(0, 0.0055, -0.045);
    labelMesh.rotation.x = -Math.PI / 2;
    labelMesh.userData = { isFloppyDisk: true };
    diskGroup.add(labelMesh);

    // Golden Pulsing Beacon Ring
    const beaconRing = new THREE.Mesh(
      new THREE.RingGeometry(0.09, 0.105, 32),
      new THREE.MeshBasicMaterial({ color: 0xf3cf65, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    beaconRing.rotation.x = -Math.PI / 2;
    beaconRing.position.set(0, 0.015, 0);
    beaconRing.name = 'beaconRing';
    beaconRing.userData = { isFloppyDisk: true };
    diskGroup.add(beaconRing);

    // Floating 3D Badge: "💾 The Bard's Tale VR Disk [A]"
    const diskPromptCanvas = document.createElement('canvas');
    diskPromptCanvas.width = 380;
    diskPromptCanvas.height = 70;
    const dpCtx = diskPromptCanvas.getContext('2d');
    dpCtx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    dpCtx.strokeStyle = '#f3cf65';
    dpCtx.lineWidth = 4;
    dpCtx.beginPath();
    dpCtx.roundRect(4, 4, 372, 62, 10);
    dpCtx.fill();
    dpCtx.stroke();
    dpCtx.fillStyle = '#f3cf65';
    dpCtx.font = 'bold 20px Georgia, serif';
    dpCtx.textAlign = 'center';
    dpCtx.fillText("💾 The Bard's Tale VR Disk [A]", 190, 42);

    const diskPromptTex = new THREE.CanvasTexture(diskPromptCanvas);
    const diskPromptMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.06),
      new THREE.MeshBasicMaterial({ map: diskPromptTex, transparent: true })
    );
    diskPromptMesh.position.set(0, 0.12, 0);
    diskPromptMesh.name = 'diskPromptMesh';
    diskPromptMesh.userData = { isFloppyDisk: true };
    diskGroup.add(diskPromptMesh);

    diskGroup.userData = { isFloppyDisk: true };
    this.floppyDiskMesh = diskGroup;
    this.roomGroup.add(diskGroup);
    this.interactableObjects.push(grabCollider, diskCover, labelMesh, diskPromptMesh, diskGroup);
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

  renderTitleScreen() {
    if (!this.crtCanvasCtx || !this.crtTexture) return;
    const ctx = this.crtCanvasCtx;

    // C64 Multi-Color Border
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, 512, 384);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(24, 24, 464, 336);

    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 32px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText("THE BARD'S TALE", 256, 110);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px monospace';
    ctx.fillText("TALES OF THE UNKNOWN • VOLUME I", 256, 150);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '16px monospace';
    ctx.fillText("ELECTRONIC ARTS / INTERPLAY 1985", 256, 190);

    ctx.fillStyle = '#a855f7';
    ctx.font = '42px sans-serif';
    ctx.fillText("⚔️ 🍺 📜 🏰", 256, 260);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 18px monospace';
    ctx.fillText("▶ ENTERING SKARA BRAE TAVERN...", 256, 320);

    this.crtTexture.needsUpdate = true;
  }

  startCinematicSequence(onComplete = null) {
    this.triggerCinematicIntro(onComplete || this.onHeadInMonitor);
  }

  /**
   * Multi-phase automated cinematic intro sequence (zero player interaction).
   * Stationary camera — no auto-walk or barrel roll (WebXR motion-sickness safe).
   *
   * Phase 1  FADE_IN        (1500ms)  Black → reveal 1980s bedroom, C64 desk in front
   * Phase 2  DISK_INSERT     (800ms)  Floppy disk auto-slides into 1541 drive
   * Phase 3  BOOT_SEQUENCE  (3500ms)  CRT blinks on, types C64 BASIC boot + LOAD command
   * Phase 4  FADE_TO_BLACK   (800ms)  Screen fades to solid black
   * Phase 5  TITLE_CARD     (2800ms)  Title card ignites with vortex flash-paper flare
   * Phase 6  TRANSITION               onCompleteCallback() → Tavern
   */
  triggerCinematicIntro(onCompleteCallback) {
    this.reset();
    this.isFlashPaperActive = true;
    this.cinematicPhase = 'FADE_IN';
    this.onCinematicComplete = onCompleteCallback || this.onHeadInMonitor;

    // Stamp a new generation so any in-flight RAF loop from a previous call
    // detects the mismatch on its next tick and exits cleanly.
    const myGeneration = ++this._cinematicGeneration;

    // 1. Position player stationary at desk with elevated view (raised ~2ft to 1.79m) angled down at C64
    if (this.xrRig) {
      this.xrRig.setPosition(0, 0, 0.15);
      this.xrRig.setYRotation(0);
    }
    this.camera.position.set(0, 1.79, 0);
    this.camera.rotation.set(-0.20, 0, 0);

    // Show the bedroom — player sees the full 3D retro room
    this.roomGroup.visible = true;
    if (this.introVoidGroup) {
      this.introVoidGroup.visible = false;
    }

    // Start fully black — we will fade in
    if (this.screenOverlay) {
      this.screenOverlay.material.opacity = 1.0;
    }

    // Ensure CRT starts ON with BASIC prompt active
    this.updateCRTScreen("**** COMMODORE 64 BASIC V2 ****\n\n 64K RAM SYSTEM  38911 BASIC BYTES FREE\n\nREADY.\n");

    // Hide the interactive beacon/prompt on the floppy disk (not needed for cinematic)
    if (this.floppyDiskMesh) {
      const beacon = this.floppyDiskMesh.getObjectByName('beaconRing');
      if (beacon) beacon.visible = false;
      const prompt = this.floppyDiskMesh.getObjectByName('diskPromptMesh');
      if (prompt) prompt.visible = false;
    }

    // ── Phase timing constants (ms) ──
    const FADE_IN_DUR     = 1500;
    const DISK_PAUSE      = 400;   // brief pause after fade-in before disk moves
    const DISK_INSERT_DUR = 800;
    const BOOT_DELAY      = 300;   // pause after disk insert before CRT blinks on
    const BOOT_DUR        = 3500;
    const TITLE_DUR       = 2800;  // title card display duration on CRT monitor
    const FADE_OUT_DUR    = 800;

    const globalStart = performance.now();

    // ── Boot text lines typed incrementally on the CRT ──
    const bootLines = [
      '',
      '    **** COMMODORE 64 BASIC V2 ****',
      '',
      ' 64K RAM SYSTEM  38911 BASIC BYTES FREE',
      '',
      'READY.',
      'LOAD "Louis F Ham presents",8,1',
      '',
      'SEARCHING FOR Louis F Ham presents',
      'LOADING',
      'READY.',
      'RUN',
    ];

    // Pre-compute cumulative phase boundaries
    const tFadeEnd     = FADE_IN_DUR;
    const tDiskStart   = tFadeEnd + DISK_PAUSE;
    const tDiskEnd     = tDiskStart + DISK_INSERT_DUR;
    const tBootStart   = tDiskEnd + BOOT_DELAY;
    const tBootEnd     = tBootStart + BOOT_DUR;
    const tTitleEnd    = tBootEnd + TITLE_DUR;
    const tFadeOutEnd  = tTitleEnd + FADE_OUT_DUR;

    // Disk insert positions
    const diskStartPos = this.floppyDiskMesh
      ? this.floppyDiskMesh.position.clone()
      : null;
    const driveSlotFront = new THREE.Vector3(0.36, 0.84, -0.30);
    const driveSlotInserted = new THREE.Vector3(0.36, 0.82, -0.50);

    const animateCinematic = (now) => {
      // Exit immediately if a newer cinematic was started or cleared
      if (this._cinematicGeneration !== myGeneration || !this.isFlashPaperActive) return;

      const elapsed = now - globalStart;

      // ═══════════════════════════════════════════════════════════
      // Phase 1: FADE IN from black to reveal the 3D 1980s bedroom
      // ═══════════════════════════════════════════════════════════
      if (elapsed < tFadeEnd) {
        this.cinematicPhase = 'FADE_IN';
        const p = elapsed / FADE_IN_DUR;
        if (this.screenOverlay) {
          this.screenOverlay.material.opacity = Math.max(0.0, 1.0 - p);
        }
        requestAnimationFrame(animateCinematic);
        return;
      }

      if (this.screenOverlay && this.cinematicPhase === 'FADE_IN') {
        this.screenOverlay.material.opacity = 0.0;
      }

      // ═══════════════════════════════════════════════════════════
      // Phase 2: DISK INSERT — floppy auto-slides into 1541 drive
      // ═══════════════════════════════════════════════════════════
      if (elapsed < tDiskEnd) {
        this.cinematicPhase = 'DISK_INSERT';

        if (elapsed >= tDiskStart && this.floppyDiskMesh && diskStartPos) {
          const diskProgress = Math.min(1.0, (elapsed - tDiskStart) / DISK_INSERT_DUR);
          const ease = 1 - Math.pow(1 - diskProgress, 3);

          if (ease < 0.5) {
            const p1 = ease / 0.5;
            this.floppyDiskMesh.position.lerpVectors(diskStartPos, driveSlotFront, p1);
          } else {
            const p2 = (ease - 0.5) / 0.5;
            this.floppyDiskMesh.position.lerpVectors(driveSlotFront, driveSlotInserted, p2);
          }
        }
        requestAnimationFrame(animateCinematic);
        return;
      }

      if (this.cinematicPhase === 'DISK_INSERT') {
        if (this.floppyDiskMesh) {
          this.floppyDiskMesh.position.copy(driveSlotInserted);
        }
        this.isDiskInserted = true;
        this.isBooting = true;
        if (this.driveLedLight) this.driveLedLight.intensity = 2.0;
      }

      // ═══════════════════════════════════════════════════════════
      // Phase 3: BOOT SEQUENCE — CRT types BASIC load & run commands
      // ═══════════════════════════════════════════════════════════
      if (elapsed < tBootEnd) {
        this.cinematicPhase = 'BOOT_SEQUENCE';
        const bootElapsed = elapsed - tBootStart;
        const bootProgress = Math.min(1.0, bootElapsed / BOOT_DUR);

        if (bootElapsed < 120) {
          const blinkPhase = bootElapsed / 120;
          if (blinkPhase < 0.3) {
            this._renderCRTOff();
          } else if (blinkPhase < 0.5) {
            this._renderCRTStatic();
          } else {
            this._renderCRTBootText(bootLines, bootProgress);
          }
        } else {
          this._renderCRTBootText(bootLines, bootProgress);
        }

        requestAnimationFrame(animateCinematic);
        return;
      }

      if (this.cinematicPhase === 'BOOT_SEQUENCE') {
        this.renderTitleScreen();
        this.isBooting = false;
        this.isBootComplete = true;
        if (this.driveLedLight) this.driveLedLight.intensity = 0.0;
      }

      // ═══════════════════════════════════════════════════════════
      // Phase 4: TITLE SCREEN — Display C64 Game Title Card on CRT
      // ═══════════════════════════════════════════════════════════
      if (elapsed < tTitleEnd) {
        this.cinematicPhase = 'TITLE_CARD';
        this.renderTitleScreen();
        requestAnimationFrame(animateCinematic);
        return;
      }

      // ═══════════════════════════════════════════════════════════
      // Phase 5: FADE TO BLACK — Smooth scene transition fade
      // ═══════════════════════════════════════════════════════════
      if (elapsed < tFadeOutEnd) {
        this.cinematicPhase = 'FADE_TO_BLACK';
        const fadeP = (elapsed - tTitleEnd) / FADE_OUT_DUR;
        if (this.screenOverlay) {
          this.screenOverlay.material.opacity = Math.min(1.0, fadeP);
        }
        requestAnimationFrame(animateCinematic);
        return;
      }

      // ═══════════════════════════════════════════════════════════
      // Phase 6: TRANSITION — Complete intro & enter Tavern
      // ═══════════════════════════════════════════════════════════
      this.cinematicPhase = 'COMPLETE';
      if (this.screenOverlay) {
        this.screenOverlay.material.opacity = 1.0;
      }
      this.isFlashPaperActive = false;
      if (onCompleteCallback) {
        onCompleteCallback();
      }
    };

    requestAnimationFrame(animateCinematic);
  }

  /**
   * Render the CRT screen as powered off (dark charcoal).
   */
  _renderCRTOff() {
    if (!this.crtCanvasCtx || !this.crtTexture) return;
    const ctx = this.crtCanvasCtx;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 512, 384);
    this.crtTexture.needsUpdate = true;
  }

  /**
   * Render a brief CRT static / snow burst (simulates tube warming up).
   */
  _renderCRTStatic() {
    if (!this.crtCanvasCtx || !this.crtTexture) return;
    const ctx = this.crtCanvasCtx;
    const imageData = ctx.createImageData(512, 384);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 100;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v + Math.random() * 60;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    this.crtTexture.needsUpdate = true;
  }

  /**
   * Render the C64 BASIC boot text on the CRT, progressively revealing
   * characters based on progress (0.0 → 1.0).
   */
  _renderCRTBootText(bootLines, progress) {
    if (!this.crtCanvasCtx || !this.crtTexture) return;
    const ctx = this.crtCanvasCtx;

    // C64 classic blue screen
    ctx.fillStyle = '#3730a3';
    ctx.fillRect(0, 0, 512, 384);

    ctx.fillStyle = '#a5b4fc';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';

    // Count total characters across all lines
    let totalChars = 0;
    for (let i = 0; i < bootLines.length; i++) {
      totalChars += bootLines[i].length + 1; // +1 for newline
    }

    const charsToShow = Math.floor(progress * totalChars);
    let charCount = 0;

    for (let i = 0; i < bootLines.length; i++) {
      const line = bootLines[i];
      const lineStart = charCount;
      const lineEnd = charCount + line.length;

      if (lineStart >= charsToShow) break;

      const visibleChars = Math.min(line.length, charsToShow - lineStart);
      const visibleText = line.substring(0, visibleChars);

      // Use green color for the LOAD/RUN command lines
      if (line.startsWith('LOAD') || line.startsWith('RUN')) {
        ctx.fillStyle = '#4ade80';
      } else if (line.startsWith('SEARCHING') || line.startsWith('LOADING')) {
        ctx.fillStyle = '#fbbf24';
      } else {
        ctx.fillStyle = '#a5b4fc';
      }

      ctx.fillText(visibleText, 16, 32 + i * 24);

      // Draw blinking cursor at end of current typing line
      if (charsToShow > lineStart && charsToShow <= lineEnd + 1) {
        const cursorX = 16 + ctx.measureText(visibleText).width;
        const cursorY = 32 + i * 24;
        // Blink at ~3Hz
        if (Math.floor(performance.now() / 333) % 2 === 0) {
          ctx.fillStyle = '#a5b4fc';
          ctx.fillRect(cursorX, cursorY - 14, 10, 18);
        }
      }

      charCount = lineEnd + 1;
    }

    this.crtTexture.needsUpdate = true;
  }

  skipCinematic() {
    this.isFlashPaperActive = false;
    this.cinematicPhase = 'COMPLETE';
    this.roomGroup.visible = false;
    if (this.introVoidGroup) this.introVoidGroup.visible = false;
    if (this.screenOverlay) this.screenOverlay.material.opacity = 1.0;
    if (this.onCinematicComplete) {
      this.onCinematicComplete();
    } else if (this.onHeadInMonitor) {
      this.onHeadInMonitor();
    }
  }

  insertFloppyDisk(onInsertedCallback = null) {
    if (this.isDiskInserted) return;
    this.isDiskInserted = true;

    // Hide beacon ring & 3D prompt
    const beacon = this.floppyDiskMesh?.getObjectByName('beaconRing');
    if (beacon) beacon.visible = false;
    const prompt = this.floppyDiskMesh?.getObjectByName('diskPromptMesh');
    if (prompt) prompt.visible = false;

    // Animate floppy disk flying from desk into 1541 drive slot over 550ms
    if (!this.floppyDiskMesh) {
      if (onInsertedCallback) onInsertedCallback();
      return;
    }
    const startPos = this.floppyDiskMesh.position.clone();
    const driveSlotFront = new THREE.Vector3(0.36, 0.84, -0.30);
    const driveSlotInserted = new THREE.Vector3(0.36, 0.82, -0.50);

    const startTime = performance.now();
    const duration = 550; // ms

    const animateDisk = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      if (ease < 0.5) {
        const p1 = ease / 0.5;
        this.floppyDiskMesh.position.lerpVectors(startPos, driveSlotFront, p1);
      } else {
        const p2 = (ease - 0.5) / 0.5;
        this.floppyDiskMesh.position.lerpVectors(driveSlotFront, driveSlotInserted, p2);
      }

      if (progress < 1.0) {
        requestAnimationFrame(animateDisk);
      } else {
        this.floppyDiskMesh.position.copy(driveSlotInserted);
        if (onInsertedCallback) onInsertedCallback();
      }
    };
    requestAnimationFrame(animateDisk);

    // Turn on red drive activity LED & mark booting
    if (this.driveLedLight) this.driveLedLight.intensity = 2.0;
    this.isBooting = true;
  }

  update(time, deltaTime = 0.016) {
    if (!this.roomGroup.visible && !this.isFlashPaperActive) return;

    // 0. Update CRT Monitor Shader Uniforms
    // Skip in VR mode — the screen uses MeshBasicMaterial which has no uniforms.
    if (!this._isVRMode && this.crtShaderMat && this.crtShaderMat.uniforms && this.crtShaderMat.uniforms.uTime) {
      this.crtShaderMat.uniforms.uTime.value = time;
    }

    // Pulse beacon ring & face prompt towards camera
    if (!this.isDiskInserted && this.floppyDiskMesh && this.roomGroup.visible) {
      const beacon = this.floppyDiskMesh.getObjectByName('beaconRing');
      if (beacon) {
        const s = 1.0 + Math.sin(time * 4) * 0.12;
        beacon.scale.set(s, s, s);
      }
      const prompt = this.floppyDiskMesh.getObjectByName('diskPromptMesh');
      if (prompt) {
        prompt.lookAt(this.camera.position);
      }
    }

    // Animate Lava Lamp gentle pulse
    if (this.lavaLampLight && this.roomGroup.visible) {
      this.lavaLampLight.intensity = 1.8 + Math.sin(time * 2.5) * 0.35;
    }

    // LED Flicker effect during drive read
    if (this.isBooting && !this.isBootComplete && this.driveLedLight && this.roomGroup.visible) {
      this.driveLedLight.intensity = Math.random() > 0.3 ? 2.5 : 0.2;
    }
  }

  fadeInFromBlack(duration = 500, onComplete = null) {
    if (!this.screenOverlay) {
      if (onComplete) onComplete();
      return;
    }
    // Cancel any in-flight fade loop (fade-in or fade-out) before starting a new one.
    const myGeneration = ++this._fadeGeneration;
    this.isFadingIn = true;
    this.screenOverlay.material.opacity = 1.0;
    const startTime = performance.now();
    const animateFade = (now) => {
      if (this._fadeGeneration !== myGeneration) return; // superseded — exit silently
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      this.screenOverlay.material.opacity = Math.max(0.0, 1.0 - progress);
      if (progress < 1.0) {
        requestAnimationFrame(animateFade);
      } else {
        this.screenOverlay.material.opacity = 0.0;
        this.isFadingIn = false;
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(animateFade);
  }

  fadeOutToBlack(duration = 500, onComplete = null) {
    if (!this.screenOverlay) {
      if (onComplete) onComplete();
      return;
    }
    // Cancel any in-flight fade loop (fade-in or fade-out) before starting a new one.
    const myGeneration = ++this._fadeGeneration;
    this.screenOverlay.material.opacity = 0.0;
    const startTime = performance.now();
    const animateFade = (now) => {
      if (this._fadeGeneration !== myGeneration) return; // superseded — exit silently
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      this.screenOverlay.material.opacity = Math.min(1.0, progress);
      if (progress < 1.0) {
        requestAnimationFrame(animateFade);
      } else {
        this.screenOverlay.material.opacity = 1.0;
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(animateFade);
  }

  reset() {
    this.isDiskInserted = false;
    this.isBooting = false;
    this.isBootComplete = false;
    this.cinematicPhase = 'IDLE';
    this.cinematicTime = 0.0;
    this.isFlashPaperActive = false;
    this.isFadingIn = false;
    this.camera.rotation.z = 0;

    this.roomGroup.visible = true;
    if (this.introVoidGroup) {
      this.introVoidGroup.visible = false;
    }

    if (this.flareMesh) {
      this.flareMesh.visible = false;
    }
    if (this.sparkParticles) {
      this.sparkParticles.visible = false;
    }
    if (this.titleCardMesh) {
      this.titleCardMesh.visible = false;
    }

    if (this.portalMesh) {
      this.portalMesh.visible = false;
      this.portalMesh.scale.set(1.0, 1.0, 1.0);
      if (this.portalShaderMat && this.portalShaderMat.uniforms && this.portalShaderMat.uniforms.uProgress) {
        this.portalShaderMat.uniforms.uProgress.value = 0.0;
      }
    }

    if (this.particleVortex) {
      this.particleVortex.visible = false;
    }

    if (this.screenOverlay) {
      this.screenOverlay.material.opacity = 0.0;
    }

    if (this.floppyDiskMesh) {
      this.floppyDiskMesh.position.set(0.14, 0.77, -0.38);
      this.floppyDiskMesh.rotation.set(0, 0, 0);
      const beacon = this.floppyDiskMesh.getObjectByName('beaconRing');
      if (beacon) beacon.visible = true;
      const prompt = this.floppyDiskMesh.getObjectByName('diskPromptMesh');
      if (prompt) prompt.visible = true;
    }

    if (this.driveLedLight) {
      this.driveLedLight.intensity = 0;
    }

    this.updateCRTScreen("**** COMMODORE 64 BASIC V2 ****\n\n 64K RAM SYSTEM  38911 BASIC BYTES FREE\n\nREADY.\n");
  }

  setVisible(visible) {
    this.roomGroup.visible = visible;
    if (!visible && this.introVoidGroup) {
      this.introVoidGroup.visible = false;
    }
    if (!visible && this.screenOverlay) {
      this.screenOverlay.material.opacity = 0.0;
    }
  }

  /**
   * Switch the CRT screen material for VR / non-VR rendering.
   *
   * WebXR stereo mode renders every mesh **twice per frame** (once per eye),
   * doubling the fragment-shader cost.  The full CRT ShaderMaterial includes
   * barrel distortion, 3× chromatic-aberration samples, sin(), pow(), and
   * distance() — too expensive at 90 Hz on standalone Quest hardware.
   *
   * When `isVR` is true, the screen mesh is swapped to a `MeshBasicMaterial`
   * backed by the same canvas texture.  The canvas already holds the current
   * C64 screen content (BASIC boot, title screen, etc.) so visual fidelity of
   * the screen content is fully preserved — only the post-process effects
   * (scanlines, barrel curve, phosphor bloom) are suppressed inside the headset.
   *
   * The full shader is automatically restored when `isVR` becomes false
   * (headset removed / browser tab regains focus).
   *
   * Called by XRManager on XR session start/end:
   *   renderer.xr.addEventListener('sessionstart', () => retroRoom.setVRMode(true));
   *   renderer.xr.addEventListener('sessionend',   () => retroRoom.setVRMode(false));
   *
   * @param {boolean} isVR
   */
  setVRMode(isVR) {
    if (this._isVRMode === isVR) return; // No-op if already in the right state
    this._isVRMode = isVR;

    if (!this.crtScreenMesh || !this.crtTexture) return;

    if (isVR) {
      // Swap to the lightweight MeshBasicMaterial — single texture lookup, zero math.
      if (!this._crtVRMat) {
        // Lazily create once and reuse; shares the live canvas texture reference.
        this._crtVRMat = CRTMonitorShader.createVRFallbackMaterial(this.crtTexture);
      }
      this.crtScreenMesh.material = this._crtVRMat;
    } else {
      // Restore the full CRT ShaderMaterial for Desktop rendering.
      this.crtScreenMesh.material = this.crtShaderMat;
    }
  }
}

