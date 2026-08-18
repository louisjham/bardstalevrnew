// CombatEventApplier.js - Pure Combat Event State Application Layer
// Immutably applies resolved combat action events to plain EncounterState models.

import { deepCloneEncounterState, getLivingCombatants, getCombatantByInstanceId } from './EncounterState.js';
import { createMonsterCombatant } from './MonsterFactory.js';

let fallbackLogIdCounter = 0;

/**
 * Generates a unique log entry identifier.
 * @returns {string}
 */
function generateLogId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  fallbackLogIdCounter = (fallbackLogIdCounter + 1) | 0;
  return `log_${Date.now()}_${fallbackLogIdCounter}`;
}

/**
 * Creates a structured combat log entry.
 *
 * @param {number} round
 * @param {'damage'|'status'|'buff'|'debuff'|'summon'|'system'} type
 * @param {string} message
 * @param {Object} [details={}]
 * @returns {Object} Plain serializable log record.
 */
function createLogRecord(round, type, message, details = {}) {
  return {
    id: generateLogId(),
    round,
    type,
    message,
    sourceInstanceId: details.sourceInstanceId,
    targetInstanceId: details.targetInstanceId,
    spellId: details.spellId,
    monsterSlug: details.monsterSlug,
    metadata: details.metadata ? { ...details.metadata } : {}
  };
}

/**
 * Helper to get a readable display name for a combatant.
 * @param {Object} combatant
 * @returns {string}
 */
function getDisplayName(combatant) {
  if (!combatant) return 'Unknown Target';
  return combatant.name || combatant.monsterSlug || combatant.instanceId;
}

/**
 * Purely applies a resolved combat event to an existing encounter state, returning a new state.
 * Never mutates input encounterState, event, or static monster/spell definitions.
 *
 * @param {Object} encounterState - Base encounter state.
 * @param {Object} event - Resolved combat event from MonsterEffectResolver or player spell engine.
 * @param {Object} [options={}] - Execution options.
 * @param {string} [options.targetInstanceId] - Selected target for single-target actions.
 * @param {(monsterName: string) => string | null} [options.resolveSummon] - Name-to-slug mapping callback.
 * @param {() => number} [options.rng=Math.random] - RNG function for summon stat rolling.
 * @returns {Object} New updated EncounterState.
 */
