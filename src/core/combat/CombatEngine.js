// CombatEngine.js - Turn-Based CRPG Combat Engine
// Faithful to The Bard's Tale (1985) d20 mechanics with class-specific abilities.
//
// Front 3 party members can melee and be melee'd.
// Back 3 can only use magic/ranged and can only be hit by magic.
// Up to 4 monster groups. Special slot for summoned creatures.

import { getClassByName, getAttackCount, getCriticalHitChance, getMonkBonuses, getMagicResistance, attemptHideInShadows } from '../../data/RaceClassData.js';
import { getSpellByCode } from '../../data/SpellDatabase.js';
import { getBardSong, getMaxSongsBeforeDrink } from '../../data/BardSongs.js';
import { rollRangeInclusive, rollDice } from '../utils/Dice.js';
import { ConditionSystem } from '../conditions/ConditionSystem.js';

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
    this.monsters = monsterGroup.map(m => this._normalizeMonster(m));
    this.initialMonsters = this.monsters.map(m => ({ ...m }));
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

  /**
   * Authentic 1985 C64 Survivor XP & Gold Split:
   * Total XP = sum of fixed XP values of all defeated monsters.
   * Total Gold = sum of gold values of all defeated monsters.
   * Divided evenly among all surviving player characters (dead characters receive 0).
   * @returns {{ totalXp: number, totalGold: number, xpPerSurvivor: number, goldPerSurvivor: number, survivorsCount: number, messages: string[] }}
   */
  calculateAndAwardVictoryRewards() {
    const defeatedMonsters = this.initialMonsters || [];
    const totalXp = defeatedMonsters.reduce((sum, m) => sum + (m.xp || 60), 0);
    const totalGold = defeatedMonsters.reduce((sum, m) => sum + (m.gold || 20), 0);

    // Surviving player characters only (not dead, not summoned allies)
    const survivors = this.party.filter(hero => {
      const isDead = hero.status === 'DEAD' || (hero.currentHp !== undefined ? hero.currentHp <= 0 : (hero.hp !== undefined && hero.hp <= 0));
      return !isDead;
    });

    const deadHeroes = this.party.filter(hero => {
      const isDead = hero.status === 'DEAD' || (hero.currentHp !== undefined ? hero.currentHp <= 0 : (hero.hp !== undefined && hero.hp <= 0));
      return isDead;
    });

    const messages = [];

    if (survivors.length > 0) {
      const xpPerSurvivor = Math.floor(totalXp / survivors.length);
      const goldPerSurvivor = Math.floor(totalGold / survivors.length);

      survivors.forEach(hero => {
        hero.xp = (hero.xp || 0) + xpPerSurvivor;
        hero.gold = (hero.gold || 0) + goldPerSurvivor;
        if (hero.currentHp !== undefined) hero.hp = hero.currentHp;
      });

      messages.push(`🏆 VICTORY! Defeated foes yielded ${totalXp.toLocaleString()} XP and ${totalGold.toLocaleString()} Gold.`);
      messages.push(`⚔️ Each of the ${survivors.length} surviving heroes receives ${xpPerSurvivor.toLocaleString()} XP and ${goldPerSurvivor.toLocaleString()} Gold!`);

      if (deadHeroes.length > 0) {
        deadHeroes.forEach(d => {
          messages.push(`💀 ${d.name} is dead and received 0 XP.`);
        });
      }
    } else {
      messages.push(`💀 No heroes survived to claim the spoils of victory.`);
    }

    messages.forEach(m => this.log.push(m));

    return {
      totalXp,
      totalGold,
      xpPerSurvivor: survivors.length > 0 ? Math.floor(totalXp / survivors.length) : 0,
      goldPerSurvivor: survivors.length > 0 ? Math.floor(totalGold / survivors.length) : 0,
      survivorsCount: survivors.length,
      messages
    };
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

    // Old / Withered status penalty (+4 AC penalty)
    ac += ConditionSystem.getEffectiveACPenalty(partyMember);

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
    const memberName = partyMember.name ?? 'Hero';
    const partyIndex = this.party.indexOf(partyMember);
    const messages = [];
    let killed = false;

    // ── CONDITION CHECK (Dead, Stoned, Paralyzed cannot act) ───────────────
    if (!ConditionSystem.canTakeTurn(partyMember)) {
      const cond = ConditionSystem.normalizeCondition(partyMember.condition || partyMember.status);
      if (cond.code === 'DEAD') {
        messages.push(`${memberName} is dead and cannot act!`);
      } else if (cond.code === 'STON') {
        messages.push(`🗿 ${memberName} is turned to stone and cannot act!`);
      } else if (cond.code === 'PARA') {
        messages.push(`⚡ ${memberName} is paralyzed and cannot act!`);
      } else {
        messages.push(`${memberName} cannot act!`);
      }
      messages.forEach(m => this.log.push(m));
      return { messages, killed: false };
    }

    // ── POSSESSION CHECK (Hostile to party - attacks allies) ───────────────
    if (ConditionSystem.isHostileToParty(partyMember)) {
      const partyAllies = this.party.filter(p => p !== partyMember && (p.currentHp ?? p.hp ?? 0) > 0);
      if (partyAllies.length > 0) {
        const allyTarget = partyAllies[Math.floor(Math.random() * partyAllies.length)];
        const allyIdx = this.party.indexOf(allyTarget);
        const allyAC = this.getEffectiveAC(allyTarget, allyIdx);
        const roll = Math.floor(Math.random() * 20) + 1;
        messages.push(`😈 ${memberName} is POSSESSED and turns against ${allyTarget.name}!`);

        if (roll >= 20 - allyAC) {
          const dmg = Math.floor(Math.random() * 6) + 2;
          if (allyTarget.currentHp !== undefined) allyTarget.currentHp -= dmg;
          else allyTarget.hp = (allyTarget.hp ?? 20) - dmg;
          messages.push(`💥 ${memberName} strikes ally ${allyTarget.name} for ${dmg} damage!`);
          if ((allyTarget.currentHp ?? allyTarget.hp ?? 0) <= 0) {
            allyTarget.status = 'DEAD';
            allyTarget.condition = 'DEAD';
            messages.push(`💀 ${allyTarget.name} was slain by friendly fire!`);
          }
        } else {
          messages.push(`${memberName} swings at ${allyTarget.name} but misses!`);
        }
        messages.forEach(m => this.log.push(m));
        return { messages, killed: false };
      }
    }

    // ── INSANITY CHECK (Nuts / Insane - erratic behavior) ─────────────────
    if (ConditionSystem.isErratic(partyMember) && Math.random() < 0.45) {
      if (Math.random() < 0.5) {
        messages.push(`🤪 ${memberName} is INSANE and babbles uncontrollably!`);
      } else {
        const partyAllies = this.party.filter(p => p !== partyMember && (p.currentHp ?? p.hp ?? 0) > 0);
        if (partyAllies.length > 0) {
          const allyTarget = partyAllies[Math.floor(Math.random() * partyAllies.length)];
          messages.push(`🤪 ${memberName} is INSANE and lunges wildly at ${allyTarget.name}!`);
          const dmg = Math.floor(Math.random() * 4) + 1;
          if (allyTarget.currentHp !== undefined) allyTarget.currentHp -= dmg;
          else allyTarget.hp = (allyTarget.hp ?? 20) - dmg;
          messages.push(`💥 ${allyTarget.name} takes ${dmg} damage!`);
        }
      }
      messages.forEach(m => this.log.push(m));
      return { messages, killed: false };
    }

    const effStats = ConditionSystem.getEffectiveAttributes(partyMember);
    const st = effStats.st;
    const dx = effStats.dx;
    const iq = effStats.iq;
    const lk = effStats.lk;
    const classDef = getClassByName(partyMember.class);

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

        // d20 hit roll — Classic Bard's Tale descending AC:
        // Lower AC = better armor = harder to hit.
        // Formula: roll + hitBonus >= 20 - targetAC
        // AC 10 (unarmored) → need >= 10, AC 0 (plate) → need >= 20, AC -5 → need >= 25
        const roll = Math.floor(Math.random() * 20) + 1;
        const hitThreshold = 20 - (target.ac ?? 10);

        // Hit bonuses from buffs
        let hitBonus = Math.floor(dx / 2);
        for (const buff of this.partyBuffs) {
          if (buff.stat === 'hit') hitBonus += buff.value;
        }
        if (this.activeBardSong?.song.combatEffect?.stat === 'hit') {
          hitBonus += this.activeBardSong.song.combatEffect.bonus;
        }

        const hitSuccess = roll === 20 || (roll + hitBonus >= hitThreshold);

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

    // Each monster attacks using its 4 action slots
    for (let mi = 0; mi < this.monsters.length; mi++) {
      const monster = this.monsters[mi];
      if (monster.currentHp <= 0) continue;

      // Stunned monsters skip their turn
      if (this.stunnedMonsters.has(mi)) continue;

      // Wayland's Watch damage reduction
      let damageReduction = 0;
      if (this.activeBardSong?.song.name === "Wayland's Watch") {
        damageReduction = Math.abs(this.activeBardSong.song.combatEffect?.penalty || 2);
      }

      // Pick an action uniformly from the 4 stored action slots
      const actionSlots = monster.actionSlots || [{ type: 'meleeAttack' }, { type: 'meleeAttack' }, { type: 'meleeAttack' }, { type: 'meleeAttack' }];
      const chosenAction = actionSlots[Math.floor(Math.random() * actionSlots.length)] || { type: 'meleeAttack' };

      const isMelee = chosenAction.type === 'meleeAttack' || chosenAction.kind === 'attack' || !chosenAction.type;
      const isBreath = chosenAction.type === 'breathWeapon' || chosenAction.spellName === 'Breath';
      const isSpell = chosenAction.type === 'castSpell' || chosenAction.kind === 'spell';
      const isDuplicate = chosenAction.type === 'duplicate' || chosenAction.effect === 'doppleganger';
      const isSummon = chosenAction.type === 'summon' || chosenAction.effect === 'summon';

      // ── 1. BREATH WEAPONS (Ranged Cone Attack over entire party) ───────────
      if (isBreath) {
        const damageNotation = chosenAction.damage || chosenAction.details?.damage || '16d4';
        let breathDmg = 32;
        try {
          breathDmg = rollDice(damageNotation).total;
        } catch {
          breathDmg = Math.floor(Math.random() * 30) + 15;
        }

        const element = chosenAction.element || chosenAction.details?.element || 'fire';
        messages.push(`🔥 ${monster.name} breathes ${element} over the entire party for ${breathDmg} damage!`);

        aliveParty.forEach(target => {
          let pDmg = breathDmg;
          const dxVal = target.stats?.dx || target.dx || 10;
          if (Math.floor(Math.random() * 20) + 1 + Math.floor((dxVal - 10) / 4) >= 12) {
            pDmg = Math.floor(pDmg / 2); // Dex save halves breath damage
          }

          if (target.currentHp !== undefined) target.currentHp -= pDmg;
          else target.hp = (target.hp ?? 20) - pDmg;

          const remHp = target.currentHp ?? target.hp ?? 0;
          if (remHp <= 0) {
            target.status = 'DEAD';
            messages.push(`💀 ${target.name} was slain by the breath!`);
          } else {
            messages.push(`💥 ${target.name} takes ${pDmg} breath damage (${remHp} HP remaining).`);
          }
        });
        continue;
      }

      // ── 2. DUPLICATE (Doppelganger / Mimic clones itself) ─────────────────
      if (isDuplicate) {
        if (this.monsters.length < 12) {
          const clone = this._normalizeMonster({ ...monster, name: monster.name });
          this.monsters.push(clone);
          messages.push(`🌀 ${monster.name} shifts and duplicates itself!`);
        } else {
          messages.push(`🌀 ${monster.name} attempts to duplicate but the area is crowded!`);
        }
        continue;
      }

      // ── 3. SPELL CASTING / SUMMONING ──────────────────────────────────────
      if (isSpell || isSummon) {
        const spellName = chosenAction.spellName || chosenAction.details?.type || 'Arcane Blast';
        messages.push(`✨ ${monster.name} casts ${spellName}!`);

        if (chosenAction.effect === 'damageGroup' || chosenAction.spellName === 'WARSTRIKE' || chosenAction.spellName === 'STARFLARE' || chosenAction.spellName === 'SHOCK-SPHERE') {
          const spellDmg = Math.floor(Math.random() * 16) + 8;
          aliveParty.forEach(target => {
            if (target.currentHp !== undefined) target.currentHp -= spellDmg;
            else target.hp = (target.hp ?? 20) - spellDmg;
            messages.push(`💥 ${target.name} takes ${spellDmg} spell damage!`);
          });
        } else if (chosenAction.effect === 'status' || chosenAction.spellName === 'DEATHSTRIKE') {
          const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];
          if (target) {
            if (chosenAction.spellName === 'DEATHSTRIKE' || chosenAction.details === 'critical') {
              target.status = 'DEAD';
              target.currentHp = 0;
              target.hp = 0;
              messages.push(`💀 ${monster.name}'s Deathstrike slays ${target.name} instantly!`);
            } else {
              target.status = 'POISONED';
              messages.push(`☠️ ${target.name} is afflicted with poison!`);
            }
          }
        }
        continue;
      }

      // ── 4. MELEE ATTACK (Range check & advance logic) ──────────────────────
      if (monster.distanceFeet > 10) {
        monster.distanceFeet = Math.max(10, monster.distanceFeet - 10);
        messages.push(`🏃 ${monster.name} advances to ${monster.distanceFeet} feet!`);
        continue;
      }

      // At 10 feet: Pick a target and roll physical melee attack
      let target;
      if (this.specialSlot && this.specialSlot.currentHp > 0 && Math.random() < 0.4) {
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

      const targetIdx = Math.floor(Math.random() * aliveParty.length);
      target = aliveParty[targetIdx];
      const globalIndex = this.party.indexOf(target);

      if (!this.isInFrontRow(globalIndex)) {
        const frontRowAlive = aliveParty.filter((_, i) => this.isInFrontRow(this.party.indexOf(aliveParty[i])));
        if (frontRowAlive.length > 0) {
          target = frontRowAlive[Math.floor(Math.random() * frontRowAlive.length)];
        }
      }

      const gIdx = this.party.indexOf(target);
      const roll = Math.floor(Math.random() * 20) + 1;
      const effectiveAC = this.getEffectiveAC(target, gIdx);
      const hitThreshold = 20 - effectiveAC;
      const hitSuccess = roll >= hitThreshold;

      if (roll === 1) {
        messages.push(`${monster.name} stumbles in its attack!`);
      } else if (hitSuccess || roll === 20) {
        let damage = Math.max(1, Math.floor(Math.random() * (monster.damage || 6)) + 1 - damageReduction);
        if (roll === 20) damage = Math.floor(damage * 1.5);

        if (target.currentHp !== undefined) {
          target.currentHp -= damage;
        } else {
          target.hp = (target.hp ?? 20) - damage;
        }

        const currentHp = target.currentHp ?? target.hp ?? 0;
        let msg = `${monster.name} attacks ${target.name} for ${damage} damage!`;

        // ── ON-HIT STATUS EFFECTS ───────────────────────────────────────────
        const onHit = monster.onHitEffect || (monster.abilities && monster.abilities.find(a => ['poison', 'wither', 'insanity', 'possess', 'drain', 'stone', 'critical'].includes(a)));
        if (onHit && currentHp > 0) {
          const eff = onHit.toLowerCase();
          if (eff === 'poison') {
            target.status = 'POISONED';
            msg += ` ${target.name} is poisoned!`;
          } else if (eff === 'wither') {
            target.status = 'WITHERED';
            target.st = 1; target.iq = 1; target.dx = 1; target.cn = 1; target.lk = 1;
            msg += ` ${target.name} feels their strength wither to 1!`;
          } else if (eff === 'insanity') {
            target.status = 'INSANE';
            msg += ` ${target.name} is stricken with insanity!`;
          } else if (eff === 'possess') {
            target.status = 'POSSESSED';
            msg += ` ${target.name} is possessed!`;
          } else if (eff === 'drain') {
            target.level = Math.max(1, (target.level || 1) - 1);
            msg += ` ${target.name} loses an experience level!`;
          } else if (eff === 'stone') {
            target.status = 'STONED';
            target.currentHp = 0;
            target.hp = 0;
            msg += ` 🗿 ${target.name} is turned to stone!`;
          } else if (eff === 'critical') {
            target.status = 'DEAD';
            target.currentHp = 0;
            target.hp = 0;
            msg += ` 💀 ${target.name} is decapitated!`;
          }
        }

        if (currentHp <= 0) {
          target.status = target.status === 'STONED' ? 'STONED' : 'DEAD';
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

    // Poison damage at end of round (POIS condition)
    for (const member of this.party) {
      const cond = ConditionSystem.normalizeCondition(member.condition || member.status);
      if (cond.code === 'POIS') {
        const poisonDmg = Math.floor(Math.random() * 3) + 1;
        const tickRes = ConditionSystem.applyPoisonTick(member, poisonDmg);
        this.log.push(`☠️ ${member.name} takes ${poisonDmg} poison damage (${tickRes.newHp} HP left).`);
        if (tickRes.died) {
          this.log.push(`💀 ${member.name} has succumbed to poison and died!`);
        }
      }

      // Passive item regeneration in combat (+1 HP per round)
      let hasRegen = false;
      if (member.equipped) {
        for (const slot in member.equipped) {
          const it = member.equipped[slot];
          if (it && (it.regeneration || it.name === 'Troll Ring' || it.name === 'Troll Staff' || it.name === 'Ring of Health')) {
            hasRegen = true;
            break;
          }
        }
      }
      const maxHp = member.maxHp ?? member.hp ?? 20;
      const currHp = member.currentHp ?? member.hp ?? 0;
      if (hasRegen && currHp > 0 && currHp < maxHp && member.status !== 'DEAD') {
        if (member.currentHp !== undefined) member.currentHp = Math.min(maxHp, member.currentHp + 1);
        else member.hp = Math.min(maxHp, member.hp + 1);
        this.log.push(`✨ ${member.name} regenerates +1 HP from enchanted gear.`);
      }
    }
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────

  /**
   * Normalize a monster object from either raw MonsterDatabase format or
   * pre-rolled MonsterFactory format into a consistent combat-ready shape.
   *
   * Handles:
   *  - hp as { min, max } range → rolls a scalar value
   *  - hp as scalar → uses directly
   *  - currentHp/maxHp from MonsterFactory → uses directly
   *  - armorClass as { min, max } → rolls a scalar
   *  - rolledArmorClass from MonsterFactory → uses directly
   *  - ac as scalar → uses directly
   *  - physicalAttack.damage as dice notation string → rolls max damage potential
   *  - damage as scalar → uses directly
   *  - Derives 'abilities' array from physicalAttack.effect and actions[]
   *
   * @param {object} m - Raw monster data or MonsterFactory combatant
   * @returns {object} Normalized combat-ready monster object
   */
  _normalizeMonster(m) {
    // ── HP ──
    let currentHp, maxHp;
    if (typeof m.currentHp === 'number') {
      // Already rolled (MonsterFactory or pre-normalized)
      currentHp = m.currentHp;
      maxHp = m.maxHp ?? m.currentHp;
    } else if (m.hp && typeof m.hp === 'object' && 'min' in m.hp) {
      // Raw MonsterDatabase format: { min, max }
      maxHp = rollRangeInclusive(m.hp);
      currentHp = maxHp;
    } else {
      // Scalar fallback
      maxHp = m.hp ?? 20;
      currentHp = maxHp;
    }

    // ── AC ──
    let ac;
    if (typeof m.rolledArmorClass === 'number') {
      // MonsterFactory format
      ac = m.rolledArmorClass;
    } else if (m.armorClass && typeof m.armorClass === 'object' && 'min' in m.armorClass) {
      // Raw MonsterDatabase format: { min, max }
      ac = rollRangeInclusive(m.armorClass);
    } else {
      // Scalar or missing
      ac = m.ac ?? 10;
    }

    // ── Damage ──
    // Store both the notation string (for proper dice rolling) and a scalar fallback
    let damage, damageNotation;
    if (m.physicalAttack?.damage && typeof m.physicalAttack.damage === 'string') {
      damageNotation = m.physicalAttack.damage;
      // Parse dice notation for scalar fallback (max possible single roll)
      try {
        const parsed = rollDice(m.physicalAttack.damage);
        damage = parsed.total;
      } catch {
        damage = m.damage ?? 6;
      }
    } else {
      damage = m.damage ?? 6;
      damageNotation = null;
    }

    // ── Abilities (derived from physicalAttack.effect and actions) ──
    const abilities = [];

    // Physical attack special effects (e.g., poison, drain, stone, wither, possess, insanity, critical)
    if (m.physicalAttack?.effect && typeof m.physicalAttack.effect === 'string') {
      abilities.push(m.physicalAttack.effect);
    }

    // Spell-casting ability (derived from having spell actions)
    if (Array.isArray(m.actions) && m.actions.some(a => a.kind === 'spell')) {
      abilities.push('castSpell');
    }

    // Preserve any pre-existing abilities array (for manually constructed monsters)
    if (Array.isArray(m.abilities)) {
      for (const a of m.abilities) {
        if (!abilities.includes(a)) abilities.push(a);
      }
    }

    // Action slots (preserve 4 slots exactly)
    const actionSlots = Array.isArray(m.actionSlots)
      ? m.actionSlots.map(s => ({ ...s }))
      : Array.isArray(m.actions) && m.actions.length > 0
        ? [ { type: 'meleeAttack' }, ...m.actions.slice(0, 3) ]
        : [ { type: 'meleeAttack' }, { type: 'meleeAttack' }, { type: 'meleeAttack' }, { type: 'meleeAttack' } ];

    while (actionSlots.length < 4) {
      actionSlots.push({ type: 'meleeAttack' });
    }

    const onHitEffect = m.onHitEffect || m.physicalAttack?.effect || null;
    const distanceFeet = typeof m.distanceFeet === 'number' ? m.distanceFeet : 10;

    return {
      ...m,
      currentHp,
      maxHp,
      ac,
      damage,
      damageNotation,
      name: m.name ?? 'Monster',
      xp: m.xp ?? 0,
      xpValue: m.xpValue ?? m.xp ?? 0,
      abilities,
      actionSlots,
      onHitEffect,
      distanceFeet
    };
  }

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
