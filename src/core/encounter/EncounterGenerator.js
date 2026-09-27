// EncounterGenerator.js - 1985 C64 Bard's Tale I Encounter Generation Engine
// Implements the authentic 4-step pipeline:
// Step 1: Check Trigger (forced/scripted encounter tiles via spatial hash map)
// Step 2: RNG Check & Table Selection (10% step check; lookup mapped by Zone and Time)
// Step 3: Group Count Roll (table bounds, e.g. SKARA_BRAE_DAY = 1; SKARA_BRAE_NIGHT = 1-4)
// Step 4: Group Ingestion (eligible monster IDs, quantity roll, AC, HP, spriteSlug)
//
// ZERO dynamic party scaling: encounters are purely area- and time-based.

import {
  ENCOUNTER_TABLES,
  FORCED_ENCOUNTERS,
  FORCED_ENCOUNTERS_BY_ID,
  getEncounterTable,
  getTableByZoneAndTime,
  getForcedEncounter,
  getForcedEncounterById,
  normalizeZoneName
} from '../../data/EncounterTables.js';
import { getMonsterById, bardTaleMonsters } from '../../data/MonsterDatabase.js';

export {
  ENCOUNTER_TABLES,
  FORCED_ENCOUNTERS,
  FORCED_ENCOUNTERS_BY_ID,
  getEncounterTable,
  getTableByZoneAndTime,
  getForcedEncounter,
  getForcedEncounterById
};

export class EncounterGenerator {
  /**
   * Selects an appropriate encounter table based on zone and time of day.
   * @param {string} [zone='streets']
   * @param {string|boolean} [timeOfDayOrIsNight='day']
   * @returns {Object}
   */
  static selectTable(zone = 'streets', timeOfDayOrIsNight = 'day') {
    return getTableByZoneAndTime(zone, timeOfDayOrIsNight);
  }

  /**
   * Checks if the given zone and grid coordinates trigger a forced/scripted encounter.
   * @param {string} zone
   * @param {number} x
   * @param {number} y
   * @returns {Object|undefined}
   */
  static checkForcedEncounter(zone, x, y) {
    return getForcedEncounter(zone, x, y);
  }

