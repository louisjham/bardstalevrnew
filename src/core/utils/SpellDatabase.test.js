// SpellDatabase.test.js - Verification Suite for Canonical Spell Registry
// Pure ES-module test runner that can be executed directly via Node.js or imported in dev.

import {
  bardTaleSpells,
  spellById,
  spellByCode,
  SPELLS,
  getSpellById,
  getSpellByCode,
  getSpellsByClass,
  getKnownSpells,
  getSpellsBySchoolAndLevel,
  getMaxSpellLevel,
  validateSpellDatabase,
  SpellSchool
} from '../../data/SpellDatabase.js';

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
 * Runs the spell registry verification test suite.
 * @returns {{ passed: number, failed: number, results: string[] }}
 */
export function runSpellDatabaseTests() {
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

  // 1. Registry has 105 records and IDs 0–104 are contiguous
  test('1. Registry has 105 records and IDs 0–104 are contiguous', () => {
    assert(bardTaleSpells.length === 105, `Expected 105 spells, got ${bardTaleSpells.length}`);
    assert(spellById.size === 105, `spellById map size should be 105, got ${spellById.size}`);
    for (let i = 0; i < 105; i++) {
      assert(bardTaleSpells[i].id === i, `Spell at index ${i} ID mismatch: ${bardTaleSpells[i].id}`);
    }
    assert(validateSpellDatabase(bardTaleSpells) === true, 'validateSpellDatabase should return true');
  });

  // 2. getSpellById(1) returns ARC FIRE
  test('2. getSpellById(1) returns ARC FIRE', () => {
    const spell = getSpellById(1);
    assert(spell !== undefined, 'getSpellById(1) must exist');
    assert(spell.code === 'ARFI', `Code should be ARFI, got ${spell.code}`);
    assert(spell.name.toLowerCase().includes('arc fire'), `Name should be Arc Fire, got ${spell.name}`);
    assert(spell.spellClass === 'conjurer', 'Class should be conjurer');
  });

  // 3. getSpellByCode("arfi") returns the same spell as getSpellById(1)
  test('3. getSpellByCode("arfi") returns the same spell as getSpellById(1)', () => {
    const spellByCodeLower = getSpellByCode('arfi');
    const spellByCodeUpper = getSpellByCode('ARFI');
    const spellById1 = getSpellById(1);

    assert(spellByCodeLower === spellById1, 'Case-insensitive getSpellByCode("arfi") should match getSpellById(1)');
    assert(spellByCodeUpper === spellById1, 'getSpellByCode("ARFI") should match getSpellById(1)');
  });

  // 4. getSpellById(79) returns the special Freeze Breath record
  test('4. getSpellById(79) returns the special Freeze Breath record', () => {
    const freezeBreath = getSpellById(79);
    assert(freezeBreath !== undefined, 'Spell 79 must exist');
    assert(freezeBreath.spellClass === 'special', 'Spell 79 spellClass must be special');
    assert(freezeBreath.code === null, 'Spell 79 code must be null');
    assert(freezeBreath.details.element === 'freeze', 'Element must be freeze');
    assert(freezeBreath.details.damage === '24d4', 'Damage must be 24d4');
  });

  // 5. getSpellById(104) returns the special Golem summon record
  test('5. getSpellById(104) returns the special Golem summon record', () => {
    const golemSummon = getSpellById(104);
    assert(golemSummon !== undefined, 'Spell 104 must exist');
    assert(golemSummon.spellClass === 'special', 'Spell 104 spellClass must be special');
    assert(golemSummon.details.summonType === 'Golem', 'summonType must be Golem');
    assert(golemSummon.details.isIllusion === false, 'isIllusion must be false');
  });

  // 6. Scaling damage formula for ARC FIRE remains 1x(level+1)d4
  test('6. Scaling damage formula for ARC FIRE remains 1x(level+1)d4', () => {
    const arcFire = getSpellById(1);
    assert(arcFire.details.sourceDamage === '1x(level+1)d4', `sourceDamage should be "1x(level+1)d4", got ${arcFire.details.sourceDamage}`);
    assert(arcFire.effect.perLevel === true, 'Legacy effect.perLevel flag preserved');
  });

  // 7. A player spell lookup and a player-school/level query never return a special spell
  test('7. Player-school and level queries never return special spells', () => {
    const conjLevel1 = getSpellsBySchoolAndLevel(SpellSchool.CONJURER, 1);
    assert(conjLevel1.length > 0, 'Should find Conjurer level 1 spells');
    conjLevel1.forEach(s => {
      assert(s.school !== 'SPECIAL', 'Special spell found in Conjurer level 1');
      assert(s.spellClass !== 'special', 'Special spellClass found in Conjurer level 1');
      assert(typeof s.code === 'string', 'Player spell missing code');
    });

    const specialSpellsInPublicList = SPELLS.filter(s => s.school === 'SPECIAL' || s.spellClass === 'special');
    assert(specialSpellsInPublicList.length === 0, 'SPELLS public array contains special spells');
  });

  // 8. Static spell data cannot be mutated
  test('8. Static spell data cannot be mutated', () => {
    const mafl = getSpellById(0);
    assert(Object.isFrozen(mafl), 'Spell 0 must be frozen');
    assert(Object.isFrozen(mafl.details), 'Spell 0 details must be frozen');
    assert(Object.isFrozen(mafl.effect), 'Spell 0 effect must be frozen');
    assertThrows(() => {
      'use strict';
      mafl.name = 'Mutated Flame';
    }, 'should throw on frozen mutation');
  });

  // 9. Existing exported player-spell helpers still execute without error against a mock character
  test('9. Existing exported player-spell helpers execute properly on mock character', () => {
    const mockMage = {
      name: 'Kael',
      schoolLevels: {
        CONJURER: 3,
        MAGICIAN: 2
      }
    };

    const knownSpells = getKnownSpells(mockMage);
    assert(knownSpells.length > 0, 'Should return known spells');
    assert(knownSpells.some(s => s.code === 'ARFI'), 'Should know ARFI (Conjurer L1)');
    assert(knownSpells.some(s => s.code === 'WAST'), 'Should know WAST (Conjurer L3)');
    assert(knownSpells.some(s => s.code === 'HOWA'), 'Should know HOWA (Magician L2)');
    assert(!knownSpells.some(s => s.code === 'FLRE'), 'Should NOT know FLRE (Conjurer L4)');
    assert(!knownSpells.some(s => s.school === 'SPECIAL'), 'Known spells must never contain special spells');

    assert(getMaxSpellLevel(1) === 1, 'L1 exp -> L1 spell');
    assert(getMaxSpellLevel(5) === 3, 'L5 exp -> L3 spell');
    assert(getMaxSpellLevel(13) === 7, 'L13 exp -> L7 spell');

    const conjurerSpells = getSpellsByClass('conjurer');
    assert(conjurerSpells.length === 22, `Expected 22 Conjurer spells, got ${conjurerSpells.length}`);
  });

  return { passed, failed: 0, results };
}

// Auto-run if executed directly via Node.js
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('SpellDatabase.test.js')) {
  try {
    const { passed, results } = runSpellDatabaseTests();
    console.log(`\n=== SPELL DATABASE TEST SUITE RESULTS: ${passed}/9 PASSED ===`);
    results.forEach(r => console.log(r));
  } catch (err) {
    console.error('\n❌ Spell Database Test Suite Failed:', err);
    process.exit(1);
  }
}
