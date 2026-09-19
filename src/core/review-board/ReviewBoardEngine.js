// ReviewBoardEngine.js - Authentic 1985 C64 Bard's Tale Review Board & XP Progression
// Faithfully reproduces the canonical BT1 experience tables, survivor XP splits,
// in-person Review Board advancement, hit point/spell point increases,
// attribute boosts, spell tier training, and class promotion mechanics.

export const LOW_LEVEL_THRESHOLDS = Object.freeze({
  fighter: [0, 2000, 4000, 7000, 10000, 15000, 20000, 30000, 50000, 80000, 110000, 150000, 200000],
  monkMage: [0, 1800, 4000, 6000, 10000, 14000, 19000, 29000, 50000, 90000, 120000, 170000, 230000],
  sorcerer: [0, 7000, 15000, 25000, 40000, 60000, 80000, 100000, 130000, 170000, 220000, 300000, 400000],
  wizard: [0, 20000, 50000, 80000, 120000, 160000, 200000, 250000, 300000, 400000, 600000, 900000, 1300000]
});

export const POST_13_INCREMENTS = Object.freeze({
  fighter: 200000,
  monkMage: 230000,
  sorcerer: 400000,
  wizard: 1300000
});

export const CLASS_HIT_DICE = Object.freeze({
  Warrior: 10,
  Paladin: 10,
  Monk: 8,
  Hunter: 8,
  Rogue: 6,
  Bard: 8,
  Conjurer: 4,
  Magician: 4,
  Sorcerer: 4,
  Wizard: 4
});

/**
 * Maps a class name to its canonical experience progression group.
 * @param {string} className
 * @returns {'fighter' | 'monkMage' | 'sorcerer' | 'wizard'}
 */
export function getGroupForClass(className) {
  const c = (className || '').toLowerCase();
  if (['warrior', 'paladin', 'bard', 'hunter', 'rogue'].includes(c)) return 'fighter';
  if (['monk', 'conjurer', 'magician'].includes(c)) return 'monkMage';
  if (c === 'sorcerer') return 'sorcerer';
  if (c === 'wizard') return 'wizard';
  return 'fighter';
}

/**
 * Returns cumulative total XP required to reach targetLevel for a given class.
 * @param {string} className
 * @param {number} targetLevel
 * @returns {number}
 */
export function getXPRequiredForLevel(className, targetLevel) {
  if (targetLevel <= 1) return 0;
  const group = getGroupForClass(className);
  const table = LOW_LEVEL_THRESHOLDS[group];

  if (targetLevel <= 13) {
    return table[targetLevel - 1];
  }

  const base13 = table[12]; // Index 12 is Level 13 threshold
  const increment = POST_13_INCREMENTS[group];
  return base13 + (targetLevel - 13) * increment;
}

/**
 * Returns the highest level a character can achieve given their current cumulative XP.
 * @param {string} className
 * @param {number} currentXP
 * @returns {number}
 */
export function getMaxReachableLevel(className, currentXP) {
  let level = 1;
  while (currentXP >= getXPRequiredForLevel(className, level + 1)) {
    level++;
    if (level >= 99) break;
  }
  return level;
}

/**
 * Returns XP needed to reach next level, or 0 if ready to advance.
 * @param {object} character
 * @returns {{ currentLevel: number, nextLevel: number, currentXP: number, requiredXP: number, xpRemaining: number, isReady: boolean }}
 */
export function getCharacterAdvancementStatus(character) {
  if (!character) return { currentLevel: 1, nextLevel: 2, currentXP: 0, requiredXP: 2000, xpRemaining: 2000, isReady: false };

  const currentLevel = character.level || 1;
  const nextLevel = currentLevel + 1;
  const currentXP = character.xp || 0;
  const requiredXP = getXPRequiredForLevel(character.class, nextLevel);
  const xpRemaining = Math.max(0, requiredXP - currentXP);
  const isReady = currentXP >= requiredXP;

  return {
    currentLevel,
    nextLevel,
    currentXP,
    requiredXP,
    xpRemaining,
    isReady
  };
}

/**
 * Calculates max spell level available for a given experience level.
 * Unlocks at experience levels: 1, 3, 5, 7, 9, 11, 13.
 * @param {number} expLevel
 * @returns {number} 1 to 7
 */
