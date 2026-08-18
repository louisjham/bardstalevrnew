// CombatSandbox.test.js - Verification Suite for Headless Combat Sandbox
// Pure ES-module test runner that can be executed directly via Node.js or imported in dev.

import { createCombatSandbox, DEFAULT_SANDBOX_PARTY } from '../combat/CombatSandbox.js';
import { getMonsterById, getMonsterBySlug } from '../../data/MonsterDatabase.js';
import { getSpellById } from '../../data/SpellDatabase.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[AssertionFailed] ${message}`);
  }
}

function assertThrows(fn, message) {
  let threw = false;
  try {
    fn();
  } catch (err) {
    threw = true;
  }
  if (!threw) {
    throw new Error(`[AssertionFailed] Expected function to throw: ${message}`);
  }
}

/**
 * Runs the CombatSandbox verification test suite.
 * @returns {{ passed: number, failed: number, results: string[] }}
 */
export function runCombatSandboxTests() {
  const results = [];
  let passed = 0;

  function test(name, fn) {
    try {
      fn();
      passed++;
      results.push(`✅ PASS: ${name}`);
    } catch (err) {
      results.push(`❌ FAIL: ${name} - ${err.message}`);
      throw err;
    }
  }

  // 1. Default sandbox produces six valid party members
  test('1. Default sandbox produces six valid party members', () => {
    const sandbox = createCombatSandbox({ seed: 123 });
    const state = sandbox.getSandboxState();

    assert(state.party.length === 6, `Expected 6 party members, got ${state.party.length}`);
    assert(state.party[0].name.includes('Paladin'), 'First hero should be Paladin');
    assert(state.party[0].currentHp === 28, 'Paladin HP should be 28');
    assert(state.party[5].name.includes('Magician'), 'Sixth hero should be Magician');
    state.party.forEach((hero, idx) => {
      assert(hero.team === 'party', `Hero ${idx} must have team "party"`);
      assert(hero.isDefeated === false, `Hero ${idx} must not be defeated`);
      assert(hero.currentHp > 0, `Hero ${idx} must have positive HP`);
    });
  });

  // 2. Spawning Kobold by ID and Green Dragon by slug works
  test('2. Spawning Kobold by ID and Green Dragon by slug works', () => {
    const sandbox = createCombatSandbox({ seed: 42 });

    const kobold = sandbox.spawnSandboxMonster(0); // ID 0 = kobold
    assert(kobold.monsterSlug === 'kobold', `Expected slug "kobold", got "${kobold.monsterSlug}"`);
    assert(kobold.team === 'enemy', 'Default team should be enemy');

    const dragon = sandbox.spawnSandboxMonster('green_dragon'); // Slug
    assert(dragon.monsterSlug === 'green_dragon', `Expected slug "green_dragon", got "${dragon.monsterSlug}"`);

    const state = sandbox.getSandboxState();
    assert(state.enemies.length === 2, `Expected 2 enemies in state, got ${state.enemies.length}`);
  });

  // 3. Same seed plus same monster spawn sequence produces equal rolled HP/AC values
  test('3. Same seed produces identical rolled monster HP/AC values', () => {
    const sb1 = createCombatSandbox({ seed: 'test_seed_1985' });
    const k1 = sb1.spawnSandboxMonster('white_dragon');
    const o1 = sb1.spawnSandboxMonster('ogre');

    const sb2 = createCombatSandbox({ seed: 'test_seed_1985' });
    const k2 = sb2.spawnSandboxMonster('white_dragon');
    const o2 = sb2.spawnSandboxMonster('ogre');

    assert(k1.currentHp === k2.currentHp, `White Dragon HP mismatch: ${k1.currentHp} vs ${k2.currentHp}`);
    assert(k1.rolledArmorClass === k2.rolledArmorClass, `White Dragon AC mismatch: ${k1.rolledArmorClass} vs ${k2.rolledArmorClass}`);
    assert(o1.currentHp === o2.currentHp, `Ogre HP mismatch: ${o1.currentHp} vs ${o2.currentHp}`);
    assert(o1.rolledArmorClass === o2.rolledArmorClass, `Ogre AC mismatch: ${o1.rolledArmorClass} vs ${o2.rolledArmorClass}`);
  });

  // 4. Action listing includes physical action and source actions in correct order
  test('4. Action listing includes physical action and source actions in correct order', () => {
    const sandbox = createCombatSandbox({ seed: 100 });
    const conjurer = sandbox.spawnSandboxMonster('conjurer_20'); // id 20: ARC FIRE, FREEZE FOES, BATTLESKILL

    const actions = sandbox.listAvailableMonsterActions(conjurer.instanceId);
    assert(actions.length === 4, `Expected 4 actions (1 physical + 3 spells), got ${actions.length}`);

    assert(actions[0].index === 0, 'Action 0 must be physical');
    assert(actions[0].kind === 'physical', 'Action 0 kind must be physical');

    assert(actions[1].index === 1 && actions[1].spellId === 1, 'Action 1 must be ARC FIRE (spellId 1)');
    assert(actions[1].spellName === 'Arc Fire', `Action 1 spellName should be Arc Fire, got ${actions[1].spellName}`);
    assert(actions[1].canonicalSpell !== null, 'Action 1 must include canonical spell metadata');

    assert(actions[2].index === 2 && actions[2].spellId === 4, 'Action 2 must be FREEZE FOES (spellId 4)');
    assert(actions[3].index === 3 && actions[3].spellId === 6, 'Action 3 must be BATTLESKILL (spellId 6)');
  });

  // 5. A physical action applies damage to a selected party target
  test('5. Physical action applies damage to selected party target', () => {
    const sandbox = createCombatSandbox({ seed: 777 });
    const orc = sandbox.spawnSandboxMonster('orc');

    const paladinId = 'hero_paladin_01';
    const stateBefore = sandbox.getSandboxState();
    const paladinBefore = stateBefore.party.find(h => h.instanceId === paladinId);
    const initialHp = paladinBefore.currentHp;

    const stateAfter = sandbox.executeSandboxMonsterAction(orc.instanceId, 0, { targetInstanceId: paladinId });
    const paladinAfter = stateAfter.party.find(h => h.instanceId === paladinId);

    assert(paladinAfter.currentHp < initialHp, `Paladin HP should be reduced below ${initialHp}, got ${paladinAfter.currentHp}`);
    assert(stateAfter.combatLog.length === 1, 'Combat log should record physical attack');
    assert(stateAfter.combatLog[0].type === 'damage', 'Log type should be damage');
  });

  // 6. ARC FIRE can be executed through the canonical spell registry and event resolver
  test('6. ARC FIRE can be executed through canonical spell registry and resolver', () => {
    const sandbox = createCombatSandbox({ seed: 555 });
    const conjurer = sandbox.spawnSandboxMonster('conjurer_06'); // id 6, action 1 is ARC FIRE (1x(level+1)d4)

    const stateAfter = sandbox.executeSandboxMonsterAction(conjurer.instanceId, 1, { targetInstanceId: 'hero_warrior_02' });
    const warrior = stateAfter.party.find(h => h.instanceId === 'hero_warrior_02');

    assert(warrior.currentHp < 32, `Warrior HP should be reduced from 32, got ${warrior.currentHp}`);
    const lastLog = stateAfter.combatLog[stateAfter.combatLog.length - 1];
    assert(lastLog.message.includes('Arc Fire') || lastLog.message.includes('ARC FIRE'), `Log should mention Arc Fire: ${lastLog.message}`);
    assert(lastLog.metadata.element === 'fry', 'Damage element must be canonical fry');
  });

  // 7. A group spell such as WARSTRIKE damages all living party members
  test('7. Group spell such as WARSTRIKE damages all living party members', () => {
    const sandbox = createCombatSandbox({ seed: 888 });
    const sorcerer = sandbox.spawnSandboxMonster('sorcerer_22'); // id 22, action 1 is WARSTRIKE (4d4 group)

    const stateAfter = sandbox.executeSandboxMonsterAction(sorcerer.instanceId, 1);
    stateAfter.party.forEach((hero, idx) => {
      const maxHp = DEFAULT_SANDBOX_PARTY[idx].maxHp;
      assert(hero.currentHp < maxHp, `Hero ${hero.name} should take group damage from Warstrike (HP: ${hero.currentHp}/${maxHp})`);
    });
  });

  // 8. A summon spell such as INSTANT WOLF creates an enemy wolf
  test('8. Summon spell such as INSTANT WOLF creates an enemy wolf', () => {
    const sandbox = createCombatSandbox({ seed: 999 });
    const wizard = sandbox.spawnSandboxMonster('wizard_23'); // id 23, action 3 is SUMMON DEAD (Skeleton/Zombie)

    const stateBefore = sandbox.getSandboxState();
    assert(stateBefore.enemies.length === 1, 'Initially 1 enemy');

    const stateAfter = sandbox.executeSandboxMonsterAction(wizard.instanceId, 3);
    assert(stateAfter.enemies.length === 2, `Expected 2 enemies after summon, got ${stateAfter.enemies.length}`);

    const summonedMob = stateAfter.enemies[1];
    assert(summonedMob.summonedBy === wizard.monsterSlug, 'summonedBy should match caster');
    assert(summonedMob.isIllusion === false, 'isIllusion should be false for SUMMON DEAD');
  });

  // 9. An illusion summon such as WIND WOLF creates an enemy wolf with isIllusion: true
  test('9. Illusion summon creates monster with isIllusion: true', () => {
    const sandbox = createCombatSandbox({ seed: 333 });
    const sorcerer = sandbox.spawnSandboxMonster('sorcerer_53'); // id 53, actions: [SPECTRE TOUCH (1), WIND WOLF (2), CURSE (3)]

    const stateAfter = sandbox.executeSandboxMonsterAction(sorcerer.instanceId, 2);
    const summonedWolf = stateAfter.enemies[1];

    assert(summonedWolf !== undefined, 'Summoned creature should be present');
    assert(summonedWolf.monsterSlug === 'wolf', `Expected slug "wolf", got "${summonedWolf.monsterSlug}"`);
    assert(summonedWolf.isIllusion === true, 'isIllusion must be true for Wind Wolf');
  });

  // 10. A choice-pool summon produces a valid deterministic result
  test('10. Choice-pool summon produces valid deterministic result', () => {
    const sb1 = createCombatSandbox({ seed: 'pool_seed_1' });
    const w1 = sb1.spawnSandboxMonster('wizard_23'); // SUMMON DEAD -> "Skeleton/Zombie"
    const st1 = sb1.executeSandboxMonsterAction(w1.instanceId, 3);
    const slug1 = st1.enemies[1].monsterSlug;

    const sb2 = createCombatSandbox({ seed: 'pool_seed_1' });
    const w2 = sb2.spawnSandboxMonster('wizard_23');
    const st2 = sb2.executeSandboxMonsterAction(w2.instanceId, 3);
    const slug2 = st2.enemies[1].monsterSlug;

    assert(slug1 === 'skeleton' || slug1 === 'zombie', `Spawned slug must be in pool, got "${slug1}"`);
    assert(slug1 === slug2, `Deterministic choice pool mismatch: "${slug1}" vs "${slug2}"`);
  });

  // 11. Unsupported special summons log cleanly without corrupting state
  test('11. Unsupported special summons log cleanly without corrupting state', () => {
    const sandbox = createCombatSandbox({ seed: 101 });
    const wizard = sandbox.spawnSandboxMonster('wizard_69'); // actions include summons

    const stateBefore = sandbox.getSandboxState();
    const stateAfter = sandbox.executeSandboxMonsterAction(wizard.instanceId, 1, {
      resolveSummon: () => null
    });

    assert(stateAfter.enemies.length === stateBefore.enemies.length, 'Unsupported summon should not add enemy');
    const lastLog = stateAfter.combatLog[stateAfter.combatLog.length - 1];
    assert(lastLog.type === 'system', `Log type should be system, got ${lastLog.type}`);
    assert(lastLog.message.includes('unsupported'), `Log should note unsupported summon: ${lastLog.message}`);
  });

  // 12. Reset restores a clean default sandbox state
  test('12. Reset restores a clean default sandbox state', () => {
    const sandbox = createCombatSandbox({ seed: 444 });
    const mob = sandbox.spawnSandboxMonster('ogre');
    sandbox.executeSandboxMonsterAction(mob.instanceId, 0);

    const dirtyState = sandbox.getSandboxState();
    assert(dirtyState.enemies.length === 1, 'Should have 1 enemy before reset');
    assert(dirtyState.combatLog.length > 0, 'Should have combat log entries before reset');

    const cleanState = sandbox.resetSandbox();
    assert(cleanState.enemies.length === 0, 'Enemies must be empty after reset');
    assert(cleanState.combatLog.length === 0, 'Combat log must be empty after reset');
    assert(cleanState.round === 1, 'Round must be 1 after reset');
    assert(cleanState.party.length === 6, 'Party must have 6 members after reset');
    assert(cleanState.party[0].currentHp === DEFAULT_SANDBOX_PARTY[0].maxHp, 'Party HP must be restored');
    assert(sandbox.getSeed() === 444, 'Seed should be preserved across reset');
  });

  // 13. Static monster/spell data and prior state snapshots are not mutated
  test('13. Static monster/spell data and prior state snapshots are not mutated', () => {
    const sandbox = createCombatSandbox({ seed: 2026 });
    const dragon = sandbox.spawnSandboxMonster('black_dragon'); // id 116

    const snapshot1 = sandbox.getSandboxState();
    const staticMonster = getMonsterBySlug('black_dragon');
    const staticSpell = getSpellById(84); // Black Dragon Breath

    sandbox.executeSandboxMonsterAction(dragon.instanceId, 1); // Breath
    const snapshot2 = sandbox.getSandboxState();

    assert(snapshot1.party[0].currentHp !== snapshot2.party[0].currentHp, 'Snapshot 2 should have taken damage');
    assert(snapshot1.party[0].currentHp === DEFAULT_SANDBOX_PARTY[0].maxHp, 'Snapshot 1 must remain unmutated');

    assert(Object.isFrozen(staticMonster), 'Static monster record must be frozen');
    assert(Object.isFrozen(staticSpell), 'Static spell record must be frozen');
  });

  // 14. The full sandbox action sequence is deterministic with the same seed
  test('14. Full sandbox action sequence is deterministic with same seed', () => {
    function runSimulation(seed) {
      const sb = createCombatSandbox({ seed });
      const boss = sb.spawnSandboxMonster('mangar'); // id 117
      sb.executeSandboxMonsterAction(boss.instanceId, 0); // Physical slam
      sb.executeSandboxMonsterAction(boss.instanceId, 1); // Greater summon
      sb.executeSandboxMonsterAction(boss.instanceId, 4); // Dragon breath
      const state = sb.getSandboxState();
      return {
        party: state.party.map(h => ({ name: h.name, currentHp: h.currentHp, maxHp: h.maxHp, isDefeated: h.isDefeated })),
        enemies: state.enemies.map(e => ({ slug: e.monsterSlug, currentHp: e.currentHp, maxHp: e.maxHp, ac: e.rolledArmorClass, isDefeated: e.isDefeated })),
        messages: state.combatLog.map(l => ({ type: l.type, message: l.message, metadata: l.metadata }))
      };
    }

    const runA = runSimulation('mangar_showdown_seed');
    const runB = runSimulation('mangar_showdown_seed');

    assert(JSON.stringify(runA) === JSON.stringify(runB), 'Simulation states with same seed did not match identically');
    assert(runA.enemies.length === 2, 'Should have boss + summoned demon');
    assert(runA.messages.length >= 3, 'Should have executed actions');
  });

  return { passed, failed: 0, results };
}

// Auto-run if executed directly via Node.js
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('CombatSandbox.test.js')) {
  try {
    const { passed, results } = runCombatSandboxTests();
    console.log(`\n=== COMBAT SANDBOX TEST SUITE RESULTS: ${passed}/14 PASSED ===`);
    results.forEach(r => console.log(r));
  } catch (err) {
    console.error('\n❌ Combat Sandbox Test Suite Failed:', err);
    process.exit(1);
  }
}
