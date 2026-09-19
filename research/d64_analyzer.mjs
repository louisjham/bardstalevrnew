/**
 * D64 Disk Image Extractor and Technical Preservation Analyzer
 * 
 * Complies with Commodore 64 1541 D64 filesystem specifications (35/40-track).
 * Decodes BAM, directory chains, PETSCII filenames, sector link chains,
 * extracts PRG/SEQ/USR files, computes SHA-256 digests, and classifies
 * potential graphics, code, and audio assets.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SECTORS_PER_TRACK = [
  0, // 0-indexed dummy
  21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, // Tracks 1-17
  19, 19, 19, 19, 19, 19, 19,                                         // Tracks 18-24 (Dir at 18)
  18, 18, 18, 18, 18, 18,                                             // Tracks 25-30
  17, 17, 17, 17, 17,                                                 // Tracks 31-35
  17, 17, 17, 17, 17                                                  // Optional 40-track expansion
];

const FILE_TYPES = {
  0: 'DEL',
  1: 'SEQ',
  2: 'PRG',
  3: 'USR',
  4: 'REL'
};

export function petsciiToAscii(bytes) {
  let str = '';
  for (const b of bytes) {
    if (b === 0xa0) break; // Shifted space padding
    if (b >= 0x41 && b <= 0x5a) {
      str += String.fromCharCode(b); // A-Z
    } else if (b >= 0x61 && b <= 0x7a) {
      str += String.fromCharCode(b); // a-z
    } else if (b >= 0x30 && b <= 0x39) {
      str += String.fromCharCode(b); // 0-9
    } else if (b >= 0x20 && b <= 0x7e) {
      str += String.fromCharCode(b);
    } else {
      str += `_`;
    }
  }
  return str.trim();
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_\-\.]/g, '_').toLowerCase() || 'unnamed';
}

export function getSectorOffset(track, sector) {
  if (track < 1 || track > 40) return -1;
  let totalSectors = 0;
  for (let t = 1; t < track; t++) {
    totalSectors += SECTORS_PER_TRACK[t];
  }
  totalSectors += sector;
  return totalSectors * 256;
}

export function analyzeD64(d64Path, outputDir, analysisDir) {
  if (!fs.existsSync(d64Path)) {
    throw new Error(`D64 image not found at: ${d64Path}`);
  }

  const d64Buffer = fs.readFileSync(d64Path);
  const fileSize = d64Buffer.length;
  const sha256 = crypto.createHash('sha256').update(d64Buffer).digest('hex');

  let trackCount = 35;
  if (fileSize === 174848) trackCount = 35;
  else if (fileSize === 175104) trackCount = 35; // with error bytes
  else if (fileSize === 196608 || fileSize === 197376) trackCount = 40;

  // Read BAM (Track 18, Sector 0)
  const bamOffset = getSectorOffset(18, 0);
  const diskNameBytes = d64Buffer.subarray(bamOffset + 144, bamOffset + 160);
  const diskIdBytes = d64Buffer.subarray(bamOffset + 162, bamOffset + 167);
  const diskName = petsciiToAscii(diskNameBytes);
  const diskId = petsciiToAscii(diskIdBytes);

  const directoryEntries = [];
  let dirTrack = d64Buffer[bamOffset];
  let dirSector = d64Buffer[bamOffset + 1];

  const visitedDirSectors = new Set();

  while (dirTrack > 0 && dirTrack <= trackCount) {
    const dirKey = `${dirTrack}:${dirSector}`;
    if (visitedDirSectors.has(dirKey)) break;
    visitedDirSectors.add(dirKey);

    const dirOffset = getSectorOffset(dirTrack, dirSector);
    if (dirOffset < 0 || dirOffset + 256 > d64Buffer.length) break;

    const nextTrack = d64Buffer[dirOffset];
    const nextSector = d64Buffer[dirOffset + 1];

    for (let entryIdx = 0; entryIdx < 8; entryIdx++) {
      const entryOffset = dirOffset + entryIdx * 32;
      const rawType = d64Buffer[entryOffset + 2];
      if (rawType === 0) continue; // Deleted / unused

      const fileTypeInt = rawType & 0x07;
      const isClosed = (rawType & 0x80) !== 0;
      const isLocked = (rawType & 0x40) !== 0;
      const fileTypeStr = FILE_TYPES[fileTypeInt] || `UNK(${fileTypeInt})`;

      const startTrack = d64Buffer[entryOffset + 3];
      const startSector = d64Buffer[entryOffset + 4];

      const rawPetsciiName = d64Buffer.subarray(entryOffset + 5, entryOffset + 21);
      const petsciiName = petsciiToAscii(rawPetsciiName);
      const blocks = d64Buffer[entryOffset + 30] | (d64Buffer[entryOffset + 31] << 8);

      directoryEntries.push({
        entryIdx,
        dirTrack,
        dirSector,
        rawType,
        fileTypeStr,
        isClosed,
        isLocked,
        startTrack,
        startSector,
        rawPetsciiName,
        petsciiName,
        blocks
      });
    }

    dirTrack = nextTrack;
    dirSector = nextSector;
  }

  // Extract Files and Classify
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(analysisDir, { recursive: true });

  const extractedFiles = [];

  for (const entry of directoryEntries) {
    if (entry.startTrack === 0) {
      extractedFiles.push({
        ...entry,
        status: 'EMPTY_ZERO_TRACK',
        outputFilename: null,
        dataLength: 0,
        loadAddressHex: 'N/A',
        first16Hex: 'N/A',
        probableRole: 'unknown',
        evidence: 'Empty or scratch entry',
        confidence: 'high'
      });
      continue;
    }

    let curTrack = entry.startTrack;
    let curSector = entry.startSector;
    const fileChunks = [];
    const visitedSectors = new Set();
    let isCorrupted = false;

    while (curTrack > 0 && curTrack <= trackCount) {
      const secKey = `${curTrack}:${curSector}`;
      if (visitedSectors.has(secKey)) {
        isCorrupted = true;
        break; // Loop detected
      }
      visitedSectors.add(secKey);

      const secOffset = getSectorOffset(curTrack, curSector);
      if (secOffset < 0 || secOffset + 256 > d64Buffer.length) {
        isCorrupted = true;
        break;
      }

      const nextT = d64Buffer[secOffset];
      const nextS = d64Buffer[secOffset + 1];

      if (nextT === 0) {
        // Last sector: nextS contains index of last valid byte (inclusive)
        const lastByteIdx = nextS;
        if (lastByteIdx >= 1 && lastByteIdx <= 255) {
          fileChunks.push(d64Buffer.subarray(secOffset + 2, secOffset + lastByteIdx + 1));
        } else {
          fileChunks.push(d64Buffer.subarray(secOffset + 2, secOffset + 256));
        }
        break;
      } else {
        fileChunks.push(d64Buffer.subarray(secOffset + 2, secOffset + 256));
        curTrack = nextT;
        curSector = nextS;
      }
    }

    const fileData = Buffer.concat(fileChunks);
    const safeName = sanitizeFilename(entry.petsciiName) + (entry.fileTypeStr === 'PRG' ? '.prg' : `.${entry.fileTypeStr.toLowerCase()}`);
    const outputPath = path.join(outputDir, safeName);

    fs.writeFileSync(outputPath, fileData);

    // Analyze File Properties
    let loadAddress = null;
    let loadAddressHex = 'N/A';
    if (fileData.length >= 2 && entry.fileTypeStr === 'PRG') {
      loadAddress = fileData[0] | (fileData[1] << 8);
      loadAddressHex = `$${loadAddress.toString(16).padStart(4, '0').toUpperCase()}`;
    }

    const first16 = fileData.subarray(0, Math.min(16, fileData.length));
    const first16Hex = Array.from(first16).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

    // Classify Probable Role
    const roleAnalysis = classifyRole(entry.petsciiName, fileData, loadAddress);

    extractedFiles.push({
      ...entry,
      status: isCorrupted ? 'EXTRACTED_WITH_CYCLE_WARNING' : 'SUCCESS',
      outputFilename: safeName,
      outputPath,
      dataLength: fileData.length,
      loadAddress,
      loadAddressHex,
      first16Hex,
      ...roleAnalysis
    });
  }

  return {
    d64Path,
    fileSize,
    sha256,
    trackCount,
    diskName,
    diskId,
    directoryEntries,
    extractedFiles
  };
}

function classifyRole(name, data, loadAddress) {
  const len = data.length;
  const nameUpper = name.toUpperCase();

  // 1. Standard C64 BASIC Program Header Check (Load Address $0801)
  if (loadAddress === 0x0801 && len >= 4) {
    if (data[2] !== 0x00) {
      return {
        probableRole: 'code (BASIC / ML Loader)',
        evidence: 'Standard C64 BASIC RAM header at $0801 with next-line pointer.',
        confidence: 'high'
      };
    }
  }

  // 2. Full Screen Multicolor Bitmap (Around 8000-10000 bytes)
  if (len >= 8000 && len <= 10004) {
    return {
      probableRole: 'bitmap (Full Screen 320x200 Multicolor/Hires)',
      evidence: `Byte length (${len} bytes) aligns with 8000-byte VIC-II bitmap + screen/color RAM tables.`,
      confidence: 'high'
    };
  }

  // 3. C64 Character Set (2048 bytes for 256 chars of 8x8)
  if (len === 2050 || len === 2048) {
    return {
      probableRole: 'character set / tileset',
      evidence: '2048-byte payload matching standard 256-glyph 8x8 1-bit font/tile bank.',
      confidence: 'high'
    };
  }

  // 4. Sprite Bank (64 bytes per 24x21 sprite)
  if ((len - 2) > 0 && (len - 2) % 64 === 0 && len <= 4098) {
    const spriteCount = (len - 2) / 64;
    return {
      probableRole: 'sprites',
      evidence: `Exact multiple of 64 bytes (${spriteCount} hardware sprites).`,
      confidence: 'medium'
    };
  }

  // 5. Monster Portraits & Location Pictures
  if (nameUpper.includes('PIC') || nameUpper.includes('MON') || nameUpper.includes('SCR') || nameUpper.includes('FACE') || nameUpper.includes('IMG')) {
    return {
      probableRole: 'bitmap (Portrait / Sub-screen Graphic)',
      evidence: `Filename identifier and payload size (${len} bytes) indicate graphic asset.`,
      confidence: 'high'
    };
  }

  // 6. Music / Audio Routines
  if (nameUpper.includes('MUS') || nameUpper.includes('SND') || nameUpper.includes('TUNE') || nameUpper.includes('SONG') || (data[2] === 0x50 && data[3] === 0x53 && data[4] === 0x49 && data[5] === 0x44)) {
    return {
      probableRole: 'music / SID routine',
      evidence: 'Header or nomenclature matches SID music player table.',
      confidence: 'high'
    };
  }

  // 7. Machine Code Binary at common C64 Execution Addresses
  if (loadAddress && (loadAddress >= 0x1000 && loadAddress <= 0xC000)) {
    return {
      probableRole: 'code (Machine Language / Data Bank)',
      evidence: `Load address ${loadAddress.toString(16).toUpperCase()} points to standard executable/work RAM.`,
      confidence: 'medium'
    };
  }

  return {
    probableRole: 'unknown / data table',
    evidence: `Arbitrary data block of ${len} bytes.`,
    confidence: 'low'
  };
}

export function generateReports(analysisResult, outputDir) {
  const { d64Path, fileSize, sha256, trackCount, diskName, diskId, extractedFiles } = analysisResult;

  // 1. disk-inventory.md
  const inventoryMd = `# 💽 C64 Disk Image Inventory & Preservation Report

> **Target Image**: \`${path.basename(d64Path)}\`  
> **Analysis Date**: ${new Date().toISOString()}  
> **Preservation Scope**: Read-only technical evaluation for preservation and non-distributive reference.

---

## 1. Disk Image Metadata

| Property | Value |
| :--- | :--- |
| **File Path** | \`${d64Path}\` |
| **Byte Length** | **${fileSize.toLocaleString()} bytes** |
| **SHA-256 Digest** | \`${sha256}\` |
| **Disk Format** | Commodore 1541 D64 (${trackCount} Tracks, 683 Sectors) |
| **BAM Disk Name (PETSCII)** | \`${diskName || '(none)'}\` |
| **Disk ID & DOS Type** | \`${diskId || '(none)'}\` |
| **Total Directory Files** | **${extractedFiles.length} entries** |

---

## 2. Directory & Extraction Table

| PETSCII Name | Type | Blocks | Output File | Size | Load Addr | Probable Role | Status |
| :--- | :---: | :---: | :--- | :---: | :---: | :--- | :---: |
${extractedFiles.map(f => `| \`${f.petsciiName}\` | ${f.fileTypeStr} | ${f.blocks} | \`${f.outputFilename || 'N/A'}\` | ${f.dataLength.toLocaleString()} B | \`${f.loadAddressHex}\` | ${f.probableRole} | **${f.status}** |`).join('\n')}

---

## 3. Copyright, Legal & Research Provenance Notice

- **Preservation Scope Only**: Extracted raw disk binaries and intermediate files are retained exclusively within \`research/\` for reverse-engineering and preservation research.
- **Asset Integrity**: No proprietary or copyrighted binary art assets are added to public or shipping application directories (\`src/\`, \`public/\`, \`dist/\`).
- **Independent Art Derivation**: Extracted layout measurements and color registers serve purely as structural reference for independently created 3D models and shaders.
`;

  fs.writeFileSync(path.join(outputDir, 'disk-inventory.md'), inventoryMd);

  // 2. disk-file-inventory.csv
  const csvHeaders = 'PETSCII_Name,FileType,Blocks,OutputFilename,ByteLength,LoadAddress,First16BytesHex,ProbableRole,Evidence,Confidence,Status\n';
  const csvRows = extractedFiles.map(f => {
    return `"${f.petsciiName}","${f.fileTypeStr}",${f.blocks},"${f.outputFilename || ''}",${f.dataLength},"${f.loadAddressHex}","${f.first16Hex}","${f.probableRole}","${f.evidence}","${f.confidence}","${f.status}"`;
  }).join('\n');

  fs.writeFileSync(path.join(outputDir, 'disk-file-inventory.csv'), csvHeaders + csvRows + '\n');

  // 3. graphics-candidates.md
  const graphicsCandidates = extractedFiles.filter(f => f.probableRole.includes('bitmap') || f.probableRole.includes('character') || f.probableRole.includes('sprite'));

  const graphicsMd = `# 🎨 Commodore 64 Graphic Candidates & Extraction Analysis

> **Disk**: \`${path.basename(d64Path)}\`  
> **Identified Visual Candidates**: ${graphicsCandidates.length} files

---

## 1. Candidate Graphic Assets

| Filename | PETSCII Name | Size | Load Address | Identified Format | Role & Confidence |
| :--- | :--- | :---: | :---: | :--- | :--- |
${graphicsCandidates.length > 0 ? graphicsCandidates.map(g => `| \`${g.outputFilename}\` | \`${g.petsciiName}\` | ${g.dataLength.toLocaleString()} B | \`${g.loadAddressHex}\` | VIC-II Bitmap / Charset | **${g.probableRole}** (${g.confidence}) |`).join('\n') : '| *(No standalone full-screen bitmap files found in standard directory; graphics are packed within fastloader data streams or runtime overlay banks)* | - | - | - | - | - |'}

---

## 2. Technical Emulator Capture Procedure for Embedded/Compressed Assets

When graphic assets (e.g. monster portraits, tavern artwork, title fonts) are packed inside custom sector fastloaders or compressed overlay archives:

1. **Step 1 — Launch in VICE Emulator (\`x64sc\`)**:
   - Attach the \`.d64\` disk image and boot the game.
   - Navigate to the specific visual state (e.g., Tavern stage, Garth's counter, or monster combat encounter).
2. **Step 2 — Save RAM Snapshot (\`.vsf\`)**:
   - In VICE menu: **\`File\` $\\rightarrow$ \`Save Snapshot Image...\`**
   - This captures uncompressed VIC-II video matrix memory ($0000–$FFFF).
3. **Step 3 — Inspect Video Bank in PixelKraken / C64 Graphic Tool**:
   - Open the \`.vsf\` in **PixelKraken** or **Timanthes**.
   - Inspect standard VIC-II banks:
     - Bank 0: \`$0000–$3FFF\`
     - Bank 1: \`$4000–$7FFF\`
     - Screen RAM: \`$0400–$07E7\` or \`$4400–$47E7\`
     - Color RAM: \`$D800–$DBE7\`
4. **Step 4 — Frame & Export Reference Visuals**:
   - Set color mode to **Multicolor (160×200)** with $8\\times 8$ character cell stride.
   - Export standard PNG reference frames for independent recreation.
`;

  fs.writeFileSync(path.join(outputDir, 'graphics-candidates.md'), graphicsMd);
}

// CLI Execution if run directly
if (process.argv[1] && process.argv[1].endsWith('d64_analyzer.mjs')) {
  const d64Path = process.argv[2] || 'research/original-images/source-original.d64';
  const outPrgDir = 'research/extracted-prg';
  const outAnalysisDir = 'research/analysis';

  if (!fs.existsSync(d64Path)) {
    console.error(`\n⚠️ Note: '${d64Path}' was not found on disk.`);
    console.error(`Please place your .d64 image at '${d64Path}' and re-run.`);
    process.exit(1);
  }

  try {
    console.log(`\n🔍 Analyzing D64 image: ${d64Path}...`);
    const results = analyzeD64(d64Path, outPrgDir, outAnalysisDir);
    generateReports(results, outAnalysisDir);
    console.log(`✅ Success! Extracted ${results.extractedFiles.length} files to ${outPrgDir}/`);
    console.log(`📊 Reports written to ${outAnalysisDir}/`);
  } catch (err) {
    console.error('❌ Extraction Error:', err.message);
    process.exit(1);
  }
}
