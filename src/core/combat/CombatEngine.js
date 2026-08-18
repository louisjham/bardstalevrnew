// CombatEngine.js - Turn-Based CRPG Combat Engine
// Faithful to The Bard's Tale (1985) d20 mechanics with class-specific abilities.
//
// Front 3 party members can melee and be melee'd.
// Back 3 can only use magic/ranged and can only be hit by magic.
// Up to 4 monster groups. Special slot for summoned creatures.

import { getClassByName, getAttackCount, getCriticalHitChance, getMonkBonuses, getMagicResistance, attemptHideInShadows } from '../../data/RaceClassData.js';
import { getSpellByCode } from '../../data/SpellDatabase.js';
import { getBardSong, getMaxSongsBeforeDrink } from '../../data/BardSongs.js';

export class CombatEngine {
  constructor() {
    this.inCombat = false;
    this.currentTurn = 0;
    this.monsters = [];
    this.party = [];
    this.log = [];

    // Active buff tracking
    this.activeBardSong = null;    // { song, turnsRemaining }
    this.defendingMembers = new Set();
    this.hiddenMembers = new Set(); // Rogues hiding in shadows
    this.stunnedMonsters = new Set(); // Monster indices stunned this round
    this.partyBuffs = [];           // [{ type, stat, value, turnsRemaining, source }]
    this.specialSlot = null;        // Summoned creature in the S slot
  }

  // ─── Encounter Lifecycle ──────────────────────────────────────────────

  startEncounter(party, monsterGroup) {
    if (!party || party.length === 0) {
      console.warn('[CombatEngine] Cannot start encounter without a party.');
      return ['⚠️ No party assembled!'];
    }
    if (!monsterGroup || monsterGroup.length === 0) {
      console.warn('[CombatEngine] Cannot start encounter without monsters.');
      return ['⚠️ No monsters to fight!'];
    }

    this.inCombat = true;
    this.party = party;
    this.monsters = monsterGroup.map(m => ({
      ...m,
      currentHp: m.currentHp ?? m.hp ?? 20,
      maxHp: m.hp ?? m.currentHp ?? 20,
      ac: m.ac ?? 10,
      damage: m.damage ?? 6,
      name: m.name ?? 'Monster'
    }));
    this.currentTurn = 1;
    this.activeBardSong = null;
    this.defendingMembers.clear();
    this.hiddenMembers.clear();
    this.stunnedMonsters.clear();
    this.partyBuffs = [];
    this.specialSlot = null;

    const monsterName = monsterGroup[0]?.name || 'Monster';
    this.log = [`⚔️ You face death in the form of ${monsterGroup.length} ${monsterName}(s)!`];
    return this.log;
  }

  endEncounter() {
    this.inCombat = false;
    this.activeBardSong = null;
    this.defendingMembers.clear();
    this.hiddenMembers.clear();
    this.stunnedMonsters.clear();
    this.partyBuffs = [];
    // Summoned creatures are dismissed
    this.specialSlot = null;
  }

  isVictory() {
    return this.monsters.length === 0;
  }

  isPartyWiped() {
    return this.party.every(m => (m.currentHp ?? m.hp ?? 0) <= 0);
  }

  // ─── Row Logic ────────────────────────────────────────────────────────
  // Manual: First 3 characters can attack/be attacked physically.
  // Last 3 can only use magic and be hit by magic.

  /**
   * Check if a party member is in the front row (can melee).
   * @param {number} partyIndex
   * @returns {boolean}
   */
  isInFrontRow(partyIndex) {
    return partyIndex < 3;
  }

  /**
   * Check if a party member can perform a physical attack.
   * @param {number} partyIndex
   * @returns {boolean}
   */
  canMeleeAttack(partyIndex) {
    return this.isInFrontRow(partyIndex);
  }

  // ─── Effective AC Calculation ─────────────────────────────────────────

