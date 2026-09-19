// CharacterCardUI.js - Full Character Cards & Inventory Management System
import { autoEquipCharacter, autoEquipParty, canClassUseItem, ItemCategory, MAX_INVENTORY_SIZE } from '../data/ItemDatabase.js';
import { getXPForNextLevel } from '../data/RaceClassData.js';

export class CharacterCardUI {
  constructor(party, onInventoryChanged) {
    this.party = party || [];
    this.onInventoryChanged = onInventoryChanged;
    this.selectedHeroIndex = 0;
    this.isOpen = false;

    this.createUIElements();
  }

  setParty(party) {
    this.party = party || [];
    if (this.selectedHeroIndex >= this.party.length) {
      this.selectedHeroIndex = Math.max(0, this.party.length - 1);
    }
    if (this.isOpen) {
      this.render();
    }
  }

  createUIElements() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'character-cards-overlay hidden';
    this.overlay.id = 'character-cards-modal';

    this.overlay.innerHTML = `
      <div class="character-cards-modal glass-panel">
        <div class="modal-header">
          <div class="header-title-group">
            <h2>📜 CHARACTER CARDS & INVENTORY</h2>
            <span class="header-subtitle">Garth's Equipment Shoppe & Party Ledger</span>
          </div>
          <div class="header-actions">
            <button id="card-auto-equip-party-btn" class="action-btn gold-btn">🛡️ Auto-Equip Entire Party</button>
            <button id="close-cards-btn" class="close-modal-btn">&times;</button>
          </div>
        </div>

        <!-- Hero Selector Tabs -->
        <div class="hero-selector-bar" id="hero-selector-bar"></div>

        <!-- Main Character Card Body -->
        <div class="card-content-grid" id="card-content-grid"></div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this.bindEvents();
  }

  bindEvents() {
    this.overlay.querySelector('#close-cards-btn').addEventListener('click', () => this.hide());
    this.overlay.querySelector('#card-auto-equip-party-btn').addEventListener('click', () => {
      autoEquipParty(this.party);
      if (this.onInventoryChanged) {
        this.onInventoryChanged('🛡️ Entire party outfitted with mid-grade arms, armor & torches!');
      }
      this.render();
    });

    // Close on backdrop click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
  }

  show(party, heroIndex = 0) {
    if (party) this.party = party;
    this.selectedHeroIndex = Math.min(Math.max(0, heroIndex), Math.max(0, this.party.length - 1));
    this.isOpen = true;
    this.overlay.classList.remove('hidden');
    this.render();
  }

  hide() {
    this.isOpen = false;
    this.overlay.classList.add('hidden');
  }

  toggle(party, heroIndex = 0) {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show(party, heroIndex);
    }
  }

  render() {
    const heroBar = this.overlay.querySelector('#hero-selector-bar');
    const contentGrid = this.overlay.querySelector('#card-content-grid');
    if (!heroBar || !contentGrid) return;

    // 1. Render Hero Tabs
    heroBar.innerHTML = '';
    this.party.forEach((hero, idx) => {
      const tab = document.createElement('button');
      tab.className = `hero-tab-btn ${idx === this.selectedHeroIndex ? 'active' : ''}`;
      const statusIcon = hero.status === 'POISONED' ? '🤢 ' : hero.status === 'CURSED' ? '🔮 ' : '';
      tab.innerHTML = `
        <span class="tab-hero-name">${statusIcon}${hero.name}</span>
        <span class="tab-hero-class">${hero.race || 'Human'} ${hero.class} (Lv ${hero.level || 1})</span>
      `;
      tab.addEventListener('click', () => {
        this.selectedHeroIndex = idx;
        this.render();
      });
      heroBar.appendChild(tab);
    });

    const hero = this.party[this.selectedHeroIndex];
    if (!hero) {
      contentGrid.innerHTML = `
        <div class="empty-roster-msg">
          <p>No heroes currently in party. Visit the Bard in Skara Brae Tavern to assemble your party!</p>
        </div>
      `;
      return;
    }

    if (!hero.equipped) hero.equipped = {};
    if (!hero.inventory) hero.inventory = [];

    // Class art path & fallback badge
    const classKey = (hero.class || 'warrior').toLowerCase();
    const classIcon = this.getClassIcon(hero.class);

    // 2. Render Selected Hero Card
    contentGrid.innerHTML = `
      <!-- Left Column: Portrait & Core Attributes -->
      <div class="card-left-col">
        <div class="portrait-frame">
          <img src="/assets/portraits/${classKey}.png" alt="${hero.class}" class="class-portrait-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <div class="class-portrait-fallback" style="display: none;">
            <span class="fallback-icon">${classIcon}</span>
            <span class="fallback-label">${hero.class}</span>
          </div>
          <div class="portrait-badge">${hero.class.toUpperCase()}</div>
        </div>

