// DiceAndFactory.test.js - Self-Test Suite for Dice Utilities & MonsterFactory
// Pure ES-module test runner that can be executed directly via Node.js or imported in dev.

import { parseDiceNotation, rollDice, rollRangeInclusive, createSeededRng } from './Dice.js';
import { createMonsterCombatant } from '../combat/MonsterFactory.js';
import { getMonsterById, getMonsterBySlug } from '../../data/MonsterDatabase.js';

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
 * Runs the verification test suite covering all 12 specified test cases.
 * @returns {{ passed: number, failed: number, results: string[] }}
 */
export function runSelfTests() {
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

  // 1. parseDiceNotation("2d8+1") produces { count: 2, sides: 8, modifier: 1 }
  test('1. parseDiceNotation("2d8+1") parses correctly', () => {
    const parsed = parseDiceNotation('2d8+1');
    assert(parsed.count === 2, 'count should be 2');
    assert(parsed.sides === 8, 'sides should be 8');
    assert(parsed.modifier === 1, 'modifier should be 1');
  });

  // 2. Whitespace notation parses correctly
  test('2. Whitespace notation parses correctly', () => {
    const p1 = parseDiceNotation(' 2d16 + 1 ');
    assert(p1.count === 2 && p1.sides === 16 && p1.modifier === 1, 'failed to parse " 2d16 + 1 "');

    const p2 = parseDiceNotation('3d4 + 3');
    assert(p2.count === 3 && p2.sides === 4 && p2.modifier === 3, 'failed to parse "3d4 + 3"');

    const p3 = parseDiceNotation('2d8 - 1');
    assert(p3.count === 2 && p3.sides === 8 && p3.modifier === -1, 'failed to parse "2d8 - 1"');

    const p4 = parseDiceNotation('4d4');
    assert(p4.count === 4 && p4.sides === 4 && p4.modifier === 0, 'failed to parse "4d4"');
  });

  // 3. Invalid dice notation throws
  test('3. Invalid dice notation throws', () => {
    assertThrows(() => parseDiceNotation(''), 'empty string');
    assertThrows(() => parseDiceNotation('invalid'), 'non-dice string');
    assertThrows(() => parseDiceNotation('d4'), 'missing count');
    assertThrows(() => parseDiceNotation('2d'), 'missing sides');
    assertThrows(() => parseDiceNotation('0d6'), 'zero count');
    assertThrows(() => parseDiceNotation('2d0'), 'zero sides');
  });

  // 4. Dice results stay inside legal min/max totals
  test('4. Dice results stay inside legal min/max totals', () => {
    const rng = createSeededRng(42);
    for (let i = 0; i < 100; i++) {
      const res = rollDice('3d4+3', rng);
      assert(res.total >= 6 && res.total <= 15, `total ${res.total} out of bounds for 3d4+3 [6, 15]`);
      assert(res.rolls.length === 3, 'rolls array should have 3 items');
      res.rolls.forEach(r => assert(r >= 1 && r <= 4, `individual roll ${r} out of bounds [1, 4]`));
    }
  });

  // 5. Inclusive stat ranges can roll both min and max using injected RNG values
  test('5. Inclusive stat ranges can roll both min and max using injected RNG', () => {
    const range = { min: 4, max: 11 };
    const minRoll = rollRangeInclusive(range, () => 0.0);
    assert(minRoll === 4, `minRoll should be 4, got ${minRoll}`);

    const maxRoll = rollRangeInclusive(range, () => 0.99999999);
    assert(maxRoll === 11, `maxRoll should be 11, got ${maxRoll}`);
  });

  // 6. The same seeded RNG seed produces the same roll sequence
  test('6. Seeded RNG produces deterministic identical sequences', () => {
    const rng1 = createSeededRng('bards_tale_seed_1985');
    const rng2 = createSeededRng('bards_tale_seed_1985');

    const seq1 = Array.from({ length: 20 }, () => rollDice('2d8+1', rng1).total);
    const seq2 = Array.from({ length: 20 }, () => rollDice('2d8+1', rng2).total);

    assert(JSON.stringify(seq1) === JSON.stringify(seq2), 'seeded sequences did not match');
  });

  // 7. createMonsterCombatant(0) creates a Kobold runtime instance
  test('7. createMonsterCombatant(0) creates a Kobold runtime instance', () => {
    const kobold = createMonsterCombatant(0);
    assert(kobold.monsterSlug === 'kobold', 'slug should be kobold');
    assert(typeof kobold.instanceId === 'string' && kobold.instanceId.length > 0, 'should have instanceId');
    assert(kobold.currentHp >= 4 && kobold.currentHp <= 7, 'kobold HP range [4, 7]');
    assert(kobold.maxHp === kobold.currentHp, 'maxHp must equal currentHp on spawn');
    assert(kobold.rolledArmorClass >= 1 && kobold.rolledArmorClass <= 8, 'kobold AC range [1, 8]');
    assert(kobold.team === 'enemy', 'default team should be enemy');
    assert(Array.isArray(kobold.activeStatuses), 'activeStatuses should be array');
    assert(Array.isArray(kobold.activeBuffs), 'activeBuffs should be array');
  });

  // 8. createMonsterCombatant("green_dragon") creates a valid Green Dragon runtime instance
  test('8. createMonsterCombatant("green_dragon") creates a valid Green Dragon runtime instance', () => {
    const dragon = createMonsterCombatant('green_dragon');
    assert(dragon.monsterSlug === 'green_dragon', 'slug should be green_dragon');
    assert(dragon.maxHp >= 8 && dragon.maxHp <= 39, 'green dragon HP range [8, 39]');
    assert(dragon.rolledArmorClass >= 1 && dragon.rolledArmorClass <= 4, 'green dragon AC range [1, 4]');
  });

  // 9. Spawned HP and AC remain inside the source definition ranges
  test('9. Spawned HP and AC remain inside source definition ranges across samples', () => {
    const rng = createSeededRng(12345);
    for (let i = 0; i < 50; i++) {
      const mob = createMonsterCombatant('white_dragon', { rng });
      assert(mob.maxHp >= 14 && mob.maxHp <= 45, `White Dragon HP out of bounds: ${mob.maxHp}`);
      assert(mob.rolledArmorClass >= 1 && mob.rolledArmorClass <= 4, `White Dragon AC out of bounds: ${mob.rolledArmorClass}`);
    }
  });

  // 10. Runtime instances do not mutate frozen static monster data
  test('10. Runtime instances do not mutate frozen static monster data', () => {
    const staticKobold = getMonsterById(0);
    const originalHpMin = staticKobold.hp.min;

    const instance = createMonsterCombatant(0);
    instance.currentHp = 0; // Simulate taking lethal damage

    assert(staticKobold.hp.min === originalHpMin, 'static monster definition was mutated!');
    assert(Object.isFrozen(staticKobold), 'static monster definition must be frozen');
    assert(Object.isFrozen(staticKobold.hp), 'static monster nested hp must be frozen');
    assertThrows(() => {
      'use strict';
      staticKobold.name = 'Mutated Kobold';
    }, 'should be frozen object');
  });

  // 11. Invalid monster ID and invalid slug both throw useful errors
  test('11. Invalid monster ID and invalid slug throw descriptive errors', () => {
    assertThrows(() => createMonsterCombatant(999), 'invalid numeric ID 999');
    assertThrows(() => createMonsterCombatant('nonexistent_monster_slug'), 'invalid slug string');
    assertThrows(() => createMonsterCombatant(-1), 'negative numeric ID');
  });

  // 12. Optional summon and illusion fields are retained on a spawned instance
  test('12. Optional summon and illusion fields are retained on spawned instance', () => {
    const summon = createMonsterCombatant('wolf', {
      team: 'party',
      summonedBy: 'Kael',
      summonerInstanceId: 'hero_kael_001',
      isIllusion: true,
      instanceId: 'custom_wolf_01'
    });

    assert(summon.team === 'party', 'team override to party failed');
    assert(summon.summonedBy === 'Kael', 'summonedBy field missing');
    assert(summon.summonerInstanceId === 'hero_kael_001', 'summonerInstanceId field missing');
    assert(summon.isIllusion === true, 'isIllusion field should be true');
    assert(summon.instanceId === 'custom_wolf_01', 'instanceId override failed');
  });

  return { passed, failed: 0, results };
}

// Auto-run if executed directly via Node.js
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('DiceAndFactory.test.js')) {
  try {
    const { passed, results } = runSelfTests();
    console.log(`\n=== TEST SUITE RESULTS: ${passed}/12 PASSED ===`);
    results.forEach(r => console.log(r));
  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  }
}
