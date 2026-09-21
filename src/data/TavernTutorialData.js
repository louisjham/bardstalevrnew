// TavernTutorialData.js - Authentic 1985 Bard's Tale Introduction & Mechanics Guides
// Comprehensive dialogue scripts spoken by the tavern patrons and the Bard.

export const TAVERN_TUTORIAL_PATRONS = {
  wizard: {
    id: 'wizard',
    name: 'Elf Wizard',
    title: 'Arcane Lore & Spell Progression',
    sprite: '/assets/sprites/bt1_08.png',
    greeting: 'Greetings, seeker of arcane knowledge! Let me illuminate the paths of magic in Skara Brae.',
    pages: [
      {
        heading: '🏛️ Leveling & The Review Board',
        text: 'To advance in power, you must bring earned experience (XP) to the Review Board in Skara Brae. There you gain levels, increase maximum Hit Points, and gain access to new spell levels for a training fee.'
      },
      {
        heading: '☀️ Spell Points (SP) & Sunlight',
        text: 'Spellcasting consumes Spell Points (SP). During the day, standing in the open sunlight on the city streets will slowly restore SP. At night or when in a hurry, visit Roscoe\'s Energy Emporium to recharge rapidly for gold.'
      },
      {
        heading: '🔮 The 4 Orders of Magic Users',
        text: 'Magic has 4 progressive disciplines: Conjurers command physical healing & flame; Magicians manipulate defense & starfire; Sorcerers weave illusions & mind warstrikes; and Wizards pierce planar rifts to summon dragons & demons!'
      }
    ]
  },

  paladin: {
    id: 'paladin',
    name: 'Human Paladin',
    title: 'Combat Tactics, Armor Class & Temples',
    sprite: '/assets/sprites/bt1_02.png',
    greeting: 'Hail, warrior of the light! Steel your resolve and learn how to survive the perils of battle.',
    pages: [
      {
        heading: '⚔️ Armor Class & Hit Rolls',
        text: 'Combat is decided by d20 attack rolls against Armor Class (AC). In Skara Brae, LOWER AC is better! An unarmored novice starts at AC 10; master plate armor and shields drive AC down into negative numbers to -10 (LOVER).'
      },
      {
        heading: '🛡️ Front & Back Rank Formation',
        text: 'Your 6-hero party is divided into two ranks: slots 1 to 3 form the Front Row (engaging in melee strikes and receiving attacks); slots 4 to 6 are in the Back Row (safe to cast spells, play tunes, and fire arrows).'
      },
      {
        heading: '⛪ Afflictions & Temple Revival',
        text: 'Enemies inflict deadly conditions: Poison, Paralysis, Insanity, or Petrifying Stone! If heroes fall, bring their remains to the Temple of Divine Light or Temple of Tarjan where priests can cure and resurrect them for gold.'
      }
    ]
  },

  dwarf: {
    id: 'dwarf',
    name: 'Dwarf Warrior',
    title: 'Weapons, Armory & Chest Traps',
    sprite: '/assets/sprites/bt1_01.png',
    greeting: 'Aye! Sturdy dwarven steel is what keeps your head on your shoulders. Listen closely, lad!',
    pages: [
      {
        heading: '🛡️ Garth\'s Weapons & Armory',
        text: 'Upon stepping out of the tavern, visit Garth\'s Shoppe! Equip broadswords, battleaxes, iron plate armor, helms, and gauntlets to bolster your defenses before venturing into danger.'
      },
      {
        heading: '📦 Dungeon Chests & Lethal Traps',
        text: 'Defeated monsters often drop treasure chests filled with gold and magical items. But beware! Chests are rigged with nasty traps: Poison Needles, Acid Squirts, Crossbow Darts, and explosive Mage Blasters.'
      },
      {
        heading: '🗝️ Trap Disarming & Magic Loot',
        text: 'Always have a nimble Rogue or Hunter inspect and disarm chest mechanisms before opening them. And look for magical enchanted weapons like Vorpal Plades and Frost Swords!'
      }
    ]
  },

  hobbit: {
    id: 'hobbit',
    name: 'Hobbit Rogue',
    title: 'Races, Classes & Level-Up Bonuses',
    sprite: '/assets/sprites/bt1_03.png',
    greeting: 'Psst! Over here! Want to know the secret to building an unstoppable adventuring company?',
    pages: [
      {
        heading: '🧝 The 7 Races of the Realm',
        text: 'Characters hail from 7 races: Humans (balanced all-rounders), Elves (high IQ & magic), Dwarves & Half-Orcs (brute strength & stamina), Hobbits (agile rogues with high luck), Half-Elves, and Gnomes (magical knack).'
      },
      {
        heading: '🏹 The 8 Hero Classes',
        text: 'Build your party from 8 base roles: Warriors, Paladins, Monks (lethal unarmed), Hunters (critical instant kills), Rogues (trap disarming), Bards (song buffs), and Conjurers or Magicians.'
      },
      {
        heading: '📈 Stat Growth & Extra Attacks',
        text: 'Upon leveling up, heroes roll additional HP (d10 for fighters, d4 for mages), gain attribute boosts, and fighters gain extra melee attacks every 4 levels (2 attacks at level 4, 3 at level 8, 4 at level 12)!'
      }
    ]
  },

  bard: {
    id: 'bard',
    name: 'The Scarlet Bard',
    title: 'Bard Songs & Vocal Replenishment',
    sprite: '/assets/sprites/bt1_04.png',
    greeting: 'Welcome, travelers, to the Scarlet Bard Tavern! Let my songs inspire your brave journey.',
    pages: [
      {
        heading: '🎵 The 6 Magical Bard Songs',
        text: 'A Bard equipped with an instrument can perform 6 enchanting melodies: Falkentyne\'s Fury (furious melee damage), The Seeker\'s Ballad (illumination & trap detection), and Wayland\'s Watch (soothes foes to sleep).'
      },
      {
        heading: '🛡️ Harmonic Protection & Healing',
        text: 'Badh\'r Kilnfest radiates soothing warmth to heal party HP over time; The Traveller\'s Tune harmonizes defenses to lower AC; and Sir Robin\'s Tune confuses enemies to turn against each other in chaos.'
      },
      {
        heading: '🍺 Restoring the Bard\'s Voice',
        text: 'Singing tires the vocal cords — you can perform one song per level before needing a drink. Gulping a tankard of ale at the tavern or ordering from the barkeep instantly restores your singing voice to full strength!'
      }
    ]
  }
};
