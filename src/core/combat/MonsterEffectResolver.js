// MonsterEffectResolver.js - Pure Monster Spell & Effect Action Resolver
// Transforms static monster action definitions and canonical spells into serializable combat events.

import { getSpellById } from '../../data/SpellDatabase.js';
import { rollDice } from '../utils/Dice.js';

let fallbackEventCounter = 0;

/**
 * Generates a unique event identifier.
 * Uses crypto.randomUUID() when available in browser/Node environments, falling back to session IDs.
 *
 * @param {() => number} [rng=Math.random]
 * @returns {string}
 */
function generateEventId(rng = Math.random) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  fallbackEventCounter = (fallbackEventCounter + 1) | 0;
  return `evt_${Date.now()}_${fallbackEventCounter}_${Math.floor(rng() * 1000000)}`;
}

/**
 * Known bare status keywords in Bard's Tale monster action definitions.
 * @type {ReadonlySet<string>}
 */
const BARE_STATUS_EFFECTS = new Set([
  'poison',
  'wither',
  'possess',
  'drain',
  'insanity',
  'stone',
  'critical',
  'doppleganger'
]);

/**
 * Parses a source-derived monster action `details` string into a structured plain object.
 * Supports semicolon-delimited key=value pairs, bare status strings, and preserves unknown fields.
 *
 * @param {string|undefined|null} details - Source details string (e.g. "element=freeze; damage=24d4").
 * @returns {Object} Plain parsed details object including the original raw string.
 */
export function parseActionDetails(details) {
  if (!details || typeof details !== 'string') {
    return { raw: typeof details === 'string' ? details : '' };
  }

  const raw = details.trim();
  if (raw.length === 0) {
    return { raw: '' };
  }

  /** @type {Record<string, any>} */
  const result = { raw };
  const segments = raw.split(';').map(s => s.trim()).filter(Boolean);

  for (const segment of segments) {
    // Check if segment is a bare status effect (e.g. "wither", "stone", "poison")
    const lowerSegment = segment.toLowerCase();
    if (BARE_STATUS_EFFECTS.has(lowerSegment)) {
      result.status = lowerSegment;
      continue;
    }

    // Key=Value parsing
    const eqIdx = segment.indexOf('=');
    if (eqIdx !== -1) {
      const key = segment.substring(0, eqIdx).trim();
      const rawVal = segment.substring(eqIdx + 1).trim();

      // Convert boolean / number values safely
      let val;
      if (rawVal.toLowerCase() === 'true') {
        val = true;
      } else if (rawVal.toLowerCase() === 'false') {
        val = false;
      } else if (/^-?\d+$/.test(rawVal) && !rawVal.includes('d')) {
        val = parseInt(rawVal, 10);
      } else {
        val = rawVal;
      }

      // Standard canonical fields
      switch (key.toLowerCase()) {
        case 'element':
          result.element = val;
          break;
        case 'damage':
          result.damage = val;
          break;
        case 'type':
          result.type = val;
          break;
        case 'specialsummon':
          result.specialSummon = val;
          break;
        case 'illusion':
          result.illusion = Boolean(val);
          break;
        case 'bonus':
          result.bonus = typeof val === 'number' ? val : parseInt(val, 10) || val;
          break;
        case 'penalty':
          result.penalty = typeof val === 'number' ? val : parseInt(val, 10) || val;
          break;
        case 'target':
          result.target = val;
          break;
        default:
          if (!result.unknown) {
            result.unknown = {};
          }
          result.unknown[key] = val;
          break;
      }
    } else {
      // Non-KV string segment that is not a known status keyword
      if (!result.unknown) {
        result.unknown = {};
      }
      result.unknown[segment] = true;
    }
  }

  return result;
}

/**
 * Maps a canonical spell's `function` name to an internal combat effect string.
 * @param {string|undefined} funcName
 * @param {Object} [canonicalSpell]
 * @param {string} [fallbackEffect]
 * @returns {string}
 */
function mapCanonicalFunctionToEffect(funcName, canonicalSpell, fallbackEffect) {
  if (!funcName) return fallbackEffect || 'unimplemented';

  switch (funcName) {
    case 'DamageSingleTarget':
      return 'damageSingleTarget';
    case 'DamageGroup':
    case 'DamageAllGroups':
    case 'Breath':
      return 'damageGroup';
    case 'Drain':
      return 'drain';
    case 'GroupBonusAC':
    case 'PartyBonusAC':
    case 'SelfBonusAC':
      return 'groupBonusAC';
    case 'GroupMalusAC':
      return 'groupMalusAC';
    case 'BonusDamage':
    case 'MemberBonusDamageDices':
      return 'bonusDamage';
    case 'MalusToHit':
      return 'malusToHit';
    case 'Blind':
      return 'blind';
    case 'Status':
      return 'status';
    case 'Summon':
      return 'summon';
    case 'RepelUndead':
      return canonicalSpell?.target === 'group' ? 'damageGroup' : 'damageSingleTarget';
    default:
      return fallbackEffect || 'unimplemented';
  }
}

