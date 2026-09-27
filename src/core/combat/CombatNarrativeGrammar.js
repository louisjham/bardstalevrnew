// CombatNarrativeGrammar.js - Authentic 1985 The Bard's Tale Token-Replacement Grammar
// Assembles combat sentences dynamically from modular token dictionaries based on weapon type,
// action type, target resolution, and conditional modifiers.

/**
 * Action Verbs mapped to weapon categories
 */
export const WEAPON_VERBS = {
  sword: 'swings at',
  axe: 'heaves at',
  dagger: 'lunges at',
  mace: 'swings at',
  staff: 'strikes at',
  polearm: 'thrusts at',
  bow: 'fires an arrow at',
  unarmed: 'strikes at',
  default: 'attacks'
};

/**
 * Action Verbs for monster attack types
 */
export const MONSTER_VERBS = {
  bite: 'snaps at',
  claw: 'claws at',
  slam: 'bashes at',
  sting: 'stings at',
  weapon: 'swings at',
  breath: 'breathes fire over',
  magic: 'casts a spell at',
  default: 'attacks'
};

/**
 * Outcomes and hit resolutions
 */
export const RESOLUTIONS = {
  hit: 'and hits for {damage} pts of damage',
  crit: 'and critically strikes for {damage} pts of damage',
  miss: 'but misses!',
  breath: 'for {damage} pts of damage over the entire party'
};

/**
 * Conditional modifiers appended on specific flags (target killed, status inflicted)
 */
export const CONDITIONAL_MODIFIERS = {
  killed_it: ', killing it!',
  killed_them: ', killing them!',
  slaying_hero: ', slaying {target}!',
  poisoned: ' and is poisoned!',
  paralyzed: ' and is paralyzed!',
  stoned: ' and turns to stone!',
  insane: ' and goes nuts!',
  possessed: ' and becomes possessed!'
};

/**
 * Classifies equipped hero weapon into one of the canonical 1985 weapon categories.
 * @param {Object} hero Character record
 * @returns {string} weapon category ('sword' | 'axe' | 'dagger' | 'mace' | 'staff' | 'polearm' | 'bow' | 'unarmed')
 */
export function getWeaponCategory(hero) {
  if (!hero) return 'sword';

  // Check equipped item object or name
  const weapon = hero.equipped?.weapon || hero.equippedWeapon || hero.weapon;
  const weaponName = typeof weapon === 'string' ? weapon : (weapon?.name || '');
  const lower = weaponName.toLowerCase();

  if (lower.includes('sword') || lower.includes('blade') || lower.includes('scimitar') || lower.includes('claymore') || lower.includes('saber')) {
    return 'sword';
  }
  if (lower.includes('axe') || lower.includes('hatchet')) {
    return 'axe';
  }
  if (lower.includes('dagger') || lower.includes('dirk') || lower.includes('knife') || lower.includes('stiletto')) {
    return 'dagger';
  }
  if (lower.includes('mace') || lower.includes('hammer') || lower.includes('flail') || lower.includes('morningstar') || lower.includes('cudgel') || lower.includes('warhammer')) {
    return 'mace';
  }
  if (lower.includes('staff') || lower.includes('rod')) {
    return 'staff';
  }
  if (lower.includes('halberd') || lower.includes('spear') || lower.includes('pike') || lower.includes('lance')) {
    return 'polearm';
  }
  if (lower.includes('bow') || lower.includes('crossbow') || lower.includes('sling') || lower.includes('arrow')) {
    return 'bow';
  }

  // Monk or bare-handed
  if (hero.class === 'Monk' || !weaponName) {
    return 'unarmed';
  }

  // Class fallback defaults
  if (hero.class === 'Rogue') return 'dagger';
  if (['Wizard', 'Conjurer', 'Magician', 'Sorcerer'].includes(hero.class)) return 'staff';
  return 'sword';
}

/**
 * Determines appropriate action verb for monster physical or special attacks.
 * @param {Object} monster
 * @param {Object} [action]
 * @returns {string}
 */
export function getMonsterAttackVerb(monster, action = null) {
  if (!monster) return 'attacks';
  const name = (monster.name || '').toLowerCase();
  const actionType = action?.type || action?.kind || '';

  if (actionType === 'breathWeapon' || actionType === 'breath') {
    const elem = action?.element || action?.details?.element || 'fire';
    return `breathes ${elem} over`;
  }
  if (actionType === 'castSpell' || actionType === 'spell') {
    const spellName = action?.spellName || action?.name;
    return spellName ? `casts ${spellName} at` : 'casts a spell at';
  }

  if (name.includes('wolf') || name.includes('dog') || name.includes('hound') || name.includes('spider') || name.includes('snake')) {
    return 'snaps at';
  }
  if (name.includes('dragon') || name.includes('were') || name.includes('beast') || name.includes('cat') || name.includes('gargoyle')) {
    return 'claws at';
  }
  if (name.includes('golem') || name.includes('giant') || name.includes('ogre') || name.includes('zombie')) {
    return 'bashes at';
  }
  if (name.includes('scorpion') || name.includes('wasp')) {
    return 'stings at';
  }
  if (name.includes('kobold') || name.includes('orc') || name.includes('barbarian') || name.includes('mercenary') || name.includes('ninja')) {
    return 'swings at';
  }
  return 'attacks';
}

