// EncounterTables.js - 1985 C64 Bard's Tale I Encounter Tables & Forced Encounter Hash Map
// Authoritative tables parsed directly from bt1-encounter-tables.csv and bt1-forced-encounters.csv.

export const RAW_ENCOUNTER_TABLES_CSV = `table_id,zone_name,time_of_day,min_groups,max_groups,min_group_size,max_group_size,eligible_monster_ids,notes
SKARA_BRAE_DAY,Skara Brae Streets,day,1,1,1,6,"0,1,2,3,4,5,6,7,8,9,10,11,12,13,14",Single group only during daylight
SKARA_BRAE_NIGHT,Skara Brae Streets,night,1,4,2,8,"15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30",Multi-group night ambushes
WINE_CELLAR,Tavern Wine Cellar,any,1,3,1,6,"0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,19",Retains day pool but up to 3 groups
CATACOMBS_L1,Catacombs Floor 1,any,1,4,2,8,"15,18,19,20,25,27,29,31,32,33,34,38,39,41",Early dungeon crawl
CATACOMBS_L2_3,Catacombs Floors 2-3,any,1,4,2,8,"35,36,37,39,40,42,43,44,45,46,50,55,56,57,58,59",Mid dungeon monsters & dragons
HARKYNS_CASTLE,Harkyns Castle,any,1,4,2,10,"55,58,60,61,62,63,64,65,71,72,73,75,76,77,83,84,88,89",Castles and giants
KYLEARANS_TOWER,Kylearans Tower,any,1,4,2,10,"76,77,83,85,87,88,90,92,93,94,95,97,100,101,105,106",Arcane tower guardians
MANGARS_TOWER,Mangars Tower,any,1,4,2,12,"94,95,98,100,101,106,107,108,109,110,111,115,116,118,119,120,121,122,123,124,125",Endgame demons and master casters`;

export const RAW_FORCED_ENCOUNTERS_CSV = `encounter_id,location_zone,map_x,map_y,description,group_1_monster,group_1_count,group_2_monster,group_2_count,group_3_monster,group_3_count,group_4_monster,group_4_count
WINE_CELLAR_AMBUSH_1,wine_cellar,3,5,Wine Cellar ambush tile,Skeleton,4,Spider,3,Nomad,2,,
WINE_CELLAR_AMBUSH_2,wine_cellar,7,12,Wine Cellar barrel corner,Kobold,6,Wolf,2,,,,
SEWER_DRAGON_LAIR,sewers_l1,14,22,Sewers guardian,Blue Dragon,1,Stone Giant,2,,,,
KYLEARAN_BERSERKERS_99,kylearans_tower,0,15,Kylearan 99 Berserkers,Berserker,99,Berserker,99,Berserker,99,Berserker,99
MANGAR_GATE_DRAGONS,mangars_tower,11,11,Mangar gate guardians,Red Dragon,2,Storm Giant,4,,,,
MANGAR_FINAL_BATTLE,mangars_tower,15,15,Mangar final confrontation,Mangar,1,Vampire Lord,2,Demon Lord,1,,`;

/**
 * Standard CSV line tokenizer respecting quoted strings.
 * @param {string} line
 * @returns {string[]}
 */
export function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Normalizes zone identifier into standardized lower-case slug.
 * @param {string} zone
 * @returns {string}
 */
export function normalizeZoneName(zone) {
  if (!zone) return 'streets';
  const z = String(zone).toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (z.includes('skara') || z.includes('street')) return 'streets';
  if (z.includes('wine') || z.includes('cellar')) return 'wine_cellar';
  if (z.includes('catacomb') || z.includes('sewer')) {
    if (z.includes('2') || z.includes('3')) return 'catacombs_l2_3';
    return 'catacombs_l1';
  }
  if (z.includes('harkyn') || z.includes('castle')) return 'harkyns_castle';
  if (z.includes('kylearan')) return 'kylearans_tower';
  if (z.includes('mangar')) return 'mangars_tower';
  return z;
}

