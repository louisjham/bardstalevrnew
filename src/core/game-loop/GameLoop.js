// GameLoop.js - Complete 5-Location State Machine
// Validates state transitions and manages the party lifecycle.
//
// ⚡ Performance note: This class is a pure state machine — it does NOT run a
// requestAnimationFrame loop and instantiates zero Three.js objects.
// All render-loop allocations (Vector3, Matrix4, etc.) live in the individual
// world modules (FullVRTavern, CombatArena, etc.) which pre-allocate their own
// scratch buffers.  No GC optimizations are needed here.

export const GameState = {
  // ── Current states ──────────────────────────────────────────────────────────
  INTRO_SCENE:         'INTRO_SCENE',          // Amiga-style animated VR intro + main menu
  ADVENTURERS_GUILD:   'ADVENTURERS_GUILD',    // Adventurers Guild (tavern environment repurposed)
  GARTHS_SHOP:         'GARTHS_SHOP',          // Garth's Weapons & Wonders (Party Assembly & Gear)
  SKARA_BRAE_STREETS:  'SKARA_BRAE_STREETS',   // 3D First-Person City & Dungeon Exploration
  COMBAT_ZONE:         'COMBAT_ZONE',           // Dedicated 3D Spatial Battle Arena

  // ── Legacy aliases — map old strings to new values ──────────────────────────
  /** @deprecated Use INTRO_SCENE */
  RETRO_ROOM:          'INTRO_SCENE',
  /** @deprecated Use ADVENTURERS_GUILD */
  TAVERN_INTRO:        'ADVENTURERS_GUILD',
};

// Valid state transitions
const VALID_TRANSITIONS = {
  [GameState.INTRO_SCENE]:        [GameState.ADVENTURERS_GUILD],
  [GameState.ADVENTURERS_GUILD]:  [GameState.GARTHS_SHOP, GameState.SKARA_BRAE_STREETS],
  [GameState.GARTHS_SHOP]:        [GameState.ADVENTURERS_GUILD, GameState.COMBAT_ZONE, GameState.SKARA_BRAE_STREETS],
  [GameState.SKARA_BRAE_STREETS]: [GameState.ADVENTURERS_GUILD, GameState.GARTHS_SHOP, GameState.COMBAT_ZONE],
  [GameState.COMBAT_ZONE]:        [GameState.ADVENTURERS_GUILD, GameState.SKARA_BRAE_STREETS]
};

export class GameLoop {
  constructor(onStateChange) {
    this.currentState = GameState.INTRO_SCENE;
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
