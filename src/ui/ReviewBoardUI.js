// ReviewBoardUI.js - Dedicated Diegetic Review Board Sanctuary Modal
// Allows heroes to present their accumulated XP in person to the Review Board Elder,
// gain levels, roll hit points and spell points, boost attributes, purchase spell tiers,
// and promote between arcane magic classes.

import {
  ReviewBoardEngine,
  getCharacterAdvancementStatus,
  getXPRequiredForLevel,
  getMaxSpellTierForLevel
} from '../core/review-board/ReviewBoardEngine.js';

export class ReviewBoardUI {
  constructor(party, onMessage) {
    this.party = party || [];
    this.onMessage = onMessage || (() => {});
    this.selectedHeroIndex = 0;
    this.container = null;
    this.isOpen = false;

    this.initDOM();
  }

  setParty(party) {
    this.party = party || [];
    if (this.selectedHeroIndex >= this.party.length) {
      this.selectedHeroIndex = 0;
    }
    if (this.isOpen) {
      this.render();
    }
  }

  initDOM() {
    this.container = document.createElement('div');
    this.container.id = 'review-board-modal';
    this.container.className = 'review-board-overlay hidden';
    document.body.appendChild(this.container);
  }

  show(party = null) {
    if (party) this.party = party;
    this.isOpen = true;
    this.container.classList.remove('hidden');
    this.render();
  }

  hide() {
    this.isOpen = false;
    this.container.classList.add('hidden');
  }

  get partyGold() {
    return this.party.reduce((sum, h) => sum + (h.gold || 0), 0);
  }

