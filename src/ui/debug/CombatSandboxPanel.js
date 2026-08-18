/**
 * CombatSandboxPanel.js - Developer-Only Headless Combat Sandbox UI Panel
 *
 * MANUAL VERIFICATION CHECKLIST:
 * [x] 1. Panel is mounted only in development mode (import.meta.env.DEV).
 * [x] 2. Shortcut F8 (or `) toggles panel visibility between shown and hidden.
 * [x] 3. Minimize button toggles expanded/collapsed body view.
 * [x] 4. Seed input can be edited and applied, re-seeding the PRNG deterministically.
 * [x] 5. Search filter queries monsters by numeric ID, slug, or display name.
 * [x] 6. Spawn button adds 1 to 8 monsters to the enemy roster.
 * [x] 7. Action dropdown lists baseline physical melee (action 0) plus canonical spells (1..N).
 * [x] 8. Target dropdown allows selecting a specific living party member.
 * [x] 9. Execute Action rolls damage or resolves spells, updating rosters and combat log.
 * [x] 10. Summons (e.g. Wolf) spawn directly into the roster upon action execution.
 * [x] 11. Reset Sandbox button clears enemies and logs, restoring the 6-member party.
 * [x] 12. Destroy method removes DOM elements and global keyboard listeners cleanly.
 */

import { createCombatSandbox } from '../../core/combat/CombatSandbox.js';
import { bardTaleMonsters, getMonsterById, getMonsterBySlug } from '../../data/MonsterDatabase.js';
import './combat-sandbox-panel.css';

/**
 * Creates and initializes the developer combat sandbox panel.
 *
 * @param {Object} [options={}]
 * @param {string|number} [options.initialSeed='bards_tale_sandbox_1985']
 * @param {string} [options.toggleKey='F8'] - Primary keyboard toggle shortcut.
 * @returns {{
 *   mount: (container?: HTMLElement) => void,
 *   destroy: () => void,
 *   toggle: () => void,
 *   show: () => void,
 *   hide: () => void,
 *   getSandbox: () => Object
 * }}
 */
