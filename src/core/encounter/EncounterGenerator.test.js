// EncounterGenerator.test.js - Comprehensive Test Suite for Area- & Time-Based Encounter Generation
import { EncounterGenerator, ENCOUNTER_TABLES, FIXED_ENCOUNTERS } from './EncounterGenerator.js';

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

export function runEncounterGeneratorTests() {
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

  // ─── 1. Skara Brae Daytime Streets: Exactly 1 Group ───────────────────
  test('Skara Brae Daytime Streets always generates exactly 1 group from day pool (IDs 0–14)', () => {
    for (let trial = 0; trial < 25; trial++) {
      const enc = EncounterGenerator.generateEncounter({ zone: 'streets', isNight: false });
      assertEquals(enc.groups.length, 1, 'Daytime city encounters must have exactly 1 group');
      assertEquals(enc.tableId, 'SKARA_BRAE_DAY', 'Table must be SKARA_BRAE_DAY');
      assert(enc.groups[0].count >= 1 && enc.groups[0].count <= 6, 'Group size between 1 and 6');
      assert(ENCOUNTER_TABLES.SKARA_BRAE_DAY.eligibleArchetypeIds.includes(enc.groups[0].monster.id), 'Monster from day pool');
      assertEquals(enc.groups[0].distanceFeet, 10, 'First group starts at 10 feet');
    }
  });

  // ─── 2. Skara Brae Nighttime Streets: 1 to 4 Groups ───────────────────
  test('Skara Brae Nighttime Streets generates 1 to 4 groups from night pool (IDs 15–30)', () => {
    const groupCounts = new Set();
    for (let trial = 0; trial < 50; trial++) {
      const enc = EncounterGenerator.generateEncounter({ zone: 'streets', isNight: true });
      assert(enc.groups.length >= 1 && enc.groups.length <= 4, 'Night city encounters have 1 to 4 groups');
      assertEquals(enc.tableId, 'SKARA_BRAE_NIGHT', 'Table must be SKARA_BRAE_NIGHT');
      groupCounts.add(enc.groups.length);

      enc.groups.forEach((grp, idx) => {
        assert(ENCOUNTER_TABLES.SKARA_BRAE_NIGHT.eligibleArchetypeIds.includes(grp.monster.id), 'Monster from night pool');
        assertEquals(grp.distanceFeet, (idx + 1) * 10, `Group ${idx} distance is ${(idx + 1) * 10}ft`);
      });
    }
    assert(groupCounts.size > 1, 'Should observe varying group counts at night');
  });

  // ─── 3. Tavern Wine Cellar: 1 to 3 Groups ──────────────────────────────
  test('Wine Cellar generates 1 to 3 groups from cellar pool', () => {
    for (let trial = 0; trial < 25; trial++) {
      const enc = EncounterGenerator.generateEncounter({ zone: 'wine_cellar', isNight: false });
      assert(enc.groups.length >= 1 && enc.groups.length <= 3, 'Wine Cellar encounters have 1 to 3 groups');
      assertEquals(enc.tableId, 'WINE_CELLAR', 'Table must be WINE_CELLAR');
      enc.groups.forEach(grp => {
        assert(ENCOUNTER_TABLES.WINE_CELLAR.eligibleArchetypeIds.includes(grp.monster.id), 'Monster from cellar pool');
      });
    }
  });

  // ─── 4. Dungeon & Tower Tables (Catacombs, Harkyn, Kylearan, Mangar) ───
  test('Deep Dungeons select correct themed tables and high-tier monster pools', () => {
    const encHarkyn = EncounterGenerator.generateEncounter({ zone: 'harkyns_castle' });
    assertEquals(encHarkyn.tableId, 'HARKYNS_CASTLE', 'Harkyns Castle table');

    const encKylearan = EncounterGenerator.generateEncounter({ zone: 'kylearans_tower' });
    assertEquals(encKylearan.tableId, 'KYLEARANS_TOWER', 'Kylearans Tower table');

    const encMangar = EncounterGenerator.generateEncounter({ zone: 'mangars_tower' });
    assertEquals(encMangar.tableId, 'MANGARS_TOWER', 'Mangars Tower table');
    assert(encMangar.groups.length >= 1 && encMangar.groups.length <= 4, 'Mangar tower 1-4 groups');
  });

  // ─── 5. Forced / Keyed Encounter Overrides ─────────────────────────────
  test('Kylearan 99 Berserkers forced encounter generates 4 groups of 99 Berserkers (396 total)', () => {
    const enc = EncounterGenerator.generateEncounter({
      zone: 'kylearans_tower',
      forcedEncounterId: 'KYLEARAN_BERSERKERS_99'
    });

    assertEquals(enc.trigger, 'forcedTile', 'Trigger is forcedTile');
    assertEquals(enc.groups.length, 4, '4 monster groups');
    let totalBerserkers = 0;
    enc.groups.forEach(grp => {
      assertEquals(grp.monster.name, 'Berserker', 'Monster is Berserker');
      assertEquals(grp.count, 99, 'Group size is 99');
      totalBerserkers += grp.count;
    });
    assertEquals(totalBerserkers, 396, 'Total monsters is 396');
  });

  // ─── 6. Flattening to Combatants ───────────────────────────────────────
  test('flattenEncounterToMonsters creates instantiated combatants with distance and stats', () => {
    const enc = EncounterGenerator.generateEncounter({ zone: 'streets', isNight: true });
    const combatants = EncounterGenerator.flattenEncounterToMonsters(enc);

    assert(combatants.length >= enc.groups.length, 'At least 1 combatant per group');
    combatants.forEach(c => {
      assert(typeof c.currentHp === 'number' && c.currentHp > 0, 'Rolled HP');
      assert(typeof c.ac === 'number', 'Rolled AC');
      assert(typeof c.distanceFeet === 'number' && c.distanceFeet >= 10, 'Distance defined');
      assert(Array.isArray(c.actionSlots) && c.actionSlots.length === 4, '4 Action slots');
      assertEquals(c.status, 'alive', 'Alive status');
    });
  });

  return { passed, failed: results.length - passed, results };
}

// Run if executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('EncounterGenerator.test.js')) {
  console.log('🧪 Running EncounterGenerator test suite...');
  const { passed, failed, results } = runEncounterGeneratorTests();
  results.forEach(r => console.log(r));
  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}
