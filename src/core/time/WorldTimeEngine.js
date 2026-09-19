// WorldTimeEngine.js - Canonical Day/Night Risk & Resource Management System
// Faithfully reproduces the 1985 C64 Bard's Tale Day/Night ruleset:
// - Automatic continuous timer
// - Day: Natural Mage SP recovery, open town services, max 1 enemy group
// - Dusk: Visual/audio warnings that services are closing
// - Night: Multi-group dangerous encounters (Half-Orcs, Wolves, Zombies, Wights), closed services, no SP regen
// - Guild / Tavern: Safe haven reset point to rest until morning

import { RecoveryEngine } from '../recovery/RecoverySystem.js';

export const TimeOfDay = Object.freeze({
  DAY: 'day',
  DUSK: 'dusk',
  NIGHT: 'night',
  DAWN: 'dawn'
});

export const TIME_RULES = Object.freeze({
  day: {
    id: TimeOfDay.DAY,
    name: 'Day',
    durationSeconds: 180, // 3 minutes
    encounterGroupsMax: 1,
    spellPointRegenPerTick: 1,
    townServicesOpen: true,
    canLevelAtReviewBoard: true,
    ambientPreset: 'day',
    encounterTable: 'skaraBraeDay',
    description: '☀️ Sunlight bathes Skara Brae. Town services are open and mages regenerate spell points.'
  },
  dusk: {
    id: TimeOfDay.DUSK,
    name: 'Dusk',
    durationSeconds: 30, // 30 seconds warning
    encounterGroupsMax: 2,
    spellPointRegenPerTick: 1,
    townServicesOpen: true,
    canLevelAtReviewBoard: true,
    ambientPreset: 'dusk',
    encounterTable: 'skaraBraeDay',
    description: '🌆 Dusk falls over Skara Brae! Town services will close soon. Return to the Guild for safety.'
  },
  night: {
    id: TimeOfDay.NIGHT,
    name: 'Night',
    durationSeconds: 150, // 2.5 minutes of danger
    encounterGroupsMax: 4,
    spellPointRegenPerTick: 0,
    townServicesOpen: false,
    canLevelAtReviewBoard: false,
    ambientPreset: 'night',
    encounterTable: 'skaraBraeNight',
    description: '🌙 Night has fallen! Dangerous multi-group monsters roam the streets. Town services are closed.'
  },
  dawn: {
    id: TimeOfDay.DAWN,
    name: 'Dawn',
    durationSeconds: 20, // 20 seconds transition
    encounterGroupsMax: 1,
    spellPointRegenPerTick: 1,
    townServicesOpen: true,
    canLevelAtReviewBoard: true,
    ambientPreset: 'dawn',
    encounterTable: 'skaraBraeDay',
    description: '🌅 Dawn breaks over Skara Brae. The city awakens, services reopen, and mages regain their power.'
  }
});

const PHASE_SEQUENCE = [TimeOfDay.DAY, TimeOfDay.DUSK, TimeOfDay.NIGHT, TimeOfDay.DAWN];

export class WorldTimeEngine {
  constructor(party = [], onPhaseChange = null, onNotification = null) {
    this.party = party;
    this.onPhaseChange = onPhaseChange;
    this.onNotification = onNotification;

    this.currentPhaseIndex = 0; // Starts at DAY
    this.phaseElapsedTime = 0;
    this.totalWorldSeconds = 0;
    this.isPaused = false;

    // SP Regen Tick (every 6 seconds of exploration)
    this.regenTickInterval = 6.0;
    this.regenTickTimer = 0;
  }

  get currentPhase() {
    return PHASE_SEQUENCE[this.currentPhaseIndex];
  }

  get rules() {
    return TIME_RULES[this.currentPhase];
  }

  get phaseRemainingSeconds() {
    return Math.max(0, this.rules.durationSeconds - this.phaseElapsedTime);
  }

  get phaseProgress() {
    return Math.min(1.0, this.phaseElapsedTime / this.rules.durationSeconds);
  }

  get isDay() {
    return this.currentPhase === TimeOfDay.DAY || this.currentPhase === TimeOfDay.DAWN;
  }

