// ItemDatabase.js - Complete Garth's Equipment Shoppe Inventory
// All basic items from the manual, organized by 10 categories.
// Items found in dungeons are added dynamically and remain only until sold.

export const ItemCategory = {
  WEAPON: 'WEAPON',
  SHIELD: 'SHIELD',
  ARMOR: 'ARMOR',
  HELM: 'HELM',
  GLOVES: 'GLOVES',
  INSTRUMENT: 'INSTRUMENT',
  FIGURINE: 'FIGURINE',
  RING: 'RING',
  WAND: 'WAND',
  MISC: 'MISC'
};

// Class groups for item restrictions
const FIGHTERS = ['Warrior', 'Paladin', 'Hunter', 'Monk', 'Bard'];
const ALL_FIGHTERS = ['Warrior', 'Paladin', 'Hunter', 'Monk', 'Bard', 'Rogue'];
const MAGIC_USERS = ['Conjurer', 'Magician', 'Sorcerer', 'Wizard'];
const ALL_CLASSES = [...ALL_FIGHTERS, ...MAGIC_USERS];
const NON_MAGE = ['Warrior', 'Paladin', 'Hunter', 'Monk', 'Bard', 'Rogue'];

/**
 * Garth's standard inventory — infinite supply of these basic items.
 * Unique dungeon items are tracked separately.
 */
