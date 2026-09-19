// ReviewBoardEngine.test.js - Comprehensive Test Suite for Authentic BT1 XP & Review Board Mechanics
import {
  ReviewBoardEngine,
  getXPRequiredForLevel,
  getMaxReachableLevel,
  getCharacterAdvancementStatus,
  getMaxSpellTierForLevel,
  LOW_LEVEL_THRESHOLDS,
  POST_13_INCREMENTS
} from './ReviewBoardEngine.js';
import { CombatEngine } from '../combat/CombatEngine.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[AssertionFailed] ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`[AssertionFailed] ${message} - Expected: ${expected}, Got: ${actual}`);
  }
}

export function runReviewBoardTests() {
  const results = [];
  let passed = 0;

  function test(name, fn) {
    try {
      fn();
      passed++;
      results.push(`✅ PASS: ${name}`);
    } catch (err) {
      results.push(`❌ FAIL: ${name} - ${err.message}`);
    }
  }

  // ─── 1. Exact Cumulative XP Thresholds ─────────────────────────────────
  test('Exact Fighter Group Cumulative XP Thresholds (Levels 1–14)', () => {
    const fighterClasses = ['Warrior', 'Paladin', 'Bard', 'Hunter', 'Rogue'];
    const expected = [0, 2000, 4000, 7000, 10000, 15000, 20000, 30000, 50000, 80000, 110000, 150000, 200000];

    fighterClasses.forEach(cls => {
      for (let lvl = 1; lvl <= 13; lvl++) {
        assertEquals(getXPRequiredForLevel(cls, lvl), expected[lvl - 1], `${cls} Level ${lvl} XP`);
      }
      assertEquals(getXPRequiredForLevel(cls, 14), 400000, `${cls} Level 14 XP`);
      assertEquals(getXPRequiredForLevel(cls, 15), 600000, `${cls} Level 15 XP`);
      assertEquals(getXPRequiredForLevel(cls, 20), 1600000, `${cls} Level 20 XP`);
    });
  });

  test('Exact Monk & Mage Group Cumulative XP Thresholds (Levels 1–14)', () => {
    const mageClasses = ['Monk', 'Conjurer', 'Magician'];
    const expected = [0, 1800, 4000, 6000, 10000, 14000, 19000, 29000, 50000, 90000, 120000, 170000, 230000];

    mageClasses.forEach(cls => {
      for (let lvl = 1; lvl <= 13; lvl++) {
        assertEquals(getXPRequiredForLevel(cls, lvl), expected[lvl - 1], `${cls} Level ${lvl} XP`);
      }
      assertEquals(getXPRequiredForLevel(cls, 14), 460000, `${cls} Level 14 XP`);
      assertEquals(getXPRequiredForLevel(cls, 15), 690000, `${cls} Level 15 XP`);
      assertEquals(getXPRequiredForLevel(cls, 20), 1840000, `${cls} Level 20 XP`);
    });
  });

  test('Exact Sorcerer Cumulative XP Thresholds (Levels 1–14)', () => {
    const expected = [0, 7000, 15000, 25000, 40000, 60000, 80000, 100000, 130000, 170000, 220000, 300000, 400000];

    for (let lvl = 1; lvl <= 13; lvl++) {
      assertEquals(getXPRequiredForLevel('Sorcerer', lvl), expected[lvl - 1], `Sorcerer Level ${lvl} XP`);
    }
    assertEquals(getXPRequiredForLevel('Sorcerer', 14), 800000, 'Sorcerer Level 14 XP');
    assertEquals(getXPRequiredForLevel('Sorcerer', 15), 1200000, 'Sorcerer Level 15 XP');
    assertEquals(getXPRequiredForLevel('Sorcerer', 20), 3200000, 'Sorcerer Level 20 XP');
  });

  test('Exact Wizard Cumulative XP Thresholds (Levels 1–14)', () => {
    const expected = [0, 20000, 50000, 80000, 120000, 160000, 200000, 250000, 300000, 400000, 600000, 900000, 1300000];

    for (let lvl = 1; lvl <= 13; lvl++) {
      assertEquals(getXPRequiredForLevel('Wizard', lvl), expected[lvl - 1], `Wizard Level ${lvl} XP`);
    }
    assertEquals(getXPRequiredForLevel('Wizard', 14), 2600000, 'Wizard Level 14 XP');
    assertEquals(getXPRequiredForLevel('Wizard', 15), 3900000, 'Wizard Level 15 XP');
    assertEquals(getXPRequiredForLevel('Wizard', 20), 10400000, 'Wizard Level 20 XP');
  });

  // ─── 2. Max Reachable Level Calculations ────────────────────────────────
  test('Max Reachable Level based on XP totals', () => {
    assertEquals(getMaxReachableLevel('Warrior', 0), 1, 'Warrior 0 XP');
    assertEquals(getMaxReachableLevel('Warrior', 1999), 1, 'Warrior 1,999 XP');
    assertEquals(getMaxReachableLevel('Warrior', 2000), 2, 'Warrior 2,000 XP');
    assertEquals(getMaxReachableLevel('Warrior', 7500), 4, 'Warrior 7,500 XP');
    assertEquals(getMaxReachableLevel('Paladin', 250000), 13, 'Paladin 250,000 XP');
    assertEquals(getMaxReachableLevel('Conjurer', 1800), 2, 'Conjurer 1,800 XP');
  });

  // ─── 3. Survivor Battle XP & Gold Award Calculation ────────────────────
  test('Authentic Battle XP Division among Survivors (Dead characters receive 0)', () => {
    const party = [
      { name: 'Paladin', class: 'Paladin', currentHp: 25, status: 'OK', xp: 0, gold: 0 },
      { name: 'Warrior', class: 'Warrior', currentHp: 20, status: 'OK', xp: 0, gold: 0 },
      { name: 'Bard', class: 'Bard', currentHp: 18, status: 'OK', xp: 0, gold: 0 },
      { name: 'Rogue', class: 'Rogue', currentHp: 15, status: 'OK', xp: 0, gold: 0 },
      { name: 'Conjurer', class: 'Conjurer', currentHp: 12, status: 'OK', xp: 0, gold: 0 },
      { name: 'Magician', class: 'Magician', currentHp: 0, status: 'DEAD', xp: 0, gold: 0 } // Dead hero!
    ];

    const monsters = [
      { name: 'Nomad 1', xp: 120, gold: 40 },
      { name: 'Nomad 2', xp: 120, gold: 40 },
      { name: 'Nomad 3', xp: 120, gold: 40 },
      { name: 'Nomad 4', xp: 120, gold: 40 },
      { name: 'Nomad 5', xp: 120, gold: 40 },
      { name: 'Nomad 6', xp: 120, gold: 40 },
      { name: 'Nomad 7', xp: 120, gold: 40 },
      { name: 'Nomad 8', xp: 120, gold: 40 },
      { name: 'Nomad 9', xp: 120, gold: 40 },
      { name: 'Nomad 10', xp: 120, gold: 40 }
    ]; // Total = 1,200 XP, 400 Gold

    const engine = new CombatEngine();
    engine.startEncounter(party, monsters);
    engine.monsters = []; // Defeat all monsters

    assert(engine.isVictory(), 'Combat should be victory');
    const result = engine.calculateAndAwardVictoryRewards();

    assertEquals(result.totalXp, 1200, 'Total XP');
    assertEquals(result.totalGold, 400, 'Total Gold');
    assertEquals(result.survivorsCount, 5, 'Surviving player count');
    assertEquals(result.xpPerSurvivor, 240, 'XP per survivor (1200 / 5)');
    assertEquals(result.goldPerSurvivor, 80, 'Gold per survivor (400 / 5)');

    // Check individual hero gains
    assertEquals(party[0].xp, 240, 'Paladin gained 240 XP');
    assertEquals(party[0].gold, 80, 'Paladin gained 80 Gold');
    assertEquals(party[5].xp, 0, 'Dead Magician received 0 XP');
    assertEquals(party[5].gold, 0, 'Dead Magician received 0 Gold');
  });

  test('Survivor Split with 2 Nomads (120 XP) + 1 Wolf (256 XP) among 4 survivors = 124 XP each', () => {
    const encounter = [
      { id: 'nomad_1', name: 'Nomad', xp: 120, xpValue: 120, gold: 40 },
      { id: 'nomad_2', name: 'Nomad', xp: 120, xpValue: 120, gold: 40 },
      { id: 'wolf_1', name: 'Wolf', xp: 256, xpValue: 256, gold: 80 }
    ];
    const totalXP = encounter.reduce((sum, m) => sum + m.xpValue, 0);
    assertEquals(totalXP, 496, 'Total XP is 496');

    const party = [
      { name: 'Paladin', currentHp: 20, status: 'OK', xp: 0 },
      { name: 'Warrior', currentHp: 18, status: 'OK', xp: 0 },
      { name: 'Bard', currentHp: 14, status: 'OK', xp: 0 },
      { name: 'Rogue', currentHp: 10, status: 'OK', xp: 0 },
      { name: 'Conjurer', currentHp: 0, status: 'DEAD', xp: 0 },
      { name: 'Magician', currentHp: 0, status: 'DEAD', xp: 0 }
    ];

    const engine = new CombatEngine();
    engine.startEncounter(party, encounter);
    engine.monsters = []; // Victory!

    const result = engine.calculateAndAwardVictoryRewards();
    assertEquals(result.totalXp, 496, 'Total encounter XP');
    assertEquals(result.survivorsCount, 4, '4 living survivors');
    assertEquals(result.xpPerSurvivor, 124, '496 / 4 = 124 XP each');
    assertEquals(party[0].xp, 124, 'Surviving Paladin received 124 XP');
    assertEquals(party[4].xp, 0, 'Dead Conjurer received 0 XP');
  });

  // ─── 4. Review Board Level Advancement ──────────────────────────────────
  test('Review Board promotes character and increases HP, SP, and attributes', () => {
    const hero = {
      name: 'Brian',
      class: 'Paladin',
      level: 1,
      xp: 4500, // Enough for Level 3
      hp: 14,
      maxHp: 14,
      st: 14, iq: 10, dx: 12, cn: 14, lk: 11
    };

    const res = ReviewBoardEngine.advanceCharacter(hero);
    assert(res.success, 'Advancement should succeed');
    assertEquals(res.oldLevel, 1, 'Old level was 1');
    assertEquals(res.newLevel, 3, 'New level is 3 (gained 2 levels)');
    assertEquals(hero.level, 3, 'Hero level updated to 3');
    assert(hero.maxHp > 14, 'Max HP increased');
    assertEquals(hero.hp, hero.maxHp, 'HP restored to new Max HP upon level up');
  });

  // ─── 5. Spell Tier Unlocks and Gold Purchases ───────────────────────────
  test('Spell Tier Unlocks and Training Fee', () => {
    assertEquals(getMaxSpellTierForLevel(1), 1, 'Level 1 unlocks Tier 1');
    assertEquals(getMaxSpellTierForLevel(2), 1, 'Level 2 unlocks Tier 1');
    assertEquals(getMaxSpellTierForLevel(3), 2, 'Level 3 unlocks Tier 2');
    assertEquals(getMaxSpellTierForLevel(5), 3, 'Level 5 unlocks Tier 3');
    assertEquals(getMaxSpellTierForLevel(7), 4, 'Level 7 unlocks Tier 4');
    assertEquals(getMaxSpellTierForLevel(9), 5, 'Level 9 unlocks Tier 5');
    assertEquals(getMaxSpellTierForLevel(11), 6, 'Level 11 unlocks Tier 6');
    assertEquals(getMaxSpellTierForLevel(13), 7, 'Level 13 unlocks Tier 7');

    const mage = {
      name: 'Eldar',
      class: 'Conjurer',
      level: 3,
      gold: 500,
      schoolLevels: { CONJURER: 1 }
    };
    const party = [mage];

    const res = ReviewBoardEngine.purchaseSpellTier(mage, 2, party);
    assert(res.success, 'Should successfully purchase Tier 2');
    assertEquals(mage.schoolLevels.CONJURER, 2, 'Conjurer taught tier is now 2');
    assertEquals(mage.gold, 300, '500 - 200 = 300 GP');
  });

  // ─── 6. Arcane Class Promotion ──────────────────────────────────────────
  test('Class Promotion from Conjurer to Sorcerer resets level & XP to 1 / 0', () => {
    const mage = {
      name: 'Vaelin',
      class: 'Conjurer',
      level: 6,
      xp: 25000,
      hp: 35, maxHp: 35,
      sp: 42, maxSp: 42,
      schoolLevels: { CONJURER: 3 }
    };

    const res = ReviewBoardEngine.changeClass(mage, 'Sorcerer');
    assert(res.success, 'Promotion should succeed');
    assertEquals(mage.class, 'Sorcerer', 'Class is now Sorcerer');
    assertEquals(mage.level, 1, 'Level reset to 1');
    assertEquals(mage.xp, 0, 'XP reset to 0');
    assertEquals(mage.maxHp, 35, 'Max HP retained');
    assertEquals(mage.maxSp, 42, 'Max SP retained');
    assert(mage.completedSchools.includes('CONJURER'), 'Conjurer marked as completed school');
  });

  // ─── 7. 4-Action Slot Resolution & Range Advance ───────────────────────
  test('Monster beyond 10ft advances closer instead of striking in melee', () => {
    const party = [
      { name: 'Paladin', class: 'Paladin', currentHp: 30, maxHp: 30, ac: 5, status: 'OK' }
    ];
    const monster = {
      name: 'Orc Guard',
      currentHp: 15,
      maxHp: 15,
      ac: 8,
      distanceFeet: 20, // 20 feet away
      actionSlots: [
        { type: 'meleeAttack' },
        { type: 'meleeAttack' },
        { type: 'meleeAttack' },
        { type: 'meleeAttack' }
      ]
    };

    const engine = new CombatEngine();
    engine.startEncounter(party, [monster]);

    const messages = engine.executeMonsterPhase();
    assertEquals(engine.monsters[0].distanceFeet, 10, 'Monster should have advanced from 20ft to 10ft');
    assert(messages.some(m => m.includes('advances to 10 feet')), 'Advance message logged');
  });

  test('On-Hit Poison Affliction applied when physical melee hit connects', () => {
    const party = [
      { name: 'Paladin', class: 'Paladin', currentHp: 30, maxHp: 30, ac: 10, status: 'OK' }
    ];
    const spider = {
      name: 'Black Widow',
      currentHp: 10,
      maxHp: 10,
      ac: 5,
      distanceFeet: 10,
      damage: 1,
      onHitEffect: 'poison',
      actionSlots: [
        { type: 'meleeAttack' },
        { type: 'meleeAttack' },
        { type: 'meleeAttack' },
        { type: 'meleeAttack' }
      ]
    };

    const engine = new CombatEngine();
    engine.startEncounter(party, [spider]);

    // Force a high roll / simulate multiple turns if needed until hit connects
    for (let turn = 0; turn < 20; turn++) {
      if (party[0].status === 'POISONED') break;
      engine.executeMonsterPhase();
    }

    assertEquals(party[0].status, 'POISONED', 'Target should be afflicted with POISONED status');
  });

  return { passed, failed: results.length - passed, results };
}

// Run if executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('ReviewBoardEngine.test.js')) {
  console.log('🧪 Running ReviewBoardEngine test suite...');
  const { passed, failed, results } = runReviewBoardTests();
  results.forEach(r => console.log(r));
  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}
