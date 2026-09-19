// EncounterGenerator.js - Area- and Time-Based Encounter Generation Engine (1985 C64 BT1)
// Faithfully reproduces the authentic BT1 encounter rules:
// - Encounters are strictly Area- and Time-based (NO dynamic scaling to party level or CR).
// - Skara Brae Day: Easier city-monster pool (IDs 0–14); exactly ONE monster group.
// - Skara Brae Night: Tougher city-monster pool (IDs 15–30); 1 to 4 monster groups.
// - Wine Cellar: Daytime monster pool; up to 3 monster groups.
// - Dungeons (Catacombs, Harkyn's Castle, Kylearan's Tower, Mangar's Tower): Themed deeper pools; 1 to 4 groups.
// - Forced / Scripted Encounter Tiles: Keyed map squares (e.g. 4 groups of 99 Berserkers, Mangar guardians).

import { getMonsterById, bardTaleMonsters } from '../../data/MonsterDatabase.js';
import { rollRangeInclusive, rollDice } from '../utils/Dice.js';

/**
 * Authentic Area- & Time-Based Encounter Tables.
 */
export const ENCOUNTER_TABLES = Object.freeze({
  SKARA_BRAE_DAY: Object.freeze({
    id: 'SKARA_BRAE_DAY',
    zone: 'streets',
    timeOfDay: 'day',
    minGroups: 1,
    maxGroups: 1, // Exactly 1 group during daytime city exploration
    minGroupSize: 1,
    maxGroupSize: 6,
    eligibleArchetypeIds: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
  }),

  SKARA_BRAE_NIGHT: Object.freeze({
    id: 'SKARA_BRAE_NIGHT',
    zone: 'streets',
    timeOfDay: 'night',
    minGroups: 1,
    maxGroups: 4, // 1 to 4 groups at night
    minGroupSize: 2,
    maxGroupSize: 8,
    eligibleArchetypeIds: Object.freeze([15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30])
  }),

  WINE_CELLAR: Object.freeze({
    id: 'WINE_CELLAR',
    zone: 'wine_cellar',
    timeOfDay: 'any',
    minGroups: 1,
    maxGroups: 3, // Up to 3 groups in Wine Cellar
    minGroupSize: 1,
    maxGroupSize: 6,
    eligibleArchetypeIds: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 19])
  }),

  CATACOMBS_L1: Object.freeze({
    id: 'CATACOMBS_L1',
    zone: 'catacombs_l1',
    timeOfDay: 'any',
    minGroups: 1,
    maxGroups: 4,
    minGroupSize: 2,
    maxGroupSize: 8,
    eligibleArchetypeIds: Object.freeze([15, 18, 19, 20, 25, 27, 29, 31, 32, 33, 34, 38, 39, 41])
  }),

  CATACOMBS_L2_3: Object.freeze({
    id: 'CATACOMBS_L2_3',
    zone: 'catacombs_l2_3',
    timeOfDay: 'any',
    minGroups: 1,
    maxGroups: 4,
    minGroupSize: 2,
    maxGroupSize: 8,
    eligibleArchetypeIds: Object.freeze([35, 36, 37, 39, 40, 42, 43, 44, 45, 46, 50, 55, 56, 57, 58, 59])
  }),

  HARKYNS_CASTLE: Object.freeze({
    id: 'HARKYNS_CASTLE',
    zone: 'harkyns_castle',
    timeOfDay: 'any',
    minGroups: 1,
    maxGroups: 4,
    minGroupSize: 2,
    maxGroupSize: 10,
    eligibleArchetypeIds: Object.freeze([55, 58, 60, 61, 62, 63, 64, 65, 71, 72, 73, 75, 76, 77, 83, 84, 88, 89])
  }),

  KYLEARANS_TOWER: Object.freeze({
    id: 'KYLEARANS_TOWER',
    zone: 'kylearans_tower',
    timeOfDay: 'any',
    minGroups: 1,
    maxGroups: 4,
    minGroupSize: 2,
    maxGroupSize: 10,
    eligibleArchetypeIds: Object.freeze([76, 77, 83, 85, 87, 88, 90, 92, 93, 94, 95, 97, 100, 101, 105, 106])
  }),

  MANGARS_TOWER: Object.freeze({
    id: 'MANGARS_TOWER',
    zone: 'mangars_tower',
    timeOfDay: 'any',
    minGroups: 1,
    maxGroups: 4,
    minGroupSize: 2,
    maxGroupSize: 12,
    eligibleArchetypeIds: Object.freeze([94, 95, 98, 100, 101, 106, 107, 108, 109, 110, 111, 115, 116, 118, 119, 120, 121, 122, 123, 124, 125])
  })
});

/**
 * Canonical Fixed & Keyed Encounter Squares.
 */
