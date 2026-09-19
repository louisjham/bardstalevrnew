import * as THREE from 'three';
import { TextureGenerator } from '../textures/TextureGenerator.js';

export class PatronModels {
  // 1. The Bard (Performer on Stage holding 12-String Lute)
  static createBard() {
    const bardGroup = new THREE.Group();
    bardGroup.name = 'TheBard';

    const tunicMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // Crimson velvet
      roughness: 0.6
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5d0a9, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x5c2b0e, roughness: 0.8 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.85, roughness: 0.25 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
    const luteWoodMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
    const luteFaceMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.3 });

    // Legs & Laced Boots
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.65, 8), leatherMat);
    legL.position.set(-0.14, 0.32, 0);
    bardGroup.add(legL);

    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.65, 8), leatherMat);
    legR.position.set(0.14, 0.32, 0);
    bardGroup.add(legR);

    // Torso (Velvet Tunic with Gold Trim)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.7, 12), tunicMat);
    torso.position.y = 0.95;
    bardGroup.add(torso);

    // Gold Trim on Tunic Collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 16), goldMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 1.28, 0);
    bardGroup.add(collar);

    // Leather Belt & Pouch
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12), leatherMat);
    belt.position.y = 0.72;
    bardGroup.add(belt);

    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.06), leatherMat);
    pouch.position.set(0.18, 0.68, 0.1);
    bardGroup.add(pouch);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), skinMat);
    head.position.y = 1.42;
    bardGroup.add(head);

    // Wavy Brown Hair & Goatee
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 14), hairMat);
    hair.position.set(0, 1.45, -0.02);
    bardGroup.add(hair);

    const goatee = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 8), hairMat);
    goatee.position.set(0, 1.3, 0.14);
    goatee.rotation.x = Math.PI / 6;
    bardGroup.add(goatee);

    // Bard's Feathered Cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.18, 12), hatMat);
    cap.rotation.z = -Math.PI / 10;
    cap.position.set(0.04, 1.56, 0);
    bardGroup.add(cap);

    // Peacock / Scarlet Plume Feather
    const feather = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.3 })
    );
    feather.rotation.z = -Math.PI / 3.5;
    feather.position.set(0.18, 1.65, 0.04);
    bardGroup.add(feather);

    // Velvet Cloak draped over back
    const cloak = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, side: THREE.DoubleSide })
    );
    cloak.position.set(0, 0.9, -0.18);
    cloak.rotation.x = Math.PI / 18;
    bardGroup.add(cloak);

    // 12-STRING ACOUSTIC LUTE
    const luteGroup = new THREE.Group();
    luteGroup.position.set(0.05, 0.92, 0.28);
    luteGroup.rotation.set(0.2, 0.3, -0.5);

    // Pear-shaped Bowl Body
    const luteBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      luteWoodMat
    );
    luteBody.scale.set(1.0, 1.3, 0.6);
    luteGroup.add(luteBody);

    // Spruce Soundboard Face
    const soundboard = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 16),
      luteFaceMat
    );
    soundboard.scale.set(1.0, 1.25, 1.0);
    soundboard.position.set(0, 0, 0.065);
    luteGroup.add(soundboard);

    // Carved Rosette Soundhole
    const rosette = new THREE.Mesh(
      new THREE.CircleGeometry(0.04, 16),
      new THREE.MeshBasicMaterial({ color: 0x451a03 })
    );
    rosette.position.set(0, 0.05, 0.068);
    luteGroup.add(rosette);

    // Lute Neck & Fretboard
    const luteNeck = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.35, 0.04),
      luteWoodMat
    );
    luteNeck.position.set(0, 0.35, 0.04);
    luteGroup.add(luteNeck);

    // Angled Pegbox / Headstock with Gold Tuning Pegs
    const pegbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.16, 0.035),
      luteWoodMat
    );
    pegbox.rotation.x = -Math.PI / 3;
    pegbox.position.set(0, 0.54, -0.02);
    luteGroup.add(pegbox);

    bardGroup.add(luteGroup);

    // Left Arm holding lute neck
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 0.1), tunicMat);
    armL.position.set(-0.25, 1.05, 0.18);
    armL.rotation.set(0.6, 0.2, -0.7);
    bardGroup.add(armL);

    // Right Arm strumming strings
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 0.1), tunicMat);
    armR.position.set(0.24, 0.98, 0.2);
    armR.rotation.set(0.5, -0.3, 0.6);
    armR.name = 'strummingArm';
    bardGroup.add(armR);

    return bardGroup;
  }

  // 2. Human Paladin (Polished Plate Armor, Lion Tabard, Greatsword)
  static createPaladin() {
    const paladinGroup = new THREE.Group();
    paladinGroup.name = 'PaladinPatron';

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.92,
      roughness: 0.18
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25
    });
    const tabardMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // Royal Blue
      roughness: 0.6
    });

    // Seated Legs (bent at 90 degrees)
    const thighL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.38), armorMat);
    thighL.position.set(-0.16, 0.44, 0.18);
    paladinGroup.add(thighL);

    const thighR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.38), armorMat);
    thighR.position.set(0.16, 0.44, 0.18);
    paladinGroup.add(thighR);

    const shinL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.14), armorMat);
    shinL.position.set(-0.16, 0.21, 0.34);
    paladinGroup.add(shinL);

    const shinR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.14), armorMat);
    shinR.position.set(0.16, 0.21, 0.34);
    paladinGroup.add(shinR);

    // Torso (Breastplate)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.32), armorMat);
    torso.position.y = 0.74;
    paladinGroup.add(torso);

    // Royal Blue Tabard with Golden Lion Crest
    const tabard = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.52), tabardMat);
    tabard.position.set(0, 0.74, 0.17);
    paladinGroup.add(tabard);

    const lionCrest = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), brassMat);
    lionCrest.position.set(0, 0.82, 0.175);
    paladinGroup.add(lionCrest);

    // Articulated Steel Pauldrons (Shoulder Guards)
    for (let i = -1; i <= 1; i += 2) {
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), armorMat);
      pauldron.position.set(i * 0.3, 0.98, 0);
      paladinGroup.add(pauldron);
    }

    // Greathelm with Horizontal Visor Slit
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 16), armorMat);
    helm.position.y = 1.18;
    paladinGroup.add(helm);

    const brassBand = new THREE.Mesh(new THREE.TorusGeometry(0.162, 0.015, 8, 16), brassMat);
    brassBand.rotation.x = Math.PI / 2;
    brassBand.position.y = 1.22;
    paladinGroup.add(brassBand);

    const visorSlit = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.03, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x020617 })
    );
    visorSlit.position.set(0, 1.18, 0.15);
    paladinGroup.add(visorSlit);

    // Arms resting on table
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 0.11), armorMat);
    armL.position.set(-0.28, 0.72, 0.16);
    armL.rotation.x = Math.PI / 4;
    paladinGroup.add(armL);

    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 0.11), armorMat);
    armR.position.set(0.28, 0.72, 0.16);
    armR.rotation.x = Math.PI / 4;
    paladinGroup.add(armR);

    // Sheathed Broadsword leaning against table
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0.42, 0.5, 0.2);
    swordGroup.rotation.z = -Math.PI / 8;

    const scabbard = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.85, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5 })
    );
    swordGroup.add(scabbard);

    const swordHilt = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.04), brassMat);
    swordHilt.position.y = 0.44;
    swordGroup.add(swordHilt);

    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), brassMat);
    pommel.position.y = 0.58;
    swordGroup.add(pommel);

    paladinGroup.add(swordGroup);

    return paladinGroup;
  }

  // 3. Elf Wizard (Emerald Celestial Robes, Pointed Hat, Glowing Staff)
  static createWizard() {
    const wizardGroup = new THREE.Group();
    wizardGroup.name = 'WizardPatron';

    const robeMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.65 }); // Deep emerald
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
    const beardMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 }); // Silver white beard
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.85 });

    // Seated Flowing Robes
    const robeBase = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.9, 16), robeMat);
    robeBase.position.y = 0.45;
    wizardGroup.add(robeBase);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), skinMat);
    head.position.y = 1.1;
    wizardGroup.add(head);

    // Long Flowing White Beard
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 12), beardMat);
    beard.position.set(0, 0.9, 0.1);
    beard.rotation.x = Math.PI / 12;
    wizardGroup.add(beard);

    // Wizard Pointed Hat with Star Rune
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 16), robeMat);
    hatBrim.position.y = 1.22;
    wizardGroup.add(hatBrim);

    const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 16), robeMat);
    hatCone.rotation.z = -Math.PI / 12;
    hatCone.position.set(0.04, 1.48, -0.02);
    wizardGroup.add(hatCone);

    const hatBuckle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 16), goldMat);
    hatBuckle.position.set(0, 1.25, 0.17);
    wizardGroup.add(hatBuckle);

    // Glowing Arcane Staff
    const staffGroup = new THREE.Group();
    staffGroup.position.set(0.32, 0, 0.25);

    const staffHaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.018, 1.35, 8),
      new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 })
    );
    staffHaft.position.y = 0.675;
    staffGroup.add(staffHaft);

    const staffOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.0,
        roughness: 0.1
      })
    );
    staffOrb.position.y = 1.38;
    staffGroup.add(staffOrb);

    const orbLight = new THREE.PointLight(0x38bdf8, 1.5, 3.0);
    orbLight.position.y = 1.38;
    staffGroup.add(orbLight);

    wizardGroup.add(staffGroup);
    return wizardGroup;
  }

  // 4. Dwarf Warrior (Scale Armor, Double-Horned Helm, Braided Beard, Battleaxe)
  static createDwarf() {
    const dwarfGroup = new THREE.Group();
    dwarfGroup.name = 'DwarfPatron';

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.35 });
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.75, roughness: 0.4 });
    const beardMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 }); // Fiery orange beard
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });

    // Broad Seated Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 0.38), ironMat);
    torso.position.y = 0.48;
    dwarfGroup.add(torso);

    // Heavy Double-Horned Dwarven Helm
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), ironMat);
    helm.position.y = 0.85;
    dwarfGroup.add(helm);

    // Left Horn
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 10), bronzeMat);
    hornL.rotation.z = Math.PI / 3;
    hornL.position.set(-0.2, 0.92, 0);
    dwarfGroup.add(hornL);

    // Right Horn
    const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 10), bronzeMat);
    hornR.rotation.z = -Math.PI / 3;
    hornR.position.set(0.2, 0.92, 0);
    dwarfGroup.add(hornR);

    // Twin Braided Fiery Beards
    const beardL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.38, 8), beardMat);
    beardL.position.set(-0.08, 0.62, 0.14);
    beardL.rotation.z = -0.1;
    dwarfGroup.add(beardL);

    const beardR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.38, 8), beardMat);
    beardR.position.set(0.08, 0.62, 0.14);
    beardR.rotation.z = 0.1;
    dwarfGroup.add(beardR);

    // Gold Beard Rings
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.9 });
    const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 12), ringMat);
    ringL.position.set(-0.08, 0.52, 0.14);
    dwarfGroup.add(ringL);

    const ringR = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 12), ringMat);
    ringR.position.set(0.08, 0.52, 0.14);
    dwarfGroup.add(ringR);

    // Heavy Double-Bitted Battleaxe resting against table
    const axeGroup = new THREE.Group();
    axeGroup.position.set(-0.45, 0.45, 0.2);
    axeGroup.rotation.z = Math.PI / 8;

    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), leatherMat);
    axeGroup.add(haft);

    const bladeL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.02), ironMat);
    bladeL.position.set(-0.1, 0.3, 0);
    axeGroup.add(bladeL);

    const bladeR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.02), ironMat);
    bladeR.position.set(0.1, 0.3, 0);
    axeGroup.add(bladeR);

    dwarfGroup.add(axeGroup);

    return dwarfGroup;
  }

  // 5. Hobbit / Halfling Rogue (Leather Vest, Curly Hair, Daggers, Ale Stein)
  static createHobbit() {
    const hobbitGroup = new THREE.Group();
    hobbitGroup.name = 'HobbitPatron';

    const vestMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 }); // Forest green
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5d0a9, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });

    // Compact Seated Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.42, 12), vestMat);
    torso.position.y = 0.42;
    hobbitGroup.add(torso);

    // Cream Linen Shirt Sleeves
    const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.25, 8), shirtMat);
    sleeveL.position.set(-0.2, 0.44, 0.1);
    sleeveL.rotation.x = Math.PI / 4;
    hobbitGroup.add(sleeveL);

    const sleeveR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.25, 8), shirtMat);
    sleeveR.position.set(0.2, 0.44, 0.1);
    sleeveR.rotation.x = Math.PI / 4;
    hobbitGroup.add(sleeveR);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), skinMat);
    head.position.y = 0.72;
    hobbitGroup.add(head);

    // Curly Chestnut Hair
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 12), hairMat);
    hair.position.set(0, 0.75, -0.02);
    hobbitGroup.add(hair);

    // Pointed Halfling Ears
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 6), skinMat);
    earL.position.set(-0.12, 0.73, 0);
    earL.rotation.z = Math.PI / 3;
    hobbitGroup.add(earL);

    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 6), skinMat);
    earR.position.set(0.12, 0.73, 0);
    earR.rotation.z = -Math.PI / 3;
    hobbitGroup.add(earR);

    return hobbitGroup;
  }
}