/**
 * Assembles an authentic 1985 Bard's Tale combat narrative string from an event data object.
 * 
 * Sentence Structure:
 *   [Subject] [Action Verb] [Target] [Resolution][Conditional Modifier]
 * 
 * Examples:
 *   - "Brian swings at Skeleton and hits for 8 pts of damage, killing it!"
 *   - "Gareth lunges at Mad Dog but misses!"
 *   - "Ariel casts Arc Fire at 3 Kobolds and hits for 14 pts of damage, killing them!"
 *   - "Elric plays Wayland's Watch on the Mandolin!"
 * 
 * @param {Object} event Raw combat action event
 * @returns {string} Assembled narrative sentence
 */
export function formatCombatEvent(event) {
  if (typeof event === 'string') return event;
  if (!event) return '';

  const {
    attacker,
    attackerIsParty = true,
    actionType = 'ATTACK',
    weaponType = 'sword',
    target,
    targetCount = 1,
    hit = true,
    critical = false,
    damage = 0,
    targetDied = false,
    targetIsParty = false,
    condition = null,
    spellName = null,
    songName = null,
    instrumentName = null,
    customVerb = null,
    element = 'fire'
  } = event;

  // 1. Subject
  const subject = attacker || (attackerIsParty ? 'Hero' : 'Monster');

  // 2. Non-targeted / Utility Actions
  if (actionType === 'DEFEND') {
    return `${subject} takes a defensive stance!`;
  }
  if (actionType === 'HIDE') {
    return hit ? `🌑 ${subject} melts into the shadows...` : `${subject} tries to hide but is spotted!`;
  }
  if (actionType === 'SONG') {
    const song = songName || "The Evil in Skara Brae";
    const instr = instrumentName ? ` on the ${instrumentName}` : '';
    return `🎵 ${subject} plays ${song}${instr}!`;
  }
  if (actionType === 'RUN' || actionType === 'FLEE') {
    return `🏃 ${subject} flees from combat!`;
  }
  if (actionType === 'DUPLICATE') {
    return `🌀 ${subject} shifts and duplicates itself!`;
  }
  if (actionType === 'SUMMON') {
    return `✨ ${subject} summons an ally into the fray!`;
  }

  // 3. Action Verb
  let verb = customVerb;
  if (!verb) {
    if (actionType === 'SPELL') {
      verb = spellName ? `casts ${spellName} at` : 'casts a spell at';
    } else if (actionType === 'BREATH') {
      verb = `breathes ${element} over`;
    } else if (attackerIsParty) {
      verb = WEAPON_VERBS[weaponType] || WEAPON_VERBS.default;
    } else {
      verb = MONSTER_VERBS[weaponType] || MONSTER_VERBS.default;
    }
  }

  // 4. Target
  const targetStr = target || (attackerIsParty ? 'the enemy' : 'the party');

  // 5. Breath Weapon Resolution
  if (actionType === 'BREATH') {
    let msg = `🔥 ${subject} ${verb} ${targetStr} for ${damage} pts of damage`;
    if (targetDied) {
      msg += targetIsParty ? `, slaying ${targetStr}!` : `, killing them!`;
    } else {
      msg += '!';
    }
    return msg;
  }

  // 6. Miss Resolution
  if (!hit) {
    return `${subject} ${verb} ${targetStr} but misses!`;
  }

  // 7. Hit Resolution
  let resolution = '';
  if (critical) {
    resolution = `and critically strikes for ${damage} pts of damage`;
  } else {
    resolution = `and hits for ${damage} pts of damage`;
  }

  // 8. Conditional Modifier
  let modifier = '.';
  if (targetDied) {
    if (targetIsParty) {
      modifier = `, slaying ${targetStr}!`;
    } else if (targetCount > 1) {
      modifier = `, killing them!`;
    } else {
      modifier = `, killing it!`;
    }
  } else if (condition) {
    const condKey = condition.toLowerCase();
    if (CONDITIONAL_MODIFIERS[condKey]) {
      modifier = CONDITIONAL_MODIFIERS[condKey];
    } else {
      modifier = ` and is ${condition.toLowerCase()}!`;
    }
  }

  const prefix = critical ? '💥 ' : (targetDied ? (targetIsParty ? '💀 ' : '⚔️ ') : '');
  return `${prefix}${subject} ${verb} ${targetStr} ${resolution}${modifier}`;
}

export class CombatNarrativeGrammar {
  static getWeaponCategory(hero) {
    return getWeaponCategory(hero);
  }

  static getMonsterAttackVerb(monster, action) {
    return getMonsterAttackVerb(monster, action);
  }

  static formatCombatEvent(event) {
    return formatCombatEvent(event);
  }
}
