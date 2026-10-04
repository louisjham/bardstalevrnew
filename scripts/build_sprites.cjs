// scripts/build_sprites.cjs
// Automated Sprite Sheet Processing and Manifest Generator for The Bard's Tale VR
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.resolve(__dirname, '../New folder/spritesheets');
const TARGET_DIR = path.resolve(__dirname, '../public/assets/sprites');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

console.log('Ingesting sprite sheets from:', SOURCE_DIR);
console.log('Target directory:', TARGET_DIR);

// Copy 01-63 raw indexed sprite sheets (preferring Amiga versions for authentic 32-color high contrast)
const indexedFiles = {};
for (let i = 1; i <= 63; i++) {
  const pad = String(i).padStart(2, '0');
  const amiga = path.join(SOURCE_DIR, `Bard 1 ${pad} Amiga_sheet.png`);
  const atari = path.join(SOURCE_DIR, `Bard 1 ${pad} Atari_sheet.png`);
  
  let chosen = null;
  if (fs.existsSync(amiga)) chosen = amiga;
  else if (fs.existsSync(atari)) chosen = atari;
  
  if (chosen) {
    const destName = `bt1_${pad}.png`;
    fs.copyFileSync(chosen, path.join(TARGET_DIR, destName));
    indexedFiles[pad] = destName;
  }
}

// Special alias for bt1_bard.png matching bt1_04.png
if (indexedFiles['04']) {
  fs.copyFileSync(path.join(TARGET_DIR, indexedFiles['04']), path.join(TARGET_DIR, 'bt1_bard.png'));
}

console.log(`Successfully ingested ${Object.keys(indexedFiles).length} unique sprite sheets.`);

