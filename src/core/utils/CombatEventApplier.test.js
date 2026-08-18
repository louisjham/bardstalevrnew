// CombatEventApplier.test.js - Test Suite for Combat Event State Application Layer
// Pure ES-module test runner that can be executed directly via Node.js or imported in dev.

import { createEncounterState, getLivingCombatants, getCombatantByInstanceId } from '../combat/EncounterState.js';
import { applyCombatEvent } from '../combat/CombatEventApplier.js';

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
 * Runs the CombatEventApplier verification test suite.
 * @returns {{ passed: number, failed: number, results: string[] }}
 */
export function runCombatEventApplierTests() {
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

  // 1. Encounter initialization marks dead combatants defeated
  test('1. Encounter initialization marks dead combatants defeated', () => {
    const state = createEncounterState({
      party: [
        { instanceId: 'h1', name: 'Paladin', currentHp: 20, maxHp: 20 },
        { instanceId: 'h2', name: 'Dead Hero', currentHp: 0, maxHp: 15 }
      ],
      enemies: [
        { instanceId: 'e1', monsterSlug: 'kobold', currentHp: 5, maxHp: 5 },
        { instanceId: 'e2', monsterSlug: 'orc', currentHp: 0, maxHp: 12 }
      ]
    });

    assert(state.party[0].isDefeated === false, 'Living hero should not be defeated');
    assert(state.party[1].isDefeated === true, 'Hero with 0 HP must be marked defeated');
    assert(state.enemies[0].isDefeated === false, 'Living enemy should not be defeated');
    assert(state.enemies[1].isDefeated === true, 'Enemy with 0 HP must be marked defeated');

    const livingParty = getLivingCombatants(state, 'party');
    const livingEnemies = getLivingCombatants(state, 'enemy');
    assert(livingParty.length === 1 && livingParty[0].instanceId === 'h1', 'Living party filter failed');
    assert(livingEnemies.length === 1 && livingEnemies[0].instanceId === 'e1', 'Living enemies filter failed');
  });

  // 2. State is immutable: original state and event remain unchanged
  test('2. State is immutable: original state and event remain unchanged', () => {
    const initialState = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Warrior', currentHp: 25, maxHp: 25 }],
      enemies: [{ instanceId: 'e1', monsterSlug: 'skeleton', currentHp: 10, maxHp: 10 }]
    });

    const event = {
      eventId: 'evt_1',
      actionKind: 'spell',
      effect: 'damageSingleTarget',
      sourceInstanceId: 'h1',
      sourceTeam: 'party',
      targetTeam: 'enemy',
      damage: { total: 4, element: 'fry' }
    };

    const frozenEventStr = JSON.stringify(event);
    const frozenStateStr = JSON.stringify(initialState);

    const newState = applyCombatEvent(initialState, event, { targetInstanceId: 'e1' });

    assert(JSON.stringify(initialState) === frozenStateStr, 'Original encounter state was mutated!');
    assert(JSON.stringify(event) === frozenEventStr, 'Event object was mutated!');
    assert(newState !== initialState, 'applyCombatEvent must return a new state reference');
    assert(newState.enemies[0].currentHp === 6, `Enemy HP should be 6 in new state, got ${newState.enemies[0].currentHp}`);
    assert(initialState.enemies[0].currentHp === 10, 'Enemy HP in original state should remain 10');
  });

  // 3. Single-target damage reduces HP and marks defeat at zero
  test('3. Single-target damage reduces HP and marks defeat at zero', () => {
    const state = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Mage', currentHp: 15, maxHp: 15 }],
      enemies: [{ instanceId: 'e1', monsterSlug: 'spider', currentHp: 6, maxHp: 6 }]
    });

    const event = {
      eventId: 'evt_dmg_1',
      actionKind: 'spell',
      effect: 'damageSingleTarget',
      sourceInstanceId: 'h1',
      damage: { total: 10, element: 'fry' }
    };

    const nextState = applyCombatEvent(state, event, { targetInstanceId: 'e1' });
    const target = getCombatantByInstanceId(nextState, 'e1');

    assert(target.currentHp === 0, `HP should be 0, got ${target.currentHp}`);
    assert(target.isDefeated === true, 'Target must be marked defeated at 0 HP');
    assert(nextState.combatLog.length === 1, 'Should log damage entry');
    assert(nextState.combatLog[0].metadata.defeated === true, 'Metadata should report defeated: true');
  });

  // 4. Group damage affects only living targets on the specified team
  test('4. Group damage affects only living targets on specified team', () => {
    const state = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Wizard', currentHp: 18, maxHp: 18 }],
      enemies: [
        { instanceId: 'e1', monsterSlug: 'orc', currentHp: 8, maxHp: 8 },
        { instanceId: 'e2', monsterSlug: 'orc', currentHp: 0, maxHp: 8, isDefeated: true },
        { instanceId: 'e3', monsterSlug: 'orc', currentHp: 12, maxHp: 12 }
      ]
    });

    const event = {
      eventId: 'evt_grp_1',
      actionKind: 'spell',
      effect: 'damageGroup',
      sourceInstanceId: 'h1',
      sourceTeam: 'party',
      targetTeam: 'enemy',
      damage: { total: 5, element: 'shock' }
    };

    const nextState = applyCombatEvent(state, event);

    const e1 = getCombatantByInstanceId(nextState, 'e1');
    const e2 = getCombatantByInstanceId(nextState, 'e2');
    const e3 = getCombatantByInstanceId(nextState, 'e3');

    assert(e1.currentHp === 3, `e1 HP should be 3, got ${e1.currentHp}`);
    assert(e2.currentHp === 0, `e2 HP should remain 0, got ${e2.currentHp}`);
    assert(e3.currentHp === 7, `e3 HP should be 7, got ${e3.currentHp}`);
    assert(nextState.combatLog.length === 2, 'Should only log for the 2 living targets');
  });

  // 5. Damage never produces negative HP
  test('5. Damage never produces negative HP', () => {
    const state = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Hero', currentHp: 5, maxHp: 20 }],
      enemies: [{ instanceId: 'e1', monsterSlug: 'dragon', currentHp: 10, maxHp: 100 }]
    });

    const breathEvent = {
      eventId: 'evt_brth',
      actionKind: 'spell',
      effect: 'damageSingleTarget',
      sourceInstanceId: 'e1',
      damage: { total: 100, element: 'freeze' }
    };

    const nextState = applyCombatEvent(state, breathEvent, { targetInstanceId: 'h1' });
    const hero = getCombatantByInstanceId(nextState, 'h1');

    assert(hero.currentHp === 0, `Hero HP must clamp to 0, got ${hero.currentHp}`);
    assert(hero.isDefeated === true, 'Hero must be defeated');
  });

  // 6. Poison status is applied once, not duplicated from the same source
  test('6. Poison status is applied once, not duplicated from same source', () => {
    const state = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Rogue', currentHp: 14, maxHp: 14 }],
      enemies: [{ instanceId: 'e1', monsterSlug: 'spider', currentHp: 8, maxHp: 8 }]
    });

    const poisonEvent = {
      eventId: 'evt_psn',
      actionKind: 'spell',
      effect: 'status',
      status: 'poison',
      sourceInstanceId: 'e1'
    };

    const stateAfter1 = applyCombatEvent(state, poisonEvent, { targetInstanceId: 'h1' });
    const hero1 = getCombatantByInstanceId(stateAfter1, 'h1');
    assert(hero1.activeStatuses.length === 1, 'Should have 1 poison status');
    assert(hero1.activeStatuses[0].status === 'poison', 'Status should be poison');

    const stateAfter2 = applyCombatEvent(stateAfter1, poisonEvent, { targetInstanceId: 'h1' });
    const hero2 = getCombatantByInstanceId(stateAfter2, 'h1');
    assert(hero2.activeStatuses.length === 1, 'Duplicate poison from same source must not be added');
    assert(stateAfter2.combatLog[stateAfter2.combatLog.length - 1].metadata.duplicate === true, 'Log should note duplicate');
  });

  // 7. Blind applies to a group
  test('7. Blind applies to a group', () => {
    const state = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Conjurer', currentHp: 10, maxHp: 10 }],
      enemies: [
        { instanceId: 'e1', monsterSlug: 'orc', currentHp: 10, maxHp: 10 },
        { instanceId: 'e2', monsterSlug: 'orc', currentHp: 10, maxHp: 10 }
      ]
    });

    const blindEvent = {
      eventId: 'evt_blnd',
      actionKind: 'spell',
      effect: 'blind',
      sourceInstanceId: 'h1',
      sourceTeam: 'party',
      targetTeam: 'enemy'
    };

    const nextState = applyCombatEvent(state, blindEvent);
    const e1 = getCombatantByInstanceId(nextState, 'e1');
    const e2 = getCombatantByInstanceId(nextState, 'e2');

    assert(e1.activeStatuses.some(s => s.status === 'blind'), 'e1 should have blind status');
    assert(e2.activeStatuses.some(s => s.status === 'blind'), 'e2 should have blind status');
  });

  // 8. AC buffs and debuffs are attached as runtime effects, not applied destructively to base stats
  test('8. AC buffs and debuffs are attached as runtime effects without mutating base stat', () => {
    const state = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Paladin', currentHp: 30, maxHp: 30, armorClass: 5 }],
      enemies: [{ instanceId: 'e1', monsterSlug: 'kobold', currentHp: 6, maxHp: 6, rolledArmorClass: 8 }]
    });

    const buffEvent = {
      eventId: 'evt_ac_buff',
      actionKind: 'spell',
      effect: 'groupBonusAC',
      sourceInstanceId: 'h1',
      sourceTeam: 'party',
      targetTeam: 'party',
      buff: { magnitude: 3 }
    };

    const debuffEvent = {
      eventId: 'evt_ac_debuff',
      actionKind: 'spell',
      effect: 'groupMalusAC',
      sourceInstanceId: 'h1',
      sourceTeam: 'party',
      targetTeam: 'enemy',
      debuff: { magnitude: 2 }
    };

    let nextState = applyCombatEvent(state, buffEvent);
    nextState = applyCombatEvent(nextState, debuffEvent);

    const hero = getCombatantByInstanceId(nextState, 'h1');
    const enemy = getCombatantByInstanceId(nextState, 'e1');

    assert(hero.armorClass === 5, `Hero base armorClass should stay 5, got ${hero.armorClass}`);
    assert(hero.activeBuffs.some(b => b.stat === 'armorClass' && b.type === 'buff' && b.magnitude === 3), 'Hero must have AC buff record');

    assert(enemy.rolledArmorClass === 8, `Enemy base rolledArmorClass should stay 8, got ${enemy.rolledArmorClass}`);
    assert(enemy.activeBuffs.some(b => b.stat === 'armorClass' && b.type === 'debuff' && b.magnitude === 2), 'Enemy must have AC debuff record');
  });

  // 9. Missing target on bonusDamage safely logs a no-op/error
  test('9. Missing target on bonusDamage safely logs a no-op/error', () => {
    const state = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Magician', currentHp: 12, maxHp: 12 }],
      enemies: []
    });

    const buffEvent = {
      eventId: 'evt_dmg_buff',
      actionKind: 'spell',
      effect: 'bonusDamage',
      sourceInstanceId: 'h1',
      buff: { magnitude: 7 }
    };

    const nextState = applyCombatEvent(state, buffEvent); // No targetInstanceId
    assert(nextState.party[0].activeBuffs.length === 0, 'No buff should be attached');
    assert(nextState.combatLog[0].metadata.success === false, 'Log should record failure');
  });

  // 10. Valid summon maps through injected resolveSummon() and creates a runtime enemy or ally
  test('10. Valid summon maps through resolveSummon and creates runtime combatant', () => {
    const state = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Conjurer', currentHp: 15, maxHp: 15 }],
      enemies: [{ instanceId: 'e1', monsterSlug: 'orc', currentHp: 10, maxHp: 10 }]
    });

    const summonEvent = {
      eventId: 'evt_sum_1',
      actionKind: 'spell',
      effect: 'summon',
      sourceInstanceId: 'h1',
      sourceTeam: 'party',
      summon: {
        monsterName: 'Wolf',
        isIllusion: false
      }
    };

    const options = {
      resolveSummon: (name) => name.toLowerCase() === 'wolf' ? 'wolf' : null
    };

    const nextState = applyCombatEvent(state, summonEvent, options);
    assert(nextState.party.length === 2, `Party should now have 2 members, got ${nextState.party.length}`);

    const summonedWolf = nextState.party[1];
    assert(summonedWolf.monsterSlug === 'wolf', 'Summoned monsterSlug should be wolf');
    assert(summonedWolf.team === 'party', 'Summoned ally should be on party team');
    assert(summonedWolf.summonedBy === 'Conjurer', 'summonedBy should record caster name');
    assert(summonedWolf.isIllusion === false, 'isIllusion should be false');
    assert(summonedWolf.currentHp > 0, 'Summoned monster must have positive HP');
  });

  // 11. Illusion summons preserve isIllusion: true
  test('11. Illusion summons preserve isIllusion: true', () => {
    const state = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Sorcerer', currentHp: 15, maxHp: 15 }],
      enemies: []
    });

    const illusionEvent = {
      eventId: 'evt_sum_ill',
      actionKind: 'spell',
      effect: 'summon',
      sourceInstanceId: 'h1',
      sourceTeam: 'party',
      summon: {
        monsterName: 'Wind Dragon',
        isIllusion: true
      }
    };

    const options = {
      resolveSummon: (name) => name.toLowerCase().includes('dragon') ? 'red_dragon' : null
    };

    const nextState = applyCombatEvent(state, illusionEvent, options);
    const dragon = nextState.party[1];
    assert(dragon !== undefined, 'Dragon summon should be present');
    assert(dragon.isIllusion === true, 'isIllusion must be true');
  });

  // 12. Summon caps prevent extra spawns
  test('12. Summon caps prevent extra spawns', () => {
    const state = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Conjurer', currentHp: 15, maxHp: 15 }],
      enemies: [],
      summonLimitPerTeam: 2
    });

    const summonEvent = {
      eventId: 'evt_sum_cap',
      actionKind: 'spell',
      effect: 'summon',
      sourceInstanceId: 'h1',
      sourceTeam: 'party',
      summon: { monsterName: 'Wolf', isIllusion: false }
    };

    const options = { resolveSummon: () => 'wolf' };

    let nextState = applyCombatEvent(state, summonEvent, options); // Summon 1
    nextState = applyCombatEvent(nextState, summonEvent, options); // Summon 2
    assert(nextState.party.length === 3, 'Party should have 1 hero + 2 summons');

    nextState = applyCombatEvent(nextState, summonEvent, options); // Summon 3 (Should fail cap)
    assert(nextState.party.length === 3, 'Party should still have 3 members (cap enforced)');
    const lastLog = nextState.combatLog[nextState.combatLog.length - 1];
    assert(lastLog.type === 'summon' && lastLog.message.includes('cap reached'), 'Should log cap reached');
  });

  // 13. Unknown special summon logs unsupported without corrupting state
  test('13. Unknown special summon logs unsupported without corrupting state', () => {
    const state = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Wizard', currentHp: 15, maxHp: 15 }],
      enemies: []
    });

    const specialSummonEvent = {
      eventId: 'evt_thor',
      actionKind: 'spell',
      effect: 'summon',
      sourceInstanceId: 'h1',
      sourceTeam: 'party',
      summon: { monsterName: 'Thor', isIllusion: false }
    };

    const options = { resolveSummon: () => null }; // Unmapped special summon

    const nextState = applyCombatEvent(state, specialSummonEvent, options);
    assert(nextState.party.length === 1, 'Party should remain 1');
    const lastLog = nextState.combatLog[nextState.combatLog.length - 1];
    assert(lastLog.type === 'system' && lastLog.message.includes('unsupported'), 'Should log unsupported summon');
  });

  // 14. Doppleganger logs unimplemented without crashing
  test('14. Doppleganger logs unimplemented without crashing', () => {
    const state = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Hero', currentHp: 20, maxHp: 20 }],
      enemies: [{ instanceId: 'e1', monsterSlug: 'doppleganger', currentHp: 10, maxHp: 10 }]
    });

    const dopEvent = {
      eventId: 'evt_dop',
      actionKind: 'special',
      effect: 'doppleganger',
      sourceInstanceId: 'e1',
      sourceMonsterSlug: 'doppleganger'
    };

    const nextState = applyCombatEvent(state, dopEvent);
    assert(nextState.enemies.length === 1, 'Enemies array intact');
    const lastLog = nextState.combatLog[nextState.combatLog.length - 1];
    assert(lastLog.metadata.special === 'doppleganger', 'Log should record doppleganger special');
  });

  // 15. Resolver unimplemented events log cleanly
  test('15. Resolver unimplemented events log cleanly', () => {
    const state = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Hero', currentHp: 20, maxHp: 20 }],
      enemies: [{ instanceId: 'e1', monsterSlug: 'boss', currentHp: 50, maxHp: 50 }]
    });

    const unimplementedEvent = {
      eventId: 'evt_unimp',
      actionKind: 'spell',
      effect: 'unimplemented',
      warning: 'Future spell effect not yet implemented.',
      sourceInstanceId: 'e1'
    };

    const nextState = applyCombatEvent(state, unimplementedEvent);
    const lastLog = nextState.combatLog[nextState.combatLog.length - 1];
    assert(lastLog.type === 'system', 'Log type should be system');
    assert(lastLog.message === 'Future spell effect not yet implemented.', 'Warning preserved');
  });

  // 16. All log entries are serializable plain objects
  test('16. All log entries are serializable plain objects', () => {
    const state = createEncounterState({
      party: [{ instanceId: 'h1', name: 'Hero', currentHp: 10, maxHp: 10 }],
      enemies: [{ instanceId: 'e1', monsterSlug: 'kobold', currentHp: 5, maxHp: 5 }]
    });

    const dmgEvent = {
      eventId: 'evt_ser',
      actionKind: 'spell',
      effect: 'damageSingleTarget',
      sourceInstanceId: 'h1',
      damage: { total: 3, element: 'fry' }
    };

    const nextState = applyCombatEvent(state, dmgEvent, { targetInstanceId: 'e1' });
    const logEntry = nextState.combatLog[0];

    assert(typeof logEntry.id === 'string', 'Log id is string');
    assert(typeof logEntry.round === 'number', 'Log round is number');
    assert(typeof logEntry.type === 'string', 'Log type is string');
    assert(typeof logEntry.message === 'string', 'Log message is string');
    assert(typeof logEntry.metadata === 'object', 'Log metadata is object');

    const jsonStr = JSON.stringify(nextState);
    const parsed = JSON.parse(jsonStr);
    assert(parsed.combatLog[0].id === logEntry.id, 'Serialized roundtrip check passed');
  });

  return { passed, failed: 0, results };
}

// Auto-run if executed directly via Node.js
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('CombatEventApplier.test.js')) {
  try {
    const { passed, results } = runCombatEventApplierTests();
    console.log(`\n=== COMBAT EVENT APPLIER TEST SUITE RESULTS: ${passed}/16 PASSED ===`);
    results.forEach(r => console.log(r));
  } catch (err) {
    console.error('\n❌ Combat Event Applier Test Suite Failed:', err);
    process.exit(1);
  }
}
