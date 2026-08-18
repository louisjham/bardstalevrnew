// BardSongs.js - All 6 Authentic Bard Songs from The Bard's Tale
// Each song has different effects in exploration vs combat mode.
// A Bard can play as many songs as his experience level before needing a tavern drink.
// Only one song can be active at a time.

export const BardSongs = [
  {
    id: 1,
    name: "Falkentyne's Fury",
    description: 'This tune increases the damage your party will do in combat, by driving them into a berserker rage.',
    explorationEffect: null,
    combatEffect: {
      type: 'partyBuff',
      stat: 'damage',
      bonus: 4,
      description: 'Party damage increased!'
    },
    // Lute note sequence for the synth
    notes: ['E3', 'G3', 'B3', 'E4', 'D4', 'B3', 'G3', 'E3'],
    tempo: 180
  },
  {
    id: 2,
    name: "The Seeker's Ballad",
    description: 'This song produces light when exploring, and during combat increases the party\'s chance of hitting.',
    explorationEffect: {
      type: 'light',
      radius: 3,
      description: 'A warm light emanates from the Bard\'s song.'
    },
    combatEffect: {
      type: 'partyBuff',
      stat: 'hit',
      bonus: 3,
      description: 'Party accuracy increased!'
    },
    notes: ['C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4', 'G3'],
    tempo: 160
  },
  {
    id: 3,
    name: "Wayland's Watch",
    description: 'This song soothes savage foes, making them do less damage in combat.',
    explorationEffect: null,
    combatEffect: {
      type: 'enemyDebuff',
      stat: 'damage',
      penalty: -4,
      description: 'Enemy damage reduced!'
    },
    notes: ['A3', 'C4', 'E4', 'A4', 'G4', 'E4', 'C4', 'A3'],
    tempo: 140
  },
  {
    id: 4,
    name: "Badh'r Kilnfest",
    description: 'An ancient Elven melody which heals the Bard while travelling, and the entire party during combat.',
    explorationEffect: {
      type: 'heal',
      target: 'bard',
      amount: 2, // HP per tick while exploring
      description: 'The melody soothes the Bard\'s wounds.'
    },
    combatEffect: {
      type: 'partyHeal',
      amount: 4, // HP healed per round
      description: 'Party wounds healed!'
    },
    notes: ['D4', 'F4', 'A4', 'D5', 'C5', 'A4', 'F4', 'D4'],
    tempo: 120
  },
  {
    id: 5,
    name: "The Traveller's Tune",
    description: 'This melody makes party members more dexterous and agile, and thus more difficult to hit.',
    explorationEffect: null,
    combatEffect: {
      type: 'partyBuff',
      stat: 'ac',
      bonus: -2, // Lower AC = better in classic BT
      description: 'Party AC improved!'
    },
    notes: ['G3', 'B3', 'D4', 'G4', 'F4', 'D4', 'B3', 'G3'],
    tempo: 170
  },
  {
    id: 6,
    name: 'Lucklaran',
    description: 'This song sets up a partial anti-magic field, giving party members increased protection against spells.',
    explorationEffect: null,
    combatEffect: {
      type: 'partyBuff',
      stat: 'magicResist',
      bonus: 25, // percentage resistance
      description: 'Anti-magic field active!'
    },
    notes: ['F3', 'A3', 'C4', 'F4', 'E4', 'C4', 'A3', 'F3'],
    tempo: 150
  }
];

/**
 * Get a Bard song by its 1-based index.
 * @param {number} songNumber - 1-6
 * @returns {object|undefined}
 */
export function getBardSong(songNumber) {
  return BardSongs[songNumber - 1];
}

/**
 * Get how many songs a Bard can play before needing a drink.
 * Equal to the Bard's experience level.
 * @param {number} experienceLevel
 * @returns {number}
 */
export function getMaxSongsBeforeDrink(experienceLevel) {
  return Math.max(1, experienceLevel);
}
