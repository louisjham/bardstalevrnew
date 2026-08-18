import * as THREE from 'three';
import { TextureGenerator } from '../../textures/TextureGenerator.js';
import { GARTH_STANDARD_ITEMS, canClassUseItem, ItemCategory, MAX_INVENTORY_SIZE } from '../../data/ItemDatabase.js';

export class GarthsShop {
  constructor(scene, camera, onExitToSkaraBrae, party) {
    this.scene = scene;
    this.camera = camera;
    this.onExitToSkaraBrae = onExitToSkaraBrae;

    this.shopGroup = new THREE.Group();
    this.shopGroup.visible = false;

    this.party = party;

    this.interactableObjects = [];
    this.initShopEnvironment();
    this.initGarthAndCounter();
    this.initPhysicalWeapons();
    this.initExitDoor();

    this.scene.add(this.shopGroup);
  }

  initShopEnvironment() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createStoneWallTexture(),
      roughness: 0.85
    });

    const floorMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWoodPlankTexture(),
      roughness: 0.7
    });

    // Room (10m x 10m x 4m)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.shopGroup.add(floor);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMat);
    backWall.position.set(0, 2, -5);
    this.shopGroup.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMat);
    leftWall.position.set(-5, 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.shopGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMat);
    rightWall.position.set(5, 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.shopGroup.add(rightWall);

    const ambient = new THREE.AmbientLight(0x451a03, 1.4);
    this.shopGroup.add(ambient);
  }

  initGarthAndCounter() {
    // Garth's Wooden Counter
    const counterMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWoodPlankTexture(),
      roughness: 0.5
    });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.8), counterMat);
    counter.position.set(0, 0.45, -2.2);
    this.shopGroup.add(counter);

    // Garth Shopkeeper NPC Mesh
    const garthGroup = new THREE.Group();
    garthGroup.position.set(0, 0, -3.0);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.28, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x78350f })
    );
    body.position.y = 0.6;
    garthGroup.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xd97706 })
    );
    head.position.y = 1.35;
    garthGroup.add(head);

    this.shopGroup.add(garthGroup);

    // Shop Banner: "GARTH'S WEAPONS & WONDERS"
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 512;
    bannerCanvas.height = 128;
    const ctx = bannerCanvas.getContext('2d');
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 108);
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText("⚔️ GARTH'S SHOP 🛡️", 256, 55);
    ctx.font = '18px sans-serif';
    ctx.fillText("WEAPONS & WONDERS - SKARA BRAE", 256, 92);

    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.8),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bannerCanvas) })
    );
    banner.position.set(0, 3.2, -4.9);
    this.shopGroup.add(banner);
  }

  initPhysicalWeapons() {
    // 3D Physical Weapons on Garth's Counter
    const counterItems = GARTH_STANDARD_ITEMS.filter(
      item => item.category === ItemCategory.WEAPON || item.category === ItemCategory.SHIELD
    ).slice(0, 6);

    const startX = -1.2;
    const spacing = 2.4 / Math.max(1, counterItems.length - 1);

    counterItems.forEach((item, index) => {
      let color = 0x64748b;
      if (item.category === ItemCategory.SHIELD) color = 0x475569;
      if (item.name.includes('Staff')) color = 0x78350f;

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.45),
        new THREE.MeshStandardMaterial({ color, roughness: 0.3 })
      );
      
      mesh.position.set(startX + (index * spacing), 0.95, -2.2);
      mesh.userData = { 
        isWeapon: true, 
        itemData: item,
        name: item.name 
      };

      this.shopGroup.add(mesh);
      this.interactableObjects.push(mesh);
    });
  }

  initExitDoor() {
    // Door to Skara Brae Streets
    const doorMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWoodPlankTexture(),
      roughness: 0.7
    });

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 0.15), doorMat);
    door.position.set(0, 1.4, 4.9);

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256;
    signCanvas.height = 64;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText("🏰 ENTER SKARA BRAE", 128, 40);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.35),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) })
    );
    sign.position.set(0, 3.0, 4.8);
    this.shopGroup.add(sign);

    door.userData = { isExitDoor: true };
    this.shopGroup.add(door);
    this.interactableObjects.push(door);
  }

  equipItem(itemInput, showToast) {
    if (!itemInput) return;
    const itemData = typeof itemInput === 'string'
      ? (GARTH_STANDARD_ITEMS.find(i => i.name === itemInput) || { name: itemInput, category: ItemCategory.WEAPON, damage: 8, usableBy: ['Paladin', 'Warrior', 'Hunter', 'Monk', 'Bard', 'Rogue'] })
      : itemInput;

    if (this.party && this.party.length > 0) {
      const hero = this.party[0];
      
      if (!canClassUseItem(hero.class, itemData)) {
        if (showToast) {
          showToast(`Ø ${hero.name} cannot use ${itemData.name}`);
        }
        return;
      }

      if (!hero.equipped) {
        hero.equipped = {};
      }

      let slot = 'weapon';
      let bonusText = '';
      
      if (itemData.category === ItemCategory.WEAPON) {
        slot = 'weapon';
        bonusText = `(+${itemData.damage} DMG)`;
      } else if (itemData.category === ItemCategory.SHIELD) {
        slot = 'shield';
        bonusText = `(${itemData.acBonus} AC)`;
      } else if (itemData.category === ItemCategory.ARMOR) {
        slot = 'armor';
        bonusText = `(${itemData.acBonus} AC)`;
      } else if (itemData.category === ItemCategory.HELM) {
        slot = 'helm';
        bonusText = `(${itemData.acBonus} AC)`;
      } else if (itemData.category === ItemCategory.GLOVES) {
        slot = 'gloves';
        bonusText = `(${itemData.acBonus} AC)`;
      } else if (itemData.category === ItemCategory.INSTRUMENT) {
        slot = 'instrument';
      }

      hero.equipped[slot] = itemData;
      
      // Update legacy weapon string if needed for compatibility elsewhere
      if (slot === 'weapon') {
        hero.weapon = itemData.name;
      }

      if (showToast) {
        showToast(`⚔️ Equipped ${itemData.name} ${bonusText} onto ${hero.name} (${hero.class})!`);
      }
    }
  }

  setVisible(visible) {
    this.shopGroup.visible = visible;
  }
}