export function getMaxSpellTierForLevel(expLevel) {
  if (expLevel >= 13) return 7;
  if (expLevel >= 11) return 6;
  if (expLevel >= 9) return 5;
  if (expLevel >= 7) return 4;
  if (expLevel >= 5) return 3;
  if (expLevel >= 3) return 2;
  return 1;
}

export class ReviewBoardEngine {
  /**
   * Promotes a character at the Review Board, applying HP rolls, SP gains, and attribute increases.
   * @param {object} character
   * @returns {{ success: boolean, oldLevel: number, newLevel: number, hpGained: number, spGained: number, attributeBoosts: object, message: string }}
   */
  static advanceCharacter(character) {
    if (!character) return { success: false, message: 'Invalid character.' };

    const oldLevel = character.level || 1;
    const currentXP = character.xp || 0;
    const maxLevel = getMaxReachableLevel(character.class, currentXP);

    if (maxLevel <= oldLevel) {
      const needed = getXPRequiredForLevel(character.class, oldLevel + 1) - currentXP;
      return {
        success: false,
        oldLevel,
        newLevel: oldLevel,
        hpGained: 0,
        spGained: 0,
        attributeBoosts: {},
        message: `The Board decrees: ${character.name} requires ${needed.toLocaleString()} more XP for Level ${oldLevel + 1}.`
      };
    }

    const levelsGained = maxLevel - oldLevel;
    let totalHpGained = 0;
    let totalSpGained = 0;
    const attributeBoosts = {};

    const hitDie = CLASS_HIT_DICE[character.class] || 8;
    const cnMod = Math.floor(((character.stats?.cn || character.cn || 10) - 10) / 4);

    for (let l = oldLevel + 1; l <= maxLevel; l++) {
      // 1. Roll Hit Points (Die + Con modifier)
      const rolledHp = Math.max(1, Math.floor(Math.random() * hitDie) + 1 + cnMod);
      totalHpGained += rolledHp;

      // 2. Spell Points for Mages
      const isMage = ['Conjurer', 'Magician', 'Sorcerer', 'Wizard'].includes(character.class);
      if (isMage) {
        const iqVal = character.stats?.iq || character.iq || 12;
        const rolledSp = Math.floor(Math.random() * 6) + 10 + Math.floor((iqVal - 10) / 4);
        totalSpGained += rolledSp;
      }

      // 3. Random Attribute Boost (up to 18 max)
      const attrPool = ['st', 'iq', 'dx', 'cn', 'lk'];
      const chosenAttr = attrPool[Math.floor(Math.random() * attrPool.length)];

      if (character.stats && character.stats[chosenAttr] !== undefined) {
        if (character.stats[chosenAttr] < 18) {
          character.stats[chosenAttr]++;
          attributeBoosts[chosenAttr] = (attributeBoosts[chosenAttr] || 0) + 1;
        }
      } else if (character[chosenAttr] !== undefined) {
        if (character[chosenAttr] < 18) {
          character[chosenAttr]++;
          attributeBoosts[chosenAttr] = (attributeBoosts[chosenAttr] || 0) + 1;
        }
      }
    }

    // Apply changes
    character.level = maxLevel;
    character.maxHp = (character.maxHp || 20) + totalHpGained;
    character.hp = character.maxHp; // Full heal upon level promotion

    if (totalSpGained > 0) {
      character.maxSp = (character.maxSp || 20) + totalSpGained;
      character.sp = character.maxSp;
    }

    const boostsText = Object.entries(attributeBoosts)
      .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
      .join(', ');

    return {
      success: true,
      oldLevel,
      newLevel: maxLevel,
      hpGained: totalHpGained,
      spGained: totalSpGained,
      attributeBoosts,
      message: `⭐ ${character.name} promoted from Level ${oldLevel} ➔ Level ${maxLevel}! (+${totalHpGained} Max HP${totalSpGained > 0 ? `, +${totalSpGained} SP` : ''}${boostsText ? `, ${boostsText}` : ''})`
    };
  }

  /**
   * Promotes all eligible party members at the Review Board.
   * @param {object[]} party
   * @returns {{ advancedCount: number, results: Array<object>, summary: string }}
   */
  static advanceEntireParty(party) {
    if (!party || !Array.isArray(party)) return { advancedCount: 0, results: [], summary: 'No party found.' };

    const results = [];
    let advancedCount = 0;

    party.forEach(hero => {
      const res = this.advanceCharacter(hero);
      if (res.success) {
        advancedCount++;
        results.push(res);
      }
    });

    const summary = advancedCount > 0
      ? `📜 The Review Board has promoted ${advancedCount} hero(es)! Vitality, spell power, and attributes increased.`
      : '📜 None of your heroes possess sufficient experience for advancement. Continue questing in Skara Brae!';

    return {
      advancedCount,
      results,
      summary
    };
  }

