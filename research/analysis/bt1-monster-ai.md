# 🤖 The Bard's Tale I (1985 C64) — Monster "AI" & Tactical Slot Execution

**Author**: Lead XR Engineer & Systems Architect  
**Scope**: 4-Slot Tactical Automation & On-Hit Melee Status Pipeline  
**Target Systems**: `src/core/combat/CombatEngine.js`, `src/core/combat/MonsterEffectResolver.js`, `src/data/MonsterDatabase.js`

---

## 1. Core Architecture: Slot-Driven Automation vs Behavior Trees

Original 1985 *The Bard's Tale* monsters were purely **data-driven**, not governed by complex behavior trees or modern cooldown systems.

### 🎰 The 4-Action Slot Model
Every monster possesses an immutable 4-slot action table. During its combat turn, the monster selects one action from its 4 slots:

```typescript
type MonsterAction =
  | { type: "meleeAttack" }
  | { type: "castSpell"; spellId: number; spellName: string }
  | { type: "breathWeapon"; damage: string; element: string }
  | { type: "summon"; creature: string; isIllusion: boolean }
  | { type: "duplicate" };
```

### 🎲 Authentic Weighting Through Duplicate Slots
Because probability in BT1 is determined by the frequency of entries across the 4 slots:
- **Mundane Melee Foes** (`Attack, Attack, Attack, Attack`): **100% physical attack rate**.
- **Dragons** (`Attack, Attack, Breath, Breath`): **50% breath weapon / 50% physical attack rate**.
- **Doppelganger / Mimic** (`Attack, Attack, Duplicate, Duplicate`): **50% replication rate**.
- **Enemy Spellcasters** (`Attack, Spell1, Spell2, Spell3`): **75% magic / 25% physical attack rate**.
- **High-Tier Bosses** (e.g. *Mangar*: `Greater Summon, Wind Giant, Deathstrike, Dragon Breath`): **100% spell/summon/breath rate**.

---

## 2. On-Hit Melee Status Effects

Separate from special action slots, certain creatures inflict status afflictions on regular physical hits:

| On-Hit Effect | Afflicted Monsters | Gameplay & Combat Impact |
|:---|:---|:---|
| **Poison** | *Black Widow, Spinner, Eye Spy, Evil Eye, Beholder* | Inflicts periodic poison damage each combat round & exploration tick. |
| **Withering** | *Wight, Ghoul, Lesser Demon, Ghost, Ancient Enemy* | Crushes all physical and mental attributes to 1. Requires Temple purification. |
| **Insanity** | *Wraith, Shadow, Demon, Balrog* | Confuses hero; victim may attack party members or wander erratically. |
| **Possession** | *Body Snatcher, Greater Demon, Lich* | Enslaves hero to actively attack party until purified at Temple. |
| **Level Drain** | *Phantom, Vampire, Spectre, Vampire Lord* | Drains experience level and resets XP to prior tier. |
| **Petrification** | *Basilisk, Demon Lord, Mad God* | Turns victim to stone (`HP = 0`). Requires *Stone to Flesh* spell or Temple. |
| **Critical Hit** | *Master Ninja, Mangar, Old Man* | Instant lethal decapitation (`HP = 0, status = DEAD`). |

---

## 3. Distance, Range Rules & Advance Behavior

1. **Range Grid**:
   - `10 feet`: Melee engagement range (physical melee attacks are legal).
   - `20+ feet`: Ranged standoff (physical melee attacks are **illegal**; only spells, breath weapons, summons, and ranged missiles are legal).
2. **Advance Logic**:
   - If an actionable creature rolls `meleeAttack` while at `distance > 10ft`, it cannot strike; instead, it **advances 10 feet closer**.
   - Advance movements resolve at the start of the monster counter-attack phase.
   - Once closing to 10 feet, subsequent turns enable standard melee combat.

---

## 4. Execution Pipeline (`CombatEngine.js`)

```
   ┌──────────────────────────────────────────────┐
   │             Monster Turn Begins              │
   └──────────────────────┬───────────────────────┘
                          │
                          ▼
            Pick Action from 4 Stored Slots
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
   [Melee Attack]                 [Breath / Spell / Summon]
         │                                 │
   Is Distance > 10ft?                     ▼
   ┌─────┴─────┐                     Execute Ranged Effect
  YES         NO                     • Breath: Cone damage
   │           │                     • Spell: Group/single damage
   ▼           ▼                     • Summon: Spawn reinforcement
Advance    Physical Attack           • Duplicate: Clone monster
10 Feet    • Roll d20 vs AC
           • Check On-Hit Effect
           • Apply Poison/Wither/Drain
```
