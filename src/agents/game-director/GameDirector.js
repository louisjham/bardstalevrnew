// GameDirector.js - AI Game Director with Modern Pacing & Anti-Grind Controls
// Now powered by MonsterDatabase for authentic Bard's Tale encounters.

import { generateEncounter, flattenEncounterToMonsters } from '../../data/MonsterDatabase.js';

export class GameDirector {
  constructor() {
    this.threatLevel = 1;
    this.xpMultiplier = 2.5; // Modern anti-grind multiplier for smooth pacing
    this.goldMultiplier = 2.0;
    this.encounterHistory = []; // Track recent encounters for variety
  }

  /**
   * Generate a combat encounter appropriate for the party's level and time of day.
   * Uses MonsterDatabase for authentic Bard's Tale monsters.
   * @param {number} partyLevel - Average party level
   * @param {string} [location='streets'] - 'streets' | 'sewers' | 'catacombs' | 'castle' | 'tower'
   * @param {boolean} [isNight=false] - Whether it is currently night
   * @returns {object[]} Array of monster instances ready for CombatEngine
   */
  generateMonsterEncounter(partyLevel = 1, location = 'streets', isNight = false) {
    const encounter = generateEncounter(partyLevel, location, isNight);
    const monsters = flattenEncounterToMonsters(encounter);

    // Apply modern anti-grind XP/gold multipliers
    monsters.forEach(m => {
      m.xp = Math.floor((m.xp || 30) * this.xpMultiplier);
      m.gold = Math.floor((m.gold || 10) * this.goldMultiplier);
    });

    this.encounterHistory.push({
      timestamp: Date.now(),
      monsters: monsters.map(m => m.name),
      level: partyLevel,
      isNight
    });

    return monsters;
  }

  /**
   * Compatibility wrapper accepting partyLevel and optional isNight.
   * @param {number} partyLevel
   * @param {boolean} [isNight=false]
   * @returns {object[]}
   */
  generateEncounter(partyLevel = 1, isNight = false) {
    return this.generateMonsterEncounter(partyLevel, 'streets', isNight);
  }

  calculateLoot(monsters) {
    const totalExp = monsters.reduce((sum, m) => sum + (m.xp || 40), 0);
    const totalGold = monsters.reduce((sum, m) => sum + (m.gold || 10), 0);
    return { exp: Math.floor(totalExp), gold: Math.floor(totalGold) };
  }
}