export const FORCED_MONSTER_ARCHETYPE_IDS = Object.freeze({
  'skeleton': 9,
  'spider': 11,
  'nomad': 10,
  'kobold': 0,
  'wolf': 15,
  'blue dragon': 46,
  'stone giant': 42,
  'berserker': 65,
  'red dragon': 100,
  'storm giant': 120,
  'mangar': 117,
  'vampire lord': 109,
  'demon lord': 125
});

/**
 * Look up canonical monster archetype ID by monster name.
 * @param {string} name
 * @returns {number|undefined}
 */
export function findMonsterArchetypeIdByName(name) {
  if (!name) return undefined;
  const search = name.trim().toLowerCase();
  return FORCED_MONSTER_ARCHETYPE_IDS[search];
}

/**
 * Parses bt1-encounter-tables.csv into a structured lookup dictionary.
 * @param {string} [csvText=RAW_ENCOUNTER_TABLES_CSV]
 * @returns {Record<string, Object>}
 */
export function parseEncounterTablesCsv(csvText = RAW_ENCOUNTER_TABLES_CSV) {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return {};

  const dictionary = {};

  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 8) continue;

    const [
      tableId,
      zoneName,
      timeOfDay,
      minGroupsStr,
      maxGroupsStr,
      minGroupSizeStr,
      maxGroupSizeStr,
      eligibleIdsStr,
      notes
    ] = parts;

    const eligibleArchetypeIds = eligibleIdsStr
      ? eligibleIdsStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
      : [];

    const entry = Object.freeze({
      id: tableId,
      tableId,
      zoneName,
      zone: normalizeZoneName(zoneName),
      timeOfDay: timeOfDay.toLowerCase(),
      minGroups: parseInt(minGroupsStr, 10),
      maxGroups: parseInt(maxGroupsStr, 10),
      minGroupSize: parseInt(minGroupSizeStr, 10),
      maxGroupSize: parseInt(maxGroupSizeStr, 10),
      eligibleMonsterArchetypeIds: Object.freeze([...eligibleArchetypeIds]),
      eligibleArchetypeIds: Object.freeze([...eligibleArchetypeIds]),
      notes: notes || ''
    });

    dictionary[tableId] = entry;
  }

  return Object.freeze(dictionary);
}

/**
 * Parses bt1-forced-encounters.csv into a spatial hash map keyed by {zone}_{x}_{y}.
 * @param {string} [csvText=RAW_FORCED_ENCOUNTERS_CSV]
 * @returns {{ byCoord: Map<string, Object>, byId: Map<string, Object> }}
 */
export function parseForcedEncountersCsv(csvText = RAW_FORCED_ENCOUNTERS_CSV) {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  const byCoord = new Map();
  const byId = new Map();

  if (lines.length <= 1) return { byCoord, byId };

  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 5) continue;

    const [
      encounterId,
      locationZone,
      mapXStr,
      mapYStr,
      description,
      g1Monster, g1CountStr,
      g2Monster, g2CountStr,
      g3Monster, g3CountStr,
      g4Monster, g4CountStr
    ] = parts;

    const mapX = parseInt(mapXStr, 10);
    const mapY = parseInt(mapYStr, 10);
    const zoneKey = locationZone.toLowerCase().trim();

    const groups = [];
    const rawGroups = [
      { name: g1Monster, count: parseInt(g1CountStr, 10) },
      { name: g2Monster, count: parseInt(g2CountStr, 10) },
      { name: g3Monster, count: parseInt(g3CountStr, 10) },
      { name: g4Monster, count: parseInt(g4CountStr, 10) }
    ];

    rawGroups.forEach(rg => {
      if (rg.name && !isNaN(rg.count) && rg.count > 0) {
        const archetypeId = findMonsterArchetypeIdByName(rg.name);
        groups.push(Object.freeze({
          monsterName: rg.name,
          name: rg.name,
          count: rg.count,
          quantity: rg.count,
          archetypeId: archetypeId !== undefined ? archetypeId : undefined
        }));
      }
    });

    const encounterRecord = Object.freeze({
      id: encounterId,
      encounterId,
      zone: zoneKey,
      locationZone: zoneKey,
      mapX,
      mapY,
      x: mapX,
      y: mapY,
      description: description || '',
      groups: Object.freeze(groups)
    });

    // Primary spatial key: {zone}_{x}_{y}
    const coordKey = `${zoneKey}_${mapX}_${mapY}`;
    byCoord.set(coordKey, encounterRecord);

    // Also alias normalized variations (e.g. sewers_l1 <-> catacombs_l1)
    const normZone = normalizeZoneName(zoneKey);
    if (normZone !== zoneKey) {
      byCoord.set(`${normZone}_${mapX}_${mapY}`, encounterRecord);
    }
    if (zoneKey === 'sewers_l1') {
      byCoord.set(`catacombs_l1_${mapX}_${mapY}`, encounterRecord);
    }

    byId.set(encounterId, encounterRecord);
  }

  return { byCoord, byId };
}

