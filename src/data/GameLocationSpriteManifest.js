// GameLocationSpriteManifest.js - Mapping City Sanctuaries, NPCs, Statues & Environs to 1985 Sprites
// Authoritative asset mapping for all non-combat game systems in The Bard's Tale VR.

export const LOCATION_SPRITE_MAP = {
  // City Sanctuaries & Storefront NPCs
  'garth_shop': '/assets/sprites/bt1_31.png',
  'roscoe_emporium': '/assets/sprites/bt1_32.png',
  'tavern_keeper': '/assets/sprites/bt1_33.png',
  'adventurers_guild': '/assets/sprites/bt1_34.png',
  'review_board': '/assets/sprites/bt1_35.png',
  'temple_light': '/assets/sprites/bt1_36.png',
  'temple_tarjan': '/assets/sprites/bt1_37.png',
  'mad_god_tarjan': '/assets/sprites/bt1_29.png',
  'mangar_tower': '/assets/sprites/bt1_30.png',

  // Guardian Statues (S1 – S6)
  'statue_s1_samurai': '/assets/sprites/bt1_01.png',
  'statue_s2_stone_giant': '/assets/sprites/bt1_19.png',
  'statue_s3_stone_golem': '/assets/sprites/bt1_18.png',
  'statue_s4_grey_dragon': '/assets/sprites/bt1_27.png',
  'statue_s5_ogre_lord': '/assets/sprites/bt1_16.png',
  'statue_s6_guardian_golem': '/assets/sprites/bt1_18.png',

  // Environs, Dungeons & Special Encounters
  'magic_mouth': '/assets/sprites/bt1_38.png',
  'bronze_dragon': '/assets/sprites/bt1_39.png',
  'iron_golem': '/assets/sprites/bt1_40.png',
  'gran_plaz_monument': '/assets/sprites/bt1_02.png',
  'wine_cellar': '/assets/sprites/bt1_14.png',
  'catacombs': '/assets/sprites/bt1_09.png',
  'harkyn_castle': '/assets/sprites/bt1_19.png',
  'kylearan_tower': '/assets/sprites/bt1_08.png',
  'city_gates': '/assets/sprites/bt1_02.png'
};

/**
 * Get sprite sheet path for a game location, sanctuary NPC, or statue.
 * @param {string} locationKey
 * @returns {string}
 */
export function getLocationSpritePath(locationKey) {
  if (!locationKey) return '/assets/sprites/bt1_01.png';
  const key = String(locationKey).toLowerCase().trim();
  return LOCATION_SPRITE_MAP[key] || '/assets/sprites/bt1_01.png';
}
