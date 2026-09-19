# 🎲 The Bard's Tale I (1985 C64) — Combat RNG & Open Engineering Questions

**Author**: Lead XR Engineer & Systems Architect  
**Scope**: 6502 Machine Code / C64 Disassembly Behavioral Inferences vs Emulator Observations  

---

## 1. Verified Core Behaviors vs Hypotheses

| Feature | Classification | Source & Evidence |
|:---|:---:|:---|
| **4 Action Slots** | **Disk-Verified** | Binary record structures in C64 monster table explicitly store 4 action offsets. |
| **On-Hit Status Afflictions** | **Disk-Verified** | Dedicated `effect` byte assigned in physical attack block. |
| **Fixed XP Multiples** | **Disk-Verified** | Decoded byte $\times 256$ representation for values $\le 0x10$. |
| **Survivor Pool Split** | **Reference-Supported** | 1985 manual explicitly states XP & Gold are divided among living survivors. |
| **10-Foot Melee Threshold** | **Emulator-Observed** | Combat UI blocks melee strikes beyond 10ft; monsters advance before frontline rounds. |
| **Action Slot Uniform Selection** | **High-Confidence Hypothesis** | Slots 0–3 rolled with uniform $p=0.25$ RNG. Duplicate entries create $50\%$ weighting. |
| **Summon Ally Group Caps** | **Emulator-Observed** | Max 4 enemy groups and 1 party special ('S') slot. |

---

## 2. Open Engineering Questions for Future Disassembly

1. **RNG Roll Sequence & Slot Fallback**:
   - *Question*: Does the engine roll a uniform 2-bit index (`0..3`) and fallback to Advance if the chosen action is out of range, or does it filter legal actions before rolling?
   - *Working Implementation*: Uniform 2-bit roll (`0..3`). If melee is selected at $>10\text{ft}$, the creature uses its turn to advance 10 feet.
2. **Duplicate/Doppelganger Cap**:
   - *Question*: Does duplication abort if the group is at max capacity (e.g. 8 or 16 monsters), falling back to attack?
   - *Working Implementation*: If group size $< \text{maxGroupSize}$, add 1 clone; otherwise fallback to attack.
3. **Saving Throw Formulas for Dragon Breath**:
   - *Question*: Exact d20 vs Luck/Dexterity saving throw thresholds for half-damage reduction.
   - *Working Implementation*: Dexterity / Luck d20 check ($\ge 12$) halves breath damage; Paladin magic resistance reduces damage further.
