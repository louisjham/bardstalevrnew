# 🗺️ The Bard's Tale I (1985 C64) — Encounter Generation Algorithm & Architecture

**Author**: Lead XR Engineer & Systems Architect  
**Scope**: Area- and Time-Based Encounter Tables vs Party Scaling  
**Target Systems**: `src/core/encounter/EncounterGenerator.js`, `src/data/MonsterDatabase.js`, `src/world/skara-brae/SkaraBraeGrid.js`

---

## 1. Core Principles: No Dynamic Party Scaling

In the 1985 Commodore 64 release of *The Bard's Tale: Tales of the Unknown*, combat encounters are **never dynamically scaled** to party level, party size, average HP, or total XP.

The game uses **pure area- and time-based encounter tables**:
- **Zone/Area**: City Streets, Wine Cellar, Catacombs (Levels 1–3), Harkyn's Castle, Kylearan's Tower, Mangar's Tower.
- **Time of Day**: `day` vs `night` (changes city street table from low-tier single-group encounters to high-danger multi-group ambushes).
- **Trigger Type**:
  - `movement`: Periodic random encounter check triggered when entering a walkable map tile.
  - `forcedTile`: Keyed map coordinate that guaranteed an encounter (e.g. Wine Cellar ambush squares, guardian gates).
  - `scripted`: Fixed boss/story encounter (e.g. 4 groups of 99 Berserkers in Kylearan's Tower, Mangar's final confrontation).

---

## 2. The 4-Step Encounter Decision Pipeline

```
  ┌────────────────────────────────────────────────────────┐
  │                 Party Steps Onto Tile                  │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  [Step 1: Check Trigger] ────► Is tile a Forced/Scripted encounter?
         │                     ├── YES ──► Load Fixed Encounter Definition
         │                     └── NO  ──► Roll Random Encounter Check (RNG < Threshold)
         ▼
  [Step 2: Select Table] ─────► Look up Encounter Table based on (Zone + Day/Night)
         ▼
  [Step 3: Group Count] ──────► Roll Number of Monster Groups:
                                • Skara Brae Day: Exactly 1 group
                                • Skara Brae Night: 1–4 groups
                                • Wine Cellar: 1–3 groups
                                • Dungeons/Towers: 1–4 groups
         ▼
  [Step 4: Group Ingestion] ──► For each group:
                                • Pick monster archetype from table's eligible pool
                                • Roll group size within monster's allowed capacity
                                • Instantiate combatants with rolled HP & AC
```

---

## 3. Zone & Time-Based Table Catalog

| Encounter Table ID | Location / Context | Time | Group Range | Eligible Monster Archetypes |
|:---|:---|:---:|:---:|:---|
| `SKARA_BRAE_DAY` | Skara Brae Streets | Day | **1 group** | Kobolds, Hobbits, Gnomes, Dwarves, Thieves, Hobgoblins, Conjurers, Magicians, Orcs, Skeletons, Nomads, Spiders, Mad Dogs, Barbarians, Mercenaries |
| `SKARA_BRAE_NIGHT` | Skara Brae Streets | Night | **1–4 groups** | Wolves, Jade Monks, Half-Orcs, Swordsmen, Zombies, Sorcerers, Wizards, Samurai, Black Widows, Assassins, Werewolves, Ogres, Wights, Statues |
| `WINE_CELLAR` | Tavern Wine Cellar | Any | **1–3 groups** | Daytime street pool + Wolves, Half-Orcs, Zombies |
| `CATACOMBS_L1` | Catacombs / Sewers 1 | Any | **1–4 groups** | Bladesmen, Goblin Lords, Master Thieves, Spinners, Dopplegangers, Werewolves, Wights |
| `CATACOMBS_L2_3` | Catacombs / Sewers 2–3 | Any | **1–4 groups** | Scarlet Monks, Stone Giants, Ogre Magicians, Stone Elementals, Blue Dragons, Ghouls, Azure Monks, Weretigers, Hydras, Green Dragons, Wraiths |
| `HARKYNS_CASTLE` | Harkyn's Castle | Any | **1–4 groups** | Lurkers, Fire Giants, Copper Dragons, Ivory Monks, Shadows, Berserkers, Ice Giants, Eye Spies, Ogre Lords, Xorns, Phantoms, Lesser Demons, Master Ninjas, War Giants, Grey Dragons, Basilisks |
| `KYLEARANS_TOWER` | Kylearan's Tower | Any | **1–4 groups** | Ghosts, Grey Dragons, Evil Eyes, Golems, Vampires, Demons, Bandersnatches, Mongos, Red Dragons, Titans, Mind Shadows, Spectres |
| `MANGARS_TOWER` | Mangar's Tower | Any | **1–4 groups** | Mangar Guards, Cloud Giants, Beholders, Vampire Lords, Greater Demons, Master Wizards, Jabberwocks, Black Dragons, Crystal Golems, Soul Suckers, Storm Giants, Ancient Enemies, Balrogs, Liches, Archmages, Demon Lords |

---

## 4. Forced & Scripted Combat Squares

1. **Kylearan's 99 Berserkers**: Coordinate `(Kylearan's Tower 3: 0, 15)` -> `[ { id: 65, name: 'Berserker', count: 99 }, { id: 65, count: 99 }, { id: 65, count: 99 }, { id: 65, count: 99 } ]`.
2. **Wine Cellar Ambush Tiles**: Coordinates `(3, 5)` and `(7, 12)` -> Guaranteed 2–3 groups of cellar vermin.
3. **Mangar Guard Gate**: Coordinate `(Mangar Floor 5: 11, 11)` -> 2 Red Dragons + 4 Storm Giants.
4. **Mangar Final Confrontation**: Coordinate `(Mangar Floor 5: 15, 15)` -> 1 Mangar + 2 Vampire Lords + 1 Demon Lord.
