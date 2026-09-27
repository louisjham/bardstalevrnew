// PalmBookMenu.test.js - Comprehensive unit tests for Diegetic Field Command Deck
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PalmBookMenu } from './PalmBookMenu.js';
import { SkaraBraeGrid } from '../../world/skara-brae/SkaraBraeGrid.js';
import { createCharacter } from '../../data/RaceClassData.js';
import { COLLISION_LAYER } from './SpatialCollisionLayers.js';

// Setup Mock DOM / Canvas context for Headless Node test environment
function setupMockCanvas() {
  const drawnTexts = [];
  const drawnRects = [];
  const strokes = [];

  const mockCtx = new Proxy({
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    setTransform: () => {},
    clearRect: () => {},
    fillRect: (x, y, w, h) => { drawnRects.push({ x, y, w, h, fillStyle: mockCtx.fillStyle }); },
    strokeRect: (x, y, w, h) => { strokes.push({ x, y, w, h, strokeStyle: mockCtx.strokeStyle }); },
    beginPath: () => {},
    closePath: () => {},
    roundRect: (x, y, w, h) => { drawnRects.push({ x, y, w, h, fillStyle: mockCtx.fillStyle }); },
    fill: () => { drawnRects.push({ fillStyle: mockCtx.fillStyle }); },
    stroke: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    fillText: (text, x, y) => { drawnTexts.push({ text: String(text), x, y, fillStyle: mockCtx.fillStyle }); },
    measureText: (text) => ({ width: (String(text).length) * 8 })
  }, {
    get: (target, prop) => (prop in target ? target[prop] : () => {})
  });

  globalThis.document = {
    createElement: (tag) => {
      if (tag === 'canvas') {
        return {
          width: 512,
          height: 512,
          getContext: () => mockCtx
        };
      }
      return {};
    }
  };

  return { drawnTexts, drawnRects, strokes, mockCtx };
}

test('1. PalmBookMenu Canvas Resolution & Texture Filtering', () => {
  setupMockCanvas();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const menu = new PalmBookMenu(scene, camera, () => {});

  assert.ok(menu.pageTexture, 'Menu must initialize a pageTexture');
  assert.equal(menu.pageTexture.minFilter, THREE.NearestFilter, 'minFilter must be THREE.NearestFilter for crisp rendering');
  assert.equal(menu.pageTexture.magFilter, THREE.NearestFilter, 'magFilter must be THREE.NearestFilter for crisp rendering');
  assert.equal(menu.textMesh.geometry.parameters.width, 0.46, 'Width should be 0.46m');
  assert.equal(menu.textMesh.geometry.parameters.height, 0.46, 'Height should be 0.46m');
});

test('2. 4-Tab Index & Tab Switching (setPage, nextPage, prevPage)', () => {
  setupMockCanvas();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const menu = new PalmBookMenu(scene, camera, () => {});

  // Default page is Tab 1: MAP
  assert.equal(menu.currentPage, 1);

  // nextPage cycling: 1 -> 2 -> 3 -> 4 -> 1
  menu.nextPage();
  assert.equal(menu.currentPage, 2, 'Should switch to Tab 2: PARTY');
  menu.nextPage();
  assert.equal(menu.currentPage, 3, 'Should switch to Tab 3: BUFFS');
  menu.nextPage();
  assert.equal(menu.currentPage, 4, 'Should switch to Tab 4: SPELLS');
  menu.nextPage();
  assert.equal(menu.currentPage, 1, 'Should cycle back to Tab 1: MAP');

  // prevPage cycling: 1 -> 4 -> 3 -> 2 -> 1
  menu.prevPage();
  assert.equal(menu.currentPage, 4, 'prevPage from 1 should wrap to 4');
  menu.prevPage();
  assert.equal(menu.currentPage, 3, 'prevPage from 4 should go to 3');
  menu.prevPage();
  assert.equal(menu.currentPage, 2, 'prevPage from 3 should go to 2');
  menu.prevPage();
  assert.equal(menu.currentPage, 1, 'prevPage from 2 should go to 1');

  // Direct setPage
  menu.setPage(3);
  assert.equal(menu.currentPage, 3);
  menu.setPage(99); // Invalid
  assert.equal(menu.currentPage, 3, 'Invalid page number should be ignored');
  menu.setPage(0); // Invalid
  assert.equal(menu.currentPage, 3, 'Invalid page number should be ignored');
});

