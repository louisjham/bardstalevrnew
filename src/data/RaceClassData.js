import { autoEquipCharacter } from './ItemDatabase.js';

// RaceClassData.js - Race Attributes, Class Definitions, Level-Up Tables & Class Change Mechanics
// Faithful to the 1985 Bard's Tale manual.

// ─── RACES ──────────────────────────────────────────────────────────────
// Each race has minimum attribute floors ("genes"). The game adds a random
// value ("luck") on top. Manual: "each attribute is randomly assigned a
// value from 1 to 18."
// Race minimums are tuned so that with d8 random on top, the max is 18
// and the minimums reflect each race's strengths.

export const Races = {
  HUMAN:     { name: 'Human',     minST: 8, minIQ: 8, minDX: 8, minCN: 8, minLK: 8, description: 'Of hardier stock, but otherwise like you or me.' },
  ELF:       { name: 'Elf',       minST: 5, minIQ: 12, minDX: 10, minCN: 5, minLK: 8, description: 'Slight of build, inclined to magic.' },
  DWARF:     { name: 'Dwarf',     minST: 12, minIQ: 5, minDX: 7, minCN: 14, minLK: 6, description: 'Short and stout, excellent fighters.' },
  HOBBIT:    { name: 'Hobbit',    minST: 5, minIQ: 8, minDX: 12, minCN: 8, minLK: 12, description: 'Nimble and dexterous. Perfect rogues.' },
  HALF_ELF:  { name: 'Half-Elf',  minST: 7, minIQ: 10, minDX: 9, minCN: 7, minLK: 9, description: 'Blond and fair-skinned, balanced mix.' },
  HALF_ORC:  { name: 'Half-Orc',  minST: 12, minIQ: 4, minDX: 7, minCN: 14, minLK: 4, description: 'Large and strong, not too bright.' },
  GNOME:     { name: 'Gnome',     minST: 10, minIQ: 10, minDX: 8, minCN: 12, minLK: 7, description: 'Like dwarves but more magically inclined.' }
};

/**
 * Roll attributes for a new character of a given race.
 * Each attribute = race minimum + random(0..max), capped at 18.
 * @param {string} raceName - e.g. 'Elf'
 * @returns {object} { st, iq, dx, cn, lk }
 */
export function rollAttributes(raceName) {
  const race = getRaceByName(raceName);
  if (!race) return { st: 10, iq: 10, dx: 10, cn: 10, lk: 10 };

  const roll = (min) => Math.min(18, min + Math.floor(Math.random() * (19 - min)));

  return {
    st: roll(race.minST),
    iq: roll(race.minIQ),
    dx: roll(race.minDX),
    cn: roll(race.minCN),
    lk: roll(race.minLK)
  };
}

export function getRaceByName(name) {
  return Object.values(Races).find(r => r.name === name) || null;
}

export function getAllRaceNames() {
  return Object.values(Races).map(r => r.name);
}

// ─── CHARACTER CLASSES ──────────────────────────────────────────────────
// 8 base classes + 2 promotion-only (Sorcerer, Wizard).

