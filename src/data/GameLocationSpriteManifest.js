// GameLocationSpriteManifest.js - Mapping City Sanctuaries, NPCs, Statues & Environs to 1985 Sprites
// Authoritative asset mapping for all non-combat game systems in The Bard's Tale VR.
// Visually verified from authentic 1985 Interplay Amiga/Atari asset rips.

export const LOCATION_SPRITE_MAP = {
  // City Sanctuaries & Storefront NPCs
  'garth_shop': '/assets/sprites/bt1_56.png',         // Garth the Armorer at his equipment counter
  'garth_shop_exterior': '/assets/sprites/bt1_46.png',// Garth's Weapons & Wonders storefront with crossed swords sign
  'roscoe_emporium': '/assets/sprites/bt1_60.png',    // Roscoe the Mage in green robe petting black cat at counter
  'tavern_keeper': '/assets/sprites/bt1_63.png',      // The Dragon's Grog barkeep under dragon trophy ("2 DRINK MINIMUM")
  'tavern_interior': '/assets/sprites/bt1_48.png',    // Tavern interior with fireplace, patrons, and bard playing lute
  'tavern_exterior': '/assets/sprites/bt1_44.png',    // The Scarlet Bard exterior with hanging wine glass sign
  'adventurers_guild': '/assets/sprites/bt1_53.png',  // Adventurers Guild exterior with "AG" shield sign
  'review_board': '/assets/sprites/bt1_57.png',       // Review Board magistrates seated at high tribunal bench
  'review_board_elder': '/assets/sprites/bt1_16.png', // Scribe / Elder holding parchment scroll and raven feather
  'review_board_archmage': '/assets/sprites/bt1_54.png', // Elder wizard in purple robes with white beard
  'temple_light': '/assets/sprites/bt1_59.png',       // Chanting brown-hooded priests at Temple of Divine Light
  'temple_tarjan': '/assets/sprites/bt1_47.png',      // Golden Bronze Idol of Tarjan with single ruby eye and empty socket
  'mad_god_tarjan': '/assets/sprites/bt1_47.png',     // Tarjan Idol
  'mangar_tower': '/assets/sprites/bt1_30.png',       // Mangar the Dark raising arms in invocation
  'kylearan_tower': '/assets/sprites/bt1_45.png',     // Kylearan the Archmage with third-eye jeweled headdress
  'harkyn_castle': '/assets/sprites/bt1_36.png',      // Baron Harkyn's Castle exterior with blue conical spires
  'throne_room': '/assets/sprites/bt1_61.png',        // Imperial Throne Room with golden throne and purple carpet

  // City Gates, Portals & Environs
  'city_gates': '/assets/sprites/bt1_37.png',         // Ornate black wrought iron city gates with stone pillars
  'city_portcullis': '/assets/sprites/bt1_39.png',    // Heavy arched timber portcullis gate with winch cables
  'gran_plaz_monument': '/assets/sprites/bt1_38.png', // Granite warrior monument statue on pedestal
  'empty_building': '/assets/sprites/bt1_62.png',     // Empty building interior with wooden roof rafters and table
  'treasure_chest': '/assets/sprites/bt1_55.png',     // Padlocked iron-banded dungeon treasure chest
  'spinner_tile': '/assets/sprites/bt1_58.png',       // Swirling green concentric stone sewer vortex / spinner
  'wine_cellar': '/assets/sprites/bt1_13.png',        // Subterranean green masonry chamber / pit trap
  'catacombs': '/assets/sprites/bt1_13.png',          // Catacombs subterranean stone hall

  // Guardian Statues (S1 – S6)
  'statue_s1_samurai': '/assets/sprites/bt1_32.png',         // Samurai in blue armor drawing katana
  'statue_s2_stone_giant': '/assets/sprites/bt1_50.png',     // Barbarian Berserker / Giant with golden helm
  'statue_s3_stone_golem': '/assets/sprites/bt1_38.png',     // Carved stone warrior statue on pedestal
  'statue_s4_grey_dragon': '/assets/sprites/bt1_14.png',     // Crouching green winged dragon
  'statue_s5_ogre_lord': '/assets/sprites/bt1_15.png',       // Green troll / ogre with fur ruff
  'statue_s6_guardian_golem': '/assets/sprites/bt1_34.png',  // Earth Elemental / sand golem

  // Backward compatibility aliases
  'bronze_dragon': '/assets/sprites/bt1_14.png',
  'iron_golem': '/assets/sprites/bt1_38.png',
  'magic_mouth': '/assets/sprites/bt1_38.png'
};

/**
 * Get sprite sheet path for a game location, sanctuary NPC, or statue.
 * @param {string} locationKey
 * @returns {string}
 */
export function getLocationSpritePath(locationKey) {
  if (!locationKey) return '/assets/sprites/bt1_56.png';
  const key = String(locationKey).toLowerCase().trim();
  return LOCATION_SPRITE_MAP[key] || '/assets/sprites/bt1_56.png';
}