// ── Built-in Lookup Maps ───────────────────────────────────────────────────

export const ENCOUNTER_TABLES = parseEncounterTablesCsv(RAW_ENCOUNTER_TABLES_CSV);
const parsedForced = parseForcedEncountersCsv(RAW_FORCED_ENCOUNTERS_CSV);
export const FORCED_ENCOUNTERS = parsedForced.byCoord;
export const FORCED_ENCOUNTERS_BY_ID = parsedForced.byId;

/**
 * Retrieves an encounter table by its exact table ID.
 * @param {string} tableId
 * @returns {Object|undefined}
 */
export function getEncounterTable(tableId) {
  return ENCOUNTER_TABLES[tableId];
}

/**
 * Selects an appropriate encounter table mapped by Zone and Time of Day.
 * @param {string} [zone='streets']
 * @param {string|boolean} [timeOfDayOrIsNight='day']
 * @returns {Object}
 */
export function getTableByZoneAndTime(zone = 'streets', timeOfDayOrIsNight = 'day') {
  const isNight = timeOfDayOrIsNight === true || String(timeOfDayOrIsNight).toLowerCase() === 'night';
  const norm = normalizeZoneName(zone);

  if (norm === 'wine_cellar') {
    return ENCOUNTER_TABLES.WINE_CELLAR;
  }
  if (norm === 'catacombs_l1') {
    return ENCOUNTER_TABLES.CATACOMBS_L1;
  }
  if (norm === 'catacombs_l2_3') {
    return ENCOUNTER_TABLES.CATACOMBS_L2_3;
  }
  if (norm === 'harkyns_castle') {
    return ENCOUNTER_TABLES.HARKYNS_CASTLE;
  }
  if (norm === 'kylearans_tower') {
    return ENCOUNTER_TABLES.KYLEARANS_TOWER;
  }
  if (norm === 'mangars_tower') {
    return ENCOUNTER_TABLES.MANGARS_TOWER;
  }

  // Default to Skara Brae Streets
  return isNight ? ENCOUNTER_TABLES.SKARA_BRAE_NIGHT : ENCOUNTER_TABLES.SKARA_BRAE_DAY;
}

/**
 * Look up a forced encounter by zone and map coordinates.
 * @param {string} zone
 * @param {number} x
 * @param {number} y
 * @returns {Object|undefined}
 */
export function getForcedEncounter(zone, x, y) {
  if (typeof x !== 'number' || typeof y !== 'number') return undefined;
  const rawKey = `${String(zone).toLowerCase().trim()}_${x}_${y}`;
  if (FORCED_ENCOUNTERS.has(rawKey)) return FORCED_ENCOUNTERS.get(rawKey);

  const normKey = `${normalizeZoneName(zone)}_${x}_${y}`;
  return FORCED_ENCOUNTERS.get(normKey);
}

/**
 * Look up a forced encounter by its unique ID.
 * @param {string} encounterId
 * @returns {Object|undefined}
 */
export function getForcedEncounterById(encounterId) {
  return FORCED_ENCOUNTERS_BY_ID.get(encounterId);
}