  /**
   * Teaches a newly unlocked spell tier to a magic user for a gold training fee.
   * @param {object} character
   * @param {number} tier - 1 to 7
   * @param {object[]} party
   * @returns {{ success: boolean, cost: number, message: string }}
   */
  static purchaseSpellTier(character, tier, party) {
    if (!character) return { success: false, cost: 0, message: 'Invalid character.' };

    const isMage = ['Conjurer', 'Magician', 'Sorcerer', 'Wizard'].includes(character.class);
    if (!isMage) {
      return { success: false, cost: 0, message: `${character.name} cannot learn magic spells!` };
    }

    const maxTier = getMaxSpellTierForLevel(character.level || 1);
    if (tier > maxTier) {
      return { success: false, cost: 0, message: `Level ${character.level} ${character.class} can only learn up to Spell Tier ${maxTier}.` };
    }

    const currentTaughtTier = character.schoolLevels?.[character.class.toUpperCase()] || 1;
    if (tier <= currentTaughtTier) {
      return { success: false, cost: 0, message: `${character.name} already mastered Spell Tier ${tier} in ${character.class}!` };
    }

    const cost = tier * 100;
    const partyGold = Array.isArray(party)
      ? party.reduce((sum, h) => sum + (h.gold || 0), 0)
      : (character.gold || 0);

    if (cost > partyGold) {
      return {
        success: false,
        cost,
        message: `Insufficient gold! Learning Tier ${tier} spells requires ${cost} GP, but the party only has ${partyGold} GP.`
      };
    }

    // Deduct gold
    let rem = cost;
    if (Array.isArray(party)) {
      for (const hero of party) {
        if (rem <= 0) break;
        const deduct = Math.min(hero.gold || 0, rem);
        hero.gold = (hero.gold || 0) - deduct;
        rem -= deduct;
      }
    }

    // Update taught spell levels
    if (!character.schoolLevels) character.schoolLevels = {};
    character.schoolLevels[character.class.toUpperCase()] = tier;

    return {
      success: true,
      cost,
      message: `✨ ${character.name} has learned Spell Tier ${tier} in ${character.class} for ${cost} GP!`
    };
  }

  /**
   * Promotes a qualified mage to a new class (Sorcerer or Wizard) upon request at the Review Board.
   * @param {object} character
   * @param {string} targetClassName - 'Sorcerer' | 'Wizard'
   * @returns {{ success: boolean, message: string }}
   */
  static changeClass(character, targetClassName) {
    if (!character) return { success: false, message: 'Invalid character.' };

    const currentSchool = character.class.toUpperCase();

    // Check prerequisites
    if (targetClassName === 'Sorcerer') {
      const qualifying = Object.values(character.schoolLevels || {}).filter(lvl => lvl >= 3).length;
      if (qualifying < 1) {
        return { success: false, message: 'Requires mastery of at least Level 3 in one magic art (Conjurer or Magician).' };
      }
    } else if (targetClassName === 'Wizard') {
      const qualifying = Object.values(character.schoolLevels || {}).filter(lvl => lvl >= 3).length;
      if (qualifying < 2) {
        return { success: false, message: 'Requires mastery of at least Level 3 in two magic arts (e.g. Conjurer & Sorcerer).' };
      }
    }

    // Add old class to completedSchools
    if (!character.completedSchools) character.completedSchools = [];
    if (!character.completedSchools.includes(currentSchool)) {
      character.completedSchools.push(currentSchool);
    }

    // Reset Level & XP to 1 / 0 while retaining HP, SP, and all spells
    character.class = targetClassName;
    character.level = 1;
    character.xp = 0;

    if (!character.schoolLevels) character.schoolLevels = {};
    character.schoolLevels[targetClassName.toUpperCase()] = 1;

    return {
      success: true,
      message: `🔮 The Board initiates ${character.name} into the exalted rank of ${targetClassName}! (Level reset to 1; all spells & power retained).`
    };
  }
}