        <div class="hero-identity-box">
          <h3 class="hero-name">${hero.name}</h3>
          <div class="hero-meta">${hero.race || 'Human'} ${hero.class} • Level ${hero.level || 1}</div>
          <div class="hero-status-pill status-${(hero.status || 'ALIVE').toLowerCase()}">
            Status: ${hero.status || 'ALIVE'}
          </div>
        </div>

        <!-- Vital Bars -->
        <div class="vital-bars-section">
          <div class="vital-row">
            <span class="vital-label">HP:</span>
            <div class="vital-bar-track">
              <div class="vital-bar-fill hp-fill" style="width: ${Math.min(100, Math.round((hero.hp / Math.max(1, hero.maxHP || hero.hp)) * 100))}%;"></div>
            </div>
            <span class="vital-val">${hero.hp} / ${hero.maxHP || hero.hp}</span>
          </div>

          <div class="vital-row">
            <span class="vital-label">SP:</span>
            <div class="vital-bar-track">
              <div class="vital-bar-fill sp-fill" style="width: ${Math.min(100, Math.round((hero.sp / Math.max(1, hero.maxSP || Math.max(1, hero.sp))) * 100))}%;"></div>
            </div>
            <span class="vital-val">${hero.sp || 0} / ${hero.maxSP || hero.sp || 0}</span>
          </div>

          <div class="vital-row">
            <span class="vital-label">XP:</span>
            <div class="vital-bar-track">
              <div class="vital-bar-fill" style="background: linear-gradient(90deg, #d97706, #facc15); width: ${Math.min(100, Math.round(((hero.xp || 0) / Math.max(1, getXPForNextLevel(hero.class, hero.level || 1))) * 100))}%;"></div>
            </div>
            <span class="vital-val">${(hero.xp || 0).toLocaleString()} / ${getXPForNextLevel(hero.class, hero.level || 1).toLocaleString()}</span>
          </div>

          <div class="vital-row">
            <span class="vital-label">AC:</span>
            <span class="ac-badge">Shield [ ${hero.ac ?? 10} ]</span>
            <span class="gold-badge">🪙 ${(hero.gold || 0).toLocaleString()} Gold</span>
          </div>
        </div>

        <!-- Attribute Badges -->
        <div class="attributes-grid">
          <div class="attr-pill"><span class="attr-name">ST:</span> <span class="attr-val">${hero.stats?.st || hero.st || 12}</span></div>
          <div class="attr-pill"><span class="attr-name">IQ:</span> <span class="attr-val">${hero.stats?.iq || hero.iq || 12}</span></div>
          <div class="attr-pill"><span class="attr-name">DX:</span> <span class="attr-val">${hero.stats?.dx || hero.dx || 12}</span></div>
          <div class="attr-pill"><span class="attr-name">CN:</span> <span class="attr-val">${hero.stats?.cn || hero.cn || 12}</span></div>
          <div class="attr-pill"><span class="attr-name">LK:</span> <span class="attr-val">${hero.stats?.lk || hero.lk || 12}</span></div>
        </div>

        <div class="single-auto-equip-box">
          <button id="auto-equip-single-btn" class="action-btn gold-btn full-w-btn">
            🛡️ Auto-Equip ${hero.name}
          </button>
        </div>
      </div>

      <!-- Right Column: Equipped Gear & Backpack Inventory -->
      <div class="card-right-col">
        <!-- Equipped Slots -->
        <div class="section-box">
          <h4 class="section-title">⚔️ EQUIPPED GEAR (6 Slots)</h4>
          <div class="equipped-slots-grid">
            ${this.renderEquippedSlot(hero, 'weapon', '🗡️ Weapon', 'None equipped')}
            ${this.renderEquippedSlot(hero, 'shield', '🛡️ Shield', 'None equipped')}
            ${this.renderEquippedSlot(hero, 'armor', '🥋 Armor', 'None (AC 10)')}
            ${this.renderEquippedSlot(hero, 'helm', '🪖 Helm', 'None equipped')}
            ${this.renderEquippedSlot(hero, 'gloves', '🧤 Gloves', 'None equipped')}
            ${this.renderEquippedSlot(hero, 'instrument', '🪕 Instrument', 'None equipped (Bards)')}
          </div>
        </div>

