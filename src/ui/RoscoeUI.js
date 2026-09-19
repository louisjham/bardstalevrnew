// RoscoeUI.js - Roscoe's Energy Emporium Spell Point Recharge Service
// Recharges drained mage spell points for 15 GP per SP.

import { RecoveryEngine, TEMPLE_PRICING } from '../core/recovery/RecoverySystem.js';

export class RoscoeUI {
  constructor(party = [], onPartyUpdated = null) {
    this.party = party || [];
    this.onPartyUpdated = onPartyUpdated;
    this.selectedHeroIndex = 0;
    this.isOpen = false;

    this.createUIElements();
  }

  setParty(party) {
    this.party = party || [];
    if (this.isOpen) {
      this.render();
    }
  }

  createUIElements() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'roscoe-overlay hidden';
    this.overlay.id = 'roscoe-service-modal';

    this.overlay.innerHTML = `
      <div class="roscoe-modal glass-panel">
        <div class="roscoe-header">
          <div class="roscoe-title-group">
            <span class="roscoe-badge">⚡ ARCANE ENERGY EMPORIUM</span>
            <h2>ROSCOE'S ENERGY EMPORIUM</h2>
            <p class="roscoe-subtitle">
              "Welcome to my emporium, spellcasters! Drained of mystical power? For a mere <strong>15 Gold Pieces per Spell Point</strong>, my arcane batteries will restore your magical reserves to their utmost limit."
            </p>
          </div>
          <button id="close-roscoe-btn" class="close-modal-btn">&times;</button>
        </div>

        <!-- Party Gold & Mass Recharge -->
        <div class="roscoe-gold-bar">
          <div class="gold-tally">
            <span class="gold-icon">🪙</span>
            <span class="gold-label">Party Gold:</span>
            <strong id="roscoe-party-gold">0 GP</strong>
          </div>
          <button id="roscoe-recharge-all-btn" class="action-btn cyan-btn">⚡ Recharge All Mages</button>
        </div>

        <!-- Mages List & Recharge Cards -->
        <div class="roscoe-mages-list" id="roscoe-mages-list"></div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this.bindEvents();
  }

  bindEvents() {
    this.overlay.querySelector('#close-roscoe-btn').addEventListener('click', () => this.hide());
    this.overlay.querySelector('#roscoe-recharge-all-btn').addEventListener('click', () => {
      this.rechargeAllMages();
    });

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
  }

  show(party = null) {
    if (party) this.party = party;
    this.isOpen = true;
    this.overlay.classList.remove('hidden');
    this.render();
  }

  hide() {
    this.isOpen = false;
    this.overlay.classList.add('hidden');
  }

  render() {
    const listEl = this.overlay.querySelector('#roscoe-mages-list');
    const goldEl = this.overlay.querySelector('#roscoe-party-gold');
    if (!listEl) return;

    const totalGold = this.party.reduce((sum, h) => sum + (h.gold || 0), 0);
    if (goldEl) goldEl.textContent = `${totalGold.toLocaleString()} GP`;

    listEl.innerHTML = '';

    const mageClasses = ['Conjurer', 'Magician', 'Sorcerer', 'Wizard'];
    const mages = this.party.filter(h => mageClasses.includes(h.class));

    if (mages.length === 0) {
      listEl.innerHTML = `
        <div class="no-mages-box">
          <p>⚠️ Your party does not contain any Spellcasters (Conjurer, Magician, Sorcerer, Wizard)!</p>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Roscoe only recharges spell points for practitioners of the arcane arts.</span>
        </div>
      `;
      return;
    }

    mages.forEach((mage) => {
      const maxSp = mage.maxSp || (mage.level ? mage.level * 14 : 20);
      const currentSp = mage.sp || 0;
      const missingSp = Math.max(0, maxSp - currentSp);
      const cost = missingSp * TEMPLE_PRICING.roscoeSpCost;
      const spPercent = Math.round((currentSp / maxSp) * 100);

      const card = document.createElement('div');
      card.className = 'roscoe-mage-card';
      card.innerHTML = `
        <div class="mage-header">
          <div class="mage-id">
            <h4>${mage.name}</h4>
            <span class="mage-type">${mage.race} • Level ${mage.level || 1} ${mage.class}</span>
          </div>
          <div class="sp-badge ${missingSp > 0 ? 'sp-needed' : 'sp-full'}">
            ⚡ ${currentSp} / ${maxSp} SP (${spPercent}%)
          </div>
        </div>

        <div class="sp-bar-container">
          <div class="sp-bar-fill" style="width: ${spPercent}%"></div>
        </div>

        <div class="recharge-action-row">
          <div class="cost-breakdown">
            ${missingSp > 0
              ? `<span>Recharge <strong>+${missingSp} SP</strong> for <strong class="gold-text">${cost} GP</strong></span>`
              : '<span class="full-sp-msg">✨ Spell points at maximum capacity</span>'}
          </div>
          <button class="action-btn cyan-btn recharge-single-btn" ${missingSp === 0 ? 'disabled' : ''}>
            ⚡ Recharge SP (${cost} GP)
          </button>
        </div>
      `;

      const btn = card.querySelector('.recharge-single-btn');
      if (btn && missingSp > 0) {
        btn.addEventListener('click', () => {
          const res = RecoveryEngine.restoreSpellPointsAtRoscoe(mage, this.party);
          if (this.onPartyUpdated) {
            this.onPartyUpdated(res.message);
          }
          this.render();
        });
      }

      listEl.appendChild(card);
    });
  }

  rechargeAllMages() {
    const mageClasses = ['Conjurer', 'Magician', 'Sorcerer', 'Wizard'];
    const mages = this.party.filter(h => mageClasses.includes(h.class));

    let rechargedCount = 0;
    let totalSpent = 0;

    mages.forEach(mage => {
      const maxSp = mage.maxSp || (mage.level ? mage.level * 14 : 20);
      if ((mage.sp || 0) < maxSp) {
        const res = RecoveryEngine.restoreSpellPointsAtRoscoe(mage, this.party);
        if (res.success) {
          rechargedCount++;
          totalSpent += res.cost;
        }
      }
    });

    const msg = rechargedCount > 0
      ? `⚡ Roscoe recharges all ${rechargedCount} mages to full power for ${totalSpent} GP total!`
      : '✨ All party mages already possess maximum Spell Points!';

    if (this.onPartyUpdated) {
      this.onPartyUpdated(msg);
    }
    this.render();
  }
}
