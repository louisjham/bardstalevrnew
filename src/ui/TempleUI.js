// TempleUI.js - Canonical Temple of Skara Brae & Mad God Tarjan Sanctuary UI
// Features:
// - Comprehensive treatment services (HP wounds, poison, paralysis, insanity, withering, petrification, resurrection)
// - Resurrected characters return at 1 HP
// - Temple of the Mad God Tarjan heals Rogues for FREE (0 GP)
// - Dynamic cost calculations and party gold deductions
// - Individual character and full party blessing actions

import { CharacterStatus, RecoveryEngine, TEMPLE_PRICING } from '../core/recovery/RecoverySystem.js';

export class TempleUI {
  constructor(party = [], onPartyUpdated = null) {
    this.party = party || [];
    this.onPartyUpdated = onPartyUpdated;
    this.selectedHeroIndex = 0;
    this.isOpen = false;
    this.isTarjan = false;
    this.templeName = 'Temple of the Divine Light';

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
    this.overlay.className = 'temple-overlay hidden';
    this.overlay.id = 'temple-service-modal';

    this.overlay.innerHTML = `
      <div class="temple-modal glass-panel">
        <div class="temple-header">
          <div class="temple-title-group">
            <span class="temple-badge" id="temple-badge">🏛️ SACRED SANCTUARY</span>
            <h2 id="temple-modal-title">TEMPLE OF THE DIVINE LIGHT</h2>
            <p class="temple-subtitle" id="temple-dialogue">
              "Welcome, weary travelers. For a modest donation to the gods, we shall mend your flesh, cleanse your afflictions, and summon souls back from the void."
            </p>
          </div>
          <button id="close-temple-btn" class="close-modal-btn">&times;</button>
        </div>

        <div id="tarjan-banner" class="tarjan-perk-banner hidden">
          🗡️ <strong>The Mad God Tarjan honors the shadows:</strong> Rogues receive all healing and purification without tribute (<strong>FREE</strong>)!
        </div>

        <!-- Party Gold Ledger -->
        <div class="temple-gold-bar">
          <div class="gold-tally">
            <span class="gold-icon">🪙</span>
            <span class="gold-label">Party Gold:</span>
            <strong id="temple-party-gold">0 GP</strong>
          </div>
          <button id="temple-heal-all-btn" class="action-btn gold-btn">🌟 Bless Entire Party</button>
        </div>

        <!-- Hero Selector Bar -->
        <div class="temple-hero-bar" id="temple-hero-bar"></div>

        <!-- Selected Hero Treatment Card -->
        <div class="temple-treatment-card" id="temple-treatment-card"></div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this.bindEvents();
  }

  bindEvents() {
    this.overlay.querySelector('#close-temple-btn').addEventListener('click', () => this.hide());

    this.overlay.querySelector('#temple-heal-all-btn').addEventListener('click', () => {
      this.blessEntireParty();
    });

    // Close on backdrop click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
  }

  show(templeName = 'Temple of the Divine Light', isTarjan = false, heroIndex = 0) {
    this.templeName = templeName;
    this.isTarjan = isTarjan;
    this.selectedHeroIndex = Math.min(Math.max(0, heroIndex), Math.max(0, this.party.length - 1));
    this.isOpen = true;

    // Update Header
    const titleEl = this.overlay.querySelector('#temple-modal-title');
    const badgeEl = this.overlay.querySelector('#temple-badge');
    const dialogueEl = this.overlay.querySelector('#temple-dialogue');
    const tarjanBanner = this.overlay.querySelector('#tarjan-banner');

    if (titleEl) titleEl.textContent = templeName.toUpperCase();
    if (badgeEl) badgeEl.textContent = isTarjan ? '🗡️ TEMPLE OF THE MAD GOD' : '🏛️ SACRED SANCTUARY';
    if (dialogueEl) {
      dialogueEl.textContent = isTarjan
        ? '"The altar of Tarjan pulses with ancient chaotic magic. Rogues may bathe in the shadows for free; others must pay their tribute."'
        : '"Welcome, weary travelers. For a modest donation to the gods, we shall mend your flesh, cleanse your afflictions, and summon souls back from the void."';
    }

    if (tarjanBanner) {
      if (isTarjan) tarjanBanner.classList.remove('hidden');
      else tarjanBanner.classList.add('hidden');
    }

    this.overlay.classList.remove('hidden');
    this.render();
  }

  hide() {
    this.isOpen = false;
    this.overlay.classList.add('hidden');
  }

  render() {
    const heroBar = this.overlay.querySelector('#temple-hero-bar');
    const treatmentCard = this.overlay.querySelector('#temple-treatment-card');
    const partyGoldEl = this.overlay.querySelector('#temple-party-gold');
    if (!heroBar || !treatmentCard) return;

    // 1. Calculate Party Gold
    const totalGold = this.party.reduce((sum, h) => sum + (h.gold || 0), 0);
    if (partyGoldEl) partyGoldEl.textContent = `${totalGold.toLocaleString()} GP`;

    // 2. Render Hero Tabs
    heroBar.innerHTML = '';
    this.party.forEach((hero, idx) => {
      const tab = document.createElement('div');
      const isSelected = idx === this.selectedHeroIndex;
      const status = hero.status || CharacterStatus.OK;
      const isDead = status === CharacterStatus.DEAD || (hero.hp !== undefined && hero.hp <= 0);
      const isAfflicted = status !== CharacterStatus.OK && status !== CharacterStatus.DAMAGED;

      const statusBadgeClass = isDead ? 'dead' : isAfflicted ? 'afflicted' : (hero.hp < hero.maxHp) ? 'damaged' : 'ok';
      const statusIcon = isDead ? '💀' : (status === 'POISONED') ? '☠️' : (status === 'PARALYZED') ? '⚡' : (status === 'INSANE') ? '🌀' : (status === 'WITHERED') ? '🍂' : (status === 'STONED') ? '🗿' : '💚';

      tab.className = `temple-hero-tab ${isSelected ? 'active' : ''} ${isDead ? 'hero-dead' : ''}`;
      tab.innerHTML = `
        <div class="tab-hero-info">
          <span class="tab-name">${hero.name}</span>
          <span class="tab-class">${hero.race} ${hero.class}</span>
        </div>
        <div class="tab-status-pill ${statusBadgeClass}">
          ${statusIcon} ${isDead ? 'DEAD' : status}
        </div>
        <div class="tab-hp-preview">
          HP: ${hero.hp || 0}/${hero.maxHp || 20}
        </div>
      `;

      tab.addEventListener('click', () => {
        this.selectedHeroIndex = idx;
        this.render();
      });

      heroBar.appendChild(tab);
    });

    // 3. Render Selected Hero Treatment Panel
    const hero = this.party[this.selectedHeroIndex];
    if (!hero) {
      treatmentCard.innerHTML = '<div class="no-hero">No hero selected</div>';
      return;
    }

    const { totalCost, hpCost, conditionCost, isResurrection, conditionsToCure } = RecoveryEngine.calculateTempleCost(hero, this.isTarjan);
    const isRogueFree = this.isTarjan && hero.class === 'Rogue';
    const isDead = hero.status === CharacterStatus.DEAD || (hero.hp <= 0 && hero.hp !== undefined);
    const missingHp = Math.max(0, (hero.maxHp || 20) - Math.max(0, hero.hp || 0));

    treatmentCard.innerHTML = `
      <div class="treatment-hero-header">
        <div class="hero-identity">
          <h3>${hero.name}</h3>
          <span class="hero-meta">${hero.race} • Level ${hero.level || 1} ${hero.class} ${isRogueFree ? '<span class="rogue-free-tag">⭐ FREE HEALING</span>' : ''}</span>
        </div>
        <div class="hero-stats-row">
          <div class="stat-box">
            <span class="label">Hit Points</span>
            <span class="val ${hero.hp < (hero.maxHp || 20) ? 'warn' : ''}">${hero.hp || 0} / ${hero.maxHp || 20}</span>
          </div>
          <div class="stat-box">
            <span class="label">Spell Points</span>
            <span class="val">${hero.sp || 0} / ${hero.maxSp || 0}</span>
          </div>
          <div class="stat-box">
            <span class="label">Condition</span>
            <span class="val status-${hero.status?.toLowerCase()}">${hero.status || 'OK'}</span>
          </div>
          <div class="stat-box">
            <span class="label">Gold</span>
            <span class="val gold">${(hero.gold || 0).toLocaleString()} GP</span>
          </div>
        </div>
      </div>

      <!-- Treatment Options -->
      <div class="treatment-options-grid">
        <!-- Option 1: Full Treatment & Purification -->
        <div class="treatment-option-card highlighted">
          <div class="opt-header">
            <h4>✨ Full Sanctuary Cleansing</h4>
            <span class="opt-price ${isRogueFree ? 'free' : ''}">
              ${isRogueFree ? 'FREE (Tarjan Rogue)' : `${totalCost} GP`}
            </span>
          </div>
          <p class="opt-desc">
            ${isResurrection
              ? 'Summons the hero’s soul back from the realm of the dead. Returns to life at <strong>1 HP</strong> (retaining all gold, items, and experience).'
              : 'Restores all missing hit points and purifies any harmful conditions (Poison, Paralysis, Insanity, Withering, Stoned).'}
          </p>
          <div class="opt-summary">
            ${conditionsToCure.length > 0 ? `<span><strong>Afflictions:</strong> ${conditionsToCure.join(', ')}</span>` : ''}
            ${missingHp > 0 && !isResurrection ? `<span><strong>Wounds:</strong> +${missingHp} HP</span>` : ''}
            ${totalCost === 0 && !isRogueFree ? '<span class="fully-healed-msg">💚 Hero is already at full health and vigor!</span>' : ''}
          </div>
          <button id="apply-treatment-btn" class="action-btn gold-btn" ${totalCost === 0 && !isRogueFree ? 'disabled' : ''}>
            ${isResurrection ? '⚰️ Resurrect Hero' : '✨ Apply Full Treatment'}
          </button>
        </div>

        <!-- Option 2: Price Breakdown & Holy Wisdom -->
        <div class="temple-wisdom-card">
          <h4>📜 Temple Recovery Rates</h4>
          <ul class="rate-list">
            <li><span>Mend Flesh & Wounds:</span> <strong>1 GP per HP</strong></li>
            <li><span>Cure Poison:</span> <strong>${TEMPLE_PRICING.poisonCure} GP</strong></li>
            <li><span>Cure Paralysis:</span> <strong>${TEMPLE_PRICING.paralysisCure} GP</strong></li>
            <li><span>Cure Insanity:</span> <strong>${TEMPLE_PRICING.insanityCure} GP</strong></li>
            <li><span>Cure Withering / Drain:</span> <strong>${TEMPLE_PRICING.witheringCure} GP (Temple Only)</strong></li>
            <li><span>Cure Petrification (Stoned):</span> <strong>${TEMPLE_PRICING.petrificationCure} GP (Temple Only)</strong></li>
            <li><span>Resurrection:</span> <strong>${TEMPLE_PRICING.resurrection} GP (Returns at 1 HP)</strong></li>
          </ul>
        </div>
      </div>
    `;

    const applyBtn = treatmentCard.querySelector('#apply-treatment-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.treatSelectedHero();
      });
    }
  }

  treatSelectedHero() {
    const hero = this.party[this.selectedHeroIndex];
    if (!hero) return;

    const result = RecoveryEngine.applyTempleTreatment(hero, this.party, this.isTarjan);
    if (this.onPartyUpdated) {
      this.onPartyUpdated(result.message);
    }
    this.render();
  }

  blessEntireParty() {
    let totalCured = 0;
    let totalDeducted = 0;
    const messages = [];

    this.party.forEach(hero => {
      const { totalCost } = RecoveryEngine.calculateTempleCost(hero, this.isTarjan);
      if (totalCost > 0 || (this.isTarjan && hero.class === 'Rogue' && (hero.hp < (hero.maxHp || 20) || hero.status !== CharacterStatus.OK))) {
        const res = RecoveryEngine.applyTempleTreatment(hero, this.party, this.isTarjan);
        if (res.success) {
          totalCured++;
          totalDeducted += res.goldDeducted;
        }
      }
    });

    const summaryMsg = totalCured > 0
      ? `🌟 The High Priest blesses your entire party! ${totalCured} heroes cleansed & restored for ${totalDeducted} GP total.`
      : '💚 Your entire party is already in peak physical and spiritual health!';

    if (this.onPartyUpdated) {
      this.onPartyUpdated(summaryMsg);
    }
    this.render();
  }
}
