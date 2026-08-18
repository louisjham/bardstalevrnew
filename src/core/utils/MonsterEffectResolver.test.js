// MonsterEffectResolver.test.js - Test Suite for Monster Spell/Effect Action Resolver
// Pure ES-module test runner that can be executed directly via Node.js or imported in dev.

import { parseActionDetails, resolveMonsterAction } from '../combat/MonsterEffectResolver.js';
import { createSeededRng } from './Dice.js';
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
 * Runs all 22 test cases for the monster effect resolver.
 * @returns {{ passed: number, failed: number, results: string[] }}
 */
export function runResolverTests() {
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

  // ═══════════════════════════════════════════════════════════════════════
  // ORIGINAL SUITE (Tests 1–13)
  // ═══════════════════════════════════════════════════════════════════════

  // 1. element=freeze; damage=24d4 parsing
  test('1. parseActionDetails("element=freeze; damage=24d4")', () => {
    const res = parseActionDetails('element=freeze; damage=24d4');
    assert(res.element === 'freeze', `element should be freeze, got ${res.element}`);
    assert(res.damage === '24d4', `damage should be 24d4, got ${res.damage}`);
    assert(res.raw === 'element=freeze; damage=24d4', 'raw string preserved');
  });

  // 2. type=Wolf; illusion=true parsing
  test('2. parseActionDetails("type=Wolf; illusion=true")', () => {
    const res = parseActionDetails('type=Wolf; illusion=true');
    assert(res.type === 'Wolf', `type should be Wolf, got ${res.type}`);
    assert(res.illusion === true, `illusion should be boolean true, got ${res.illusion}`);
  });

  // 3. Bare wither parsing
  test('3. parseActionDetails("wither")', () => {
    const res = parseActionDetails('wither');
    assert(res.status === 'wither', `status should be wither, got ${res.status}`);
  });

  // 4. Unknown-field preservation
  test('4. Unknown-field preservation in parseActionDetails', () => {
    const res = parseActionDetails('customMeta=alpha; unmappedFlag; element=fry');
    assert(res.element === 'fry', 'element should be parsed');
    assert(res.unknown && res.unknown.customMeta === 'alpha', 'unknown customMeta preserved');
    assert(res.unknown && res.unknown.unmappedFlag === true, 'unknown unmappedFlag preserved');
  });

  // 5. ARC FIRE with casterLevel 3 resolves to 4d4
  test('5. ARC FIRE with casterLevel 3 resolves to 4d4', () => {
    const conjurer = getMonsterById(6);
    const arcFireAction = conjurer.actions[0];

    const event = resolveMonsterAction(arcFireAction, { casterLevel: 3 });
    assert(event.details.resolvedNotation === '4d4', `resolvedNotation should be 4d4, got ${event.details.resolvedNotation}`);
    assert(event.damage && event.damage.rolls.length === 4, 'should roll 4 dice');
    assert(event.damage.element === 'fry', 'damage element should be fry');
  });

  // 6. damageGroup rolls deterministic damage with an injected seeded RNG
  test('6. damageGroup rolls deterministic damage with injected seeded RNG', () => {
    const greenDragon = getMonsterBySlug('green_dragon');
    const breathAction = greenDragon.actions[0]; // Breath 18d4 choke (spellId 88)

    const rng1 = createSeededRng('dragon_breath_seed_42');
    const event1 = resolveMonsterAction(breathAction, { rng: rng1 });

    const rng2 = createSeededRng('dragon_breath_seed_42');
    const event2 = resolveMonsterAction(breathAction, { rng: rng2 });

    assert(event1.damage.total === event2.damage.total, 'damage totals did not match with same seed');
    assert(JSON.stringify(event1.damage.rolls) === JSON.stringify(event2.damage.rolls), 'rolls array did not match');
    assert(event1.damage.element === 'choke', 'damage element should be choke');
  });

  // 7. A summon action creates a summon request and preserves isIllusion
  test('7. A summon action creates a summon request and preserves isIllusion', () => {
    const wizard = getMonsterBySlug('wizard_69');
    const summonAction = wizard.actions[0]; // WIND WOLF (spellId 30), illusion=true

    const event = resolveMonsterAction(summonAction);
    assert(event.effect === 'summon', 'effect should be summon');
    assert(event.summon && event.summon.monsterName === 'Wolf', 'summon monsterName should be Wolf');
    assert(event.summon.isIllusion === true, 'summon isIllusion should be true');
  });

  // 8. A status action normalizes to stone, poison, or critical
  test('8. A status action normalizes to status string', () => {
    const madGod = getMonsterBySlug('mad_god');
    const stoneAction = madGod.actions[0]; // STONE TOUCH (spellId 61), status=stone
    const poisonAction = madGod.actions[1]; // POISON STRIKE (spellId 14), status=poison

    const stoneEvent = resolveMonsterAction(stoneAction);
    assert(stoneEvent.status === 'stone', `stoneAction status should be stone, got ${stoneEvent.status}`);

    const poisonEvent = resolveMonsterAction(poisonAction);
    assert(poisonEvent.status === 'poison', `poisonAction status should be poison, got ${poisonEvent.status}`);
  });

  // 9. A buff action preserves bonus=7
  test('9. A buff action preserves bonus=7', () => {
    const magician = getMonsterBySlug('magician_21');
    const ogreStrengthAction = magician.actions[2]; // OGRESTRENGTH (spellId 53), bonus=7

    const event = resolveMonsterAction(ogreStrengthAction);
    assert(event.effect === 'bonusDamage', 'effect should be bonusDamage');
    assert(event.buff && event.buff.magnitude === 7, `buff magnitude should be 7, got ${event.buff?.magnitude}`);
  });

  // 10. A curse/debuff preserves penalty=3
  test('10. A curse/debuff preserves penalty=3', () => {
    const sorcerer = getMonsterBySlug('sorcerer_53');
    const curseAction = sorcerer.actions[2]; // CURSE (spellId 33), penalty=3

    const event = resolveMonsterAction(curseAction);
    assert(event.effect === 'malusToHit', 'effect should be malusToHit');
    assert(event.debuff && event.debuff.magnitude === 3, `debuff magnitude should be 3, got ${event.debuff?.magnitude}`);
  });

  // 11. doppleganger special action produces an explicit special event
  test('11. doppleganger special action produces an explicit special event', () => {
    const doppleganger = getMonsterBySlug('doppleganger');
    const specialAction = doppleganger.actions[0]; // special doppleganger

    const event = resolveMonsterAction(specialAction);
    assert(event.actionKind === 'special', 'actionKind should be special');
    assert(event.special && event.special.type === 'doppleganger', 'special type should be doppleganger');
  });

  // 12. Resolver does not mutate the static source action
  test('12. Resolver does not mutate the static source action', () => {
    const archmage = getMonsterBySlug('archmage');
    const deathstrike = archmage.actions[2]; // DEATHSTRIKE (spellId 65)
    const originalDetails = deathstrike.details;

    resolveMonsterAction(deathstrike, { casterLevel: 10 });
    assert(deathstrike.details === originalDetails, 'static action was mutated!');
  });

  // 13. Unsupported effect produces an explicit unimplemented event
  test('13. Unsupported effect produces explicit unimplemented event', () => {
    const fakeAction = {
      kind: 'spell',
      spellId: 999,
      spellName: 'UNKNOWN MAGIC',
      effect: 'someFutureUnknownEffect',
      details: 'param=test'
    };

    const event = resolveMonsterAction(fakeAction);
    assert(event.effect === 'unimplemented', 'should return unimplemented effect');
    assert(typeof event.warning === 'string' && event.warning.length > 0, 'should provide warning message');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // CANONICAL SPELL REGISTRY INTEGRATION TESTS (Tests 14–22)
  // ═══════════════════════════════════════════════════════════════════════

  // 14. A monster action with spellId: 1 resolves ARC FIRE from SpellDatabase, not its embedded action text
  test('14. Action with spellId: 1 resolves ARC FIRE from SpellDatabase', () => {
    const dummyAction = {
      kind: 'spell',
      spellId: 1,
      spellName: 'Old Action Name',
      effect: 'damageSingleTarget',
      details: 'element=ignored; damage=99d99'
    };

    const event = resolveMonsterAction(dummyAction, { casterLevel: 1 });
    assert(event.spellId === 1, 'spellId should be 1');
    assert(event.spellName === 'Arc Fire', `spellName should resolve from canonical as Arc Fire, got ${event.spellName}`);
    assert(event.provenance.canonicalSpellFound === true, 'provenance must report canonicalSpellFound: true');
    assert(event.damage.element === 'fry', `element should be canonical fry, got ${event.damage.element}`);
    assert(event.details.sourceNotation === '1x(level+1)d4', 'sourceNotation should be canonical formula');
    assert(event.details.resolvedNotation === '2d4', `resolvedNotation for L1 should be 2d4, got ${event.details.resolvedNotation}`);
  });

  // 15. ARC FIRE with casterLevel: 3 resolves canonical 1x(level+1)d4 to 4d4
  test('15. ARC FIRE with casterLevel: 3 resolves canonical 1x(level+1)d4 to 4d4', () => {
    const action = { kind: 'spell', spellId: 1 };
    const event = resolveMonsterAction(action, { casterLevel: 3 });
    assert(event.details.sourceNotation === '1x(level+1)d4', 'sourceNotation must be 1x(level+1)d4');
    assert(event.details.resolvedNotation === '4d4', `resolvedNotation must be 4d4, got ${event.details.resolvedNotation}`);
    assert(event.damage.rolls.length === 4, 'rolls array must have 4 dice');
  });

  // 16. A monster action with spellId: 79 resolves the canonical Freeze Breath
  test('16. Action with spellId: 79 resolves canonical Freeze Breath', () => {
    const breathAction = { kind: 'spell', spellId: 79, effect: 'damageGroup' };
    const event = resolveMonsterAction(breathAction);

    assert(event.effect === 'damageGroup', 'effect should be damageGroup');
    assert(event.damage && event.damage.element === 'freeze', `element should be freeze, got ${event.damage?.element}`);
    assert(event.damage.notation === '24d4', `damage notation should be 24d4, got ${event.damage?.notation}`);
    assert(event.damage.rolls.length === 24, 'rolls array should contain 24 dice');
  });

  // 17. A monster action with spellId: 68 resolves canonical LESSER SUMMON
  test('17. Action with spellId: 68 resolves canonical LESSER SUMMON', () => {
    const action = { kind: 'spell', spellId: 68 };
    const event = resolveMonsterAction(action);

    assert(event.effect === 'summon', 'effect should be summon');
    assert(event.summon && event.summon.monsterName === 'Lesser demon', `summonType should be Lesser demon, got ${event.summon?.monsterName}`);
    assert(event.summon.isIllusion === false, 'isIllusion must be false');
  });

  // 18. An action with spellId: 92 resolves canonical Green Dragon summon data
  test('18. Action with spellId: 92 resolves canonical Green Dragon summon data', () => {
    const action = { kind: 'spell', spellId: 92 };
    const event = resolveMonsterAction(action);

    assert(event.effect === 'summon', 'effect should be summon');
    assert(event.summon && event.summon.monsterName === 'Green dragon', `summonType should be Green dragon, got ${event.summon?.monsterName}`);
    assert(event.summon.isIllusion === false, 'isIllusion must be false');
  });

  // 19. An unknown spell ID falls back safely to action-level fields and produces explicit provenance
  test('19. Unknown spell ID falls back safely to action-level fields with provenance', () => {
    const action = {
      kind: 'spell',
      spellId: 9999,
      spellName: 'Ancient Hex',
      effect: 'status',
      details: 'status=wither'
    };

    const event = resolveMonsterAction(action);
    assert(event.provenance.canonicalSpellFound === false, 'canonicalSpellFound must be false');
    assert(event.provenance.usedFallbackFields.includes('all'), 'usedFallbackFields must indicate fallback');
    assert(event.spellName === 'Ancient Hex', 'spellName should use action fallback');
    assert(event.status === 'wither', 'status should resolve from action fallback');
  });

  // 20. A kind: "special" doppleganger action continues to work without a spell lookup
  test('20. Special doppleganger action works without spell lookup', () => {
    const action = { kind: 'special', effect: 'doppleganger' };
    const event = resolveMonsterAction(action);

    assert(event.actionKind === 'special', 'actionKind must be special');
    assert(event.effect === 'doppleganger', 'effect must be doppleganger');
    assert(event.provenance.canonicalSpellFound === false, 'canonicalSpellFound should be false for special action');
    assert(event.special && event.special.type === 'doppleganger', 'special.type must be doppleganger');
  });

  // 21. Static spell records and monster action records remain immutable after resolution
  test('21. Static spell and action records remain immutable after resolution', () => {
    const staticSpell = getSpellById(1);
    const staticMonster = getMonsterById(6);
    const staticAction = staticMonster.actions[0];

    const originalSpellName = staticSpell.name;
    const originalActionDetails = staticAction.details;

    resolveMonsterAction(staticAction, { casterLevel: 5 });

    assert(staticSpell.name === originalSpellName, 'static spell record was mutated');
    assert(staticAction.details === originalActionDetails, 'static monster action was mutated');
    assert(Object.isFrozen(staticSpell), 'static spell must be frozen');
    assert(Object.isFrozen(staticAction), 'static action must be frozen');
  });

  // 22. Existing resolver tests remain valid
  test('22. Overall resolver integration maintains contract integrity', () => {
    const allMonstersWithSpells = [6, 7, 20, 21, 22, 23, 117, 123, 124];
    for (const id of allMonstersWithSpells) {
      const mob = getMonsterById(id);
      for (const act of mob.actions) {
        const ev = resolveMonsterAction(act, { casterLevel: 1 });
        assert(typeof ev.eventId === 'string', 'eventId must be string');
        assert(typeof ev.effect === 'string', 'effect must be string');
        assert(typeof ev.provenance === 'object', 'provenance must be present');
      }
    }
  });

  return { passed, failed: 0, results };
}

// Auto-run if executed directly via Node.js
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('MonsterEffectResolver.test.js')) {
  try {
    const { passed, results } = runResolverTests();
    console.log(`\n=== RESOLVER TEST SUITE RESULTS: ${passed}/22 PASSED ===`);
    results.forEach(r => console.log(r));
  } catch (err) {
    console.error('\n❌ Resolver Test Suite Failed:', err);
    process.exit(1);
  }
}
