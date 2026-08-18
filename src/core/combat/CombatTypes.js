// CombatTypes.js - Type Definitions & Constants for Combat & Monster Systems
// Provides JSDoc structural contracts, effect constants, and action classifications.

/**
 * Immutable monster attack and status effect constants.
 * @readonly
 * @enum {string}
 */
export const MonsterAttackEffect = Object.freeze({
  POISON: 'poison',
  WITHER: 'wither',
  POSSESS: 'possess',
  DRAIN: 'drain',
  INSANITY: 'insanity',
  STONE: 'stone',
  CRITICAL: 'critical',
  DOPPLEGANGER: 'doppleganger'
});

/**
 * Immutable spell action effect constants.
 * @readonly
 * @enum {string}
 */
export const SpellActionEffect = Object.freeze({
  DAMAGE_SINGLE_TARGET: 'damageSingleTarget',
  DAMAGE_GROUP: 'damageGroup',
  GROUP_BONUS_AC: 'groupBonusAC',
  GROUP_MALUS_AC: 'groupMalusAC',
  BONUS_DAMAGE: 'bonusDamage',
  MALUS_TO_HIT: 'malusToHit',
  BLIND: 'blind',
  STATUS: 'status',
  SUMMON: 'summon',
  DRAIN: 'drain'
});

/**
 * Immutable action classification kinds.
 * @readonly
 * @enum {string}
 */
export const ActionKind = Object.freeze({
  PHYSICAL: 'physical',
  SPELL: 'spell',
  SPECIAL: 'special'
});

// Individual direct effect constant exports
export const EFFECT_POISON = MonsterAttackEffect.POISON;
export const EFFECT_WITHER = MonsterAttackEffect.WITHER;
export const EFFECT_POSSESS = MonsterAttackEffect.POSSESS;
export const EFFECT_DRAIN = MonsterAttackEffect.DRAIN;
export const EFFECT_INSANITY = MonsterAttackEffect.INSANITY;
export const EFFECT_STONE = MonsterAttackEffect.STONE;
export const EFFECT_CRITICAL = MonsterAttackEffect.CRITICAL;
export const EFFECT_DOPPLEGANGER = MonsterAttackEffect.DOPPLEGANGER;

export const SPELL_EFFECT_DAMAGE_SINGLE = SpellActionEffect.DAMAGE_SINGLE_TARGET;
export const SPELL_EFFECT_DAMAGE_GROUP = SpellActionEffect.DAMAGE_GROUP;
export const SPELL_EFFECT_GROUP_BONUS_AC = SpellActionEffect.GROUP_BONUS_AC;
export const SPELL_EFFECT_GROUP_MALUS_AC = SpellActionEffect.GROUP_MALUS_AC;
export const SPELL_EFFECT_BONUS_DAMAGE = SpellActionEffect.BONUS_DAMAGE;
export const SPELL_EFFECT_MALUS_TO_HIT = SpellActionEffect.MALUS_TO_HIT;
export const SPELL_EFFECT_BLIND = SpellActionEffect.BLIND;
export const SPELL_EFFECT_STATUS = SpellActionEffect.STATUS;
export const SPELL_EFFECT_SUMMON = SpellActionEffect.SUMMON;
export const SPELL_EFFECT_DRAIN = SpellActionEffect.DRAIN;

// ─── JSDoc Structural Type Definitions ───────────────────────────────────

/**
 * Minimum and maximum numerical range.
 * @typedef {Object} StatRange
 * @property {number} min - Minimum value of the range (inclusive).
 * @property {number} max - Maximum value of the range (inclusive).
 */

/**
 * Physical attack configuration for monsters and combatants.
 * @typedef {Object} PhysicalAttack
 * @property {string} damage - Damage dice string (e.g. "1d4", "3d4", "12d4").
 * @property {string} hitType - Descriptive hit classification (e.g. "Swing/Slash", "Claw/Tear", "Bite/Gnaw").
 * @property {'poison'|'wither'|'possess'|'drain'|'insanity'|'stone'|'critical'|'doppleganger'} [effect] - Status or attack effect applied on hit.
 */

/**
 * Spell casting action configuration.
 * @typedef {Object} SpellAction
 * @property {'spell'} kind - Action classification ('spell').
 * @property {number} spellId - Source numeric identifier for the spell.
 * @property {string} spellName - Display name of the spell.
 * @property {string} effect - Spell action effect type (from SpellActionEffect).
 * @property {string} [details] - Additional element, damage formula, or summon type metadata.
 */

/**
 * Special monster ability or breath weapon action configuration.
 * @typedef {Object} SpecialAction
 * @property {'special'} kind - Action classification ('special').
 * @property {'doppleganger'|string} effect - Special effect identifier.
 */

/**
 * Union of all executable monster actions.
 * @typedef {SpellAction | SpecialAction} MonsterAction
 */

/**
 * Static monster archetype definition from the Bard's Tale bestiary.
 * @typedef {Object} BardTaleMonster
 * @property {number} id - Legacy source/provenance integer ID (0-126).
 * @property {string} slug - Stable unique string identifier for references and save-states.
 * @property {string} name - Display name of the monster.
 * @property {number} [difficultyMin] - Minimum difficulty dungeon tier bound.
 * @property {number} [difficultyMax] - Maximum difficulty dungeon tier bound.
 * @property {number} power - Difficulty rating / power tier.
 * @property {StatRange} hp - Hit points range used when spawning instances.
 * @property {StatRange} armorClass - Armor class range (lower is better, BT style).
 * @property {number} xp - Base experience points awarded upon defeat.
 * @property {PhysicalAttack} physicalAttack - Primary physical melee attack.
 * @property {MonsterAction[]} actions - Extra spell or special action slots.
 */

/**
 * Instantiated live monster combatant in an active battle.
 * @typedef {Object} MonsterCombatant
 * @property {string} instanceId - Unique runtime instance identifier.
 * @property {string} monsterSlug - Reference to BardTaleMonster.slug.
 * @property {number} currentHp - Current remaining hit points.
 * @property {number} maxHp - Rolled maximum hit points for this combatant.
 * @property {number} rolledArmorClass - Rolled effective armor class.
 * @property {Array<string>} activeStatuses - Active status effect flags.
 * @property {Array<Object>} activeBuffs - Active temporary combat buffs.
 * @property {'enemy'|'party'} [team='enemy'] - Combat allegiance.
 * @property {string} [summonedBy] - Display name of summoner if spawned via spell.
 * @property {string} [summonerInstanceId] - Instance ID of summoner if spawned via spell.
 * @property {boolean} [isIllusion=false] - Whether this combatant is an illusionary summon.
 */