  get isNight() {
    return this.currentPhase === TimeOfDay.NIGHT;
  }

  get isDusk() {
    return this.currentPhase === TimeOfDay.DUSK;
  }

  get areTownServicesOpen() {
    return this.rules.townServicesOpen;
  }

  setParty(party) {
    this.party = party || [];
  }

  update(deltaTime) {
    if (this.isPaused) return;

    this.phaseElapsedTime += deltaTime;
    this.totalWorldSeconds += deltaTime;

    // 1. Natural Mage Spell-Point & Item HP Regeneration Ticks
    this.regenTickTimer += deltaTime;
    if (this.regenTickTimer >= this.regenTickInterval) {
      this.regenTickTimer = 0;
      this.processSpellPointRegen();
      RecoveryEngine.processItemRegeneration(this.party);
    }

    // 2. Check Phase Progression
    if (this.phaseElapsedTime >= this.rules.durationSeconds) {
      this.advanceToNextPhase();
    }
  }

  advanceToNextPhase() {
    const oldPhase = this.currentPhase;
    this.currentPhaseIndex = (this.currentPhaseIndex + 1) % PHASE_SEQUENCE.length;
    this.phaseElapsedTime = 0;
    const newPhase = this.currentPhase;

    if (this.onPhaseChange) {
      this.onPhaseChange(newPhase, oldPhase, this.rules);
    }

    if (this.onNotification) {
      this.onNotification(this.rules.description, newPhase);
    }
  }

  /**
   * Reset world time to Morning (Day) by resting at Adventurers Guild or Tavern.
   * Restores all party HP & SP as in the original game.
   */
  restUntilMorning() {
    this.currentPhaseIndex = 0; // DAY
    this.phaseElapsedTime = 0;
    this.regenTickTimer = 0;

    // Restore Party HP and SP
    let healedHeroes = 0;
    if (this.party && this.party.length > 0) {
      this.party.forEach(hero => {
        if (hero.hp !== undefined && hero.maxHp !== undefined) hero.hp = hero.maxHp;
        if (hero.sp !== undefined && hero.maxSp !== undefined) hero.sp = hero.maxSp;
        healedHeroes++;
      });
    }

    if (this.onPhaseChange) {
      this.onPhaseChange(TimeOfDay.DAY, TimeOfDay.NIGHT, TIME_RULES.day);
    }

    if (this.onNotification) {
      this.onNotification(
        `🌅 Your party has rested safely until morning at the Adventurers Guild! All ${healedHeroes} heroes' HP & Spell Points are fully restored.`,
        TimeOfDay.DAY
      );
    }

    return {
      success: true,
      phase: TimeOfDay.DAY,
      healedHeroes
    };
  }

  /**
   * Natural Mage Spell-Point Regeneration (+1 SP per tick during day/dusk/dawn).
   */
  processSpellPointRegen() {
    const spAmount = this.rules.spellPointRegenPerTick;
    if (spAmount <= 0 || !this.party || this.party.length === 0) return;

    const mageClasses = ['Conjurer', 'Magician', 'Sorcerer', 'Wizard'];
    let anyRegened = false;

    this.party.forEach(hero => {
      if (hero && mageClasses.includes(hero.class)) {
        const maxSp = hero.maxSp || (hero.level ? hero.level * 14 : 20);
        if (hero.sp !== undefined && hero.sp < maxSp) {
          hero.sp = Math.min(maxSp, hero.sp + spAmount);
          anyRegened = true;
        }
      }
    });

    return anyRegened;
  }

  /**
   * Formats remaining time nicely for HUD/Grimoire display: e.g. "☀️ DAY (02:15)"
   */
  getFormattedStatus() {
    const mins = Math.floor(this.phaseRemainingSeconds / 60);
    const secs = Math.floor(this.phaseRemainingSeconds % 60).toString().padStart(2, '0');
    const icon = this.isNight ? '🌙' : this.isDusk ? '🌆' : '☀️';
    const statusNote = this.isNight ? 'Services Closed' : 'Services Open';
    return `${icon} ${this.rules.name.toUpperCase()} (${mins}:${secs}) • ${statusNote}`;
  }
}
