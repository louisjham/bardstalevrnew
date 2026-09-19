// ConditionSystem.test.js - Comprehensive Test Suite for Authentic 8 BT1 Character Conditions
import { BT1Condition, CONDITION_BY_BYTE, ConditionSystem } from './ConditionSystem.js';
import { CombatEngine } from '../combat/CombatEngine.js';
import { RecoveryEngine } from '../recovery/RecoverySystem.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[AssertionFailed] ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`[AssertionFailed] ${message} - Expected: ${expected}, Got: ${actual}`);
  }
}

export function runConditionSystemTests() {
  const results = [];
  let passed = 0;

  function test(name, fn) {
    try {
      fn();
      passed++;
      results.push(`✅ PASS: ${name}`);
    } catch (err) {
      results.push(`❌ FAIL: ${name} - ${err.message}`);
    }
  }

  // ─── 1. Exact 8 Canonical Condition Bytes ──────────────────────────────
  test('Exact 8 Status Byte Encodings and Codes', () => {
    assertEquals(BT1Condition.ALIVE.byte, 0x00, 'Alive is 0x00');
    assertEquals(BT1Condition.POISONED.byte, 0x02, 'Poisoned is 0x02');
    assertEquals(BT1Condition.OLD.byte, 0x04, 'Old/Withered is 0x04');
    assertEquals(BT1Condition.DEAD.byte, 0x08, 'Dead is 0x08');
    assertEquals(BT1Condition.STONED.byte, 0x10, 'Stoned/Petrified is 0x10');
    assertEquals(BT1Condition.PARALYZED.byte, 0x20, 'Paralyzed is 0x20');
    assertEquals(BT1Condition.POSSESSED.byte, 0x40, 'Possessed is 0x40');
    assertEquals(BT1Condition.NUTS.byte, 0x80, 'Nuts/Insane is 0x80');

    assertEquals(CONDITION_BY_BYTE[0x00].code, 'ALIVE');
    assertEquals(CONDITION_BY_BYTE[0x02].code, 'POIS');
    assertEquals(CONDITION_BY_BYTE[0x04].code, 'OLD');
    assertEquals(CONDITION_BY_BYTE[0x08].code, 'DEAD');
    assertEquals(CONDITION_BY_BYTE[0x10].code, 'STON');
    assertEquals(CONDITION_BY_BYTE[0x20].code, 'PARA');
    assertEquals(CONDITION_BY_BYTE[0x40].code, 'POSS');
    assertEquals(CONDITION_BY_BYTE[0x80].code, 'NUTS');
  });

  // ─── 2. Action Legality (canTakeTurn) ──────────────────────────────────
  test('Action Legality: Dead, Stoned, and Paralyzed cannot act; others can', () => {
    assert(ConditionSystem.canTakeTurn({ hp: 20, condition: 'ALIVE' }), 'Alive can act');
    assert(ConditionSystem.canTakeTurn({ hp: 15, condition: 'POIS' }), 'Poisoned can act');
    assert(ConditionSystem.canTakeTurn({ hp: 10, condition: 'OLD' }), 'Old/Withered can act');
    assert(ConditionSystem.canTakeTurn({ hp: 18, condition: 'POSS' }), 'Possessed can act (against party)');
    assert(ConditionSystem.canTakeTurn({ hp: 14, condition: 'NUTS' }), 'Insane can act');

    assert(!ConditionSystem.canTakeTurn({ hp: 0, condition: 'DEAD' }), 'Dead cannot act');
    assert(!ConditionSystem.canTakeTurn({ hp: 0, condition: 'STON' }), 'Stoned cannot act');
    assert(!ConditionSystem.canTakeTurn({ hp: 20, condition: 'PARA' }), 'Paralyzed cannot act');
    assert(!ConditionSystem.canTakeTurn({ hp: 0, condition: 'ALIVE' }), 'Zero HP cannot act');
  });

  // ─── 3. Allegiance & Erratic States ────────────────────────────────────
  test('Possessed is hostile to party, Insane is erratic', () => {
    assert(ConditionSystem.isHostileToParty({ condition: 'POSS' }), 'POSS is hostile to party');
    assert(!ConditionSystem.isHostileToParty({ condition: 'ALIVE' }), 'ALIVE is not hostile');

    assert(ConditionSystem.isErratic({ condition: 'NUTS' }), 'NUTS is erratic');
    assert(!ConditionSystem.isErratic({ condition: 'ALIVE' }), 'ALIVE is not erratic');
  });

  // ─── 4. Reversible Withering (OLD) Modifiers ────────────────────────────
  test('Old/Withered (OLD) sets effective stats to 1 and adds AC penalty without mutating base stats', () => {
    const hero = {
      name: 'Elric',
      st: 18, iq: 14, dx: 16, cn: 15, lk: 12,
      ac: 4,
      condition: 'OLD'
    };

    const effStats = ConditionSystem.getEffectiveAttributes(hero);
    assertEquals(effStats.st, 1, 'Effective ST is 1');
    assertEquals(effStats.iq, 1, 'Effective IQ is 1');
    assertEquals(effStats.dx, 1, 'Effective DX is 1');
    assertEquals(effStats.cn, 1, 'Effective CN is 1');
    assertEquals(effStats.lk, 1, 'Effective LK is 1');

    // Underlying base stats MUST remain intact!
    assertEquals(hero.st, 18, 'Base ST remains 18');
    assertEquals(hero.iq, 14, 'Base IQ remains 14');
    assertEquals(hero.dx, 16, 'Base DX remains 16');

    // AC penalty
    assertEquals(ConditionSystem.getEffectiveACPenalty(hero), 4, 'OLD adds +4 AC penalty');

    // Curing withering restores effective stats to base
    ConditionSystem.cureCondition(hero);
    const restoredStats = ConditionSystem.getEffectiveAttributes(hero);
    assertEquals(restoredStats.st, 18, 'Restored ST is 18');
    assertEquals(ConditionSystem.getEffectiveACPenalty(hero), 0, 'AC penalty removed');
  });

  // ─── 5. Poison Tick Damage & Death Transition ──────────────────────────
  test('Poison tick drains HP and transitions to DEAD when reaching 0', () => {
    const hero = { name: 'Gaelen', currentHp: 5, condition: 'POIS' };

    const tick1 = ConditionSystem.applyPoisonTick(hero, 3);
    assert(tick1.damaged, 'Damaged');
    assertEquals(hero.currentHp, 2, 'HP reduced to 2');
    assertEquals(hero.condition, 'POIS', 'Still poisoned');
    assert(!tick1.died, 'Not dead yet');

    const tick2 = ConditionSystem.applyPoisonTick(hero, 3);
    assert(tick2.damaged, 'Damaged');
    assertEquals(hero.currentHp, 0, 'HP reduced to 0');
    assertEquals(hero.condition, 'DEAD', 'Condition transitioned to DEAD');
    assert(tick2.died, 'Hero died from poison');
  });

  // ─── 6. Resurrection at 1 HP ───────────────────────────────────────────
  test('Resurrection returns character at 1 HP with ALIVE condition', () => {
    const hero = {
      name: 'Brian',
      currentHp: 0,
      maxHp: 25,
      gold: 500,
      xp: 12000,
      condition: 'DEAD',
      status: 'DEAD'
    };

    ConditionSystem.resurrectCharacter(hero);
    assertEquals(hero.condition, 'ALIVE', 'Condition is ALIVE');
    assertEquals(hero.currentHp, 1, 'Resurrected at 1 HP');
    assertEquals(hero.gold, 500, 'Gold preserved');
    assertEquals(hero.xp, 12000, 'XP preserved');
  });

  // ─── 7. Combat Engine Integration: Turn Blocking & Friendly Fire ───────
  test('CombatEngine blocks actions for paralyzed hero and handles possessed hero friendly fire', () => {
    const paladin = { name: 'Paladin', currentHp: 20, maxHp: 20, ac: 5, condition: 'PARA', status: 'PARA' };
    const warrior = { name: 'Warrior', currentHp: 20, maxHp: 20, ac: 5, condition: 'POSS', status: 'POSS' };
    const rogue = { name: 'Rogue', currentHp: 15, maxHp: 15, ac: 8, condition: 'ALIVE', status: 'OK' };

    const engine = new CombatEngine();
    engine.startEncounter([paladin, warrior, rogue], [{ name: 'Orc', hp: 10, currentHp: 10, ac: 8 }]);

    // 1. Paralyzed Paladin cannot act
    const resPara = engine.executeTurnAction(paladin, 'ATTACK');
    assert(resPara.messages.some(m => m.includes('paralyzed and cannot act')), 'Paralyzed Paladin blocked from acting');

    // 2. Possessed Warrior turns on party
    const resPoss = engine.executeTurnAction(warrior, 'ATTACK');
    assert(resPoss.messages.some(m => m.includes('POSSESSED and turns against')), 'Possessed Warrior attacks ally');
  });

  return { passed, failed: results.length - passed, results };
}

// Run if executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('ConditionSystem.test.js')) {
  console.log('🧪 Running ConditionSystem test suite...');
  const { passed, failed, results } = runConditionSystemTests();
  results.forEach(r => console.log(r));
  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}
