// CombatSandbox.js - Developer-Only Headless Combat Sandbox
// Integrates canonical monster database, spell registry, effect resolver, and immutable encounter state.

import { getMonsterById, getMonsterBySlug } from '../../data/MonsterDatabase.js';
import { getSpellById } from '../../data/SpellDatabase.js';
import { createMonsterCombatant } from './MonsterFactory.js';
import { createSeededRng, rollDice } from '../utils/Dice.js';
import { resolveMonsterAction } from './MonsterEffectResolver.js';
import { createEncounterState, getLivingCombatants, getCombatantByInstanceId, deepCloneEncounterState } from './EncounterState.js';
import { applyCombatEvent } from './CombatEventApplier.js';

/**
 * Standard default 6-hero sandbox party fixture.
 */
export const DEFAULT_SANDBOX_PARTY = Object.freeze([
  { instanceId: 'hero_paladin_01', name: 'Elric (Paladin)', currentHp: 28, maxHp: 28, armorClass: 5, toHitBonus: 2, damageBonus: 2, team: 'party', activeStatuses: [], activeBuffs: [], isDefeated: false },
  { instanceId: 'hero_warrior_02', name: 'Thorin (Warrior)', currentHp: 32, maxHp: 32, armorClass: 4, toHitBonus: 3, damageBonus: 3, team: 'party', activeStatuses: [], activeBuffs: [], isDefeated: false },
  { instanceId: 'hero_bard_03', name: 'Gaelen (Bard)', currentHp: 20, maxHp: 20, armorClass: 6, toHitBonus: 1, damageBonus: 1, team: 'party', activeStatuses: [], activeBuffs: [], isDefeated: false },
  { instanceId: 'hero_rogue_04', name: 'Shadow (Rogue)', currentHp: 18, maxHp: 18, armorClass: 7, toHitBonus: 2, damageBonus: 1, team: 'party', activeStatuses: [], activeBuffs: [], isDefeated: false },
  { instanceId: 'hero_conjurer_05', name: 'Kael (Conjurer)', currentHp: 14, maxHp: 14, armorClass: 8, toHitBonus: 0, damageBonus: 0, team: 'party', activeStatuses: [], activeBuffs: [], isDefeated: false },
  { instanceId: 'hero_magician_06', name: 'Morgana (Magician)', currentHp: 12, maxHp: 12, armorClass: 9, toHitBonus: 0, damageBonus: 0, team: 'party', activeStatuses: [], activeBuffs: [], isDefeated: false }
]);

/**
 * Canonical summon name-to-slug mapping dictionary.
 */
const CANONICAL_SUMMON_MAP = Object.freeze({
  'wolf': 'wolf',
  'mercenary': 'mercenary',
  'ogre': 'ogre',
  'skeleton': 'skeleton',
  'zombie': 'zombie',
  'lesser demon': 'lesser_demon',
  'demon': 'demon',
  'ghoul': 'ghoul',
  'wraith': 'wraith',
  'red dragon': 'red_dragon',
  'storm giant': 'storm_giant',
  'green dragon': 'green_dragon',
  'war giant': 'war_giant',
  'master wizard': 'master_wizard',
  'lich': 'lich',
  'spectre': 'spectre',
  'samurai': 'samurai',
  'titan': 'titan',
  'golem': 'golem',
  'mongo': 'mongo',
  'fred': 'fred',
  'old man': 'old_man',
  'greater demon': 'greater_demon',
  'demon lord': 'demon_lord',
  'phantom': 'ghoul',
  'target dummy': null,
  'dummy': null,
  'joe the sword': null,
  'animated sword': null,
  'thor': null
});

/**
 * Creates a deterministic, headless combat sandbox instance.
 *
 * @param {Object} [config={}]
 * @param {string|number} [config.seed='bards_tale_sandbox_1985'] - Initial PRNG seed.
 * @param {Array<Object>} [config.party] - Custom initial party roster.
 * @param {number} [config.summonLimitPerTeam=4] - Max summons allowed per team.
 * @returns {Object} Combat sandbox API object.
 */
