// MonsterFactory.js - Runtime Monster Combatant Spawner
// Instantiates plain serializable MonsterCombatant runtime state from static monster definitions.

import { getMonsterById, getMonsterBySlug } from '../../data/MonsterDatabase.js';
import { rollRangeInclusive } from '../utils/Dice.js';

let fallbackInstanceCounter = 0;

/**
 * Generates a unique instance identifier.
 * Uses crypto.randomUUID() when available in browser/Node, falling back to a timestamped session ID.
 *
 * @param {string} slug
 * @returns {string}
 */
function generateInstanceId(slug) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  fallbackInstanceCounter = (fallbackInstanceCounter + 1) | 0;
  return `mob_${slug}_${Date.now()}_${fallbackInstanceCounter}`;
}

/**
 * Instantiates a plain serializable MonsterCombatant object from a static Bard's Tale monster archetype.
 *
 * @param {number|string} monsterRef - Numeric legacy provenance ID (0-126) or stable monster slug string.
 * @param {Object} [options={}] - Optional combatant spawn configuration.
 * @param {() => number} [options.rng=Math.random] - Injected RNG function returning [0, 1).
 * @param {'enemy'|'party'} [options.team='enemy'] - Allegiance of combatant ('enemy' | 'party').
 * @param {string} [options.summonedBy] - Display name of summoner if spawned via spell.
 * @param {string} [options.summonerInstanceId] - Instance ID of summoner if spawned via spell.
 * @param {boolean} [options.isIllusion=false] - Whether this combatant is an illusionary summon.
 * @param {string} [options.instanceId] - Explicit instance ID override.
 * @returns {import('./CombatTypes.js').MonsterCombatant}
 * @throws {Error} If monsterRef is invalid or does not match any known monster definition.
 */
export function createMonsterCombatant(monsterRef, options = {}) {
  let monster = null;

  if (typeof monsterRef === 'number') {
    monster = getMonsterById(monsterRef);
  } else if (typeof monsterRef === 'string') {
    monster = getMonsterBySlug(monsterRef);
  }

  if (!monster) {
    throw new Error(`[MonsterFactory] Unknown monster reference: ${JSON.stringify(monsterRef)}. Expected a valid numeric ID (0-126) or registered slug string.`);
  }

  const rng = typeof options.rng === 'function' ? options.rng : undefined;

  // Roll HP and AC inclusively from the monster definition
  const maxHp = rollRangeInclusive(monster.hp, rng);
  const currentHp = maxHp;
  const rolledArmorClass = rollRangeInclusive(monster.armorClass, rng);

  // Generate or assign instanceId
  const instanceId = typeof options.instanceId === 'string' && options.instanceId.trim().length > 0
    ? options.instanceId.trim()
    : generateInstanceId(monster.slug);

  /** @type {import('./CombatTypes.js').MonsterCombatant} */
  const combatant = {
    instanceId,
    monsterSlug: monster.slug,
    currentHp,
    maxHp,
    rolledArmorClass,
    activeStatuses: [],
    activeBuffs: [],
    team: options.team === 'party' ? 'party' : 'enemy',
    summonedBy: options.summonedBy !== undefined ? options.summonedBy : undefined,
    summonerInstanceId: options.summonerInstanceId !== undefined ? options.summonerInstanceId : undefined,
    isIllusion: options.isIllusion === true
  };

  return combatant;
}
