import { test } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';

// Mock document for Node environment
if (typeof document === 'undefined') {
  const mockCtx = new Proxy({
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    getImageData: () => ({ data: new Uint8ClampedArray(1024) }),
    measureText: (txt) => ({ width: (txt || '').length * 9 })
  }, {
    get: (target, prop) => (prop in target ? target[prop] : () => {})
  });

  globalThis.document = {
    createElement: () => ({
      width: 512,
      height: 512,
      getContext: () => mockCtx
    })
  };

  if (typeof Image === 'undefined') {
    globalThis.Image = class {
      constructor() {
        this.width = 64;
        this.height = 64;
        setTimeout(() => { if (this.onload) this.onload(); }, 0);
      }
    };
  }
}

import { MessageSpooler } from './MessageSpooler.js';
import { SpatialCombatScroll } from '../../ui/spatial-hud/SpatialCombatScroll.js';
import { CombatEngine } from '../combat/CombatEngine.js';
import { CombatArena } from '../../world/combat-zone/CombatArena.js';
import { CombatNarrativeGrammar, getWeaponCategory, getMonsterAttackVerb, formatCombatEvent } from '../combat/CombatNarrativeGrammar.js';

test('1. MessageSpooler FIFO sequential processing and isProcessing flag', async () => {
  const yieldedChars = [];
  const completedLines = [];

  const spooler = new MessageSpooler({
    charDelay: 2, // Fast for unit tests
    lineDelay: 10,
    onChar: (char) => yieldedChars.push(char),
    onLineComplete: (line) => completedLines.push(line)
  });

  assert.strictEqual(spooler.isProcessing, false);

  const inputMessages = ['Strike 1!', 'Foe slain!'];
  spooler.enqueue(inputMessages);

  assert.strictEqual(spooler.isProcessing, true);

  // Wait until queue is completely finished
  await new Promise(resolve => {
    spooler.on('complete', resolve);
  });

  assert.strictEqual(spooler.isProcessing, false);
  assert.deepStrictEqual(completedLines, ['Strike 1!', 'Foe slain!']);
  assert.strictEqual(yieldedChars.join(''), 'Strike 1!Foe slain!');
});

test('2. MessageSpooler audio hook triggers synth.playTypewriterClick and audioClick event', async () => {
  let clickCount = 0;
  let eventClickCount = 0;

  const mockSynth = {
    playTypewriterClick: () => {
      clickCount++;
    }
  };

  const spooler = new MessageSpooler({
    charDelay: 1,
    lineDelay: 5,
    synth: mockSynth,
    onAudioClick: () => {
      eventClickCount++;
    }
  });

  const testText = 'Click!';
  spooler.enqueue(testText);

  await new Promise(resolve => {
    spooler.on('complete', resolve);
  });

  assert.strictEqual(clickCount, testText.length);
  assert.strictEqual(eventClickCount, testText.length);
});

test('3. MessageSpooler clear() flushes queue and resets isProcessing', async () => {
  const completedLines = [];
  const spooler = new MessageSpooler({
    charDelay: 20,
    lineDelay: 800,
    onLineComplete: (line) => completedLines.push(line)
  });

  spooler.enqueue(['Line One', 'Line Two', 'Line Three']);
  assert.strictEqual(spooler.isProcessing, true);

  spooler.clear();
  assert.strictEqual(spooler.isProcessing, false);
  assert.strictEqual(spooler.queue.length, 0);
});

test('4. SpatialCombatScroll geometry, texture, and filter specs', () => {
  const scroll = new SpatialCombatScroll({
    radius: 2.0,
    height: 1.0,
    radialSegments: 32,
    thetaLength: 0.6
  });

  assert.ok(scroll.mesh instanceof THREE.Mesh);
  assert.ok(scroll.geometry instanceof THREE.CylinderGeometry);
  assert.ok(scroll.texture instanceof THREE.CanvasTexture);

  // Parameters check
  assert.strictEqual(scroll.geometry.parameters.radiusTop, 2.0);
  assert.strictEqual(scroll.geometry.parameters.radiusBottom, 2.0);
  assert.strictEqual(scroll.geometry.parameters.height, 1.0);
  assert.strictEqual(scroll.geometry.parameters.radialSegments, 32);
  assert.strictEqual(scroll.geometry.parameters.thetaLength, 0.6);

  // NearestFilter check for crisp retro pixel fonts
  assert.strictEqual(scroll.texture.minFilter, THREE.NearestFilter);
  assert.strictEqual(scroll.texture.magFilter, THREE.NearestFilter);

  // Material double sided for viewing inner cylinder face
  assert.strictEqual(scroll.material.side, THREE.DoubleSide);

  // Camera space lower-right transform
  assert.ok(scroll.mesh.position.x > 0.4); // Right quadrant
  assert.ok(scroll.mesh.position.y < 0);   // Lower quadrant
  assert.ok(scroll.mesh.position.z < 0);   // Forward in front of camera
  assert.ok(scroll.mesh.rotation.y < 0);   // Angled inward

  scroll.dispose();
});

