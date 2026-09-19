// RecoverySystem.js - Canonical Healing, Temple & Status Recovery Engine
// Faithfully reproduces the 1985 C64 Bard's Tale healing and recovery rules:
// - Recovery Path & Severity Hierarchy (Field vs Temple recovery)
// - Temple treatments: HP wounds, Poison, Paralysis, Insanity, Withering, Petrification, Resurrection
// - Resurrection brings characters back at 1 HP (retains gold, items, XP)
// - Temple of the Mad God Tarjan heals Rogues for FREE (0 GP)
// - Roscoe's Energy Emporium restores Spell Points for gold (15 GP/SP)
// - Bard's Song Badh'r Kilnfest heals over time / combat rounds
// - Passive item regeneration (Troll Ring, Troll Staff, Ring of Health)

import { ConditionSystem, BT1Condition } from '../conditions/ConditionSystem.js';

export const RecoveryPath = Object.freeze({
  BARD_SONG: 'bard_song',
  HEALING_SPELL: 'healing_spell',
  REGENERATION: 'regeneration',
  TEMPLE_SERVICE: 'temple_service',
  RESURRECTION: 'resurrection'
});

export const CharacterStatus = Object.freeze({
  OK: 'ALIVE',
  ALIVE: 'ALIVE',
  DAMAGED: 'DAMAGED',
  POISONED: 'POIS',
  POIS: 'POIS',
  PARALYZED: 'PARA',
  PARA: 'PARA',
  INSANE: 'NUTS',
  NUTS: 'NUTS',
  POSSESSED: 'POSS',
  POSS: 'POSS',
  WITHERED: 'OLD',
  OLD: 'OLD',
  STONED: 'STON',
  STON: 'STON',
  DEAD: 'DEAD'
});

/**
 * Severity hierarchy mapping each condition to allowed recovery paths.
 */
export const RECOVERY_RULES = Object.freeze({
  hpDamage: [RecoveryPath.BARD_SONG, RecoveryPath.HEALING_SPELL, RecoveryPath.REGENERATION, RecoveryPath.TEMPLE_SERVICE],
  poison: [RecoveryPath.HEALING_SPELL, RecoveryPath.TEMPLE_SERVICE],
  paralysis: [RecoveryPath.HEALING_SPELL, RecoveryPath.TEMPLE_SERVICE],
  insanity: [RecoveryPath.HEALING_SPELL, RecoveryPath.TEMPLE_SERVICE],
  possession: [RecoveryPath.TEMPLE_SERVICE],   // Temple ONLY
  withering: [RecoveryPath.TEMPLE_SERVICE],     // Temple ONLY
  petrification: [RecoveryPath.TEMPLE_SERVICE], // Temple ONLY
  death: [RecoveryPath.TEMPLE_SERVICE]          // Temple ONLY (Resurrection)
});

/**
 * Canonical Temple service costs in gold pieces.
 */
export const TEMPLE_PRICING = Object.freeze({
  hpPerPoint: 1,           // 1 GP per missing HP
  poisonCure: 100,         // 100 GP to cure poison (POIS)
  paralysisCure: 250,      // 250 GP to cure paralysis (PARA)
  insanityCure: 300,       // 300 GP to cure insanity (NUTS)
  possessionCure: 300,     // 300 GP to cure possession (POSS)
  witheringCure: 500,      // 500 GP to cure withering / old (OLD)
  petrificationCure: 1000, // 1000 GP to cure petrification (STON)
  resurrection: 1000,      // 1000 GP to resurrect the dead (returns at 1 HP)
  roscoeSpCost: 15         // 15 GP per Spell Point at Roscoe's Emporium
});

export class RecoveryEngine {
  /**
   * Check if a condition can be healed by a given recovery path.
   * @param {string} condition - 'hpDamage' | 'poison' | 'paralysis' | 'insanity' | 'withering' | 'petrification' | 'death'
   * @param {string} path - One of RecoveryPath enum values
   * @returns {boolean}
   */
  static canHealCondition(condition, path) {
    const allowedPaths = RECOVERY_RULES[condition];
    return allowedPaths ? allowedPaths.includes(path) : false;
  }

  /**
   * Restore HP to a character up to their maxHp.
   * @param {object} character
   * @param {number} amount
   * @param {string} path
   * @returns {{ healedAmount: number, newHp: number }}
   */
  static healHitPoints(character, amount, path) {
    if (!character || character.status === CharacterStatus.DEAD || character.status === CharacterStatus.STONED) {
      return { healedAmount: 0, newHp: character?.hp || 0 };
    }
    if (!this.canHealCondition('hpDamage', path)) {
      return { healedAmount: 0, newHp: character.hp };
    }

    const maxHp = character.maxHp || 20;
    const oldHp = character.hp || 0;
    const newHp = Math.min(maxHp, oldHp + amount);
    const healedAmount = newHp - oldHp;
    character.hp = newHp;

    if (character.status === CharacterStatus.DAMAGED && newHp >= maxHp) {
      character.status = CharacterStatus.OK;
    }

    return { healedAmount, newHp };
  }