/**
 * Resolves a scaling dice formula string (e.g. "1x(level+1)d4", "2x(level+1)d4") for a given caster level.
 * @param {string} formula
 * @param {number} casterLevel
 * @returns {string} Standard dice notation (e.g. "4d4").
 */
function resolveScalingFormula(formula, casterLevel) {
  const lvl = typeof casterLevel === 'number' && !isNaN(casterLevel) ? Math.max(0, casterLevel) : 0;
  const match = formula.match(/^(\d+)\s*x\s*\(level\+1\)\s*d(\d+)$/i);
  if (match) {
    const mult = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const count = mult * (lvl + 1);
    return `${count}d${sides}`;
  }
  return formula;
}

/**
 * Resolves a monster spell or special action into a pure, serializable combat event data structure.
 * Prefers canonical SpellDatabase records when action.spellId is present, falling back to embedded action details.
 *
 * @param {import('./CombatTypes.js').MonsterAction} action - SpellAction or SpecialAction from MonsterDatabase.
 * @param {Object} [context={}] - Resolution context containing caster stats, RNG, and team metadata.
 * @param {string} [context.sourceInstanceId] - ID of monster casting the spell.
 * @param {string} [context.sourceMonsterSlug] - Slug of casting monster.
 * @param {'party'|'enemy'} [context.sourceTeam='enemy'] - Allegiance of caster.
 * @param {'party'|'enemy'} [context.targetTeam] - Target team.
 * @param {() => number} [context.rng=Math.random] - RNG function returning [0, 1).
 * @param {number} [context.casterLevel=0] - Level of caster used for formula scaling (e.g. ARC FIRE).
 * @returns {Object} Plain serializable combat event object.
 * @throws {TypeError} If action is malformed or not a recognized monster action.
 */