  render() {
    if (!this.isOpen) return;

    if (!this.party || this.party.length === 0) {
      this.container.innerHTML = `
        <div class="review-board-modal">
          <div class="review-board-header">
            <h2>📜 Skara Brae Review Board</h2>
            <button class="modal-close-btn" id="rb-close-btn">✕</button>
          </div>
          <p class="review-board-subtitle">No heroes assembled. Visit the Scarlet Bard Tavern first.</p>
        </div>
      `;
      this.bindClose();
      return;
    }

    const selectedHero = this.party[this.selectedHeroIndex] || this.party[0];
    const status = getCharacterAdvancementStatus(selectedHero);
    const partyGold = this.partyGold;

    // Check how many party members are ready to advance
    const readyCount = this.party.filter(h => getCharacterAdvancementStatus(h).isReady).length;

    this.container.innerHTML = `
      <div class="review-board-modal">
        <!-- Header -->
        <div class="review-board-header">
          <div class="rb-title-group">
            <span class="rb-badge">⚖️ SANCTIONED CIVIC GUILD</span>
            <h2>📜 Skara Brae Review Board</h2>
            <p class="review-board-subtitle">
              "Welcome, seeker of glory. Step forward and present your deeds for examination.
              The Board shall judge your worth and bestow higher rank, vitality, and mystical mastery upon the worthy."
            </p>
          </div>
          <button class="modal-close-btn" id="rb-close-btn" title="Leave Review Board">✕</button>
        </div>

        <!-- Top Action & Gold Bar -->
        <div class="rb-gold-bar">
          <div class="gold-tally">
            <span>💰 Party Treasury:</span>
            <strong class="gold-text">${partyGold.toLocaleString()} GP</strong>
          </div>
          <div class="rb-party-actions">
            ${readyCount > 0 ? `
              <button class="primary-btn glow-gold-btn" id="rb-advance-all-btn">
                ⭐ Advance Entire Party (${readyCount} Ready)
              </button>
            ` : `
              <span class="rb-all-current">All heroes current</span>
            `}
          </div>
        </div>

        <!-- Hero Selection Bar -->
        <div class="rb-hero-bar">
          ${this.party.map((hero, idx) => {
            const hStatus = getCharacterAdvancementStatus(hero);
            const isSel = idx === this.selectedHeroIndex;
            return `
              <div class="rb-hero-tab ${isSel ? 'active' : ''} ${hStatus.isReady ? 'ready-to-level' : ''}" data-hero-index="${idx}">
                <div class="tab-hero-info">
                  <span class="tab-name">${hero.name}</span>
                  <span class="tab-class">${hero.race || 'Human'} ${hero.class}</span>
                </div>
                <div class="tab-level-badge">
                  Lvl ${hero.level || 1}
                  ${hStatus.isReady ? '<span class="ready-star">⭐ READY</span>' : ''}
                </div>
                <div class="tab-xp-bar-mini">
                  <div class="xp-fill-mini" style="width: ${Math.min(100, Math.floor((hStatus.currentXP / hStatus.requiredXP) * 100))}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Main Examination Panel -->
        <div class="rb-examination-card">
          <!-- Hero Identity Banner -->
          <div class="rb-hero-details-row">
            <div class="rb-hero-identity">
              <h3>${selectedHero.name}</h3>
              <span class="rb-class-tag">${selectedHero.race || 'Human'} ${selectedHero.class} (Level ${selectedHero.level || 1})</span>
              <span class="rb-status-tag ${selectedHero.status === 'DEAD' ? 'dead' : 'ok'}">${selectedHero.status || 'OK'}</span>
            </div>

            <div class="rb-hero-stats">
              <div class="stat-pill"><span class="label">HP</span><span class="val">${selectedHero.hp ?? selectedHero.currentHp ?? 20} / ${selectedHero.maxHp ?? 20}</span></div>
              <div class="stat-pill"><span class="label">SP</span><span class="val">${selectedHero.sp ?? selectedHero.currentSp ?? 0} / ${selectedHero.maxSp ?? 0}</span></div>
              <div class="stat-pill"><span class="label">AC</span><span class="val">${selectedHero.ac ?? 10}</span></div>
              <div class="stat-pill"><span class="label">Gold</span><span class="val gold-text">${(selectedHero.gold || 0).toLocaleString()} GP</span></div>
            </div>
          </div>

          <!-- XP & Progress Section -->
          <div class="rb-xp-section">
            <div class="xp-labels-row">
              <span><strong>Accumulated Experience:</strong> <span class="xp-val">${status.currentXP.toLocaleString()} XP</span></span>
              <span><strong>Next Level Threshold:</strong> <span class="xp-val">${status.requiredXP.toLocaleString()} XP</span></span>
            </div>
            <div class="rb-xp-bar-container">
              <div class="rb-xp-bar-fill" style="width: ${Math.min(100, Math.floor((status.currentXP / status.requiredXP) * 100))}%"></div>
            </div>
            <div class="xp-sub-info">
              ${status.isReady ? `
                <span class="xp-status-ready">⭐ Sufficient experience acquired to claim Level ${status.nextLevel}!</span>
              ` : `
                <span class="xp-status-pending">Requires <strong>${status.xpRemaining.toLocaleString()}</strong> more XP for Level ${status.nextLevel}.</span>
              `}
            </div>
          </div>

          <!-- Advancement Grid: Left (Level Up), Right (Spell Training & Class Change) -->
          <div class="rb-actions-grid">
            <!-- Left: Level Up Action -->
            <div class="rb-action-box level-box">
              <h4>⭐ Level Promotion</h4>
              ${status.isReady ? `
                <p class="box-desc">The Board has evaluated your deeds and found them worthy of promotion.</p>
                <div class="gains-preview">
                  <div class="gain-item">✨ <strong>Rank:</strong> Level ${selectedHero.level || 1} ➔ Level ${status.nextLevel}</div>
                  <div class="gain-item">🩸 <strong>Vitality:</strong> +Hit Points (Class Die + CON)</div>
                  ${['Conjurer', 'Magician', 'Sorcerer', 'Wizard'].includes(selectedHero.class) ? `
                    <div class="gain-item">⚡ <strong>Spell Points:</strong> +Arcane Energy (+14 SP)</div>
                  ` : ''}
                  <div class="gain-item">🛡️ <strong>Attributes:</strong> Random Attribute Boost (+1)</div>
                </div>
                <button class="primary-btn glow-gold-btn rb-advance-single-btn" id="rb-advance-btn">
                  ⭐ Promote ${selectedHero.name} to Level ${status.nextLevel}
                </button>
              ` : `
                <p class="box-desc">Return to the streets and catacombs of Skara Brae to vanquish more enemies before seeking advancement.</p>
                <button class="primary-btn disabled-btn" disabled>
                  Insufficient XP (${status.xpRemaining.toLocaleString()} Needed)
                </button>
              `}
            </div>

            <!-- Right: Magic User Special Services (Spell Training & Class Promotion) -->
            ${['Conjurer', 'Magician', 'Sorcerer', 'Wizard'].includes(selectedHero.class) ? `
              <div class="rb-action-box magic-box">
                <h4>🔮 Arcane Mastery & Spell Tiers</h4>
                ${this.renderMageTraining(selectedHero)}
              </div>
            ` : `
              <div class="rb-action-box martial-box">
                <h4>⚔️ Martial Mastery</h4>
                <p class="box-desc">${selectedHero.class}s gain additional physical attacks per round as they achieve mastery (every 4 levels).</p>
                <div class="martial-info-pills">
                  <div class="m-pill">Extra Attacks: <strong>${Math.floor(((selectedHero.level || 1) - 1) / 4) + 1} per round</strong></div>
                  <div class="m-pill">Magic Resistance: <strong>${selectedHero.class === 'Paladin' ? 'High (+30%)' : 'Standard'}</strong></div>
                </div>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderMageTraining(hero) {
    const level = hero.level || 1;
    const maxTier = getMaxSpellTierForLevel(level);
    const taughtTier = hero.schoolLevels?.[hero.class.toUpperCase()] || 1;

    let trainingHtml = `
      <div class="spell-tier-status">
        <span>Current Spell Tier: <strong>Tier ${taughtTier}</strong></span>
        <span>Max Available for Level ${level}: <strong>Tier ${maxTier}</strong></span>
      </div>
    `;

    if (taughtTier < maxTier) {
      const nextTier = taughtTier + 1;
      const cost = nextTier * 100;
      const canAfford = this.partyGold >= cost;

      trainingHtml += `
        <div class="tier-buy-box">
          <p class="tier-desc">The Board can instruct ${hero.name} in <strong>Tier ${nextTier} ${hero.class} Spells</strong>.</p>
          <div class="tier-cost-row">
            <span>Training Fee: <strong class="gold-text">${cost} GP</strong></span>
            <button class="primary-btn ${canAfford ? 'glow-cyan-btn' : 'disabled-btn'}" id="rb-buy-tier-btn" data-tier="${nextTier}" ${canAfford ? '' : 'disabled'}>
              ✨ Learn Tier ${nextTier} Spells
            </button>
          </div>
        </div>
      `;
    } else {
      trainingHtml += `
        <p class="all-tiers-learned">✨ All currently unlocked spell tiers have been mastered. Advance your experience level to unlock higher tiers (at levels 3, 5, 7, 9, 11, 13).</p>
      `;
    }

    // Class Promotion Option (Sorcerer / Wizard)
    if (hero.class === 'Conjurer' || hero.class === 'Magician') {
      const qualifying = taughtTier >= 3;
      trainingHtml += `
        <div class="class-change-section">
          <h5>🔮 Exalted Class Change: Sorcerer</h5>
          ${qualifying ? `
            <p class="cc-desc">Mastery of Tier 3 reached! ${hero.name} may now ascend to <strong>Sorcerer</strong>.</p>
            <button class="primary-btn glow-purple-btn" id="rb-change-sorcerer-btn">
              🔮 Promote to Sorcerer (Retain all spells; Level resets to 1)
            </button>
          ` : `
            <p class="cc-desc text-muted">Requires mastery of at least Tier 3 spells in current art before ascending to Sorcerer.</p>
          `}
        </div>
      `;
    } else if (hero.class === 'Sorcerer') {
      const completedCount = (hero.completedSchools || []).length + (taughtTier >= 3 ? 1 : 0);
      const qualifying = completedCount >= 2;
      trainingHtml += `
        <div class="class-change-section">
          <h5>⚡ Exalted Class Change: Wizard</h5>
          ${qualifying ? `
            <p class="cc-desc">Mastery of 2 magic arts reached! ${hero.name} may now ascend to <strong>Wizard</strong>.</p>
            <button class="primary-btn glow-purple-btn" id="rb-change-wizard-btn">
              ⚡ Promote to Wizard (Retain all spells; Level resets to 1)
            </button>
          ` : `
            <p class="cc-desc text-muted">Requires mastery of at least Tier 3 spells in 2 different arts before ascending to Wizard.</p>
          `}
        </div>
      `;
    }

    return trainingHtml;
  }

  bindClose() {
    const closeBtn = document.getElementById('rb-close-btn');
    if (closeBtn) closeBtn.onclick = () => this.hide();
  }

  bindEvents() {
    this.bindClose();

    // Hero Tab clicks
    const tabs = this.container.querySelectorAll('.rb-hero-tab');
    tabs.forEach(tab => {
      tab.onclick = () => {
        const idx = parseInt(tab.getAttribute('data-hero-index'), 10);
        if (!isNaN(idx)) {
          this.selectedHeroIndex = idx;
          this.render();
        }
      };
    });

    // Advance Single Hero
    const advBtn = document.getElementById('rb-advance-btn');
    if (advBtn) {
      advBtn.onclick = () => {
        const hero = this.party[this.selectedHeroIndex];
        const res = ReviewBoardEngine.advanceCharacter(hero);
        this.onMessage(res.message);
        this.render();
      };
    }

    // Advance Entire Party
    const advAllBtn = document.getElementById('rb-advance-all-btn');
    if (advAllBtn) {
      advAllBtn.onclick = () => {
        const res = ReviewBoardEngine.advanceEntireParty(this.party);
        this.onMessage(res.summary);
        this.render();
      };
    }

    // Buy Spell Tier
    const buyTierBtn = document.getElementById('rb-buy-tier-btn');
    if (buyTierBtn) {
      buyTierBtn.onclick = () => {
        const tier = parseInt(buyTierBtn.getAttribute('data-tier'), 10);
        const hero = this.party[this.selectedHeroIndex];
        const res = ReviewBoardEngine.purchaseSpellTier(hero, tier, this.party);
        this.onMessage(res.message);
        this.render();
      };
    }

    // Change Class to Sorcerer
    const sorcBtn = document.getElementById('rb-change-sorcerer-btn');
    if (sorcBtn) {
      sorcBtn.onclick = () => {
        const hero = this.party[this.selectedHeroIndex];
        const res = ReviewBoardEngine.changeClass(hero, 'Sorcerer');
        this.onMessage(res.message);
        this.render();
      };
    }

    // Change Class to Wizard
    const wizBtn = document.getElementById('rb-change-wizard-btn');
    if (wizBtn) {
      wizBtn.onclick = () => {
        const hero = this.party[this.selectedHeroIndex];
        const res = ReviewBoardEngine.changeClass(hero, 'Wizard');
        this.onMessage(res.message);
        this.render();
      };
    }
  }
}
