// EncounterGenerator.test.js - Comprehensive Test Suite for 1985-Accurate Encounter Generation
import test from 'node:test';
import assert from 'node:assert/strict';
import { EncounterGenerator, ENCOUNTER_TABLES, FORCED_ENCOUNTERS } from './EncounterGenerator.js';
import { parseEncounterTablesCsv, parseForcedEncountersCsv } from '../../data/EncounterTables.js';

test('1985-Accurate Encounter Generation Algorithm Suite', async (t) => {
  await t.test('1. CSV Data Parsers generate structured lookup dictionaries and spatial hash maps', () => {
    const tables = parseEncounterTablesCsv();
    assert.ok(tables.SKARA_BRAE_DAY, 'SKARA_BRAE_DAY table exists');
    assert.strictEqual(tables.SKARA_BRAE_DAY.minGroups, 1);
    assert.strictEqual(tables.SKARA_BRAE_DAY.maxGroups, 1);
    assert.deepStrictEqual(tables.SKARA_BRAE_DAY.eligibleArchetypeIds, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);

    assert.ok(tables.SKARA_BRAE_NIGHT, 'SKARA_BRAE_NIGHT table exists');
    assert.strictEqual(tables.SKARA_BRAE_NIGHT.minGroups, 1);
    assert.strictEqual(tables.SKARA_BRAE_NIGHT.maxGroups, 4);

    const { byCoord, byId } = parseForcedEncountersCsv();
    assert.ok(byCoord.has('kylearans_tower_0_15'), 'Kylearan Berserkers tile in spatial hash map');
    assert.ok(byCoord.has('wine_cellar_3_5'), 'Wine Cellar Ambush 1 in spatial hash map');
    assert.ok(byId.has('KYLEARAN_BERSERKERS_99'), 'Forced encounter indexed by ID');
  });

  await t.test('2. Skara Brae Daytime Streets: strictly 1 group and night-exclusive archetypes filtered out', () => {
    const nightIds = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
    const dayAllowed = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

    for (let i = 0; i < 30; i++) {
      const payload = EncounterGenerator.generateEncounter({ zone: 'streets', isNight: false, trigger: 'movement' });
      assert.ok(Array.isArray(payload), 'Payload is an array');
      assert.strictEqual(payload.length, 1, 'Skara Brae Day must be strictly 1 group');
      assert.strictEqual(payload.tableId, 'SKARA_BRAE_DAY');

      const grp = payload[0];
      assert.ok(dayAllowed.includes(grp.archetypeId), `Archetype ID ${grp.archetypeId} must be in daytime pool`);
      assert.strictEqual(nightIds.includes(grp.archetypeId), false, `Archetype ID ${grp.archetypeId} must NOT be in night pool`);

      // Verify payload structure
      assert.ok(typeof grp.name === 'string' && grp.name.length > 0, 'Group has name');
      assert.ok(typeof grp.quantity === 'number' && grp.quantity >= 1, 'Group has quantity');
      assert.ok(typeof grp.ac === 'number', 'Group has ac');
      assert.ok(typeof grp.hpPerUnit === 'number' && grp.hpPerUnit > 0, 'Group has hpPerUnit');
      assert.ok(typeof grp.spriteSlug === 'string' && grp.spriteSlug.length > 0, 'Group has spriteSlug');
    }
  });

  await t.test('3. Skara Brae Nighttime Streets: 1 to 4 groups from night pool (IDs 15-30)', () => {
    const nightAllowed = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
    const groupCountDist = new Set();

    for (let i = 0; i < 50; i++) {
      const payload = EncounterGenerator.generateEncounter({ zone: 'streets', isNight: true, trigger: 'movement' });
      assert.ok(payload.length >= 1 && payload.length <= 4, 'Skara Brae Night must generate 1 to 4 groups');
      assert.strictEqual(payload.tableId, 'SKARA_BRAE_NIGHT');
      groupCountDist.add(payload.length);

      payload.forEach(grp => {
        assert.ok(nightAllowed.includes(grp.archetypeId), `Night monster ID ${grp.archetypeId} in night pool`);
        assert.ok(grp.quantity >= 2 && grp.quantity <= 8, 'Night group quantity within 2-8');
      });
    }

    assert.ok(groupCountDist.size > 1, 'Observed variation in night group counts');
  });

  await t.test('4. Tavern Wine Cellar: 1 to 3 groups matching Wine Cellar pool', () => {
    const cellarAllowed = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 19];

    for (let i = 0; i < 30; i++) {
      const payload = EncounterGenerator.generateEncounter({ zone: 'wine_cellar', isNight: false, trigger: 'movement' });
      assert.ok(payload.length >= 1 && payload.length <= 3, 'Wine cellar generates 1 to 3 groups');
      assert.strictEqual(payload.tableId, 'WINE_CELLAR');

      payload.forEach(grp => {
        assert.ok(cellarAllowed.includes(grp.archetypeId), `Monster ID ${grp.archetypeId} in cellar pool`);
      });
    }
  });

  await t.test("5. Kylearan's 99 Berserkers (Forced Tile): exactly 4 groups, 396 total Berserkers", () => {
    const payload = EncounterGenerator.generateEncounter({
      zone: 'kylearans_tower',
      mapCoord: { x: 0, y: 15 },
      trigger: 'forcedTile'
    });

    assert.strictEqual(payload.trigger, 'forcedTile');
    assert.strictEqual(payload.length, 4, 'Exactly 4 groups');
    assert.strictEqual(payload.exactGroups, 4);
    assert.strictEqual(payload.totalMonsters, 396, 'Total monsters must be 396');

    payload.forEach(grp => {
      assert.strictEqual(grp.name, 'Berserker');
      assert.strictEqual(grp.quantity, 99);
      assert.strictEqual(grp.archetypeId, 65);
      assert.strictEqual(grp.spriteSlug, 'berserker');
    });
  });

  await t.test('6. evaluateStep pipeline: Step 1 Forced Trigger, Step 2 RNG Check, Step 3 & 4 Generation', () => {
    // 1. Forced encounter tile always triggers regardless of RNG check
    const forcedAmbush = EncounterGenerator.evaluateStep('wine_cellar', 3, 5, false, 0.0, () => 0.99);
    assert.ok(forcedAmbush, 'Forced encounter tile triggered even with 0.0 baseline chance');
    assert.strictEqual(forcedAmbush.trigger, 'forcedTile');
    assert.strictEqual(forcedAmbush.length, 3, 'Wine cellar ambush 1 has 3 groups');

    // 2. Normal tile with RNG failing threshold returns null
    const noEncounter = EncounterGenerator.evaluateStep('streets', 10, 10, false, 0.10, () => 0.50);
    assert.strictEqual(noEncounter, null, 'Roll above baseline returns null');

    // 3. Normal tile with RNG meeting threshold returns valid encounter payload
    const triggered = EncounterGenerator.evaluateStep('streets', 10, 10, false, 0.10, () => 0.05);
    assert.ok(Array.isArray(triggered), 'Triggered encounter returns payload array');
    assert.strictEqual(triggered.length, 1, 'Day streets returns 1 group');
    assert.ok(triggered[0].quantity >= 1);
  });

  await t.test('7. flattenEncounterToMonsters expands group payload into individual combatants', () => {
    const payload = EncounterGenerator.generateEncounter({ zone: 'streets', isNight: false });
    const combatants = EncounterGenerator.flattenEncounterToMonsters(payload);

    assert.strictEqual(combatants.length, payload[0].quantity, 'Total combatants equals group quantity');
    combatants.forEach((c, idx) => {
      assert.strictEqual(c.groupName, payload[0].name);
      assert.ok(typeof c.currentHp === 'number' && c.currentHp > 0);
      assert.ok(typeof c.ac === 'number');
      assert.ok(typeof c.spriteSlug === 'string');
      assert.strictEqual(c.distanceFeet, 10);
      assert.strictEqual(c.status, 'alive');
    });
  });
});
