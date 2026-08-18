// GameLoop.js - Complete 5-Location State Machine
// Validates state transitions and manages the party lifecycle.

export const GameState = {
  RETRO_ROOM: 'RETRO_ROOM',               // 1980s C64 Desk & Floppy Disk Load
  TAVERN_INTRO: 'TAVERN_INTRO',           // Skara Brae Tavern & Bard Performance Title Screen
  GARTHS_SHOP: 'GARTHS_SHOP',             // Garth's Weapons & Wonders (Party Assembly & Gear)
  SKARA_BRAE_STREETS: 'SKARA_BRAE_STREETS', // 3D First-Person City & Dungeon Exploration
  COMBAT_ZONE: 'COMBAT_ZONE'              // Dedicated 3D Spatial Battle Arena
};

// Valid state transitions
const VALID_TRANSITIONS = {
  [GameState.RETRO_ROOM]: [GameState.TAVERN_INTRO],
  [GameState.TAVERN_INTRO]: [GameState.GARTHS_SHOP, GameState.SKARA_BRAE_STREETS],
  [GameState.GARTHS_SHOP]: [GameState.TAVERN_INTRO, GameState.COMBAT_ZONE, GameState.SKARA_BRAE_STREETS],
  [GameState.SKARA_BRAE_STREETS]: [GameState.TAVERN_INTRO, GameState.GARTHS_SHOP, GameState.COMBAT_ZONE],
  [GameState.COMBAT_ZONE]: [GameState.TAVERN_INTRO, GameState.SKARA_BRAE_STREETS]
};

export class GameLoop {
  constructor(onStateChange) {
    this.currentState = GameState.RETRO_ROOM;
    this.onStateChange = onStateChange;
    this.party = [];
  }

  setState(newState, data = null) {
    // Validate that the new state is a known GameState
    if (!Object.values(GameState).includes(newState)) {
      console.warn(`[GameLoop] Invalid state: "${newState}". Ignoring.`);
      return;
    }

    // Validate the transition is allowed (warn but don't block for flexibility)
    const validTargets = VALID_TRANSITIONS[this.currentState];
    if (validTargets && !validTargets.includes(newState)) {
      console.warn(`[GameLoop] Unusual transition: ${this.currentState} -> ${newState}. Proceeding anyway.`);
    }

    // Warn if entering combat without a party
    if (newState === GameState.COMBAT_ZONE && this.party.length === 0) {
      console.warn('[GameLoop] Entering combat without a party! Things may break.');
    }

    console.log(`[GameLoop] State transition: ${this.currentState} -> ${newState}`);
    this.currentState = newState;
    if (this.onStateChange) {
      this.onStateChange(newState, data);
    }
  }

  setParty(party) {
    this.party = party;
    console.log(`[GameLoop] Active party set: ${party.length} members.`);
  }

  /**
   * Get the average level of the current party.
   * Used by GameDirector for encounter scaling.
   * @returns {number}
   */
  getAveragePartyLevel() {
    if (this.party.length === 0) return 1;
    const totalLevel = this.party.reduce((sum, m) => sum + (m.level || 1), 0);
    return Math.max(1, Math.floor(totalLevel / this.party.length));
  }
}
