// EncounterState.js - Plain Serializable State Model for Tactical Encounters
// Pure state container and accessor utilities for managing party, enemy, and combat-log state.

/**
 * Deeply clones a plain serializable encounter state object.
 * @param {Object} state
 * @returns {Object}
 */
export function deepCloneEncounterState(state) {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Creates an immutable, serializable encounter state from configuration.
 *
 * @param {Object} [config={}]
 * @param {string} [config.encounterId]
 * @param {number} [config.round=1]
 * @param {Array<Object>} [config.party=[]]
 * @param {Array<Object>} [config.enemies=[]]
 * @param {Array<Object>} [config.combatLog=[]]
 * @param {number} [config.summonLimitPerTeam=4]
 * @returns {Object} Plain serializable encounter state object.
 * @throws {Error} If duplicate instance IDs are detected across combatants.
 */
export function createEncounterState(config = {}) {
  const encounterId = typeof config.encounterId === 'string' && config.encounterId.trim().length > 0
    ? config.encounterId.trim()
    : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `enc_${Date.now()}_${Math.floor(Math.random() * 1000000)}`);

  const round = typeof config.round === 'number' && config.round >= 1 ? config.round : 1;
  const summonLimitPerTeam = typeof config.summonLimitPerTeam === 'number' && config.summonLimitPerTeam >= 0
    ? config.summonLimitPerTeam
    : 4;

  const seenInstanceIds = new Set();

  // Normalize party combatants
  const party = (Array.isArray(config.party) ? config.party : []).map((hero, idx) => {
    const instanceId = hero.instanceId || `hero_${idx}_${Date.now()}`;
    if (seenInstanceIds.has(instanceId)) {
      throw new Error(`[EncounterState] Duplicate instanceId detected: "${instanceId}" in party.`);
    }
    seenInstanceIds.add(instanceId);

    const maxHp = typeof hero.maxHp === 'number' ? hero.maxHp : (typeof hero.hp === 'number' ? hero.hp : 10);
    const currentHp = typeof hero.currentHp === 'number' ? hero.currentHp : maxHp;
    const isDefeated = hero.isDefeated === true || currentHp <= 0;

    return {
      instanceId,
      name: hero.name || `Hero ${idx + 1}`,
      currentHp: Math.max(0, currentHp),
      maxHp,
      armorClass: typeof hero.armorClass === 'number' ? hero.armorClass : (typeof hero.ac === 'number' ? hero.ac : 10),
      toHitBonus: typeof hero.toHitBonus === 'number' ? hero.toHitBonus : 0,
      damageBonus: typeof hero.damageBonus === 'number' ? hero.damageBonus : 0,
      activeStatuses: Array.isArray(hero.activeStatuses) ? [...hero.activeStatuses] : [],
      activeBuffs: Array.isArray(hero.activeBuffs) ? [...hero.activeBuffs] : [],
      isDefeated,
      team: 'party'
    };
  });

  // Normalize enemy combatants
  const enemies = (Array.isArray(config.enemies) ? config.enemies : []).map((mob, idx) => {
    const instanceId = mob.instanceId || `enemy_${idx}_${Date.now()}`;
    if (seenInstanceIds.has(instanceId)) {
      throw new Error(`[EncounterState] Duplicate instanceId detected: "${instanceId}" in enemies.`);
    }
    seenInstanceIds.add(instanceId);

    const maxHp = typeof mob.maxHp === 'number' ? mob.maxHp : (typeof mob.currentHp === 'number' ? mob.currentHp : 10);
    const currentHp = typeof mob.currentHp === 'number' ? mob.currentHp : maxHp;
    const isDefeated = mob.isDefeated === true || currentHp <= 0;

    return {
      instanceId,
      monsterSlug: mob.monsterSlug || mob.slug || 'unknown_monster',
      currentHp: Math.max(0, currentHp),
      maxHp,
      rolledArmorClass: typeof mob.rolledArmorClass === 'number' ? mob.rolledArmorClass : (typeof mob.ac === 'number' ? mob.ac : 10),
      activeStatuses: Array.isArray(mob.activeStatuses) ? [...mob.activeStatuses] : [],
      activeBuffs: Array.isArray(mob.activeBuffs) ? [...mob.activeBuffs] : [],
      team: mob.team === 'party' ? 'party' : 'enemy',
      summonedBy: mob.summonedBy,
      summonerInstanceId: mob.summonerInstanceId,
      isIllusion: mob.isIllusion === true,
      isDefeated
    };
  });

  const combatLog = Array.isArray(config.combatLog) ? JSON.parse(JSON.stringify(config.combatLog)) : [];

  return {
    encounterId,
    round,
    party,
    enemies,
    combatLog,
    summonLimitPerTeam
  };
}

/**
 * Returns all active (non-defeated, HP > 0) combatants for a given team.
 *
 * @param {Object} encounterState
 * @param {'party'|'enemy'} team
 * @returns {Array<Object>}
 */
export function getLivingCombatants(encounterState, team) {
  if (!encounterState) return [];
  if (team === 'party') {
    return encounterState.party.filter(c => !c.isDefeated && c.currentHp > 0);
  }
  if (team === 'enemy') {
    return encounterState.enemies.filter(c => !c.isDefeated && c.currentHp > 0);
  }
  return [];
}

/**
 * Looks up a combatant across party and enemies by unique instanceId.
 *
 * @param {Object} encounterState
 * @param {string} instanceId
 * @returns {Object|undefined}
 */
export function getCombatantByInstanceId(encounterState, instanceId) {
  if (!encounterState || typeof instanceId !== 'string') return undefined;

  for (const hero of encounterState.party) {
    if (hero.instanceId === instanceId) return hero;
  }
  for (const mob of encounterState.enemies) {
    if (mob.instanceId === instanceId) return mob;
  }
  return undefined;
}
