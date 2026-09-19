// SkaraBraeMapData.js - Canonical 30x30 Skara Brae City Grid & Metadata Registry
// Source-derived from original 1985 Bard's Tale city layout.
// All static map data is deeply frozen and immutable at runtime.

/**
 * Terrain types
 * @enum {string}
 */
export const TerrainType = Object.freeze({
  STREET: 'street',
  WALL: 'wall',
  BUILDING: 'building',
  GATE: 'gate',
  UNKNOWN: 'unknown'
});

/**
 * Neutral Landmark IDs
 * @enum {string}
 */
export const LandmarkId = Object.freeze({
  GARTHS_SHOP: 'garths_shop',
  ADVENTURERS_GUILD: 'adventurers_guild',
  REVIEW_BOARD: 'review_board',
  ROSCOES_EMPORIUM: 'roscoes_emporium',
  GRAN_PLAZ: 'gran_plaz',
  CITY_GATE: 'city_gate',
  STABLES: 'stables',
  SCARLET_BARD: 'scarlet_bard',
  KYLEARANS_TOWER: 'kylearans_tower',
  HARKYNS_CASTLE: 'harkyns_castle',
  MANGARS_TOWER: 'mangars_tower',
  SEWERS_ENTRANCE: 'sewers_entrance',
  CREDITS_SQUARE: 'credits_square',
  TEMPLE_1: 'temple_1',
  TEMPLE_2: 'temple_2',
  TEMPLE_3: 'temple_3',
  TEMPLE_4: 'temple_4',
  TEMPLE_5: 'temple_5',
  TEMPLE_6: 'temple_6',
  TEMPLE_MAD_GOD: 'temple_mad_god',
  INN_1: 'inn_1',
  INN_2: 'inn_2',
  INN_3: 'inn_3',
  INN_4: 'inn_4',
  INN_5: 'inn_5',
  INN_6: 'inn_6'
});

export const MAP_WIDTH = 30;
export const MAP_HEIGHT = 30;
export const CELL_SIZE_METERS = 3.0;

// Approved Garth Exit Spawn point
export const GARTH_SPAWN = Object.freeze({
  sourceCell: Object.freeze({ x: 25, y: 18 }),
  worldPosition: Object.freeze({ x: 31.5, y: 0, z: -10.5 }),
  facing: 'west',
  yaw: Math.PI / 2
});

/**
 * Raw 30x30 ASCII map representation (Row 0 in string = Y=29 North, Row 29 in string = Y=0 South)
 * '#' = Wall/Building
 * '.' = Street
 */
const MAP_ASCII = [
  // Y=29 (North border)
  "##############################",
  // Y=28
  "#..#.........................#",
  // Y=27
  "#..#..#######.#######..#..##.#",
  // Y=26
  "#..#..#.....#.#.....#..#...#.#",
  // Y=25
  "#..#..#..#..#.#..#..#..#...#.#",
  // Y=24
  "#..#..#..#..#.#..#..#..#...#.#",
  // Y=23
  "#..####..####.####..#..#...#.#",
  // Y=22
  "#......................#...#.#",
  // Y=21
  "#.####.####.#.####.##..#...#.#",
  // Y=20
  "#.#..#.#..#.#.#..#.#...#...#.#",
  // Y=19
  "#.#..#.#..#.#.#..#.#...#...#.#",
  // Y=18
  "#.####.####.#.####.##..#...#.#",
  // Y=17
  "#...........#................#",
  // Y=16
  "#.#########.#.#########.#..#.#",
  // Y=15
  "..........#...#.......#.#..#.#",
  // Y=14
  "#.#########.###.#######.#..#.#",
  // Y=13
  "#...........#.#.......#.#..#.#",
  // Y=12
  "#.#########.#.#######.#.#..#.#",
  // Y=11
  "#.#.......#.#.........#.#..#.#",
  // Y=10
  "#.#.#####.#.###########.#..#.#",
  // Y=9
  "#.#.#...#.#...........#.#..#.#",
  // Y=8
  "#.#.#.#.#.#############.#..#.#",
  // Y=7
  "#.#.#.#.#.#...........#.#..#.#",
  // Y=6
  "#.#.#.#.#.#.#########.#.#..#.#",
  // Y=5
  "#.#.#.#.#.#.#.......#.#.#..#.#",
  // Y=4
  "#.#.#.#.#.#.#.#####.#.#.#..#.#",
  // Y=3
  "#.#.#.#.#.#.#.#...#.#.#.#..#.#",
  // Y=2
  "#.#.#.#.#.#.#.#.#.#.#.#.#..#.#",
  // Y=1
  "#...#...#...#...#...#.#.#..#.#",
  // Y=0 (South border)
  "#########################.####"
];

