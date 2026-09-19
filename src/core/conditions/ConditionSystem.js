// ConditionSystem.js - Canonical 8 Character Conditions & Mutually Exclusive Status Byte (1985 C64 BT1)
// Implements the authentic 8 defined states: Alive (00), Poisoned (02), Old/Withered (04), Dead (08),
// Stoned (10), Paralyzed (20), Possessed (40), and Nuts/Insane (80).

/**
 * The 8 canonical mutually-exclusive character conditions from the 1985 C64 ruleset.
 */
export const BT1Condition = Object.freeze({
  ALIVE: Object.freeze({
    byte: 0x00,
    code: 'ALIVE',
    display: 'OK',
    label: 'Normal / Alive',
    blocksAction: false,
    hostile: false,
    drainsHp: false,
    erratic: false
  }),
  POISONED: Object.freeze({
    byte: 0x02,
    code: 'POIS',
    display: 'POIS',
    label: 'Poisoned',
    blocksAction: false,
    hostile: false,
    drainsHp: true,
    erratic: false
  }),
  OLD: Object.freeze({
    byte: 0x04,
    code: 'OLD',
    display: 'OLD',
    label: 'Old / Withered',
    blocksAction: false,
    hostile: false,
    drainsHp: false,
    erratic: false,
    acPenalty: 4,
    attributeOverride: 1
  }),
  DEAD: Object.freeze({
    byte: 0x08,
    code: 'DEAD',
    display: 'DEAD',
    label: 'Dead',
    blocksAction: true,
    hostile: false,
    drainsHp: false,
    erratic: false
  }),
  STONED: Object.freeze({
    byte: 0x10,
    code: 'STON',
    display: 'STON',
    label: 'Stoned / Petrified',
    blocksAction: true,
    hostile: false,
    drainsHp: false,
    erratic: false
  }),
  PARALYZED: Object.freeze({
    byte: 0x20,
    code: 'PARA',
    display: 'PARA',
    label: 'Paralyzed',
    blocksAction: true,
    hostile: false,
    drainsHp: false,
    erratic: false
  }),
  POSSESSED: Object.freeze({
    byte: 0x40,
    code: 'POSS',
    display: 'POSS',
    label: 'Possessed',
    blocksAction: false,
    hostile: true,
    drainsHp: false,
    erratic: false
  }),
  NUTS: Object.freeze({
    byte: 0x80,
    code: 'NUTS',
    display: 'NUTS',
    label: 'Nuts / Insane',
    blocksAction: false,
    hostile: false,
    drainsHp: false,
    erratic: true
  })
});

/**
 * Maps condition bytes to condition definitions.
 */
export const CONDITION_BY_BYTE = Object.freeze({
  0x00: BT1Condition.ALIVE,
  0x02: BT1Condition.POISONED,
  0x04: BT1Condition.OLD,
  0x08: BT1Condition.DEAD,
  0x10: BT1Condition.STONED,
  0x20: BT1Condition.PARALYZED,
  0x40: BT1Condition.POSSESSED,
  0x80: BT1Condition.NUTS
});

/**
 * Maps legacy/variant strings to canonical condition definitions.
 */
export const CONDITION_LOOKUP = Object.freeze({
  'alive': BT1Condition.ALIVE,
  'ok': BT1Condition.ALIVE,
  'normal': BT1Condition.ALIVE,
  'poisoned': BT1Condition.POISONED,
  'pois': BT1Condition.POISONED,
  'old': BT1Condition.OLD,
  'withered': BT1Condition.OLD,
  'dead': BT1Condition.DEAD,
  'stoned': BT1Condition.STONED,
  'ston': BT1Condition.STONED,
  'petrified': BT1Condition.STONED,
  'paralyzed': BT1Condition.PARALYZED,
  'para': BT1Condition.PARALYZED,
  'possessed': BT1Condition.POSSESSED,
  'poss': BT1Condition.POSSESSED,
  'nuts': BT1Condition.NUTS,
  'insane': BT1Condition.NUTS
});

export class ConditionSystem {
  /**
   * Normalizes any condition representation (string, byte, or object) into a canonical BT1Condition object.
   * @param {string|number|object} input
   * @returns {typeof BT1Condition[keyof typeof BT1Condition]}
   */
  static normalizeCondition(input) {
    if (!input) return BT1Condition.ALIVE;
    if (typeof input === 'object' && input.code && BT1Condition[input.code]) {
      return input;
    }
    if (typeof input === 'number') {
      return CONDITION_BY_BYTE[input] || BT1Condition.ALIVE;
    }
    const key = String(input).trim().toLowerCase();
    return CONDITION_LOOKUP[key] || BT1Condition.ALIVE;
  }

  /**
   * Checks whether a character is capable of taking actions on their turn.
   * Dead, Stoned (petrified), and Paralyzed characters cannot act.
   * @param {object} character
   * @returns {boolean}
   */
  static canTakeTurn(character) {
    if (!character) return false;
    const hp = character.currentHp ?? character.hp ?? 0;
    if (hp <= 0) return false;

    const condition = this.normalizeCondition(character.condition || character.status);
    return !condition.blocksAction;
  }