  /**
   * Step 1-4 Pipeline: Evaluates a movement step onto a grid coordinate.
   * Returns an array of structured monster objects if an encounter is triggered, or null if clear.
   *
   * @param {string} [zone='streets'] - e.g. 'streets', 'wine_cellar', 'catacombs_l1'
   * @param {number} [x=0] - Grid cell X
   * @param {number} [y=0] - Grid cell Y
   * @param {string|boolean} [timeOfDayOrIsNight='day'] - 'day'|'night' or boolean isNight
   * @param {number} [baselineChance=0.10] - Baseline random encounter chance per step (10%)
   * @param {Function} [rngFn=Math.random] - Injected RNG function
   * @returns {Array<Object>|null} Array of structured monster objects or null
   */
  static evaluateStep(
    zone = 'streets',
    x = 0,
    y = 0,
    timeOfDayOrIsNight = 'day',
    baselineChance = 0.10,
    rngFn = Math.random
  ) {
    const isNight = timeOfDayOrIsNight === true || String(timeOfDayOrIsNight).toLowerCase() === 'night';
    const timeOfDay = isNight ? 'night' : 'day';

    // ── STEP 1: CHECK TRIGGER (Forced / Keyed Tile) ─────────────────────────
    const forced = getForcedEncounter(zone, x, y);
    if (forced) {
      return this._instantiateFixedEncounter(forced, { zone, x, y, timeOfDay, isNight, trigger: 'forcedTile' }, rngFn);
    }

    // ── STEP 2: RNG CHECK & TABLE SELECTION ─────────────────────────────────
    const roll = typeof rngFn === 'function' ? rngFn() : Math.random();
    if (roll > baselineChance) {
      return null; // No random encounter triggered
    }

    const table = getTableByZoneAndTime(zone, timeOfDay);

    // ── STEP 3: GROUP COUNT ROLL ───────────────────────────────────────────
    const minG = table.minGroups || 1;
    const maxG = table.maxGroups || 1;
    const numGroups = minG === maxG
      ? minG
      : Math.floor((typeof rngFn === 'function' ? rngFn() : Math.random()) * (maxG - minG + 1)) + minG;

    // ── STEP 4: GROUP INGESTION ────────────────────────────────────────────
    const groups = [];
    let totalXP = 0;
    let totalGold = 0;
    let totalMonsters = 0;

    for (let g = 0; g < numGroups; g++) {
      const candidates = table.eligibleMonsterArchetypeIds || table.eligibleArchetypeIds;
      const rIdx = Math.floor((typeof rngFn === 'function' ? rngFn() : Math.random()) * candidates.length);
      const archetypeId = candidates[rIdx];
      const archetype = getMonsterById(archetypeId) || bardTaleMonsters[0];

      // Quantity roll within monster / table bounds
      const minQty = table.minGroupSize || 1;
      const maxQty = table.maxGroupSize || 6;
      const quantity = Math.floor((typeof rngFn === 'function' ? rngFn() : Math.random()) * (maxQty - minQty + 1)) + minQty;

      // Rolled stats for the monster group
      const minHp = archetype.hp?.min || 6;
      const maxHp = archetype.hp?.max || 12;
      const hpPerUnit = Math.floor((typeof rngFn === 'function' ? rngFn() : Math.random()) * (maxHp - minHp + 1)) + minHp;

      const minAc = archetype.armorClass?.min || 8;
      const maxAc = archetype.armorClass?.max || 8;
      const ac = Math.floor((typeof rngFn === 'function' ? rngFn() : Math.random()) * (maxAc - minAc + 1)) + minAc;

      const spriteSlug = archetype.slug || archetype.name.toLowerCase().replace(/\s+/g, '_');
      const distanceFeet = (g + 1) * 10;
      const xpVal = archetype.xpValue || archetype.xp || 60;
      const goldVal = Math.floor(xpVal * 0.4);

      const groupObject = {
        name: archetype.name,
        quantity,
        count: quantity,
        ac,
        hpPerUnit,
        hp: hpPerUnit,
        currentHp: hpPerUnit,
        maxHp: hpPerUnit,
        spriteSlug,
        slug: spriteSlug,
        archetypeId: archetype.id,
        distanceFeet,
        damage: archetype.physicalAttack?.damage || '2d4',
        damageNotation: archetype.physicalAttack?.damage || '2d4',
        hitType: archetype.physicalAttack?.hitType || 'Swing/Slash',
        effect: archetype.physicalAttack?.effect || null,
        onHitEffect: archetype.onHitEffect || archetype.physicalAttack?.effect || null,
        xp: xpVal,
        xpValue: xpVal,
        gold: goldVal,
        actions: archetype.actions || [],
        actionSlots: archetype.actionSlots || [{ type: 'meleeAttack' }, { type: 'meleeAttack' }, { type: 'meleeAttack' }, { type: 'meleeAttack' }],
        power: archetype.power || 1,
        monster: archetype
      };

      groups.push(groupObject);
      totalXP += xpVal * quantity;
      totalGold += goldVal * quantity;
      totalMonsters += quantity;
    }

    // Attach metadata properties directly to the payload array
    groups.encounterId = `enc_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    groups.tableId = table.id;
    groups.zone = normalizeZoneName(zone);
    groups.timeOfDay = timeOfDay;
    groups.isNight = isNight;
    groups.trigger = 'movement';
    groups.groups = groups;
    groups.monsters = groups;
    groups.totalXP = totalXP;
    groups.totalGold = totalGold;
    groups.totalMonsters = totalMonsters;
    groups.exactGroups = groups.length;

    return groups;
  }

  /**
   * Generates an encounter using context parameters or positional arguments.
   * By default does not fail on random chance (checkRng=false).
   *
   * @param {Object|string} [context={}]
   * @param {Function} [rngFn=Math.random]
   * @returns {Array<Object>|null}
   */
  static generateEncounter(context = {}, rngFn = Math.random) {
    let zone = 'streets';
    let timeOfDay = 'day';
    let isNight = false;
    let x = undefined;
    let y = undefined;
    let trigger = 'movement';
    let forcedId = null;
    let checkRng = false;
    let baselineChance = 0.10;

    if (typeof context === 'string') {
      zone = context;
      if (typeof arguments[1] === 'boolean') {
        isNight = arguments[1];
        timeOfDay = isNight ? 'night' : 'day';
      }
    } else if (context && typeof context === 'object') {
      zone = context.zone || 'streets';
      if (typeof context.isNight === 'boolean') {
        isNight = context.isNight;
        timeOfDay = isNight ? 'night' : 'day';
      } else if (context.timeOfDay) {
        timeOfDay = String(context.timeOfDay).toLowerCase();
        isNight = timeOfDay === 'night';
      }
      if (typeof context.x === 'number') x = context.x;
      if (typeof context.y === 'number') y = context.y;
      if (typeof context.mapX === 'number') x = context.mapX;
      if (typeof context.mapY === 'number') y = context.mapY;
      if (context.mapCoord) {
        if (typeof context.mapCoord.x === 'number') x = context.mapCoord.x;
        if (typeof context.mapCoord.y === 'number') y = context.mapCoord.y;
      }
      trigger = context.trigger || 'movement';
      forcedId = context.forcedEncounterId || null;
      checkRng = context.checkRng === true;
      if (typeof context.baselineChance === 'number') baselineChance = context.baselineChance;
    }

    // Step 1: Forced encounter by ID or Map Coordinates
    if (forcedId) {
      const fixed = getForcedEncounterById(forcedId);
      if (fixed) return this._instantiateFixedEncounter(fixed, { zone, x, y, timeOfDay, isNight, trigger: 'forcedTile' }, rngFn);
    }

    if (typeof x === 'number' && typeof y === 'number') {
      const fixed = getForcedEncounter(zone, x, y);
      if (fixed) return this._instantiateFixedEncounter(fixed, { zone, x, y, timeOfDay, isNight, trigger: 'forcedTile' }, rngFn);
    }

    // If checkRng is specified, evaluate step chance
    if (checkRng) {
      const roll = typeof rngFn === 'function' ? rngFn() : Math.random();
      if (roll > baselineChance) return null;
    }

    // Otherwise generate guaranteed encounter from table
    const table = getTableByZoneAndTime(zone, timeOfDay);
    const minG = table.minGroups || 1;
    const maxG = table.maxGroups || 1;
    const numGroups = minG === maxG
      ? minG
      : Math.floor((typeof rngFn === 'function' ? rngFn() : Math.random()) * (maxG - minG + 1)) + minG;

    const groups = [];
    let totalXP = 0;
    let totalGold = 0;
    let totalMonsters = 0;

    for (let g = 0; g < numGroups; g++) {
      const candidates = table.eligibleMonsterArchetypeIds || table.eligibleArchetypeIds;
      const rIdx = Math.floor((typeof rngFn === 'function' ? rngFn() : Math.random()) * candidates.length);
      const archetypeId = candidates[rIdx];
      const archetype = getMonsterById(archetypeId) || bardTaleMonsters[0];

      const minQty = table.minGroupSize || 1;
      const maxQty = table.maxGroupSize || 6;
      const quantity = Math.floor((typeof rngFn === 'function' ? rngFn() : Math.random()) * (maxQty - minQty + 1)) + minQty;

      const minHp = archetype.hp?.min || 6;
      const maxHp = archetype.hp?.max || 12;
      const hpPerUnit = Math.floor((typeof rngFn === 'function' ? rngFn() : Math.random()) * (maxHp - minHp + 1)) + minHp;

      const minAc = archetype.armorClass?.min || 8;
      const maxAc = archetype.armorClass?.max || 8;
      const ac = Math.floor((typeof rngFn === 'function' ? rngFn() : Math.random()) * (maxAc - minAc + 1)) + minAc;

      const spriteSlug = archetype.slug || archetype.name.toLowerCase().replace(/\s+/g, '_');
      const distanceFeet = (g + 1) * 10;
      const xpVal = archetype.xpValue || archetype.xp || 60;
      const goldVal = Math.floor(xpVal * 0.4);

      const groupObject = {
        name: archetype.name,
        quantity,
        count: quantity,
        ac,
        hpPerUnit,
        hp: hpPerUnit,
        currentHp: hpPerUnit,
        maxHp: hpPerUnit,
        spriteSlug,
        slug: spriteSlug,
        archetypeId: archetype.id,
        distanceFeet,
        damage: archetype.physicalAttack?.damage || '2d4',
        damageNotation: archetype.physicalAttack?.damage || '2d4',
        hitType: archetype.physicalAttack?.hitType || 'Swing/Slash',
        effect: archetype.physicalAttack?.effect || null,
        onHitEffect: archetype.onHitEffect || archetype.physicalAttack?.effect || null,
        xp: xpVal,
        xpValue: xpVal,
        gold: goldVal,
        actions: archetype.actions || [],
        actionSlots: archetype.actionSlots || [{ type: 'meleeAttack' }, { type: 'meleeAttack' }, { type: 'meleeAttack' }, { type: 'meleeAttack' }],
        power: archetype.power || 1,
        monster: archetype
      };

      groups.push(groupObject);
      totalXP += xpVal * quantity;
      totalGold += goldVal * quantity;
      totalMonsters += quantity;
    }

    groups.encounterId = `enc_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    groups.tableId = table.id;
    groups.zone = normalizeZoneName(zone);
    groups.timeOfDay = timeOfDay;
    groups.isNight = isNight;
    groups.trigger = trigger;
    groups.groups = groups;
    groups.monsters = groups;
    groups.totalXP = totalXP;
    groups.totalGold = totalGold;
    groups.totalMonsters = totalMonsters;
    groups.exactGroups = groups.length;

    return groups;
  }