  getEffectiveAC(partyMember, partyIndex) {
    let ac = partyMember.ac ?? 10;

    // Bard song AC bonus
    if (this.activeBardSong && this.activeBardSong.song.combatEffect?.stat === 'ac') {
      ac += this.activeBardSong.song.combatEffect.bonus; // negative = better
    }

    // Defend stance
    if (this.defendingMembers.has(partyIndex)) {
      ac -= 3;
    }

    // Party buffs (Traveller's Tune, spells, etc.)
    for (const buff of this.partyBuffs) {
      if (buff.stat === 'ac') {
        ac += buff.value; // negative = better
      }
    }

    // Monk unarmed AC bonus
    const monkBonuses = getMonkBonuses(partyMember);
    if (monkBonuses.acBonus !== 0 && !partyMember.equipped?.armor) {
      ac += monkBonuses.acBonus; // negative = better
    }

    // Hidden in shadows = very hard to hit
    if (this.hiddenMembers.has(partyIndex)) {
      ac -= 6;
    }

    return ac;
  }

  // ─── Turn Execution ───────────────────────────────────────────────────

  /**
   * Execute a single party member's action.
   * @param {object} partyMember
   * @param {string} action - 'ATTACK' | 'SING_BARD_SONG' | 'DEFEND' | 'CAST_SPELL' | 'HIDE_IN_SHADOWS' | 'USE_ITEM'
   * @param {object|null} target - Target monster
   * @param {object} [options] - { spellCode, songNumber, itemData }
   * @returns {{ messages: string[], killed: boolean }}
   */
  executeTurnAction(partyMember, action, target = null, options = {}) {
    const st = partyMember.st ?? 10;
    const dx = partyMember.dx ?? 10;
    const iq = partyMember.iq ?? 10;
    const lk = partyMember.lk ?? 10;
    const memberName = partyMember.name ?? 'Hero';
    const classDef = getClassByName(partyMember.class);
    const partyIndex = this.party.indexOf(partyMember);

    const messages = [];
    let killed = false;

    // ── ATTACK ──────────────────────────────────────────────────
    if (action === 'ATTACK') {
      // Back-row members cannot melee
      if (!this.canMeleeAttack(partyIndex)) {
        messages.push(`${memberName} is in the back row and cannot attack physically!`);
        return { messages, killed: false };
      }

      if (!target || target.currentHp <= 0) {
        target = this.monsters.find(m => m.currentHp > 0);
        if (!target) {
          messages.push(`${memberName} has no target!`);
          return { messages, killed: false };
        }
      }

      // Warrior/Paladin multi-attack
      const attackCount = getAttackCount(partyMember);

      for (let atk = 0; atk < attackCount; atk++) {
        if (target.currentHp <= 0) {
          // Find next living target
          target = this.monsters.find(m => m.currentHp > 0);
          if (!target) break;
        }

        // Hunter critical hit check (instant kill)
        const critChance = getCriticalHitChance(partyMember);
        if (critChance > 0 && Math.random() < critChance) {
          messages.push(`💀 ${memberName} finds a vital spot and instantly slays ${target.name}!`);
          target.currentHp = 0;
          this._removeMonster(target);
          killed = true;
          continue;
        }

        // d20 hit roll
        const roll = Math.floor(Math.random() * 20) + 1;
        const hitThreshold = (target.ac ?? 10) + 10;

        // Hit bonuses from buffs
        let hitBonus = Math.floor(dx / 2);
        for (const buff of this.partyBuffs) {
          if (buff.stat === 'hit') hitBonus += buff.value;
        }
        if (this.activeBardSong?.song.combatEffect?.stat === 'hit') {
          hitBonus += this.activeBardSong.song.combatEffect.bonus;
        }

        const hitSuccess = roll === 20 || (roll + hitBonus > hitThreshold);

        if (roll === 1) {
          messages.push(`${memberName} swings wildly and misses!`);
        } else if (hitSuccess) {
          // Base damage: 1d8 + ST/3
          let damage = Math.floor(Math.random() * 8) + 1 + Math.floor(st / 3);

          // Monk unarmed bonus
          const monkBonuses = getMonkBonuses(partyMember);
          if (monkBonuses.damage > 0 && !partyMember.equipped?.weapon) {
            damage += Math.floor(Math.random() * monkBonuses.damage) + 1;
          }

          // Weapon damage bonus
          if (partyMember.equipped?.weapon?.damage) {
            damage += partyMember.equipped.weapon.damage;
          }

          // Bard song damage bonus (Falkentyne's Fury)
          if (this.activeBardSong?.song.combatEffect?.stat === 'damage') {
            damage += this.activeBardSong.song.combatEffect.bonus;
          }

          // Party damage buffs
          for (const buff of this.partyBuffs) {
            if (buff.stat === 'damage') damage += buff.value;
          }

          // Critical hit on nat 20
          if (roll === 20) {
            damage *= 2;
            messages.push(`💥 CRITICAL! ${memberName} devastates ${target.name} for ${damage}!`);
          } else {
            messages.push(`${memberName} hits ${target.name} for ${damage} damage!`);
          }

          target.currentHp -= damage;
          if (target.currentHp <= 0) {
            messages.push(`${target.name} is slain!`);
            this._removeMonster(target);
            killed = true;
          }
        } else {
          messages.push(`${memberName} attacks ${target.name} but misses!`);
        }
      }
    }

    // ── BARD SONG ───────────────────────────────────────────────
    else if (action === 'SING_BARD_SONG') {
      const songNumber = options.songNumber || 5; // Default: Traveller's Tune
      const song = getBardSong(songNumber);

      if (!song) {
        messages.push(`${memberName} doesn't know that song!`);
        return { messages, killed: false };
      }

      // Check if Bard has songs remaining (= experience level)
      const songsLeft = partyMember.songsRemaining ?? (partyMember.level || 1);
      if (songsLeft <= 0) {
        messages.push(`${memberName}'s throat is dry! Visit a tavern for a drink.`);
        return { messages, killed: false };
      }

      // Check for instrument
      if (!partyMember.equipped?.instrument && !partyMember.inventory?.some(i => i?.category === 'INSTRUMENT')) {
        messages.push(`${memberName} needs a musical instrument to play!`);
        return { messages, killed: false };
      }

      // Only one song at a time
      this.activeBardSong = { song, turnsRemaining: 3 };

      // Decrement songs remaining
      if (partyMember.songsRemaining !== undefined) {
        partyMember.songsRemaining--;
      }

      messages.push(`🎵 ${memberName} plays ${song.name}! ${song.combatEffect?.description || ''}`);
    }

    // ── DEFEND ──────────────────────────────────────────────────
    else if (action === 'DEFEND') {
      if (partyIndex >= 0) {
        this.defendingMembers.add(partyIndex);
      }
      messages.push(`🛡️ ${memberName} takes a defensive stance! (AC +3)`);
    }

    // ── CAST SPELL ──────────────────────────────────────────────
    else if (action === 'CAST_SPELL') {
      const spellCode = options.spellCode || 'ARFI';
      const spell = getSpellByCode(spellCode);

      if (!spell) {
        messages.push(`${memberName} doesn't know that spell!`);
        return { messages, killed: false };
      }

      // Check SP
      const currentSp = partyMember.sp ?? partyMember.maxSp ?? 0;
      if (currentSp < spell.spCost) {
        messages.push(`${memberName} lacks the spell points for ${spell.name}! (Need ${spell.spCost}, have ${currentSp})`);
        return { messages, killed: false };
      }

      // Deduct SP
      partyMember.sp = currentSp - spell.spCost;

      // Apply spell effect
      const effect = spell.effect;

      if (effect.type === 'damage') {
        // Calculate damage
        let totalDamage = 0;
        const rolls = effect.diceCount || 1;
        const sides = effect.diceSides || 4;
        for (let i = 0; i < rolls; i++) {
          totalDamage += Math.floor(Math.random() * sides) + 1;
        }

        // Per-level scaling (Mind Jab, Mind Fist, Arc Fire)
        if (effect.perLevel) {
          totalDamage *= (partyMember.level || 1);
        }

        if (effect.target === 'group' || effect.target === 'allfoes') {
          // AoE damage
          const targets = effect.target === 'allfoes' ? [...this.monsters] : this._getFirstGroup();
          for (const m of targets) {
            if (m.currentHp <= 0) continue;
            // Type restrictions
            if (effect.undeadOnly && m.type !== 'undead') continue;
            if (effect.demonOnly && m.type !== 'demon') continue;

            m.currentHp -= totalDamage;
            if (m.currentHp <= 0) {
              messages.push(`${m.name} is slain by ${spell.name}!`);
              this._removeMonster(m);
              killed = true;
            }
          }
          messages.push(`✨ ${memberName} casts ${spell.name} for ${totalDamage} damage to ${effect.target === 'allfoes' ? 'all foes' : 'a group'}!`);
        } else {
          // Single target
          if (!target) target = this.monsters.find(m => m.currentHp > 0);
          if (target) {
            if (effect.undeadOnly && target.type !== 'undead') {
              messages.push(`${spell.name} has no effect on ${target.name}!`);
            } else if (effect.demonOnly && target.type !== 'demon') {
              messages.push(`${spell.name} has no effect on ${target.name}!`);
            } else {
              target.currentHp -= totalDamage;
              messages.push(`✨ ${memberName} casts ${spell.name} on ${target.name} for ${totalDamage} damage!`);
              if (target.currentHp <= 0) {
                messages.push(`${target.name} is slain!`);
                this._removeMonster(target);
                killed = true;
              }
            }
          }
        }
      } else if (effect.type === 'heal' || effect.type === 'fullHeal') {
        const healTargets = effect.target === 'party' ? this.party : [target || partyMember];
        for (const t of healTargets) {
          if (!t) continue;
          const maxHp = t.maxHp ?? t.hp ?? 20;
          if (effect.type === 'fullHeal') {
            t.currentHp = maxHp;
          } else {
            const healed = (effect.diceCount || 2) * (Math.floor(Math.random() * (effect.diceSides || 4)) + 1);
            t.currentHp = Math.min(maxHp, (t.currentHp ?? 0) + healed);
          }
          if (effect.curesPoison && t.status === 'POISONED') t.status = 'OK';
          if (effect.curesInsanity && t.status === 'INSANE') t.status = 'OK';
        }
        messages.push(`✨ ${memberName} casts ${spell.name}! Wounds are healed!`);
      } else if (effect.type === 'acBonus') {
        this.partyBuffs.push({
          stat: 'ac', value: effect.value,
          turnsRemaining: spell.duration === 'indefinite' ? 999 : 3,
          source: spell.name
        });
        messages.push(`✨ ${memberName} casts ${spell.name}! AC improved!`);
      } else if (effect.type === 'summon') {
        this.specialSlot = {
          name: effect.creature,
          hp: effect.hp, currentHp: effect.hp, maxHp: effect.hp,
          ac: effect.ac, damage: effect.damage,
          isIllusion: effect.isIllusion || false,
          source: spell.name
        };
        messages.push(`✨ ${memberName} casts ${spell.name}! A ${effect.creature} joins the party!`);
      } else if (effect.type === 'instantKill') {
        if (target && Math.random() < effect.chance) {
          target.currentHp = 0;
          messages.push(`💀 ${memberName} casts ${spell.name}! ${target.name} is destroyed!`);
          this._removeMonster(target);
          killed = true;
        } else {
          messages.push(`✨ ${memberName} casts ${spell.name} but it fails!`);
        }
      } else if (effect.type === 'stun') {
        const stunTargets = this._getFirstGroup();
        stunTargets.forEach((m, i) => this.stunnedMonsters.add(this.monsters.indexOf(m)));
        messages.push(`✨ ${memberName} casts ${spell.name}! Enemies are stunned!`);
      } else if (effect.type === 'debuff' || effect.type === 'fear' || effect.type === 'curse' || effect.type === 'wither') {
        messages.push(`✨ ${memberName} casts ${spell.name}! Enemies are weakened!`);
        // Apply AC penalty to monsters
        const debuffTargets = this._getFirstGroup();
        debuffTargets.forEach(m => { m.ac = (m.ac ?? 10) + 2; });
      } else if (effect.type === 'petrify') {
        if (target && Math.random() < (effect.chance || 0.5)) {
          target.currentHp = 0;
          messages.push(`✨ ${memberName} casts ${spell.name}! ${target.name} is turned to stone!`);
          this._removeMonster(target);
          killed = true;
        } else {
          messages.push(`✨ ${memberName} casts ${spell.name} but it has no effect!`);
        }
      } else {
        // Utility spells (light, teleport, etc.) - just log
        messages.push(`✨ ${memberName} casts ${spell.name}!`);
      }
    }

    // ── HIDE IN SHADOWS ─────────────────────────────────────────
    else if (action === 'HIDE_IN_SHADOWS') {
      if (attemptHideInShadows(partyMember)) {
        this.hiddenMembers.add(partyIndex);
        messages.push(`🌑 ${memberName} melts into the shadows...`);
      } else {
        messages.push(`${memberName} tries to hide but is spotted!`);
      }
    }

    else {
      messages.push(`${memberName} hesitates...`);
    }

    // Add all messages to log
    messages.forEach(m => this.log.push(m));
    return { messages, killed };
  }