export const FIXED_ENCOUNTERS = Object.freeze({
  'KYLEARAN_BERSERKERS_99': Object.freeze({
    id: 'KYLEARAN_BERSERKERS_99',
    description: "Kylearan's 4 Groups of 99 Berserkers",
    zone: 'kylearans_tower',
    groups: [
      { archetypeId: 65, count: 99 },
      { archetypeId: 65, count: 99 },
      { archetypeId: 65, count: 99 },
      { archetypeId: 65, count: 99 }
    ]
  }),

  'WINE_CELLAR_AMBUSH_1': Object.freeze({
    id: 'WINE_CELLAR_AMBUSH_1',
    description: 'Wine Cellar Ambush (3, 5)',
    zone: 'wine_cellar',
    mapX: 3,
    mapY: 5,
    groups: [
      { archetypeId: 9, count: 4 },  // 4 Skeletons
      { archetypeId: 11, count: 3 }, // 3 Spiders
      { archetypeId: 10, count: 2 }  // 2 Nomads
    ]
  }),

  'MANGAR_GATE_DRAGONS': Object.freeze({
    id: 'MANGAR_GATE_DRAGONS',
    description: 'Mangar Gate Guardians',
    zone: 'mangars_tower',
    groups: [
      { archetypeId: 100, count: 2 }, // 2 Red Dragons
      { archetypeId: 120, count: 4 }  // 4 Storm Giants
    ]
  }),

  'MANGAR_FINAL_BATTLE': Object.freeze({
    id: 'MANGAR_FINAL_BATTLE',
    description: 'Mangar Final Confrontation',
    zone: 'mangars_tower',
    groups: [
      { archetypeId: 117, count: 1 }, // 1 Mangar
      { archetypeId: 109, count: 2 }, // 2 Vampire Lords
      { archetypeId: 125, count: 1 }  // 1 Demon Lord
    ]
  })
});

export class EncounterGenerator {
  /**
   * Selects an appropriate encounter table based on zone and time of day.
   * @param {string} [zone='streets']
   * @param {boolean} [isNight=false]
   * @returns {typeof ENCOUNTER_TABLES[keyof typeof ENCOUNTER_TABLES]}
   */
  static selectTable(zone = 'streets', isNight = false) {
    const z = String(zone).toLowerCase();

    if (z.includes('wine') || z.includes('cellar')) {
      return ENCOUNTER_TABLES.WINE_CELLAR;
    }
    if (z.includes('catacomb') || z.includes('sewer')) {
      if (z.includes('2') || z.includes('3')) return ENCOUNTER_TABLES.CATACOMBS_L2_3;
      return ENCOUNTER_TABLES.CATACOMBS_L1;
    }
    if (z.includes('harkyn') || z.includes('castle')) {
      return ENCOUNTER_TABLES.HARKYNS_CASTLE;
    }
    if (z.includes('kylearan')) {
      return ENCOUNTER_TABLES.KYLEARANS_TOWER;
    }
    if (z.includes('mangar')) {
      return ENCOUNTER_TABLES.MANGARS_TOWER;
    }

    // Default to Skara Brae Streets
    return isNight ? ENCOUNTER_TABLES.SKARA_BRAE_NIGHT : ENCOUNTER_TABLES.SKARA_BRAE_DAY;
  }

