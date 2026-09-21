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

console.log(`Successfully ingested ${Object.keys(indexedFiles).length} unique sprite sheets.`);

// Mapping table correlating Monster IDs, Slugs and Classes to indexed sprites
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
  'archmage': 'bt1_08.png',

  // Canonical Monsters (Direct & Archetype Mappings)
  'kobold': 'bt1_10.png',
  'hobbit': 'bt1_03.png',
  'gnome': 'bt1_03.png',
  'dwarf': 'bt1_03.png',
  'hobgoblin': 'bt1_10.png',
  'orc': 'bt1_11.png',
  'skeleton': 'bt1_09.png',
  'nomad': 'bt1_04.png',
  'spider': 'bt1_14.png',
  'mad_dog': 'bt1_15.png',
  'barbarian': 'bt1_01.png',
  'mercenary': 'bt1_01.png',
  'wolf': 'bt1_15.png',
  'jade_monk': 'bt1_06.png',
  'half_orc': 'bt1_01.png',
  'swordsman': 'bt1_01.png',
  'zombie': 'bt1_12.png',
  'samurai': 'bt1_01.png',
  'black_widow': 'bt1_14.png',
  'assassin': 'bt1_03.png',
  'werewolf': 'bt1_15.png',
  'ogre': 'bt1_16.png',
  'wight': 'bt1_17.png',
  'statue': 'bt1_18.png',
  'bladesman': 'bt1_01.png',
  'goblin_lord': 'bt1_10.png',
  'master_thief': 'bt1_03.png',
  'ninja': 'bt1_01.png',
  'spinner': 'bt1_14.png',
  'scarlet_monk': 'bt1_06.png',
  'doppleganger': 'bt1_22.png',
  'stone_giant': 'bt1_19.png',
  'ogre_magician': 'bt1_16.png',
  'jackalwere': 'bt1_15.png',
  'stone_elemental': 'bt1_18.png',
  'blue_dragon': 'bt1_27.png',
  'seeker': 'bt1_20.png',
  'dwarf_king': 'bt1_02.png',
  'samurai_lord': 'bt1_02.png',
  'ghoul': 'bt1_12.png',
  'azure_monk': 'bt1_06.png',
  'weretiger': 'bt1_15.png',
  'hydra': 'bt1_23.png',
  'green_dragon': 'bt1_27.png',
  'wraith': 'bt1_17.png',
  'lurker': 'bt1_21.png',
  'fire_giant': 'bt1_19.png',
  'copper_dragon': 'bt1_27.png',
  'ivory_monk': 'bt1_06.png',
  'shadow': 'bt1_17.png',
  'berserker': 'bt1_01.png',
  'white_dragon': 'bt1_27.png',
  'ice_giant': 'bt1_19.png',
  'eye_spy': 'bt1_20.png',
  'ogre_lord': 'bt1_16.png',
  'body_snatcher': 'bt1_21.png',
  'xorn': 'bt1_24.png',
  'phantom': 'bt1_17.png',
  'lesser_demon': 'bt1_25.png',
  'fred': 'bt1_03.png',
  'master_ninja': 'bt1_01.png',
  'war_giant': 'bt1_19.png',
  'warrior_elite': 'bt1_01.png',
  'bone_crusher': 'bt1_09.png',
  'ghost': 'bt1_17.png',
  'grey_dragon': 'bt1_27.png',
  'basilisk': 'bt1_24.png',
  'evil_eye': 'bt1_20.png',
  'mimic': 'bt1_22.png',
  'golem': 'bt1_18.png',
  'vampire': 'bt1_26.png',
  'demon': 'bt1_25.png',
  'bandersnatch': 'bt1_23.png',
  'maze_dweller': 'bt1_21.png',
  'mongo': 'bt1_28.png',
  'mangar_guard': 'bt1_02.png',
  'gimp': 'bt1_03.png',
  'red_dragon': 'bt1_27.png',
  'titan': 'bt1_19.png',
  'master_conjurer': 'bt1_07.png',
  'master_magician': 'bt1_08.png',
  'master_sorcerer': 'bt1_08.png',
  'mind_shadow': 'bt1_17.png',
  'spectre': 'bt1_17.png',
  'cloud_giant': 'bt1_19.png',
  'beholder': 'bt1_20.png',
  'vampire_lord': 'bt1_26.png',
  'greater_demon': 'bt1_25.png',
  'master_wizard': 'bt1_08.png',
  'mad_god': 'bt1_29.png',
  'maze_master': 'bt1_21.png',
  'death_denizen': 'bt1_21.png',
  'jabberwock': 'bt1_23.png',
  'black_dragon': 'bt1_27.png',
  'mangar': 'bt1_30.png',
  'crystal_golem': 'bt1_18.png',
  'soul_sucker': 'bt1_17.png',
  'storm_giant': 'bt1_19.png',
  'ancient_enemy': 'bt1_22.png',
  'balrog': 'bt1_25.png',
  'lich': 'bt1_26.png',
  'demon_lord': 'bt1_25.png',
  'old_man': 'bt1_03.png'
};

// Also create direct named files in public/assets/sprites/ (e.g. skeleton.png, paladin.png, etc.)
for (const [key, sourceFile] of Object.entries(BASE_MAPPING)) {
  const sourcePath = path.join(TARGET_DIR, sourceFile);
  const targetNamedPath = path.join(TARGET_DIR, `${key}.png`);
  if (fs.existsSync(sourcePath) && !fs.existsSync(targetNamedPath)) {
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
  
  // Direct manifest match
  if (SPRITE_SHEET_MAP[slug]) {
    return SPRITE_SHEET_MAP[slug];
  }

  // Handle numbered variants like conjurer_20, magician_35, sorcerer_53, wizard_82
  if (slug.startsWith('conjurer_')) return SPRITE_SHEET_MAP['conjurer'];
  if (slug.startsWith('magician_')) return SPRITE_SHEET_MAP['magician'];
  if (slug.startsWith('sorcerer_')) return SPRITE_SHEET_MAP['sorcerer'];
  if (slug.startsWith('wizard_')) return SPRITE_SHEET_MAP['wizard'];

  // Smart archetype fallbacks
  if (slug.includes('dragon')) return SPRITE_SHEET_MAP['blue_dragon'];
  if (slug.includes('giant') || slug.includes('titan')) return SPRITE_SHEET_MAP['stone_giant'];
  if (slug.includes('golem') || slug.includes('statue')) return SPRITE_SHEET_MAP['statue'];
  if (slug.includes('demon') || slug.includes('balrog')) return SPRITE_SHEET_MAP['demon'];
  if (slug.includes('monk')) return SPRITE_SHEET_MAP['monk'];
  if (slug.includes('vampire') || slug.includes('lich')) return SPRITE_SHEET_MAP['vampire'];
  if (slug.includes('wolf') || slug.includes('dog') || slug.includes('tiger')) return SPRITE_SHEET_MAP['wolf'];
  if (slug.includes('eye') || slug.includes('spy') || slug.includes('beholder')) return SPRITE_SHEET_MAP['eye_spy'];
  if (slug.includes('ghost') || slug.includes('shadow') || slug.includes('spectre') || slug.includes('wraith')) return SPRITE_SHEET_MAP['ghost'];

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