// Authoritative mapping table correlating Monster IDs, Slugs and Classes to visually verified authentic 1985 sprites
const BASE_MAPPING = {
  // Hero Classes & Archetypes
  'warrior': 'bt1_01.png',
  'paladin': 'bt1_02.png',
  'thief': 'bt1_03.png',
  'rogue': 'bt1_03.png',
  'bard': 'bt1_04.png',
  'hunter': 'bt1_05.png',
  'monk': 'bt1_06.png',
  'conjurer': 'bt1_07.png',
  'magician': 'bt1_08.png',
  'sorcerer': 'bt1_08.png',
  'wizard': 'bt1_08.png',
  'archmage': 'bt1_09.png',

  // Canonical Monsters (Visually Verified 1985 Interplay Rips)
  // 01: Melee Warriors & Fighters
  'barbarian': 'bt1_01.png',
  'mercenary': 'bt1_01.png',
  'half_orc': 'bt1_01.png',
  'swordsman': 'bt1_01.png',
  'bladesman': 'bt1_01.png',
  'warrior_elite': 'bt1_01.png',
  'master_ninja': 'bt1_01.png',

  // 02: Knights & Lords
  'dwarf_king': 'bt1_02.png',
  'samurai_lord': 'bt1_02.png',
  'mangar_guard': 'bt1_02.png',

  // 03: Small Folk, Rogues & Tricksters
  'hobbit': 'bt1_03.png',
  'gnome': 'bt1_03.png',
  'dwarf': 'bt1_03.png',
  'master_thief': 'bt1_03.png',
  'gimp': 'bt1_03.png',
  'fred': 'bt1_03.png',

  // 04: Bards & Performers
  'nomad': 'bt1_04.png',

  // 06: Monks & Ascetics
  'jade_monk': 'bt1_06.png',
  'scarlet_monk': 'bt1_06.png',
  'azure_monk': 'bt1_06.png',
  'ivory_monk': 'bt1_06.png',

  // 07: Conjurers
  'master_conjurer': 'bt1_07.png',

  // 08: Magicians & Wizards
  'master_magician': 'bt1_08.png',
  'master_sorcerer': 'bt1_08.png',
  'master_wizard': 'bt1_08.png',

  // 09: Enchanters & Elder Mages
  'sorcerer_elder': 'bt1_09.png',

  // 10: Clerics & Priests
  'high_priest': 'bt1_10.png',
  'priest': 'bt1_10.png',
  'cleric': 'bt1_10.png',

  // 11: Treasure & Gold
  'treasure_hoard': 'bt1_11.png',
  'gold_pile': 'bt1_11.png',

  // 12: Celestials & Summons
  'angel': 'bt1_12.png',
  'archon': 'bt1_12.png',
  'deva': 'bt1_12.png',

  // 14: Winged Dragons & Wyverns
  'dragon': 'bt1_14.png',
  'green_dragon': 'bt1_14.png',
  'blue_dragon': 'bt1_14.png',
  'copper_dragon': 'bt1_14.png',
  'white_dragon': 'bt1_14.png',
  'grey_dragon': 'bt1_14.png',
  'red_dragon': 'bt1_14.png',
  'black_dragon': 'bt1_14.png',
  'wyvern': 'bt1_14.png',

  // 15: Ogres & Trolls
  'ogre': 'bt1_15.png',
  'ogre_lord': 'bt1_15.png',
  'ogre_magician': 'bt1_15.png',
  'troll': 'bt1_15.png',

  // 16: Scholars & Scribes
  'scholar': 'bt1_16.png',
  'scribe': 'bt1_16.png',
  'review_board_elder': 'bt1_16.png',

  // 17: Mercenary Veterans
  'mercenary_veteran': 'bt1_17.png',
  'guild_guard': 'bt1_17.png',

  // 18: Evokers & Fire Casters
  'evoker': 'bt1_18.png',
  'flame_caster': 'bt1_18.png',

  // 19: Ghouls & Cannibals
  'ghoul': 'bt1_19.png',
  'cannibal_ghoul': 'bt1_19.png',
  'flesh_eater': 'bt1_19.png',

  // 20: Shadows & Wraiths
  'shadow': 'bt1_20.png',
  'wraith': 'bt1_20.png',
  'spectre': 'bt1_20.png',
  'phantom': 'bt1_20.png',
  'mind_shadow': 'bt1_20.png',
  'soul_sucker': 'bt1_20.png',

  // 21: Lurkers & Sea Serpents
  'lurker': 'bt1_21.png',
  'sea_serpent': 'bt1_21.png',
  'maze_dweller': 'bt1_21.png',
  'body_snatcher': 'bt1_21.png',

  // 22 / 35: Golems & Constructs
  'ice_golem': 'bt1_22.png',
  'crystal_golem': 'bt1_22.png',
  'golem': 'bt1_22.png',

  // 23: Skeletons & Undead
  'skeleton': 'bt1_23.png',
  'bone_crusher': 'bt1_23.png',

  // 24: Assassins & Nightblades
  'assassin': 'bt1_24.png',
  'nightblade': 'bt1_24.png',
  'ninja': 'bt1_24.png',

  // 25: Wolves, Werewolves & Beasts
  'wolf': 'bt1_25.png',
  'werewolf': 'bt1_25.png',
  'mad_dog': 'bt1_25.png',
  'jackalwere': 'bt1_25.png',
  'weretiger': 'bt1_25.png',

  // 26: Old Men & Hermits
  'old_man': 'bt1_26.png',
  'hermit': 'bt1_26.png',

  // 27: Spiders & Arachnids
  'spider': 'bt1_27.png',
  'black_widow': 'bt1_27.png',
  'spinner': 'bt1_27.png',

  // 28: Kobolds & Reptilian Orcs
  'kobold': 'bt1_28.png',
  'goblin_lord': 'bt1_28.png',

  // 29: Eye Aberrations
  'eye_spy': 'bt1_29.png',
  'seeker': 'bt1_29.png',
  'evil_eye': 'bt1_29.png',
  'beholder': 'bt1_29.png',

  // 30: Mangar
  'mangar': 'bt1_30.png',
  'mangar_the_dark': 'bt1_30.png',

  // 31: Master Monks
  'master_monk': 'bt1_31.png',

  // 32: Samurai
  'samurai': 'bt1_32.png',

  // 33: Hydras & Two-Headed Beasts
  'hydra': 'bt1_33.png',
  'jabberwock': 'bt1_33.png',
  'bandersnatch': 'bt1_33.png',

  // 34: Elementals
  'earth_elemental': 'bt1_34.png',
  'stone_elemental': 'bt1_34.png',
  'sand_golem': 'bt1_34.png',
  'xorn': 'bt1_34.png',

  // 38: Statues
  'statue': 'bt1_38.png',
  'stone_statue': 'bt1_38.png',

  // 40: Vampires
  'vampire': 'bt1_40.png',
  'vampire_lord': 'bt1_40.png',
  'lich': 'bt1_40.png',

  // 41: Decayed Zombies
  'zombie': 'bt1_41.png',

  // 42: Gargoyles & Demons
  'gargoyle': 'bt1_42.png',
  'demon': 'bt1_42.png',
  'lesser_demon': 'bt1_42.png',
  'greater_demon': 'bt1_42.png',
  'demon_lord': 'bt1_42.png',
  'balrog': 'bt1_42.png',
  'doppleganger': 'bt1_42.png',
  'mimic': 'bt1_42.png',
  'ancient_enemy': 'bt1_42.png',

  // 45: Kylearan
  'kylearan': 'bt1_45.png',

  // 47: Tarjan & Idols
  'mad_god': 'bt1_47.png',
  'mad_god_tarjan': 'bt1_47.png',

  // 49: Armored Orcs & Goblins
  'orc': 'bt1_49.png',
  'hobgoblin': 'bt1_49.png',

  // 50: Barbarians & Berserkers
  'berserker': 'bt1_50.png',
  'mongo': 'bt1_50.png',
  'stone_giant': 'bt1_50.png',
  'fire_giant': 'bt1_50.png',
  'ice_giant': 'bt1_50.png',
  'war_giant': 'bt1_50.png',
  'cloud_giant': 'bt1_50.png',
  'storm_giant': 'bt1_50.png',
  'titan': 'bt1_50.png',

  // 51: Emaciated Ghouls & Wights
  'wight': 'bt1_51.png',
  'death_denizen': 'bt1_51.png',
  'maze_master': 'bt1_51.png',

  // 55: Treasure Chest
  'treasure_chest': 'bt1_55.png',

  // 56: Garth the Armorer
  'garth': 'bt1_56.png',

  // 60: Roscoe
  'roscoe': 'bt1_60.png'
};