export function resolveMonsterAction(action, context = {}) {
  if (!action || typeof action !== 'object') {
    throw new TypeError(`[MonsterEffectResolver] resolveMonsterAction expected an action object. Received: ${action}`);
  }

  if (action.kind !== 'spell' && action.kind !== 'special') {
    throw new TypeError(`[MonsterEffectResolver] Unsupported action kind "${action.kind}". Expected "spell" or "special".`);
  }

  const rng = typeof context.rng === 'function' ? context.rng : undefined;
  const eventId = generateEventId(rng);
  const parsedActionDetails = parseActionDetails(action.details);

  const sourceTeam = context.sourceTeam === 'party' ? 'party' : 'enemy';
  const targetTeam = context.targetTeam
    ? context.targetTeam
    : (sourceTeam === 'party' ? 'enemy' : 'party');

  // ─── Special Action Resolution (e.g. Doppleganger) ──────────────────────
  if (action.kind === 'special') {
    if (action.effect === 'doppleganger') {
      return {
        eventId,
        sourceInstanceId: context.sourceInstanceId,
        sourceMonsterSlug: context.sourceMonsterSlug,
        sourceTeam,
        targetTeam,
        actionKind: 'special',
        effect: 'doppleganger',
        special: {
          type: 'doppleganger',
          description: 'Doppleganger infiltrates party formation or confuses target.'
        },
        details: parsedActionDetails,
        provenance: {
          canonicalSpellFound: false,
          usedFallbackFields: [],
          actionEffect: action.effect,
          actionDetails: action.details
        }
      };
    }

    return {
      eventId,
      sourceInstanceId: context.sourceInstanceId,
      sourceMonsterSlug: context.sourceMonsterSlug,
      sourceTeam,
      targetTeam,
      actionKind: 'special',
      effect: 'unimplemented',
      warning: `Unsupported special action effect: "${action.effect}".`,
      details: parsedActionDetails,
      provenance: {
        canonicalSpellFound: false,
        usedFallbackFields: [],
        actionEffect: action.effect,
        actionDetails: action.details
      }
    };
  }

  // ─── Canonical Spell Registry Lookup & Precedence ───────────────────────
  const usedFallbackFields = [];
  const canonicalSpell = typeof action.spellId === 'number' ? getSpellById(action.spellId) : undefined;
  const canonicalSpellFound = Boolean(canonicalSpell);

  const spellId = canonicalSpell?.id ?? action.spellId;
  const spellName = canonicalSpell?.name ?? action.spellName;
  const sourceFunction = canonicalSpell?.function ?? 'Spell';

  // Determine effect classification
  const effect = canonicalSpell
    ? mapCanonicalFunctionToEffect(canonicalSpell.function, canonicalSpell, action.effect)
    : action.effect;

  // Track fallback fields when canonical spell was found but a field was omitted in canonical data
  if (canonicalSpellFound) {
    if (parsedActionDetails.element && !canonicalSpell.details?.element) {
      usedFallbackFields.push('element');
    }
    if (parsedActionDetails.damage && !canonicalSpell.details?.damage && !canonicalSpell.details?.sourceDamage) {
      usedFallbackFields.push('damage');
    }
  } else {
    usedFallbackFields.push('all');
  }

  // Dev-mode check for non-fatal mismatches
  if (canonicalSpellFound && typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
    if (parsedActionDetails.element && canonicalSpell.details?.element && parsedActionDetails.element !== canonicalSpell.details.element) {
      console.warn(`[MonsterEffectResolver] Field mismatch on spellId ${action.spellId} (monster: ${context.sourceMonsterSlug || 'unknown'}): element canonical="${canonicalSpell.details.element}" vs action="${parsedActionDetails.element}"`);
    }
  }

  // Merge details: canonical details take precedence, with parsedActionDetails as fallback
  const mergedDetails = {
    ...parsedActionDetails,
    ...(canonicalSpell?.details || {})
  };

  /** @type {Record<string, any>} */
  const event = {
    eventId,
    actionKind: 'spell',
    spellId,
    spellName,
    sourceFunction,
    effect,
    sourceInstanceId: context.sourceInstanceId,
    sourceMonsterSlug: context.sourceMonsterSlug,
    sourceTeam,
    targetTeam,
    details: mergedDetails,
    provenance: {
      canonicalSpellFound,
      usedFallbackFields,
      actionSpellName: action.spellName,
      actionEffect: action.effect,
      actionDetails: action.details
    }
  };

  // ─── Effect-Specific Execution ──────────────────────────────────────────
  switch (effect) {
    case 'damageSingleTarget':
    case 'damageGroup':
    case 'drain': {
      const sourceDamageFormula = canonicalSpell?.details?.sourceDamage || (
        typeof mergedDetails.damage === 'string' && mergedDetails.damage.includes('level')
          ? mergedDetails.damage
          : undefined
      );

      let diceNotation = mergedDetails.damage;
      let element = canonicalSpell?.details?.element || parsedActionDetails.element || 'magical';

      if (sourceDamageFormula) {
        const resolvedNotation = resolveScalingFormula(sourceDamageFormula, context.casterLevel ?? 0);
        event.details.sourceNotation = sourceDamageFormula;
        event.details.resolvedNotation = resolvedNotation;
        diceNotation = resolvedNotation;
      }

      if (typeof diceNotation === 'string' && diceNotation.length > 0) {
        const rollResult = rollDice(diceNotation, rng);
        event.damage = {
          notation: rollResult.notation,
          rolls: rollResult.rolls,
          modifier: rollResult.modifier,
          total: rollResult.total,
          element
        };
      }

      if (effect === 'drain') {
        event.drain = {
          element,
          damage: event.damage ? event.damage.total : 0
        };
      }
      break;
    }

    case 'groupBonusAC': {
      const bonus = typeof canonicalSpell?.param === 'number'
        ? canonicalSpell.param
        : (typeof mergedDetails.bonus === 'number' ? mergedDetails.bonus : 2);
      event.buff = {
        stat: 'ac',
        magnitude: bonus,
        target: 'group'
      };
      break;
    }

    case 'groupMalusAC': {
      const penalty = typeof canonicalSpell?.param === 'number'
        ? canonicalSpell.param
        : (typeof mergedDetails.bonus === 'number' ? mergedDetails.bonus : (typeof mergedDetails.penalty === 'number' ? mergedDetails.penalty : 2));
      event.debuff = {
        stat: 'ac',
        magnitude: penalty,
        target: 'group'
      };
      break;
    }

    case 'bonusDamage': {
      const bonus = typeof canonicalSpell?.param === 'number'
        ? canonicalSpell.param
        : (typeof mergedDetails.bonus === 'number' ? mergedDetails.bonus : 4);
      event.buff = {
        stat: 'damage',
        magnitude: bonus,
        target: 'group'
      };
      break;
    }

    case 'malusToHit': {
      const penalty = typeof canonicalSpell?.param === 'number'
        ? canonicalSpell.param
        : (typeof mergedDetails.penalty === 'number' ? mergedDetails.penalty : 3);
      event.debuff = {
        stat: 'hit',
        magnitude: penalty,
        target: 'group'
      };
      break;
    }

    case 'blind': {
      event.status = 'blind';
      event.blind = {
        durationRounds: 1,
        target: 'group'
      };
      break;
    }

    case 'status': {
      const normalizedStatus = canonicalSpell?.details?.status || mergedDetails.status || 'wither';
      event.status = normalizedStatus;
      break;
    }

    case 'summon': {
      const summonType = canonicalSpell?.details?.summonType || canonicalSpell?.details?.specialSummon || mergedDetails.type || mergedDetails.summonType || 'Summoned Creature';
      const isIllusion = canonicalSpell?.details?.isIllusion !== undefined
        ? canonicalSpell.details.isIllusion
        : (mergedDetails.illusion === true);

      event.summon = {
        monsterName: summonType,
        isIllusion
      };
      break;
    }

    default: {
      return {
        ...event,
        effect: 'unimplemented',
        warning: `Unsupported monster spell action effect: "${effect}".`
      };
    }
  }

  return event;
}