export function createCombatSandboxPanel(options = {}) {
  const sandbox = createCombatSandbox({
    seed: options.initialSeed || 'bards_tale_sandbox_1985'
  });

  const toggleKey = options.toggleKey || 'F8';

  let rootElement = null;
  let isVisible = true;
  let isCollapsed = false;

  // Selected state
  let selectedMonsterRef = 0; // default Kobold (ID 0)
  let selectedSpawnQuantity = 1;
  let selectedEnemyInstanceId = null;
  let selectedActionIndex = 0;
  let selectedTargetInstanceId = null;

  // Keydown listener reference for cleanup
  let keyHandler = null;

  /**
   * Builds the DOM structure and attaches event listeners.
   */
  function render() {
    if (!rootElement) return;

    const state = sandbox.getSandboxState();
    const livingPartyCount = state.party.filter(h => !h.isDefeated && h.currentHp > 0).length;
    const livingEnemyCount = state.enemies.filter(e => !e.isDefeated && e.currentHp > 0).length;

    // Selected static monster preview
    const selectedMonster = typeof selectedMonsterRef === 'number'
      ? getMonsterById(selectedMonsterRef)
      : getMonsterBySlug(selectedMonsterRef);

    // Selected enemy actions
    let enemyActions = [];
    if (selectedEnemyInstanceId && state.enemies.some(e => e.instanceId === selectedEnemyInstanceId)) {
      try {
        enemyActions = sandbox.listAvailableMonsterActions(selectedEnemyInstanceId);
      } catch (err) {
        enemyActions = [];
      }
    } else if (state.enemies.length > 0) {
      selectedEnemyInstanceId = state.enemies[0].instanceId;
      try {
        enemyActions = sandbox.listAvailableMonsterActions(selectedEnemyInstanceId);
      } catch (err) {
        enemyActions = [];
      }
    } else {
      selectedEnemyInstanceId = null;
      enemyActions = [];
    }

    // Default target
    if (!selectedTargetInstanceId && state.party.length > 0) {
      const firstLivingHero = state.party.find(h => !h.isDefeated && h.currentHp > 0);
      selectedTargetInstanceId = firstLivingHero?.instanceId || state.party[0].instanceId;
    }

    rootElement.className = `csb-panel-container ${!isVisible ? 'csb-hidden' : ''} ${isCollapsed ? 'csb-collapsed' : ''}`;

    rootElement.innerHTML = `
      <!-- Header -->
      <div class="csb-header" id="csb-header">
        <div class="csb-header-title">
          <span>⚔️ DEV: Combat Sandbox</span>
          <span class="csb-header-badge">[${toggleKey}]</span>
        </div>
        <div class="csb-header-actions">
          <button class="csb-btn-icon" id="csb-toggle-collapse" title="Collapse/Expand">${isCollapsed ? '▲' : '▼'}</button>
          <button class="csb-btn-icon" id="csb-close" title="Hide (Press ${toggleKey} to reopen)">✕</button>
        </div>
      </div>

      <!-- Body -->
      <div class="csb-body" style="${isCollapsed ? 'display: none;' : ''}">
        <!-- Section 1: Sandbox Controls & Stats -->
        <div class="csb-section">
          <div class="csb-section-title">
            <span>🎲 Sandbox PRNG & Status</span>
            <span style="font-size: 10px; color: #94a3b8;">Seed: <b>${sandbox.getSeed()}</b></span>
          </div>
          <div class="csb-stat-grid">
            <div class="csb-stat-box">
              <div class="csb-stat-label">Round</div>
              <div class="csb-stat-val">${state.round}</div>
            </div>
            <div class="csb-stat-box">
              <div class="csb-stat-label">Party</div>
              <div class="csb-stat-val">${livingPartyCount}/${state.party.length}</div>
            </div>
            <div class="csb-stat-box">
              <div class="csb-stat-label">Enemies</div>
              <div class="csb-stat-val">${livingEnemyCount}/${state.enemies.length}</div>
            </div>
            <div class="csb-stat-box">
              <div class="csb-stat-label">Logs</div>
              <div class="csb-stat-val">${state.combatLog.length}</div>
            </div>
          </div>
          <div class="csb-row" style="margin-top: 4px;">
            <input type="text" class="csb-input" id="csb-seed-input" placeholder="Seed (e.g. 1985)" value="${sandbox.getSeed()}">
            <button class="csb-btn csb-btn-secondary" id="csb-apply-seed-btn">Apply Seed</button>
            <button class="csb-btn csb-btn-danger" id="csb-reset-btn">Reset</button>
          </div>
        </div>

        <!-- Section 2: Monster Selection & Spawning -->
        <div class="csb-section">
          <div class="csb-section-title">
            <span>🐉 Monster Bestiary (127 Archetypes)</span>
          </div>
          <div class="csb-row">
            <div class="csb-col" style="flex: 3;">
              <select class="csb-select" id="csb-monster-select">
                ${bardTaleMonsters.map(m => `
                  <option value="${m.id}" ${selectedMonster && selectedMonster.id === m.id ? 'selected' : ''}>
                    #${m.id} ${m.name} (${m.slug}) - Pwr ${m.power}
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="csb-col" style="flex: 1;">
              <select class="csb-select" id="csb-spawn-qty">
                ${[1, 2, 3, 4, 6, 8].map(qty => `
                  <option value="${qty}" ${selectedSpawnQuantity === qty ? 'selected' : ''}>x${qty}</option>
                `).join('')}
              </select>
            </div>
            <button class="csb-btn" id="csb-spawn-btn">+ Spawn</button>
          </div>

          <!-- Monster Preview Card -->
          ${selectedMonster ? `
            <div class="csb-monster-card">
              <div class="csb-monster-name">#${selectedMonster.id} ${selectedMonster.name} (${selectedMonster.slug})</div>
              <div class="csb-tag-row">
                <span class="csb-tag">HP ${selectedMonster.hp.min}-${selectedMonster.hp.max}</span>
                <span class="csb-tag">AC ${selectedMonster.armorClass.min}-${selectedMonster.armorClass.max}</span>
                <span class="csb-tag">XP ${selectedMonster.xp}</span>
                <span class="csb-tag">Pwr ${selectedMonster.power}</span>
                <span class="csb-tag csb-tag-danger">Atk: ${selectedMonster.physicalAttack.damage} (${selectedMonster.physicalAttack.hitType}${selectedMonster.physicalAttack.effect ? ' + ' + selectedMonster.physicalAttack.effect : ''})</span>
              </div>
              ${selectedMonster.actions && selectedMonster.actions.length > 0 ? `
                <div style="color: #cbd5e1; font-size: 10px; margin-top: 2px;">
                  <b>Spells/Actions (${selectedMonster.actions.length}):</b>
                  ${selectedMonster.actions.map(a => `${a.spellName || a.effect}${a.details ? ' [' + a.details + ']' : ''}`).join(', ')}
                </div>
              ` : '<div style="color: #64748b; font-size: 10px;">No extra source spell actions.</div>'}
            </div>
          ` : ''}
        </div>

        <!-- Section 3: Action Execution -->
        <div class="csb-section">
          <div class="csb-section-title">
            <span>⚡ Execute Enemy Action</span>
          </div>
          ${state.enemies.length === 0 ? `
            <div style="color: #94a3b8; font-size: 11px; text-align: center; padding: 6px;">
              No enemies currently in the arena. Spawn a monster above to test actions.
            </div>
          ` : `
            <div class="csb-row">
              <div class="csb-col">
                <label style="font-size: 9px; color: #94a3b8;">Attacking Enemy:</label>
                <select class="csb-select" id="csb-enemy-select">
                  ${state.enemies.map(e => `
                    <option value="${e.instanceId}" ${e.instanceId === selectedEnemyInstanceId ? 'selected' : ''}>
                      ${e.monsterSlug} (${e.currentHp}/${e.maxHp} HP, AC ${e.rolledArmorClass})${e.isDefeated ? ' [DEAD]' : ''}${e.isIllusion ? ' [ILLUSION]' : ''}
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="csb-row">
              <div class="csb-col" style="flex: 2;">
                <label style="font-size: 9px; color: #94a3b8;">Action Slot:</label>
                <select class="csb-select" id="csb-action-select">
                  ${enemyActions.map(act => `
                    <option value="${act.index}" ${act.index === selectedActionIndex ? 'selected' : ''}>
                      [${act.index === 0 ? 'PHYSICAL' : 'ACT #' + act.index}] ${act.name || act.spellName || act.effect} ${act.details ? '(' + act.details + ')' : ''}
                    </option>
                  `).join('')}
                </select>
              </div>
              <div class="csb-col" style="flex: 2;">
                <label style="font-size: 9px; color: #94a3b8;">Target Hero (if single target):</label>
                <select class="csb-select" id="csb-target-select">
                  ${state.party.map(h => `
                    <option value="${h.instanceId}" ${h.instanceId === selectedTargetInstanceId ? 'selected' : ''}>
                      ${h.name} (${h.currentHp}/${h.maxHp} HP)${h.isDefeated ? ' [DEAD]' : ''}
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>

            <button class="csb-btn" id="csb-execute-btn" style="background: #9333ea; border-color: #c084fc; padding: 7px;">
              💥 Execute Selected Action
            </button>
          `}
        </div>

        <!-- Section 4: Live Encounter Rosters -->
        <div class="csb-section">
          <div class="csb-section-title">
            <span>🛡️ Party Roster (${livingPartyCount}/6 Alive)</span>
          </div>
          <div class="csb-roster-list">
            ${state.party.map(hero => {
              const hpPct = Math.round((hero.currentHp / hero.maxHp) * 100);
              return `
                <div class="csb-roster-item ${hero.isDefeated ? 'csb-defeated' : ''}">
                  <div>
                    <b>${hero.name}</b>
                    <span style="color: #94a3b8;"> | AC ${hero.armorClass}</span>
                    ${hero.activeStatuses.map(s => `<span class="csb-tag csb-tag-danger">${s.status.toUpperCase()}</span>`).join('')}
                    ${hero.activeBuffs.map(b => `<span class="csb-tag csb-tag-success">${b.stat.toUpperCase()}+${b.magnitude}</span>`).join('')}
                  </div>
                  <div>
                    <span>${hero.currentHp}/${hero.maxHp}</span>
                    <span class="csb-hp-bar"><span class="csb-hp-fill ${hpPct <= 25 ? 'csb-hp-low' : ''}" style="width: ${hpPct}%;"></span></span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="csb-section-title" style="margin-top: 8px;">
            <span>💀 Enemy Roster (${livingEnemyCount} Alive)</span>
          </div>
          <div class="csb-roster-list">
            ${state.enemies.length === 0 ? `
              <div style="color: #64748b; font-size: 10px; text-align: center; padding: 4px;">No enemies spawned.</div>
            ` : state.enemies.map(enemy => {
              const hpPct = Math.round((enemy.currentHp / enemy.maxHp) * 100);
              return `
                <div class="csb-roster-item ${enemy.isDefeated ? 'csb-defeated' : ''} ${enemy.instanceId === selectedEnemyInstanceId ? 'csb-selected' : ''}">
                  <div>
                    <b>${enemy.monsterSlug}</b>
                    <span style="color: #94a3b8;"> | AC ${enemy.rolledArmorClass}</span>
                    ${enemy.isIllusion ? `<span class="csb-tag" style="border-color: #38bdf8; color: #38bdf8;">ILLUSION</span>` : ''}
                    ${enemy.summonedBy ? `<span class="csb-tag">SUMMON</span>` : ''}
                    ${enemy.activeStatuses.map(s => `<span class="csb-tag csb-tag-danger">${s.status.toUpperCase()}</span>`).join('')}
                    ${enemy.activeBuffs.map(b => `<span class="csb-tag csb-tag-success">${b.stat.toUpperCase()}+${b.magnitude}</span>`).join('')}
                  </div>
                  <div>
                    <span>${enemy.currentHp}/${enemy.maxHp}</span>
                    <span class="csb-hp-bar"><span class="csb-hp-fill ${hpPct <= 25 ? 'csb-hp-low' : ''}" style="width: ${hpPct}%;"></span></span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Section 5: Combat Log -->
        <div class="csb-section">
          <div class="csb-section-title">
            <span>📜 Combat Log (${state.combatLog.length})</span>
            <button class="csb-btn csb-btn-secondary" id="csb-clear-log-btn" style="padding: 2px 6px; font-size: 9px;">Clear</button>
          </div>
          <div class="csb-log-container">
            ${state.combatLog.length === 0 ? `
              <div style="color: #64748b; font-size: 10px; text-align: center; padding: 8px;">No combat log events recorded yet.</div>
            ` : state.combatLog.slice(-150).reverse().map(log => `
              <div class="csb-log-entry csb-log-${log.type}">
                <span class="csb-log-meta">[R${log.round} ${log.type.toUpperCase()}]</span>
                <span>${log.message}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    attachEvents();
  }

  /**
   * Binds interactive DOM listeners.
   */
  function attachEvents() {
    if (!rootElement) return;

    // Header toggle collapse
    rootElement.querySelector('#csb-toggle-collapse')?.addEventListener('click', (e) => {
      e.stopPropagation();
      isCollapsed = !isCollapsed;
      render();
    });

    // Close button
    rootElement.querySelector('#csb-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      isVisible = false;
      render();
    });

    // Apply Seed button
    rootElement.querySelector('#csb-apply-seed-btn')?.addEventListener('click', () => {
      const input = rootElement.querySelector('#csb-seed-input');
      if (input && input.value.trim().length > 0) {
        sandbox.setSandboxSeed(input.value.trim());
        render();
      }
    });

    // Reset Sandbox button
    rootElement.querySelector('#csb-reset-btn')?.addEventListener('click', () => {
      sandbox.resetSandbox();
      selectedEnemyInstanceId = null;
      render();
    });

    // Monster select dropdown
    rootElement.querySelector('#csb-monster-select')?.addEventListener('change', (e) => {
      selectedMonsterRef = parseInt(e.target.value, 10);
      render();
    });

    // Spawn quantity dropdown
    rootElement.querySelector('#csb-spawn-qty')?.addEventListener('change', (e) => {
      selectedSpawnQuantity = parseInt(e.target.value, 10) || 1;
    });

    // Spawn button
    rootElement.querySelector('#csb-spawn-btn')?.addEventListener('click', () => {
      for (let i = 0; i < selectedSpawnQuantity; i++) {
        sandbox.spawnSandboxMonster(selectedMonsterRef);
      }
      render();
    });

    // Enemy select dropdown
    rootElement.querySelector('#csb-enemy-select')?.addEventListener('change', (e) => {
      selectedEnemyInstanceId = e.target.value;
      selectedActionIndex = 0;
      render();
    });

    // Action select dropdown
    rootElement.querySelector('#csb-action-select')?.addEventListener('change', (e) => {
      selectedActionIndex = parseInt(e.target.value, 10) || 0;
    });

    // Target select dropdown
    rootElement.querySelector('#csb-target-select')?.addEventListener('change', (e) => {
      selectedTargetInstanceId = e.target.value;
    });

    // Execute action button
    rootElement.querySelector('#csb-execute-btn')?.addEventListener('click', () => {
      if (selectedEnemyInstanceId) {
        sandbox.executeSandboxMonsterAction(selectedEnemyInstanceId, selectedActionIndex, {
          targetInstanceId: selectedTargetInstanceId
        });
        render();
      }
    });

    // Clear log button
    rootElement.querySelector('#csb-clear-log-btn')?.addEventListener('click', () => {
      const state = sandbox.getSandboxState();
      state.combatLog = [];
      sandbox.setSandboxParty(state.party);
      render();
    });
  }

  const panelInstance = {
    /**
     * Mounts the sandbox panel into the DOM and sets up global shortcut keys.
     * @param {HTMLElement} [container=document.body]
     */
    mount(container = document.body) {
      if (rootElement) return;

      rootElement = document.createElement('div');
      container.appendChild(rootElement);

      keyHandler = (e) => {
        // Toggle on F8 or Backtick (when not focused on a text input)
        const isTextInput = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
        if (e.key === toggleKey || (!isTextInput && e.key === '`')) {
          e.preventDefault();
          panelInstance.toggle();
        }
      };

      window.addEventListener('keydown', keyHandler);
      render();
    },

    /**
     * Unmounts the panel and removes all global event listeners.
     */
    destroy() {
      if (keyHandler) {
        window.removeEventListener('keydown', keyHandler);
        keyHandler = null;
      }
      if (rootElement && rootElement.parentNode) {
        rootElement.parentNode.removeChild(rootElement);
      }
      rootElement = null;
    },

    /**
     * Toggles panel visibility.
     */
    toggle() {
      isVisible = !isVisible;
      render();
    },

    /**
     * Shows the panel.
     */
    show() {
      isVisible = true;
      render();
    },

    /**
     * Hides the panel.
     */
    hide() {
      isVisible = false;
      render();
    },

    /**
     * Exposes the underlying sandbox API.
     */
    getSandbox() {
      return sandbox;
    }
  };

  return panelInstance;
}
