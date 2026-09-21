import * as THREE from 'three';
import {
  SKARA_BRAE_GRID,
  MAP_WIDTH,
  MAP_HEIGHT,
  CELL_SIZE_METERS,
  getCell,
  sourceToWorld,
  worldToSource,
  LandmarkId,
  TerrainType
} from '../../data/SkaraBraeMapData.js';
import { TextureGenerator } from '../../textures/TextureGenerator.js';
import { AnimatedSpriteManager } from '../../textures/AnimatedSprite.js';
import { getLocationSpritePath } from '../../data/GameLocationSpriteManifest.js';

/**
 * SkaraBraeStreetScene - Authentic 3D City of Skara Brae
 *
 * Implements the full 30x30 canonical city grid with:
 * - Authentic C64 building & landmark facade tiles on all faces
 * - Rough cobblestone ground matching original artwork
 * - Day / Night sky dome with celestial stars, moon, and sunlight
 * - Dynamic Day/Night lighting and atmospheric fog
 * - Interactive landmark storefronts (Garth's Shop, Tavern, Guild, Review Board)
 */
export class SkaraBraeStreetScene {
  constructor(scene, camera, onEnterGarthShop, onEnterTavern, onEnterGuild, onEnterReviewBoard, onEnterTemple, onEnterRoscoe) {
    this.scene = scene;
    this.camera = camera;
    this.onEnterGarthShop = onEnterGarthShop;
    this.onEnterTavern = onEnterTavern;
    this.onEnterGuild = onEnterGuild;
    this.onEnterReviewBoard = onEnterReviewBoard;
    this.onEnterTemple = onEnterTemple;
    this.onEnterRoscoe = onEnterRoscoe;

    this.spriteManager = new AnimatedSpriteManager();
    this.animatedUpdaters = [];

    this.sceneGroup = new THREE.Group();
    this.sceneGroup.name = 'SkaraBraeStreetScene';
    this.sceneGroup.visible = false;

    this.interactableObjects = [];
    this.torches = [];
    this.disposables = [];
    this.billboardObjects = [];

    this.dayNightMode = 'day'; // 'day' | 'dusk' | 'night' | 'dawn'
    this.facadeMaterialCache = new Map();

    this.debugGroup = new THREE.Group();
    this.debugGroup.name = 'DebugGrid';
    this.debugGroup.visible = false;
    this.sceneGroup.add(this.debugGroup);

    this.initSkyAndAtmosphere();
    this.initCityGrid();
    this.initGarthStorefront();
    this.initTavernStorefront();
    this.initGuildStorefront();
    this.initReviewBoardStorefront();
    this.initTempleStorefront();
    this.initTarjanStorefront();
    this.initRoscoeStorefront();
    this.initStatuesAndMonuments();
    this.initDebugGrid();

    if (this.scene) {
      this.scene.add(this.sceneGroup);
    }
  }

  initSkyAndAtmosphere() {
    // 1. Celestial Sky Domes
    this.starSkyTex = TextureGenerator.createStarfieldSkyTexture();
    this.daySkyTex = TextureGenerator.createDaySkyTexture();
    this.duskSkyTex = TextureGenerator.createDuskSkyTexture();
    this.dawnSkyTex = TextureGenerator.createDawnSkyTexture();
    this.disposables.push(this.starSkyTex, this.daySkyTex, this.duskSkyTex, this.dawnSkyTex);

    const skyGeo = new THREE.SphereGeometry(130, 32, 16);
    this.skyMat = new THREE.MeshBasicMaterial({
      map: this.daySkyTex,
      side: THREE.BackSide
    });
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMat);
    this.skyMesh.position.set(0, 0, 0);
    this.sceneGroup.add(this.skyMesh);
    this.disposables.push(skyGeo, this.skyMat);