export const GARTH_STANDARD_ITEMS = [
  // ─── Light Sources ──────────────────────────────────────────────────
  {
    name: 'Torch', category: ItemCategory.MISC, price: 5,
    usableBy: ALL_CLASSES, damage: 0, acBonus: 0,
    description: 'For light in dungeons.',
    effect: { type: 'light', radius: 2, duration: 'short' }
  },
  {
    name: 'Lamp', category: ItemCategory.MISC, price: 15,
    usableBy: ALL_CLASSES, damage: 0, acBonus: 0,
    description: 'Longer duration than a torch.',
    effect: { type: 'light', radius: 3, duration: 'medium' }
  },

  // ─── Weapons ────────────────────────────────────────────────────────
  {
    name: 'Dagger', category: ItemCategory.WEAPON, price: 15,
    usableBy: ALL_CLASSES, damage: 3, acBonus: 0,
    description: 'Usable by all, not too effective.'
  },
  {
    name: 'Short Sword', category: ItemCategory.WEAPON, price: 30,
    usableBy: [...NON_MAGE], damage: 5, acBonus: 0,
    description: 'A lighter sword, usable by all but mages.'
  },
  {
    name: 'Broadsword', category: ItemCategory.WEAPON, price: 60,
    usableBy: FIGHTERS, damage: 8, acBonus: 0,
    description: 'Most damaging non-magic sword, only usable by fighters.'
  },
  {
    name: 'War Axe', category: ItemCategory.WEAPON, price: 50,
    usableBy: ['Warrior', 'Paladin', 'Hunter', 'Monk'], damage: 9, acBonus: 0,
    description: 'A heavy, damaging weapon. Not usable by bards, rogues, or magic users.'
  },
  {
    name: 'Halberd', category: ItemCategory.WEAPON, price: 80,
    usableBy: ['Warrior', 'Paladin', 'Hunter'], damage: 12, acBonus: 0,
    description: 'A combination battle axe and pike, the most damaging non-magical weapon.'
  },
  {
    name: 'Mace', category: ItemCategory.WEAPON, price: 40,
    usableBy: [...NON_MAGE], damage: 7, acBonus: 0,
    description: 'The most powerful weapon a rogue can use; an armor crusher.'
  },
  {
    name: 'Staff', category: ItemCategory.WEAPON, price: 20,
    usableBy: ALL_CLASSES, damage: 4, acBonus: 0,
    description: 'A simple, non-magical cudgel.'
  },

  // ─── Shields ────────────────────────────────────────────────────────
  {
    name: 'Buckler', category: ItemCategory.SHIELD, price: 25,
    usableBy: NON_MAGE, damage: 0, acBonus: -1,
    description: 'A small round shield.'
  },
  {
    name: 'Tower Shield', category: ItemCategory.SHIELD, price: 70,
    usableBy: ['Warrior', 'Paladin'], damage: 0, acBonus: -3,
    description: 'A larger shield.'
  },

  // ─── Armor ──────────────────────────────────────────────────────────
  {
    name: 'Robes', category: ItemCategory.ARMOR, price: 10,
    usableBy: ALL_CLASSES, damage: 0, acBonus: 0,
    description: 'Will dull old knives, but that\'s it.'
  },
  {
    name: 'Leather Armor', category: ItemCategory.ARMOR, price: 40,
    usableBy: ['Warrior', 'Paladin', 'Hunter', 'Monk', 'Bard', 'Rogue'], damage: 0, acBonus: -2,
    description: 'The lightest armor, wearable by all but magicians and conjurers.'
  },
  {
    name: 'Chain Mail', category: ItemCategory.ARMOR, price: 80,
    usableBy: ['Warrior', 'Paladin', 'Hunter', 'Bard'], damage: 0, acBonus: -4,
    description: 'Light metal mesh armor, best against light weapons.'
  },
  {
    name: 'Scale Armor', category: ItemCategory.ARMOR, price: 120,
    usableBy: ['Warrior', 'Paladin', 'Hunter'], damage: 0, acBonus: -5,
    description: 'Better still, difficult to pierce.'
  },
  {
    name: 'Plate Armor', category: ItemCategory.ARMOR, price: 200,
    usableBy: ['Warrior', 'Paladin'], damage: 0, acBonus: -7,
    description: 'Strongest non-magical armor.'
  },

  // ─── Helms ──────────────────────────────────────────────────────────
  {
    name: 'Helm', category: ItemCategory.HELM, price: 30,
    usableBy: NON_MAGE, damage: 0, acBonus: -1,
    description: 'Covers the head and saves the adventurer\'s good looks.'
  },

  // ─── Gloves ─────────────────────────────────────────────────────────
  {
    name: 'Leather Gloves', category: ItemCategory.GLOVES, price: 15,
    usableBy: ALL_CLASSES, damage: 0, acBonus: 0,
    description: 'Some protection for the hands.'
  },
  {
    name: 'Gauntlets', category: ItemCategory.GLOVES, price: 50,
    usableBy: ['Warrior', 'Paladin', 'Hunter'], damage: 0, acBonus: -1,
    description: 'Metal gloves.'
  },

  // ─── Musical Instruments ────────────────────────────────────────────
  {
    name: 'Mandolin', category: ItemCategory.INSTRUMENT, price: 30,
    usableBy: ['Bard'], damage: 0, acBonus: 0,
    description: 'A stringed musical instrument for Bards.'
  },
  {
    name: 'Harp', category: ItemCategory.INSTRUMENT, price: 50,
    usableBy: ['Bard'], damage: 0, acBonus: 0,
    description: 'A graceful stringed instrument for Bards.'
  },
  {
    name: 'Flute', category: ItemCategory.INSTRUMENT, price: 25,
    usableBy: ['Bard'], damage: 0, acBonus: 0,
    description: 'A wind instrument for Bards.'
  }
];

/**
 * Check if a character class can use a given item.
 * @param {string} className
 * @param {object} item
 * @returns {boolean}
 */
export function canClassUseItem(className, item) {
  return item.usableBy.includes(className);
}

/**
 * Get all items in a specific category.
 * @param {string} category - ItemCategory value
 * @returns {object[]}
 */
export function getItemsByCategory(category) {
  return GARTH_STANDARD_ITEMS.filter(i => i.category === category);
}

/**
 * Get items a specific class can equip.
 * @param {string} className
 * @returns {object[]}
 */
export function getItemsForClass(className) {
  return GARTH_STANDARD_ITEMS.filter(i => canClassUseItem(className, i));
}

/**
 * Calculate a character's total AC from equipped items.
 * Base AC is 10 (unarmored, low dexterity). Lower is better.
 * @param {object} character
 * @param {object[]} equippedItems
 * @returns {number}
 */
export function calculateItemAC(equippedItems) {
  let acBonus = 0;
  for (const item of equippedItems) {
    acBonus += item.acBonus || 0;
  }
  return acBonus;
}

/**
 * Max items a character can carry.
 */
export const MAX_INVENTORY_SIZE = 8;