export function createCombatSandbox(config = {}) {
  let currentSeed = config.seed !== undefined ? config.seed : 'bards_tale_sandbox_1985';
  let rng = createSeededRng(currentSeed);

  let initialParty = config.party && Array.isArray(config.party) && config.party.length > 0
    ? JSON.parse(JSON.stringify(config.party))
    : JSON.parse(JSON.stringify(DEFAULT_SANDBOX_PARTY));

  const summonLimit = typeof config.summonLimitPerTeam === 'number' ? config.summonLimitPerTeam : 4;

  let encounterState = createEncounterState({
    party: initialParty,
    enemies: [],
    summonLimitPerTeam: summonLimit
  });

  /**
   * Default summon resolver handling canonical slugs and choice pools (e.g. "Skeleton/Zombie").
   * @param {string} monsterName
   * @returns {string|null}
   */
  function defaultResolveSummon(monsterName) {
    if (!monsterName || typeof monsterName !== 'string') return null;
    const clean = monsterName.trim();

    // Choice pools (e.g. "Skeleton/Zombie", "Ghoul/Wraith", "Lich/Spectre", "Greater demon/Demon lord")
    if (clean.includes('/')) {
      const parts = clean.split('/').map(p => p.trim());
      const choiceIdx = Math.floor(rng() * parts.length);
      return defaultResolveSummon(parts[choiceIdx]);
    }

    const lower = clean.toLowerCase();
    return CANONICAL_SUMMON_MAP[lower] !== undefined ? CANONICAL_SUMMON_MAP[lower] : null;
  }

  const api = {
    /**
     * Gets the current seed string or number.
     * @returns {string|number}
     */
    getSeed() {
      return currentSeed;
    },

    /**
     * Updates the PRNG seed and resets the deterministic random sequence.
     * @param {string|number} seed
     */
    setSandboxSeed(seed) {
      currentSeed = seed;
      rng = createSeededRng(currentSeed);
    },

    /**
     * Alias for setSandboxSeed.
     */
    setSeed(seed) {
      api.setSandboxSeed(seed);
    },

    /**
     * Sets or replaces the active party roster.
     * @param {Array<Object>} partyMembers
     */
    setSandboxParty(partyMembers) {
      initialParty = JSON.parse(JSON.stringify(partyMembers));
      encounterState = createEncounterState({
        party: initialParty,
        enemies: encounterState.enemies,
        combatLog: encounterState.combatLog,
        summonLimitPerTeam: encounterState.summonLimitPerTeam,
        round: encounterState.round
      });
    },

    /**
     * Alias for setSandboxParty.
     */
    setParty(partyMembers) {
      api.setSandboxParty(partyMembers);
    },

    /**
     * Spawns a monster instance into the sandbox using canonical monster data.
     *
     * @param {number|string} monsterRef - Numeric ID (0-126) or stable slug.
     * @param {Object} [options={}] - Override spawn parameters.
     * @returns {Object} Instantiated MonsterCombatant copy.
     */
    spawnSandboxMonster(monsterRef, options = {}) {
      const mob = createMonsterCombatant(monsterRef, {
        rng,
        team: options.team || 'enemy',
        summonedBy: options.summonedBy,
        summonerInstanceId: options.summonerInstanceId,
        isIllusion: options.isIllusion,
        instanceId: options.instanceId
      });

      mob.isDefeated = false;

      const nextEnemies = [...encounterState.enemies];
      const nextParty = [...encounterState.party];

      if (mob.team === 'party') {
        nextParty.push(mob);
      } else {
        nextEnemies.push(mob);
      }

      encounterState = {
        ...encounterState,
        party: nextParty,
        enemies: nextEnemies
      };

      return JSON.parse(JSON.stringify(mob));
    },

    /**
     * Alias for spawnSandboxMonster.
     */
    spawnMonster(monsterRef, options) {
      return api.spawnSandboxMonster(monsterRef, options);
    },

    /**
     * Returns an immutable, serializable deep copy of current encounter state.
     * @returns {Object}
     */
    getSandboxState() {
      return deepCloneEncounterState(encounterState);
    },

    /**
     * Alias for getSandboxState.
     */
    getState() {
      return api.getSandboxState();
    },

    /**
     * Lists all executable actions for a spawned monster instance.
     * Action index 0 represents the baseline physical attack.
     * Action indices 1..N represent extra source spell/special actions.
     *
     * @param {string} monsterInstanceId
     * @returns {Array<Object>}
     */
    listAvailableMonsterActions(monsterInstanceId) {
      const mob = getCombatantByInstanceId(encounterState, monsterInstanceId);
      if (!mob) {
        throw new Error(`[CombatSandbox] Monster with instanceId "${monsterInstanceId}" not found in sandbox.`);
      }

      const staticMonster = getMonsterBySlug(mob.monsterSlug);
      if (!staticMonster) {
        throw new Error(`[CombatSandbox] Static monster definition not found for slug "${mob.monsterSlug}".`);
      }

      const actions = [
        {
          index: 0,
          kind: 'physical',
          name: `${staticMonster.physicalAttack.hitType} Melee`,
          hitType: staticMonster.physicalAttack.hitType,
          damage: staticMonster.physicalAttack.damage,
          effect: staticMonster.physicalAttack.effect || null,
          details: null
        }
      ];

      (staticMonster.actions || []).forEach((act, idx) => {
        const canonicalSpell = typeof act.spellId === 'number' ? getSpellById(act.spellId) : null;
        actions.push({
          index: idx + 1,
          kind: act.kind,
          spellId: act.spellId,
          spellName: canonicalSpell?.name || act.spellName || `Spell #${act.spellId}`,
          effect: act.effect,
          details: act.details || null,
          canonicalSpell: canonicalSpell ? {
            id: canonicalSpell.id,
            name: canonicalSpell.name,
            function: canonicalSpell.function,
            details: canonicalSpell.details
          } : null
        });
      });

      return actions;
    },

    /**
     * Alias for listAvailableMonsterActions.
     */
    listMonsterActions(monsterInstanceId) {
      return api.listAvailableMonsterActions(monsterInstanceId);
    },

    /**
     * Executes a monster action against the sandbox encounter state.
     * Single-target actions with omitted targetInstanceId deterministically auto-target the first living valid combatant.
     *
     * @param {string} monsterInstanceId - Caster monster instance ID.
     * @param {number} [actionIndex=0] - 0 for physical melee attack; 1..N for spell/special actions.
     * @param {Object} [options={}] - Execution options (targetInstanceId, resolveSummon, etc.).
     * @returns {Object} Updated safe snapshot of EncounterState.
     */
    executeSandboxMonsterAction(monsterInstanceId, actionIndex = 0, options = {}) {
      const mob = getCombatantByInstanceId(encounterState, monsterInstanceId);
      if (!mob) {
        throw new Error(`[CombatSandbox] Monster with instanceId "${monsterInstanceId}" not found.`);
      }

      if (mob.isDefeated) {
        encounterState = applyCombatEvent(encounterState, {
          eventId: `skip_${Date.now()}`,
          effect: 'unimplemented',
          warning: `${mob.monsterSlug} is defeated and cannot act.`,
          sourceInstanceId: mob.instanceId
        });
        return api.getSandboxState();
      }

      const staticMonster = getMonsterBySlug(mob.monsterSlug);
      if (!staticMonster) {
        throw new Error(`[CombatSandbox] Static monster definition not found for slug "${mob.monsterSlug}".`);
      }

      const opposingTeam = mob.team === 'party' ? 'enemy' : 'party';
      const sameTeam = mob.team;

      // ─── Physical Attack (Index 0) ──────────────────────────────────────
      if (actionIndex === 0) {
        const damageNotation = staticMonster.physicalAttack.damage || '1d4';
        const damageRoll = rollDice(damageNotation, rng);

        // Auto-select first living opponent if no target specified
        let targetId = options.targetInstanceId;
        if (!targetId) {
          const livingOpponents = getLivingCombatants(encounterState, opposingTeam);
          targetId = livingOpponents[0]?.instanceId;
        }

        const physicalEvent = {
          eventId: `phys_${Date.now()}_${Math.floor(rng() * 1000000)}`,
          actionKind: 'physical',
          effect: 'damageSingleTarget',
          sourceInstanceId: mob.instanceId,
          sourceMonsterSlug: mob.monsterSlug,
          sourceTeam: mob.team,
          targetTeam: opposingTeam,
          damage: {
            notation: damageRoll.notation,
            rolls: damageRoll.rolls,
            modifier: damageRoll.modifier,
            total: damageRoll.total,
            element: 'physical'
          },
          details: {
            hitType: staticMonster.physicalAttack.hitType,
            raw: staticMonster.physicalAttack.damage
          }
        };

        encounterState = applyCombatEvent(encounterState, physicalEvent, {
          targetInstanceId: targetId,
          rng
        });

        // Apply on-hit status if monster has physical effect (poison, wither, etc.)
        if (staticMonster.physicalAttack.effect && targetId) {
          const statusEvent = {
            eventId: `phys_status_${Date.now()}`,
            actionKind: 'physical',
            effect: 'status',
            status: staticMonster.physicalAttack.effect,
            sourceInstanceId: mob.instanceId,
            sourceMonsterSlug: mob.monsterSlug,
            sourceTeam: mob.team,
            targetTeam: opposingTeam
          };
          encounterState = applyCombatEvent(encounterState, statusEvent, {
            targetInstanceId: targetId,
            rng
          });
        }

        return api.getSandboxState();
      }

      // ─── Spell / Special Action (Index 1..N) ─────────────────────────────
      const sourceActionIndex = actionIndex - 1;
      const sourceAction = (staticMonster.actions || [])[sourceActionIndex];

      if (!sourceAction) {
        throw new RangeError(`[CombatSandbox] Invalid action index ${actionIndex}. Monster "${mob.monsterSlug}" has ${staticMonster.actions?.length || 0} source actions.`);
      }

      const casterLevel = Math.max(0, staticMonster.power || 0);

      const resolvedEvent = resolveMonsterAction(sourceAction, {
        sourceInstanceId: mob.instanceId,
        sourceMonsterSlug: mob.monsterSlug,
        sourceTeam: mob.team,
        targetTeam: opposingTeam,
        rng,
        casterLevel
      });

      // Target resolution for single-target effects
      let targetId = options.targetInstanceId;
      if (!targetId) {
        if (resolvedEvent.effect === 'bonusDamage') {
          // Buff allies
          const livingAllies = getLivingCombatants(encounterState, sameTeam);
          targetId = livingAllies[0]?.instanceId;
        } else if (resolvedEvent.effect === 'damageSingleTarget' || resolvedEvent.effect === 'drain' || (resolvedEvent.effect === 'status' && !resolvedEvent.targetTeam)) {
          // Attack opponents
          const livingOpponents = getLivingCombatants(encounterState, opposingTeam);
          targetId = livingOpponents[0]?.instanceId;
        }
      }

      const resolveSummonCallback = typeof options.resolveSummon === 'function'
        ? options.resolveSummon
        : defaultResolveSummon;

      encounterState = applyCombatEvent(encounterState, resolvedEvent, {
        targetInstanceId: targetId,
        resolveSummon: resolveSummonCallback,
        rng
      });

      return api.getSandboxState();
    },

    /**
     * Alias for executeSandboxMonsterAction.
     */
    executeMonsterAction(monsterInstanceId, actionIndex, options) {
      return api.executeSandboxMonsterAction(monsterInstanceId, actionIndex, options);
    },

    /**
     * Resets the sandbox state, restoring default party and clearing enemies and combat log.
     * Retains the current PRNG seed unless explicitly reset.
     */
    resetSandbox() {
      encounterState = createEncounterState({
        party: JSON.parse(JSON.stringify(initialParty)),
        enemies: [],
        summonLimitPerTeam: summonLimit,
        round: 1
      });
      return api.getSandboxState();
    },

    /**
     * Alias for resetSandbox.
     */
    reset() {
      return api.resetSandbox();
    }
  };

  return api;
}

