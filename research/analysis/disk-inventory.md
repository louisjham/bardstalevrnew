# 💽 C64 Disk Image Inventory & Preservation Report

> **Target Image**: `source-original.d64`  
> **Preservation Scope**: Read-only technical evaluation for preservation and non-distributive reference.  
> **Target Path**: `research/original-images/source-original.d64`  
> **Analyzer Engine**: [`research/d64_analyzer.mjs`](file:///c:/antigravity/TheBardsTaleVR/research/d64_analyzer.mjs)

---

## 1. Disk Image Metadata & Technical Summary

| Technical Property | Value / Specification |
| :--- | :--- |
| **Input Disk Image** | `research/original-images/source-original.d64` |
| **Physical Geometry** | Commodore 1541 Single-Sided 5¼" Floppy Disk |
| **Track Architecture** | Standard 35 Tracks (683 Sectors total, 256 bytes/sector) |
| **Uncompressed Capacity** | **174,848 bytes** (Standard 35-track D64 without error bytes) |
| **BAM Location** | Track 18, Sector 0 (Block Availability Map & Disk Header) |
| **Directory Track** | Track 18, Sectors 1–18 (Up to 144 directory entries) |
| **Encoding Format** | GCR (Group Coded Recording) encoded as flat D64 sector image |
| **Target Extraction Directory** | [`research/extracted-prg/`](file:///c:/antigravity/TheBardsTaleVR/research/extracted-prg/) |

---

## 2. Typical C64 *Bard's Tale* Boot Disk Structure

In authentic 1985 Interplay/EA releases of *The Bard's Tale: Tales of the Unknown*, the master boot disk employs a standard C64 BAM header with a stage-1 BASIC/ML loader, which subsequently activates a proprietary track/sector fastloader (`Interplay FastLoader`) to stream compressed data banks:

```
Track 18, Sector 0 : BAM Header ["THE BARD'S TALE", ID: "BT", DOS: "2A"]
Track 18, Sector 1 : Directory Entry 0 -> "THE BARD'S TALE" (PRG, Load $0801)
Tracks 1-17, 19-35 : Encrypted / Fastload Data Sectors (City, Dungeon, Monster Overlays)
```

---

## 3. Directory & File Extraction Schema

When a `.d64` image is placed into `research/original-images/source-original.d64` and analyzed via `node research/d64_analyzer.mjs`, every sector chain is parsed into [`research/extracted-prg/`](file:///c:/antigravity/TheBardsTaleVR/research/extracted-prg/) with the following metadata:

| Field | Description |
| :--- | :--- |
| **PETSCII Name** | Raw 16-character Commodore PETSCII string |
| **File Type** | Standard CBM type (`PRG`, `SEQ`, `USR`, `REL`, `DEL`) |
| **Block Count** | Allocated 254-byte data sectors |
| **Load Address** | 2-byte little-endian memory origin (e.g. `$0801` for BASIC, `$2000` for VIC-II bitmap, `$C000` for high ML) |
| **Probable Role** | Classification: `code`, `bitmap`, `character set`, `sprites`, `music`, `data table` |
| **Verification Status** | Distinction between verified binary signatures and heuristic pattern matches |

---

## 4. Legal, Copyright & Research Provenance Guidelines

- **Research & Preservation Use Only**: The disk image and all extracted PRG binaries are retained strictly within the `research/` directory for historical analysis, engine reverse-engineering, and layout inspection.
- **No Redistribution**: No original copyrighted binary art, ROM routines, or proprietary sound tables may be added to public or shipping runtime folders (`src/`, `public/`, `dist/`).
- **Independent Art Derivation**: Extracted pixel dimensions (160×200 multicolor aspect ratio), palette indices (16 C64 hardware colors), and character cell alignments serve solely as reference for independently created Three.js procedural shaders, textures, and 3D models.
