// SkaraBraeMapData.test.js - Focused unit tests for Skara Brae 30x30 Map & Grid
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SKARA_BRAE_GRID,
  MAP_WIDTH,
  MAP_HEIGHT,
  CELL_SIZE_METERS,
  GARTH_SPAWN,
  getCell,
  isWalkable,
  sourceToWorld,
  worldToSource,
  getLandmarkCell,
  LandmarkId,
  TerrainType
} from '../../data/SkaraBraeMapData.js';
import { SkaraBraeGrid } from '../../world/skara-brae/SkaraBraeGrid.js';

test('1. Grid dimensions are exactly 30 x 30', () => {
  assert.equal(MAP_WIDTH, 30);
  assert.equal(MAP_HEIGHT, 30);
  assert.equal(SKARA_BRAE_GRID.length, 30);
  for (let y = 0; y < 30; y++) {
    assert.equal(SKARA_BRAE_GRID[y].length, 30, `Row ${y} should have length 30`);
  }
});

test('2. Each coordinate (x, y) exists once and is unique', () => {
  const seen = new Set();
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const cell = SKARA_BRAE_GRID[y][x];
      assert.equal(cell.x, x);
      assert.equal(cell.y, y);

      const key = `${cell.x},${cell.y}`;
      assert.ok(!seen.has(key), `Duplicate coordinate detected at ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 900);
});

test('3. Source/world conversion is reversible for every map cell center', () => {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const { worldX, worldZ } = sourceToWorld(x, y);
      const converted = worldToSource(worldX, worldZ);

      assert.equal(converted.inBounds, true);
      assert.equal(converted.x, x, `X mismatch for (${x}, ${y}): got ${converted.x}`);
      assert.equal(converted.y, y, `Y mismatch for (${x}, ${y}): got ${converted.y}`);
    }
  }
});

test('4. Garth spawn is in bounds and walkable', () => {
  const { x, y } = GARTH_SPAWN.sourceCell;
  assert.equal(x, 25);
  assert.equal(y, 18);

  const cell = getCell(x, y);
  assert.ok(cell !== null);
  assert.equal(cell.walkable, true);
  assert.equal(cell.terrain, TerrainType.STREET);
  assert.equal(isWalkable(x, y), true);

  const { worldX, worldZ, worldY } = sourceToWorld(x, y);
  assert.equal(worldX, 31.5);
  assert.equal(worldZ, -10.5);
  assert.equal(worldY, 0.0);
  assert.equal(GARTH_SPAWN.facing, 'west');
  assert.equal(GARTH_SPAWN.yaw, Math.PI / 2);
});

test('5. Garth spawn is not a special/guardian/teleport/trap cell', () => {
  const cell = getCell(GARTH_SPAWN.sourceCell.x, GARTH_SPAWN.sourceCell.y);
  assert.ok(cell !== null);
  assert.equal(cell.specialType, undefined);
  assert.equal(cell.sourceMarker, undefined);
  assert.equal(cell.unresolved, undefined);
});

test('6. Source marker and landmark metadata remain inert', () => {
  const garthBuilding = getLandmarkCell(LandmarkId.GARTHS_SHOP);
  assert.ok(garthBuilding !== null);
  assert.equal(garthBuilding.x, 26);
  assert.equal(garthBuilding.y, 18);
  assert.equal(garthBuilding.sourceMarker, 'G');
  assert.equal(garthBuilding.walkable, false);

  const guild = getLandmarkCell(LandmarkId.ADVENTURERS_GUILD);
  assert.ok(guild !== null);
  assert.equal(guild.x, 24);
  assert.equal(guild.y, 15);
  assert.equal(guild.sourceMarker, 'A');

  // Verify samurai guardian cell metadata is plain inert data
  const samuraiCell = getCell(27, 6);
  assert.ok(samuraiCell !== null);
  assert.equal(samuraiCell.sourceMarker, 'S1');
  assert.equal(samuraiCell.specialType, 'guardian_samurai');
  assert.equal(typeof samuraiCell, 'object');
});

test('7. Fog reveal updates only the expected cell(s)', () => {
  const grid = new SkaraBraeGrid();
  assert.equal(grid.isExplored(25, 18), false);
  assert.equal(grid.isExplored(24, 18), false);

  // Reveal at Garth spawn world coordinates
  const result = grid.revealTile(31.5, -10.5);
  assert.deepEqual(result, { x: 25, y: 18 });
  assert.equal(grid.isExplored(25, 18), true);
  assert.equal(grid.isExplored(24, 18), false);
  assert.equal(grid.isExplored(25, 19), false);
});

test('8. Existing prototype grid behavior is replaced by 30x30 city grid', () => {
  const grid = new SkaraBraeGrid();
  assert.equal(grid.width, 30);
  assert.equal(grid.height, 30);
  assert.equal(grid.exploredGrid.length, 30);
  assert.equal(grid.exploredGrid[0].length, 30);
});

test('9. Map source data cannot mutate at runtime', () => {
  assert.ok(Object.isFrozen(SKARA_BRAE_GRID));
  assert.ok(Object.isFrozen(SKARA_BRAE_GRID[0]));
  assert.ok(Object.isFrozen(SKARA_BRAE_GRID[0][0]));
  assert.ok(Object.isFrozen(GARTH_SPAWN));
  assert.ok(Object.isFrozen(GARTH_SPAWN.sourceCell));
  assert.ok(Object.isFrozen(GARTH_SPAWN.worldPosition));

  // Attempting to mutate throws or is ignored in strict mode
  assert.throws(() => {
    SKARA_BRAE_GRID[0][0].walkable = true;
  }, /TypeError/);
});