export const CharacterClass = {
  WARRIOR: {
    name: 'Warrior', type: 'fighter', isBase: true,
    description: 'The base fighter-type. Can use nearly every weapon. Gets extra attacks every 4 levels.',
    primaryStat: 'st',
    baseHP: 14, hpPerLevel: 10, // d10 per level
    baseSP: 0, spPerLevel: 0,
    canUseMagic: false,
    spellSchool: null,
    specialAbility: 'multiAttack', // Extra attack every 4 levels after 1st
    multiAttackInterval: 4,
    weaponRestrictions: [], // can use nearly all weapons
  },
  PALADIN: {
    name: 'Paladin', type: 'fighter', isBase: true,
    description: 'Fighters sworn to honor. Can use most weapons, even some unique ones. Greatly increased magic resistance.',
    primaryStat: 'st',
    baseHP: 14, hpPerLevel: 10,
    baseSP: 0, spPerLevel: 0,
    canUseMagic: false,
    spellSchool: null,
    specialAbility: 'magicResistance', // Increased resistance to evil magic
    magicResistBonus: 30, // percentage bonus
    multiAttackInterval: 4,
    weaponRestrictions: [],
  },
  ROGUE: {
    name: 'Rogue', type: 'fighter', isBase: true,
    description: 'A professional thief with so-so combat ability. Can hide in shadows, search for and disarm traps.',
    primaryStat: 'dx',
    baseHP: 10, hpPerLevel: 6,
    baseSP: 0, spPerLevel: 0,
    canUseMagic: false,
    spellSchool: null,
    specialAbility: 'hideInShadows',
    weaponRestrictions: ['Halberd', 'War Axe'], // Cannot use heavy weapons
  },
  BARD: {
    name: 'Bard', type: 'fighter', isBase: true,
    description: 'A wandering minstrel. Former warrior who turned to music. Songs have magical effects. Needs an instrument equipped.',
    primaryStat: 'dx',
    baseHP: 12, hpPerLevel: 8,
    baseSP: 0, spPerLevel: 0,
    canUseMagic: false,
    spellSchool: null,
    specialAbility: 'bardSong', // Plays songs with magical effects
    weaponRestrictions: ['War Axe', 'Halberd'], // Most warrior weapons but not heaviest
  },
  HUNTER: {
    name: 'Hunter', type: 'fighter', isBase: true,
    description: 'An assassin, a mercenary, a ninja. Ability to do critical hits grows with experience.',
    primaryStat: 'dx',
    baseHP: 12, hpPerLevel: 8,
    baseSP: 0, spPerLevel: 0,
    canUseMagic: false,
    spellSchool: null,
    specialAbility: 'criticalHit', // Instant kill chance, grows with level
    baseCritChance: 0.03, // 3% at level 1
    critChancePerLevel: 0.02, // +2% per level
    weaponRestrictions: [],
  },
  MONK: {
    name: 'Monk', type: 'fighter', isBase: true,
    description: 'A martial artist trained to fight without weapons or armor. Better without at higher levels.',
    primaryStat: 'cn',
    baseHP: 12, hpPerLevel: 8,
    baseSP: 0, spPerLevel: 0,
    canUseMagic: false,
    spellSchool: null,
    specialAbility: 'unarmedMastery', // AC and damage improve with level
    unarmedDamageBase: 4, // d4 at level 1
    unarmedDamagePerLevel: 2, // +2 per level
    unarmedACPerLevel: -1, // AC improves by 1 per level when unarmored
    weaponRestrictions: [],
  },
  CONJURER: {
    name: 'Conjurer', type: 'mage', isBase: true,
    description: 'Deals with the creation of objects and effects. Potent but energy-intensive spells.',
    primaryStat: 'iq',
    baseHP: 8, hpPerLevel: 4,
    baseSP: 12, spPerLevel: 4, // IQ bonus added separately
    canUseMagic: true,
    spellSchool: 'CONJURER',
    specialAbility: null,
    weaponRestrictions: ['Broadsword', 'War Axe', 'Halberd', 'Mace'], // Most weapons
  },
  MAGICIAN: {
    name: 'Magician', type: 'mage', isBase: true,
    description: 'Bestows magical effects on common objects. Enchanting, transmutation, and energy manipulation.',
    primaryStat: 'iq',
    baseHP: 8, hpPerLevel: 4,
    baseSP: 12, spPerLevel: 4,
    canUseMagic: true,
    spellSchool: 'MAGICIAN',
    specialAbility: null,
    weaponRestrictions: ['Broadsword', 'War Axe', 'Halberd', 'Mace'],
  },
  SORCERER: {
    name: 'Sorcerer', type: 'mage', isBase: false, // Promotion only
    description: 'Creates illusions and taps heightened awareness. Requires spell level 3 in at least one other magic art.',
    primaryStat: 'iq',
    baseHP: 8, hpPerLevel: 4,
    baseSP: 14, spPerLevel: 5,
    canUseMagic: true,
    spellSchool: 'SORCERER',
    specialAbility: null,
    weaponRestrictions: ['Broadsword', 'War Axe', 'Halberd', 'Mace'],
    promotionRequirement: { minSchools: 1, minSpellLevel: 3 }
  },
  WIZARD: {
    name: 'Wizard', type: 'mage', isBase: false, // Promotion only
    description: 'Summons and controls supernatural creatures. Fewest spells but the most potent. Requires spell level 3 in two other arts.',
    primaryStat: 'iq',
    baseHP: 8, hpPerLevel: 4,
    baseSP: 16, spPerLevel: 6,
    canUseMagic: true,
    spellSchool: 'WIZARD',
    specialAbility: null,
    weaponRestrictions: ['Broadsword', 'War Axe', 'Halberd', 'Mace'],
    promotionRequirement: { minSchools: 2, minSpellLevel: 3 }
  }
};

