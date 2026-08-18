import * as THREE from 'three';
import { TextureGenerator } from '../textures/TextureGenerator.js';

export class PatronModels {
  // 1. The Bard (Performer on Stage)
  static createBard() {
    const bardGroup = new THREE.Group();
    bardGroup.name = 'TheBard';

    const fabricMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createFabricTexture('#9b1c1c'),
      roughness: 0.6
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.7 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf3cf65, metalness: 0.8, roughness: 0.3 });

    // Torso (Tunic)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.65, 12), fabricMat);
    torso.position.y = 0.9;
    bardGroup.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), skinMat);
    head.position.y = 1.35;
    bardGroup.add(head);

    // Bard Feathered Cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 12), hatMat);
    cap.rotation.z = -Math.PI / 8;
    cap.position.set(0.04, 1.48, 0);
    bardGroup.add(cap);

    // Feather on Cap
    const featherGeo = new THREE.ConeGeometry(0.04, 0.3, 8);
    const featherMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e });
    const feather = new THREE.Mesh(featherGeo, featherMat);
    feather.rotation.z = -Math.PI / 4;
    feather.position.set(0.15, 1.55, 0.05);
    bardGroup.add(feather);

    // Cape / Cloak
    const cape = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.75),
      new THREE.MeshStandardMaterial({ color: 0x475569, side: THREE.DoubleSide })
    );
    cape.position.set(0, 0.85, -0.15);
    cape.rotation.x = Math.PI / 16;
    bardGroup.add(cape);

    return bardGroup;
  }

  // 2. Human Paladin
  static createPaladin() {
    const paladinGroup = new THREE.Group();
    const armorMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.2 });
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 });

    // Seated Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.3), armorMat);
    torso.position.y = 0.65;
    paladinGroup.add(torso);

    // Helmet
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 12), armorMat);
    helm.position.y = 1.05;
    paladinGroup.add(helm);

    // Visor Slit
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.05), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    visor.position.set(0, 1.06, 0.13);
    paladinGroup.add(visor);

    // Blue Tabard
    const tabard = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.5), clothMat);
    tabard.position.set(0, 0.65, 0.16);
    paladinGroup.add(tabard);

    return paladinGroup;
  }

  // 3. Elf Wizard
  static createWizard() {
    const wizardGroup = new THREE.Group();
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 });

    // Seated Robe
    const robe = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 12), robeMat);
    robe.position.y = 0.55;
    wizardGroup.add(robe);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), skinMat);
    head.position.y = 1.05;
    wizardGroup.add(head);

    // Wizard Pointed Hat
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 12), robeMat);
    hat.position.y = 1.32;
    wizardGroup.add(hat);

    // Glowing Wizard Staff
    const staffGroup = new THREE.Group();
    const staffWood = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x78350f })
    );
    staffWood.position.y = 0.6;
    staffGroup.add(staffWood);

    // Staff Crystal Orb
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.8 })
    );
    orb.position.y = 1.22;
    staffGroup.add(orb);
    staffGroup.position.set(0.3, 0, 0.2);

    wizardGroup.add(staffGroup);
    return wizardGroup;
  }

  // 4. Dwarf Warrior
  static createDwarf() {
    const dwarfGroup = new THREE.Group();
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const beardMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.4 });

    // Broad Short Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.35), leatherMat);
    torso.position.y = 0.45;
    dwarfGroup.add(torso);

    // Head & Horned Helmet
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), ironMat);
    helm.position.y = 0.78;
    dwarfGroup.add(helm);

    // Horns
    const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 8), ironMat);
    leftHorn.rotation.z = Math.PI / 3;
    leftHorn.position.set(-0.18, 0.85, 0);
    dwarfGroup.add(leftHorn);

    const rightHorn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 8), ironMat);
    rightHorn.rotation.z = -Math.PI / 3;
    rightHorn.position.set(0.18, 0.85, 0);
    dwarfGroup.add(rightHorn);

    // Braided Beard
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 10), beardMat);
    beard.position.set(0, 0.62, 0.12);
    beard.rotation.x = Math.PI / 8;
    dwarfGroup.add(beard);

    return dwarfGroup;
  }

  // 5. Hobbit Rogue
  static createHobbit() {
    const hobbitGroup = new THREE.Group();
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfc2560, roughness: 0.7 });

    // Compact Seated Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.38), vestMat);
    torso.position.y = 0.38;
    hobbitGroup.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), skinMat);
    head.position.y = 0.64;
    hobbitGroup.add(head);

    // Ale Mug in Hand
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 })
    );
    mug.position.set(0.18, 0.42, 0.18);
    hobbitGroup.add(mug);

    return hobbitGroup;
  }
}
