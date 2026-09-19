# 📜 The Bard's Tale I (1985 C64) — Canonical Item Compendium

> **Scope**: 1985 Commodore 64 release (*The Bard's Tale: Tales of the Unknown*).  
> **Source Provenance**: Primary C64 Manual & Disassembly Tables, cross-verified against the 1986 EA Clue Book and community disassembly archives.  
> **Exclusions**: Remaster additions, NES adaptations, and sequels (*The Destiny Knight*, *Thief of Fate*).  
> **Total Canonical Entries**: 127 items across 10 distinct categories.

---

## 1. Item Taxonomy & Mechanical Effect Models

Items in *The Bard's Tale I* use three distinct mechanical effect models:

1. **Passive Equip Effects (`equipEffects`)**:
   - `armor_class_bonus`: Numeric reduction in AC (e.g. -2, -5; lower is better).
   - `hp_regen_per_round`: Restores 1 HP per combat round or exploration tick (e.g. *Troll Staff*, *Troll Ring*).
   - `sp_regen_per_round`: Restores 1 SP per round (e.g. *Mage Staff*).
   - `unlimited_bard_songs`: Allows Bard to play songs without consuming drink quota (e.g. *Bardsword*).
   - `half_spell_sp_cost`: Reduces casting cost of all spells by 50% (e.g. *Conjurstaff*).
   - `flee_chance_bonus`: Enhances party run success probability (e.g. *Speedboots*).
   - `hide_in_shadows_bonus`: Improves Rogue stealth success rate (e.g. *Thief Dagger*).

2. **On-Hit Strike Effects (`onHitEffects`)**:
   - Triggered upon successful melee hit roll: `poison`, `wither` (strength reduction), `level_drain`, `petrify` (stone), `possession`, `critical_death`.

3. **Activated / Use Effects (`useEffects`)**:
   - `cast_spell`: Casts an associated 4-letter canonical spell (e.g. `MAFL`, `ARFI`, `FLAN`, `DRBR`, `MALE`, `SOSI`, `APAR`).
   - `summon_creature`: Gates a monster or ally into the combat slot (e.g. Figurines).
   - `aoe_breath_damage`: Deals direct cone/group elemental damage (e.g. *Fire Horn* 33–46 fire, *Frost Horn* 52–59 ice, *Flame Horn* 86–101 fire).
   - **Degradation Invariant**: In the C64 engine, activated horns, wands, and carpets have a 1/64 (1.56%) chance per use to break/vanish rather than decrementing fixed integer charge pools.

---

## 2. Master Item Catalog by Category

### ⚔️ Category 1: Weapons (42 Items)

| ID / Slug | Name | Damage | Price (GP) | AC Mod | Eligible Classes | Effect Model & Details | Provenance / Notes |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| `dagger` | Dagger | 1d4 | 20 | 0 | All | Base Melee | C64 Manual p.18 |
| `staff` | Staff | 1d8 | 20 | 0 | All | Base Melee | C64 Manual p.18 |
| `short_sword` | Short Sword | 1d8 | 30 | 0 | Wa, Pa, Hu, Ba, Ro | Base Melee | C64 Manual p.18 |
| `mace` | Mace | 1d8 | 60 | 0 | Wa, Pa, Mo, Hu, Ba, Ro | Base Melee | C64 Manual p.18 |
| `war_axe` | War Axe | 2d4 | 70 | 0 | Wa, Pa, Hu, Ba | Base Melee | C64 Manual p.18 |
| `broadsword` | Broadsword | 2d4 | 80 | 0 | Wa, Pa, Hu, Ba | Base Melee | C64 Manual p.18 |
| `halbard` | Halbard | 1d16 | 200 | 0 | Wa, Pa, Mo, Hu | Base Melee (heavy pike) | C64 Manual p.18 |
| `mthr_dagger` | Mithril Dagger | 1d4+1 | 200 | 0 | All | Base Melee +1 | C64 Disk Data |
| `mthr_axe` | Mithril Axe | 2d4+1 | 300 | 0 | Wa, Pa, Mo, Hu, Ba | Base Melee +1 | C64 Disk Data |
| `mthr_sword` | Mithril Sword | 2d4+1 | 300 | 0 | Wa, Pa, Hu, Ba, Ro | Base Melee +1 | C64 Disk Data |
| `mthr_mace` | Mithril Mace | 1d8+1 | 300 | 0 | Wa, Pa, Mo, Hu, Ba, Ro | Base Melee +1 | C64 Disk Data |
| `admt_dagger` | Adamant Dagger | 1d4+2 | 300 | 0 | All | Base Melee +2 | C64 Disk Data |
| `admt_mace` | Adamant Mace | 1d8+2 | 400 | 0 | Wa, Pa, Hu, Ba, Ro | Base Melee +2 | C64 Disk Data |
| `admt_sword` | Adamant Sword | 2d4+2 | 500 | 0 | Wa, Pa, Hu, Ba | Base Melee +2 | C64 Disk Data |
| `dayblade` | Dayblade | 3d8+1 | 400 | 0 | Wa, Pa, Hu, Ba, Co, Ma, So | `cast_spell`: `MAFL` (Mage Flame) | C64 Disk Data |
| `crystal_sword` | Crystal Sword | 2d16+1 | 500 | 0 | Wa, Pa, Hu, Ba | Special: Required to slay Crystal Golem | Harkyn Level 3 / C64 Clue Book |
| `broom` | Broom | 1d4+2 | 600 | 0 | Co, Ma, So, Wi | `cast_spell`: `MALE` (Major Levitation) | C64 Disk Data |
| `hawkblade` | Hawkblade | 3d8 | 600 | 0 | Wa, Pa, Hu, Ba | High damage non-magic blade | C64 Disk Data |
| `kaels_axe` | Kael's Axe | 5d4+2 | 600 | 0 | Wa, Pa, Hu, Ba | `on_hit`: `poison` | Catacombs Level 3 / C64 Clue Book |
| `pureblade` | Pureblade | 2d16 | 600 | 0 | Pa | `cast_spell`: `FLAN` (Flesh Anew) | Paladin exclusive |
| `bardsword` | Bardsword | 2d8+1 | 700 | 0 | Ba | `equip_effect`: `unlimited_bard_songs` | Bard exclusive |
| `blood_axe` | Blood Axe | 6d4+2 | 700 | 0 | Hu | High damage Hunter axe | Hunter exclusive |
| `dmnd_dagger` | Diamond Dagger | 1d4+3 | 800 | 0 | Wa, Pa, Ba, Ro, Wi | Base Melee +3 | C64 Disk Data |
| `shield_staff` | Shield Staff | 1d16+1 | 1,000 | -2 | Wa, Pa, Hu, Co, Ma, So, Wi | `equip_effect`: `armor_class_bonus` (-2 AC) | C64 Disk Data |
| `thief_dagger` | Thief Dagger | 5d4 | 1,100 | 0 | Ro | `equip_effect`: `hide_in_shadows_bonus` | Rogue exclusive |
| `dmnd_sword` | Diamond Sword | 2d4+3 | 1,200 | 0 | Wa, Pa, Hu | Base Melee +3 | C64 Disk Data |
| `soul_mace` | Soul Mace | 2d8+1 | 1,500 | 0 | Hu, Wi | `on_hit`: `possession` | C64 Disk Data |
| `sword_of_pak` | Sword of Pak | 2d8 | 3,000 | 0 | Wa, Hu | `cast_spell`: `LESU` (Lesser Summoning) | C64 Disk Data |
| `arcs_hammer` | Arc's Hammer | 4d8+1 | 4,000 | 0 | Wa, Pa, Hu, Ba | `cast_spell`: `LERE` (Lesser Revelation) | C64 Disk Data |
| `mournblade` | Mournblade | 2d16+1 | 4,000 | 0 | Hu | `on_hit`: `level_drain` | Hunter exclusive |
| `wither_staff` | Wither Staff | 3d4+2 | 4,000 | 0 | Mo, Hu, Ro, Wi | `on_hit`: `wither` | C64 Disk Data |
| `mage_staff` | Mage Staff | 3d8 | 5,000 | -2 | Co, Ma, So, Wi | `equip_effect`: -2 AC & `sp_regen_per_round` (+1 SP) | Mage exclusive |
| `war_staff` | War Staff | 4d8 | 6,000 | 0 | Wa, Hu, Ba, Ro, Co, Ma, So, Wi | High damage quarterstaff | C64 Disk Data |
| `sorcerstaff` | Sorcerstaff | 3d4+3 | 8,000 | -2 | Co, Ma, So, Wi | `equip_effect`: -2 AC; `cast_spell`: `DIIL` | C64 Disk Data |
| `conjurstaff` | Conjurstaff | 3d4+2 | 8,000 | 0 | Co, Ma, So, Wi | `equip_effect`: `half_spell_sp_cost` | C64 Disk Data |
| `staff_of_lor` | Staff of Lor | 5d4+1 | 9,000 | 0 | Co, Ma, So | `cast_spell`: `REST`; `on_hit`: `insanity` | C64 Disk Data |
| `powerstaff` | Powerstaff | 3d8+1 | 12,000 | 0 | Co, Ma, So, Wi | `cast_spell`: `WAST` (Warstrike) | C64 Disk Data |
| `spectre_mace` | Spectre Mace | 3d8+5 | 20,000 | 0 | Wa, Hu, Wi | `on_hit`: `level_drain` | C64 Disk Data |
| `death_dagger` | Death Dagger | 3d4+3 | 60,000 | 0 | Wa, Mo, Hu, Ba, Ro, Wi | `on_hit`: `critical_death` | C64 Disk Data |
| `stoneblade` | Stoneblade | 3d8+1 | 70,000 | 0 | Wa, Hu | `on_hit`: `petrify` | C64 Disk Data |
| `troll_staff` | Troll Staff | 4d4+4 | 100,000 | 0 | Wa, Hu, Ba, Ro, Co, Ma, So, Wi | `equip_effect`: `hp_regen_per_round` (+1 HP) | C64 Disk Data |
| `spectre_snare` | Spectre Snare | 4d16+1 | 200,000 | -8 | Wa, Hu, Ba, Wi | `equip_effect`: -8 AC; `cast_spell`: `SPBI`; `on_hit`: `critical_death` | Ultimate Weapon (Kylearan Tower) |

---

### 🛡️ Category 2: Shields (10 Items)

| ID / Slug | Name | Price (GP) | AC Mod | Eligible Classes | Effect Model & Details | Provenance |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `buckler` | Buckler | 40 | -1 | Wa, Pa, Mo, Hu, Ba, Ro, Wi | Base Shield | C64 Manual p.18 |
| `tower_shield` | Tower Shield | 100 | -2 | Wa, Pa, Hu, Ba | Heavy Shield | C64 Manual p.18 |
| `mthr_shield` | Mithril Shield | 400 | -3 | Wa, Pa, Mo, Hu, Ba, Ro | Enchanted Shield | C64 Disk Data |
| `admt_shield` | Adamant Shield | 500 | -4 | Wa, Pa, Hu, Ba | Hardened Shield | C64 Disk Data |
| `luckshield` | Luckshield | 800 | -2 | All | `equip_effect`: +2 Luck roll bonus | C64 Disk Data |
| `dmnd_shield` | Diamond Shield | 1,000 | -5 | Wa | Warrior Tower Shield | C64 Disk Data |
| `arcshield` | Arcshield | 2,000 | -3 | Wa, Pa, Mo, Hu, Ba, Ro | `cast_spell`: `ARFI` (Arc Fire, Group) | C64 Disk Data |
| `pure_shield` | Pure Shield | 2,000 | -5 | Pa | Paladin Holy Shield | C64 Disk Data |
| `ybarrashield` | Ybarrashield | 10,000 | -3 | Wa, Pa, Ba | `cast_spell`: `YMCA` (Mystical Coat of Armor) | C64 Disk Data |
| `dragonshield` | Dragonshield | 15,000 | -3 | Wa, Pa, Hu | `cast_spell`: `DRBR` (Dragon Breath) | C64 Disk Data |

---

### 🥋 Category 3: Body Armor & Bracers (14 Items)

| ID / Slug | Name | Price (GP) | AC Mod | Eligible Classes | Effect Model & Details | Provenance |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `robes` | Robes | 40 | -1 | All | Base Cloth Armor | C64 Manual p.18 |
| `leather_armor` | Leather Armor | 70 | -2 | Wa, Pa, Mo, Hu, Ba, Ro, Wi | Light Armor | C64 Manual p.18 |
| `chain_mail` | Chain Mail | 150 | -3 | Wa, Pa, Hu, Ba | Metal Mesh Armor | C64 Manual p.18 |
| `scale_armor` | Scale Armor | 300 | -4 | Wa, Pa, Hu, Ba | Overlapping Scale | C64 Manual p.18 |
| `mthr_chain` | Mithril Chain | 500 | -4 | Wa, Pa, Hu, Ba | Lightweight Mithril | C64 Disk Data |
| `bracers_6` | Bracers [6] | 600 | -4 | All | Arm Bracers (sets base to AC 6) | C64 Disk Data |
| `plate_armor` | Plate Armor | 700 | -5 | Wa, Pa | Full Steel Plate | C64 Manual p.18 |
| `admt_chain` | Adamant Chain | 800 | -5 | Wa, Pa, Hu, Ba | Hardened Adamant Mesh | C64 Disk Data |
| `mthr_scale` | Mithril Scale | 900 | -5 | Wa, Pa, Hu, Ba, Co, Ma, So | Mage-wearable Scale | C64 Disk Data |
| `bracers_4` | Bracers [4] | 1,000 | -6 | Mo, Hu, Ba, Ro, Co, Ma, So, Wi | Arm Bracers (sets base to AC 4) | C64 Disk Data |
| `admt_scale` | Adamant Scale | 1,200 | -6 | Wa, Pa | Heavy Adamant Scales | C64 Disk Data |
| `mthr_plate` | Mithril Plate | 2,000 | -6 | Wa, Pa | Mithril Plate Suit | C64 Disk Data |
| `admt_plate` | Adamant Plate | 1,600 | -7 | Wa | Warrior Adamant Plate | C64 Disk Data |
| `dmnd_plate` | Diamond Plate | 4,000 | -8 | Wa | Ultimate Plate Armor | C64 Disk Data |

---

### 🪖 Category 4: Helmets (7 Items)

| ID / Slug | Name | Price (GP) | AC Mod | Eligible Classes | Effect Model & Details | Provenance |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `helm` | Helm | 50 | -1 | Wa, Pa, Hu, Ba | Base Headgear | C64 Manual p.18 |
| `mthr_helm` | Mithril Helm | 300 | -2 | Wa, Pa, Hu, Ba, Ro | Mithril Headgear | C64 Disk Data |
| `admt_helm` | Adamant Helm | 400 | -3 | Wa, Pa, Hu, Ba | Hardened Helm | C64 Disk Data |
| `dmnd_helm` | Diamond Helm | 1,100 | -4 | Wa, Pa | Diamond Facemask | C64 Disk Data |
| `lorehelm` | Lorehelm | 8,000 | -2 | Wa, Pa, Ba, Wi | `cast_spell`: `SOSI` (Sorcerer Sight) | C64 Disk Data |
| `travelhelm` | Travelhelm | 10,000 | -3 | Wa, Pa, Ba | `cast_spell`: `APAR` (Apport Arcane) | C64 Disk Data |
| `spirithelm` | Spirithelm | 50,000 | -3 | Wa, Hu | `cast_spell`: `LESU` (Lesser Summoning) | C64 Disk Data |

---

### 🧤 Category 5: Gloves & Gauntlets (5 Items)

| ID / Slug | Name | Price (GP) | AC Mod | Eligible Classes | Effect Model & Details | Provenance |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `leather_glvs` | Leather Gloves | 80 | -1 | Wa, Pa, Mo, Hu, Ba, Ro, Wi | Base Gloves | C64 Manual p.18 |
| `gauntlets` | Gauntlets | 40 | -1 | Wa, Pa, Hu | Metal Gauntlets | C64 Manual p.18 |
| `mthr_gloves` | Mithril Gloves | 400 | -2 | Wa, Pa, Hu, Ba, Ro, Wi | Mithril Mesh Gloves | C64 Disk Data |
| `admt_gloves` | Adamant Gloves | 500 | -3 | Wa, Pa, Hu, Ba | Adamant Gauntlets | C64 Disk Data |
| `wargloves` | Wargloves | 3,000 | -5 | Wa, Pa, Ba | Heavy Battle Gloves | C64 Disk Data |

---

### 🪕 Category 6: Musical Instruments (13 Items)

| ID / Slug | Name | Price (GP) | AC Mod | Eligible Classes | Effect Model & Details | Provenance |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `flute` | Flute | 130 | 0 | Ba | Standard Woodwind Instrument | C64 Manual p.18 |
| `harp` | Harp | 130 | 0 | Ba | Standard String Instrument | C64 Manual p.18 |
| `mandolin` | Mandolin | 130 | 0 | Ba | Standard Plucked Lute | C64 Manual p.18 |
| `laks_lyre` | Lak's Lyre | 1,000 | 0 | Ba | Enchanted Lyre (increased song duration) | C64 Disk Data |
| `fire_horn` | Fire Horn | 1,200 | 0 | Ba | `use_effect`: `aoe_breath_damage` (33–46 fire, 1/64 break) | C64 Clue Book |
| `fins_flute` | Fin's Flute | 1,300 | -2 | Ba | `equip_effect`: -2 AC | C64 Disk Data |
| `heal_harp` | Heal Harp | 7,000 | 0 | Ba | `cast_spell`: `WOHL` (Word of Healing) | C64 Disk Data |
| `galts_flute` | Galt's Flute | 10,000 | 0 | Ba | `cast_spell`: `INWO` (Instant Wolf) | C64 Disk Data |
| `frost_horn` | Frost Horn | 12,000 | 0 | Ba | `use_effect`: `aoe_breath_damage` (52–59 ice, 1/64 break) | C64 Clue Book |
| `flame_horn` | Flame Horn | 20,000 | 0 | Ba | `use_effect`: `aoe_breath_damage` (86–101 fire, 1/64 break) | C64 Clue Book |
| `truthdrum` | Truthdrum | 20,000 | 0 | Ba | `cast_spell`: `DISB` (Disbelieve Illusions) | C64 Disk Data |
| `spiritdrum` | Spiritdrum | 30,000 | 0 | Ba | `cast_spell`: `LESU` (Lesser Summoning) | C64 Disk Data |
| `pipes_of_pan` | Pipes of Pan | 30,000 | 0 | Ba | `cast_spell`: `GRRE` (Greater Revelation) | C64 Disk Data |

---

### 🗿 Category 7: Summoning Figurines (11 Items)

| ID / Slug | Name | Price (GP) | AC Mod | Eligible Classes | Summoned Creature & Duration | Provenance |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `golem_fgn` | Golem Figurine | 300 | 0 | All | Summons Golem (HP: 60, AC: 4) | C64 Clue Book |
| `ogre_fgn` | Ogre Figurine | 300 | 0 | All | Summons Ogre (HP: 48, AC: 4) | C64 Clue Book |
| `giant_fgn` | Giant Figurine | 400 | 0 | All | Summons War Giant (HP: 68, AC: 2) | C64 Clue Book |
| `samurai_fgn` | Samurai Figurine | 500 | 0 | All | Summons Samurai (HP: 50, AC: 3) | C64 Clue Book |
| `titan_fgn` | Titan Figurine | 600 | 0 | All | Summons Titan (HP: 110, AC: 1) | C64 Clue Book |
| `dragon_fgn` | Dragon Figurine | 800 | 0 | All | Summons Green Dragon (HP: 90, AC: 0) | C64 Clue Book |
| `mage_fgn` | Mage Figurine | 1,000 | 0 | All | Summons Master Wizard (HP: 85, AC: 1) | C64 Clue Book |
| `mongo_fgn` | Mongo Figurine | 1,000 | 0 | All | Summons Mongo (HP: 120, AC: 0) | C64 Clue Book |
| `lich_fgn` | Lich Figurine | 1,200 | 0 | All | Summons Lich (HP: 140, AC: -1) | C64 Clue Book |
| `old_man_fgn` | Old Man Figurine | 1,500 | 0 | All | Summons Old Man (HP: 160, AC: -2) | C64 Clue Book |
| `thor_fgn` | Thor Figurine | 2,000 | 0 | All | Summons Thor (HP: 220, AC: -4) | C64 Clue Book |

---

### 💍 Category 8: Rings (5 Items)

| ID / Slug | Name | Price (GP) | AC Mod | Eligible Classes | Effect Model & Details | Provenance |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `dork_ring` | Dork Ring | 100 | 0 | All | Cosmetic Ring (No magical powers) | C64 Disk Data |
| `shield_ring` | Shield Ring | 700 | -2 | All | `equip_effect`: `armor_class_bonus` (-2 AC) | C64 Disk Data |
| `ring_of_power`| Ring of Power | 40,000 | 0 | Co, Ma, So, Wi | `cast_spell`: `MIBL` (Mangar's Mind Blade) | C64 Disk Data |
| `deathring` | Deathring | 60,000 | -1 | Hu, Co, Ma, So, Wi | `cast_spell`: `ANDE` (Animate Dead) | C64 Disk Data |
| `troll_ring` | Troll Ring | 80,000 | 0 | All | `equip_effect`: `hp_regen_per_round` (+1 HP) | C64 Disk Data |

---

### 🪄 Category 9: Spell Wands (5 Items)

| ID / Slug | Name | Price (GP) | AC Mod | Eligible Classes | Effect Model & Details | Provenance |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `exorwand` | Exorwand | 1,000 | 0 | Co, Ma, So, Wi | `cast_spell`: `DISP` (Dispossess, 1/64 break) | C64 Disk Data |
| `lightwand` | Lightwand | 1,000 | 0 | Co, Ma, So, Wi | `cast_spell`: `MAFL` (Mage Flame, 1/64 break) | C64 Disk Data |
| `dragonwand` | Dragonwand | 14,000 | -1 | Co, Ma, So, Wi | `cast_spell`: `DRBR` (Dragon Breath, 1/64 break) | C64 Disk Data |
| `ogrewand` | Ogrewand | 30,000 | -1 | Co, Ma, So, Wi | `cast_spell`: `INOG` (Instant Ogre, 1/64 break) | C64 Disk Data |
| `wizwand` | Wizwand | 120,000 | -2 | Wi | `cast_spell`: `PRSU` (Prime Summoning, 1/64 break) | Wizard exclusive |

---

### 🏺 Category 10: Misc. Quest & Artifact Items (15 Items)

| ID / Slug | Name | Price (GP) | AC Mod | Eligible Classes | Effect Model & Details | Provenance / Quest Location |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `torch` | Torch | 5 | 0 | All | `use_effect`: Light (radius 2, short duration) | Garth's Shoppe / Manual |
| `lamp` | Lamp | 15 | 0 | All | `use_effect`: Light (radius 3, medium duration) | Garth's Shoppe / Manual |
| `elf_cloak` | Elf Cloak | 500 | -2 | Wa, Pa, Ba, Ro, Wi | `equip_effect`: `armor_class_bonus` (-2 AC) | C64 Disk Data |
| `alis_carpet` | Ali's Carpet | 800 | -2 | Mo, Ro, Co, Ma, So, Wi | `cast_spell`: `MALE` (Major Levitation, 1/64 break) | C64 Disk Data |
| `silver_circle` | Silver Circle | 1,000 | -1 | All | Quest Artifact: Gate Token for Mangar's Tower | Kylearan's Tower / Clue Book |
| `silver_square` | Silver Square | 1,000 | -1 | All | Quest Artifact: Gate Token for Kylearan's Tower | Castle Harkyn / Clue Book |
| `silver_triangle`| Silver Triangle | 1,000 | -1 | All | Quest Artifact: Gate Token for Sewers / Catacombs | Catacombs / Clue Book |
| `magic_mouth` | Magic Mouth | 1,200 | 0 | Ro, Co, Ma, So, Wi | `cast_spell`: `AREN` (Area Enchant) | C64 Disk Data |
| `master_key` | Master Key | 1,200 | 0 | All | Quest Item: Unlocks City Tower Gates | C64 Clue Book |
| `speedboots` | Speedboots | 2,000 | -1 | Mo, Ba, Ro, Co, Ma, So, Wi | `equip_effect`: `flee_chance_bonus` (+30% run success) | C64 Disk Data |
| `kiels_compass` | Kiel's Compass | 6,000 | 0 | Wa, Mo, Hu, Ba, Ro, Co, Ma, So, Wi | `cast_spell`: `SCSI` (Scry Site / Position) | C64 Disk Data |
| `arcs_eye` | Arc's Eye | 10,000 | 0 | Co, Ma, So, Wi | `cast_spell`: `SOSI` (Sorcerer Sight) | C64 Disk Data |
| `dag_stone` | Dag Stone | 10,000 | 0 | Pa | `cast_spell`: `GRRE` (Greater Revelation) | Paladin exclusive |
| `eye` | Eye | 50,000 | 0 | All | Quest Artifact: Amber Eye for Kylearan | Catacombs Level 3 / Clue Book |
| `onyx_key` | Onyx Key | 100,000 | 0 | All | Key Item: Unlocks Main Portcullis to Mangar | Castle Harkyn Level 3 / Clue Book |

---

## 3. Ambiguities & Release Differences

1. **Armor Class Representation**:
   - In 1985 C64 CRPG systems, Armor Class is descending. An unarmored hero has base AC 10. `Plate Armor` is described in some manuals as "+5 protection" and in others as "-5 AC". In this schema, all AC modifiers are stored as negative deltas (`armorClassModifier: -5`) applied directly to the character's base AC.
2. **Break Chance vs Charges**:
   - Unlike later DOS/Remaster versions that assign numeric counters (e.g. `charges: 10`), the C64 version executes a 1/64 random check on each use. The schema models `charges: null` and defines `breakChanceOnUse: 0.015625`.
3. **Staff of Lor Dual Nature**:
   - `Staff of Lor` possesses both an activated cast capability (`REST` Restoration) and an on-hit melee affliction (`insanity`), captured as dual `useEffects` and `onHitEffects`.