test('5. SpatialCombatScroll typewriter rendering, pixel scrolling, and texture update', () => {
  let drawImageCalled = false;
  let clearRectCalled = false;

  const scroll = new SpatialCombatScroll({
    lineHeight: 24
  });

  // Track drawImage and clearRect calls
  const origDrawImage = scroll.ctx.drawImage;
  const origClearRect = scroll.ctx.clearRect;

  scroll.ctx.drawImage = function(img, dx, dy) {
    if (dy === -scroll.lineHeight) drawImageCalled = true;
    if (origDrawImage) origDrawImage.apply(this, arguments);
  };
  scroll.ctx.clearRect = function(x, y, w, h) {
    clearRectCalled = true;
    if (origClearRect) origClearRect.apply(this, arguments);
  };

  const initialVersion = scroll.texture.version;
  scroll.startMessage('Test Combat Message');
  scroll.writeChar('A');

  // Three.js increments texture.version when texture.needsUpdate = true is set
  assert.ok(scroll.texture.version > initialVersion, 'texture.needsUpdate must increment texture.version');

  // Force cursor past canvas height to trigger scrolling
  scroll.currentY = scroll.canvasHeight + 10;
  scroll.newLine();

  assert.strictEqual(drawImageCalled, true);
  assert.strictEqual(clearRectCalled, true);

  scroll.dispose();
});

test('6. CombatArena instantiates SpatialCombatScroll in camera space and connects MessageSpooler', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const arena = new CombatArena(scene, camera, () => {});

  assert.ok(arena.combatScroll instanceof SpatialCombatScroll);
  assert.ok(arena.messageSpooler instanceof MessageSpooler);

  // Scroll mesh attached to camera space
  assert.strictEqual(arena.combatScroll.mesh.parent, camera);

  // When MessageSpooler is processing, attack buttons are disabled
  arena.messageSpooler.isProcessing = true;
  arena.updateButtonVisuals();

  // Attempting to execute command during processing must be blocked
  arena.activeMonsters = [{ name: 'Skeleton', currentHp: 10, hp: 10 }];
  arena.activeParty = [{ name: 'Brian', class: 'Paladin', currentHp: 20, hp: 20 }];
  const initialTurn = arena.combatEngine.currentTurn;

  arena.executeCommand('ATTACK');
  assert.strictEqual(arena.combatEngine.currentTurn, initialTurn, 'Turn must not advance while MessageSpooler is processing');

  arena.messageSpooler.isProcessing = false;
  arena.updateButtonVisuals();
  arena.combatScroll.dispose();
});

test('7. CombatEngine returns separate scratch buffers for turn action and monster phase', () => {
  const engine = new CombatEngine();
  const party = [
    { name: 'Warrior', class: 'Warrior', hp: 30, currentHp: 30, ac: 5, damage: 10 }
  ];
  const monsters = [
    { name: 'Goblin', hp: 15, currentHp: 15, ac: 8, damage: 4 }
  ];

  engine.startEncounter(party, monsters);

  const turnResult = engine.executeTurnAction(party[0], 'ATTACK', monsters[0]);
  const turnMsgs = [...turnResult.messages];

  const monsterMsgs = engine.executeMonsterPhase();

  // Verify monsterMsgs did not mutate or wipe turnResult messages
  assert.ok(Array.isArray(turnMsgs));
  assert.ok(Array.isArray(monsterMsgs));
  assert.notStrictEqual(turnResult.messages, monsterMsgs, 'Turn messages and monster messages must have independent buffers');
});