/**
 * Landmark & Special Marker definitions indexed by "x,y"
 */
const SOURCE_MARKERS = {
  "26,18": { landmarkId: LandmarkId.GARTHS_SHOP, sourceMarker: "G", terrain: TerrainType.BUILDING, walkable: false },
  "24,15": { landmarkId: LandmarkId.ADVENTURERS_GUILD, sourceMarker: "A", terrain: TerrainType.BUILDING, walkable: false },
  "23,20": { landmarkId: LandmarkId.REVIEW_BOARD, sourceMarker: "V", terrain: TerrainType.BUILDING, walkable: false },
  "23,19": { landmarkId: LandmarkId.INN_1, sourceMarker: "I-1", terrain: TerrainType.BUILDING, walkable: false },
  "12,21": { landmarkId: LandmarkId.ROSCOES_EMPORIUM, sourceMarker: "R", terrain: TerrainType.BUILDING, walkable: false },
  "28,27": { landmarkId: LandmarkId.KYLEARANS_TOWER, sourceMarker: "K", terrain: TerrainType.BUILDING, walkable: false, sourceNotes: ["><H from Harkyn's Castle level 3"] },
  "4,24": { landmarkId: LandmarkId.HARKYNS_CASTLE, sourceMarker: "H", terrain: TerrainType.BUILDING, walkable: false },
  "2,2": { landmarkId: LandmarkId.MANGARS_TOWER, sourceMarker: "M", terrain: TerrainType.BUILDING, walkable: false },
  "28,5": { landmarkId: LandmarkId.SCARLET_BARD, sourceMarker: "I", terrain: TerrainType.BUILDING, walkable: false, sourceNotes: ["Scarlet Bard / Wine Cellar"] },
  "0,15": { landmarkId: LandmarkId.CITY_GATE, sourceMarker: "gate", terrain: TerrainType.GATE, walkable: false, sourceNotes: ["City gates blocked by snow drift"] },
  "4,15": { landmarkId: LandmarkId.STABLES, sourceMarker: "stable", terrain: TerrainType.BUILDING, walkable: false, sourceNotes: ["Stables"] },
  "26,15": { landmarkId: LandmarkId.CREDITS_SQUARE, sourceMarker: "creds", terrain: TerrainType.BUILDING, walkable: false },
  "1,1": { landmarkId: LandmarkId.SEWERS_ENTRANCE, sourceMarker: "s|S", terrain: TerrainType.STREET, walkable: true, sourceNotes: ["Sewers - level 3 entrance"] },

  // Gran Plaz
  "14,15": { landmarkId: LandmarkId.GRAN_PLAZ, sourceMarker: "GP", terrain: TerrainType.STREET, walkable: true },
  "15,15": { landmarkId: LandmarkId.GRAN_PLAZ, sourceMarker: "GP", terrain: TerrainType.STREET, walkable: true },
  "16,15": { landmarkId: LandmarkId.GRAN_PLAZ, sourceMarker: "GP", terrain: TerrainType.STREET, walkable: true },

  // Temples
  "14,18": { landmarkId: LandmarkId.TEMPLE_1, sourceMarker: "T-1", terrain: TerrainType.BUILDING, walkable: false },
  "15,18": { landmarkId: LandmarkId.TEMPLE_1, sourceMarker: "T-1", terrain: TerrainType.BUILDING, walkable: false },
  "16,18": { landmarkId: LandmarkId.TEMPLE_1, sourceMarker: "T-1", terrain: TerrainType.BUILDING, walkable: false },
  "17,18": { landmarkId: LandmarkId.TEMPLE_1, sourceMarker: "T-1", terrain: TerrainType.BUILDING, walkable: false },

  "13,12": { landmarkId: LandmarkId.TEMPLE_2, sourceMarker: "T-2", terrain: TerrainType.BUILDING, walkable: false },
  "14,12": { landmarkId: LandmarkId.TEMPLE_2, sourceMarker: "T-2", terrain: TerrainType.BUILDING, walkable: false },
  "15,12": { landmarkId: LandmarkId.TEMPLE_2, sourceMarker: "T-2", terrain: TerrainType.BUILDING, walkable: false },
  "16,12": { landmarkId: LandmarkId.TEMPLE_2, sourceMarker: "T-2", terrain: TerrainType.BUILDING, walkable: false },

  "12,14": { landmarkId: LandmarkId.TEMPLE_3, sourceMarker: "T-3", terrain: TerrainType.BUILDING, walkable: false },
  "12,15": { landmarkId: LandmarkId.TEMPLE_3, sourceMarker: "T-3", terrain: TerrainType.BUILDING, walkable: false },
  "12,16": { landmarkId: LandmarkId.TEMPLE_3, sourceMarker: "T-3", terrain: TerrainType.BUILDING, walkable: false },
  "12,17": { landmarkId: LandmarkId.TEMPLE_3, sourceMarker: "T-3", terrain: TerrainType.BUILDING, walkable: false },

  "21,3": { landmarkId: LandmarkId.TEMPLE_4, sourceMarker: "T-4", terrain: TerrainType.BUILDING, walkable: false },
  "26,9": { landmarkId: LandmarkId.TEMPLE_5, sourceMarker: "T-5", terrain: TerrainType.BUILDING, walkable: false },
  "8,25": { landmarkId: LandmarkId.TEMPLE_6, sourceMarker: "T-6", terrain: TerrainType.BUILDING, walkable: false },

  "18,13": { landmarkId: LandmarkId.TEMPLE_MAD_GOD, sourceMarker: "T-M", terrain: TerrainType.BUILDING, walkable: false },
  "18,14": { landmarkId: LandmarkId.TEMPLE_MAD_GOD, sourceMarker: "T-M", terrain: TerrainType.BUILDING, walkable: false },
  "18,15": { landmarkId: LandmarkId.TEMPLE_MAD_GOD, sourceMarker: "T-M", terrain: TerrainType.BUILDING, walkable: false },
  "18,16": { landmarkId: LandmarkId.TEMPLE_MAD_GOD, sourceMarker: "T-M", terrain: TerrainType.BUILDING, walkable: false },

  // Inns
  "21,7": { landmarkId: LandmarkId.INN_2, sourceMarker: "I-2", terrain: TerrainType.BUILDING, walkable: false },
  "11,18": { landmarkId: LandmarkId.INN_3, sourceMarker: "I-3", terrain: TerrainType.BUILDING, walkable: false },
  "19,6": { landmarkId: LandmarkId.INN_4, sourceMarker: "I-4", terrain: TerrainType.BUILDING, walkable: false },
  "20,1": { landmarkId: LandmarkId.INN_5, sourceMarker: "I-5", terrain: TerrainType.BUILDING, walkable: false },
  "2,8": { landmarkId: LandmarkId.INN_6, sourceMarker: "I-6", terrain: TerrainType.BUILDING, walkable: false },

  // Guardians (Inert Metadata only in Phase A)
  "27,6": { sourceMarker: "S1", specialType: "guardian_samurai", terrain: TerrainType.STREET, walkable: true },
  "4,26": { sourceMarker: "S2", specialType: "guardian_stone_giant", terrain: TerrainType.STREET, walkable: true },
  "22,3": { sourceMarker: "S2", specialType: "guardian_stone_giant", terrain: TerrainType.STREET, walkable: true },
  "21,2": { sourceMarker: "S2", specialType: "guardian_stone_giant", terrain: TerrainType.STREET, walkable: true },
  "6,26": { sourceMarker: "S3", specialType: "guardian_stone_golem", terrain: TerrainType.STREET, walkable: true },
  "6,24": { sourceMarker: "S4", specialType: "guardian_grey_dragon", terrain: TerrainType.STREET, walkable: true },
  "3,14": { sourceMarker: "S5", specialType: "guardian_ogre_lord", terrain: TerrainType.STREET, walkable: true },
  "3,6": { sourceMarker: "S5", specialType: "guardian_ogre_lord", terrain: TerrainType.STREET, walkable: true },
  "6,6": { sourceMarker: "S5", specialType: "guardian_ogre_lord", terrain: TerrainType.STREET, walkable: true },
  "6,22": { sourceMarker: "S6", specialType: "guardian_golem", terrain: TerrainType.STREET, walkable: true },

  // Teleporters & Thin-line Boundaries (Inert & Unresolved in Phase A)
  "25,2": { sourceMarker: "<>", specialType: "teleport_out", unresolved: true, terrain: TerrainType.STREET, walkable: true },
  "25,7": { sourceMarker: "><", specialType: "teleport_in", unresolved: true, terrain: TerrainType.STREET, walkable: true },
  "25,27": { unresolved: true, sourceNotes: ["thin_line_boundary"], terrain: TerrainType.STREET, walkable: true },
  "27,24": { unresolved: true, sourceNotes: ["thin_line_boundary"], terrain: TerrainType.STREET, walkable: true },
  "2,4": { unresolved: true, sourceNotes: ["thin_line_boundary"], terrain: TerrainType.STREET, walkable: true },
  "5,2": { unresolved: true, sourceNotes: ["thin_line_boundary"], terrain: TerrainType.STREET, walkable: true }
};