export function applyCombatEvent(encounterState, event, options = {}) {
  if (!encounterState || typeof encounterState !== 'object') {
    throw new TypeError('[CombatEventApplier] applyCombatEvent expected an encounterState object.');
  }

  if (!event || typeof event !== 'object') {
    throw new TypeError('[CombatEventApplier] applyCombatEvent expected an event object.');
  }

  // Deep clone to ensure 100% immutability
  const nextState = deepCloneEncounterState(encounterState);
  const round = nextState.round;

  const sourceCombatant = event.sourceInstanceId
    ? getCombatantByInstanceId(nextState, event.sourceInstanceId)
    : undefined;
  const sourceName = sourceCombatant ? getDisplayName(sourceCombatant) : (event.sourceMonsterSlug || 'Caster');

  // Handle explicit "unimplemented" events from resolver
  if (event.effect === 'unimplemented') {
    nextState.combatLog.push(createLogRecord(
      round,
      'system',
      event.warning || `Unsupported or unimplemented action effect on ${event.spellName || 'action'}.`,
      {
        sourceInstanceId: event.sourceInstanceId,
        spellId: event.spellId,
        monsterSlug: event.sourceMonsterSlug,
        metadata: { effect: event.effect }
      }
    ));
    return nextState;
  }

  // ─── Special Actions (e.g. Doppleganger) ─────────────────────────────────
  if (event.actionKind === 'special' || event.effect === 'doppleganger') {
    if (event.effect === 'doppleganger' || event.special?.type === 'doppleganger') {
      nextState.combatLog.push(createLogRecord(
        round,
        'system',
        `${sourceName} activates Doppleganger confusion (special effect is not yet active).`,
        {
          sourceInstanceId: event.sourceInstanceId,
          monsterSlug: event.sourceMonsterSlug,
          metadata: { special: 'doppleganger' }
        }
      ));
      return nextState;
    }

    nextState.combatLog.push(createLogRecord(
      round,
      'system',
      `Special action '${event.effect}' executed without active implementation.`,
      {
        sourceInstanceId: event.sourceInstanceId,
        monsterSlug: event.sourceMonsterSlug,
        metadata: { effect: event.effect }
      }
    ));
    return nextState;
  }

  // ─── Spell & Standard Actions ───────────────────────────────────────────
  switch (event.effect) {
    // 1. Single Target Damage
    case 'damageSingleTarget': {
      const targetId = options.targetInstanceId;
      const target = targetId ? getCombatantByInstanceId(nextState, targetId) : undefined;

      if (!target || target.isDefeated) {
        nextState.combatLog.push(createLogRecord(
          round,
          'damage',
          `${sourceName}'s ${event.spellName || 'attack'} failed: target not found or already defeated.`,
          {
            sourceInstanceId: event.sourceInstanceId,
            targetInstanceId: targetId,
            spellId: event.spellId,
            monsterSlug: event.sourceMonsterSlug,
            metadata: { success: false }
          }
        ));
        return nextState;
      }

      const rawDamage = event.damage?.total ?? 0;
      const actualDamage = Math.min(target.currentHp, rawDamage);
      target.currentHp = Math.max(0, target.currentHp - actualDamage);
      if (target.currentHp === 0) {
        target.isDefeated = true;
      }

      const element = event.damage?.element || 'magical';
      const targetName = getDisplayName(target);
      const defeatMsg = target.isDefeated ? ` and defeated ${targetName}!` : ` (${target.currentHp}/${target.maxHp} HP left).`;

      nextState.combatLog.push(createLogRecord(
        round,
        'damage',
        `${sourceName} hit ${targetName} with ${event.spellName || 'spell'} for ${actualDamage} ${element} damage${defeatMsg}`,
        {
          sourceInstanceId: event.sourceInstanceId,
          targetInstanceId: target.instanceId,
          spellId: event.spellId,
          monsterSlug: event.sourceMonsterSlug,
          metadata: {
            damage: actualDamage,
            element,
            defeated: target.isDefeated,
            remainingHp: target.currentHp
          }
        }
      ));
      break;
    }

    // 2. Group Damage / Breath Weapons
    case 'damageGroup': {
      const targetTeam = event.targetTeam || (event.sourceTeam === 'party' ? 'enemy' : 'party');
      const livingTargets = getLivingCombatants(nextState, targetTeam);

      if (livingTargets.length === 0) {
        nextState.combatLog.push(createLogRecord(
          round,
          'damage',
          `${sourceName}'s ${event.spellName || 'spell'} found no active targets on team ${targetTeam}.`,
          {
            sourceInstanceId: event.sourceInstanceId,
            spellId: event.spellId,
            monsterSlug: event.sourceMonsterSlug,
            metadata: { targetTeam, hitCount: 0 }
          }
        ));
        return nextState;
      }

      const rawDamage = event.damage?.total ?? 0;
      const element = event.damage?.element || 'magical';

      for (const target of livingTargets) {
        const actualDamage = Math.min(target.currentHp, rawDamage);
        target.currentHp = Math.max(0, target.currentHp - actualDamage);
        if (target.currentHp === 0) {
          target.isDefeated = true;
        }

        const targetName = getDisplayName(target);
        const defeatMsg = target.isDefeated ? ` and defeated ${targetName}!` : ` (${target.currentHp}/${target.maxHp} HP left).`;

        nextState.combatLog.push(createLogRecord(
          round,
          'damage',
          `${sourceName}'s ${event.spellName || 'spell'} struck ${targetName} for ${actualDamage} ${element} damage${defeatMsg}`,
          {
            sourceInstanceId: event.sourceInstanceId,
            targetInstanceId: target.instanceId,
            spellId: event.spellId,
            monsterSlug: event.sourceMonsterSlug,
            metadata: {
              damage: actualDamage,
              element,
              defeated: target.isDefeated,
              remainingHp: target.currentHp
            }
          }
        ));
      }
      break;
    }

    // 3. Drain
    case 'drain': {
      const targetId = options.targetInstanceId;
      const target = targetId ? getCombatantByInstanceId(nextState, targetId) : undefined;

      if (!target || target.isDefeated) {
        nextState.combatLog.push(createLogRecord(
          round,
          'damage',
          `${sourceName}'s drain attack failed: target not found or already defeated.`,
          {
            sourceInstanceId: event.sourceInstanceId,
            targetInstanceId: targetId,
            spellId: event.spellId,
            monsterSlug: event.sourceMonsterSlug,
            metadata: { success: false }
          }
        ));
        return nextState;
      }

      const rawDamage = event.damage?.total ?? (event.drain?.damage ?? 0);
      const actualDamage = Math.min(target.currentHp, rawDamage);
      target.currentHp = Math.max(0, target.currentHp - actualDamage);
      if (target.currentHp === 0) {
        target.isDefeated = true;
      }

      const element = event.drain?.element || event.damage?.element || 'drain';
      const targetName = getDisplayName(target);

      nextState.combatLog.push(createLogRecord(
        round,
        'damage',
        `${sourceName} drained ${actualDamage} ${element} from ${targetName}${target.isDefeated ? ' (Defeated!)' : ''}.`,
        {
          sourceInstanceId: event.sourceInstanceId,
          targetInstanceId: target.instanceId,
          spellId: event.spellId,
          monsterSlug: event.sourceMonsterSlug,
          metadata: {
            damage: actualDamage,
            element,
            defeated: target.isDefeated,
            remainingHp: target.currentHp
          }
        }
      ));
      break;
    }

    // 4. Status Effects (poison, wither, possess, etc.)
    case 'status': {
      const statusName = event.status || 'wither';
      let targets = [];

      if (options.targetInstanceId) {
        const target = getCombatantByInstanceId(nextState, options.targetInstanceId);
        if (target && !target.isDefeated) {
          targets.push(target);
        }
      } else {
        const targetTeam = event.targetTeam || (event.sourceTeam === 'party' ? 'enemy' : 'party');
        targets = getLivingCombatants(nextState, targetTeam);
      }

      if (targets.length === 0) {
        nextState.combatLog.push(createLogRecord(
          round,
          'status',
          `${sourceName}'s ${statusName} status found no living target.`,
          {
            sourceInstanceId: event.sourceInstanceId,
            spellId: event.spellId,
            monsterSlug: event.sourceMonsterSlug,
            metadata: { status: statusName, applied: false }
          }
        ));
        return nextState;
      }

      for (const target of targets) {
        const alreadyHas = target.activeStatuses.some(
          s => s.status === statusName && s.sourceInstanceId === event.sourceInstanceId
        );

        if (!alreadyHas) {
          target.activeStatuses.push({
            status: statusName,
            sourceInstanceId: event.sourceInstanceId,
            spellId: event.spellId,
            magnitude: event.details?.magnitude
          });

          nextState.combatLog.push(createLogRecord(
            round,
            'status',
            `${getDisplayName(target)} is afflicted with ${statusName} from ${sourceName}.`,
            {
              sourceInstanceId: event.sourceInstanceId,
              targetInstanceId: target.instanceId,
              spellId: event.spellId,
              monsterSlug: event.sourceMonsterSlug,
              metadata: { status: statusName, applied: true }
            }
          ));
        } else {
          nextState.combatLog.push(createLogRecord(
            round,
            'status',
            `${getDisplayName(target)} is already afflicted with ${statusName}.`,
            {
              sourceInstanceId: event.sourceInstanceId,
              targetInstanceId: target.instanceId,
              spellId: event.spellId,
              monsterSlug: event.sourceMonsterSlug,
              metadata: { status: statusName, duplicate: true }
            }
          ));
        }
      }
      break;
    }

    // 5. Group Bonus AC (Buff)
    case 'groupBonusAC': {
      const targetTeam = event.targetTeam || 'party';
      const magnitude = event.buff?.magnitude ?? event.details?.bonus ?? 2;
      const duration = event.details?.duration || 'encounter';
      const targets = getLivingCombatants(nextState, targetTeam);

      for (const target of targets) {
        target.activeBuffs.push({
          stat: 'armorClass',
          type: 'buff',
          magnitude,
          duration,
          sourceInstanceId: event.sourceInstanceId,
          spellId: event.spellId
        });

        nextState.combatLog.push(createLogRecord(
          round,
          'buff',
          `${getDisplayName(target)} receives AC bonus (+${magnitude}) from ${event.spellName || sourceName}.`,
          {
            sourceInstanceId: event.sourceInstanceId,
            targetInstanceId: target.instanceId,
            spellId: event.spellId,
            monsterSlug: event.sourceMonsterSlug,
            metadata: { stat: 'armorClass', magnitude, duration }
          }
        ));
      }
      break;
    }

    // 6. Group Malus AC (Debuff)
    case 'groupMalusAC': {
      const targetTeam = event.targetTeam || 'enemy';
      const magnitude = event.debuff?.magnitude ?? event.details?.bonus ?? event.details?.penalty ?? 2;
      const duration = event.details?.duration || 'encounter';
      const targets = getLivingCombatants(nextState, targetTeam);

      for (const target of targets) {
        target.activeBuffs.push({
          stat: 'armorClass',
          type: 'debuff',
          magnitude,
          duration,
          sourceInstanceId: event.sourceInstanceId,
          spellId: event.spellId
        });

        nextState.combatLog.push(createLogRecord(
          round,
          'debuff',
          `${getDisplayName(target)} suffers AC penalty (-${magnitude}) from ${event.spellName || sourceName}.`,
          {
            sourceInstanceId: event.sourceInstanceId,
            targetInstanceId: target.instanceId,
            spellId: event.spellId,
            monsterSlug: event.sourceMonsterSlug,
            metadata: { stat: 'armorClass', magnitude, duration }
          }
        ));
      }
      break;
    }

    // 7. Bonus Damage (Buff on Single Target)
    case 'bonusDamage': {
      const targetId = options.targetInstanceId;
      const target = targetId ? getCombatantByInstanceId(nextState, targetId) : undefined;

      if (!target || target.isDefeated) {
        nextState.combatLog.push(createLogRecord(
          round,
          'buff',
          `Cannot apply damage bonus: targetInstanceId is missing or invalid.`,
          {
            sourceInstanceId: event.sourceInstanceId,
            targetInstanceId: targetId,
            spellId: event.spellId,
            monsterSlug: event.sourceMonsterSlug,
            metadata: { success: false }
          }
        ));
        return nextState;
      }

      const magnitude = event.buff?.magnitude ?? event.details?.bonus ?? 4;
      const duration = event.details?.duration || 'encounter';

      target.activeBuffs.push({
        stat: 'damage',
        type: 'buff',
        magnitude,
        duration,
        sourceInstanceId: event.sourceInstanceId,
        spellId: event.spellId
      });

      nextState.combatLog.push(createLogRecord(
        round,
        'buff',
        `${getDisplayName(target)} gains +${magnitude} weapon damage bonus from ${event.spellName || sourceName}.`,
        {
          sourceInstanceId: event.sourceInstanceId,
          targetInstanceId: target.instanceId,
          spellId: event.spellId,
          monsterSlug: event.sourceMonsterSlug,
          metadata: { stat: 'damage', magnitude, duration }
        }
      ));
      break;
    }

    // 8. Malus To Hit (Debuff)
    case 'malusToHit': {
      const targetTeam = event.targetTeam || 'enemy';
      const magnitude = event.debuff?.magnitude ?? event.details?.penalty ?? 3;
      const duration = event.details?.duration || 'encounter';
      const targets = getLivingCombatants(nextState, targetTeam);

      for (const target of targets) {
        target.activeBuffs.push({
          stat: 'toHit',
          type: 'debuff',
          magnitude,
          duration,
          sourceInstanceId: event.sourceInstanceId,
          spellId: event.spellId
        });

        nextState.combatLog.push(createLogRecord(
          round,
          'debuff',
          `${getDisplayName(target)} suffers hit accuracy penalty (-${magnitude}) from ${event.spellName || sourceName}.`,
          {
            sourceInstanceId: event.sourceInstanceId,
            targetInstanceId: target.instanceId,
            spellId: event.spellId,
            monsterSlug: event.sourceMonsterSlug,
            metadata: { stat: 'toHit', magnitude, duration }
          }
        ));
      }
      break;
    }

    // 9. Blind
    case 'blind': {
      const targetTeam = event.targetTeam || 'enemy';
      const targets = getLivingCombatants(nextState, targetTeam);

      for (const target of targets) {
        const alreadyBlind = target.activeStatuses.some(
          s => s.status === 'blind' && s.sourceInstanceId === event.sourceInstanceId
        );

        if (!alreadyBlind) {
          target.activeStatuses.push({
            status: 'blind',
            durationRounds: 1,
            sourceInstanceId: event.sourceInstanceId,
            spellId: event.spellId
          });

          nextState.combatLog.push(createLogRecord(
            round,
            'status',
            `${getDisplayName(target)} is blinded by ${event.spellName || sourceName}!`,
            {
              sourceInstanceId: event.sourceInstanceId,
              targetInstanceId: target.instanceId,
              spellId: event.spellId,
              monsterSlug: event.sourceMonsterSlug,
              metadata: { status: 'blind', durationRounds: 1 }
            }
          ));
        }
      }
      break;
    }

    // 10. Summon
    case 'summon': {
      const requestedMonster = event.summon?.monsterName || 'Creature';
      const isIllusion = event.summon?.isIllusion === true;
      const summonTeam = event.sourceTeam === 'party' ? 'party' : 'enemy';

      const resolveSummon = typeof options.resolveSummon === 'function' ? options.resolveSummon : null;
      const mappedSlug = resolveSummon ? resolveSummon(requestedMonster) : null;

      if (!mappedSlug) {
        nextState.combatLog.push(createLogRecord(
          round,
          'system',
          `Summon '${requestedMonster}' is unsupported or could not be mapped to a monster archetype.`,
          {
            sourceInstanceId: event.sourceInstanceId,
            spellId: event.spellId,
            monsterSlug: event.sourceMonsterSlug,
            metadata: { requestedMonster, isIllusion, supported: false }
          }
        ));
        return nextState;
      }

      // Check summon limit
      const currentTeamArray = summonTeam === 'party' ? nextState.party : nextState.enemies;
      const currentSummonsCount = currentTeamArray.filter(c => Boolean(c.summonedBy || c.summonerInstanceId)).length;

      if (currentSummonsCount >= nextState.summonLimitPerTeam) {
        nextState.combatLog.push(createLogRecord(
          round,
          'summon',
          `Summon cap reached (${nextState.summonLimitPerTeam}) for team ${summonTeam}. Cannot summon ${requestedMonster}.`,
          {
            sourceInstanceId: event.sourceInstanceId,
            spellId: event.spellId,
            monsterSlug: event.sourceMonsterSlug,
            metadata: { currentSummonsCount, cap: nextState.summonLimitPerTeam }
          }
        ));
        return nextState;
      }

      // Spawn summoned combatant
      const summonedMob = createMonsterCombatant(mappedSlug, {
        rng: options.rng,
        team: summonTeam,
        summonedBy: sourceName,
        summonerInstanceId: event.sourceInstanceId,
        isIllusion
      });

      summonedMob.isDefeated = false;
      currentTeamArray.push(summonedMob);

      nextState.combatLog.push(createLogRecord(
        round,
        'summon',
        `${sourceName} summoned a ${isIllusion ? 'illusionary ' : ''}${summonedMob.monsterSlug} to the ${summonTeam}!`,
        {
          sourceInstanceId: event.sourceInstanceId,
          targetInstanceId: summonedMob.instanceId,
          spellId: event.spellId,
          monsterSlug: summonedMob.monsterSlug,
          metadata: {
            monsterSlug: summonedMob.monsterSlug,
            isIllusion,
            team: summonTeam,
            currentHp: summonedMob.currentHp,
            maxHp: summonedMob.maxHp
          }
        }
      ));
      break;
    }

    default: {
      nextState.combatLog.push(createLogRecord(
        round,
        'system',
        `Unrecognized event effect: '${event.effect}' on ${event.spellName || 'action'}.`,
        {
          sourceInstanceId: event.sourceInstanceId,
          spellId: event.spellId,
          monsterSlug: event.sourceMonsterSlug,
          metadata: { effect: event.effect }
        }
      ));
      break;
    }
  }

  return nextState;
}