  /**
   * Instantiates a fixed/forced encounter record into structured monster group objects.
   * @param {Object} fixed
   * @param {Object} context
   * @param {Function} [rngFn=Math.random]
   * @returns {Array<Object>}
   */
  static _instantiateFixedEncounter(fixed, context, rngFn = Math.random) {
    const groups = [];
    let totalXP = 0;
    let totalGold = 0;
    let totalMonsters = 0;

    fixed.groups.forEach((grp, gIdx) => {
      let archetype = null;
      if (typeof grp.archetypeId === 'number') {
        archetype = getMonsterById(grp.archetypeId);
      }
      if (!archetype && grp.monsterName) {
        const search = grp.monsterName.toLowerCase();
        archetype = bardTaleMonsters.find(m => m.name.toLowerCase() === search);
      }
      if (!archetype) {
        archetype = bardTaleMonsters[0];
      }

      const quantity = grp.count || grp.quantity || 1;
      const minHp = archetype.hp?.min || 6;
      const maxHp = archetype.hp?.max || 12;
      const hpPerUnit = Math.floor((typeof rngFn === 'function' ? rngFn() : Math.random()) * (maxHp - minHp + 1)) + minHp;

      const minAc = archetype.armorClass?.min || 8;
      const maxAc = archetype.armorClass?.max || 8;
      const ac = Math.floor((typeof rngFn === 'function' ? rngFn() : Math.random()) * (maxAc - minAc + 1)) + minAc;

      const spriteSlug = archetype.slug || archetype.name.toLowerCase().replace(/\s+/g, '_');
      const distanceFeet = (gIdx + 1) * 10;
      const xpVal = archetype.xpValue || archetype.xp || 60;
      const goldVal = Math.floor(xpVal * 0.4);

      const groupObject = {
        name: archetype.name,
        quantity,
        count: quantity,
        ac,
        hpPerUnit,
        hp: hpPerUnit,
        currentHp: hpPerUnit,
        maxHp: hpPerUnit,
        spriteSlug,
        slug: spriteSlug,
        archetypeId: archetype.id,
        distanceFeet,
        damage: archetype.physicalAttack?.damage || '2d4',
        damageNotation: archetype.physicalAttack?.damage || '2d4',
        hitType: archetype.physicalAttack?.hitType || 'Swing/Slash',
        effect: archetype.physicalAttack?.effect || null,
        onHitEffect: archetype.onHitEffect || archetype.physicalAttack?.effect || null,
        xp: xpVal,
        xpValue: xpVal,
        gold: goldVal,
        actions: archetype.actions || [],
        actionSlots: archetype.actionSlots || [{ type: 'meleeAttack' }, { type: 'meleeAttack' }, { type: 'meleeAttack' }, { type: 'meleeAttack' }],
        power: archetype.power || 1,
        monster: archetype
      };

      groups.push(groupObject);
      totalXP += xpVal * quantity;
      totalGold += goldVal * quantity;
      totalMonsters += quantity;
    });

    groups.encounterId = `fixed_${fixed.id}_${Date.now()}`;
    groups.tableId = `FIXED_${fixed.id}`;
    groups.zone = context.zone || fixed.zone;
    groups.timeOfDay = context.timeOfDay || (context.isNight ? 'night' : 'day');
    groups.isNight = context.isNight === true;
    groups.trigger = 'forcedTile';
    groups.description = fixed.description || '';
    groups.groups = groups;
    groups.monsters = groups;
    groups.totalXP = totalXP;
    groups.totalGold = totalGold;
    groups.totalMonsters = totalMonsters;
    groups.exactGroups = groups.length;
    groups.archetypeId = groups[0]?.archetypeId;
    groups.archetypeName = groups[0]?.name;

    return groups;
  }