/**
 * Generate and freeze the 30x30 Skara Brae grid cell database.
 */
function buildCanonicalGrid() {
  const grid = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row = [];
    const asciiRow = MAP_ASCII[29 - y]; // Y=29 is row 0 in ASCII array

    for (let x = 0; x < MAP_WIDTH; x++) {
      const char = asciiRow ? asciiRow[x] : '#';
      const key = `${x},${y}`;
      const markerData = SOURCE_MARKERS[key] || {};

      let terrain = markerData.terrain || (char === '#' ? TerrainType.WALL : TerrainType.STREET);
      let walkable = markerData.walkable !== undefined ? markerData.walkable : (terrain === TerrainType.STREET);

      const cell = {
        x,
        y,
        terrain,
        walkable,
        discoveredByDefault: false,
        ...(markerData.landmarkId ? { landmarkId: markerData.landmarkId } : {}),
        ...(markerData.sourceMarker ? { sourceMarker: markerData.sourceMarker } : {}),
        ...(markerData.specialType ? { specialType: markerData.specialType } : {}),
        ...(markerData.sourceNotes ? { sourceNotes: Object.freeze([...markerData.sourceNotes]) } : {}),
        ...(markerData.unresolved ? { unresolved: true } : {})
      };

      row.push(Object.freeze(cell));
    }
    grid.push(Object.freeze(row));
  }

  return Object.freeze(grid);
}