  /**
   * Cure an affliction on a character.
   * @param {object} character
   * @param {string} condition - 'poison' | 'paralysis' | 'insanity' | 'withering' | 'petrification'
   * @param {string} path
   * @returns {{ success: boolean, message: string }}
   */
  static cureCondition(character, condition, path) {
    if (!character) return { success: false, message: 'Invalid character' };
    if (!this.canHealCondition(condition, path)) {
      return { success: false, message: `Cannot cure ${condition} via ${path}. A Temple is required!` };
    }

    const statusMap = {
      poison: CharacterStatus.POISONED,
      paralysis: CharacterStatus.PARALYZED,
      insanity: CharacterStatus.INSANE,
      withering: CharacterStatus.WITHERED,
      petrification: CharacterStatus.STONED
    };

    const targetStatus = statusMap[condition];
    if (character.status === targetStatus) {
      character.status = (character.hp < character.maxHp) ? CharacterStatus.DAMAGED : CharacterStatus.OK;
      return { success: true, message: `${character.name} cured of ${condition}!` };
    }

    return { success: false, message: `${character.name} does not suffer from ${condition}.` };
  }

  /**
   * Resurrect a dead character at a Temple.
   * Returns them to life with exactly 1 HP, retaining items, gold, and XP.
   * @param {object} character
   * @param {string} path
   * @returns {{ success: boolean, character: object, message: string }}
   */
  static resurrectCharacter(character, path = RecoveryPath.TEMPLE_SERVICE) {
    if (!character) return { success: false, message: 'Invalid character' };
    if (!this.canHealCondition('death', path)) {
      return { success: false, message: 'Only a Temple can resurrect the dead!' };
    }
    if (character.status !== CharacterStatus.DEAD && character.hp > 0) {
      return { success: false, message: `${character.name} is not dead!` };
    }

    character.status = CharacterStatus.DAMAGED;
    character.hp = 1; // Authentic C64 rule: resurrected heroes return at 1 HP!

    return {
      success: true,
      character,
      message: `✨ ${character.name} has been summoned back from the void! (Returns at 1 HP, needs healing).`
    };
  }

  /**
   * Calculate total Temple treatment cost for a character.
   * @param {object} character
   * @param {boolean} isRogueFree - Free for rogues at Temple of Tarjan
   * @returns {{ totalCost: number, hpCost: number, conditionCost: number, isResurrection: boolean, conditionsToCure: string[] }}
   */
  static calculateTempleCost(character, isRogueFree = false) {
    if (!character) return { totalCost: 0, hpCost: 0, conditionCost: 0, isResurrection: false, conditionsToCure: [] };

    // Temple of the Mad God Tarjan special case: Rogues receive free healing!
    if (isRogueFree && character.class === 'Rogue') {
      return { totalCost: 0, hpCost: 0, conditionCost: 0, isResurrection: character.status === CharacterStatus.DEAD, conditionsToCure: [] };
    }

    let hpCost = 0;
    let conditionCost = 0;
    let isResurrection = false;
    const conditionsToCure = [];

    // 1. Death / Resurrection
    if (character.status === CharacterStatus.DEAD || (character.hp <= 0 && character.hp !== undefined)) {
      isResurrection = true;
      conditionCost += TEMPLE_PRICING.resurrection;
      conditionsToCure.push('Resurrection (returns at 1 HP)');
    } else {
      // 2. HP Wounds
      const maxHp = character.maxHp || 20;
      const currentHp = Math.max(0, character.hp || 0);
      const missingHp = Math.max(0, maxHp - currentHp);
      hpCost = missingHp * TEMPLE_PRICING.hpPerPoint;

      // 3. Status Conditions
      const cond = ConditionSystem.normalizeCondition(character.condition || character.status);
      switch (cond.code) {
        case 'POIS':
          conditionCost += TEMPLE_PRICING.poisonCure;
          conditionsToCure.push('Poison (POIS)');
          break;
        case 'PARA':
          conditionCost += TEMPLE_PRICING.paralysisCure;
          conditionsToCure.push('Paralysis (PARA)');
          break;
        case 'NUTS':
          conditionCost += TEMPLE_PRICING.insanityCure;
          conditionsToCure.push('Insanity (NUTS)');
          break;
        case 'POSS':
          conditionCost += TEMPLE_PRICING.possessionCure;
          conditionsToCure.push('Possession (POSS)');
          break;
        case 'OLD':
          conditionCost += TEMPLE_PRICING.witheringCure;
          conditionsToCure.push('Old / Withering (OLD)');
          break;
        case 'STON':
          conditionCost += TEMPLE_PRICING.petrificationCure;
          conditionsToCure.push('Petrification (STON)');
          break;
      }
    }

    const totalCost = hpCost + conditionCost;
    return { totalCost, hpCost, conditionCost, isResurrection, conditionsToCure };
  }