export function getClassByName(name) {
  return Object.values(CharacterClass).find(c => c.name === name) || null;
}

export function getBaseClasses() {
  return Object.values(CharacterClass).filter(c => c.isBase);
}

export function getBaseClassNames() {
  return getBaseClasses().map(c => c.name);
}

export function getAllClassNames() {
  return Object.values(CharacterClass).map(c => c.name);
}

// ─── LEVEL-UP & XP THRESHOLDS ──────────────────────────────────────────
// Exact 1985 C64 cumulative total XP thresholds per class group

export const LOW_LEVEL_XP_THRESHOLDS = Object.freeze({
  fighter: [0, 2000, 4000, 7000, 10000, 15000, 20000, 30000, 50000, 80000, 110000, 150000, 200000],
  monkMage: [0, 1800, 4000, 6000, 10000, 14000, 19000, 29000, 50000, 90000, 120000, 170000, 230000],
  sorcerer: [0, 7000, 15000, 25000, 40000, 60000, 80000, 100000, 130000, 170000, 220000, 300000, 400000],
  wizard: [0, 20000, 50000, 80000, 120000, 160000, 200000, 250000, 300000, 400000, 600000, 900000, 1300000]
});

export const POST_13_XP_INCREMENTS = Object.freeze({
  fighter: 200000,
  monkMage: 230000,
  sorcerer: 400000,
  wizard: 1300000
});

export function getXPRequiredForClassLevel(className, targetLevel) {
  if (targetLevel <= 1) return 0;
  const c = (className || '').toLowerCase();
  const group = ['warrior', 'paladin', 'bard', 'hunter', 'rogue'].includes(c) ? 'fighter' :
                ['monk', 'conjurer', 'magician'].includes(c) ? 'monkMage' :
                c === 'sorcerer' ? 'sorcerer' :
                c === 'wizard' ? 'wizard' : 'fighter';

  const table = LOW_LEVEL_XP_THRESHOLDS[group];
  if (targetLevel <= 13) {
    return table[targetLevel - 1];
  }
  const base13 = table[12];
  const increment = POST_13_XP_INCREMENTS[group];
  return base13 + (targetLevel - 13) * increment;
}

/**
 * Get the experience level for a given class and XP total.
 * @param {string} className
 * @param {number} xp
 * @returns {number}
 */
export function getLevelForXP(className, xp) {
  if (typeof className === 'number') {
    // Backward compatibility if called with (xp)
    xp = className;
    className = 'Warrior';
  }
  let level = 1;
  while (xp >= getXPRequiredForClassLevel(className, level + 1)) {
    level++;
    if (level >= 99) break;
  }
  return level;
}

/**
 * Cumulative XP needed to reach the next level for a character.
 * @param {string} className
 * @param {number} currentLevel
 * @returns {number}
 */
export function getXPForNextLevel(className, currentLevel) {
  if (typeof className === 'number') {
    currentLevel = className;
    className = 'Warrior';
  }
  return getXPRequiredForClassLevel(className, (currentLevel || 1) + 1);
}

// ─── SPELL LEVEL PROGRESSION ────────────────────────────────────────────
// Experience Level → Spell Level (from the manual)
// 1-2 → 1, 3 → 2, 5 → 3, 7 → 4, 9 → 5, 11 → 6, 13+ → 7

export function getMaxSpellLevelForExpLevel(expLevel) {
  if (expLevel >= 13) return 7;
  if (expLevel >= 11) return 6;
  if (expLevel >= 9) return 5;
  if (expLevel >= 7) return 4;
  if (expLevel >= 5) return 3;
  if (expLevel >= 3) return 2;
  return 1;
}

// ─── CLASS CHANGE (PROMOTION) MECHANICS ─────────────────────────────────
// From the manual:
// - A mage with spell level 3+ in at least 1 school can become a Sorcerer
// - A mage with spell level 3+ in at least 2 schools can become a Wizard
// - Once a mage leaves a school, they can never return
// - Upon class change: XP resets to 0, retains attributes, HP, SP, and all
//   previous spell knowledge. Cannot learn higher spells in old school.
// - An Archmage has all 7 levels in all 4 schools.