  /**
   * Checks whether a character is currently hostile to their own party (Possessed).
   * @param {object} character
   * @returns {boolean}
   */
  static isHostileToParty(character) {
    if (!character) return false;
    const condition = this.normalizeCondition(character.condition || character.status);
    return condition.hostile === true;
  }

  /**
   * Checks whether a character is behaving erratically (Nuts / Insane).
   * @param {object} character
   * @returns {boolean}
   */
  static isErratic(character) {
    if (!character) return false;
    const condition = this.normalizeCondition(character.condition || character.status);
    return condition.erratic === true;
  }

  /**
   * Gets the canonical 4-character display badge (e.g. 'POIS', 'OLD', 'DEAD', 'STON', 'PARA', 'POSS', 'NUTS')
   * or formatted HP string if the character is in normal/alive condition.
   * @param {object} character
   * @returns {string}
   */
  static getConditionDisplay(character) {
    if (!character) return 'DEAD';
    const hp = character.currentHp ?? character.hp ?? 0;
    if (hp <= 0) return 'DEAD';

    const condition = this.normalizeCondition(character.condition || character.status);
    if (condition.code === 'ALIVE') {
      return `${hp}`;
    }
    return condition.code;
  }

  /**
   * Returns effective stats with reversible overrides (e.g. OLD/withered sets effective stats to 1)
   * without mutating or destroying underlying character base attributes.
   * @param {object} character
   * @returns {{ st: number, iq: number, dx: number, cn: number, lk: number }}
   */
  static getEffectiveAttributes(character) {
    if (!character) {
      return { st: 10, iq: 10, dx: 10, cn: 10, lk: 10 };
    }

    const baseSt = character.st ?? character.stats?.st ?? 10;
    const baseIq = character.iq ?? character.stats?.iq ?? 10;
    const baseDx = character.dx ?? character.stats?.dx ?? 10;
    const baseCn = character.cn ?? character.stats?.cn ?? 10;
    const baseLk = character.lk ?? character.stats?.lk ?? 10;

    const condition = this.normalizeCondition(character.condition || character.status);
    if (condition.code === 'OLD') {
      return { st: 1, iq: 1, dx: 1, cn: 1, lk: 1 };
    }

    return { st: baseSt, iq: baseIq, dx: baseDx, cn: baseCn, lk: baseLk };
  }

  /**
   * Returns the Armor Class penalty modifier for current condition (OLD adds +4 AC penalty).
   * @param {object} character
   * @returns {number}
   */
  static getEffectiveACPenalty(character) {
    if (!character) return 0;
    const condition = this.normalizeCondition(character.condition || character.status);
    return condition.acPenalty || 0;
  }

  /**
   * Applies periodic poison damage (in combat rounds or exploration ticks).
   * If current HP drops to 0 or below, character transitions to DEAD condition.
   * @param {object} character
   * @param {number} [damage=1]
   * @returns {{ damaged: boolean, newHp: number, died: boolean }}
   */
  static applyPoisonTick(character, damage = 1) {
    if (!character) return { damaged: false, newHp: 0, died: false };
    const condition = this.normalizeCondition(character.condition || character.status);
    if (condition.code !== 'POIS') {
      return { damaged: false, newHp: character.currentHp ?? character.hp ?? 0, died: false };
    }

    const currentHp = character.currentHp ?? character.hp ?? 0;
    const newHp = Math.max(0, currentHp - damage);

    if (character.currentHp !== undefined) character.currentHp = newHp;
    if (character.hp !== undefined) character.hp = newHp;

    let died = false;
    if (newHp <= 0) {
      character.condition = 'DEAD';
      character.status = 'DEAD';
      died = true;
    }

    return { damaged: true, newHp, died };
  }

  /**
   * Set condition on character.
   * @param {object} character
   * @param {string|number|object} condition
   */
  static setCondition(character, condition) {
    if (!character) return;
    const norm = this.normalizeCondition(condition);
    character.condition = norm.code;
    character.status = norm.code === 'ALIVE' ? 'OK' : norm.code;

    if (norm.code === 'DEAD' || norm.code === 'STON') {
      if (character.currentHp !== undefined) character.currentHp = 0;
      if (character.hp !== undefined) character.hp = 0;
    }
  }

  /**
   * Cure an affliction and restore condition to ALIVE / OK.
   * @param {object} character
   */
  static cureCondition(character) {
    if (!character) return;
    character.condition = 'ALIVE';
    character.status = 'OK';
  }

  /**
   * Resurrect a dead or petrified character.
   * In authentic BT1 C64 rules, resurrected characters return at 1 HP while retaining all possessions, gold, and XP.
   * @param {object} character
   */
  static resurrectCharacter(character) {
    if (!character) return;
    character.condition = 'ALIVE';
    character.status = 'OK';
    if (character.currentHp !== undefined) character.currentHp = 1;
    if (character.hp !== undefined) character.hp = 1;
  }
}