  // ─── Monster Counter-Attack Phase ─────────────────────────────────────

  executeMonsterPhase() {
    const messages = [];
    const aliveParty = this.party.filter(m => (m.currentHp ?? m.hp ?? 0) > 0);
    if (aliveParty.length === 0) return messages;

    // Special slot creature attacks first if present
    if (this.specialSlot && this.specialSlot.currentHp > 0) {
      const target = this.monsters.find(m => m.currentHp > 0);
      if (target) {
        const damage = Math.floor(Math.random() * this.specialSlot.damage) + 1;
        target.currentHp -= damage;
        messages.push(`${this.specialSlot.name} attacks ${target.name} for ${damage} damage!`);
        if (target.currentHp <= 0) {
          messages.push(`${target.name} is slain!`);
          this._removeMonster(target);
        }
      }
    }

    // Each monster attacks
    for (let mi = 0; mi < this.monsters.length; mi++) {
      const monster = this.monsters[mi];
      if (monster.currentHp <= 0) continue;

      // Stunned monsters skip their turn
      if (this.stunnedMonsters.has(mi)) continue;

      // Wayland's Watch damage reduction
      let damageReduction = 0;
      if (this.activeBardSong?.song.combatEffect?.stat === 'damage' &&
          this.activeBardSong.song.combatEffect.bonus < 0) {
        // Wait, Wayland's Watch is an enemy debuff
      }
      if (this.activeBardSong?.song.name === "Wayland's Watch") {
        damageReduction = Math.abs(this.activeBardSong.song.combatEffect.penalty || 0);
      }

      // Monsters tend to attack special members first (manual tip)
      let target;
      if (this.specialSlot && this.specialSlot.currentHp > 0 && Math.random() < 0.4) {
        // Attack the special
        const damage = Math.max(1, Math.floor(Math.random() * (monster.damage || 6)) + 1 - damageReduction);
        this.specialSlot.currentHp -= damage;
        let msg = `${monster.name} attacks ${this.specialSlot.name} for ${damage} damage!`;
        if (this.specialSlot.currentHp <= 0) {
          msg += ` ${this.specialSlot.name} is destroyed!`;
          this.specialSlot = null;
        }
        messages.push(msg);
        continue;
      }

      // Pick a random living party member
      // Monsters are smart — they usually attack vulnerable characters (manual tip)
      const targetIdx = Math.floor(Math.random() * aliveParty.length);
      target = aliveParty[targetIdx];
      const globalIndex = this.party.indexOf(target);

      // Check if monster can reach this target (front row only for physical)
      const isPhysicalAttack = !(monster.abilities?.includes('castSpell'));
      if (isPhysicalAttack && !this.isInFrontRow(globalIndex)) {
        // Try to find a front-row target instead
        const frontRowAlive = aliveParty.filter((_, i) => this.isInFrontRow(this.party.indexOf(aliveParty[i])));
        if (frontRowAlive.length > 0) {
          target = frontRowAlive[Math.floor(Math.random() * frontRowAlive.length)];
        }
        // If no front row alive, they can reach back row
      }

      const gIdx = this.party.indexOf(target);

      // Monster hit roll: d20 vs effective AC
      const roll = Math.floor(Math.random() * 20) + 1;
      const effectiveAC = this.getEffectiveAC(target, gIdx);
      const hitSuccess = roll > effectiveAC + 10;

      if (roll === 1) {
        messages.push(`${monster.name} stumbles in its attack!`);
      } else if (hitSuccess || roll === 20) {
        let damage = Math.max(1, Math.floor(Math.random() * (monster.damage || 6)) + 1 - damageReduction);
        if (roll === 20) damage = Math.floor(damage * 1.5);

        // Paladin magic resistance
        if (isPhysicalAttack === false) {
          const resist = getMagicResistance(target);
          if (resist > 0 && Math.random() * 100 < resist) {
            messages.push(`${target.name} resists ${monster.name}'s magic!`);
            continue;
          }
        }

        // Apply damage
        if (target.currentHp !== undefined) {
          target.currentHp -= damage;
        } else {
          target.hp = (target.hp ?? 20) - damage;
        }

        const currentHp = target.currentHp ?? target.hp ?? 0;
        let msg = `${monster.name} attacks ${target.name} for ${damage} damage!`;

        // Special monster abilities
        if (monster.abilities?.includes('drainLevel') && Math.random() < 0.2) {
          target.level = Math.max(1, (target.level || 1) - 1);
          msg += ` Level drained!`;
        }
        if (monster.abilities?.includes('poison') && Math.random() < 0.3) {
          target.status = 'POISONED';
          msg += ` ${target.name} is poisoned!`;
        }
        if (monster.abilities?.includes('petrify') && Math.random() < 0.1) {
          target.status = 'STONED';
          target.currentHp = 0;
          msg += ` 💀 ${target.name} is turned to stone!`;
        }

        if (currentHp <= 0) {
          msg += ` 💀 ${target.name} has fallen!`;
        }

        messages.push(msg);
      } else {
        messages.push(`${monster.name} attacks ${target.name} but misses!`);
      }
    }

    // Bard song healing (Badh'r Kilnfest heals party during combat)
    if (this.activeBardSong?.song.combatEffect?.type === 'partyHeal') {
      const healAmount = this.activeBardSong.song.combatEffect.amount || 4;
      for (const member of this.party) {
        const maxHp = member.maxHp ?? member.hp ?? 20;
        if ((member.currentHp ?? member.hp ?? 0) > 0) {
          member.currentHp = Math.min(maxHp, (member.currentHp ?? member.hp ?? 0) + healAmount);
        }
      }
      messages.push(`🎵 The melody heals the party for ${healAmount} HP!`);
    }

    messages.forEach(m => this.log.push(m));
    return messages;
  }