// Module-level direct accessor functions for convenience
export function spawnSandboxMonster(monsterRef, options) {
  const defaultSandbox = createCombatSandbox();
  return defaultSandbox.spawnSandboxMonster(monsterRef, options);
}

export function setSandboxParty(partyMembers) {
  const defaultSandbox = createCombatSandbox();
  defaultSandbox.setSandboxParty(partyMembers);
  return defaultSandbox;
}

export function setSandboxSeed(seed) {
  const defaultSandbox = createCombatSandbox();
  defaultSandbox.setSandboxSeed(seed);
  return defaultSandbox;
}

export function getSandboxState() {
  const defaultSandbox = createCombatSandbox();
  return defaultSandbox.getSandboxState();
}

export function listAvailableMonsterActions(monsterInstanceId) {
  const defaultSandbox = createCombatSandbox();
  return defaultSandbox.listAvailableMonsterActions(monsterInstanceId);
}

export function executeSandboxMonsterAction(monsterInstanceId, actionIndex, options) {
  const defaultSandbox = createCombatSandbox();
  return defaultSandbox.executeSandboxMonsterAction(monsterInstanceId, actionIndex, options);
}

export function resetSandbox() {
  const defaultSandbox = createCombatSandbox();
  return defaultSandbox.resetSandbox();
}
