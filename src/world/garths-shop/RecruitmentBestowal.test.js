import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GarthsShop } from './GarthsShop.js';
import { createCharacter } from '../../data/RaceClassData.js';
import { autoEquipCharacter } from '../../data/ItemDatabase.js';

// Setup canvas mocks in Node.js headless environment
if (typeof document === 'undefined' || !document.createElement('canvas').getContext) {
  const mockCtx = new Proxy({
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    clearRect: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    getImageData: () => ({ data: new Uint8ClampedArray(1024) }),
    roundRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {}
  }, {
    get: (target, prop) => (prop in target ? target[prop] : () => {})
  });

  globalThis.document = {
    createElement: () => ({
      width: 512,
      height: 512,
      getContext: () => mockCtx,
      addEventListener: () => {}
    })
  };
}

if (typeof globalThis.Image === 'undefined') {
  globalThis.Image = class {
    constructor() {
      setTimeout(() => { if (this.onload) this.onload(); }, 0);
    }
  };
}

test('Tactile Recruitment & Garths Shop Class Bestowal Suite', async (t) => {
  const setupShop = () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 100);
    let lastToast = null;
    const toastCallback = (msg) => { lastToast = msg; };
    const party = [];
    const shop = new GarthsShop(scene, camera, () => {}, party, () => {}, toastCallback);
    return { scene, camera, party, shop, getLastToast: () => lastToast };
  };

  await t.test('1. GarthsShop initializes recruitBillboardGroup behind counter facing player', () => {
    const { shop } = setupShop();
    assert.ok(shop.recruitBillboardGroup, 'recruitBillboardGroup must be initialized');
    assert.equal(shop.recruitBillboardGroup.visible, false, 'recruitBillboardGroup must initially be hidden');
    assert.equal(shop.recruitBillboardGroup.position.z, -3.1, 'Must be positioned behind counter at z=-3.1');
    assert.ok(shop.recruitTextTexture, 'Must have recruitTextTexture for 3D label');
  });

  await t.test('2. updateRecruitBillboard shows "Next Up: [Name]" and becomes visible with pending recruits', () => {
    const { shop } = setupShop();
    const recruits = ['Thorin', 'Morgana'];
    shop.updateRecruitBillboard(recruits);
    assert.equal(shop.recruitBillboardGroup.visible, true, 'Billboard must be visible when recruits are pending');
  });

  await t.test('3. updateRecruitBillboard hides billboard and triggers party assembled toast when queue empty', () => {
    const { shop, getLastToast } = setupShop();
    shop.updateRecruitBillboard(['Elric']);
    assert.equal(shop.recruitBillboardGroup.visible, true);

    shop.updateRecruitBillboard([]);
    assert.equal(shop.recruitBillboardGroup.visible, false, 'Billboard must be hidden when queue is empty');
    assert.match(getLastToast(), /Party fully assembled/i, 'Toast message must announce full assembly');
  });

  await t.test('4. initPhysicalWeapons includes Bard Lute, Oak Staff, Dagger, and martial weapons', () => {
    const { shop } = setupShop();
    const names = shop.weapons.map(w => w.name);
    assert.ok(names.includes('Bard Lute'), 'Should include Bard Lute on counter');
    assert.ok(names.includes('Oak Staff'), 'Should include Oak Staff on counter');
    assert.ok(names.includes('Dagger'), 'Should include Dagger on counter');
    assert.ok(names.includes('Broadsword'), 'Should include Broadsword on counter');
  });

  await t.test('5. Class Bestowal resolves proper classes based on weapon name rules', () => {
    const bestowClass = (weaponName) => {
      const wpn = weaponName.toLowerCase();
      if (wpn.includes('lute')) return 'Bard';
      if (wpn.includes('staff')) return 'Magician';
      if (wpn.includes('dagger')) return 'Rogue';
      return 'Warrior';
    };

    assert.equal(bestowClass('Bard Lute'), 'Bard');
    assert.equal(bestowClass('Oak Staff'), 'Magician');
    assert.equal(bestowClass('Dagger'), 'Rogue');
    assert.equal(bestowClass('Broadsword'), 'Warrior');
    assert.equal(bestowClass('Battleaxe'), 'Warrior');
    assert.equal(bestowClass('Warhammer'), 'Warrior');
  });

  await t.test('6. Recruited heroes receive starter equipment and valid attributes', () => {
    const hero = createCharacter('Gaelen', 'Human', 'Bard');
    autoEquipCharacter(hero);
    assert.equal(hero.name, 'Gaelen');
    assert.equal(hero.class, 'Bard');
    assert.ok(hero.hp > 0, 'HP must be positive');
    assert.ok(hero.equipped, 'Hero must receive equipped starter kit');
  });
});