test('3. Canvas UI Raycast Button Clicks on Navigation Tabs', () => {
  setupMockCanvas();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const menu = new PalmBookMenu(scene, camera, () => {});

  assert.equal(menu.currentPage, 1);

  // UV coordinates: (px, py) = (uv.x * 512, (1 - uv.y) * 512)
  // Tab 2 is at x=106, y=8, w=94, h=32. Center is (153, 24).
  // uv.x = 153 / 512 ≈ 0.2988, py = 24 => uv.y = 1 - 24 / 512 ≈ 0.9531
  menu.handleCanvasClick({ x: 153 / 512, y: 1 - 24 / 512 }, () => {});
  assert.equal(menu.currentPage, 2, 'Clicking Tab 2 UV must activate Tab 2');

  // Tab 4 is at x=302, y=8, w=94, h=32. Center is (349, 24).
  // uv.x = 349 / 512 ≈ 0.6816, uv.y = 1 - 24 / 512
  menu.handleCanvasClick({ x: 349 / 512, y: 1 - 24 / 512 }, () => {});
  assert.equal(menu.currentPage, 4, 'Clicking Tab 4 UV must activate Tab 4');
});

test('4. Tab 1 (Live Automap) reads coordinates, discovered tiles, and directional heading', () => {
  const { drawnTexts } = setupMockCanvas();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 1.18, 0);
  camera.lookAt(0, 1.18, -10); // Facing North (-Z in Three.js)

  const grid = new SkaraBraeGrid();
  // Garth Shop is at source (14, 13)
  const garthWorld = grid.sourceToWorld(14, 13);
  camera.position.set(garthWorld.worldX, 1.18, garthWorld.worldZ);

  const menu = new PalmBookMenu(scene, camera, () => {});
  menu.setGridReference(grid);
  menu.setPage(1);

  // Verify that texts drawn include coordinates and heading
  const coordText = drawnTexts.find(t => t.text.includes('POS: (14, 13)'));
  assert.ok(coordText, 'Should draw map header with source coordinates POS: (14, 13)');

  const headingText = drawnTexts.find(t => t.text.includes('FACING: NORTH'));
  assert.ok(headingText, 'Facing -Z should indicate FACING: NORTH');
});

test('5. Tab 2 (Party Vitals) displays 6 hero rows and danger alerts for low HP or non-OK condition', () => {
  const { drawnTexts, drawnRects } = setupMockCanvas();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();

  const party = [
    createCharacter('Elric', 'Human', 'Paladin'),
    createCharacter('Gaelen', 'Elf', 'Bard'),
    createCharacter('Thorin', 'Dwarf', 'Warrior'),
    createCharacter('Shadow', 'Hobbit', 'Rogue'),
    createCharacter('Kael', 'Half-Elf', 'Conjurer'),
    createCharacter('Morgana', 'Human', 'Magician')
  ];

  // Set Elric to critical HP (< 25%)
  party[0].hp = 3;
  party[0].currentHp = 3;
  party[0].maxHp = 20;

  // Set Thorin to POISONED condition
  party[2].status = 'POISONED';
  party[2].condition = 'POISONED';

  const menu = new PalmBookMenu(scene, camera, () => {});
  menu.updatePartyData(party);
  menu.setPage(2);

  // Verify all 6 heroes are rendered in text
  for (const hero of party) {
    const nameText = drawnTexts.find(t => t.text.includes(hero.name));
    assert.ok(nameText, `Party vitals should render hero ${hero.name}`);
  }

  // Verify warning box or danger background was rendered for Elric and Thorin
  const dangerRects = drawnRects.filter(r => r.fillStyle === 'rgba(239, 68, 68, 0.18)');
  assert.ok(dangerRects.length >= 2, 'Should draw danger warning background for heroes with low HP or condition !== OK');

  // Verify condition badges
  const poisonBadge = drawnTexts.find(t => t.text.includes('POISONED'));
  assert.ok(poisonBadge, 'Should render POISONED condition badge for Thorin');
});