  // ─── End-of-Turn Bookkeeping ──────────────────────────────────────────

  advanceTurn() {
    this.currentTurn++;

    // Expire Bard song
    if (this.activeBardSong) {
      this.activeBardSong.turnsRemaining--;
      if (this.activeBardSong.turnsRemaining <= 0) {
        this.log.push(`🎵 ${this.activeBardSong.song.name} fades away...`);
        this.activeBardSong = null;
      }
    }

    // Expire party buffs
    this.partyBuffs = this.partyBuffs.filter(buff => {
      buff.turnsRemaining--;
      if (buff.turnsRemaining <= 0) {
        this.log.push(`${buff.source} wears off.`);
        return false;
      }
      return true;
    });

    // Clear defend stances and hidden status
    this.defendingMembers.clear();
    this.hiddenMembers.clear();
    this.stunnedMonsters.clear();

    // Poison damage at end of round
    for (const member of this.party) {
      if (member.status === 'POISONED') {
        const poisonDmg = Math.floor(Math.random() * 3) + 1;
        member.currentHp = (member.currentHp ?? member.hp ?? 0) - poisonDmg;
        this.log.push(`☠️ ${member.name} takes ${poisonDmg} poison damage!`);
      }
    }
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────

  _removeMonster(monster) {
    const idx = this.monsters.indexOf(monster);
    if (idx !== -1) this.monsters.splice(idx, 1);
  }

  /**
   * Get monsters in the first attackable group (first 2 groups per manual).
   */
  _getFirstGroup() {
    // For simplicity, treat the first batch of same-name monsters as a group
    if (this.monsters.length === 0) return [];
    const firstName = this.monsters[0]?.name;
    return this.monsters.filter(m => m.name === firstName && m.currentHp > 0);
  }

  /**
   * Calculate XP reward split among survivors.
   * @returns {{ xp: number, gold: number }}
   */
  calculateRewards() {
    let totalXP = 0;
    let totalGold = 0;
    // Use initial encounter data if tracked, otherwise estimate
    for (const m of this.log) {
      if (m.includes('slain')) totalXP += 50;
    }
    const survivors = this.party.filter(m => (m.currentHp ?? m.hp ?? 0) > 0);
    const perMember = survivors.length > 0 ? Math.floor(totalXP / survivors.length) : 0;
    return { xp: perMember, gold: Math.floor(totalGold / Math.max(1, survivors.length)) };
  }
}
