import * as THREE from 'three';

export class TextureGenerator {
  static createStoneWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base dark stone color
    ctx.fillStyle = '#1c1c24';
    ctx.fillRect(0, 0, 512, 512);

    // Draw irregular stone bricks
    ctx.strokeStyle = '#0d0d12';
    ctx.lineWidth = 6;

    const rows = 8;
    const cols = 4;
    const rowHeight = 512 / rows;

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (512 / cols / 2);
      for (let c = -1; c <= cols; c++) {
        const x = c * (512 / cols) + offset;
        const y = r * rowHeight;
        const w = 512 / cols;

        // Brick color variation
        const shade = Math.floor(25 + Math.random() * 25);
        ctx.fillStyle = `rgb(${shade + 5}, ${shade}, ${shade + 10})`;
        ctx.fillRect(x + 2, y + 2, w - 4, rowHeight - 4);
        ctx.strokeRect(x + 2, y + 2, w - 4, rowHeight - 4);

        // Add noise/speckles for stone texture
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let n = 0; n < 30; n++) {
          const nx = x + Math.random() * w;
          const ny = y + Math.random() * rowHeight;
          ctx.fillRect(nx, ny, 2, 2);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  static createWoodPlankTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base wood color
    ctx.fillStyle = '#4a2c17';
    ctx.fillRect(0, 0, 512, 512);

    // Plank lines
    const plankWidth = 512 / 6;
    for (let p = 0; p < 6; p++) {
      const x = p * plankWidth;

      // Plank color variance
      const colorShift = Math.floor(Math.random() * 20 - 10);
      ctx.fillStyle = `rgb(${74 + colorShift}, ${44 + colorShift}, ${23 + colorShift})`;
      ctx.fillRect(x, 0, plankWidth, 512);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(25, 12, 5, 0.4)';
      ctx.lineWidth = 1.5;
      for (let g = 0; g < 15; g++) {
        const gx = x + Math.random() * plankWidth;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.bezierCurveTo(gx + 10, 170, gx - 10, 340, gx, 512);
        ctx.stroke();
      }

      // Plank seam border
      ctx.fillStyle = '#150a04';
      ctx.fillRect(x + plankWidth - 3, 0, 3, 512);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  static createFabricTexture(baseColor = '#8b2626') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);

    // Cloth weave pattern
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let x = 0; x < 256; x += 4) {
      ctx.fillRect(x, 0, 2, 256);
    }
    for (let y = 0; y < 256; y += 4) {
      ctx.fillRect(0, y, 256, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createScrollPaperTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Parchment color
    ctx.fillStyle = '#d4c097';
    ctx.fillRect(0, 0, 512, 512);

    // Aged edges
    const grad = ctx.createRadialGradient(256, 256, 150, 256, 256, 280);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(80, 50, 20, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createFireParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 230, 150, 1.0)');
    grad.addColorStop(0.3, 'rgba(255, 120, 20, 0.8)');
    grad.addColorStop(0.7, 'rgba(200, 40, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Authentic C64 Garth's Equipment Shoppe Interior Feature Backdrop
   * Depicts the iconic 1985 shop scene with Garth behind his counter,
   * weapon racks, shields, and timber beam shop architecture.
   */
  static createAuthenticGarthShopBackdrop() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    // 1. Background Timber-and-Stone Wall
    ctx.fillStyle = '#2b1810';
    ctx.fillRect(0, 0, 640, 400);

    // Stone and wood paneling
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(20, 20, 600, 360);

    // Stone brick rows
    ctx.strokeStyle = '#0c0a09';
    ctx.lineWidth = 3;
    for (let y = 30; y < 280; y += 35) {
      for (let x = 30; x < 610; x += 70) {
        const offset = ((y / 35) % 2) * 35;
        ctx.fillStyle = (x + y) % 3 === 0 ? '#292524' : '#1f1d1b';
        ctx.fillRect(x + offset - 35, y, 66, 32);
        ctx.strokeRect(x + offset - 35, y, 66, 32);
      }
    }

    // Heavy Timber Cross Beams
    ctx.fillStyle = '#451a03';
    ctx.fillRect(10, 10, 620, 24);
    ctx.fillRect(10, 10, 24, 380);
    ctx.fillRect(606, 10, 24, 380);
    ctx.fillRect(180, 10, 20, 380);
    ctx.fillRect(440, 10, 20, 380);

    // 2. Weapon & Armor Display Racks
    // Left Weapon Rack: Broadswords & Polearms
    ctx.fillStyle = '#78350f';
    ctx.fillRect(50, 70, 110, 140);
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 70, 110, 140);

    // Crossed Swords
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(60, 80); ctx.lineTo(150, 200);
    ctx.moveTo(150, 80); ctx.lineTo(60, 200);
    ctx.stroke();

    // Round Bronze Shield
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(105, 140, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(105, 140, 8, 0, Math.PI * 2);
    ctx.fill();

    // Right Weapon Rack: Battleaxes & Bows
    ctx.fillStyle = '#78350f';
    ctx.fillRect(480, 70, 110, 140);
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 2;
    ctx.strokeRect(480, 70, 110, 140);

    // Double-headed Battleaxe
    ctx.strokeStyle = '#5c2b0e';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(535, 75); ctx.lineTo(535, 205);
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(520, 100, 16, Math.PI / 2, -Math.PI / 2);
    ctx.arc(550, 100, 16, -Math.PI / 2, Math.PI / 2);
    ctx.fill();

    // Steel Heater Shield
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(510, 140);
    ctx.lineTo(560, 140);
    ctx.lineTo(560, 170);
    ctx.lineTo(535, 195);
    ctx.lineTo(510, 170);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3. Garth NPC Behind Counter
    // Torso / Leather Doublet
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(270, 220);
    ctx.lineTo(370, 220);
    ctx.lineTo(390, 320);
    ctx.lineTo(250, 320);
    ctx.closePath();
    ctx.fill();

    // Leather Apron Straps & Brass Buckles
    ctx.fillStyle = '#451a03';
    ctx.fillRect(290, 220, 14, 100);
    ctx.fillRect(336, 220, 14, 100);
    ctx.fillStyle = '#f3cf65';
    ctx.fillRect(292, 250, 10, 8);
    ctx.fillRect(338, 250, 10, 8);

    // Folded Arms
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.roundRect(260, 280, 120, 34, 12);
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Garth's Head & Face
    ctx.fillStyle = '#fcd34d'; // Warm skin tone
    ctx.beginPath();
    ctx.arc(320, 180, 32, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (Alert & stern)
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(306, 172, 6, 6);
    ctx.fillRect(328, 172, 6, 6);

    // Thick Bushy Eyebrows
    ctx.fillStyle = '#451a03';
    ctx.fillRect(302, 166, 14, 4);
    ctx.fillRect(324, 166, 14, 4);

    // Garth's Brown Beard & Mustache
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(298, 184);
    ctx.quadraticCurveTo(320, 230, 342, 184);
    ctx.fill();
    ctx.fillRect(308, 182, 24, 8); // Mustache

    // Leather Cap
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(320, 166, 34, Math.PI, 0);
    ctx.fill();

    // 4. Shop Wooden Counter Foreground
    ctx.fillStyle = '#5c2b0e';
    ctx.fillRect(180, 310, 280, 80);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(170, 300, 300, 20); // Counter top edge
    ctx.strokeStyle = '#2b1810';
    ctx.lineWidth = 4;
    ctx.strokeRect(170, 300, 300, 90);

    // Gold Coins & Ledger on Counter
    ctx.fillStyle = '#f3cf65';
    for (let c = 0; c < 8; c++) {
      ctx.beginPath();
      ctx.arc(200 + c * 6, 308 - (c % 3) * 3, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Authentic Golden Shop Title Plaque
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(190, 24, 260, 42);
    ctx.strokeStyle = '#f3cf65';
    ctx.lineWidth = 4;
    ctx.strokeRect(190, 24, 260, 42);
    ctx.fillStyle = '#f3cf65';
    ctx.font = 'bold 18px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText("GARTH'S SHOPPE", 320, 52);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * Generate Authentic 160x200 / 320x200 C64-Style Building Facade Textures
   * for every landmark and standard building tile in Skara Brae.
   * @param {string} type - 'GARTH_SHOP' | 'SCARLET_BARD' | 'ADVENTURERS_GUILD' | 'REVIEW_BOARD' | 'ROSCOE_EMPORIUM' | 'TEMPLE' | 'INN' | 'MANGAR_TOWER' | 'KYLEARAN_TOWER' | 'CITY_GATE' | 'HOUSE'
   */
  static createC64BuildingFacadeTexture(type = 'HOUSE') {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');

    // 1. Base Wall Background
    ctx.fillStyle = '#262626';
    ctx.fillRect(0, 0, 320, 320);

    if (type === 'GARTH_SHOP') {
      // Garth's Equipment Shoppe Facade
      // Half-timbered stucco upper, stone lower
      ctx.fillStyle = '#d4c097'; // Cream stucco
      ctx.fillRect(10, 10, 300, 180);
      ctx.fillStyle = '#292524'; // Stone lower
      ctx.fillRect(10, 190, 300, 120);

      // Timber beams
      ctx.fillStyle = '#451a03';
      ctx.fillRect(10, 10, 300, 16);
      ctx.fillRect(10, 180, 300, 16);
      ctx.fillRect(10, 10, 16, 300);
      ctx.fillRect(294, 10, 16, 300);
      ctx.fillRect(152, 10, 16, 180);

      // Carved Wooden Door
      ctx.fillStyle = '#5c2b0e';
      ctx.fillRect(110, 170, 100, 140);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 6;
      ctx.strokeRect(110, 170, 100, 140);

      // Iron Door Straps & Ring
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(115, 200, 90, 8);
      ctx.fillRect(115, 270, 90, 8);
      ctx.fillStyle = '#f3cf65';
      ctx.beginPath();
      ctx.arc(180, 240, 8, 0, Math.PI * 2);
      ctx.fill();

      // Leaded Windows with warm candlelight
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(35, 60, 80, 90);
      ctx.fillRect(205, 60, 80, 90);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 3;
      ctx.strokeRect(35, 60, 80, 90);
      ctx.strokeRect(205, 60, 80, 90);
      // Diamond leaded lattice
      ctx.beginPath();
      ctx.moveTo(75, 60); ctx.lineTo(75, 150);
      ctx.moveTo(35, 105); ctx.lineTo(115, 105);
      ctx.moveTo(245, 60); ctx.lineTo(245, 150);
      ctx.moveTo(205, 105); ctx.lineTo(285, 105);
      ctx.stroke();

      // Hanging Shop Sign: "⚔️ GARTH'S 🛡️"
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(90, 20, 140, 36);
      ctx.strokeStyle = '#f3cf65';
      ctx.lineWidth = 3;
      ctx.strokeRect(90, 20, 140, 36);
      ctx.fillStyle = '#f3cf65';
      ctx.font = 'bold 15px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText("⚔️ GARTH'S 🛡️", 160, 44);

    } else if (type === 'SCARLET_BARD') {
      // Scarlet Bard Tavern Facade
      ctx.fillStyle = '#831843'; // Deep crimson tavern paint
      ctx.fillRect(10, 10, 300, 180);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(10, 190, 300, 120);

      // Dark oak timbers
      ctx.fillStyle = '#3e2312';
      ctx.fillRect(10, 10, 300, 16);
      ctx.fillRect(10, 180, 300, 16);
      ctx.fillRect(10, 10, 16, 300);
      ctx.fillRect(294, 10, 16, 300);
      ctx.fillRect(152, 10, 16, 180);

      // Tavern Door
      ctx.fillStyle = '#5c2b0e';
      ctx.fillRect(115, 175, 90, 135);
      ctx.strokeStyle = '#f3cf65';
      ctx.lineWidth = 4;
      ctx.strokeRect(115, 175, 90, 135);

      // Amber Glowing Tavern Windows with Stained Glass
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(35, 60, 80, 90);
      ctx.fillRect(205, 60, 80, 90);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 3;
      ctx.strokeRect(35, 60, 80, 90);
      ctx.strokeRect(205, 60, 80, 90);

      // Tavern Sign: "🍺 SCARLET BARD"
      ctx.fillStyle = '#451a03';
      ctx.fillRect(70, 20, 180, 36);
      ctx.strokeStyle = '#f3cf65';
      ctx.lineWidth = 3;
      ctx.strokeRect(70, 20, 180, 36);
      ctx.fillStyle = '#f3cf65';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText("🍺 SCARLET BARD 🎵", 160, 44);

    } else if (type === 'ADVENTURERS_GUILD') {
      // Adventurers Guild Facade
      ctx.fillStyle = '#1e3a8a'; // Royal Blue Guild color
      ctx.fillRect(10, 10, 300, 180);
      ctx.fillStyle = '#292524';
      ctx.fillRect(10, 190, 300, 120);

      // Stone Pillars & Arch
      ctx.fillStyle = '#475569';
      ctx.fillRect(20, 20, 24, 280);
      ctx.fillRect(276, 20, 24, 280);

      // Arched Double Doors
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(160, 210, 50, Math.PI, 0);
      ctx.rect(110, 210, 100, 100);
      ctx.fill();
      ctx.strokeStyle = '#f3cf65';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Guild Lion Crest Plaque
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(60, 30, 200, 44);
      ctx.strokeStyle = '#f3cf65';
      ctx.lineWidth = 4;
      ctx.strokeRect(60, 30, 200, 44);
      ctx.fillStyle = '#f3cf65';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText("🛡️ ADVENTURERS GUILD", 160, 58);

    } else if (type === 'REVIEW_BOARD') {
      // Review Board Council Facade
      ctx.fillStyle = '#312e81'; // Mystic Indigo
      ctx.fillRect(10, 10, 300, 300);

      // Elder Stone Columns
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(30, 20, 28, 280);
      ctx.fillRect(262, 20, 28, 280);

      // Runic Doorway
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(100, 160, 120, 150);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 6;
      ctx.strokeRect(100, 160, 120, 150);

      // Glowing Runic Sigil
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(160, 100, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 16px serif';
      ctx.textAlign = 'center';
      ctx.fillText("ᚱ ᛖ ᚡ", 160, 106);

      // Sign: "REVIEW BOARD"
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(70, 24, 180, 38);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.strokeRect(70, 24, 180, 38);
      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold 15px Georgia, serif';
      ctx.fillText("📜 REVIEW BOARD 📜", 160, 48);

    } else if (type === 'ROSCOE_EMPORIUM') {
      // Roscoe's Energy Emporium
      ctx.fillStyle = '#065f46'; // Arcane Emerald
      ctx.fillRect(10, 10, 300, 300);

      // Arcane Crystal Sign
      ctx.fillStyle = '#022c22';
      ctx.fillRect(50, 24, 220, 42);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 4;
      ctx.strokeRect(50, 24, 220, 42);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText("✨ ROSCOE'S EMPORIUM ✨", 160, 50);

      // Glowing Mystic Orb in Window
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(160, 120, 30, 0, Math.PI * 2);
      ctx.fill();

      // Entrance Door
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(115, 180, 90, 130);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(115, 180, 90, 130);

    } else if (type === 'MANGAR_TOWER' || type === 'KYLEARAN_TOWER') {
      // Obsidian Wizard Fortress Tower
      ctx.fillStyle = '#0f0f17';
      ctx.fillRect(0, 0, 320, 320);

      // Stone blocks
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 4;
      for (let y = 0; y < 320; y += 40) {
        for (let x = 0; x < 320; x += 80) {
          const offset = ((y / 40) % 2) * 40;
          ctx.strokeRect(x + offset - 40, y, 80, 40);
        }
      }

      // Spiked Iron Gate
      ctx.fillStyle = '#000000';
      ctx.fillRect(100, 170, 120, 150);
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 6;
      ctx.strokeRect(100, 170, 120, 150);

      // Arrow slits
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(60, 60, 12, 50);
      ctx.fillRect(248, 60, 12, 50);

    } else {
      // Standard Skara Brae Medieval House / Shop Facade
      ctx.fillStyle = '#e2d9c8'; // Medieval plaster
      ctx.fillRect(10, 10, 300, 190);
      ctx.fillStyle = '#292524'; // Stone basement
      ctx.fillRect(10, 200, 300, 110);

      // Tudor timber framing
      ctx.fillStyle = '#451a03';
      ctx.fillRect(10, 10, 300, 14);
      ctx.fillRect(10, 190, 300, 14);
      ctx.fillRect(10, 10, 14, 300);
      ctx.fillRect(296, 10, 14, 300);
      ctx.fillRect(153, 10, 14, 190);

      // Diagonal timber struts
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(20, 20); ctx.lineTo(150, 190);
      ctx.moveTo(300, 20); ctx.lineTo(165, 190);
      ctx.stroke();

      // Wooden House Door
      ctx.fillStyle = '#5c2b0e';
      ctx.fillRect(115, 185, 90, 125);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      ctx.strokeRect(115, 185, 90, 125);
      ctx.fillStyle = '#f3cf65';
      ctx.beginPath();
      ctx.arc(185, 245, 6, 0, Math.PI * 2);
      ctx.fill();

      // Candlelit Leaded Window
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(50, 70, 70, 80);
      ctx.fillRect(200, 70, 70, 80);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 70, 70, 80);
      ctx.strokeRect(200, 70, 70, 80);
      ctx.beginPath();
      ctx.moveTo(85, 70); ctx.lineTo(85, 150);
      ctx.moveTo(50, 110); ctx.lineTo(120, 110);
      ctx.moveTo(235, 70); ctx.lineTo(235, 150);
      ctx.moveTo(200, 110); ctx.lineTo(270, 110);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * Rough Cobblestone Street Texture
   * Authentic rounded medieval river stones with dark mortar relief.
   */
  static createRoughCobblestoneTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark dirt/mortar base
    ctx.fillStyle = '#171717';
    ctx.fillRect(0, 0, 512, 512);

    const stoneRows = 16;
    const stoneCols = 16;
    const stepX = 512 / stoneCols;
    const stepY = 512 / stoneRows;

    for (let r = 0; r < stoneRows; r++) {
      const rowOffset = (r % 2) * (stepX / 2);
      for (let c = -1; c <= stoneCols; c++) {
        const cx = c * stepX + rowOffset + (Math.sin(r * 3 + c) * 4);
        const cy = r * stepY + (Math.cos(c * 2 + r) * 3);
        const radX = (stepX / 2) - 3 + (Math.sin(c * 5) * 2);
        const radY = (stepY / 2) - 3 + (Math.cos(r * 4) * 2);

        // Stone Base Color variation (C64 gray/brown tones)
        const tone = Math.floor(40 + (Math.sin(r * 7 + c * 11) * 20));
        ctx.fillStyle = `rgb(${tone + 5}, ${tone}, ${tone - 5})`;
        ctx.beginPath();
        ctx.ellipse(cx + stepX / 2, cy + stepY / 2, radX, radY, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stone highlight rim
        ctx.strokeStyle = `rgb(${tone + 35}, ${tone + 30}, ${tone + 20})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Top specular highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.ellipse(cx + stepX / 2 - 2, cy + stepY / 2 - 2, radX * 0.5, radY * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  /**
   * Celestial Starfield Dome Texture for Skara Brae Night Sky
   */
  static createStarfieldSkyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Deep Midnight Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#020617');   // Pure cosmic black/blue
    grad.addColorStop(0.7, '#0b1329'); // Midnight navy
    grad.addColorStop(1, '#1e1b4b');   // Horizon violet glow
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Glowing Moon
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(750, 120, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(248, 250, 252, 0.15)';
    ctx.beginPath();
    ctx.arc(750, 120, 60, 0, Math.PI * 2);
    ctx.fill();

    // Twinkling Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 400; i++) {
      const sx = Math.random() * 1024;
      const sy = Math.random() * 400;
      const size = Math.random() * 2.2 + 0.6;
      ctx.globalAlpha = Math.random() * 0.8 + 0.2;
      ctx.fillRect(sx, sy, size, size);
    }
    ctx.globalAlpha = 1.0;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  /**
   * Medieval Daytime Sky Texture for Skara Brae Day Mode
   */
  static createDaySkyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0284c7');   // Sky blue
    grad.addColorStop(0.6, '#38bdf8'); // Daylight azure
    grad.addColorStop(1, '#fef08a');   // Golden horizon
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Warm Sun
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.arc(750, 140, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(254, 240, 138, 0.3)';
    ctx.beginPath();
    ctx.arc(750, 140, 85, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  /**
   * Twilight / Dusk Sky Texture for Skara Brae Dusk Phase
   */
  static createDuskSkyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1e1b4b');   // Deep twilight indigo
    grad.addColorStop(0.4, '#6b21a8'); // Purple
    grad.addColorStop(0.75, '#c2410c'); // Burning sunset orange
    grad.addColorStop(1, '#f59e0b');   // Amber horizon
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Setting Sun
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.arc(750, 240, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(234, 88, 12, 0.4)';
    ctx.beginPath();
    ctx.arc(750, 240, 90, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  /**
   * Golden Dawn Sky Texture for Skara Brae Dawn Phase
   */
  static createDawnSkyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0369a1');   // Deep morning blue
    grad.addColorStop(0.5, '#38bdf8'); // Sky blue
    grad.addColorStop(0.8, '#f472b6'); // Rose blush
    grad.addColorStop(1, '#fde047');   // Golden morning glow
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Rising Sun
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.arc(750, 260, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(253, 224, 71, 0.4)';
    ctx.beginPath();
    ctx.arc(750, 260, 95, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  /**
   * High-Resolution Packed Dirt & Sand Tavern Floor Texture
   * Packed earth, gritty sand particles, scattered straw, and worn flagstone wear
   */
  static createDirtSandFloorTexture() {
    if (typeof document === 'undefined') return new THREE.Texture();
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base earthy sand tone
    ctx.fillStyle = '#422817';
    ctx.fillRect(0, 0, 1024, 1024);

    // Multi-layered dirt clods and sand noise
    const colors = ['#2c1810', '#3b2012', '#4d2d19', '#5c3820', '#6e4528', '#221109'];
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const r = 1 + Math.random() * 6;
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fine gritty sand speckles
    ctx.fillStyle = 'rgba(217, 180, 130, 0.25)';
    for (let s = 0; s < 4000; s++) {
      const sx = Math.random() * 1024;
      const sy = Math.random() * 1024;
      ctx.fillRect(sx, sy, 2, 2);
    }

    // Scattered tavern straw / dried grass bits
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
    ctx.lineWidth = 1.5;
    for (let st = 0; st < 350; st++) {
      const stx = Math.random() * 1024;
      const sty = Math.random() * 1024;
      const len = 8 + Math.random() * 18;
      const angle = Math.random() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(stx, sty);
      ctx.lineTo(stx + Math.cos(angle) * len, sty + Math.sin(angle) * len);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * PBR Normal Map for Packed Dirt & Sand Floor
   */
  static createDirtSandFloorNormalMap() {
    if (typeof document === 'undefined') return new THREE.Texture();
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Neutral normal map base (RGB 128, 128, 255 = pointing +Z)
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, 512, 512);

    // Bump perturbations
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 2 + Math.random() * 5;
      const nx = 128 + Math.floor((Math.random() - 0.5) * 60);
      const ny = 128 + Math.floor((Math.random() - 0.5) * 60);
      ctx.fillStyle = `rgb(${nx}, ${ny}, 255)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Worn Tavern / Garth's Shop Wood Plank Floor with Iron Nail Heads & Knots
   */
  static createWornTavernPlankTexture() {
    if (typeof document === 'undefined') return new THREE.Texture();
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#30180d';
    ctx.fillRect(0, 0, 1024, 1024);

    const numPlanks = 8;
    const plankWidth = 1024 / numPlanks;

    for (let p = 0; p < numPlanks; p++) {
      const x = p * plankWidth;
      const baseTone = 38 + ((p * 7) % 18);
      ctx.fillStyle = `rgb(${baseTone + 15}, ${baseTone}, ${baseTone - 12})`;
      ctx.fillRect(x + 2, 0, plankWidth - 4, 1024);

      // Deep dark seams between planks
      ctx.fillStyle = '#0f0703';
      ctx.fillRect(x, 0, 3, 1024);
      ctx.fillRect(x + plankWidth - 3, 0, 3, 1024);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(15, 7, 3, 0.35)';
      ctx.lineWidth = 1.8;
      for (let g = 0; g < 22; g++) {
        const gx = x + 5 + Math.random() * (plankWidth - 10);
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.bezierCurveTo(gx + 12, 340, gx - 12, 680, gx + 4, 1024);
        ctx.stroke();
      }

      // Wood Knots
      for (let k = 0; k < 2; k++) {
        const kx = x + plankWidth * 0.5 + (Math.random() - 0.5) * 20;
        const ky = (p * 230 + k * 450 + 120) % 960;
        ctx.fillStyle = '#1c0c05';
        ctx.beginPath();
        ctx.ellipse(kx, ky, 8, 14, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(60, 30, 15, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Forged Square Iron Nails at ends and midpoints
      ctx.fillStyle = '#0a0a0f';
      for (let n = 40; n < 1024; n += 240) {
        ctx.fillRect(x + 12, n, 6, 6);
        ctx.fillRect(x + plankWidth - 18, n, 6, 6);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Authentic 1980s Retro Room Scanned Wall Posters
   * @param {'BARDS_TALE'|'DND_MAP'|'FRAZETTA'|'HEAVY_METAL'} type
   */
  static createVintagePosterTexture(type = 'BARDS_TALE') {
    if (typeof document === 'undefined') return new THREE.Texture();
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Aged paper background with slight fold lines
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 600, 800);

    if (type === 'BARDS_TALE') {
      // 1985 Classic "The Bard's Tale: Tales of the Unknown" Michael Whelan Style Poster
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 800);
      bgGrad.addColorStop(0, '#0c1527');
      bgGrad.addColorStop(0.5, '#1e1b4b');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(20, 20, 560, 760);

      // Gold Filigree Border
      ctx.strokeStyle = '#f3cf65';
      ctx.lineWidth = 6;
      ctx.strokeRect(30, 30, 540, 740);

      // Header Banner
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 38px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText("THE BARD'S TALE", 300, 95);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px Georgia, serif';
      ctx.fillText('TALES OF THE UNKNOWN • VOLUME I', 300, 130);

      // Central Fantasy Hero Artwork
      // Wizard casting blue flame
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(220, 380); ctx.lineTo(160, 600); ctx.lineTo(280, 600); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(200, 340, 30, 0, Math.PI * 2);
      ctx.fill();

      // Magic Orb in Wizard Hand
      ctx.fillStyle = '#67e8f9';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(160, 380, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Warrior in Steel Plate with Broadsword
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(380, 320); ctx.lineTo(320, 600); ctx.lineTo(440, 600); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(360, 330, 40, 50);

      // Glowing Broadsword
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(420, 240); ctx.lineTo(420, 500);
      ctx.stroke();
      ctx.fillStyle = '#d97706';
      ctx.fillRect(400, 460, 40, 10);

      // Skara Brae Distant Castle Silhouette & Moons
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(40, 540, 520, 160);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(480, 200, 36, 0, Math.PI * 2);
      ctx.fill();

      // Bottom Credits
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.fillText('ELECTRONIC ARTS • INTERPLAY PRODUCTIONS (1985)', 300, 740);
    } else if (type === 'DND_MAP') {
      // Vintage 1980s D&D Overland Map Poster
      ctx.fillStyle = '#d4b886'; // Aged parchment
      ctx.fillRect(20, 20, 560, 760);
      ctx.strokeStyle = '#3f220f';
      ctx.lineWidth = 8;
      ctx.strokeRect(30, 30, 540, 740);

      // Compass Rose
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 28px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('MAP OF SKARA BRAE & THE NORTHERN REACHES', 300, 80);

      // Mountain Ranges & Rivers
      ctx.strokeStyle = '#5c2b0e';
      ctx.lineWidth = 3;
      for (let m = 0; m < 8; m++) {
        const mx = 100 + m * 55;
        const my = 260 + (m % 2) * 30;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + 25, my - 50);
        ctx.lineTo(mx + 50, my);
        ctx.stroke();
      }

      // Winding Blue River
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(80, 420);
      ctx.bezierCurveTo(240, 380, 320, 540, 520, 480);
      ctx.stroke();

      // Dungeon Tower Marker
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(280, 460, 35, 45);
      ctx.fillStyle = '#3f220f';
      ctx.font = 'bold 16px Georgia, serif';
      ctx.fillText("Mangar's Tower", 300, 525);
      ctx.fillText("Harkyn's Castle", 160, 350);
    } else if (type === 'FRAZETTA') {
      // 1980s Heroic Fantasy Heavy Metal Style Poster
      const fGrad = ctx.createLinearGradient(0, 0, 0, 800);
      fGrad.addColorStop(0, '#450a0a');
      fGrad.addColorStop(0.5, '#7c2d12');
      fGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = fGrad;
      ctx.fillRect(20, 20, 560, 760);

      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 44px Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DRAGONSLAYER', 300, 100);

      // Dragon Silhouette with Glowing Red Eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(100, 450);
      ctx.bezierCurveTo(200, 250, 400, 250, 500, 450);
      ctx.lineTo(480, 600);
      ctx.lineTo(120, 600);
      ctx.closePath();
      ctx.fill();

      // Red Dragon Glowing Eyes
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(280, 360, 8, 0, Math.PI * 2);
      ctx.arc(320, 360, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // 1980s Heavy Metal Tour Poster
      ctx.fillStyle = '#09090b';
      ctx.fillRect(20, 20, 560, 760);

      ctx.fillStyle = '#e11d48';
      ctx.font = 'bold 48px Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('IRON LUTE', 300, 120);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(150, 200); ctx.lineTo(240, 320); ctx.lineTo(200, 340); ctx.lineTo(300, 480);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('WORLD CRUSADE TOUR 1985', 300, 560);
    }

    // Corner Silver Thumbtacks
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    const tacks = [[38, 38], [562, 38], [38, 762], [562, 762]];
    tacks.forEach(([tx, ty]) => {
      ctx.beginPath();
      ctx.arc(tx, ty, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Detailed Authentic Commodore 64 Keyboard Texture with PETSCII Glyphs
   */
  static createC64KeyboardTexture() {
    if (typeof document === 'undefined') return new THREE.Texture();
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // C64 Dark Brown / Dark Charcoal Keyboard Bed
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, 1024, 512);

    // Keyboard Keycaps
    const keyRows = [
      ['←', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '-', '£', 'HOME', 'DEL'],
      ['CTRL', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '@', '*', '↑', 'RESTORE'],
      ['RUN', 'SL', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ':', ';', '=', 'RETURN'],
      ['C=', 'SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'SHIFT', 'CRSR-UD', 'CRSR-LR'],
      ['SPACE BAR']
    ];

    const rowY = [40, 110, 180, 250, 320];
    const keyHeight = 55;

    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';

    keyRows.forEach((row, rIdx) => {
      const y = rowY[rIdx];
      let startX = 40;
      const keyW = (820 / row.length) - 6;

      if (rIdx === 4) {
        // Space bar
        ctx.fillStyle = '#292524';
        ctx.fillRect(160, y, 540, keyHeight);
        ctx.strokeStyle = '#0c0a09';
        ctx.lineWidth = 3;
        ctx.strokeRect(160, y, 540, keyHeight);
      } else {
        row.forEach((key, kIdx) => {
          const x = startX + kIdx * (keyW + 6);
          // Dark Brown Keycap
          ctx.fillStyle = '#292524';
          ctx.fillRect(x, y, keyW, keyHeight);
          ctx.strokeStyle = '#0c0a09';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, keyW, keyHeight);

          // Top Face Light Highlight
          ctx.fillStyle = '#383533';
          ctx.fillRect(x + 4, y + 4, keyW - 8, keyHeight - 16);

          // White / Cream Text
          ctx.fillStyle = '#fef08a';
          ctx.fillText(key, x + keyW / 2, y + 30);
        });
      }
    });

    // Function Keys on Right Column (F1, F3, F5, F7 - Grey/Orange-Brown)
    const fKeys = ['F1', 'F3', 'F5', 'F7'];
    fKeys.forEach((fKey, fIdx) => {
      const fx = 890;
      const fy = 40 + fIdx * 70;
      ctx.fillStyle = '#451a03'; // Distinctive orange-brown C64 function key color
      ctx.fillRect(fx, fy, 90, 58);
      ctx.strokeStyle = '#0c0a09';
      ctx.lineWidth = 3;
      ctx.strokeRect(fx, fy, 90, 58);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(fKey, fx + 45, fy + 36);
    });

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Authentic Commodore 64 Breadbin Beige Case Texture with Rainbow Badge
   */
  static createC64CaseTexture() {
    if (typeof document === 'undefined') return new THREE.Texture();
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Classic C64 Breadbin Textured Beige / Biscuit plastic
    ctx.fillStyle = '#b89f80';
    ctx.fillRect(0, 0, 512, 512);

    // Plastic matte noise
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    for (let i = 0; i < 8000; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    // Top Ventilation Slats
    ctx.fillStyle = '#6b5840';
    for (let s = 60; s < 460; s += 14) {
      ctx.fillRect(s, 40, 8, 80);
    }

    // Commodore 64 Silver Badge
    ctx.fillStyle = '#1e1b4b'; // Dark blue plate
    ctx.fillRect(320, 160, 160, 48);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.strokeRect(320, 160, 160, 48);

    // Rainbow stripes
    const rainbow = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
    rainbow.forEach((color, idx) => {
      ctx.fillStyle = color;
      ctx.fillRect(326, 172 + idx * 5, 20, 4);
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('commodore', 356, 185);
    ctx.fillStyle = '#fef08a';
    ctx.fillText('64', 448, 185);

    // Power LED label
    ctx.fillStyle = '#6b5840';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('POWER', 440, 480);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Authentic Commodore 1541 Disk Drive Front Bezel Texture
   */
  static create1541DriveTexture() {
    if (typeof document === 'undefined') return new THREE.Texture();
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 1541 Off-white / Biscuit casing
    ctx.fillStyle = '#b0997c';
    ctx.fillRect(0, 0, 512, 512);

    // Dark brown drive door recess
    ctx.fillStyle = '#221913';
    ctx.fillRect(40, 140, 432, 220);
    ctx.strokeStyle = '#120d09';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 140, 432, 220);

    // 5.25" Disk Insertion Slot
    ctx.fillStyle = '#0a0806';
    ctx.fillRect(60, 230, 392, 24);

    // Rotating Door Latch
    ctx.fillStyle = '#3a2d24';
    ctx.beginPath();
    ctx.roundRect(220, 180, 72, 40, 6);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Top Model Badge: "commodore 1541"
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(50, 40, 180, 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('commodore', 60, 68);
    ctx.fillStyle = '#fef08a';
    ctx.fillText('1541', 170, 68);

    // LED status labels: "POWER" and "DRIVE"
    ctx.fillStyle = '#3f2e22';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('POWER', 100, 420);
    ctx.fillText('DRIVE', 380, 420);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}