    // 2. Ambient & Directional Lighting
    this.ambientLight = new THREE.AmbientLight(0xffedd5, 1.25);
    this.sceneGroup.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xfef08a, 1.35);
    this.directionalLight.position.set(40, 60, 30);
    this.sceneGroup.add(this.directionalLight);

    // 3. Set Initial Atmosphere
    this.setDayNightMode('day');
  }

  setDayNightMode(mode = 'day') {
    this.dayNightMode = mode;

    if (mode === 'day') {
      if (this.skyMat) this.skyMat.map = this.daySkyTex;
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0xffedd5);
        this.ambientLight.intensity = 1.25;
      }
      if (this.directionalLight) {
        this.directionalLight.color.setHex(0xfef08a);
        this.directionalLight.intensity = 1.35;
        this.directionalLight.position.set(40, 60, 30);
      }
      if (this.scene) {
        this.scene.fog = new THREE.FogExp2(0xbbe8f8, 0.012);
      }
      this.torches.forEach(t => t.baseIntensity = 0.8);
    } else if (mode === 'dusk') {
      if (this.skyMat) this.skyMat.map = this.duskSkyTex;
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0xf59e0b);
        this.ambientLight.intensity = 0.95;
      }
      if (this.directionalLight) {
        this.directionalLight.color.setHex(0xea580c);
        this.directionalLight.intensity = 1.1;
        this.directionalLight.position.set(20, 25, 40);
      }
      if (this.scene) {
        this.scene.fog = new THREE.FogExp2(0x7c2d12, 0.022);
      }
      this.torches.forEach(t => t.baseIntensity = 2.2);
    } else if (mode === 'dawn') {
      if (this.skyMat) this.skyMat.map = this.dawnSkyTex;
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0xfef08a);
        this.ambientLight.intensity = 1.1;
      }
      if (this.directionalLight) {
        this.directionalLight.color.setHex(0xfde047);
        this.directionalLight.intensity = 1.2;
        this.directionalLight.position.set(40, 25, -30);
      }
      if (this.scene) {
        this.scene.fog = new THREE.FogExp2(0xbae6fd, 0.015);
      }
      this.torches.forEach(t => t.baseIntensity = 1.2);
    } else {
      // Night Mode
      if (this.skyMat) this.skyMat.map = this.starSkyTex;
      if (this.ambientLight) {
        this.ambientLight.color.setHex(0x0f172a);
        this.ambientLight.intensity = 0.6;
      }
      if (this.directionalLight) {
        this.directionalLight.color.setHex(0x38bdf8);
        this.directionalLight.intensity = 0.5;
        this.directionalLight.position.set(20, 40, -10);
      }
      if (this.scene) {
        this.scene.fog = new THREE.FogExp2(0x090d16, 0.032);
      }
      this.torches.forEach(t => t.baseIntensity = 2.8);
    }
  }

  toggleDayNight() {
    const sequence = ['day', 'dusk', 'night', 'dawn'];
    const nextIdx = (sequence.indexOf(this.dayNightMode) + 1) % sequence.length;
    this.setDayNightMode(sequence[nextIdx]);
  }

  getFacadeMaterial(facadeType) {
    if (!this.facadeMaterialCache.has(facadeType)) {
      const tex = TextureGenerator.createC64BuildingFacadeTexture(facadeType);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.75
      });
      this.facadeMaterialCache.set(facadeType, mat);
      this.disposables.push(tex, mat);
    }
    return this.facadeMaterialCache.get(facadeType);
  }

  getLandmarkFacadeType(landmarkId) {
    switch (landmarkId) {
      case LandmarkId.GARTHS_SHOP:
        return 'GARTH_SHOP';
      case LandmarkId.SCARLET_BARD:
        return 'SCARLET_BARD';
      case LandmarkId.ADVENTURERS_GUILD:
        return 'ADVENTURERS_GUILD';
      case LandmarkId.REVIEW_BOARD:
        return 'REVIEW_BOARD';
      case LandmarkId.ROSCOES_EMPORIUM:
        return 'ROSCOE_EMPORIUM';
      case LandmarkId.MANGARS_TOWER:
        return 'MANGAR_TOWER';
      case LandmarkId.KYLEARANS_TOWER:
      case LandmarkId.HARKYNS_CASTLE:
        return 'KYLEARAN_TOWER';
      case LandmarkId.CITY_GATE:
        return 'CITY_GATE';
      case LandmarkId.TEMPLE_1:
      case LandmarkId.TEMPLE_2:
      case LandmarkId.TEMPLE_3:
      case LandmarkId.TEMPLE_4:
      case LandmarkId.TEMPLE_5:
      case LandmarkId.TEMPLE_6:
      case LandmarkId.TEMPLE_MAD_GOD:
        return 'TEMPLE';
      case LandmarkId.INN_1:
      case LandmarkId.INN_2:
      case LandmarkId.INN_3:
      case LandmarkId.INN_4:
      case LandmarkId.INN_5:
      case LandmarkId.INN_6:
        return 'INN';
      default:
        return 'HOUSE';
    }
  }

  initCityGrid() {
    const S = CELL_SIZE_METERS; // 3.0m
    const bldgHeight = 4.5;

    // 1. Rough Cobblestone Ground Texture & Material
    const streetTex = TextureGenerator.createRoughCobblestoneTexture();
    const streetMat = new THREE.MeshStandardMaterial({
      map: streetTex,
      roughness: 0.85,
      metalness: 0.1
    });
    this.disposables.push(streetTex, streetMat);

    // Curb material
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    this.disposables.push(curbMat);

    // Roof and top materials
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.6 });
    const stoneBasementMat = new THREE.MeshStandardMaterial({ color: 0x1f1d1b, roughness: 0.9 });
    this.disposables.push(roofMat, stoneBasementMat);

    const boxGeo = new THREE.BoxGeometry(S, bldgHeight, S);
    const planeGeo = new THREE.PlaneGeometry(S, S);
    const curbGeo = new THREE.BoxGeometry(S, 0.08, 0.15);
    const roofGeo = new THREE.ConeGeometry(S * 0.75, 1.8, 4);
    this.disposables.push(boxGeo, planeGeo, curbGeo, roofGeo);

    // Build the 30x30 Skara Brae City Grid
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const cell = getCell(x, y);
        if (!cell) continue;

        const { worldX, worldZ } = sourceToWorld(x, y);

        if (cell.terrain === TerrainType.STREET) {
          // Rough Cobblestone Street Tile
          const streetTile = new THREE.Mesh(planeGeo, streetMat);
          streetTile.rotation.x = -Math.PI / 2;
          streetTile.position.set(worldX, 0.01, worldZ);
          this.sceneGroup.add(streetTile);

          // Add curbs along edges if adjacent to walls
          const neighbors = [
            { dx: 0, dy: 1, pos: [worldX, 0.04, worldZ - S / 2 + 0.075], rotY: 0 },
            { dx: 0, dy: -1, pos: [worldX, 0.04, worldZ + S / 2 - 0.075], rotY: 0 },
            { dx: -1, dy: 0, pos: [worldX - S / 2 + 0.075, 0.04, worldZ], rotY: Math.PI / 2 },
            { dx: 1, dy: 0, pos: [worldX + S / 2 - 0.075, 0.04, worldZ], rotY: Math.PI / 2 }
          ];

          for (const n of neighbors) {
            const adjCell = getCell(x + n.dx, y + n.dy);
            if (adjCell && adjCell.terrain !== TerrainType.STREET) {
              const curb = new THREE.Mesh(curbGeo, curbMat);
              curb.position.set(...n.pos);
              curb.rotation.y = n.rotY;
              this.sceneGroup.add(curb);
            }
          }
        } else {
          // Building / Wall Tile with Authentic C64 Facades on all sides
          const facadeType = this.getLandmarkFacadeType(cell.landmarkId);
          const facadeMat = this.getFacadeMaterial(facadeType);

          // Multi-material cube: [+X (East), -X (West), +Y (Top), -Y (Bottom), +Z (South), -Z (North)]
          const materials = [
            facadeMat,         // East
            facadeMat,         // West
            roofMat,           // Top
            stoneBasementMat,  // Bottom
            facadeMat,         // South
            facadeMat          // North
          ];

          const bldg = new THREE.Mesh(boxGeo, materials);
          bldg.position.set(worldX, bldgHeight / 2, worldZ);
          bldg.userData = {
            isBuildingTile: true,
            cellX: x,
            cellY: y,
            landmarkId: cell.landmarkId,
            facadeType
          };
          this.sceneGroup.add(bldg);

          // Pitched Roof on top
          const roof = new THREE.Mesh(roofGeo, roofMat);
          roof.rotation.y = Math.PI / 4;
          roof.position.set(worldX, bldgHeight + 0.9, worldZ);
          this.sceneGroup.add(roof);
        }
      }
    }

    // Street Corner Lantern Torches at Major Intersections
    const torchNodes = [
      { x: 25, y: 18 }, // Near Garth's Shop
      { x: 28, y: 6 },  // Near Scarlet Bard Tavern
      { x: 24, y: 16 }, // Near Guild
      { x: 23, y: 21 }, // Near Review Board
      { x: 14, y: 15 }, // Gran Plaz Center
      { x: 16, y: 15 }  // Gran Plaz East
    ];

    torchNodes.forEach((node) => {
      const { worldX, worldZ } = sourceToWorld(node.x, node.y);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.8), postMat);
      post.position.set(worldX + 1.2, 1.4, worldZ + 1.2);
      this.sceneGroup.add(post);
      this.disposables.push(postMat, post.geometry);

      const lampHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      lampHead.position.set(worldX + 1.2, 2.8, worldZ + 1.2);
      this.sceneGroup.add(lampHead);
      this.disposables.push(lampHead.geometry, lampHead.material);

      const light = new THREE.PointLight(0xf59e0b, 2.6, 9.0);
      light.position.set(worldX + 1.2, 2.8, worldZ + 1.2);
      this.sceneGroup.add(light);

      this.torches.push({ light, baseIntensity: 2.6 });
    });
  }

  initGarthStorefront() {
    // Garth's Shoppe at (26, 18) -> Entrance Door on West facade facing (25, 18)
    const { worldX: gx, worldZ: gz } = sourceToWorld(26, 18);
    const doorX = gx - CELL_SIZE_METERS / 2; // 33.0m

    const woodTexture = TextureGenerator.createWoodPlankTexture();
    const doorMat = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.6 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.8, roughness: 0.3 });

    this.disposables.push(woodTexture, doorMat, ironMat, goldTrimMat);

    const doorGroup = new THREE.Group();
    doorGroup.position.set(doorX, 0, gz);
    doorGroup.rotation.y = -Math.PI / 2; // Face West

    // Archway frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 0.25), ironMat);
    frame.position.set(0, 1.4, 0);
    doorGroup.add(frame);
    this.disposables.push(frame.geometry);

    // Carved Wooden Door Panel
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.12), doorMat);
    doorMesh.position.set(0, 1.3, 0.04);
    doorGroup.add(doorMesh);
    this.disposables.push(doorMesh.geometry);

    // Iron Door Straps
    const strap1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.15), ironMat);
    strap1.position.set(0, 2.0, 0.06);
    doorGroup.add(strap1);
    const strap2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.15), ironMat);
    strap2.position.set(0, 0.6, 0.06);
    doorGroup.add(strap2);
    this.disposables.push(strap1.geometry, strap2.geometry);

    // Door Ring Handle
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 16), goldTrimMat);
    handle.position.set(0.4, 1.2, 0.12);
    doorGroup.add(handle);
    this.disposables.push(handle.geometry);

    // Authentic Sign: "⚔️ GARTH'S EQUIPMENT SHOPPE 🛡️"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 440;
    signCanvas.height = 110;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 440, 110);
    sCtx.strokeStyle = '#f3cf65';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(6, 6, 428, 98);
    sCtx.fillStyle = '#f3cf65';
    sCtx.font = 'bold 24px Georgia, serif';
    sCtx.textAlign = 'center';
    sCtx.fillText("⚔️ GARTH'S SHOPPE 🛡️", 220, 44);
    sCtx.fillStyle = '#38bdf8';
    sCtx.font = 'bold 16px monospace';
    sCtx.fillText('Press [A] or Click to Enter', 220, 78);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.45),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signMesh.position.set(0, 3.1, 0.1);
    doorGroup.add(signMesh);
    this.disposables.push(signTex, signMesh.geometry, signMesh.material);

    // Dual Sconce Torches
    const torchOffsets = [-1.1, 1.1];
    torchOffsets.forEach((ox) => {
      const torchBracket = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35), ironMat);
      torchBracket.position.set(ox, 2.0, 0.15);
      doorGroup.add(torchBracket);
      this.disposables.push(torchBracket.geometry);

      const torchHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      torchHead.position.set(ox, 2.2, 0.2);
      doorGroup.add(torchHead);
      this.disposables.push(torchHead.geometry, torchHead.material);

      const light = new THREE.PointLight(0xf59e0b, 2.6, 8.0);
      light.position.set(ox, 2.2, 0.3);
      doorGroup.add(light);

      this.torches.push({ light, baseIntensity: 2.6 });
    });

    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 3.0, 1.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(0, 1.5, 0.4);
    doorGroup.add(hitBox);
    this.disposables.push(hitBox.geometry, hitBox.material);

    doorGroup.userData = {
      isGarthDoor: true,
      landmarkId: LandmarkId.GARTHS_SHOP,
      name: "Garth's Equipment Shoppe"
    };
    hitBox.userData = doorGroup.userData;

    this.sceneGroup.add(doorGroup);
    this.interactableObjects.push(hitBox, doorGroup);
    this.garthDoorGroup = doorGroup;
  }

  initTavernStorefront() {
    // Scarlet Bard Tavern at (28, 5) -> Entrance facing West at (27, 5)
    const { worldX: tx, worldZ: tz } = sourceToWorld(28, 5);
    const doorX = tx - CELL_SIZE_METERS / 2;

    const woodTexture = TextureGenerator.createWoodPlankTexture();
    const doorMat = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.6 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const crimsonMat = new THREE.MeshStandardMaterial({ color: 0x831843, roughness: 0.7 });

    this.disposables.push(woodTexture, doorMat, ironMat, crimsonMat);

    const doorGroup = new THREE.Group();
    doorGroup.position.set(doorX, 0, tz);
    doorGroup.rotation.y = -Math.PI / 2;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 0.25), crimsonMat);
    frame.position.set(0, 1.4, 0);
    doorGroup.add(frame);
    this.disposables.push(frame.geometry);

    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.12), doorMat);
    doorMesh.position.set(0, 1.3, 0.04);
    doorGroup.add(doorMesh);
    this.disposables.push(doorMesh.geometry);

    // Sign: "🍺 THE SCARLET BARD TAVERN 🎵"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 440;
    signCanvas.height = 110;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#451a03';
    sCtx.fillRect(0, 0, 440, 110);
    sCtx.strokeStyle = '#f3cf65';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(6, 6, 428, 98);
    sCtx.fillStyle = '#f3cf65';
    sCtx.font = 'bold 22px Georgia, serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('🍺 THE SCARLET BARD 🎵', 220, 44);
    sCtx.fillStyle = '#fef08a';
    sCtx.font = 'bold 16px monospace';
    sCtx.fillText('Press [A] or Click to Enter', 220, 78);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.45),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signMesh.position.set(0, 3.1, 0.1);
    doorGroup.add(signMesh);
    this.disposables.push(signTex, signMesh.geometry, signMesh.material);

    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 3.0, 1.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(0, 1.5, 0.4);
    doorGroup.add(hitBox);
    this.disposables.push(hitBox.geometry, hitBox.material);

    doorGroup.userData = {
      isTavernDoor: true,
      landmarkId: LandmarkId.SCARLET_BARD,
      name: 'The Scarlet Bard Tavern'
    };
    hitBox.userData = doorGroup.userData;

    this.sceneGroup.add(doorGroup);
    this.interactableObjects.push(hitBox, doorGroup);
    this.tavernDoorGroup = doorGroup;
  }

  initGuildStorefront() {
    // Adventurers Guild at (24, 15) -> Entrance facing East at (25, 15)
    const { worldX: gx, worldZ: gz } = sourceToWorld(24, 15);
    const doorX = gx + CELL_SIZE_METERS / 2; // East face

    const woodTexture = TextureGenerator.createWoodPlankTexture();
    const doorMat = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.6 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7 });

    this.disposables.push(woodTexture, doorMat, ironMat, blueMat);

    const doorGroup = new THREE.Group();
    doorGroup.position.set(doorX, 0, gz);
    doorGroup.rotation.y = Math.PI / 2; // Face East

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 0.25), blueMat);
    frame.position.set(0, 1.4, 0);
    doorGroup.add(frame);
    this.disposables.push(frame.geometry);

    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.12), doorMat);
    doorMesh.position.set(0, 1.3, 0.04);
    doorGroup.add(doorMesh);
    this.disposables.push(doorMesh.geometry);

    // Sign: "🛡️ ADVENTURERS GUILD 🛡️"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 460;
    signCanvas.height = 110;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 460, 110);
    sCtx.strokeStyle = '#f3cf65';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(6, 6, 448, 98);
    sCtx.fillStyle = '#f3cf65';
    sCtx.font = 'bold 22px Georgia, serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('🛡️ ADVENTURERS GUILD 🛡️', 230, 44);
    sCtx.fillStyle = '#38bdf8';
    sCtx.font = 'bold 15px monospace';
    sCtx.fillText('Press [A] to Rest / Safe Haven', 230, 78);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.45),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signMesh.position.set(0, 3.1, 0.1);
    doorGroup.add(signMesh);
    this.disposables.push(signTex, signMesh.geometry, signMesh.material);

    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 3.0, 1.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(0, 1.5, 0.4);
    doorGroup.add(hitBox);
    this.disposables.push(hitBox.geometry, hitBox.material);

    doorGroup.userData = {
      isGuildDoor: true,
      landmarkId: LandmarkId.ADVENTURERS_GUILD,
      name: 'Adventurers Guild'
    };
    hitBox.userData = doorGroup.userData;

    this.sceneGroup.add(doorGroup);
    this.interactableObjects.push(hitBox, doorGroup);
    this.guildDoorGroup = doorGroup;
  }

  initReviewBoardStorefront() {
    // Review Board at (23, 20) -> Entrance facing East at (24, 20)
    const { worldX: rx, worldZ: rz } = sourceToWorld(23, 20);
    const doorX = rx + CELL_SIZE_METERS / 2; // East face

    const woodTexture = TextureGenerator.createWoodPlankTexture();
    const doorMat = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.6 });
    const indigoMat = new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.7 });

    this.disposables.push(woodTexture, doorMat, indigoMat);

    const doorGroup = new THREE.Group();
    doorGroup.position.set(doorX, 0, rz);
    doorGroup.rotation.y = Math.PI / 2; // Face East

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 0.25), indigoMat);
    frame.position.set(0, 1.4, 0);
    doorGroup.add(frame);
    this.disposables.push(frame.geometry);

    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.12), doorMat);
    doorMesh.position.set(0, 1.3, 0.04);
    doorGroup.add(doorMesh);
    this.disposables.push(doorMesh.geometry);

    // Sign: "📜 REVIEW BOARD 📜"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 460;
    signCanvas.height = 110;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 460, 110);
    sCtx.strokeStyle = '#a855f7';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(6, 6, 448, 98);
    sCtx.fillStyle = '#e9d5ff';
    sCtx.font = 'bold 22px Georgia, serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('📜 REVIEW BOARD 📜', 230, 44);
    sCtx.fillStyle = '#f3cf65';
    sCtx.font = 'bold 15px monospace';
    sCtx.fillText('Press [A] to Seek Leveling', 230, 78);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.45),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signMesh.position.set(0, 3.1, 0.1);
    doorGroup.add(signMesh);
    this.disposables.push(signTex, signMesh.geometry, signMesh.material);

    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 3.0, 1.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(0, 1.5, 0.4);
    doorGroup.add(hitBox);
    this.disposables.push(hitBox.geometry, hitBox.material);

    doorGroup.userData = {
      isReviewBoardDoor: true,
      landmarkId: LandmarkId.REVIEW_BOARD,
      name: 'Review Board'
    };
    hitBox.userData = doorGroup.userData;

    this.sceneGroup.add(doorGroup);
    this.interactableObjects.push(hitBox, doorGroup);
    this.reviewBoardDoorGroup = doorGroup;
  }

  initTempleStorefront() {
    // Temple of the Divine Light at (14, 18) -> Entrance facing North at (14, 19)
    const { worldX: tx, worldZ: tz } = sourceToWorld(14, 18);
    const doorZ = tz - CELL_SIZE_METERS / 2;

    const woodTexture = TextureGenerator.createWoodPlankTexture();
    const doorMat = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 });

    this.disposables.push(woodTexture, doorMat, goldMat);

    const doorGroup = new THREE.Group();
    doorGroup.position.set(tx, 0, doorZ);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 0.25), goldMat);
    frame.position.set(0, 1.4, 0);
    doorGroup.add(frame);
    this.disposables.push(frame.geometry);

    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.12), doorMat);
    doorMesh.position.set(0, 1.3, 0.04);
    doorGroup.add(doorMesh);
    this.disposables.push(doorMesh.geometry);

    // Sign: "🏛️ TEMPLE OF DIVINE LIGHT 🏛️"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 460;
    signCanvas.height = 110;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 460, 110);
    sCtx.strokeStyle = '#f3cf65';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(6, 6, 448, 98);
    sCtx.fillStyle = '#f3cf65';
    sCtx.font = 'bold 21px Georgia, serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('🏛️ TEMPLE OF DIVINE LIGHT 🏛️', 230, 44);
    sCtx.fillStyle = '#34d399';
    sCtx.font = 'bold 15px monospace';
    sCtx.fillText('Press [A] to Heal & Purify', 230, 78);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.45),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signMesh.position.set(0, 3.1, 0.1);
    doorGroup.add(signMesh);
    this.disposables.push(signTex, signMesh.geometry, signMesh.material);

    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 3.0, 1.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(0, 1.5, 0.4);
    doorGroup.add(hitBox);
    this.disposables.push(hitBox.geometry, hitBox.material);

    doorGroup.userData = {
      isTempleDoor: true,
      templeName: 'Temple of the Divine Light',
      isTarjan: false,
      name: 'Temple of the Divine Light'
    };
    hitBox.userData = doorGroup.userData;

    this.sceneGroup.add(doorGroup);
    this.interactableObjects.push(hitBox, doorGroup);
    this.templeDoorGroup = doorGroup;
  }

  initTarjanStorefront() {
    // Temple of the Mad God Tarjan at (18, 14) -> Entrance facing West at (17, 14)
    const { worldX: mx, worldZ: mz } = sourceToWorld(18, 14);
    const doorX = mx - CELL_SIZE_METERS / 2;

    const woodTexture = TextureGenerator.createWoodPlankTexture();
    const doorMat = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.6 });
    const purpleMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.6 });

    this.disposables.push(woodTexture, doorMat, purpleMat);

    const doorGroup = new THREE.Group();
    doorGroup.position.set(doorX, 0, mz);
    doorGroup.rotation.y = -Math.PI / 2; // Face West

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 0.25), purpleMat);
    frame.position.set(0, 1.4, 0);
    doorGroup.add(frame);
    this.disposables.push(frame.geometry);

    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.12), doorMat);
    doorMesh.position.set(0, 1.3, 0.04);
    doorGroup.add(doorMesh);
    this.disposables.push(doorMesh.geometry);

    // Sign: "🗡️ TEMPLE OF THE MAD GOD 🗡️"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 460;
    signCanvas.height = 110;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#1e1b4b';
    sCtx.fillRect(0, 0, 460, 110);
    sCtx.strokeStyle = '#c084fc';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(6, 6, 448, 98);
    sCtx.fillStyle = '#e9d5ff';
    sCtx.font = 'bold 20px Georgia, serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('🗡️ TEMPLE OF THE MAD GOD 🗡️', 230, 44);
    sCtx.fillStyle = '#38bdf8';
    sCtx.font = 'bold 14px monospace';
    sCtx.fillText('Press [A] (Free for Rogues!)', 230, 78);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.45),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signMesh.position.set(0, 3.1, 0.1);
    doorGroup.add(signMesh);
    this.disposables.push(signTex, signMesh.geometry, signMesh.material);

    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 3.0, 1.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(0, 1.5, 0.4);
    doorGroup.add(hitBox);
    this.disposables.push(hitBox.geometry, hitBox.material);

    doorGroup.userData = {
      isTempleDoor: true,
      isTarjanDoor: true,
      templeName: 'Temple of the Mad God Tarjan',
      isTarjan: true,
      name: 'Temple of the Mad God Tarjan'
    };
    hitBox.userData = doorGroup.userData;

    this.sceneGroup.add(doorGroup);
    this.interactableObjects.push(hitBox, doorGroup);
    this.tarjanDoorGroup = doorGroup;
  }

  initRoscoeStorefront() {
    // Roscoe's Energy Emporium at (12, 21) -> Entrance facing East at (13, 21)
    const { worldX: rx, worldZ: rz } = sourceToWorld(12, 21);
    const doorX = rx + CELL_SIZE_METERS / 2;

    const woodTexture = TextureGenerator.createWoodPlankTexture();
    const doorMat = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.6 });
    const cyanMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.5 });

    this.disposables.push(woodTexture, doorMat, cyanMat);

    const doorGroup = new THREE.Group();
    doorGroup.position.set(doorX, 0, rz);
    doorGroup.rotation.y = Math.PI / 2; // Face East

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 0.25), cyanMat);
    frame.position.set(0, 1.4, 0);
    doorGroup.add(frame);
    this.disposables.push(frame.geometry);

    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.12), doorMat);
    doorMesh.position.set(0, 1.3, 0.04);
    doorGroup.add(doorMesh);
    this.disposables.push(doorMesh.geometry);

    // Sign: "⚡ ROSCOE'S ENERGY EMPORIUM ⚡"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 460;
    signCanvas.height = 110;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#082f49';
    sCtx.fillRect(0, 0, 460, 110);
    sCtx.strokeStyle = '#38bdf8';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(6, 6, 448, 98);
    sCtx.fillStyle = '#bae6fd';
    sCtx.font = 'bold 19px Georgia, serif';
    sCtx.textAlign = 'center';
    sCtx.fillText("⚡ ROSCOE'S ENERGY EMPORIUM ⚡", 230, 44);
    sCtx.fillStyle = '#f3cf65';
    sCtx.font = 'bold 14px monospace';
    sCtx.fillText('Press [A] to Recharge Spell Points', 230, 78);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.45),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signMesh.position.set(0, 3.1, 0.1);
    doorGroup.add(signMesh);
    this.disposables.push(signTex, signMesh.geometry, signMesh.material);

    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 3.0, 1.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(0, 1.5, 0.4);
    doorGroup.add(hitBox);
    this.disposables.push(hitBox.geometry, hitBox.material);

    doorGroup.userData = {
      isRoscoeDoor: true,
      name: "Roscoe's Energy Emporium"
    };
    hitBox.userData = doorGroup.userData;

    this.sceneGroup.add(doorGroup);
    this.interactableObjects.push(hitBox, doorGroup);
    this.roscoeDoorGroup = doorGroup;
  }

  /**
   * 3D Guardian Statues (S1–S6), Grand Plaza Monument, City Gates, Dungeons, and Teleporters
   */
  initStatuesAndMonuments() {
    const S = CELL_SIZE_METERS;

    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.2 });
    const plinthGeo = new THREE.CylinderGeometry(0.9, 1.1, 0.45, 16);
    this.disposables.push(plinthMat, plinthGeo);

    // ─── 1. STATUES CONFIGURATION ───────────────────────────────────────
    const statueConfigs = [
      // S1: Samurai Statue
      {
        id: 'S1',
        coords: [{ x: 27, y: 6 }],
        name: 'Samurai Statue',
        spriteKey: 'statue_s1_samurai',
        glowColor: 0x38bdf8,
        description: 'A finely chiseled Samurai statue stands in quiet meditation, its hand resting upon the hilt of a razor-sharp katana.'
      },
      // S2: Stone Giant Statues
      {
        id: 'S2',
        coords: [{ x: 4, y: 26 }, { x: 22, y: 3 }, { x: 21, y: 2 }],
        name: 'Stone Giant Statue',
        spriteKey: 'statue_s2_stone_giant',
        glowColor: 0xf59e0b,
        description: 'A colossal Stone Giant statue carved from Skara Brae granite looms overhead, brandishing a massive stone boulder.'
      },
      // S3: Stone Golem Statue
      {
        id: 'S3',
        coords: [{ x: 6, y: 26 }],
        name: 'Stone Golem Statue',
        spriteKey: 'statue_s3_stone_golem',
        glowColor: 0xa855f7,
        description: 'A massive Stone Golem statue covered in ancient protective glyphs stands motionless.'
      },
      // S4: Grey Dragon Statue
      {
        id: 'S4',
        coords: [{ x: 6, y: 24 }],
        name: 'Grey Dragon Statue',
        spriteKey: 'statue_s4_grey_dragon',
        glowColor: 0xef4444,
        description: 'An ancient Grey Dragon sculpted in jagged obsidian guards the road toward Harkyn\'s Castle. Its stone eyes seem to smolder.'
      },
      // S5: Ogre Lord Statues
      {
        id: 'S5',
        coords: [{ x: 3, y: 14 }, { x: 3, y: 6 }, { x: 6, y: 6 }],
        name: 'Ogre Lord Statue',
        spriteKey: 'statue_s5_ogre_lord',
        glowColor: 0x10b981,
        description: 'A brutish Ogre Lord statue with cruel tusks and a spiked mace scowls down at passing adventurers.'
      },
      // S6: Guardian Golem Statue
      {
        id: 'S6',
        coords: [{ x: 6, y: 22 }],
        name: 'Guardian Golem Statue',
        spriteKey: 'statue_s6_guardian_golem',
        glowColor: 0xeab308,
        description: 'A stalwart Guardian Golem statue holding a radiant solar tower shield stands vigilant against evil.'
      }
    ];

    statueConfigs.forEach(cfg => {
      cfg.coords.forEach(async pos => {
        const { worldX, worldZ } = sourceToWorld(pos.x, pos.y);

        const statueGroup = new THREE.Group();
        statueGroup.position.set(worldX, 0, worldZ);

        // Stone Base Plinth
        const plinth = new THREE.Mesh(plinthGeo, plinthMat);
        plinth.position.y = 0.225;
        statueGroup.add(plinth);

        // Animated 1985 Sprite Billboard
        try {
          const spriteSrc = getLocationSpritePath(cfg.spriteKey);
          const animated = await this.spriteManager.createAnimatedBillboard(spriteSrc, 3);
          animated.mesh.position.y = 1.7;
          animated.mesh.scale.set(1.3, 1.4, 1.3);
          statueGroup.add(animated.mesh);
          this.billboardObjects.push(animated.mesh);
          this.animatedUpdaters.push(animated.update);
        } catch (e) {
          console.warn('Failed to load statue sprite for:', cfg.name, e);
        }

        // Arcane Spotlight
        const light = new THREE.PointLight(cfg.glowColor, 2.0, 5.0);
        light.position.set(0, 1.8, 0);
        statueGroup.add(light);
        this.torches.push({ light, baseIntensity: 2.0 });

        // Invisible Interaction Hitbox
        const hitBox = new THREE.Mesh(
          new THREE.BoxGeometry(2.0, 3.2, 2.0),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hitBox.position.y = 1.6;
        statueGroup.add(hitBox);
        this.disposables.push(hitBox.geometry, hitBox.material);

        const statueData = {
          isStatue: true,
          statueId: cfg.id,
          name: cfg.name,
          coords: pos,
          description: cfg.description
        };
        statueGroup.userData = statueData;
        hitBox.userData = statueData;

        this.sceneGroup.add(statueGroup);
        this.interactableObjects.push(hitBox, statueGroup);
      });
    });

    // ─── 2. GRAN PLAZ CENTRAL MONUMENT (15, 15) ─────────────────────────
    {
      const { worldX, worldZ } = sourceToWorld(15, 15);
      const plazaGroup = new THREE.Group();
      plazaGroup.position.set(worldX, 0, worldZ);

      // Monument Plinth
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.6, 16), baseMat);
      base.position.y = 0.3;
      plazaGroup.add(base);

      // Obelisk
      const obeliskMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
      const obelisk = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.6, 4), obeliskMat);
      obelisk.position.y = 2.4;
      obelisk.rotation.y = Math.PI / 4;
      plazaGroup.add(obelisk);

      // Plaque Billboard
      const plaqueTex = TextureGenerator.createGranPlazMonumentTexture();
      const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTex, transparent: true, side: THREE.DoubleSide });
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), plaqueMat);
      plaque.position.y = 1.4;
      plazaGroup.add(plaque);
      this.billboardObjects.push(plaque);
      this.disposables.push(baseMat, obeliskMat, plaqueTex, plaqueMat, base.geometry, obelisk.geometry, plaque.geometry);

      const hitBox = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4.0, 2.5), new THREE.MeshBasicMaterial({ visible: false }));
      hitBox.position.y = 2.0;
      plazaGroup.add(hitBox);
      this.disposables.push(hitBox.geometry, hitBox.material);

      const plazaData = {
        isLandmark: true,
        landmarkId: LandmarkId.GRAN_PLAZ,
        name: 'Gran Plaz Monument',
        description: 'The Grand Plaza of Skara Brae. A towering white marble obelisk commemorates the peace of the realm before Mangar\'s winter curse.'
      };
      plazaGroup.userData = plazaData;
      hitBox.userData = plazaData;

      this.sceneGroup.add(plazaGroup);
      this.interactableObjects.push(hitBox, plazaGroup);
    }

    // ─── 3. WESTERN CITY GATE (0, 15) ───────────────────────────────────
    {
      const { worldX, worldZ } = sourceToWorld(0, 15);
      const gateGroup = new THREE.Group();
      gateGroup.position.set(worldX, 0, worldZ);

      const gateTex = TextureGenerator.createCityGatePortcullisTexture();
      const gateMat = new THREE.MeshBasicMaterial({ map: gateTex, side: THREE.DoubleSide });
      const gatePlane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.8), gateMat);
      gatePlane.position.set(0, 1.9, 0);
      gateGroup.add(gatePlane);
      this.disposables.push(gateTex, gateMat, gatePlane.geometry);

      const hitBox = new THREE.Mesh(new THREE.BoxGeometry(3.5, 4.0, 1.5), new THREE.MeshBasicMaterial({ visible: false }));
      hitBox.position.y = 2.0;
      gateGroup.add(hitBox);
      this.disposables.push(hitBox.geometry, hitBox.material);

      const gateData = {
        isCityGate: true,
        landmarkId: LandmarkId.CITY_GATE,
        name: 'Western City Gate',
        description: 'The heavy iron portcullis of Skara Brae is frozen shut, barricaded by impenetrable fifteen-foot snowdrifts!'
      };
      gateGroup.userData = gateData;
      hitBox.userData = gateData;

      this.sceneGroup.add(gateGroup);
      this.interactableObjects.push(hitBox, gateGroup);
    }

    // ─── 4. SEWERS ENTRANCE GRATE (1, 1) ────────────────────────────────
    {
      const { worldX, worldZ } = sourceToWorld(1, 1);
      const sewerGroup = new THREE.Group();
      sewerGroup.position.set(worldX, 0, worldZ);

      const grateTex = TextureGenerator.createSewerGrateTexture();
      const grateMat = new THREE.MeshBasicMaterial({ map: grateTex });
      const grateMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), grateMat);
      grateMesh.rotation.x = -Math.PI / 2;
      grateMesh.position.y = 0.04;
      sewerGroup.add(grateMesh);
      this.disposables.push(grateTex, grateMat, grateMesh.geometry);

      // Warning green light from below
      const sewerLight = new THREE.PointLight(0x22c55e, 2.2, 5.0);
      sewerLight.position.set(0, 0.5, 0);
      sewerGroup.add(sewerLight);
      this.torches.push({ light: sewerLight, baseIntensity: 2.2 });

      const hitBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 2.4), new THREE.MeshBasicMaterial({ visible: false }));
      hitBox.position.y = 0.75;
      sewerGroup.add(hitBox);
      this.disposables.push(hitBox.geometry, hitBox.material);

      const sewerData = {
        isDungeonEntrance: true,
        landmarkId: LandmarkId.SEWERS_ENTRANCE,
        name: 'Skara Brae Sewers Entrance',
        description: 'An iron-barred floor grate leads into the fetid sewers beneath Skara Brae. You can hear foul creatures stirring below.'
      };
      sewerGroup.userData = sewerData;
      hitBox.userData = sewerData;

      this.sceneGroup.add(sewerGroup);
      this.interactableObjects.push(hitBox, sewerGroup);
    }

    // ─── 5. TELEPORTER PADS (25, 2) <-> (25, 7) ─────────────────────────
    const teleporterCoords = [
      { from: { x: 25, y: 2 }, to: { x: 25, y: 7 }, name: 'South Teleporter' },
      { from: { x: 25, y: 7 }, to: { x: 25, y: 2 }, name: 'North Teleporter' }
    ];

    teleporterCoords.forEach(tp => {
      const { worldX, worldZ } = sourceToWorld(tp.from.x, tp.from.y);
      const padGroup = new THREE.Group();
      padGroup.position.set(worldX, 0, worldZ);

      const padTex = TextureGenerator.createTeleportPadTexture();
      const padMat = new THREE.MeshBasicMaterial({ map: padTex });
      const padMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), padMat);
      padMesh.rotation.x = -Math.PI / 2;
      padMesh.position.y = 0.03;
      padGroup.add(padMesh);

      // Swirling Cyan/Magenta Point Light
      const tpLight = new THREE.PointLight(0x06b6d4, 2.5, 6.0);
      tpLight.position.set(0, 0.8, 0);
      padGroup.add(tpLight);
      this.torches.push({ light: tpLight, baseIntensity: 2.5 });

      this.disposables.push(padTex, padMat, padMesh.geometry);

      const hitBox = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 2.6), new THREE.MeshBasicMaterial({ visible: false }));
      hitBox.position.y = 0.6;
      padGroup.add(hitBox);
      this.disposables.push(hitBox.geometry, hitBox.material);

      const tpData = {
        isTeleporter: true,
        sourceCoords: tp.from,
        targetCoords: tp.to,
        name: tp.name,
        description: 'A shimmering arcane teleportation rune hums on the cobblestones.'
      };
      padGroup.userData = tpData;
      hitBox.userData = tpData;

      this.sceneGroup.add(padGroup);
      this.interactableObjects.push(hitBox, padGroup);
    });

    // ─── 6. DUNGEONS & TOWERS (Harkyn's, Kylearan's, Mangar's) ───────────
    const dungeonFortresses = [
      {
        id: LandmarkId.HARKYNS_CASTLE,
        coords: { x: 4, y: 24 },
        name: "Lord Harkyn's Castle",
        color: 0xef4444,
        description: "The fortified stone portcullis of Lord Harkyn's Castle. Within lies a deadly gauntlet of swordsmen and arcane traps."
      },
      {
        id: LandmarkId.KYLEARANS_TOWER,
        coords: { x: 28, y: 27 },
        name: "Kylearan's Amber Tower",
        color: 0xf59e0b,
        description: "A shimmering amber portal marks the entrance to Kylearan's mystical tower of illusions."
      },
      {
        id: LandmarkId.MANGARS_TOWER,
        coords: { x: 2, y: 2 },
        name: "Mangar's Obsidian Tower",
        color: 0x9333ea,
        description: "The sinister obsidian stronghold of the evil archmage Mangar. Dark energies crackle around the iron door."
      },
      {
        id: LandmarkId.STABLES,
        coords: { x: 4, y: 15 },
        name: "Skara Brae Stables",
        color: 0x78350f,
        description: "The city stables. The horses have all been moved inside for shelter against the eternal winter."
      },
      {
        id: LandmarkId.CREDITS_SQUARE,
        coords: { x: 26, y: 15 },
        name: "Credits Square",
        color: 0x38bdf8,
        description: "A commemorative bronze plaque dedicated to Michael Cranford, Brian Fargo, and the creators of The Bard's Tale (1985)."
      }
    ];

    dungeonFortresses.forEach(df => {
      const { worldX, worldZ } = sourceToWorld(df.coords.x, df.coords.y);
      const fortressGroup = new THREE.Group();
      fortressGroup.position.set(worldX, 0, worldZ);

      // Arcane portal glow
      const dLight = new THREE.PointLight(df.color, 3.0, 7.0);
      dLight.position.set(0, 2.0, 0);
      fortressGroup.add(dLight);
      this.torches.push({ light: dLight, baseIntensity: 3.0 });

      // Hitbox
      const hitBox = new THREE.Mesh(new THREE.BoxGeometry(3.0, 4.0, 3.0), new THREE.MeshBasicMaterial({ visible: false }));
      hitBox.position.y = 2.0;
      fortressGroup.add(hitBox);
      this.disposables.push(hitBox.geometry, hitBox.material);

      const dfData = {
        isDungeonEntrance: true,
        landmarkId: df.id,
        name: df.name,
        coords: df.coords,
        description: df.description
      };
      fortressGroup.userData = dfData;
      hitBox.userData = dfData;

      this.sceneGroup.add(fortressGroup);
      this.interactableObjects.push(hitBox, fortressGroup);
    });
  }

  initDebugGrid() {
    const minX = 23, maxX = 28;
    const minY = 16, maxY = 21;
    const S = CELL_SIZE_METERS;

    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 });
    this.disposables.push(lineMat);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const { worldX, worldZ } = sourceToWorld(x, y);

        // Cell wireframe boundary
        const boxGeo = new THREE.BoxGeometry(S, 0.1, S);
        const edges = new THREE.EdgesGeometry(boxGeo);
        const wireframe = new THREE.LineSegments(edges, lineMat);
        wireframe.position.set(worldX, 0.05, worldZ);
        this.debugGroup.add(wireframe);
        this.disposables.push(boxGeo, edges);

        // 3D Canvas label showing (x, y)
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, 128, 64);
        ctx.fillStyle = x === 25 && y === 18 ? '#4ade80' : x === 26 && y === 18 ? '#f59e0b' : '#38bdf8';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`(${x}, ${y})`, 64, 40);

        const tex = new THREE.CanvasTexture(canvas);
        const labelMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(1.2, 0.6),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
        );
        labelMesh.rotation.x = -Math.PI / 2;
        labelMesh.position.set(worldX, 0.08, worldZ);
        this.debugGroup.add(labelMesh);
        this.disposables.push(tex, labelMesh.geometry, labelMesh.material);
      }
    }
  }

  update(deltaTime) {
    if (!this.sceneGroup.visible) return;

    const time = performance.now() * 0.001;

    // 1. Update animated sprite billboard loops
    if (this.animatedUpdaters && this.animatedUpdaters.length > 0) {
      this.animatedUpdaters.forEach(updater => updater(time));
    }

    // 2. Torch light flicker
    this.torches.forEach((t, idx) => {
      t.light.intensity = t.baseIntensity + (Math.sin(time * 10 + idx * 2.5) * 0.35 + (Math.random() - 0.5) * 0.15);
    });

    // 3. Slow subtle sky rotation
    if (this.skyMesh) {
      this.skyMesh.rotation.y += deltaTime * 0.004;
    }

    // 4. Align all statue & monument billboards to face camera (keeping upright Y)
    if (this.camera && this.billboardObjects.length > 0) {
      const camPos = this.camera.position;
      this.billboardObjects.forEach(b => {
        b.lookAt(camPos.x, b.position.y, camPos.z);
      });
    }
  }

  setVisible(visible) {
    this.sceneGroup.visible = visible;
    if (visible && this.scene) {
      this.setDayNightMode(this.dayNightMode);
    }
  }

  setDebugGridVisible(visible) {
    this.debugGroup.visible = visible;
  }

  dispose() {
    this.disposables.forEach((d) => {
      if (d && typeof d.dispose === 'function') {
        d.dispose();
      }
    });
    this.disposables = [];
    this.interactableObjects = [];
    this.billboardObjects = [];
    this.torches = [];
    this.facadeMaterialCache.clear();
    if (this.sceneGroup.parent) {
      this.sceneGroup.parent.remove(this.sceneGroup);
    }
  }
}