/**
 * Check if a character is eligible to change to a target class.
 * @param {object} character - Must have schoolLevels: { CONJURER: 3, MAGICIAN: 2, ... }
 * @param {string} targetClassName - e.g. 'Sorcerer', 'Wizard', 'Magician'
 * @returns {{ eligible: boolean, reason: string }}
 */
export function canChangeClass(character, targetClassName) {
  const targetClass = getClassByName(targetClassName);
  if (!targetClass) {
    return { eligible: false, reason: 'Unknown class.' };
  }

  // Cannot change to a non-mage class from a mage path
  if (targetClass.type !== 'mage') {
    return { eligible: false, reason: 'Can only change between magic-user classes.' };
  }

  // Cannot return to a school already left
  const completedSchools = character.completedSchools || [];
  if (completedSchools.includes(targetClass.spellSchool)) {
    return { eligible: false, reason: `Cannot return to ${targetClassName}. Once a mage leaves a school, they cannot return.` };
  }

  // Cannot change to current class
  if (character.class === targetClassName) {
    return { eligible: false, reason: `Already a ${targetClassName}.` };
  }

  // Check promotion requirements for Sorcerer/Wizard
  if (targetClass.promotionRequirement) {
    const schoolLevels = character.schoolLevels || {};
    const qualifyingSchools = Object.values(schoolLevels).filter(
      level => level >= targetClass.promotionRequirement.minSpellLevel
    ).length;

    if (qualifyingSchools < targetClass.promotionRequirement.minSchools) {
      const req = targetClass.promotionRequirement;
      return {
        eligible: false,
        reason: `Requires spell level ${req.minSpellLevel} in at least ${req.minSchools} other magic art(s). Currently have ${qualifyingSchools}.`
      };
    }
  }

  // For base mage classes (Conjurer, Magician), character must currently be a mage
  // with at least spell level 3 in their current school
  const currentSchoolLevels = character.schoolLevels || {};
  const hasAnyMagicTraining = Object.values(currentSchoolLevels).some(l => l >= 1);

  if (!hasAnyMagicTraining && !targetClass.isBase) {
    return { eligible: false, reason: 'Must have training in at least one magic art first.' };
  }

  return { eligible: true, reason: 'Eligible for class change.' };
}

/**
 * Execute a class change. Returns the modified character.
 * From the manual: XP resets to 0, retains attributes, HP, SP, all spell knowledge.
 * Old school is added to completedSchools and cannot be re-entered.
 * @param {object} character
 * @param {string} newClassName
 * @returns {object} Modified character
 */
export function executeClassChange(character, newClassName) {
  const check = canChangeClass(character, newClassName);
  if (!check.eligible) {
    console.warn(`[ClassChange] Cannot change: ${check.reason}`);
    return character;
  }

  const newClass = getClassByName(newClassName);
  const oldClass = getClassByName(character.class);

  // Mark old school as completed (cannot return)
  const completedSchools = [...(character.completedSchools || [])];
  if (oldClass && oldClass.spellSchool && !completedSchools.includes(oldClass.spellSchool)) {
    completedSchools.push(oldClass.spellSchool);
  }

  // Preserve current spell level in old school
  const schoolLevels = { ...(character.schoolLevels || {}) };
  // New school starts at level 1
  if (newClass.spellSchool) {
    schoolLevels[newClass.spellSchool] = schoolLevels[newClass.spellSchool] || 1;
  }

  return {
    ...character,
    class: newClassName,
    xp: 0, // XP resets
    level: 1, // Level resets
    // Retain: attributes, HP, SP, gold, items, all spell knowledge
    schoolLevels,
    completedSchools,
    activeSchool: newClass.spellSchool
  };
}

/**
 * Check if a character is an Archmage (all 7 levels in all 4 schools).
 * @param {object} character
 * @returns {boolean}
 */
export function isArchmage(character) {
  const schoolLevels = character.schoolLevels || {};
  const schools = ['CONJURER', 'MAGICIAN', 'SORCERER', 'WIZARD'];
  return schools.every(s => (schoolLevels[s] || 0) >= 7);
}

// ─── STARTING CHARACTER GENERATION ──────────────────────────────────────

/**
 * Generate a new character with proper starting stats per the manual.
 * @param {string} name
 * @param {string} raceName
 * @param {string} className
 * @returns {object} Complete character object
 */
