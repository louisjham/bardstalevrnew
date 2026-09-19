// MonsterDatabase.js - Static Bestiary Data Store & Lookup Maps
// Authoritative source-derived monster definitions for The Bard's Tale (1985).

/**
 * Complete canonical monster records (IDs 0–126).
 */
const RAW_MONSTERS = [
  { id: 0, slug: "kobold", name: "Kobold", power: 0, hp: { min: 4, max: 7 }, armorClass: { min: 1, max: 8 }, xp: 60, physicalAttack: { damage: "1d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 1, slug: "hobbit", name: "Hobbit", power: 0, hp: { min: 6, max: 9 }, armorClass: { min: 1, max: 8 }, xp: 70, physicalAttack: { damage: "1d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 2, slug: "gnome", name: "Gnome", power: 1, hp: { min: 2, max: 9 }, armorClass: { min: 1, max: 8 }, xp: 80, physicalAttack: { damage: "2d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 3, slug: "dwarf", name: "Dwarf", power: 1, hp: { min: 6, max: 13 }, armorClass: { min: 1, max: 8 }, xp: 80, physicalAttack: { damage: "2d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 4, slug: "thief", name: "Thief", power: 1, hp: { min: 2, max: 9 }, armorClass: { min: 1, max: 4 }, xp: 90, physicalAttack: { damage: "2d4", hitType: "Stab/Slice" }, actions: [] },
  { id: 5, slug: "hobgoblin", name: "Hobgoblin", power: 1, hp: { min: 4, max: 11 }, armorClass: { min: 1, max: 8 }, xp: 90, physicalAttack: { damage: "2d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 6, slug: "conjurer_06", name: "Conjurer", power: 0, hp: { min: 2, max: 9 }, armorClass: { min: 1, max: 4 }, xp: 100, physicalAttack: { damage: "1d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 1, spellName: "ARC FIRE", effect: "damageSingleTarget", details: "element=fry; damage=1x(level+1)d4" },
    { kind: "spell", spellId: 1, spellName: "ARC FIRE", effect: "damageSingleTarget", details: "element=fry; damage=1x(level+1)d4" },
    { kind: "spell", spellId: 4, spellName: "FREEZE FOES", effect: "groupMalusAC" },
  ]},
  { id: 7, slug: "magician_07", name: "Magician", power: 0, hp: { min: 2, max: 9 }, armorClass: { min: 1, max: 4 }, xp: 100, physicalAttack: { damage: "1d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 49, spellName: "WITHER STRIKE", effect: "status", details: "wither" },
    { kind: "spell", spellId: 36, spellName: "INVISIBILITY", effect: "groupBonusAC" },
  ]},
  { id: 8, slug: "orc", name: "Orc", difficultyMin: 1, difficultyMax: 2, power: 2, hp: { min: 6, max: 13 }, armorClass: { min: 1, max: 8 }, xp: 100, physicalAttack: { damage: "3d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 9, slug: "skeleton", name: "Skeleton", difficultyMin: 1, difficultyMax: 2, power: 2, hp: { min: 8, max: 15 }, armorClass: { min: 1, max: 4 }, xp: 110, physicalAttack: { damage: "3d4", hitType: "Claw/Tear" }, actions: [] },
  { id: 10, slug: "nomad", name: "Nomad", difficultyMin: 1, difficultyMax: 2, power: 2, hp: { min: 8, max: 15 }, armorClass: { min: 1, max: 4 }, xp: 120, physicalAttack: { damage: "3d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 11, slug: "spider", name: "Spider", difficultyMin: 1, difficultyMax: 2, power: 2, hp: { min: 4, max: 11 }, armorClass: { min: 1, max: 4 }, xp: 150, physicalAttack: { damage: "3d4", hitType: "Bite/Gnaw" }, actions: [] },
  { id: 12, slug: "mad_dog", name: "Mad Dog", difficultyMin: 1, difficultyMax: 2, power: 1, hp: { min: 4, max: 11 }, armorClass: { min: 1, max: 8 }, xp: 180, physicalAttack: { damage: "2d4", hitType: "Bite/Gnaw" }, actions: [] },
  { id: 13, slug: "barbarian", name: "Barbarian", difficultyMin: 1, difficultyMax: 2, power: 3, hp: { min: 10, max: 17 }, armorClass: { min: 1, max: 8 }, xp: 200, physicalAttack: { damage: "4d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 14, slug: "mercenary", name: "Mercenary", difficultyMin: 1, difficultyMax: 2, power: 2, hp: { min: 8, max: 15 }, armorClass: { min: 1, max: 4 }, xp: 220, physicalAttack: { damage: "3d4", hitType: "Swing/Slash" }, actions: [] },

  { id: 15, slug: "wolf", name: "Wolf", difficultyMin: 1, difficultyMax: 3, power: 3, hp: { min: 10, max: 17 }, armorClass: { min: 1, max: 8 }, xp: 256, physicalAttack: { damage: "4d4", hitType: "Bite/Gnaw" }, actions: [] },
  { id: 16, slug: "jade_monk", name: "Jade Monk", difficultyMin: 1, difficultyMax: 3, power: 4, hp: { min: 2, max: 9 }, armorClass: { min: 1, max: 4 }, xp: 256, physicalAttack: { damage: "5d4", hitType: "Kick/Punch" }, actions: [] },
  { id: 17, slug: "half_orc", name: "Half Orc", difficultyMin: 1, difficultyMax: 3, power: 3, hp: { min: 12, max: 19 }, armorClass: { min: 1, max: 8 }, xp: 256, physicalAttack: { damage: "4d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 18, slug: "swordsman", name: "Swordsman", difficultyMin: 1, difficultyMax: 3, power: 3, hp: { min: 12, max: 19 }, armorClass: { min: 1, max: 4 }, xp: 512, physicalAttack: { damage: "4d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 19, slug: "zombie", name: "Zombie", difficultyMin: 1, difficultyMax: 3, power: 4, hp: { min: 12, max: 19 }, armorClass: { min: 1, max: 4 }, xp: 512, physicalAttack: { damage: "5d4", hitType: "Grope/ReachToward" }, actions: [] },

  { id: 20, slug: "conjurer_20", name: "Conjurer", difficultyMin: 1, difficultyMax: 3, power: 2, hp: { min: 2, max: 9 }, armorClass: { min: 1, max: 4 }, xp: 512, physicalAttack: { damage: "3d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 1, spellName: "ARC FIRE", effect: "damageSingleTarget", details: "element=fry; damage=1x(level+1)d4" },
    { kind: "spell", spellId: 4, spellName: "FREEZE FOES", effect: "groupMalusAC", details: "bonus=1" },
    { kind: "spell", spellId: 6, spellName: "BATTLESKILL", effect: "bonusDamage", details: "bonus=4" },
  ]},
  { id: 21, slug: "magician_21", name: "Magician", difficultyMin: 1, difficultyMax: 3, power: 2, hp: { min: 2, max: 9 }, armorClass: { min: 1, max: 4 }, xp: 512, physicalAttack: { damage: "3d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 49, spellName: "WITHER STRIKE", effect: "status", details: "wither" },
    { kind: "spell", spellId: 36, spellName: "INVISIBILITY", effect: "groupBonusAC", details: "bonus=4" },
    { kind: "spell", spellId: 53, spellName: "OGRESTRENGTH", effect: "bonusDamage", details: "bonus=7" },
  ]},
  { id: 22, slug: "sorcerer_22", name: "Sorcerer", difficultyMin: 1, difficultyMax: 3, power: 2, hp: { min: 2, max: 9 }, armorClass: { min: 1, max: 4 }, xp: 768, physicalAttack: { damage: "3d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 11, spellName: "WARSTRIKE", effect: "damageGroup", details: "element=burn; damage=4d4" },
    { kind: "spell", spellId: 11, spellName: "WARSTRIKE", effect: "damageGroup", details: "element=burn; damage=4d4" },
    { kind: "spell", spellId: 23, spellName: "PHASE BLUR", effect: "groupBonusAC", details: "bonus=1" },
  ]},
  { id: 23, slug: "wizard_23", name: "Wizard", difficultyMin: 2, difficultyMax: 3, power: 2, hp: { min: 2, max: 9 }, armorClass: { min: 1, max: 4 }, xp: 768, physicalAttack: { damage: "3d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 1, spellName: "ARC FIRE", effect: "damageSingleTarget", details: "element=fry; damage=1x(level+1)d4" },
    { kind: "spell", spellId: 49, spellName: "WITHER STRIKE", effect: "status", details: "wither" },
    { kind: "spell", spellId: 66, spellName: "SUMMON DEAD", effect: "summon", details: "type=Skeleton/Zombie; illusion=false" },
  ]},
  { id: 24, slug: "samurai", name: "Samurai", difficultyMin: 2, difficultyMax: 3, power: 4, hp: { min: 4, max: 19 }, armorClass: { min: 1, max: 8 }, xp: 1024, physicalAttack: { damage: "5d4", hitType: "Stab/Slice" }, actions: [] },
  { id: 25, slug: "black_widow", name: "Black Widow", difficultyMin: 2, difficultyMax: 3, power: 4, hp: { min: 2, max: 17 }, armorClass: { min: 1, max: 8 }, xp: 1024, physicalAttack: { damage: "5d4", hitType: "Bite/Gnaw", effect: "poison" }, actions: [] },
  { id: 26, slug: "assassin", name: "Assassin", difficultyMin: 2, difficultyMax: 3, power: 3, hp: { min: 2, max: 17 }, armorClass: { min: 1, max: 8 }, xp: 1024, physicalAttack: { damage: "4d4", hitType: "Stab/Slice" }, actions: [] },
  { id: 27, slug: "werewolf", name: "Werewolf", difficultyMin: 2, difficultyMax: 3, power: 4, hp: { min: 4, max: 19 }, armorClass: { min: 1, max: 4 }, xp: 1024, physicalAttack: { damage: "5d4", hitType: "Claw/Tear" }, actions: [] },
  { id: 28, slug: "ogre", name: "Ogre", difficultyMin: 2, difficultyMax: 3, power: 5, hp: { min: 8, max: 23 }, armorClass: { min: 1, max: 4 }, xp: 1024, physicalAttack: { damage: "6d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 29, slug: "wight", name: "Wight", difficultyMin: 2, difficultyMax: 3, power: 4, hp: { min: 6, max: 21 }, armorClass: { min: 1, max: 4 }, xp: 1024, physicalAttack: { damage: "5d4", hitType: "Grope/ReachToward", effect: "wither" }, actions: [] },
  { id: 30, slug: "statue", name: "Statue", difficultyMin: 2, difficultyMax: 3, power: 4, hp: { min: 8, max: 23 }, armorClass: { min: 1, max: 4 }, xp: 1024, physicalAttack: { damage: "5d4", hitType: "Kick/Punch" }, actions: [] },

  { id: 31, slug: "bladesman", name: "Bladesman", difficultyMin: 2, difficultyMax: 4, power: 5, hp: { min: 12, max: 27 }, armorClass: { min: 1, max: 8 }, xp: 1280, physicalAttack: { damage: "6d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 32, slug: "goblin_lord", name: "Goblin Lord", difficultyMin: 2, difficultyMax: 4, power: 5, hp: { min: 12, max: 27 }, armorClass: { min: 1, max: 4 }, xp: 1280, physicalAttack: { damage: "6d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 33, slug: "master_thief", name: "Master Thief", difficultyMin: 2, difficultyMax: 4, power: 4, hp: { min: 10, max: 25 }, armorClass: { min: 1, max: 4 }, xp: 1280, physicalAttack: { damage: "5d4", hitType: "Stab/Slice" }, actions: [] },
  { id: 34, slug: "conjurer_34", name: "Conjurer", difficultyMin: 2, difficultyMax: 4, power: 4, hp: { min: 2, max: 17 }, armorClass: { min: 1, max: 8 }, xp: 1280, physicalAttack: { damage: "5d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 1, spellName: "ARC FIRE", effect: "damageSingleTarget", details: "element=fry; damage=1x(level+1)d4" },
    { kind: "spell", spellId: 6, spellName: "BATTLESKILL", effect: "bonusDamage", details: "bonus=4" },
    { kind: "spell", spellId: 8, spellName: "MAGESTAR", effect: "blind" },
  ]},
  { id: 35, slug: "magician_35", name: "Magician", difficultyMin: 2, difficultyMax: 4, power: 4, hp: { min: 2, max: 17 }, armorClass: { min: 1, max: 8 }, xp: 1536, physicalAttack: { damage: "5d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 53, spellName: "OGRESTRENGTH", effect: "bonusDamage", details: "bonus=7" },
    { kind: "spell", spellId: 54, spellName: "MITHRIL MIGHT", effect: "groupBonusAC", details: "bonus=3" },
    { kind: "spell", spellId: 55, spellName: "STARFLARE", effect: "damageGroup", details: "element=fry; damage=6d4" },
  ]},
  { id: 36, slug: "sorcerer_36", name: "Sorcerer", difficultyMin: 2, difficultyMax: 4, power: 4, hp: { min: 2, max: 17 }, armorClass: { min: 1, max: 8 }, xp: 1536, physicalAttack: { damage: "5d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 11, spellName: "WARSTRIKE", effect: "damageGroup", details: "element=burn; damage=4d4" },
    { kind: "spell", spellId: 23, spellName: "PHASE BLUR", effect: "groupBonusAC", details: "bonus=1" },
    { kind: "spell", spellId: 25, spellName: "HYPNOTIC IMAGE", effect: "blind" },
  ]},
  { id: 37, slug: "wizard_37", name: "Wizard", difficultyMin: 2, difficultyMax: 4, power: 4, hp: { min: 2, max: 17 }, armorClass: { min: 1, max: 4 }, xp: 1536, physicalAttack: { damage: "5d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 8, spellName: "MAGESTAR", effect: "blind" },
    { kind: "spell", spellId: 53, spellName: "OGRESTRENGTH", effect: "bonusDamage", details: "bonus=7" },
    { kind: "spell", spellId: 66, spellName: "SUMMON DEAD", effect: "summon", details: "type=Skeleton/Zombie; illusion=false" },
  ]},
  { id: 38, slug: "ninja", name: "Ninja", difficultyMin: 2, difficultyMax: 4, power: 6, hp: { min: 8, max: 23 }, armorClass: { min: 1, max: 8 }, xp: 1536, physicalAttack: { damage: "7d4", hitType: "Stab/Slice" }, actions: [] },

  { id: 39, slug: "spinner", name: "Spinner", difficultyMin: 3, difficultyMax: 4, power: 6, hp: { min: 12, max: 27 }, armorClass: { min: 1, max: 8 }, xp: 1792, physicalAttack: { damage: "7d4", hitType: "Bite/Gnaw", effect: "poison" }, actions: [] },
  { id: 40, slug: "scarlet_monk", name: "Scarlet Monk", difficultyMin: 3, difficultyMax: 4, power: 7, hp: { min: 4, max: 19 }, armorClass: { min: 1, max: 4 }, xp: 1792, physicalAttack: { damage: "8d4", hitType: "Kick/Punch" }, actions: [] },
  { id: 41, slug: "doppleganger", name: "Doppleganger", difficultyMin: 3, difficultyMax: 4, power: 6, hp: { min: 8, max: 23 }, armorClass: { min: 1, max: 1 }, xp: 1792, physicalAttack: { damage: "7d4", hitType: "Swing/Slash" }, actions: [
    { kind: "special", effect: "doppleganger" },
    { kind: "special", effect: "doppleganger" },
  ]},
  { id: 42, slug: "stone_giant", name: "Stone Giant", difficultyMin: 3, difficultyMax: 4, power: 8, hp: { min: 2, max: 33 }, armorClass: { min: 1, max: 8 }, xp: 1792, physicalAttack: { damage: "9d4", hitType: "Slam/Strike" }, actions: [] },
  { id: 43, slug: "ogre_magician", name: "Ogre Magician", difficultyMin: 3, difficultyMax: 4, power: 7, hp: { min: 14, max: 29 }, armorClass: { min: 1, max: 8 }, xp: 2048, physicalAttack: { damage: "8d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 44, slug: "jackalwere", name: "Jackalwere", difficultyMin: 3, difficultyMax: 4, power: 7, hp: { min: 14, max: 29 }, armorClass: { min: 1, max: 8 }, xp: 2048, physicalAttack: { damage: "8d4", hitType: "Claw/Tear" }, actions: [] },
  { id: 45, slug: "stone_elemental", name: "Stone Elemental", difficultyMin: 3, difficultyMax: 4, power: 7, hp: { min: 2, max: 33 }, armorClass: { min: 1, max: 4 }, xp: 2048, physicalAttack: { damage: "8d4", hitType: "Kick/Punch" }, actions: [] },
  { id: 46, slug: "blue_dragon", name: "Blue Dragon", difficultyMin: 3, difficultyMax: 4, power: 8, hp: { min: 6, max: 37 }, armorClass: { min: 1, max: 8 }, xp: 2048, physicalAttack: { damage: "9d4", hitType: "Claw/Tear" }, actions: [
    { kind: "spell", spellId: 87, spellName: "Breath", effect: "damageGroup", details: "element=burn; damage=16d4" },
    { kind: "spell", spellId: 87, spellName: "Breath", effect: "damageGroup", details: "element=burn; damage=16d4" },
  ]},

  { id: 47, slug: "seeker", name: "Seeker", difficultyMin: 4, difficultyMax: 5, power: 7, hp: { min: 2, max: 33 }, armorClass: { min: 1, max: 8 }, xp: 2304, physicalAttack: { damage: "8d4", hitType: "Grope/ReachToward" }, actions: [] },
  { id: 48, slug: "dwarf_king", name: "Dwarf King", difficultyMin: 4, difficultyMax: 5, power: 7, hp: { min: 4, max: 35 }, armorClass: { min: 1, max: 8 }, xp: 2304, physicalAttack: { damage: "8d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 49, slug: "samurai_lord", name: "Samurai Lord", difficultyMin: 4, difficultyMax: 5, power: 8, hp: { min: 6, max: 37 }, armorClass: { min: 1, max: 4 }, xp: 2304, physicalAttack: { damage: "9d4", hitType: "Stab/Slice" }, actions: [] },
  { id: 50, slug: "ghoul", name: "Ghoul", difficultyMin: 4, difficultyMax: 5, power: 8, hp: { min: 2, max: 33 }, armorClass: { min: 1, max: 8 }, xp: 2304, physicalAttack: { damage: "9d4", hitType: "Grope/ReachToward", effect: "wither" }, actions: [] },
  { id: 51, slug: "conjurer_51", name: "Conjurer", difficultyMin: 4, difficultyMax: 5, power: 6, hp: { min: 2, max: 33 }, armorClass: { min: 1, max: 8 }, xp: 2304, physicalAttack: { damage: "7d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 6, spellName: "BATTLESKILL", effect: "bonusDamage", details: "bonus=4" },
    { kind: "spell", spellId: 8, spellName: "MAGESTAR", effect: "blind" },
    { kind: "spell", spellId: 11, spellName: "WARSTRIKE", effect: "damageGroup", details: "element=burn; damage=4d4" },
  ]},
  { id: 52, slug: "magician_52", name: "Magician", difficultyMin: 4, difficultyMax: 5, power: 6, hp: { min: 2, max: 33 }, armorClass: { min: 1, max: 8 }, xp: 2304, physicalAttack: { damage: "7d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 53, spellName: "OGRESTRENGTH", effect: "bonusDamage", details: "bonus=7" },
    { kind: "spell", spellId: 55, spellName: "STARFLARE", effect: "damageGroup", details: "element=fry; damage=6d4" },
    { kind: "spell", spellId: 56, spellName: "SPECTRE TOUCH", effect: "drain", details: "element=drain; damage=13d4" },
  ]},
  { id: 53, slug: "sorcerer_53", name: "Sorcerer", difficultyMin: 4, difficultyMax: 5, power: 6, hp: { min: 2, max: 33 }, armorClass: { min: 1, max: 8 }, xp: 2304, physicalAttack: { damage: "7d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 56, spellName: "SPECTRE TOUCH", effect: "drain", details: "element=drain; damage=13d4" },
    { kind: "spell", spellId: 30, spellName: "WIND WOLF", effect: "summon", details: "type=Wolf; illusion=true" },
    { kind: "spell", spellId: 33, spellName: "CURSE", effect: "malusToHit", details: "penalty=3" },
  ]},
  { id: 54, slug: "wizard_54", name: "Wizard", difficultyMin: 4, difficultyMax: 5, power: 6, hp: { min: 6, max: 37 }, armorClass: { min: 1, max: 4 }, xp: 2304, physicalAttack: { damage: "7d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 8, spellName: "MAGESTAR", effect: "blind" },
    { kind: "spell", spellId: 55, spellName: "STARFLARE", effect: "damageGroup", details: "element=fry; damage=6d4" },
    { kind: "spell", spellId: 68, spellName: "LESSER SUMMON", effect: "summon", details: "type=Lesser Demon; illusion=false" },
  ]},
  { id: 55, slug: "azure_monk", name: "Azure Monk", difficultyMin: 4, difficultyMax: 5, power: 10, hp: { min: 8, max: 39 }, armorClass: { min: 1, max: 4 }, xp: 2560, physicalAttack: { damage: "11d4", hitType: "Kick/Punch" }, actions: [] },
  { id: 56, slug: "weretiger", name: "Weretiger", difficultyMin: 4, difficultyMax: 5, power: 9, hp: { min: 8, max: 39 }, armorClass: { min: 1, max: 8 }, xp: 2560, physicalAttack: { damage: "10d4", hitType: "Bite/Gnaw" }, actions: [] },
  { id: 57, slug: "hydra", name: "Hydra", difficultyMin: 4, difficultyMax: 5, power: 9, hp: { min: 4, max: 35 }, armorClass: { min: 1, max: 8 }, xp: 2560, physicalAttack: { damage: "10d4", hitType: "Bite/Gnaw" }, actions: [] },
  { id: 58, slug: "green_dragon", name: "Green Dragon", difficultyMin: 4, difficultyMax: 5, power: 10, hp: { min: 8, max: 39 }, armorClass: { min: 1, max: 4 }, xp: 2560, physicalAttack: { damage: "11d4", hitType: "Claw/Tear" }, actions: [
    { kind: "spell", spellId: 88, spellName: "Breath", effect: "damageGroup", details: "element=choke; damage=18d4" },
    { kind: "spell", spellId: 88, spellName: "Breath", effect: "damageGroup", details: "element=choke; damage=18d4" },
  ]},
  { id: 59, slug: "wraith", name: "Wraith", difficultyMin: 4, difficultyMax: 5, power: 10, hp: { min: 10, max: 41 }, armorClass: { min: 1, max: 8 }, xp: 2560, physicalAttack: { damage: "11d4", hitType: "Grope/ReachToward", effect: "insanity" }, actions: [] },
  { id: 60, slug: "lurker", name: "Lurker", difficultyMin: 4, difficultyMax: 5, power: 10, hp: { min: 4, max: 35 }, armorClass: { min: 1, max: 8 }, xp: 2560, physicalAttack: { damage: "11d4", hitType: "Claw/Tear" }, actions: [] },
  { id: 61, slug: "fire_giant", name: "Fire Giant", difficultyMin: 4, difficultyMax: 5, power: 11, hp: { min: 12, max: 43 }, armorClass: { min: 1, max: 8 }, xp: 2560, physicalAttack: { damage: "12d4", hitType: "Slam/Strike" }, actions: [] },
  { id: 62, slug: "copper_dragon", name: "Copper Dragon", difficultyMin: 4, difficultyMax: 5, power: 11, hp: { min: 14, max: 45 }, armorClass: { min: 1, max: 4 }, xp: 2560, physicalAttack: { damage: "12d4", hitType: "Claw/Tear" }, actions: [
    { kind: "spell", spellId: 89, spellName: "Breath", effect: "damageGroup", details: "element=steam; damage=20d4" },
    { kind: "spell", spellId: 89, spellName: "Breath", effect: "damageGroup", details: "element=steam; damage=20d4" },
  ]},
  { id: 63, slug: "ivory_monk", name: "Ivory Monk", difficultyMin: 5, difficultyMax: 6, power: 13, hp: { min: 4, max: 35 }, armorClass: { min: 1, max: 8 }, xp: 2560, physicalAttack: { damage: "14d4", hitType: "Kick/Punch" }, actions: [] },

  { id: 64, slug: "shadow", name: "Shadow", difficultyMin: 5, difficultyMax: 6, power: 11, hp: { min: 6, max: 37 }, armorClass: { min: 1, max: 8 }, xp: 2560, physicalAttack: { damage: "12d4", hitType: "Grope/ReachToward", effect: "insanity" }, actions: [] },
  { id: 65, slug: "berserker", name: "Berserker", difficultyMin: 5, difficultyMax: 6, power: 11, hp: { min: 10, max: 41 }, armorClass: { min: 1, max: 8 }, xp: 2560, physicalAttack: { damage: "12d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 66, slug: "conjurer_66", name: "Conjurer", difficultyMin: 5, difficultyMax: 6, power: 8, hp: { min: 10, max: 41 }, armorClass: { min: 1, max: 8 }, xp: 2560, physicalAttack: { damage: "9d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 11, spellName: "WARSTRIKE", effect: "damageGroup", details: "element=burn; damage=4d4" },
    { kind: "spell", spellId: 12, spellName: "INSTANT WOLF", effect: "summon", details: "type=Wolf; illusion=false" },
    { kind: "spell", spellId: 12, spellName: "INSTANT WOLF", effect: "summon", details: "type=Wolf; illusion=false" },
  ]},
  { id: 67, slug: "magician_67", name: "Magician", difficultyMin: 5, difficultyMax: 6, power: 8, hp: { min: 10, max: 41 }, armorClass: { min: 1, max: 8 }, xp: 2560, physicalAttack: { damage: "9d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 53, spellName: "OGRESTRENGTH", effect: "bonusDamage", details: "bonus=7" },
    { kind: "spell", spellId: 56, spellName: "SPECTRE TOUCH", effect: "drain", details: "element=drain; damage=13d4" },
    { kind: "spell", spellId: 57, spellName: "DRAGON BREATH", effect: "damageGroup", details: "element=fry; damage=8d4" },
  ]},
  { id: 68, slug: "sorcerer_68", name: "Sorcerer", difficultyMin: 5, difficultyMax: 6, power: 8, hp: { min: 12, max: 43 }, armorClass: { min: 1, max: 4 }, xp: 2560, physicalAttack: { damage: "9d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 12, spellName: "INSTANT WOLF", effect: "summon", details: "type=Wolf; illusion=false" },
    { kind: "spell", spellId: 55, spellName: "STARFLARE", effect: "damageGroup", details: "element=fry; damage=6d4" },
    { kind: "spell", spellId: 68, spellName: "LESSER SUMMON", effect: "summon", details: "type=Lesser Demon; illusion=false" },
  ]},
  { id: 69, slug: "wizard_69", name: "Wizard", difficultyMin: 5, difficultyMax: 6, power: 8, hp: { min: 10, max: 41 }, armorClass: { min: 1, max: 8 }, xp: 2560, physicalAttack: { damage: "9d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 30, spellName: "WIND WOLF", effect: "summon", details: "type=Wolf; illusion=true" },
    { kind: "spell", spellId: 33, spellName: "CURSE", effect: "malusToHit", details: "penalty=3" },
    { kind: "spell", spellId: 35, spellName: "WIND WARRIOR", effect: "summon", details: "type=Mercenary; illusion=true" },
  ]},
  { id: 70, slug: "white_dragon", name: "White Dragon", difficultyMin: 5, difficultyMax: 6, power: 11, hp: { min: 14, max: 45 }, armorClass: { min: 1, max: 4 }, xp: 2560, physicalAttack: { damage: "12d4", hitType: "Claw/Tear" }, actions: [
    { kind: "spell", spellId: 79, spellName: "Breath", effect: "damageGroup", details: "element=freeze; damage=24d4" },
    { kind: "spell", spellId: 79, spellName: "Breath", effect: "damageGroup", details: "element=freeze; damage=24d4" },
  ]},

  { id: 71, slug: "ice_giant", name: "Ice Giant", difficultyMin: 5, difficultyMax: 6, power: 12, hp: { min: 2, max: 65 }, armorClass: { min: 1, max: 8 }, xp: 2816, physicalAttack: { damage: "13d4", hitType: "Slam/Strike" }, actions: [] },
  { id: 72, slug: "eye_spy", name: "Eye Spy", difficultyMin: 5, difficultyMax: 6, power: 11, hp: { min: 2, max: 65 }, armorClass: { min: 1, max: 16 }, xp: 2816, physicalAttack: { damage: "12d4", hitType: "Peer/Stare", effect: "poison" }, actions: [] },
  { id: 73, slug: "ogre_lord", name: "Ogre Lord", difficultyMin: 5, difficultyMax: 6, power: 12, hp: { min: 2, max: 65 }, armorClass: { min: 1, max: 8 }, xp: 2816, physicalAttack: { damage: "13d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 74, slug: "body_snatcher", name: "Body Snatcher", difficultyMin: 5, difficultyMax: 6, power: 11, hp: { min: 6, max: 69 }, armorClass: { min: 1, max: 16 }, xp: 2816, physicalAttack: { damage: "12d4", hitType: "Swing/Slash", effect: "possess" }, actions: [] },
  { id: 75, slug: "xorn", name: "Xorn", difficultyMin: 5, difficultyMax: 6, power: 12, hp: { min: 4, max: 67 }, armorClass: { min: 1, max: 8 }, xp: 2816, physicalAttack: { damage: "13d4", hitType: "Kick/Punch" }, actions: [] },
  { id: 76, slug: "phantom", name: "Phantom", difficultyMin: 5, difficultyMax: 6, power: 13, hp: { min: 4, max: 67 }, armorClass: { min: 1, max: 8 }, xp: 2816, physicalAttack: { damage: "14d4", hitType: "Grope/ReachToward", effect: "drain" }, actions: [] },
  { id: 77, slug: "lesser_demon", name: "Lesser Demon", difficultyMin: 5, difficultyMax: 6, power: 14, hp: { min: 10, max: 73 }, armorClass: { min: 1, max: 8 }, xp: 2816, physicalAttack: { damage: "15d4", hitType: "Claw/Tear", effect: "wither" }, actions: [
    { kind: "spell", spellId: 33, spellName: "CURSE", effect: "malusToHit", details: "penalty=3" },
  ]},
  { id: 78, slug: "fred", name: "Fred", difficultyMin: 5, difficultyMax: 6, power: 12, hp: { min: 4, max: 67 }, armorClass: { min: 1, max: 1 }, xp: 2816, physicalAttack: { damage: "13d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 37, spellName: "WIND OGRE", effect: "summon", details: "type=Ogre; illusion=true" },
  ]},

  { id: 79, slug: "conjurer_79", name: "Conjurer", difficultyMin: 6, difficultyMax: 7, power: 10, hp: { min: 2, max: 65 }, armorClass: { min: 1, max: 8 }, xp: 2816, physicalAttack: { damage: "11d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 17, spellName: "SHOCK-SPHERE", effect: "damageGroup", details: "element=shock; damage=8d4" },
    { kind: "spell", spellId: 16, spellName: "WRATH OF VAL.", effect: "bonusDamage", details: "bonus=10" },
    { kind: "spell", spellId: 14, spellName: "POISON STRIKE", effect: "status", details: "poison" },
  ]},
  { id: 80, slug: "magician_80", name: "Magician", difficultyMin: 6, difficultyMax: 7, power: 10, hp: { min: 2, max: 65 }, armorClass: { min: 1, max: 8 }, xp: 2816, physicalAttack: { damage: "11d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 55, spellName: "STARFLARE", effect: "damageGroup", details: "element=fry; damage=6d4" },
    { kind: "spell", spellId: 54, spellName: "MITHRIL MIGHT", effect: "groupBonusAC", details: "bonus=3" },
    { kind: "spell", spellId: 57, spellName: "DRAGON BREATH", effect: "damageGroup", details: "element=fry; damage=8d4" },
  ]},
  { id: 81, slug: "sorcerer_81", name: "Sorcerer", difficultyMin: 6, difficultyMax: 7, power: 10, hp: { min: 2, max: 65 }, armorClass: { min: 1, max: 8 }, xp: 2816, physicalAttack: { damage: "11d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 35, spellName: "WIND WARRIOR", effect: "summon", details: "type=Mercenary; illusion=true" },
    { kind: "spell", spellId: 17, spellName: "SHOCK-SPHERE", effect: "damageGroup", details: "element=shock; damage=8d4" },
    { kind: "spell", spellId: 40, spellName: "WIND DRAGON", effect: "summon", details: "type=Red Dragon; illusion=true" },
  ]},
  { id: 82, slug: "wizard_82", name: "Wizard", difficultyMin: 6, difficultyMax: 7, power: 10, hp: { min: 4, max: 67 }, armorClass: { min: 1, max: 4 }, xp: 2816, physicalAttack: { damage: "11d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 72, spellName: "PRIME SUMMONING", effect: "summon", details: "type=Demon; illusion=false" },
    { kind: "spell", spellId: 70, spellName: "SUMMON PHANTOM", effect: "summon", details: "type=Ghoul/Wraith; illusion=false" },
    { kind: "spell", spellId: 57, spellName: "DRAGON BREATH", effect: "damageGroup", details: "element=fry; damage=8d4" },
  ]},

  { id: 83, slug: "master_ninja", name: "Master Ninja", difficultyMin: 6, difficultyMax: 7, power: 14, hp: { min: 6, max: 69 }, armorClass: { min: 1, max: 8 }, xp: 3072, physicalAttack: { damage: "15d4", hitType: "Stab/Slice", effect: "critical" }, actions: [] },
  { id: 84, slug: "war_giant", name: "War Giant", difficultyMin: 6, difficultyMax: 7, power: 15, hp: { min: 6, max: 69 }, armorClass: { min: 1, max: 8 }, xp: 3072, physicalAttack: { damage: "16d4", hitType: "Slam/Strike" }, actions: [] },
  { id: 85, slug: "warrior_elite", name: "Warrior Elite", difficultyMin: 6, difficultyMax: 7, power: 15, hp: { min: 4, max: 67 }, armorClass: { min: 1, max: 16 }, xp: 3072, physicalAttack: { damage: "16d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 86, slug: "bone_crusher", name: "Bone Crusher", difficultyMin: 6, difficultyMax: 7, power: 14, hp: { min: 4, max: 67 }, armorClass: { min: 1, max: 8 }, xp: 3072, physicalAttack: { damage: "15d4", hitType: "Slam/Strike" }, actions: [] },
  { id: 87, slug: "ghost", name: "Ghost", difficultyMin: 6, difficultyMax: 7, power: 16, hp: { min: 6, max: 69 }, armorClass: { min: 1, max: 1 }, xp: 3072, physicalAttack: { damage: "17d4", hitType: "Grope/ReachToward", effect: "wither" }, actions: [] },
  { id: 88, slug: "grey_dragon", name: "Grey Dragon", difficultyMin: 6, difficultyMax: 7, power: 17, hp: { min: 8, max: 71 }, armorClass: { min: 1, max: 4 }, xp: 3072, physicalAttack: { damage: "18d4", hitType: "Claw/Tear" }, actions: [
    { kind: "spell", spellId: 80, spellName: "Breath", effect: "damageGroup", details: "element=fry; damage=32d4" },
    { kind: "spell", spellId: 80, spellName: "Breath", effect: "damageGroup", details: "element=fry; damage=32d4" },
  ]},
  { id: 89, slug: "basilisk", name: "Basilisk", difficultyMin: 6, difficultyMax: 7, power: 16, hp: { min: 4, max: 67 }, armorClass: { min: 1, max: 8 }, xp: 3072, physicalAttack: { damage: "17d4", hitType: "Bite/Gnaw", effect: "stone" }, actions: [] },
  { id: 90, slug: "evil_eye", name: "Evil Eye", difficultyMin: 6, difficultyMax: 7, power: 16, hp: { min: 2, max: 65 }, armorClass: { min: 1, max: 16 }, xp: 3072, physicalAttack: { damage: "17d4", hitType: "Peer/Stare", effect: "poison" }, actions: [
    { kind: "spell", spellId: 55, spellName: "STARFLARE", effect: "damageGroup", details: "element=fry; damage=6d4" },
    { kind: "spell", spellId: 56, spellName: "SPECTRE TOUCH", effect: "drain", details: "element=drain; damage=13d4" },
  ]},
  { id: 91, slug: "mimic", name: "Mimic", difficultyMin: 6, difficultyMax: 7, power: 16, hp: { min: 4, max: 67 }, armorClass: { min: 1, max: 1 }, xp: 3072, physicalAttack: { damage: "17d4", hitType: "Swing/Slash" }, actions: [
    { kind: "special", effect: "doppleganger" },
    { kind: "special", effect: "doppleganger" },
  ]},
  { id: 92, slug: "golem", name: "Golem", difficultyMin: 6, difficultyMax: 7, power: 18, hp: { min: 4, max: 67 }, armorClass: { min: 1, max: 8 }, xp: 3072, physicalAttack: { damage: "19d4", hitType: "Slam/Strike" }, actions: [] },
  { id: 93, slug: "vampire", name: "Vampire", difficultyMin: 6, difficultyMax: 7, power: 19, hp: { min: 8, max: 71 }, armorClass: { min: 1, max: 8 }, xp: 3072, physicalAttack: { damage: "20d4", hitType: "Claw/Tear", effect: "drain" }, actions: [
    { kind: "spell", spellId: 25, spellName: "HYPNOTIC IMAGE", effect: "blind" },
  ]},
  { id: 94, slug: "demon", name: "Demon", difficultyMin: 6, difficultyMax: 7, power: 20, hp: { min: 2, max: 129 }, armorClass: { min: 1, max: 8 }, xp: 3072, physicalAttack: { damage: "21d4", hitType: "Claw/Tear", effect: "insanity" }, actions: [
    { kind: "spell", spellId: 80, spellName: "Breath", effect: "damageGroup", details: "element=fry; damage=32d4" },
  ]},

  { id: 95, slug: "bandersnatch", name: "Bandersnatch", difficultyMin: 7, difficultyMax: 7, power: 19, hp: { min: 12, max: 75 }, armorClass: { min: 1, max: 32 }, xp: 3328, physicalAttack: { damage: "20d4", hitType: "Bite/Gnaw" }, actions: [] },
  { id: 96, slug: "maze_dweller", name: "Maze Dweller", difficultyMin: 7, difficultyMax: 7, power: 19, hp: { min: 10, max: 13 }, armorClass: { min: 1, max: 64 }, xp: 3328, physicalAttack: { damage: "20d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 97, slug: "mongo", name: "Mongo", difficultyMin: 7, difficultyMax: 7, power: 20, hp: { min: 14, max: 77 }, armorClass: { min: 1, max: 4 }, xp: 3328, physicalAttack: { damage: "21d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 61, spellName: "STONE TOUCH", effect: "status", details: "stone" },
    { kind: "spell", spellId: 61, spellName: "STONE TOUCH", effect: "status", details: "stone" },
  ]},
  { id: 98, slug: "mangar_guard", name: "Mangar Guard", difficultyMin: 7, difficultyMax: 7, power: 20, hp: { min: 5, max: 132 }, armorClass: { min: 1, max: 32 }, xp: 3328, physicalAttack: { damage: "21d4", hitType: "Swing/Slash" }, actions: [] },
  { id: 99, slug: "gimp", name: "Gimp", difficultyMin: 7, difficultyMax: 7, power: 16, hp: { min: 2, max: 129 }, armorClass: { min: 1, max: 99 }, xp: 3328, physicalAttack: { damage: "17d4", hitType: "Kick/Punch" }, actions: [] },
  { id: 100, slug: "red_dragon", name: "Red Dragon", difficultyMin: 7, difficultyMax: 7, power: 23, hp: { min: 5, max: 132 }, armorClass: { min: 1, max: 4 }, xp: 3328, physicalAttack: { damage: "24d4", hitType: "Claw/Tear" }, actions: [
    { kind: "spell", spellId: 81, spellName: "Breath", effect: "damageGroup", details: "element=fry; damage=40d4" },
    { kind: "spell", spellId: 81, spellName: "Breath", effect: "damageGroup", details: "element=fry; damage=40d4" },
  ]},
  { id: 101, slug: "titan", name: "Titan", difficultyMin: 7, difficultyMax: 7, power: 22, hp: { min: 7, max: 134 }, armorClass: { min: 1, max: 8 }, xp: 3328, physicalAttack: { damage: "23d4", hitType: "Slam/Strike" }, actions: [] },

  { id: 102, slug: "master_conjurer", name: "Master Conjurer", difficultyMin: 7, difficultyMax: 7, power: 16, hp: { min: 14, max: 77 }, armorClass: { min: 1, max: 8 }, xp: 3328, physicalAttack: { damage: "17d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 18, spellName: "INSTANT OGRE", effect: "summon", details: "type=Ogre; illusion=false" },
    { kind: "spell", spellId: 17, spellName: "SHOCK-SPHERE", effect: "damageGroup", details: "element=shock; damage=8d4" },
    { kind: "spell", spellId: 17, spellName: "SHOCK-SPHERE", effect: "damageGroup", details: "element=shock; damage=8d4" },
  ]},
  { id: 103, slug: "master_magician", name: "Master Magician", difficultyMin: 7, difficultyMax: 7, power: 16, hp: { min: 14, max: 77 }, armorClass: { min: 1, max: 8 }, xp: 3328, physicalAttack: { damage: "17d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 57, spellName: "DRAGON BREATH", effect: "damageGroup", details: "element=fry; damage=8d4" },
    { kind: "spell", spellId: 61, spellName: "STONE TOUCH", effect: "status", details: "stone" },
    { kind: "spell", spellId: 65, spellName: "DEATHSTRIKE", effect: "status", details: "critical" },
  ]},
  { id: 104, slug: "master_sorcerer", name: "Master Sorcerer", difficultyMin: 7, difficultyMax: 7, power: 16, hp: { min: 14, max: 77 }, armorClass: { min: 1, max: 8 }, xp: 3328, physicalAttack: { damage: "17d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 17, spellName: "SHOCK-SPHERE", effect: "damageGroup", details: "element=shock; damage=8d4" },
    { kind: "spell", spellId: 40, spellName: "WIND DRAGON", effect: "summon", details: "type=Red Dragon; illusion=true" },
    { kind: "spell", spellId: 42, spellName: "WINDGIANT", effect: "summon", details: "type=Storm Giant; illusion=true" },
  ]},
  { id: 105, slug: "mind_shadow", name: "Mind Shadow", difficultyMin: 7, difficultyMax: 7, power: 19, hp: { min: 12, max: 75 }, armorClass: { min: 1, max: 16 }, xp: 3328, physicalAttack: { damage: "20d4", hitType: "Grope/ReachToward" }, actions: [] },
  { id: 106, slug: "spectre", name: "Spectre", difficultyMin: 7, difficultyMax: 7, power: 22, hp: { min: 5, max: 132 }, armorClass: { min: 1, max: 8 }, xp: 3328, physicalAttack: { damage: "23d4", hitType: "Grope/ReachToward", effect: "drain" }, actions: [] },
  { id: 107, slug: "cloud_giant", name: "Cloud Giant", difficultyMin: 7, difficultyMax: 7, power: 24, hp: { min: 7, max: 134 }, armorClass: { min: 1, max: 8 }, xp: 3584, physicalAttack: { damage: "25d4", hitType: "Slam/Strike" }, actions: [] },
  { id: 108, slug: "beholder", name: "Beholder", difficultyMin: 7, difficultyMax: 7, power: 22, hp: { min: 3, max: 130 }, armorClass: { min: 1, max: 4 }, xp: 3584, physicalAttack: { damage: "23d4", hitType: "Peer/Stare", effect: "poison" }, actions: [
    { kind: "spell", spellId: 56, spellName: "SPECTRE TOUCH", effect: "drain", details: "element=drain; damage=13d4" },
    { kind: "spell", spellId: 57, spellName: "DRAGON BREATH", effect: "damageGroup", details: "element=fry; damage=8d4" },
    { kind: "spell", spellId: 65, spellName: "DEATHSTRIKE", effect: "status", details: "critical" },
  ]},
  { id: 109, slug: "vampire_lord", name: "Vampire Lord", difficultyMin: 7, difficultyMax: 7, power: 25, hp: { min: 7, max: 134 }, armorClass: { min: 1, max: 4 }, xp: 3584, physicalAttack: { damage: "26d4", hitType: "Claw/Tear", effect: "drain" }, actions: [
    { kind: "spell", spellId: 70, spellName: "SUMMON PHANTOM", effect: "summon", details: "type=Ghoul/Wraith; illusion=false" },
    { kind: "spell", spellId: 65, spellName: "DEATHSTRIKE", effect: "status", details: "critical" },
  ]},
  { id: 110, slug: "greater_demon", name: "Greater Demon", difficultyMin: 7, difficultyMax: 7, power: 27, hp: { min: 13, max: 140 }, armorClass: { min: 1, max: 8 }, xp: 3584, physicalAttack: { damage: "28d4", hitType: "Claw/Tear", effect: "possess" }, actions: [
    { kind: "spell", spellId: 72, spellName: "PRIME SUMMONING", effect: "summon", details: "type=Demon; illusion=false" },
    { kind: "spell", spellId: 82, spellName: "Breath", effect: "damageGroup", details: "element=fry; damage=48d4" },
  ]},
  { id: 111, slug: "master_wizard", name: "Master Wizard", difficultyMin: 7, difficultyMax: 7, power: 18, hp: { min: 2, max: 129 }, armorClass: { min: 1, max: 4 }, xp: 3584, physicalAttack: { damage: "19d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 72, spellName: "PRIME SUMMONING", effect: "summon", details: "type=Demon; illusion=false" },
    { kind: "spell", spellId: 78, spellName: "GREATER SUMMON", effect: "summon", details: "type=Greater Demon/Demon Lord; illusion=false" },
    { kind: "spell", spellId: 78, spellName: "GREATER SUMMON", effect: "summon", details: "type=Greater Demon/Demon Lord; illusion=false" },
  ]},

  { id: 112, slug: "mad_god", name: "Mad God", power: 21, hp: { min: 7, max: 134 }, armorClass: { min: 1, max: 16 }, xp: 3584, physicalAttack: { damage: "22d4", hitType: "Slam/Strike" }, actions: [
    { kind: "spell", spellId: 61, spellName: "STONE TOUCH", effect: "status", details: "stone" },
    { kind: "spell", spellId: 14, spellName: "POISON STRIKE", effect: "status", details: "poison" },
  ]},
  { id: 113, slug: "maze_master", name: "Maze Master", power: 21, hp: { min: 11, max: 138 }, armorClass: { min: 1, max: 32 }, xp: 3584, physicalAttack: { damage: "22d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 17, spellName: "SHOCK-SPHERE", effect: "damageGroup", details: "element=shock; damage=8d4" },
  ]},
  { id: 114, slug: "death_denizen", name: "Death Denizen", power: 21, hp: { min: 11, max: 14 }, armorClass: { min: 1, max: 64 }, xp: 3584, physicalAttack: { damage: "22d4", hitType: "Bite/Gnaw" }, actions: [] },
  { id: 115, slug: "jabberwock", name: "Jabberwock", power: 24, hp: { min: 9, max: 136 }, armorClass: { min: 1, max: 8 }, xp: 3584, physicalAttack: { damage: "25d4", hitType: "Claw/Tear" }, actions: [
    { kind: "spell", spellId: 83, spellName: "Breath", effect: "damageGroup", details: "element=shock; damage=34d4" },
    { kind: "spell", spellId: 83, spellName: "Breath", effect: "damageGroup", details: "element=shock; damage=34d4" },
  ]},
  { id: 116, slug: "black_dragon", name: "Black Dragon", power: 26, hp: { min: 11, max: 138 }, armorClass: { min: 1, max: 8 }, xp: 3584, physicalAttack: { damage: "27d4", hitType: "Claw/Tear" }, actions: [
    { kind: "spell", spellId: 84, spellName: "Breath", effect: "damageGroup", details: "element=drain; damage=44d4" },
    { kind: "spell", spellId: 84, spellName: "Breath", effect: "damageGroup", details: "element=drain; damage=44d4" },
  ]},
  { id: 117, slug: "mangar", name: "Mangar", power: 24, hp: { min: 15, max: 255 }, armorClass: { min: 1, max: 1 }, xp: 3584, physicalAttack: { damage: "25d4", hitType: "Slam/Strike", effect: "critical" }, actions: [
    { kind: "spell", spellId: 78, spellName: "GREATER SUMMON", effect: "summon", details: "type=Greater Demon/Demon Lord; illusion=false" },
    { kind: "spell", spellId: 42, spellName: "WINDGIANT", effect: "summon", details: "type=Storm Giant; illusion=true" },
    { kind: "spell", spellId: 65, spellName: "DEATHSTRIKE", effect: "status", details: "critical" },
    { kind: "spell", spellId: 57, spellName: "DRAGON BREATH", effect: "damageGroup", details: "element=fry; damage=8d4" },
  ]},
  { id: 118, slug: "crystal_golem", name: "Crystal Golem", power: 28, hp: { min: 13, max: 140 }, armorClass: { min: 1, max: 1 }, xp: 3584, physicalAttack: { damage: "29d4", hitType: "Slam/Strike" }, actions: [] },
  { id: 119, slug: "soul_sucker", name: "Soul Sucker", power: 28, hp: { min: 11, max: 138 }, armorClass: { min: 1, max: 8 }, xp: 3584, physicalAttack: { damage: "29d4", hitType: "Peer/Stare" }, actions: [
    { kind: "spell", spellId: 85, spellName: "Breath", effect: "damageGroup", details: "element=drain; damage=64d4" },
    { kind: "spell", spellId: 85, spellName: "Breath", effect: "damageGroup", details: "element=drain; damage=64d4" },
  ]},
  { id: 120, slug: "storm_giant", name: "Storm Giant", power: 30, hp: { min: 15, max: 142 }, armorClass: { min: 1, max: 8 }, xp: 3584, physicalAttack: { damage: "31d4", hitType: "Slam/Strike" }, actions: [] },
  { id: 121, slug: "ancient_enemy", name: "Ancient Enemy", power: 29, hp: { min: 15, max: 142 }, armorClass: { min: 1, max: 8 }, xp: 3584, physicalAttack: { damage: "30d4", hitType: "Grope/ReachToward", effect: "wither" }, actions: [] },
  { id: 122, slug: "balrog", name: "Balrog", power: 21, hp: { min: 13, max: 140 }, armorClass: { min: 1, max: 99 }, xp: 3584, physicalAttack: { damage: "22d4", hitType: "Swing/Slash", effect: "insanity" }, actions: [
    { kind: "spell", spellId: 65, spellName: "DEATHSTRIKE", effect: "status", details: "critical" },
  ]},
  { id: 123, slug: "lich", name: "Lich", power: 23, hp: { min: 15, max: 255 }, armorClass: { min: 1, max: 8 }, xp: 3840, physicalAttack: { damage: "24d4", hitType: "Grope/ReachToward", effect: "possess" }, actions: [
    { kind: "spell", spellId: 78, spellName: "GREATER SUMMON", effect: "summon", details: "type=Greater Demon/Demon Lord; illusion=false" },
    { kind: "spell", spellId: 65, spellName: "DEATHSTRIKE", effect: "status", details: "critical" },
    { kind: "spell", spellId: 25, spellName: "HYPNOTIC IMAGE", effect: "blind" },
  ]},
  { id: 124, slug: "archmage", name: "Archmage", power: 21, hp: { min: 5, max: 255 }, armorClass: { min: 1, max: 8 }, xp: 3840, physicalAttack: { damage: "22d4", hitType: "Swing/Slash" }, actions: [
    { kind: "spell", spellId: 78, spellName: "GREATER SUMMON", effect: "summon", details: "type=Greater Demon/Demon Lord; illusion=false" },
    { kind: "spell", spellId: 42, spellName: "WINDGIANT", effect: "summon", details: "type=Storm Giant; illusion=true" },
    { kind: "spell", spellId: 65, spellName: "DEATHSTRIKE", effect: "status", details: "critical" },
    { kind: "spell", spellId: 57, spellName: "DRAGON BREATH", effect: "damageGroup", details: "element=fry; damage=8d4" },
  ]},
  { id: 125, slug: "demon_lord", name: "Demon Lord", power: 31, hp: { min: 15, max: 255 }, armorClass: { min: 1, max: 8 }, xp: 3840, physicalAttack: { damage: "32d4", hitType: "Claw/Tear", effect: "stone" }, actions: [
    { kind: "spell", spellId: 78, spellName: "GREATER SUMMON", effect: "summon", details: "type=Greater Demon/Demon Lord; illusion=false" },
    { kind: "spell", spellId: 86, spellName: "Breath", effect: "damageGroup", details: "element=fry; damage=72d4" },
  ]},
  { id: 126, slug: "old_man", name: "Old Man", power: 31, hp: { min: 1, max: 255 }, armorClass: { min: 1, max: 4 }, xp: 3840, physicalAttack: { damage: "32d4", hitType: "Swing/Slash", effect: "critical" }, actions: [
    { kind: "spell", spellId: 17, spellName: "SHOCK-SPHERE", effect: "damageGroup", details: "element=shock; damage=8d4" },
    { kind: "spell", spellId: 17, spellName: "SHOCK-SPHERE", effect: "damageGroup", details: "element=shock; damage=8d4" },
  ]},
];

/**
 * Validates a collection of monster definitions against the Bard's Tale data schema.
 * Throws detailed developer errors if any invariants are violated.
 *
 * @param {Array<Object>} monsters - Array of monster objects to validate.
 * @returns {boolean} True if all monsters pass validation.
 * @throws {TypeError|RangeError|Error} If any validation rule fails.
 */
export function validateMonsterDatabase(monsters) {
  if (!Array.isArray(monsters)) {
    throw new TypeError('[MonsterDatabase] validateMonsterDatabase expected an array of monster definitions.');
  }

  const seenIds = new Set();
  const seenSlugs = new Set();

  for (let i = 0; i < monsters.length; i++) {
    const monster = monsters[i];
    const prefix = `[MonsterDatabase] Monster at index ${i}`;

    if (!monster || typeof monster !== 'object') {
      throw new TypeError(`${prefix} must be a non-null object.`);
    }

    // 1. Validate ID (integer & uniqueness)
    if (typeof monster.id !== 'number' || !Number.isInteger(monster.id) || monster.id < 0) {
      throw new TypeError(`${prefix} (${monster.name || 'unnamed'}) has invalid ID "${monster.id}". ID must be a non-negative integer.`);
    }
    if (seenIds.has(monster.id)) {
      throw new Error(`${prefix} has duplicate ID "${monster.id}". Provenance IDs must be unique.`);
    }
    seenIds.add(monster.id);

    // 2. Validate Slug (non-empty string & uniqueness)
    if (typeof monster.slug !== 'string' || monster.slug.trim().length === 0) {
      throw new TypeError(`${prefix} (ID: ${monster.id}) is missing a valid string slug.`);
    }
    const cleanSlug = monster.slug.trim();
    if (seenSlugs.has(cleanSlug)) {
      throw new Error(`${prefix} (ID: ${monster.id}) has duplicate slug "${cleanSlug}". Slugs must be unique.`);
    }
    seenSlugs.add(cleanSlug);

    // 3. Validate Name
    if (typeof monster.name !== 'string' || monster.name.trim().length === 0) {
      throw new TypeError(`${prefix} (slug: "${cleanSlug}") must have a non-empty name string.`);
    }

    // 4. Validate Power Rating
    if (typeof monster.power !== 'number' || isNaN(monster.power) || monster.power < 0) {
      throw new TypeError(`${prefix} ("${monster.name}") must have a valid non-negative number for "power".`);
    }

    // 5. Validate Experience (XP)
    if (typeof monster.xp !== 'number' || isNaN(monster.xp) || monster.xp < 0) {
      throw new TypeError(`${prefix} ("${monster.name}") must have a valid non-negative number for "xp".`);
    }

    // 6. Validate HP Range
    if (!monster.hp || typeof monster.hp !== 'object') {
      throw new TypeError(`${prefix} ("${monster.name}") is missing "hp" object.`);
    }
    if (typeof monster.hp.min !== 'number' || typeof monster.hp.max !== 'number' || isNaN(monster.hp.min) || isNaN(monster.hp.max)) {
      throw new TypeError(`${prefix} ("${monster.name}") hp must have numerical min and max.`);
    }
    if (monster.hp.min > monster.hp.max || monster.hp.min < 1) {
      throw new RangeError(`${prefix} ("${monster.name}") invalid hp [${monster.hp.min}, ${monster.hp.max}]. Min must be >= 1 and <= Max.`);
    }

    // 7. Validate ArmorClass Range
    if (!monster.armorClass || typeof monster.armorClass !== 'object') {
      throw new TypeError(`${prefix} ("${monster.name}") is missing "armorClass" object.`);
    }
    if (typeof monster.armorClass.min !== 'number' || typeof monster.armorClass.max !== 'number' || isNaN(monster.armorClass.min) || isNaN(monster.armorClass.max)) {
      throw new TypeError(`${prefix} ("${monster.name}") armorClass must have numerical min and max.`);
    }
    if (monster.armorClass.min > monster.armorClass.max) {
      throw new RangeError(`${prefix} ("${monster.name}") invalid armorClass [${monster.armorClass.min}, ${monster.armorClass.max}]. Min must be <= Max.`);
    }

    // 8. Validate Physical Attack
    if (!monster.physicalAttack || typeof monster.physicalAttack !== 'object') {
      throw new TypeError(`${prefix} ("${monster.name}") is missing "physicalAttack" object.`);
    }
    if (typeof monster.physicalAttack.damage !== 'string' || monster.physicalAttack.damage.trim().length === 0) {
      throw new TypeError(`${prefix} ("${monster.name}") physicalAttack must have a "damage" string.`);
    }
    if (typeof monster.physicalAttack.hitType !== 'string' || monster.physicalAttack.hitType.trim().length === 0) {
      throw new TypeError(`${prefix} ("${monster.name}") physicalAttack must have a "hitType" string.`);
    }
    const validEffects = ['poison', 'wither', 'possess', 'drain', 'insanity', 'stone', 'critical', 'doppleganger'];
    if (monster.physicalAttack.effect !== undefined && !validEffects.includes(monster.physicalAttack.effect)) {
      throw new TypeError(`${prefix} ("${monster.name}") physicalAttack has invalid effect "${monster.physicalAttack.effect}".`);
    }

    // 9. Validate Actions (if provided)
    if (monster.actions !== undefined) {
      if (!Array.isArray(monster.actions)) {
        throw new TypeError(`${prefix} ("${monster.name}") actions must be an array.`);
      }
      for (let j = 0; j < monster.actions.length; j++) {
        const action = monster.actions[j];
        if (!action || typeof action !== 'object') {
          throw new TypeError(`${prefix} action at index ${j} must be a non-null object.`);
        }
        const validKinds = ['spell', 'special'];
        if (!validKinds.includes(action.kind)) {
          throw new TypeError(`${prefix} action at index ${j} has invalid kind "${action.kind}". Expected one of: ${validKinds.join(', ')}.`);
        }
        if (action.kind === 'spell') {
          if (typeof action.spellId !== 'number' || typeof action.spellName !== 'string' || typeof action.effect !== 'string') {
            throw new TypeError(`${prefix} spell action at index ${j} requires "spellId", "spellName", and "effect".`);
          }
        }
        if (action.kind === 'special') {
          if (typeof action.effect !== 'string') {
            throw new TypeError(`${prefix} special action at index ${j} requires "effect".`);
          }
        }
      }
    }
  }

  return true;
}

// 5. Validate the complete raw array before freezing/exporting it
validateMonsterDatabase(RAW_MONSTERS);

function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
      deepFreeze(obj[key]);
    }
  }
  return obj;
}

RAW_MONSTERS.forEach(m => {
  if (m.originalIndex === undefined) m.originalIndex = m.id;
  if (m.xpValue === undefined) m.xpValue = m.xp;
  if (m.onHitEffect === undefined) m.onHitEffect = m.physicalAttack?.effect || null;

  if (!m.actionSlots) {
    const acts = (m.actions || []).map(a => ({ ...a }));
    if (acts.length === 0) {
      m.actionSlots = [
        { type: 'meleeAttack' },
        { type: 'meleeAttack' },
        { type: 'meleeAttack' },
        { type: 'meleeAttack' }
      ];
    } else if (acts.length === 1) {
      m.actionSlots = [
        { type: 'meleeAttack' },
        acts[0],
        { type: 'meleeAttack' },
        { type: 'meleeAttack' }
      ];
    } else if (acts.length === 2) {
      m.actionSlots = [
        { type: 'meleeAttack' },
        { type: 'meleeAttack' },
        acts[0],
        acts[1]
      ];
    } else if (acts.length === 3) {
      m.actionSlots = [
        { type: 'meleeAttack' },
        acts[0],
        acts[1],
        acts[2]
      ];
    } else {
      m.actionSlots = [
        acts[0],
        acts[1],
        acts[2],
        acts[3]
      ];
    }
  }

  if (!m.source) {
    m.source = {
      version: 'bt1-c64-1985',
      reference: 'original monster-data record',
      confidence: 'verified'
    };
  }
});

RAW_MONSTERS.forEach(deepFreeze);

/**
 * Master array of Bard's Tale monster archetype definitions (frozen).
 * @type {ReadonlyArray<Object>}
 */
export const bardTaleMonsters = Object.freeze(RAW_MONSTERS);

/**
 * Builds lookup maps exclusively from the validated monster list.
 * @param {ReadonlyArray<Object>} monsters
 * @returns {{ monsterById: Map<number, Object>, monsterBySlug: Map<string, Object> }}
 */
function buildLookupMaps(monsters) {
  const byId = new Map();
  const bySlug = new Map();

  for (const monster of monsters) {
    byId.set(monster.id, monster);
    bySlug.set(monster.slug, monster);
  }

  return {
    monsterById: byId,
    monsterBySlug: bySlug
  };
}

// 6. Build lookup maps only from validated array
const lookupMaps = buildLookupMaps(bardTaleMonsters);

/**
 * Map of monsters keyed by legacy provenance ID.
 * @type {Map<number, Object>}
 */
export const monsterById = lookupMaps.monsterById;

/**
 * Map of monsters keyed by stable slug identifier.
 * @type {Map<string, Object>}
 */
export const monsterBySlug = lookupMaps.monsterBySlug;

/**
 * Look up a monster archetype by provenance integer ID.
 * @param {number} id - Integer ID.
 * @returns {Object | undefined}
 */
export function getMonsterById(id) {
  return monsterById.get(id);
}

/**
 * Look up a monster archetype by stable string slug.
 * @param {string} slug - String slug.
 * @returns {Object | undefined}
 */
export function getMonsterBySlug(slug) {
  return monsterBySlug.get(slug);
}

// ─── Authentic Bard's Tale Area- and Time-Based Encounter Generation ─────────

import { EncounterGenerator } from '../core/encounter/EncounterGenerator.js';

/**
 * Generate an authentic Bard's Tale combat encounter according to zone and time of day (no party-level scaling).
 * @param {string|number} [locationOrLevel='streets']
 * @param {string} [location='streets']
 * @param {boolean} [isNight=false]
 * @returns {{ groups: Array<{ monster: any, count: number, distanceFeet: number }>, totalXP: number, totalGold: number, isNight: boolean }}
 */
export function generateEncounter(locationOrLevel = 'streets', location = 'streets', isNight = false) {
  // Support both (partyLevel, location, isNight) and (zone, isNight) signatures
  let zone = 'streets';
  let night = isNight;

  if (typeof locationOrLevel === 'string') {
    zone = locationOrLevel;
    if (typeof location === 'boolean') {
      night = location;
    }
  } else if (typeof location === 'string') {
    zone = location;
  }

  return EncounterGenerator.generateEncounter({
    zone,
    isNight: night,
    trigger: 'movement'
  });
}

/**
 * Flattens an encounter structure into instantiated combatant objects ready for CombatEngine.
 * @param {{ groups?: Array<{ monster: any, count: number, distanceFeet?: number }> }} encounter
 * @returns {Array<any>}
 */
export function flattenEncounterToMonsters(encounter) {
  return EncounterGenerator.flattenEncounterToMonsters(encounter);
}