test('6. Tab 3 (World & Buffs) displays Phase countdown, services status, and active buffs', () => {
  const { drawnTexts } = setupMockCanvas();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();

  const mockTimeEngine = {
    currentPhase: 'DAY',
    phaseRemainingSeconds: 145, // 02:25
    areTownServicesOpen: true
  };

  const mockCombatEngine = {
    activeBardSong: {
      song: {
        name: 'Wayland\'s Watch',
        combatEffect: { stat: 'ac', value: 2 }
      },
      turnsRemaining: 4
    },
    partyBuffs: [
      { stat: 'ac', value: 2, turnsRemaining: 8, source: 'Air Armor' },
      { stat: 'toHit', value: 3, turnsRemaining: 5, source: 'Vorpal Plating' }
    ]
  };

  const menu = new PalmBookMenu(scene, camera, () => {});
  menu.setTimeEngine(mockTimeEngine);
  menu.setCombatEngine(mockCombatEngine);
  menu.setPage(3);

  const phaseText = drawnTexts.find(t => t.text.includes('DAY PHASE'));
  assert.ok(phaseText, 'Should render current time phase: DAY PHASE');

  const timerText = drawnTexts.find(t => t.text.includes('02:25'));
  assert.ok(timerText, 'Should format remaining phase seconds as mm:ss');

  const servicesText = drawnTexts.find(t => t.text.includes('OPEN'));
  assert.ok(servicesText, 'Should show town services OPEN during daytime');

  const songText = drawnTexts.find(t => t.text.includes('Wayland\'s Watch'));
  assert.ok(songText, 'Should display active Bard song name');

  const buffText = drawnTexts.find(t => t.text.includes('Air Armor'));
  assert.ok(buffText, 'Should list party buffs');
});

test('7. Tab 4 (Spellbook) filters out-of-combat spells, validates SP, and triggers test casting', () => {
  setupMockCanvas();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();

  let testedSpell = null;
  const menu = new PalmBookMenu(scene, camera, (spellType, spellName) => {
    testedSpell = { spellType, spellName };
  });

  const party = [
    createCharacter('Kael', 'Half-Elf', 'Conjurer'),
    createCharacter('Morgana', 'Human', 'Magician')
  ];

  // Give Kael 15 SP
  party[0].sp = 15;
  party[0].currentSp = 15;

  menu.updatePartyData(party);
  menu.setPage(4);

  // Find a cast button for out-of-combat spell
  const castBtn = menu.canvasButtons.find(b => b.w === 108);
  assert.ok(castBtn, 'Should find an out-of-combat spell cast button (w=108)');

  // Trigger click
  let toastMsg = '';
  castBtn.action((msg) => { toastMsg = msg; });

  assert.ok(testedSpell, 'Spell testing callback should have fired');
  assert.ok(party[0].sp < 15, 'Caster SP should have been deducted');
  assert.ok(toastMsg.includes('Testing Spell'), 'Should notify with toast message');
});

test('8. FreeLocomotion reveals automap tiles dynamically on position update', async () => {
  const { FreeLocomotion } = await import('../../xr/FreeLocomotion.js');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const grid = new SkaraBraeGrid();

  const locomotion = new FreeLocomotion(camera, scene);
  locomotion.setGridReference(grid);

  // Get world coordinate for cell (10, 10)
  const targetWorld = grid.sourceToWorld(10, 10);
  camera.position.set(targetWorld.worldX, 1.18, targetWorld.worldZ);

  // Before update, cell should not be explored
  assert.equal(grid.exploredGrid[10][10], false, 'Tile should initially be unexplored');

  // Run locomotion update
  locomotion.update(0.016);

  // After update, tile (10, 10) must be revealed
  assert.equal(grid.exploredGrid[10][10], true, 'Tile (10, 10) must be revealed upon locomotion update');
});