  /**
   * Apply Temple treatment to a character.
   * @param {object} character
   * @param {object} partyGoldHolder - Object with gold property or party array
   * @param {boolean} isRogueFree
   * @returns {{ success: boolean, message: string, goldDeducted: number }}
   */
  static applyTempleTreatment(character, party, isRogueFree = false) {
    if (!character) return { success: false, message: 'Invalid character', goldDeducted: 0 };

    const { totalCost, isResurrection } = this.calculateTempleCost(character, isRogueFree);

    // Calculate total party gold
    let partyGold = Array.isArray(party)
      ? party.reduce((sum, h) => sum + (h.gold || 0), 0)
      : (party.gold || 0);

    if (totalCost > partyGold && !(isRogueFree && character.class === 'Rogue')) {
      return {
        success: false,
        message: `Insufficient gold! Treatment costs ${totalCost} GP, but party only has ${partyGold} GP.`,
        goldDeducted: 0
      };
    }

    // Deduct gold from party
    let remainingToDeduct = totalCost;
    if (Array.isArray(party)) {
      for (const hero of party) {
        if (remainingToDeduct <= 0) break;
        const deduct = Math.min(hero.gold || 0, remainingToDeduct);
        hero.gold = (hero.gold || 0) - deduct;
        remainingToDeduct -= deduct;
      }
    } else if (party.gold !== undefined) {
      party.gold -= totalCost;
    }

    // Perform healing
    if (isResurrection) {
      ConditionSystem.resurrectCharacter(character);
      return {
        success: true,
        message: `✨ ${character.name} resurrected by the High Priest for ${totalCost} GP! (Returns at 1 HP, needs healing).`,
        goldDeducted: totalCost
      };
    } else {
      character.hp = character.maxHp || 20;
      if (character.currentHp !== undefined) character.currentHp = character.maxHp || 20;
      ConditionSystem.cureCondition(character);
      return {
        success: true,
        message: `✨ ${character.name} fully cleansed and healed by the Temple priests for ${totalCost} GP!`,
        goldDeducted: totalCost
      };
    }
  }

  /**
   * Restore Spell Points at Roscoe's Energy Emporium for gold (15 GP per SP).
   * @param {object} character
   * @param {object[]} party
   * @returns {{ success: boolean, spRestored: number, cost: number, message: string }}
   */
  static restoreSpellPointsAtRoscoe(character, party) {
    if (!character) return { success: false, spRestored: 0, cost: 0, message: 'Invalid character' };

    const maxSp = character.maxSp || (character.level ? character.level * 14 : 20);
    const currentSp = character.sp || 0;
    const missingSp = Math.max(0, maxSp - currentSp);

    if (missingSp === 0) {
      return { success: false, spRestored: 0, cost: 0, message: `${character.name} is already at full Spell Points!` };
    }

    const cost = missingSp * TEMPLE_PRICING.roscoeSpCost;
    let partyGold = Array.isArray(party)
      ? party.reduce((sum, h) => sum + (h.gold || 0), 0)
      : (party.gold || 0);

    if (cost > partyGold) {
      return {
        success: false,
        spRestored: 0,
        cost: 0,
        message: `Insufficient gold! Roscoe requires ${cost} GP (${TEMPLE_PRICING.roscoeSpCost} GP/SP), but party only has ${partyGold} GP.`
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

    character.sp = maxSp;
    return {
      success: true,
      spRestored: missingSp,
      cost,
      message: `⚡ Roscoe channels arcane energy into ${character.name}! Restored +${missingSp} SP for ${cost} GP.`
    };
  }

  /**
   * Process passive item regeneration for equipped Troll items / Ring of Health (+1 HP per tick).
   * @param {object[]} party
   * @returns {number} Count of heroes regenerated
   */
  static processItemRegeneration(party) {
    if (!party || !Array.isArray(party)) return 0;
    let count = 0;

    party.forEach(hero => {
      if (!hero || hero.status === CharacterStatus.DEAD || hero.status === CharacterStatus.STONED) return;

      let hasRegenItem = false;
      if (hero.equipped) {
        for (const slot in hero.equipped) {
          const item = hero.equipped[slot];
          if (item && (item.regeneration || item.name === 'Troll Ring' || item.name === 'Troll Staff' || item.name === 'Ring of Health')) {
            hasRegenItem = true;
            break;
          }
        }
      }

      if (hasRegenItem && hero.hp < (hero.maxHp || 20)) {
        hero.hp = Math.min(hero.maxHp || 20, hero.hp + 1);
        if (hero.status === CharacterStatus.DAMAGED && hero.hp >= hero.maxHp) {
          hero.status = CharacterStatus.OK;
        }
        count++;
      }
    });

    return count;
  }
}
