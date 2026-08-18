// SpellDatabase.js - Complete Bard's Tale Canonical Spell Compendium
// Canonical dataset of all 105 spells (Player Spells 0–78 + System/Special Spells 79–104).
// Preserves 100% backward-compatibility with existing combat engine, Grimoire UI, and character progression.

export const SpellSchool = {
  CONJURER: 'CONJURER',
  MAGICIAN: 'MAGICIAN',
  SORCERER: 'SORCERER',
  WIZARD: 'WIZARD'
};

const CLASS_TO_SCHOOL = {
  conjurer: SpellSchool.CONJURER,
  magician: SpellSchool.MAGICIAN,
  sorcerer: SpellSchool.SORCERER,
  wizard: SpellSchool.WIZARD
};

/**
 * Raw canonical dataset of all 105 Bard's Tale spells (0–104).
 */
const RAW_SPELLS = [
  // ─── CONJURER (IDs 0–21) ────────────────────────────────────────────────
  {
    id: 0, spellClass: "conjurer", level: 1, code: "MAFL", name: "Mage Flame", function: "Light", spellPoints: 2, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "range=3; duration=41-56",
    details: { range: 3, durationMin: 41, durationMax: 56, seeHidden: false },
    school: SpellSchool.CONJURER, spCost: 2, range: "view", duration: "medium", effectType: "light",
    description: "A small, mobile torch floats above the caster as he travels.",
    effect: { type: "light", radius: 3 }
  },
  {
    id: 1, spellClass: "conjurer", level: 1, code: "ARFI", name: "Arc Fire", function: "DamageSingleTarget", spellPoints: 3, target: "foe", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "element=fry; damage=1x(level+1)d4",
    details: { element: "fry", damage: "1x(level+1)d4", sourceDamage: "1x(level+1)d4" },
    school: SpellSchool.CONJURER, spCost: 3, range: "1foe", duration: "instant", effectType: "damage",
    description: "A fan of blue flames shoots from the caster's fingers.",
    effect: { type: "damage", diceCount: 1, diceSides: 4, perLevel: true }
  },
  {
    id: 2, spellClass: "conjurer", level: 1, code: "SOSH", name: "Sorcerer Shield", function: "SelfBonusAC", spellPoints: 3, target: "", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "bonus=1",
    details: { bonus: 1 },
    school: SpellSchool.CONJURER, spCost: 3, range: "self", duration: "combat", effectType: "buff",
    description: "An invisible shield of magic turns aside many blows.",
    effect: { type: "acBonus", value: -2, target: "self" }
  },
  {
    id: 3, spellClass: "conjurer", level: 1, code: "TRZP", name: "Trap Zap", function: "TrapZap", spellPoints: 2, target: "", inCombat: false, outOfCombat: true, param: null,
    sourceDetails: "",
    details: {},
    school: SpellSchool.CONJURER, spCost: 2, range: "30ft", duration: "instant", effectType: "utility",
    description: "Disarms any trap within 30 feet, including traps on chests.",
    effect: { type: "disarmTrap" }
  },
  {
    id: 4, spellClass: "conjurer", level: 2, code: "FRFO", name: "Freeze Foes", function: "GroupMalusAC", spellPoints: 3, target: "group", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "bonus=1",
    details: { bonus: 1 },
    school: SpellSchool.CONJURER, spCost: 3, range: "group", duration: "combat", effectType: "debuff",
    description: "Binds enemies with magical force, slowing them and making them easier to hit.",
    effect: { type: "debuff", stat: "ac", value: 2, target: "group" }
  },
  {
    id: 5, spellClass: "conjurer", level: 2, code: "MACO", name: "Kiel's Magic Compass", function: "Compass", spellPoints: 3, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "duration=41-56",
    details: { durationMin: 41, durationMax: 56 },
    school: SpellSchool.CONJURER, spCost: 3, range: "party", duration: "medium", effectType: "utility",
    description: "A compass of shimmering magelight reveals the direction the party faces.",
    effect: { type: "compass" }
  },
  {
    id: 6, spellClass: "conjurer", level: 2, code: "BASK", name: "Battleskill", function: "BonusDamage", spellPoints: 4, target: "member", inCombat: true, outOfCombat: false, param: 4,
    sourceDetails: "bonus=4",
    details: { bonus: 4 },
    school: SpellSchool.CONJURER, spCost: 4, range: "char", duration: "combat", effectType: "buff",
    description: "Increases a party member's skill with weapons, boosting accuracy and ferocity.",
    effect: { type: "hitBonus", value: 3, target: "char" }
  },
  {
    id: 7, spellClass: "conjurer", level: 2, code: "WOHL", name: "Word of Healing", function: "Heal", spellPoints: 4, target: "member", inCombat: true, outOfCombat: true, param: 1,
    sourceDetails: "heal=2d4",
    details: { heal: "2d4", damage: "2d4" },
    school: SpellSchool.CONJURER, spCost: 4, range: "char", duration: "instant", effectType: "heal",
    description: "Cures a party member of minor wounds, healing 2-8 hit points.",
    effect: { type: "heal", diceCount: 2, diceSides: 4 }
  },
  {
    id: 8, spellClass: "conjurer", level: 3, code: "MAST", name: "Arcyne's Magestar", function: "Blind", spellPoints: 5, target: "group", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "",
    details: {},
    school: SpellSchool.CONJURER, spCost: 5, range: "group", duration: "instant", effectType: "debuff",
    description: "A bright flare blinds a group of enemies, causing them to miss the next round.",
    effect: { type: "stun", rounds: 1, target: "group" }
  },
  {
    id: 9, spellClass: "conjurer", level: 3, code: "LERE", name: "Lesser Revelation", function: "Light", spellPoints: 5, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "range=4; duration=61-76; seeHidden=true",
    details: { range: 4, durationMin: 61, durationMax: 76, seeHidden: true },
    school: SpellSchool.CONJURER, spCost: 5, range: "view", duration: "long", effectType: "light",
    description: "An extended Mage Flame that also reveals secret doors.",
    effect: { type: "light", radius: 5, revealSecrets: true }
  },
  {
    id: 10, spellClass: "conjurer", level: 3, code: "LEVI", name: "Levitation", function: "Levitation", spellPoints: 4, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "duration=21-36",
    details: { durationMin: 21, durationMax: 36 },
    school: SpellSchool.CONJURER, spCost: 4, range: "party", duration: "short", effectType: "utility",
    description: "Partially negates gravity, allowing the party to float over traps or up through portals.",
    effect: { type: "levitate" }
  },
  {
    id: 11, spellClass: "conjurer", level: 3, code: "WAST", name: "Warstrike", function: "DamageGroup", spellPoints: 5, target: "group", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "element=burn; damage=4d4",
    details: { element: "burn", damage: "4d4" },
    school: SpellSchool.CONJURER, spCost: 5, range: "group", duration: "instant", effectType: "damage",
    description: "A spray of energy sizzles a group of opponents.",
    effect: { type: "damage", diceCount: 4, diceSides: 4, target: "group" }
  },
  {
    id: 12, spellClass: "conjurer", level: 4, code: "INWO", name: "Elik's Instant Wolf", function: "Summon", spellPoints: 6, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Wolf; isIllusion=false",
    details: { summonType: "Wolf", isIllusion: false },
    school: SpellSchool.CONJURER, spCost: 6, range: "special", duration: "combat", effectType: "summon",
    description: "Conjures a real wolf to join the party and fight in its defense.",
    effect: { type: "summon", creature: "Wolf", hp: 24, ac: 6, damage: 8 }
  },
  {
    id: 13, spellClass: "conjurer", level: 4, code: "FLRE", name: "Flesh Restore", function: "Heal", spellPoints: 6, target: "member", inCombat: true, outOfCombat: true, param: 1,
    sourceDetails: "heal=6d4; cures=poison|paralysis|insanity",
    details: { heal: "6d4", damage: "6d4", cures: ["poison", "paralysis", "insanity"] },
    school: SpellSchool.CONJURER, spCost: 6, range: "char", duration: "instant", effectType: "heal",
    description: "Restores 6-24 hit points and cures poisoning and insanity.",
    effect: { type: "heal", diceCount: 6, diceSides: 4, curesPoison: true, curesInsanity: true }
  },
  {
    id: 14, spellClass: "conjurer", level: 4, code: "POST", name: "Poison Strike", function: "Status", spellPoints: 6, target: "foe", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "status=poison",
    details: { status: "poison" },
    school: SpellSchool.CONJURER, spCost: 6, range: "1foe", duration: "instant", effectType: "debuff",
    description: "Hurls porcupine-sharp needles from the mage's finger, poisoning a monster.",
    effect: { type: "poison", target: "1foe" }
  },
  {
    id: 15, spellClass: "conjurer", level: 5, code: "GRRE", name: "Greater Revelation", function: "Light", spellPoints: 7, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "range=5; duration=81-96; seeHidden=true",
    details: { range: 5, durationMin: 81, durationMax: 96, seeHidden: true },
    school: SpellSchool.CONJURER, spCost: 7, range: "view", duration: "long", effectType: "light",
    description: "Like Lesser Revelation but illuminates a wider area.",
    effect: { type: "light", radius: 8, revealSecrets: true }
  },
  {
    id: 16, spellClass: "conjurer", level: 5, code: "WROV", name: "Wrath of Valhalla", function: "BonusDamage", spellPoints: 7, target: "member", inCombat: true, outOfCombat: false, param: 10,
    sourceDetails: "bonus=10",
    details: { bonus: 10 },
    school: SpellSchool.CONJURER, spCost: 7, range: "char", duration: "combat", effectType: "buff",
    description: "Makes a party member fight with the strength and accuracy of Norse heroes.",
    effect: { type: "multiBonus", hitBonus: 4, damageBonus: 8, target: "char" }
  },
  {
    id: 17, spellClass: "conjurer", level: 5, code: "SHSP", name: "Shock-Sphere", function: "DamageGroup", spellPoints: 7, target: "group", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "element=shock; damage=8d4",
    details: { element: "shock", damage: "8d4" },
    school: SpellSchool.CONJURER, spCost: 7, range: "group", duration: "instant", effectType: "damage",
    description: "A globe of intense electrical energy envelops a group of enemies.",
    effect: { type: "damage", diceCount: 8, diceSides: 4, target: "group" }
  },
  {
    id: 18, spellClass: "conjurer", level: 6, code: "INOG", name: "Elik's Instant Ogre", function: "Summon", spellPoints: 9, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Ogre; isIllusion=false",
    details: { summonType: "Ogre", isIllusion: false },
    school: SpellSchool.CONJURER, spCost: 9, range: "special", duration: "combat", effectType: "summon",
    description: "Conjures a real ogre to join the party.",
    effect: { type: "summon", creature: "Ogre", hp: 48, ac: 4, damage: 14 }
  },
  {
    id: 19, spellClass: "conjurer", level: 6, code: "MALE", name: "Major Levitation", function: "Levitation", spellPoints: 8, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "duration=infinite",
    details: { duration: "infinite" },
    school: SpellSchool.CONJURER, spCost: 8, range: "party", duration: "indefinite", effectType: "utility",
    description: "The party levitates until the spell is dispelled.",
    effect: { type: "levitate", indefinite: true }
  },
  {
    id: 20, spellClass: "conjurer", level: 7, code: "FLAN", name: "Flesh Anew", function: "Heal", spellPoints: 12, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "heal=6d4; cures=poison|paralysis|insanity",
    details: { heal: "6d4", damage: "6d4", cures: ["poison", "paralysis", "insanity"] },
    school: SpellSchool.CONJURER, spCost: 12, range: "party", duration: "instant", effectType: "heal",
    description: "Fully heals every member of the party like Flesh Restore.",
    effect: { type: "heal", diceCount: 6, diceSides: 4, curesPoison: true, curesInsanity: true, target: "party" }
  },
  {
    id: 21, spellClass: "conjurer", level: 7, code: "APAR", name: "Apport Arcane", function: "Teleport", spellPoints: 15, target: "", inCombat: false, outOfCombat: true, param: null,
    sourceDetails: "",
    details: {},
    school: SpellSchool.CONJURER, spCost: 15, range: "party", duration: "instant", effectType: "utility",
    description: "Teleport the party anywhere within a dungeon.",
    effect: { type: "teleport" }
  },

  // ─── SORCERER (IDs 22–43) ───────────────────────────────────────────────
  {
    id: 22, spellClass: "sorcerer", level: 1, code: "MIJA", name: "Mangar's Mind Jab", function: "DamageSingleTarget", spellPoints: 3, target: "foe", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "element=burn; damage=2x(level+1)d4",
    details: { element: "burn", damage: "2x(level+1)d4", sourceDamage: "2x(level+1)d4" },
    school: SpellSchool.SORCERER, spCost: 3, range: "1foe", duration: "instant", effectType: "damage",
    description: "A concentrated blast of psychic energy at one opponent.",
    effect: { type: "damage", diceCount: 2, diceSides: 4, perLevel: true }
  },
  {
    id: 23, spellClass: "sorcerer", level: 1, code: "PHBL", name: "Phase Blur", function: "GroupBonusAC", spellPoints: 2, target: "", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "bonus=1",
    details: { bonus: 1 },
    school: SpellSchool.SORCERER, spCost: 2, range: "party", duration: "combat", effectType: "buff",
    description: "The party seems to waver and blur, making them very difficult to strike.",
    effect: { type: "acBonus", value: -2, target: "party" }
  },
  {
    id: 24, spellClass: "sorcerer", level: 1, code: "LOTR", name: "Locate Traps", function: "Eye", spellPoints: 2, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "duration=21-36; detect=-T-",
    details: { durationMin: 21, durationMax: 36, detect: "-T-" },
    school: SpellSchool.SORCERER, spCost: 2, range: "30ft", duration: "short", effectType: "utility",
    description: "The spell caster can sense a trap within 30 feet.",
    effect: { type: "detectTraps" }
  },
  {
    id: 25, spellClass: "sorcerer", level: 1, code: "HYIM", name: "Hypnotic Image", function: "Blind", spellPoints: 3, target: "group", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "",
    details: {},
    school: SpellSchool.SORCERER, spCost: 3, range: "group", duration: "instant", effectType: "debuff",
    description: "Makes a group of enemies miss the following attack round.",
    effect: { type: "stun", rounds: 1, target: "group" }
  },
  {
    id: 26, spellClass: "sorcerer", level: 2, code: "DISB", name: "Disbelieve", function: "DispelIllusion", spellPoints: 4, target: "", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "duration=1",
    details: { durationMin: 1, durationMax: 1 },
    school: SpellSchool.SORCERER, spCost: 4, range: "party", duration: "instant", effectType: "utility",
    description: "Reveals the true nature of any illusion attacking the party, destroying it.",
    effect: { type: "disbelieve" }
  },
  {
    id: 27, spellClass: "sorcerer", level: 2, code: "TADU", name: "Target-Dummy", function: "Summon", spellPoints: 4, target: "", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "specialSummon=Dummy; isIllusion=true",
    details: { specialSummon: "Dummy", isIllusion: true },
    school: SpellSchool.SORCERER, spCost: 4, range: "special", duration: "combat", effectType: "summon",
    description: "A magical illusion appears that draws enemy attacks to itself.",
    effect: { type: "summon", creature: "Target Dummy", hp: 20, ac: 8, damage: 0, isIllusion: true }
  },
  {
    id: 28, spellClass: "sorcerer", level: 2, code: "MIFI", name: "Mangar's Mind Fist", function: "DamageSingleTarget", spellPoints: 4, target: "foe", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "element=burn; damage=3x(level+1)d4",
    details: { element: "burn", damage: "3x(level+1)d4", sourceDamage: "3x(level+1)d4" },
    school: SpellSchool.SORCERER, spCost: 4, range: "1foe", duration: "instant", effectType: "damage",
    description: "A higher power Mind Jab, more damage per caster level.",
    effect: { type: "damage", diceCount: 3, diceSides: 4, perLevel: true }
  },
  {
    id: 29, spellClass: "sorcerer", level: 2, code: "FEAR", name: "Word of Fear", function: "MalusToHit", spellPoints: 4, target: "group", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "penalty=1",
    details: { penalty: 1 },
    school: SpellSchool.SORCERER, spCost: 4, range: "group", duration: "combat", effectType: "debuff",
    description: "Makes a group of enemies shake in fear, reducing their attack and damage.",
    effect: { type: "fear", target: "group" }
  },
  {
    id: 30, spellClass: "sorcerer", level: 3, code: "WIWO", name: "Wind Wolf", function: "Summon", spellPoints: 5, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Wolf; isIllusion=true",
    details: { summonType: "Wolf", isIllusion: true },
    school: SpellSchool.SORCERER, spCost: 5, range: "special", duration: "combat", effectType: "summon",
    description: "Creates an illusionary wolf to join the party. Vanishes if disbelieved.",
    effect: { type: "summon", creature: "Wind Wolf", hp: 24, ac: 6, damage: 8, isIllusion: true }
  },
  {
    id: 31, spellClass: "sorcerer", level: 3, code: "VANI", name: "Kylearan's Vanishing Spell", function: "SelfBonusAC", spellPoints: 6, target: "", inCombat: true, outOfCombat: false, param: 5,
    sourceDetails: "bonus=5",
    details: { bonus: 5 },
    school: SpellSchool.SORCERER, spCost: 6, range: "self", duration: "combat", effectType: "buff",
    description: "The caster turns nearly invisible, enemies have great difficulty striking.",
    effect: { type: "acBonus", value: -4, target: "self" }
  },
  {
    id: 32, spellClass: "sorcerer", level: 3, code: "SESI", name: "Second Sight", function: "Eye", spellPoints: 6, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "duration=61-76; detect=STX",
    details: { durationMin: 61, durationMax: 76, detect: "STX" },
    school: SpellSchool.SORCERER, spCost: 6, range: "30ft", duration: "medium", effectType: "utility",
    description: "Heightened awareness that senses stairways, special encounters, and spell negation zones.",
    effect: { type: "secondSight" }
  },
  {
    id: 33, spellClass: "sorcerer", level: 3, code: "CURS", name: "Curse", function: "MalusToHit", spellPoints: 5, target: "group", inCombat: true, outOfCombat: false, param: 3,
    sourceDetails: "penalty=3",
    details: { penalty: 3 },
    school: SpellSchool.SORCERER, spCost: 5, range: "group", duration: "combat", effectType: "debuff",
    description: "Causes a group of enemies to fear you, lessening morale, hit chance and damage.",
    effect: { type: "curse", target: "group" }
  },
  {
    id: 34, spellClass: "sorcerer", level: 4, code: "CAEY", name: "Cat Eyes", function: "Light", spellPoints: 7, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "range=5; duration=infinite; seeHidden=false",
    details: { range: 5, duration: "infinite", seeHidden: false },
    school: SpellSchool.SORCERER, spCost: 7, range: "view", duration: "indefinite", effectType: "utility",
    description: "The party receives perfect night-vision, lasting indefinitely.",
    effect: { type: "nightVision", indefinite: true }
  },
  {
    id: 35, spellClass: "sorcerer", level: 4, code: "WIWA", name: "Wind Warrior", function: "Summon", spellPoints: 6, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Mercenary; isIllusion=true",
    details: { summonType: "Mercenary", isIllusion: true },
    school: SpellSchool.SORCERER, spCost: 6, range: "special", duration: "combat", effectType: "summon",
    description: "Creates the illusion of a battle-ready warrior that joins the party.",
    effect: { type: "summon", creature: "Wind Warrior", hp: 40, ac: 4, damage: 12, isIllusion: true }
  },
  {
    id: 36, spellClass: "sorcerer", level: 4, code: "INVI", name: "Kylearan's Invisibility Spell", function: "GroupBonusAC", spellPoints: 7, target: "", inCombat: true, outOfCombat: false, param: 4,
    sourceDetails: "bonus=4",
    details: { bonus: 4 },
    school: SpellSchool.SORCERER, spCost: 7, range: "party", duration: "combat", effectType: "buff",
    description: "A Vanishing Spell covering the entire party.",
    effect: { type: "acBonus", value: -4, target: "party" }
  },
  {
    id: 37, spellClass: "sorcerer", level: 5, code: "WIOG", name: "Wind Ogre", function: "Summon", spellPoints: 7, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Ogre; isIllusion=true",
    details: { summonType: "Ogre", isIllusion: true },
    school: SpellSchool.SORCERER, spCost: 7, range: "special", duration: "combat", effectType: "summon",
    description: "Creates the illusion of an ogre to fight with the party.",
    effect: { type: "summon", creature: "Wind Ogre", hp: 48, ac: 3, damage: 14, isIllusion: true }
  },
  {
    id: 38, spellClass: "sorcerer", level: 5, code: "DIIL", name: "Disrupt Illusion", function: "DispelIllusion", spellPoints: 8, target: "", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "duration=infinite",
    details: { duration: "infinite" },
    school: SpellSchool.SORCERER, spCost: 8, range: "party", duration: "combat", effectType: "utility",
    description: "Destroys any illusion fighting the party and reveals dopplegangers.",
    effect: { type: "disruptIllusion" }
  },
  {
    id: 39, spellClass: "sorcerer", level: 5, code: "MIBL", name: "Mangar's Mind Blade", function: "DamageAllGroups", spellPoints: 8, target: "all foes", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "element=burn; damage=10d4",
    details: { element: "burn", damage: "10d4" },
    school: SpellSchool.SORCERER, spCost: 8, range: "allfoes", duration: "instant", effectType: "damage",
    description: "A sharp explosion of psychic energy hitting every enemy.",
    effect: { type: "damage", diceCount: 10, diceSides: 4, target: "allfoes" }
  },
  {
    id: 40, spellClass: "sorcerer", level: 6, code: "WIDR", name: "Wind Dragon", function: "Summon", spellPoints: 10, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Red dragon; isIllusion=true",
    details: { summonType: "Red dragon", isIllusion: true },
    school: SpellSchool.SORCERER, spCost: 10, range: "special", duration: "combat", effectType: "summon",
    description: "Creates an illusionary red dragon to fight with the party.",
    effect: { type: "summon", creature: "Wind Dragon", hp: 80, ac: 1, damage: 22, isIllusion: true }
  },
  {
    id: 41, spellClass: "sorcerer", level: 6, code: "MIWP", name: "Mind Warp", function: "Status", spellPoints: 9, target: "foe", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "status=insanity",
    details: { status: "insanity" },
    school: SpellSchool.SORCERER, spCost: 9, range: "char", duration: "instant", effectType: "debuff",
    description: "Makes a party member go totally insane. Useful for curing possessions.",
    effect: { type: "insanity", target: "char" }
  },
  {
    id: 42, spellClass: "sorcerer", level: 7, code: "WIGI", name: "Wind Giant", function: "Summon", spellPoints: 12, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Storm giant; isIllusion=true",
    details: { summonType: "Storm giant", isIllusion: true },
    school: SpellSchool.SORCERER, spCost: 12, range: "special", duration: "combat", effectType: "summon",
    description: "Creates an illusionary storm giant to join and fight for the party.",
    effect: { type: "summon", creature: "Wind Giant", hp: 120, ac: 0, damage: 28, isIllusion: true }
  },
  {
    id: 43, spellClass: "sorcerer", level: 7, code: "SOSI", name: "Sorcerer Sight", function: "Eye", spellPoints: 11, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "duration=infinite; detect=STX",
    details: { duration: "infinite", detect: "STX" },
    school: SpellSchool.SORCERER, spCost: 11, range: "30ft", duration: "indefinite", effectType: "utility",
    description: "Functions as Second Sight but lasts indefinitely.",
    effect: { type: "secondSight", indefinite: true }
  },

  // ─── MAGICIAN (IDs 44–65) ───────────────────────────────────────────────
  {
    id: 44, spellClass: "magician", level: 1, code: "VOPL", name: "Vorpal Plating", function: "MemberBonusDamageDices", spellPoints: 3, target: "member", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "damage=1d8",
    details: { damage: "1d8" },
    school: SpellSchool.MAGICIAN, spCost: 3, range: "char", duration: "combat", effectType: "buff",
    description: "Covers a party member's weapon with a magical field for extra damage.",
    effect: { type: "damageBonus", diceCount: 2, diceSides: 4, target: "char" }
  },
  {
    id: 45, spellClass: "magician", level: 1, code: "AIAR", name: "Air Armor", function: "SelfBonusAC", spellPoints: 3, target: "", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "bonus=1",
    details: { bonus: 1 },
    school: SpellSchool.MAGICIAN, spCost: 3, range: "self", duration: "combat", effectType: "buff",
    description: "The air around the caster binds into a weightless suit of armor.",
    effect: { type: "acBonus", value: -2, target: "self" }
  },
  {
    id: 46, spellClass: "magician", level: 1, code: "STLI", name: "Sabhar's Steelight Spell", function: "Light", spellPoints: 2, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "range=3; duration=31-46; seeHidden=false",
    details: { range: 3, durationMin: 31, durationMax: 46, seeHidden: false },
    school: SpellSchool.MAGICIAN, spCost: 2, range: "view", duration: "short", effectType: "light",
    description: "All metal near the party glows with magical light.",
    effect: { type: "light", radius: 3 }
  },
  {
    id: 47, spellClass: "magician", level: 1, code: "SCSI", name: "Scry Site", function: "Locate", spellPoints: 2, target: "", inCombat: false, outOfCombat: true, param: null,
    sourceDetails: "",
    details: {},
    school: SpellSchool.MAGICIAN, spCost: 2, range: "party", duration: "instant", effectType: "utility",
    description: "The walls reveal the spell caster's location in the labyrinth.",
    effect: { type: "revealPosition" }
  },
  {
    id: 48, spellClass: "magician", level: 2, code: "HOWA", name: "Holy Water", function: "RepelUndead", spellPoints: 4, target: "foe", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "element=drain; damage=7d4; repelCategory=undead",
    details: { element: "drain", damage: "7d4", repelCategory: "undead" },
    school: SpellSchool.MAGICIAN, spCost: 4, range: "1foe", duration: "instant", effectType: "damage",
    description: "A spray of holy water does 6-24 damage to undead foes.",
    effect: { type: "damage", diceCount: 6, diceSides: 4, undeadOnly: true }
  },
  {
    id: 49, spellClass: "magician", level: 2, code: "WIST", name: "Wither Strike", function: "Status", spellPoints: 5, target: "foe", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "status=wither",
    details: { status: "wither" },
    school: SpellSchool.MAGICIAN, spCost: 5, range: "1foe", duration: "instant", effectType: "debuff",
    description: "Turns a foe old, reducing its ability to attack and defend.",
    effect: { type: "wither", target: "1foe" }
  },
  {
    id: 50, spellClass: "magician", level: 2, code: "MAGA", name: "Mage Gauntlets", function: "MemberBonusDamageDices", spellPoints: 5, target: "member", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "damage=2d8",
    details: { damage: "2d8" },
    school: SpellSchool.MAGICIAN, spCost: 5, range: "char", duration: "combat", effectType: "buff",
    description: "Makes a party member's hands more deadly, adding 4-16 damage per wound.",
    effect: { type: "damageBonus", diceCount: 4, diceSides: 4, target: "char" }
  },
  {
    id: 51, spellClass: "magician", level: 2, code: "AREN", name: "Area Enchant", function: "Eye", spellPoints: 5, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "duration=21-36; detect=S--",
    details: { durationMin: 21, durationMax: 36, detect: "S--" },
    school: SpellSchool.MAGICIAN, spCost: 5, range: "30ft", duration: "short", effectType: "utility",
    description: "Dungeon walls within 30 feet of a stairway will call out when approaching.",
    effect: { type: "detectStairs" }
  },
  {
    id: 52, spellClass: "magician", level: 3, code: "MYSH", name: "Ybarra's Mystic Shield", function: "PartyBonusAC", spellPoints: 6, target: "", inCombat: true, outOfCombat: true, param: 2,
    sourceDetails: "bonus=2; duration=41-56",
    details: { bonus: 2, durationMin: 41, durationMax: 56 },
    school: SpellSchool.MAGICIAN, spCost: 6, range: "party", duration: "medium", effectType: "buff",
    description: "The air binds into an invisible metallic shield accompanying the party.",
    effect: { type: "acBonus", value: -2, target: "party" }
  },
  {
    id: 53, spellClass: "magician", level: 3, code: "OGST", name: "Oscon's Ogrestrength", function: "BonusDamage", spellPoints: 6, target: "member", inCombat: true, outOfCombat: false, param: 7,
    sourceDetails: "bonus=7",
    details: { bonus: 7 },
    school: SpellSchool.MAGICIAN, spCost: 6, range: "char", duration: "combat", effectType: "buff",
    description: "A party member damages monsters as if incredibly strong as an ogre.",
    effect: { type: "damageBonus", flat: 8, target: "char" }
  },
  {
    id: 54, spellClass: "magician", level: 3, code: "MIMI", name: "Mithril Might", function: "GroupBonusAC", spellPoints: 7, target: "", inCombat: true, outOfCombat: false, param: 3,
    sourceDetails: "bonus=3",
    details: { bonus: 3 },
    school: SpellSchool.MAGICIAN, spCost: 7, range: "party", duration: "combat", effectType: "buff",
    description: "Increases armor protection of each party member by enhancing armor's strength.",
    effect: { type: "acBonus", value: -2, target: "party" }
  },
  {
    id: 55, spellClass: "magician", level: 3, code: "STFL", name: "Starflare", function: "DamageGroup", spellPoints: 6, target: "group", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "element=fry; damage=6d4",
    details: { element: "fry", damage: "6d4" },
    school: SpellSchool.MAGICIAN, spCost: 6, range: "group", duration: "instant", effectType: "damage",
    description: "The air surrounding a group of enemies ignites, burning them.",
    effect: { type: "damage", diceCount: 6, diceSides: 4, target: "group" }
  },
  {
    id: 56, spellClass: "magician", level: 4, code: "SPTO", name: "Spectre Touch", function: "Drain", spellPoints: 8, target: "foe", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "element=drain; damage=13d4",
    details: { element: "drain", damage: "13d4" },
    school: SpellSchool.MAGICIAN, spCost: 8, range: "1foe", duration: "instant", effectType: "damage",
    description: "Drains a single enemy of 12-48 hit points.",
    effect: { type: "damage", diceCount: 12, diceSides: 4 }
  },
  {
    id: 57, spellClass: "magician", level: 4, code: "DRBR", name: "Dragon Breath", function: "DamageGroup", spellPoints: 7, target: "group", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "element=fry; damage=8d4",
    details: { element: "fry", damage: "8d4" },
    school: SpellSchool.MAGICIAN, spCost: 7, range: "group", duration: "instant", effectType: "damage",
    description: "The mage breathes fire at a group of foes.",
    effect: { type: "damage", diceCount: 8, diceSides: 4, target: "group", element: "fire" }
  },
  {
    id: 58, spellClass: "magician", level: 4, code: "STSI", name: "Sabhar's Stonelight Spell", function: "Light", spellPoints: 7, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "range=5; duration=61-76; seeHidden=true",
    details: { range: 5, durationMin: 61, durationMax: 76, seeHidden: true },
    school: SpellSchool.MAGICIAN, spCost: 7, range: "view", duration: "medium", effectType: "light",
    description: "All stone and earth glow with magical light, revealing secret doors.",
    effect: { type: "light", radius: 5, revealSecrets: true }
  },
  {
    id: 59, spellClass: "magician", level: 5, code: "ANMA", name: "Anti-Magic", function: "AntiMagic", spellPoints: 8, target: "", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "",
    details: {},
    school: SpellSchool.MAGICIAN, spCost: 8, range: "party", duration: "combat", effectType: "buff",
    description: "The ground absorbs magical energies, protecting the party from spell damage.",
    effect: { type: "antiMagic", target: "party" }
  },
  {
    id: 60, spellClass: "magician", level: 5, code: "ANSW", name: "Aker's Animated Sword", function: "Summon", spellPoints: 8, target: "", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "specialSummon=Joe the Sword; isIllusion=false",
    details: { specialSummon: "Joe the Sword", isIllusion: false },
    school: SpellSchool.MAGICIAN, spCost: 8, range: "special", duration: "combat", effectType: "summon",
    description: "A magical sword appears and fights like a summoned monster.",
    effect: { type: "summon", creature: "Animated Sword", hp: 30, ac: 2, damage: 16 }
  },
  {
    id: 61, spellClass: "magician", level: 5, code: "STTO", name: "Stone Touch", function: "Status", spellPoints: 8, target: "foe", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "status=stone",
    details: { status: "stone" },
    school: SpellSchool.MAGICIAN, spCost: 8, range: "1foe", duration: "instant", effectType: "debuff",
    description: "May turn an enemy to stone. Does not always work.",
    effect: { type: "petrify", chance: 0.5 }
  },
  {
    id: 62, spellClass: "magician", level: 6, code: "PHDO", name: "Phase Door", function: "PhaseDoor", spellPoints: 9, target: "", inCombat: false, outOfCombat: true, param: null,
    sourceDetails: "",
    details: {},
    school: SpellSchool.MAGICIAN, spCost: 9, range: "1wall", duration: "instant", effectType: "utility",
    description: "Alters a wall directly in front of the party, turning it to air for 1 move.",
    effect: { type: "phaseDoor", moves: 1 }
  },
  {
    id: 63, spellClass: "magician", level: 6, code: "YMCA", name: "Ybarra's Mystical Coat of Armor", function: "PartyBonusAC", spellPoints: 10, target: "", inCombat: true, outOfCombat: true, param: 2,
    sourceDetails: "bonus=2; duration=infinite",
    details: { bonus: 2, duration: "infinite" },
    school: SpellSchool.MAGICIAN, spCost: 10, range: "party", duration: "indefinite", effectType: "buff",
    description: "Air Armor covers every member of the party, lasting indefinitely.",
    effect: { type: "acBonus", value: -3, target: "party", indefinite: true }
  },
  {
    id: 64, spellClass: "magician", level: 7, code: "REST", name: "Restoration", function: "Heal", spellPoints: 12, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "heal=full; cures=poison|paralysis|insanity",
    details: { heal: "full", cures: ["poison", "paralysis", "insanity"] },
    school: SpellSchool.MAGICIAN, spCost: 12, range: "party", duration: "instant", effectType: "heal",
    description: "All wounds disappear as the entire party is reforged into unflawed bodies.",
    effect: { type: "fullHeal", curesPoison: true, curesInsanity: true, target: "party" }
  },
  {
    id: 65, spellClass: "magician", level: 7, code: "DEST", name: "Deathstrike", function: "Status", spellPoints: 14, target: "foe", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "status=critical",
    details: { status: "critical" },
    school: SpellSchool.MAGICIAN, spCost: 14, range: "1foe", duration: "instant", effectType: "damage",
    description: "Very likely to instantly kill one selected enemy, big or small.",
    effect: { type: "instantKill", chance: 0.75 }
  },

  // ─── WIZARD (IDs 66–78) ─────────────────────────────────────────────────
  {
    id: 66, spellClass: "wizard", level: 1, code: "SUDE", name: "Summon Dead", function: "Summon", spellPoints: 6, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Skeleton/Zombie; isIllusion=false",
    details: { summonType: "Skeleton/Zombie", isIllusion: false },
    school: SpellSchool.WIZARD, spCost: 6, range: "special", duration: "combat", effectType: "summon",
    description: "Gates a zombie or skeleton into our universe to fight for the party.",
    effect: { type: "summon", creature: "Summoned Undead", hp: 18, ac: 7, damage: 6 }
  },
  {
    id: 67, spellClass: "wizard", level: 1, code: "REDE", name: "Repel Dead", function: "RepelUndead", spellPoints: 4, target: "group", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "element=fry; damage=16d4; repelCategory=undead",
    details: { element: "fry", damage: "16d4", repelCategory: "undead" },
    school: SpellSchool.WIZARD, spCost: 4, range: "group", duration: "instant", effectType: "damage",
    description: "Does 16-80 damage to a group of undead creatures.",
    effect: { type: "damage", diceCount: 16, diceSides: 5, target: "group", undeadOnly: true }
  },
  {
    id: 68, spellClass: "wizard", level: 2, code: "LESU", name: "Lesser Summoning", function: "Summon", spellPoints: 8, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Lesser demon; isIllusion=false",
    details: { summonType: "Lesser demon", isIllusion: false },
    school: SpellSchool.WIZARD, spCost: 8, range: "special", duration: "combat", effectType: "summon",
    description: "Gates a lower power elemental or demon who joins the party under protest.",
    effect: { type: "summon", creature: "Lesser Demon", hp: 36, ac: 4, damage: 12 }
  },
  {
    id: 69, spellClass: "wizard", level: 2, code: "DEBA", name: "Demon Bane", function: "RepelUndead", spellPoints: 8, target: "foe", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "element=freeze; damage=33d4; repelCategory=demon",
    details: { element: "freeze", damage: "33d4", repelCategory: "demon" },
    school: SpellSchool.WIZARD, spCost: 8, range: "1foe", duration: "instant", effectType: "damage",
    description: "Does 32-128 damage to a single demon.",
    effect: { type: "damage", diceCount: 32, diceSides: 4, demonOnly: true }
  },
  {
    id: 70, spellClass: "wizard", level: 3, code: "SUPH", name: "Summon Phantom", function: "Summon", spellPoints: 10, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Ghoul/Wraith; isIllusion=false",
    details: { summonType: "Ghoul/Wraith", isIllusion: false },
    school: SpellSchool.WIZARD, spCost: 10, range: "special", duration: "combat", effectType: "summon",
    description: "Brings a medium level undead creature into the party.",
    effect: { type: "summon", creature: "Phantom", hp: 48, ac: 3, damage: 14 }
  },
  {
    id: 71, spellClass: "wizard", level: 3, code: "DISP", name: "Dispossess", function: "Heal", spellPoints: 10, target: "member", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "cures=possess",
    details: { cures: ["possess"] },
    school: SpellSchool.WIZARD, spCost: 10, range: "char", duration: "instant", effectType: "utility",
    description: "Makes any possessed party member return to normal.",
    effect: { type: "dispossess" }
  },
  {
    id: 72, spellClass: "wizard", level: 4, code: "PRSU", name: "Prime Summoning", function: "Summon", spellPoints: 12, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Demon; isIllusion=false",
    details: { summonType: "Demon", isIllusion: false },
    school: SpellSchool.WIZARD, spCost: 12, range: "special", duration: "combat", effectType: "summon",
    description: "Gates in a medium level elemental or demon to fight with the party.",
    effect: { type: "summon", creature: "Greater Elemental", hp: 64, ac: 2, damage: 18 }
  },
  {
    id: 73, spellClass: "wizard", level: 4, code: "ANDE", name: "Animate Dead", function: "Status", spellPoints: 11, target: "member", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "status=possess",
    details: { status: "possess" },
    school: SpellSchool.WIZARD, spCost: 11, range: "char", duration: "combat", effectType: "utility",
    description: "Gives a dead character undead strength, making them attack as if alive.",
    effect: { type: "animateDead" }
  },
  {
    id: 74, spellClass: "wizard", level: 5, code: "SPBI", name: "Baylor's Spell Bind", function: "Possess", spellPoints: 14, target: "group", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "",
    details: {},
    school: SpellSchool.WIZARD, spCost: 14, range: "1foe", duration: "combat", effectType: "debuff",
    description: "Possesses an enemy's mind, forcing it to join and fight for the party.",
    effect: { type: "possess" }
  },
  {
    id: 75, spellClass: "wizard", level: 5, code: "DMST", name: "Demon Strike", function: "RepelUndead", spellPoints: 13, target: "group", inCombat: true, outOfCombat: false, param: 1,
    sourceDetails: "element=freeze; damage=32d4; repelCategory=demon",
    details: { element: "freeze", damage: "32d4", repelCategory: "demon" },
    school: SpellSchool.WIZARD, spCost: 13, range: "group", duration: "instant", effectType: "damage",
    description: "Like Demon Bane but affects an entire group of demons.",
    effect: { type: "damage", diceCount: 32, diceSides: 4, target: "group", demonOnly: true }
  },
  {
    id: 76, spellClass: "wizard", level: 6, code: "SPSP", name: "Spell Spirit", function: "Summon", spellPoints: 15, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Lich/Spectre; isIllusion=false",
    details: { summonType: "Lich/Spectre", isIllusion: false },
    school: SpellSchool.WIZARD, spCost: 15, range: "special", duration: "combat", effectType: "summon",
    description: "Gates in a higher-level undead creature to fight for the party.",
    effect: { type: "summon", creature: "Spell Spirit", hp: 80, ac: 1, damage: 22 }
  },
  {
    id: 77, spellClass: "wizard", level: 6, code: "BEDE", name: "Beyond Death", function: "Heal", spellPoints: 18, target: "member", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "status=resurrect",
    details: { status: "resurrect" },
    school: SpellSchool.WIZARD, spCost: 18, range: "char", duration: "instant", effectType: "heal",
    description: "Restores life and one hit point to a dead character.",
    effect: { type: "resurrect" }
  },
  {
    id: 78, spellClass: "wizard", level: 7, code: "GRSU", name: "Greater Summoning", function: "Summon", spellPoints: 22, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Greater demon/Demon lord; isIllusion=false",
    details: { summonType: "Greater demon/Demon lord", isIllusion: false },
    school: SpellSchool.WIZARD, spCost: 22, range: "special", duration: "combat", effectType: "summon",
    description: "Gates a greater demon into our universe and binds it to the party.",
    effect: { type: "summon", creature: "Greater Demon", hp: 150, ac: -2, damage: 32 }
  },

  // ─── SPECIAL / SYSTEM SPELLS (IDs 79–104) ───────────────────────────────
  {
    id: 79, spellClass: "special", level: null, code: null, name: "Breath", function: "Breath", spellPoints: 1, target: "group", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "element=freeze; damage=24d4",
    details: { element: "freeze", damage: "24d4" },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 80, spellClass: "special", level: null, code: null, name: "Breath", function: "Breath", spellPoints: 1, target: "group", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "element=fry; damage=32d4",
    details: { element: "fry", damage: "32d4" },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 81, spellClass: "special", level: null, code: null, name: "Breath", function: "Breath", spellPoints: 1, target: "group", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "element=fry; damage=40d4",
    details: { element: "fry", damage: "40d4" },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 82, spellClass: "special", level: null, code: null, name: "Breath", function: "Breath", spellPoints: 1, target: "group", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "element=fry; damage=48d4",
    details: { element: "fry", damage: "48d4" },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 83, spellClass: "special", level: null, code: null, name: "Breath", function: "Breath", spellPoints: 1, target: "group", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "element=shock; damage=34d4",
    details: { element: "shock", damage: "34d4" },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 84, spellClass: "special", level: null, code: null, name: "Breath", function: "Breath", spellPoints: 1, target: "group", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "element=drain; damage=44d4",
    details: { element: "drain", damage: "44d4" },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 85, spellClass: "special", level: null, code: null, name: "Breath", function: "Breath", spellPoints: 1, target: "group", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "element=drain; damage=64d4",
    details: { element: "drain", damage: "64d4" },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 86, spellClass: "special", level: null, code: null, name: "Breath", function: "Breath", spellPoints: 1, target: "group", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "element=fry; damage=72d4",
    details: { element: "fry", damage: "72d4" },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 87, spellClass: "special", level: null, code: null, name: "Breath", function: "Breath", spellPoints: 1, target: "group", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "element=burn; damage=16d4",
    details: { element: "burn", damage: "16d4" },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 88, spellClass: "special", level: null, code: null, name: "Breath", function: "Breath", spellPoints: 1, target: "group", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "element=choke; damage=18d4",
    details: { element: "choke", damage: "18d4" },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 89, spellClass: "special", level: null, code: null, name: "Breath", function: "Breath", spellPoints: 1, target: "group", inCombat: true, outOfCombat: false, param: null,
    sourceDetails: "element=steam; damage=20d4",
    details: { element: "steam", damage: "20d4" },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 90, spellClass: "special", level: null, code: null, name: "Light (Torch)", function: "Light", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "range=2; duration=29-44; seeHidden=false",
    details: { range: 2, durationMin: 29, durationMax: 44, seeHidden: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 91, spellClass: "special", level: null, code: null, name: "Light (Lamp)", function: "Light", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "range=2; duration=37-52; seeHidden=false",
    details: { range: 2, durationMin: 37, durationMax: 52, seeHidden: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 92, spellClass: "special", level: null, code: null, name: "Summon Green Dragon", function: "Summon", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Green dragon; isIllusion=false",
    details: { summonType: "Green dragon", isIllusion: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 93, spellClass: "special", level: null, code: null, name: "Summon War Giant", function: "Summon", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=War giant; isIllusion=false",
    details: { summonType: "War giant", isIllusion: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 94, spellClass: "special", level: null, code: null, name: "Summon Ogre", function: "Summon", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Ogre; isIllusion=false",
    details: { summonType: "Ogre", isIllusion: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 95, spellClass: "special", level: null, code: null, name: "Summon Mongo", function: "Summon", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Mongo; isIllusion=false",
    details: { summonType: "Mongo", isIllusion: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 96, spellClass: "special", level: null, code: null, name: "Summon Fred", function: "Summon", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Fred; isIllusion=false",
    details: { summonType: "Fred", isIllusion: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 97, spellClass: "special", level: null, code: null, name: "Summon Old Man", function: "Summon", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Old man; isIllusion=false",
    details: { summonType: "Old man", isIllusion: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 98, spellClass: "special", level: null, code: null, name: "Summon Spectre", function: "Summon", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Spectre; isIllusion=false",
    details: { summonType: "Spectre", isIllusion: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 99, spellClass: "special", level: null, code: null, name: "Summon Thor", function: "Summon", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "specialSummon=Thor; isIllusion=false",
    details: { specialSummon: "Thor", isIllusion: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 100, spellClass: "special", level: null, code: null, name: "Summon Master Wizard", function: "Summon", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Master wizard; isIllusion=false",
    details: { summonType: "Master wizard", isIllusion: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 101, spellClass: "special", level: null, code: null, name: "Summon Lich", function: "Summon", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Lich; isIllusion=false",
    details: { summonType: "Lich", isIllusion: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 102, spellClass: "special", level: null, code: null, name: "Summon Samurai", function: "Summon", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Samurai; isIllusion=false",
    details: { summonType: "Samurai", isIllusion: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 103, spellClass: "special", level: null, code: null, name: "Summon Titan", function: "Summon", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Titan; isIllusion=false",
    details: { summonType: "Titan", isIllusion: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  },
  {
    id: 104, spellClass: "special", level: null, code: null, name: "Summon Golem", function: "Summon", spellPoints: null, target: "", inCombat: true, outOfCombat: true, param: null,
    sourceDetails: "summonType=Golem; isIllusion=false",
    details: { summonType: "Golem", isIllusion: false },
    school: "SPECIAL", spCost: null, range: "special", duration: "instant", effectType: "special",
    description: "System spell used by monsters, items, or figurines.",
    effect: { type: "special" }
  }
];

/**
 * Validates a collection of spell definitions against canonical Bard's Tale invariants.
 * @param {Array<Object>} spells
 * @returns {boolean}
 * @throws {TypeError|RangeError|Error} If any invariant is violated.
 */
export function validateSpellDatabase(spells) {
  if (!Array.isArray(spells)) {
    throw new TypeError('[SpellDatabase] validateSpellDatabase expected an array.');
  }

  if (spells.length !== 105) {
    throw new RangeError(`[SpellDatabase] Expected exactly 105 spell records, got ${spells.length}.`);
  }

  const seenIds = new Set();
  const seenCodes = new Set();
  const validClasses = ['conjurer', 'magician', 'sorcerer', 'wizard'];

  for (let i = 0; i < spells.length; i++) {
    const spell = spells[i];
    const prefix = `[SpellDatabase] Spell at index ${i}`;

    if (!spell || typeof spell !== 'object') {
      throw new TypeError(`${prefix} must be a non-null object.`);
    }

    // 1. Contiguous integer IDs from 0 to 104
    if (typeof spell.id !== 'number' || !Number.isInteger(spell.id) || spell.id !== i) {
      throw new TypeError(`${prefix} (${spell.name || 'unnamed'}) ID must be integer ${i}. Received: ${spell.id}`);
    }
    if (seenIds.has(spell.id)) {
      throw new Error(`${prefix} has duplicate ID "${spell.id}".`);
    }
    seenIds.add(spell.id);

    // 2. inCombat and outOfCombat are booleans
    if (typeof spell.inCombat !== 'boolean' || typeof spell.outOfCombat !== 'boolean') {
      throw new TypeError(`${prefix} (${spell.name}) "inCombat" and "outOfCombat" must be booleans.`);
    }

    // 3. Player spells (IDs 0–78)
    if (spell.id <= 78) {
      if (typeof spell.code !== 'string' || spell.code.trim().length !== 4) {
        throw new TypeError(`${prefix} (${spell.name}) must have a non-null 4-letter string code.`);
      }
      const upperCode = spell.code.trim().toUpperCase();
      if (seenCodes.has(upperCode)) {
        throw new Error(`${prefix} has duplicate player code "${upperCode}".`);
      }
      seenCodes.add(upperCode);

      if (!validClasses.includes(spell.spellClass)) {
        throw new TypeError(`${prefix} (${spell.name}) has invalid spellClass "${spell.spellClass}". Expected one of: ${validClasses.join(', ')}.`);
      }

      if (typeof spell.level !== 'number' || spell.level < 1 || spell.level > 7) {
        throw new RangeError(`${prefix} (${spell.name}) level must be an integer between 1 and 7. Received: ${spell.level}`);
      }

      if (typeof spell.spellPoints !== 'number' || spell.spellPoints < 0) {
        throw new TypeError(`${prefix} (${spell.name}) spellPoints must be a non-negative number.`);
      }

      // 4. Preserve scaling formulas as strings in details.sourceDamage
      if (spell.code === 'ARFI' || spell.code === 'MIJA' || spell.code === 'MIFI') {
        if (!spell.details || typeof spell.details.sourceDamage !== 'string') {
          throw new TypeError(`${prefix} (${spell.code}) must preserve scaling formula string in details.sourceDamage.`);
        }
      }
    } else {
      // 5. Special spells (IDs 79–104)
      if (spell.spellClass !== 'special') {
        throw new TypeError(`${prefix} special spell must have spellClass "special". Received: ${spell.spellClass}`);
      }
      if (spell.level !== null) {
        throw new TypeError(`${prefix} special spell must have level: null. Received: ${spell.level}`);
      }
      if (spell.code !== null) {
        throw new TypeError(`${prefix} special spell must have code: null. Received: ${spell.code}`);
      }
    }
  }

  return true;
}

// Validate raw spells before freezing
validateSpellDatabase(RAW_SPELLS);

function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
      deepFreeze(obj[key]);
    }
  }
  return obj;
}

RAW_SPELLS.forEach(deepFreeze);

/**
 * Master array of all 105 Bard's Tale canonical spells (frozen).
 * @type {ReadonlyArray<Object>}
 */
export const bardTaleSpells = Object.freeze(RAW_SPELLS);

/**
 * Builds lookup maps exclusively from canonical spells.
 * @param {ReadonlyArray<Object>} spells
 * @returns {{ spellById: Map<number, Object>, spellByCode: Map<string, Object> }}
 */
function buildLookupMaps(spells) {
  const byId = new Map();
  const byCode = new Map();

  for (const spell of spells) {
    byId.set(spell.id, spell);
    if (typeof spell.code === 'string' && spell.code.trim().length > 0) {
      byCode.set(spell.code.trim().toUpperCase(), spell);
    }
  }

  return { spellById: byId, spellByCode: byCode };
}

const lookups = buildLookupMaps(bardTaleSpells);

/**
 * Map of all 105 spells keyed by canonical integer ID (0–104).
 * @type {Map<number, Object>}
 */
export const spellById = lookups.spellById;

/**
 * Map of player spells keyed by 4-letter uppercase code (e.g. 'MAFL', 'ARFI').
 * @type {Map<string, Object>}
 */
export const spellByCode = lookups.spellByCode;

/**
 * Public array of player-castable spells (IDs 0–78).
 * Retained for 100% backward-compatibility with UI and character generation.
 * @type {ReadonlyArray<Object>}
 */
export const SPELLS = Object.freeze(bardTaleSpells.filter(s => s.school !== 'SPECIAL'));

/**
 * Look up a spell by canonical integer ID (0–104).
 * @param {number} id - Integer ID.
 * @returns {Object | undefined}
 */
export function getSpellById(id) {
  return spellById.get(id);
}

/**
 * Look up a player spell by its 4-letter code (case-insensitive).
 * @param {string} code - e.g. 'MAFL', 'arfi'
 * @returns {Object | undefined}
 */
export function getSpellByCode(code) {
  if (typeof code !== 'string') return undefined;
  return spellByCode.get(code.trim().toUpperCase());
}

/**
 * Get all spells for a given character class ('conjurer', 'magician', 'sorcerer', 'wizard', 'special').
 * @param {string} spellClass
 * @returns {Object[]}
 */
export function getSpellsByClass(spellClass) {
  if (typeof spellClass !== 'string') return [];
  const normalized = spellClass.trim().toLowerCase();
  return bardTaleSpells.filter(s => s.spellClass === normalized);
}

/**
 * Get all spells a character knows, based on their school history and current level.
 * A character retains all spells from previous schools even after class change.
 * Never returns special/system spells.
 * @param {object} character - Character with schoolLevels: { CONJURER: 3, MAGICIAN: 1, ... }
 * @returns {object[]} Array of known player spell objects
 */
export function getKnownSpells(character) {
  const known = [];
  const schoolLevels = character?.schoolLevels || {};

  for (const [school, maxLevel] of Object.entries(schoolLevels)) {
    const schoolSpells = SPELLS.filter(
      s => s.school === school && s.level <= maxLevel
    );
    known.push(...schoolSpells);
  }

  return known;
}

/**
 * Get all player spells for a given school and level.
 * Never returns special/system spells.
 * @param {string} school - e.g. 'CONJURER', 'MAGICIAN'
 * @param {number} level - 1 to 7
 * @returns {object[]}
 */
export function getSpellsBySchoolAndLevel(school, level) {
  return SPELLS.filter(s => s.school === school && s.level === level);
}

/**
 * Spell level progression table (from the manual):
 * Experience Level → Spell Level
 * 1-2  → 1
 * 3    → 2
 * 5    → 3
 * 7    → 4
 * 9    → 5
 * 11   → 6
 * 13+  → 7
 * @param {number} experienceLevel
 * @returns {number}
 */
export function getMaxSpellLevel(experienceLevel) {
  if (experienceLevel >= 13) return 7;
  if (experienceLevel >= 11) return 6;
  if (experienceLevel >= 9) return 5;
  if (experienceLevel >= 7) return 4;
  if (experienceLevel >= 5) return 3;
  if (experienceLevel >= 3) return 2;
  return 1;
}