        <!-- Backpack Inventory -->
        <div class="section-box" style="margin-top: 14px;">
          <div class="backpack-header">
            <h4 class="section-title">🎒 BACKPACK INVENTORY (${hero.inventory.length} / ${MAX_INVENTORY_SIZE})</h4>
          </div>
          <div class="inventory-slots-grid">
            ${this.renderBackpackSlots(hero)}
          </div>
        </div>
      </div>
    `;

    this.attachCardEventListeners(hero);
  }

  renderEquippedSlot(hero, slotKey, slotLabel, emptyText) {
    const item = hero.equipped && hero.equipped[slotKey];
    if (!item) {
      return `
        <div class="equip-slot-card empty">
          <div class="slot-header"><span class="slot-label">${slotLabel}</span></div>
          <div class="slot-item-name">${emptyText}</div>
        </div>
      `;
    }

    const bonus = item.damage ? `(+${item.damage} DMG)` : item.acBonus ? `(${item.acBonus} AC)` : '';
    return `
      <div class="equip-slot-card filled">
        <div class="slot-header">
          <span class="slot-label">${slotLabel}</span>
          <button class="slot-action-btn unequip-btn" data-slot="${slotKey}">Unequip</button>
        </div>
        <div class="slot-item-name">${item.name} <span class="slot-bonus">${bonus}</span></div>
      </div>
    `;
  }

  renderBackpackSlots(hero) {
    const slots = [];
    for (let i = 0; i < MAX_INVENTORY_SIZE; i++) {
      const item = hero.inventory[i];
      if (item) {
        const bonus = item.damage ? `+${item.damage} DMG` : item.acBonus ? `${item.acBonus} AC` : item.category === ItemCategory.MISC ? 'Light' : '';
        slots.push(`
          <div class="backpack-slot-card filled">
            <div class="item-info">
              <span class="item-name">${item.name}</span>
              <span class="item-tag">${bonus}</span>
            </div>
            <div class="item-actions">
              <button class="item-btn equip-item-btn" data-idx="${i}">Equip</button>
              <button class="item-btn drop-item-btn" data-idx="${i}">Drop</button>
            </div>
          </div>
        `);
      } else {
        slots.push(`
          <div class="backpack-slot-card empty">
            <span class="empty-slot-text">Empty Slot ${i + 1}</span>
          </div>
        `);
      }
    }
    return slots.join('');
  }

  attachCardEventListeners(hero) {
    // Single Auto-Equip
    const singleBtn = this.overlay.querySelector('#auto-equip-single-btn');
    if (singleBtn) {
      singleBtn.addEventListener('click', () => {
        autoEquipCharacter(hero);
        if (this.onInventoryChanged) {
          this.onInventoryChanged(`🛡️ ${hero.name} (${hero.class}) outfitted with class gear!`);
        }
        this.render();
      });
    }

    // Unequip Buttons
    this.overlay.querySelectorAll('.unequip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slot = e.target.dataset.slot;
        const item = hero.equipped[slot];
        if (item) {
          if (hero.inventory.length < MAX_INVENTORY_SIZE) {
            hero.inventory.push(item);
            delete hero.equipped[slot];
            if (slot === 'weapon') hero.weapon = 'Fists';
            if (this.onInventoryChanged) {
              this.onInventoryChanged(`Unequipped ${item.name}`);
            }
            this.render();
          } else {
            if (this.onInventoryChanged) {
              this.onInventoryChanged(`❌ Backpack is full! Cannot unequip ${item.name}`);
            }
          }
        }
      });
    });

    // Equip from Backpack
    this.overlay.querySelectorAll('.equip-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const item = hero.inventory[idx];
        if (item) {
          if (!canClassUseItem(hero.class, item)) {
            if (this.onInventoryChanged) {
              this.onInventoryChanged(`❌ ${hero.name} (${hero.class}) cannot use ${item.name}!`);
            }
            return;
          }

          let slot = 'weapon';
          if (item.category === ItemCategory.WEAPON) slot = 'weapon';
          else if (item.category === ItemCategory.SHIELD) slot = 'shield';
          else if (item.category === ItemCategory.ARMOR) slot = 'armor';
          else if (item.category === ItemCategory.HELM) slot = 'helm';
          else if (item.category === ItemCategory.GLOVES) slot = 'gloves';
          else if (item.category === ItemCategory.INSTRUMENT) slot = 'instrument';

          const currentEquipped = hero.equipped[slot];
          hero.inventory.splice(idx, 1);
          if (currentEquipped) {
            hero.inventory.push(currentEquipped);
          }
          hero.equipped[slot] = item;
          if (slot === 'weapon') hero.weapon = item.name;

          if (this.onInventoryChanged) {
            this.onInventoryChanged(`⚔️ Equipped ${item.name} on ${hero.name}!`);
          }
          this.render();
        }
      });
    });

    // Drop Item
    this.overlay.querySelectorAll('.drop-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const item = hero.inventory[idx];
        if (item) {
          hero.inventory.splice(idx, 1);
          if (this.onInventoryChanged) {
            this.onInventoryChanged(`Dropped ${item.name}`);
          }
          this.render();
        }
      });
    });
  }

  getClassIcon(className) {
    switch (className) {
      case 'Paladin': return '🛡️';
      case 'Warrior': return '⚔️';
      case 'Hunter': return '🏹';
      case 'Monk': return '🥋';
      case 'Bard': return '🪕';
      case 'Rogue': return '🗡️';
      case 'Conjurer': return '🔮';
      case 'Magician': return '✨';
      case 'Sorcerer': return '🌌';
      case 'Wizard': return '🧙';
      default: return '👤';
    }
  }
}
