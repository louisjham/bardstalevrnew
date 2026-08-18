// PartyCreationUI.js - Manages Party Creation & Quick Auto-Gen Roster Screen
import {
  getAllRaceNames,
  getBaseClassNames,
  createCharacter,
  rollAttributes,
  getClassByName,
  canChangeClass,
  executeClassChange
} from '../data/RaceClassData.js';

export class PartyCreationUI {
  constructor(onPartyConfirmed) {
    this.onPartyConfirmed = onPartyConfirmed;
    this.party = [];

    // Pre-configured classic Bard's Tale classes & races
    this.races = getAllRaceNames();
    this.classes = getBaseClassNames();

    this.previewCharacter = null;

    this.createUIElements();
    this.rollCurrentStats();
  }

  createUIElements() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'party-modal-overlay hidden';
    this.overlay.innerHTML = `
      <div class="party-modal glass-panel">
        <div class="modal-header">
          <h2>📜 SKARA BRAE PARTY CREATION</h2>
          <button class="close-modal-btn">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Quick Auto-Gen Banner -->
          <div class="quick-gen-bar">
            <span>Need a balanced party immediately?</span>
            <button id="quick-gen-btn" class="action-btn gold-btn">⚡ Quick Auto-Generate Party (6 Heroes)</button>
          </div>

          <!-- Current Party Roster -->
          <div class="roster-section">
            <h3>Active Party Roster (<span id="party-count">0</span> / 6)</h3>
            <div id="roster-grid" class="roster-grid"></div>
          </div>

          <!-- Character Creator Form -->
          <div class="character-creator-box">
            <h3>Create Custom Hero</h3>
            <div class="form-row">
              <input type="text" id="hero-name" placeholder="Hero Name" value="Brian the Bard">

              <select id="hero-race">
                ${this.races.map(r => `<option value="${r}">${r}</option>`).join('')}
              </select>

              <select id="hero-class">
                ${this.classes.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>

              <button id="add-hero-btn" class="action-btn">➕ Add Hero to Party</button>
            </div>
            
            <!-- Stat Preview Section -->
            <div class="stat-preview-section" style="margin-top: 15px;">
              <h4 style="margin-top: 0; margin-bottom: 8px; font-size: 0.9em; color: #aaa;">Rolled Attributes</h4>
              <div style="display: flex; gap: 15px; align-items: center;">
                <div id="stat-preview" class="stats">
                  <!-- Stats injected here -->
                </div>
                <button id="reroll-stats-btn" class="action-btn" style="padding: 4px 8px; font-size: 0.9em;">🎲 Reroll Stats</button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button id="start-game-btn" class="action-btn gold-btn large-btn" disabled>⚔️ ENTER SKARA BRAE DUNGEON</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this.bindEvents();
  }

  bindEvents() {
    this.overlay.querySelector('.close-modal-btn').addEventListener('click', () => this.hide());

    document.getElementById('quick-gen-btn').addEventListener('click', () => {
      this.autoGenerateParty();
    });

    document.getElementById('add-hero-btn').addEventListener('click', () => {
      this.addCustomHero();
    });

    document.getElementById('reroll-stats-btn').addEventListener('click', () => {
      this.rollCurrentStats();
    });

    document.getElementById('hero-race').addEventListener('change', () => {
      this.rollCurrentStats();
    });

    document.getElementById('hero-class').addEventListener('change', () => {
      this.rollCurrentStats();
    });

    document.getElementById('hero-name').addEventListener('input', (e) => {
      if (this.previewCharacter) {
        this.previewCharacter.name = e.target.value.trim() || 'Hero';
      }
    });

    document.getElementById('start-game-btn').addEventListener('click', () => {
      if (this.party.length > 0) {
        this.hide();
        if (this.onPartyConfirmed) this.onPartyConfirmed(this.party);
      }
    });
  }

  rollCurrentStats() {
    const name = document.getElementById('hero-name').value.trim() || 'Hero';
    const race = document.getElementById('hero-race').value;
    const heroClass = document.getElementById('hero-class').value;
    
    this.previewCharacter = createCharacter(name, race, heroClass);
    this.updateStatPreview();
  }

  updateStatPreview() {
    if (!this.previewCharacter) return;
    const preview = document.getElementById('stat-preview');
    preview.innerHTML = `
      <span>ST: ${this.previewCharacter.st}</span>
      <span>IQ: ${this.previewCharacter.iq}</span>
      <span>DX: ${this.previewCharacter.dx}</span>
      <span>CN: ${this.previewCharacter.cn}</span>
      <span>LK: ${this.previewCharacter.lk}</span>
      <span class="hp">HP: ${this.previewCharacter.hp}</span>
    `;
  }

  show() {
    this.overlay.classList.remove('hidden');
    this.rollCurrentStats(); // Ensure stats are rolled when shown
  }

  hide() {
    this.overlay.classList.add('hidden');
  }

  autoGenerateParty() {
    this.party = [
      createCharacter('Elric', 'Human', 'Paladin'),
      createCharacter('Gaelen', 'Elf', 'Bard'),
      createCharacter('Thorin', 'Dwarf', 'Warrior'),
      createCharacter('Shadow', 'Hobbit', 'Rogue'),
      createCharacter('Kael', 'Half-Elf', 'Conjurer'),
      createCharacter('Morgana', 'Human', 'Magician')
    ];

    this.renderRoster();
  }

  addCustomHero() {
    if (this.party.length >= 6) {
      alert("Party is full (Maximum 6 heroes).");
      return;
    }

    if (!this.previewCharacter) {
      this.rollCurrentStats();
    }

    // Ensure the name is up to date before adding
    this.previewCharacter.name = document.getElementById('hero-name').value.trim() || 'Hero';

    this.party.push(this.previewCharacter);
    this.renderRoster();
    
    // Reroll for the next potential character
    this.rollCurrentStats();
  }

  removeHero(index) {
    this.party.splice(index, 1);
    this.renderRoster();
  }

  renderRoster() {
    const grid = document.getElementById('roster-grid');
    const countEl = document.getElementById('party-count');
    const startBtn = document.getElementById('start-game-btn');

    countEl.textContent = this.party.length;
    startBtn.disabled = this.party.length === 0;

    grid.innerHTML = this.party.map((hero, idx) => `
      <div class="roster-card">
        <div class="card-header">
          <strong>${hero.name}</strong>
          <button class="remove-btn" data-idx="${idx}">&times;</button>
        </div>
        <div class="card-body">
          <div class="meta">${hero.race} ${hero.class}</div>
          <div class="stats">
            <span>ST: ${hero.st}</span>
            <span>IQ: ${hero.iq}</span>
            <span>DX: ${hero.dx}</span>
            <span>CN: ${hero.cn}</span>
            <span>LK: ${hero.lk}</span>
            <span class="hp">HP: ${hero.hp}</span>
          </div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        this.removeHero(idx);
      });
    });
  }
}
