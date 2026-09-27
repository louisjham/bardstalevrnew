import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CombatArena } from './CombatArena.js';
import { CombatEngine } from '../../core/combat/CombatEngine.js';

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
    lineTo: () => {},
    drawImage: () => {},
    measureText: () => ({ width: 10 })
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

test('Modern 3D Combat Arena - Visual Feedback & Tactile Targeting Suite', async (t) => {
  const createTestParty = (level = 1) => [
    { name: 'Roland', class: 'Paladin', level, hp: 30, maxHp: 30, currentHp: 30, ac: 6, damage: 8 },
    { name: 'Brian', class: 'Warrior', level, hp: 28, maxHp: 28, currentHp: 28, ac: 7, damage: 7 },
    { name: 'Elrond', class: 'Conjurer', level, hp: 18, maxHp: 18, currentHp: 18, sp: 20, maxSp: 20, currentSp: 20, ac: 9, damage: 4 }
  ];

  const createMonsters = (level = 1, count = 2) => {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        name: 'Kobold',
        slug: 'kobold',
        level,
        hp: 8,
        maxHp: 8,
        currentHp: 8,
        ac: 8,
        damage: 4,
        xp: 50,
        gold: 15
      });
    }
    return list;
  };

  await t.test('1. canBlitz returns true if party avg level >= monster level + 3', () => {
    const engine = new CombatEngine();
    // High level party vs level 1 monsters
    engine.startEncounter(createTestParty(5), createMonsters(1));
    assert.strictEqual(engine.canBlitz(), true, 'Level 5 party can blitz Level 1 monsters');

    // Level 3 party vs level 1 monsters (diff is 2, threshold is 3)
    const engine2 = new CombatEngine();
    engine2.startEncounter(createTestParty(3), createMonsters(1));
    assert.strictEqual(engine2.canBlitz(), false, 'Diff of 2 should not allow blitz');

    // Level 4 party vs level 1 monsters (diff is 3, threshold is 3)
    const engine3 = new CombatEngine();
    engine3.startEncounter(createTestParty(4), createMonsters(1));
    assert.strictEqual(engine3.canBlitz(), true, 'Diff of 3 allows blitz');

    // Empty party / monsters returns false
    const engineEmpty = new CombatEngine();
    assert.strictEqual(engineEmpty.canBlitz(), false);
  });

  await t.test('2. Blitz button mesh exists and updates visibility based on canBlitz', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const arena = new CombatArena(scene, camera, () => {});

    assert.ok(arena.blitzButtonMesh, 'Blitz button mesh is instantiated');
    assert.strictEqual(arena.blitzButtonMesh.userData.action, 'BLITZ');

    // Start with low-level encounter where canBlitz() is false
    arena.enterCombat(createTestParty(1), createMonsters(2));
    arena.messageSpooler.clear();
    arena.updateButtonVisuals();
    assert.strictEqual(arena.blitzButtonMesh.visible, false, 'Blitz button hidden for tough fight');

    // Enter encounter where party is level 6 vs level 1
    arena.enterCombat(createTestParty(6), createMonsters(1));
    arena.messageSpooler.clear();
    arena.updateButtonVisuals();
    assert.strictEqual(arena.blitzButtonMesh.visible, true, 'Blitz button visible for trivial encounter');
    assert.ok(arena.interactableButtons.includes(arena.blitzButtonMesh), 'Blitz button added to interactables');
  });

  await t.test('3. executeBlitz auto-resolves fight to victory with no delays', async () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    let combatEnded = false;
    let victoryResult = null;

    const arena = new CombatArena(scene, camera, (victory) => {
      combatEnded = true;
      victoryResult = victory;
    });

    arena.enterCombat(createTestParty(10), createMonsters(1, 2));
    assert.strictEqual(arena.combatEngine.canBlitz(), true);

    await arena.executeBlitz();

    assert.strictEqual(combatEnded, true, 'Combat ended via Blitz');
    assert.strictEqual(victoryResult, true, 'Blitz resulted in victory');
    assert.strictEqual(arena.combatEngine.isVictory(), true, 'All monsters defeated');
  });

  await t.test('4. Tactical Targeting Mode: toggling, ring visibility, and monster tint', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const arena = new CombatArena(scene, camera, () => {});

    arena.enterCombat(createTestParty(2), createMonsters(1, 2));
    arena.messageSpooler.clear();

    assert.strictEqual(arena.interactableMonsters.length, 2, '2 monster billboard meshes created');
    const firstMonster = arena.interactableMonsters[0];
    const targetRing = firstMonster.getObjectByName('targetRing');
    assert.ok(targetRing, 'Target ring exists on monster mesh');
    assert.strictEqual(targetRing.visible, false, 'Target ring initially hidden');

    // Click ATTACK button to enter targeting mode
    arena.handleButtonClick('ATTACK');
    assert.strictEqual(arena.isTargetingMode, true, 'Targeting mode is active');
    assert.strictEqual(arena.pendingTargetAction, 'ATTACK');
    assert.strictEqual(targetRing.visible, true, 'Target ring is now visible in targeting mode');
    assert.strictEqual(firstMonster.material.color.getHex(), 0xfef08a, 'Monster is tinted gold in targeting mode');

    // Click ATTACK button again to toggle targeting mode off
    arena.handleButtonClick('ATTACK');
    assert.strictEqual(arena.isTargetingMode, false, 'Targeting mode toggled off');
    assert.strictEqual(targetRing.visible, false, 'Target ring hidden after cancel');
    assert.strictEqual(firstMonster.material.color.getHex(), 0xffffff, 'Monster tint restored');
  });

  await t.test('5. handleMonsterClick routes designated target into executeCommand', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const arena = new CombatArena(scene, camera, () => {});

    arena.enterCombat(createTestParty(2), createMonsters(1, 2));
    arena.messageSpooler.clear();
    const targetMesh = arena.interactableMonsters[1];
    const targetMonsterData = targetMesh.userData.monsterData;

    let executedWithTarget = null;
    let executedWithMesh = null;
    arena.executeCommand = (action, synth, haptics, targetMonster, mMesh) => {
      executedWithTarget = targetMonster;
      executedWithMesh = mMesh;
    };

    arena.setTargetingMode(true, 'ATTACK');
    arena.handleMonsterClick(targetMesh);

    assert.strictEqual(arena.isTargetingMode, false, 'Exited targeting mode on monster click');
    assert.strictEqual(executedWithTarget, targetMonsterData, 'Passed specific monster to executeCommand');
    assert.strictEqual(executedWithMesh, targetMesh, 'Passed target mesh to executeCommand');
  });

  await t.test('6. triggerHitAnimation flashes white and displaces Z position', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const arena = new CombatArena(scene, camera, () => {});

    arena.enterCombat(createTestParty(2), createMonsters(1, 1));
    const monsterMesh = arena.interactableMonsters[0];

    const initialZ = monsterMesh.position.z;
    arena.triggerHitAnimation(monsterMesh, false);

    assert.strictEqual(monsterMesh.material.color.getHex(), 0xffffff, 'Flashed white on hit');
  });

  await t.test('7. triggerDeathAnimation creates particle burst and scales mesh down', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const arena = new CombatArena(scene, camera, () => {});

    arena.enterCombat(createTestParty(2), createMonsters(1, 1));
    const monsterMesh = arena.interactableMonsters[0];

    const initialChildrenCount = arena.arenaGroup.children.length;
    arena.triggerDeathAnimation(monsterMesh);

    // Particle burst was added to arenaGroup
    const hasPoints = arena.arenaGroup.children.some(c => c.isPoints);
    assert.ok(hasPoints, 'Death particle burst (THREE.Points) added to arena');
  });
});