  /**
   * Generates a complete combat encounter.
   *
   * @param {Object} [context={}]
   * @param {string} [context.zone='streets'] - 'streets', 'wine_cellar', 'catacombs_l1', etc.
   * @param {boolean} [context.isNight=false] - True during nighttime
   * @param {number} [context.mapX] - Current map grid X
   * @param {number} [context.mapY] - Current map grid Y
   * @param {'movement'|'forcedTile'|'scripted'} [context.trigger='movement']
   * @param {string} [context.forcedEncounterId] - Specific keyed encounter ID
   * @returns {{
   *   encounterId: string,
   *   tableId: string,
   *   zone: string,
   *   isNight: boolean,
   *   trigger: string,
   *   groups: Array<{ monster: Object, count: number, distanceFeet: number }>,
   *   totalXP: number,
   *   totalGold: number
   * }}
   */
  static generateEncounter(context = {}) {
    const zone = context.zone || 'streets';
    const isNight = context.isNight === true;
    const trigger = context.trigger || 'movement';

    // 1. Check for Forced / Keyed Encounter Override
    if (context.forcedEncounterId && FIXED_ENCOUNTERS[context.forcedEncounterId]) {
      return this._instantiateFixedEncounter(FIXED_ENCOUNTERS[context.forcedEncounterId], context);
    }

    // Check by map coordinates if defined
    if (typeof context.mapX === 'number' && typeof context.mapY === 'number') {
      for (const key in FIXED_ENCOUNTERS) {
        const fixed = FIXED_ENCOUNTERS[key];
        if (fixed.zone === zone && fixed.mapX === context.mapX && fixed.mapY === context.mapY) {
          return this._instantiateFixedEncounter(fixed, context);
        }
      }
    }

    // 2. Select Encounter Table based on Area & Day/Night
    const table = this.selectTable(zone, isNight);

    // 3. Roll Group Count (1 group by day in Skara Brae, 1-4 at night/dungeons)
    const numGroups = table.minGroups === table.maxGroups
      ? table.minGroups
      : Math.floor(Math.random() * (table.maxGroups - table.minGroups + 1)) + table.minGroups;

    const groups = [];
    let totalXP = 0;
    let totalGold = 0;

    for (let g = 0; g < numGroups; g++) {
      const candidateIds = table.eligibleArchetypeIds;
      const archetypeId = candidateIds[Math.floor(Math.random() * candidateIds.length)];
      const archetype = getMonsterById(archetypeId) || bardTaleMonsters[0];

      // 4. Roll Group Size within table/monster boundaries
      const minCount = table.minGroupSize || 1;
      const maxCount = table.maxGroupSize || 6;
      const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;

      // Group distance: Group 0 starts at 10ft, Group 1 at 20ft, Group 2 at 30ft, Group 3 at 40ft
      const distanceFeet = (g + 1) * 10;

      groups.push({
        monster: archetype,
        count,
        distanceFeet
      });

      const monsterXP = archetype.xpValue || archetype.xp || 60;
      const monsterGold = Math.floor(monsterXP * 0.4);
      totalXP += monsterXP * count;
      totalGold += monsterGold * count;
    }

    return {
      encounterId: `enc_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      tableId: table.id,
      zone,
      isNight,
      trigger,
      groups,
      totalXP,
      totalGold
    };
  }

  /**
   * Helper to instantiate a fixed/keyed encounter structure.
   */
  static _instantiateFixedEncounter(fixed, context) {
    const groups = [];
    let totalXP = 0;
    let totalGold = 0;

    fixed.groups.forEach((grp, gIdx) => {
      const archetype = getMonsterById(grp.archetypeId) || bardTaleMonsters[0];
      const count = grp.count || 1;
      const distanceFeet = (gIdx + 1) * 10;

      groups.push({
        monster: archetype,
        count,
        distanceFeet
      });

      const monsterXP = archetype.xpValue || archetype.xp || 60;
      const monsterGold = Math.floor(monsterXP * 0.4);
      totalXP += monsterXP * count;
      totalGold += monsterGold * count;
    });

    return {
      encounterId: `fixed_${fixed.id}_${Date.now()}`,
      tableId: `FIXED_${fixed.id}`,
      zone: context.zone || fixed.zone,
      isNight: context.isNight === true,
      trigger: 'forcedTile',
      description: fixed.description,
      groups,
      totalXP,
      totalGold
    };
  }

  /**
   * Flattens an encounter structure into combat-ready monster objects for CombatEngine.
   * @param {{ groups: Array<{ monster: Object, count: number, distanceFeet: number }> }} encounter
   * @returns {Array<Object>}
   */
  static flattenEncounterToMonsters(encounter) {
    if (!encounter || !Array.isArray(encounter.groups)) return [];

    const combatants = [];

    encounter.groups.forEach((grp, gIdx) => {
      const archetype = grp.monster;
      const count = grp.count || 1;
      const distanceFeet = grp.distanceFeet || ((gIdx + 1) * 10);

      for (let i = 0; i < count; i++) {
        const minHp = archetype.hp?.min || 6;
        const maxHp = archetype.hp?.max || 14;
        const rolledHp = Math.floor(Math.random() * (maxHp - minHp + 1)) + minHp;
        const minAc = archetype.armorClass?.min || 8;
        const maxAc = archetype.armorClass?.max || 8;
        const rolledAc = Math.floor(Math.random() * (maxAc - minAc + 1)) + minAc;

        combatants.push({
          id: `${archetype.slug}_g${gIdx}_${i}`,
          archetypeId: archetype.id,
          name: count > 1 ? `${archetype.name} #${i + 1}` : archetype.name,
          groupName: archetype.name,
          groupIndex: gIdx,
          hp: rolledHp,
          currentHp: rolledHp,
          maxHp: rolledHp,
          ac: rolledAc,
          damage: archetype.physicalAttack?.damage || '2d4',
          damageNotation: archetype.physicalAttack?.damage || '2d4',
          hitType: archetype.physicalAttack?.hitType || 'Swing/Slash',
          effect: archetype.physicalAttack?.effect || null,
          onHitEffect: archetype.onHitEffect || archetype.physicalAttack?.effect || null,
          xp: archetype.xpValue || archetype.xp || 60,
          xpValue: archetype.xpValue || archetype.xp || 60,
          gold: Math.floor((archetype.xpValue || archetype.xp || 60) * 0.4),
          actions: archetype.actions || [],
          actionSlots: archetype.actionSlots || [{ type: 'meleeAttack' }, { type: 'meleeAttack' }, { type: 'meleeAttack' }, { type: 'meleeAttack' }],
          power: archetype.power || 1,
          distanceFeet,
          status: 'alive'
        });
      }
    });

    return combatants;
  }
}