export function createCharacter(name, raceName, className) {
  const classDef = getClassByName(className);
  const attrs = rollAttributes(raceName);

  // Calculate starting HP: class base + CN bonus
  const cnBonus = Math.max(0, attrs.cn - 14); // CN > 14 gives bonus HP
  const startHP = classDef.baseHP + cnBonus + Math.floor(Math.random() * 6);

  // Calculate starting SP: class base + IQ bonus (for mages)
  const iqBonus = classDef.canUseMagic ? Math.max(0, attrs.iq - 14) : 0;
  const startSP = classDef.baseSP + iqBonus;

  // Starting gold: enough for basic equipment
  const startGold = 100 + Math.floor(Math.random() * 100);

  // Spell knowledge
  const schoolLevels = {};
  if (classDef.spellSchool) {
    schoolLevels[classDef.spellSchool] = 1; // Level 1 mages know all level 1 spells
  }

  return {
    name,
    race: raceName,
    class: className,
    level: 1,
    xp: 0,
    gold: startGold,

    // Attributes
    st: attrs.st,
    iq: attrs.iq,
    dx: attrs.dx,
    cn: attrs.cn,
    lk: attrs.lk,

    // Vitals
    hp: startHP,
    maxHp: startHP,
    currentHp: startHP,
    sp: startSP,
    maxSp: startSP,
    ac: 10, // Base unarmored AC

    // Status
    status: 'OK', // OK, POISONED, STONED, OLD, DEAD, POSSESSED, INSANE, NUTS

    // Magic
    schoolLevels,         // { CONJURER: 2, MAGICIAN: 1 }
    completedSchools: [], // Schools left (cannot return)
    activeSchool: classDef.spellSchool || null,

    // Bard
    songsRemaining: className === 'Bard' ? 1 : 0, // = experience level
    activeSong: null,

    // Inventory (max 8 items)
    inventory: [],
    equipped: {
      weapon: null,
      shield: null,
      armor: null,
      helm: null,
      gloves: null,
      instrument: null,
      ring: null,
      misc: null
    }
  };

  autoEquipCharacter(char);
  return char;
}

// ─── CLASS-SPECIFIC COMBAT MECHANICS ────────────────────────────────────

/**
 * Get the number of attacks a Warrior/Paladin gets this round.
 * Extra attack every 4 levels after 1st.
 * @param {object} character
 * @returns {number}
 */
export function getAttackCount(character) {
  const classDef = getClassByName(character.class);
  if (!classDef || !classDef.multiAttackInterval) return 1;

  const level = character.level || 1;
  return 1 + Math.floor((level - 1) / classDef.multiAttackInterval);
}

/**
 * Get the Hunter's critical hit (instant kill) chance.
 * @param {object} character
 * @returns {number} Probability 0-1
 */
export function getCriticalHitChance(character) {
  const classDef = getClassByName(character.class);
  if (!classDef || classDef.specialAbility !== 'criticalHit') return 0;

  const level = character.level || 1;
  return Math.min(0.50, classDef.baseCritChance + (level - 1) * classDef.critChancePerLevel);
}

/**
 * Get the Monk's unarmed damage and AC bonus.
 * @param {object} character
 * @returns {{ damage: number, acBonus: number }}
 */
export function getMonkBonuses(character) {
  const classDef = getClassByName(character.class);
  if (!classDef || classDef.specialAbility !== 'unarmedMastery') {
    return { damage: 0, acBonus: 0 };
  }

  const level = character.level || 1;
  return {
    damage: classDef.unarmedDamageBase + (level - 1) * classDef.unarmedDamagePerLevel,
    acBonus: (level - 1) * classDef.unarmedACPerLevel // Negative = better
  };
}

/**
 * Get the Paladin's magic resistance bonus.
 * @param {object} character
 * @returns {number} Percentage bonus
 */
export function getMagicResistance(character) {
  const classDef = getClassByName(character.class);
  if (!classDef || classDef.specialAbility !== 'magicResistance') return 0;
  return classDef.magicResistBonus || 0;
}

/**
 * Check if a Rogue successfully hides in shadows.
 * @param {object} character
 * @returns {boolean}
 */
export function attemptHideInShadows(character) {
  const classDef = getClassByName(character.class);
  if (!classDef || classDef.specialAbility !== 'hideInShadows') return false;

  const level = character.level || 1;
  const dx = character.dx || 10;
  // Base 40% + 5% per level + DX bonus
  const chance = 0.40 + (level - 1) * 0.05 + (dx - 10) * 0.02;
  return Math.random() < Math.min(0.95, chance);
}