test('8. CombatNarrativeGrammar formats sentences according to 1985 token grammar', () => {
  // Sword hit with kill
  const swordKill = formatCombatEvent({
    attacker: 'Brian',
    weaponType: 'sword',
    target: 'Skeleton',
    hit: true,
    damage: 12,
    targetDied: true
  });
  assert.strictEqual(swordKill, '⚔️ Brian swings at Skeleton and hits for 12 pts of damage, killing it!');

  // Axe heave
  const axeHit = formatCombatEvent({
    attacker: 'Thor',
    weaponType: 'axe',
    target: 'Goblin',
    hit: true,
    damage: 9
  });
  assert.strictEqual(axeHit, 'Thor heaves at Goblin and hits for 9 pts of damage.');

  // Dagger lunge miss
  const daggerMiss = formatCombatEvent({
    attacker: 'Gareth',
    weaponType: 'dagger',
    target: 'Mad Dog',
    hit: false
  });
  assert.strictEqual(daggerMiss, 'Gareth lunges at Mad Dog but misses!');

  // Bow arrow hit
  const bowHit = formatCombatEvent({
    attacker: 'Robin',
    weaponType: 'bow',
    target: 'Orc',
    hit: true,
    damage: 7
  });
  assert.strictEqual(bowHit, 'Robin fires an arrow at Orc and hits for 7 pts of damage.');

  // Unarmed monk strike
  const monkHit = formatCombatEvent({
    attacker: 'Kwai',
    weaponType: 'unarmed',
    target: 'Bandit',
    hit: true,
    damage: 6
  });
  assert.strictEqual(monkHit, 'Kwai strikes at Bandit and hits for 6 pts of damage.');

  // Monster bite
  const wolfBite = formatCombatEvent({
    attacker: 'Wolf',
    attackerIsParty: false,
    customVerb: 'snaps at',
    target: 'Brian',
    hit: true,
    damage: 4,
    targetIsParty: true
  });
  assert.strictEqual(wolfBite, 'Wolf snaps at Brian and hits for 4 pts of damage.');

  // Monster status affliction
  const spiderPoison = formatCombatEvent({
    attacker: 'Spider',
    attackerIsParty: false,
    customVerb: 'stings at',
    target: 'Brian',
    hit: true,
    damage: 3,
    condition: 'poisoned',
    targetIsParty: true
  });
  assert.strictEqual(spiderPoison, 'Spider stings at Brian and hits for 3 pts of damage and is poisoned!');

  // Critical hit
  const critHit = formatCombatEvent({
    attacker: 'Thor',
    weaponType: 'axe',
    target: 'Ogre',
    hit: true,
    critical: true,
    damage: 24
  });
  assert.strictEqual(critHit, '💥 Thor heaves at Ogre and critically strikes for 24 pts of damage.');

  // Weapon classification helper
  assert.strictEqual(getWeaponCategory({ equipped: { weapon: { name: 'Broadsword' } } }), 'sword');
  assert.strictEqual(getWeaponCategory({ equipped: { weapon: { name: 'Battleaxe' } } }), 'axe');
  assert.strictEqual(getWeaponCategory({ equipped: { weapon: { name: 'Silver Dagger' } } }), 'dagger');
  assert.strictEqual(getWeaponCategory({ equipped: { weapon: { name: 'Oak Staff' } } }), 'staff');
  assert.strictEqual(getWeaponCategory({ class: 'Monk' }), 'unarmed');
});

test('9. MessageSpooler enqueueAndWait returns a Promise that completes after delay', async () => {
  const spooler = new MessageSpooler({
    charDelay: 1,
    lineDelay: 10
  });

  const startTime = Date.now();
  await spooler.enqueueAndWait(['Test Sentence A', 'Test Sentence B']);
  const elapsed = Date.now() - startTime;

  assert.strictEqual(spooler.isProcessing, false);
  assert.strictEqual(spooler.queue.length, 0);
  assert.ok(elapsed >= 15, 'Must wait for both lines and lineDelays');
});

test('10. CombatArena executeCommand runs async action-by-action round resolution', async () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const arena = new CombatArena(scene, camera, () => {});

  // Fast spooler for unit testing
  arena.messageSpooler.charDelay = 1;
  arena.messageSpooler.lineDelay = 2;

  const party = [
    { name: 'Sir Brian', class: 'Paladin', hp: 30, currentHp: 30, ac: 4, damage: 10 },
    { name: 'Ariel', class: 'Conjurer', hp: 16, currentHp: 16, sp: 20, maxSp: 20, ac: 8 }
  ];
  const monsters = [
    { name: 'Skeleton', hp: 8, currentHp: 8, ac: 9, damage: 4 }
  ];

  arena.enterCombat(party, monsters);
  // Clear initial encounter intro messages for round testing
  arena.messageSpooler.clear();

  assert.strictEqual(arena.isRoundInProgress, false);
  assert.strictEqual(arena.messageSpooler.isProcessing, false);

  // Execute round
  const cmdPromise = arena.executeCommand('ATTACK');
  assert.strictEqual(arena.isRoundInProgress, true, 'isRoundInProgress must be true during round');

  // Attempting second command while round is running must be ignored
  arena.executeCommand('ATTACK');

  await cmdPromise;
  assert.strictEqual(arena.isRoundInProgress, false, 'isRoundInProgress must reset to false after round ends');

  arena.leaveCombat(true);
});