  /**
   * Flattens an encounter payload of monster groups into individual combatants for CombatEngine.
   * If already flattened, returns the input array.
   *
   * @param {Array<Object>|Object} encounter
   * @returns {Array<Object>}
   */
  static flattenEncounterToMonsters(encounter) {
    if (!encounter) return [];
    const groupList = Array.isArray(encounter)
      ? encounter
      : (Array.isArray(encounter.groups) ? encounter.groups : []);

    const combatants = [];

    groupList.forEach((grp, gIdx) => {
      const quantity = grp.quantity || grp.count || 1;
      const archetype = grp.monster || getMonsterById(grp.archetypeId) || {
        id: grp.archetypeId ?? 0,
        name: grp.name || 'Monster',
        slug: grp.spriteSlug || grp.slug || 'monster',
        hp: { min: grp.hpPerUnit || 8, max: grp.hpPerUnit || 8 },
        armorClass: { min: grp.ac || 8, max: grp.ac || 8 }
      };

      for (let i = 0; i < quantity; i++) {
        combatants.push({
          id: `${grp.spriteSlug || grp.slug || archetype.slug || 'mon'}_g${gIdx}_${i}`,
          archetypeId: grp.archetypeId ?? archetype.id,
          name: quantity > 1 ? `${grp.name} #${i + 1}` : grp.name,
          groupName: grp.name,
          groupIndex: gIdx,
          hp: grp.hpPerUnit || grp.hp || 8,
          currentHp: grp.hpPerUnit || grp.currentHp || grp.hp || 8,
          maxHp: grp.hpPerUnit || grp.maxHp || grp.hp || 8,
          ac: grp.ac ?? 8,
          spriteSlug: grp.spriteSlug || grp.slug || archetype.slug,
          slug: grp.spriteSlug || grp.slug || archetype.slug,
          damage: grp.damage || archetype.physicalAttack?.damage || '2d4',
          damageNotation: grp.damageNotation || archetype.physicalAttack?.damage || '2d4',
          hitType: grp.hitType || archetype.physicalAttack?.hitType || 'Swing/Slash',
          effect: grp.effect || archetype.physicalAttack?.effect || null,
          onHitEffect: grp.onHitEffect || archetype.onHitEffect || null,
          xp: grp.xp || archetype.xpValue || archetype.xp || 60,
          xpValue: grp.xpValue || archetype.xpValue || archetype.xp || 60,
          gold: grp.gold ?? Math.floor((grp.xp || 60) * 0.4),
          actions: grp.actions || archetype.actions || [],
          actionSlots: grp.actionSlots || archetype.actionSlots || [{ type: 'meleeAttack' }, { type: 'meleeAttack' }, { type: 'meleeAttack' }, { type: 'meleeAttack' }],
          power: grp.power || archetype.power || 1,
          distanceFeet: grp.distanceFeet || ((gIdx + 1) * 10),
          status: 'alive'
        });
      }
    });

    return combatants;
  }
}