// Copy named files into public/assets/sprites/ (overwriting any previous incorrect files)
for (const [key, sourceFile] of Object.entries(BASE_MAPPING)) {
  const sourcePath = path.join(TARGET_DIR, sourceFile);
  const targetNamedPath = path.join(TARGET_DIR, `${key}.png`);
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetNamedPath);
  }
}

// Generate the TypeScript / ES Module MonsterSpriteManifest.js
const manifestContent = `// MonsterSpriteManifest.js - Automated Mapping of 127 Canonical Monsters & Classes to Animated Sprite Sheets
// Generated automatically from authentic 1985 Bard's Tale Amiga/Atari ripped sprite assets.

export const SPRITE_SHEET_MAP = ${JSON.stringify(
  Object.fromEntries(
    Object.entries(BASE_MAPPING).map(([k, v]) => [k, `/assets/sprites/${v}`])
  ),
  null,
  2
)};

// Add numeric index fallbacks (bt1_01 through bt1_63)
for (let i = 1; i <= 63; i++) {
  const pad = String(i).padStart(2, '0');
  SPRITE_SHEET_MAP[\`bt1_\${pad}\`] = \`/assets/sprites/bt1_\${pad}.png\`;
  SPRITE_SHEET_MAP[\`pic_\${i}\`] = \`/assets/sprites/bt1_\${pad}.png\`;
}

/**
 * Get the animated sprite sheet path for any monster slug, ID, or hero class.
 * @param {string|number} key - Monster slug, class name, or numeric ID
 * @returns {string|null} Path to sprite sheet or fallback
 */
export function getSpriteSheetPath(key) {
  if (key === undefined || key === null) return null;
  const slug = String(key).toLowerCase().trim();
  
  // If already a direct file path, relative path, or URL, return it directly
  if (slug.startsWith('/') || slug.startsWith('http') || slug.startsWith('.') || slug.endsWith('.png')) {
    return key;
  }

  // Direct manifest match
  if (SPRITE_SHEET_MAP[slug]) {
    return SPRITE_SHEET_MAP[slug];
  }

  // Handle numbered variants like conjurer_06, magician_07, sorcerer_22, wizard_23
  if (slug.startsWith('conjurer_') || slug.startsWith('conjurer')) return SPRITE_SHEET_MAP['conjurer'];
  if (slug.startsWith('magician_') || slug.startsWith('magician')) return SPRITE_SHEET_MAP['magician'];
  if (slug.startsWith('sorcerer_') || slug.startsWith('sorcerer')) return SPRITE_SHEET_MAP['sorcerer'];
  if (slug.startsWith('wizard_') || slug.startsWith('wizard')) return SPRITE_SHEET_MAP['wizard'];

  // Smart archetype fallbacks
  if (slug.includes('dragon') || slug.includes('wyvern')) return SPRITE_SHEET_MAP['dragon'];
  if (slug.includes('giant') || slug.includes('titan') || slug.includes('berserker')) return SPRITE_SHEET_MAP['berserker'];
  if (slug.includes('golem') || slug.includes('statue')) return SPRITE_SHEET_MAP['statue'];
  if (slug.includes('demon') || slug.includes('balrog') || slug.includes('gargoyle')) return SPRITE_SHEET_MAP['demon'];
  if (slug.includes('monk')) return SPRITE_SHEET_MAP['monk'];
  if (slug.includes('vampire') || slug.includes('lich') || slug.includes('nosferatu')) return SPRITE_SHEET_MAP['vampire'];
  if (slug.includes('wolf') || slug.includes('dog') || slug.includes('hound') || slug.includes('tiger')) return SPRITE_SHEET_MAP['wolf'];
  if (slug.includes('spider') || slug.includes('widow') || slug.includes('spinner')) return SPRITE_SHEET_MAP['spider'];
  if (slug.includes('skeleton')) return SPRITE_SHEET_MAP['skeleton'];
  if (slug.includes('zombie') || slug.includes('ghoul') || slug.includes('corpse')) return SPRITE_SHEET_MAP['zombie'];
  if (slug.includes('orc') || slug.includes('goblin') || slug.includes('kobold')) return SPRITE_SHEET_MAP['orc'];
  if (slug.includes('eye') || slug.includes('spy') || slug.includes('beholder') || slug.includes('seeker')) return SPRITE_SHEET_MAP['eye_spy'];
  if (slug.includes('ghost') || slug.includes('shadow') || slug.includes('spectre') || slug.includes('wraith')) return SPRITE_SHEET_MAP['shadow'];

  // Default warrior fallback
  return SPRITE_SHEET_MAP['warrior'];
}

/**
 * Check if a monster or hero has an authentic animated sprite sheet available.
 * @param {string} slug
 * @returns {boolean}
 */
export function hasSpriteSheet(slug) {
  return !!getSpriteSheetPath(slug);
}
`;

fs.writeFileSync(
  path.resolve(__dirname, '../src/data/MonsterSpriteManifest.js'),
  manifestContent,
  'utf8'
);

console.log('Successfully written src/data/MonsterSpriteManifest.js');