export const SKARA_BRAE_GRID = buildCanonicalGrid();

/**
 * Get cell at source grid coordinates (x: 0..29, y: 0..29).
 * Returns null if out of bounds.
 * @param {number} x
 * @param {number} y
 * @returns {object|null}
 */
export function getCell(x, y) {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
    return null;
  }
  return SKARA_BRAE_GRID[y][x];
}

/**
 * Check if source grid coordinate is walkable.
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
export function isWalkable(x, y) {
  const cell = getCell(x, y);
  return cell ? cell.walkable : false;
}

/**
 * Convert source grid coordinates (x, y) to 3D world space (X, Z).
 * @param {number} x - 0..29 (West to East)
 * @param {number} y - 0..29 (South to North)
 * @returns {{ worldX: number, worldZ: number, worldY: number }}
 */
export function sourceToWorld(x, y) {
  return {
    worldX: (x - 14.5) * CELL_SIZE_METERS,
    worldZ: (14.5 - y) * CELL_SIZE_METERS,
    worldY: 0.0
  };
}

/**
 * Convert 3D world space position (worldX, worldZ) to source grid coordinates (x, y).
 * @param {number} worldX
 * @param {number} worldZ
 * @returns {{ x: number, y: number, inBounds: boolean }}
 */
export function worldToSource(worldX, worldZ) {
  const x = Math.round(worldX / CELL_SIZE_METERS + 14.5);
  const y = Math.round(14.5 - worldZ / CELL_SIZE_METERS);
  const inBounds = x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT;

  return { x, y, inBounds };
}

/**
 * Find landmark cell by neutral landmark ID.
 * @param {string} landmarkId
 * @returns {object|null}
 */
export function getLandmarkCell(landmarkId) {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const cell = SKARA_BRAE_GRID[y][x];
      if (cell.landmarkId === landmarkId) {
        return cell;
      }
    }
  }
  return null;
}
