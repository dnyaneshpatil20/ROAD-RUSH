import * as THREE from 'three';
import type { RaceTrackDef, WeaponId } from './types';
import type { ProceduralTextureSet } from './textures';

export interface ArmWeaponSet {
  rod: THREE.Group;
  chain: THREE.Group;
  ball: THREE.Group;
  brick: THREE.Group;
}

export interface BikeRiderRig {
  root: THREE.Group;
  chassisGroup: THREE.Group;
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
  boostFlames: THREE.Group;
  riderGroup: THREE.Group;
  torsoGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  leftLegGroup: THREE.Group;
  rightLegGroup: THREE.Group;
  leftWeapons: ArmWeaponSet;
  rightWeapons: ArmWeaponSet;
  leftSwingArc: THREE.Mesh;
  rightSwingArc: THREE.Mesh;
  telegraphRing: THREE.Mesh;
  hitFlashMaterials: THREE.MeshStandardMaterial[];
  applyCosmetics: (
    bikeColor: string,
    secondaryColor: string,
    helmetColor: string,
    visorColor: string,
    jacketColor: string,
  ) => void;
  setActiveWeapon: (weapon: WeaponId, side: -1 | 1) => void;
}

function buildArmWeapons(chromeMat: THREE.Material): ArmWeaponSet {
  // Weapon 1: Steel Rod
  const rod = new THREE.Group();
  rod.position.set(0, -0.18, 0.34);
  const rodShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 1.12, 8),
    chromeMat,
  );
  rodShaft.rotation.x = Math.PI / 2;
  rodShaft.position.z = 0.34;
  rod.add(rodShaft);

  // Weapon 2: Heavy Chain (segmented links)
  const chain = new THREE.Group();
  chain.position.set(0, -0.18, 0.34);
  for (let l = 0; l < 7; l++) {
    const link = new THREE.Mesh(
      new THREE.TorusGeometry(0.056, 0.017, 6, 10),
      chromeMat,
    );
    link.position.z = 0.14 + l * 0.11;
    link.rotation.y = l % 2 === 0 ? 0 : Math.PI / 2;
    chain.add(link);
  }
  chain.visible = false;

  // Weapon 3: Iron Ball & Chain
  const ball = new THREE.Group();
  ball.position.set(0, -0.18, 0.34);
  for (let l = 0; l < 5; l++) {
    const link = new THREE.Mesh(
      new THREE.TorusGeometry(0.048, 0.014, 6, 8),
      chromeMat,
    );
    link.position.z = 0.12 + l * 0.11;
    link.rotation.y = l % 2 === 0 ? 0 : Math.PI / 2;
    ball.add(link);
  }
  const ironBallMat = new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    roughness: 0.32,
    metalness: 0.88,
  });
  const ironSphere = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 1), ironBallMat);
  ironSphere.position.z = 0.78;
  ball.add(ironSphere);
  ball.visible = false;

  // Weapon 4: Road Brick held in hand
  const brick = new THREE.Group();
  brick.position.set(0, -0.18, 0.34);
  const brickMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.1, 0.24),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85, metalness: 0.05 }),
  );
  brick.add(brickMesh);
  brick.visible = false;

  return { rod, chain, ball, brick };
}

/**
 * Builds a composite superbike & full left/right articulated rider THREE.Group
 * capable of realistic left-arm / right-arm weapon swings and left-leg / right-leg kicks.
 */
export function createBikeRiderRig(
  shadowDiscMap: THREE.Texture,
  isPlayer: boolean,
): BikeRiderRig {
  const root = new THREE.Group();

  // Ground contact shadow disc
  const shadowGeo = new THREE.PlaneGeometry(1.75, 3.2);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowDiscMap,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.y = 0.02;
  root.add(shadowMesh);

  // Enemy telegraph ground warning ring
  const ringGeo = new THREE.RingGeometry(1.1, 1.38, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const telegraphRing = new THREE.Mesh(ringGeo, ringMat);
  telegraphRing.position.y = 0.04;
  telegraphRing.visible = false;
  root.add(telegraphRing);

  const chassisGroup = new THREE.Group();
  root.add(chassisGroup);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.22,
    metalness: 0.55,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.65,
    metalness: 0.2,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe4e4e7,
    roughness: 0.14,
    metalness: 0.92,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x141417,
    roughness: 0.86,
    metalness: 0.05,
  });
  const helmetMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f5,
    roughness: 0.18,
    metalness: 0.35,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.08,
    metalness: 0.75,
  });
  const jacketMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.72,
    metalness: 0.1,
  });

  const hitFlashMaterials = [primaryMat, secondaryMat, helmetMat, jacketMat];

  // Wheel helper
  const buildWheel = () => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.095, 10, 20), tireMat);
    tire.rotation.y = Math.PI / 2;
    tire.castShadow = true;
    wg.add(tire);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12),
      chromeMat,
    );
    rim.rotation.z = Math.PI / 2;
    wg.add(rim);

    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.14, 12),
      secondaryMat,
    );
    disc.rotation.z = Math.PI / 2;
    wg.add(disc);
    return wg;
  };

  const frontWheel = buildWheel();
  frontWheel.position.set(0, 0.38, 0.92);
  chassisGroup.add(frontWheel);

  const rearWheel = buildWheel();
  rearWheel.position.set(0, 0.38, -0.88);
  chassisGroup.add(rearWheel);

  // Sculpted Fuel Tank & Fairing Silhouette
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-0.82, 0.48);
  bodyShape.lineTo(-0.22, 0.68);
  bodyShape.lineTo(0.28, 0.96);
  bodyShape.lineTo(0.84, 0.88);
  bodyShape.lineTo(1.06, 0.62);
  bodyShape.lineTo(0.55, 0.42);
  bodyShape.lineTo(-0.55, 0.38);
  bodyShape.closePath();

  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 0.38,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  bodyGeo.center();
  bodyGeo.rotateY(Math.PI / 2);
  const bodyMesh = new THREE.Mesh(bodyGeo, primaryMat);
  bodyMesh.position.set(0, 0.72, 0.08);
  bodyMesh.castShadow = true;
  chassisGroup.add(bodyMesh);

  const engineBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.36, 0.62),
    secondaryMat,
  );
  engineBlock.position.set(0, 0.48, 0.02);
  chassisGroup.add(engineBlock);

  for (const side of [-0.13, 0.13]) {
    const fork = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.028, 0.78, 8),
      chromeMat,
    );
    fork.position.set(side, 0.7, 0.74);
    fork.rotation.x = -0.38;
    chassisGroup.add(fork);
  }

  for (const side of [-0.21, 0.21]) {
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.052, 0.88, 10),
      chromeMat,
    );
    exhaust.rotation.x = Math.PI / 2 - 0.14;
    exhaust.position.set(side, 0.42, -0.58);
    chassisGroup.add(exhaust);
  }

  const handlebar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.72, 8),
    chromeMat,
  );
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, 1.02, 0.46);
  chassisGroup.add(handlebar);

  const headlight = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.12, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff3c4,
      emissiveIntensity: isPlayer ? 1.8 : 1.2,
    }),
  );
  headlight.position.set(0, 0.84, 0.96);
  chassisGroup.add(headlight);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.22, 0.04),
    visorMat,
  );
  windshield.position.set(0, 1.06, 0.72);
  windshield.rotation.x = -0.65;
  chassisGroup.add(windshield);

  const taillight = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.08, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0xef4444,
      emissiveIntensity: 1.5,
    }),
  );
  taillight.position.set(0, 0.82, -0.92);
  chassisGroup.add(taillight);

  // Dual Nitro Exhaust Flames (visible when riding over a Road Booster!)
  const boostFlames = new THREE.Group();
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  for (const side of [-0.21, 0.21]) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.72, 8), flameMat);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(side, 0.36, -1.28);
    boostFlames.add(flame);
  }
  boostFlames.visible = false;
  chassisGroup.add(boostFlames);

  // === Articulated Rider Group ===
  const riderGroup = new THREE.Group();
  riderGroup.position.set(0, 0.82, -0.14);
  root.add(riderGroup);

  // World coordinate convention facing +Z: Screen LEFT = +X, Screen RIGHT = -X
  const buildLeg = (worldXSign: -1 | 1) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(worldXSign * 0.18, 0.02, 0.08);
    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.082, 0.36, 4, 8),
      secondaryMat,
    );
    thigh.position.set(0, -0.16, 0.12);
    thigh.rotation.x = 0.62;
    legGroup.add(thigh);

    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.12, 0.22),
      chromeMat,
    );
    boot.position.set(0, -0.34, 0.24);
    legGroup.add(boot);

    riderGroup.add(legGroup);
    return legGroup;
  };

  const leftLegGroup = buildLeg(1);   // +X = Screen Left
  const rightLegGroup = buildLeg(-1); // -X = Screen Right

  const torsoGroup = new THREE.Group();
  riderGroup.add(torsoGroup);

  // Rider Jacket Torso
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.19, 0.42, 4, 10),
    jacketMat,
  );
  torso.position.set(0, 0.28, 0.08);
  torso.rotation.x = 0.42;
  torso.castShadow = true;
  torsoGroup.add(torso);

  // Helmet + Visor
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), helmetMat);
  helmet.position.set(0, 0.66, 0.25);
  helmet.castShadow = true;
  torsoGroup.add(helmet);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.09, 0.14),
    visorMat,
  );
  visor.position.set(0, 0.66, 0.37);
  torsoGroup.add(visor);

  // Left Arm + Weapon Set (Screen LEFT = +X)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(0.24, 0.4, 0.16);
  torsoGroup.add(leftArmGroup);

  const leftArmMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.065, 0.4, 4, 8),
    jacketMat,
  );
  leftArmMesh.position.set(0, -0.14, 0.16);
  leftArmMesh.rotation.x = 1.05;
  leftArmGroup.add(leftArmMesh);

  const leftWeapons = buildArmWeapons(chromeMat);
  leftArmGroup.add(
    leftWeapons.rod,
    leftWeapons.chain,
    leftWeapons.ball,
    leftWeapons.brick,
  );

  // Right Arm + Weapon Set (Screen RIGHT = -X)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(-0.24, 0.4, 0.16);
  torsoGroup.add(rightArmGroup);

  const rightArmMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.065, 0.4, 4, 8),
    jacketMat,
  );
  rightArmMesh.position.set(0, -0.14, 0.16);
  rightArmMesh.rotation.x = 1.05;
  rightArmGroup.add(rightArmMesh);

  const rightWeapons = buildArmWeapons(chromeMat);
  rightArmGroup.add(
    rightWeapons.rod,
    rightWeapons.chain,
    rightWeapons.ball,
    rightWeapons.brick,
  );

  // Dynamic Swing Arc Slash Trails (+X = Screen Left, -X = Screen Right)
  const arcGeo = new THREE.RingGeometry(0.7, 1.55, 14, 1, -Math.PI * 0.45, Math.PI * 0.9);
  arcGeo.rotateX(-Math.PI / 2);
  const arcMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const leftSwingArc = new THREE.Mesh(arcGeo, arcMat);
  leftSwingArc.position.set(0.65, 1.0, 0.25);
  leftSwingArc.rotation.y = 0;
  leftSwingArc.visible = false;
  root.add(leftSwingArc);

  const rightSwingArc = new THREE.Mesh(arcGeo, arcMat);
  rightSwingArc.position.set(-0.65, 1.0, 0.25);
  rightSwingArc.rotation.y = Math.PI;
  rightSwingArc.visible = false;
  root.add(rightSwingArc);

  return {
    root,
    chassisGroup,
    frontWheel,
    rearWheel,
    boostFlames,
    riderGroup,
    torsoGroup,
    leftArmGroup,
    rightArmGroup,
    leftLegGroup,
    rightLegGroup,
    leftWeapons,
    rightWeapons,
    leftSwingArc,
    rightSwingArc,
    telegraphRing,
    hitFlashMaterials,
    applyCosmetics: (bikeCol, secCol, helmCol, visCol, jackCol) => {
      primaryMat.color.set(bikeCol);
      secondaryMat.color.set(secCol);
      helmetMat.color.set(helmCol);
      visorMat.color.set(visCol);
      jacketMat.color.set(jackCol);
    },
    setActiveWeapon: (weapon: WeaponId, side: -1 | 1) => {
      // Semantic side: -1 = Screen Left (+X), +1 = Screen Right (-X)
      const useLeft = side < 0;
      leftWeapons.rod.visible = useLeft && weapon === 'rod';
      leftWeapons.chain.visible = useLeft && weapon === 'chain';
      leftWeapons.ball.visible = useLeft && weapon === 'ball';
      leftWeapons.brick.visible = useLeft && weapon === 'brick';

      rightWeapons.rod.visible = !useLeft && weapon === 'rod';
      rightWeapons.chain.visible = !useLeft && weapon === 'chain';
      rightWeapons.ball.visible = !useLeft && weapon === 'ball';
      rightWeapons.brick.visible = !useLeft && weapon === 'brick';
    },
  };
}

/**
 * Builds crisp 3D Road Booster pads and Red Petrol Cans shown along the road.
 */
export function createPickupMesh(kind: 'booster' | 'petrol'): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'booster') {
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.08, 3.6),
      new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.5,
        roughness: 0.2,
      }),
    );
    pad.position.y = 0.05;
    g.add(pad);

    const chevronMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (const zOff of [-0.9, 0.0, 0.9]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.35), chevronMat);
      strip.position.set(0, 0.08, zOff);
      g.add(strip);
    }

    for (const side of [-1.25, 1.25]) {
      const pylon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.14, 0.9, 8),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.2 }),
      );
      pylon.position.set(side, 0.45, 0);
      g.add(pylon);
    }
  } else {
    // Classic Red & Yellow Petrol Jerrycan + glowing ground ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.05, 18),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    g.add(ring);

    const canBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.86, 0.44),
      new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.5,
        roughness: 0.35,
      }),
    );
    canBody.position.y = 0.56;
    g.add(canBody);

    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.14, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 }),
    );
    handle.position.set(0, 1.05, 0);
    g.add(handle);

    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.09, 0.36, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.7,
      }),
    );
    nozzle.position.set(0.24, 1.06, 0);
    nozzle.rotation.z = -0.55;
    g.add(nozzle);
  }
  return g;
}

/**
 * Builds rich, authentic 3D environments for all 5 cities:
 * Sky dome gradient, curbed asphalt highway, streetlamps, multi-crown foliage,
 * and city-specific landmarks.
 */
export function buildCityEnvironment(
  scene: THREE.Scene,
  race: RaceTrackDef,
  textures: ProceduralTextureSet,
  getSurfaceAt: (z: number) => { xCenter: number; yElevation: number },
): THREE.Object3D[] {
  const created: THREE.Object3D[] = [];
  const add = (obj: THREE.Object3D) => {
    scene.add(obj);
    created.push(obj);
    return obj;
  };

  // 0. Atmospheric Sky Gradient Dome (smooth zenith-to-horizon fade)
  const skyGeo = new THREE.SphereGeometry(280, 24, 14);
  const posAttr = skyGeo.getAttribute('position');
  const colors = new Float32Array(posAttr.count * 3);
  const zenithColor = new THREE.Color(race.skyColor).multiplyScalar(1.08);
  const horizonColor = new THREE.Color(race.fogColor);
  const nadirColor = new THREE.Color(race.hemiGroundColor);
  const cTmp = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    const t = Math.max(-1, Math.min(1, y / 280));
    if (t >= 0) {
      cTmp.copy(horizonColor).lerp(zenithColor, Math.pow(t, 0.58));
    } else {
      cTmp.copy(horizonColor).lerp(nadirColor, Math.min(1, -t * 1.4));
    }
    colors[i * 3] = cTmp.r;
    colors[i * 3 + 1] = cTmp.g;
    colors[i * 3 + 2] = cTmp.b;
  }
  skyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const skyMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.name = 'skyDome';
  add(skyDome);

  // 1. Continuous curved ribbon Road + Concrete Curbs + Terrain Floor
  const segments = 240;
  const totalLen = race.lengthMeters + 160;
  const stepZ = totalLen / segments;
  const hw = race.roadHalfWidth;

  const roadVerts: number[] = [];
  const roadUvs: number[] = [];
  const roadIndices: number[] = [];

  const groundVerts: number[] = [];
  const groundUvs: number[] = [];
  const groundIndices: number[] = [];

  const curbVerts: number[] = [];
  const curbIndices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const z = -40 + i * stepZ;
    const s = getSurfaceAt(z);
    const vCoord = z / totalLen;

    roadVerts.push(s.xCenter - hw, s.yElevation + 0.02, z);
    roadVerts.push(s.xCenter + hw, s.yElevation + 0.02, z);
    roadUvs.push(0, vCoord);
    roadUvs.push(1, vCoord);

    // Wide surrounding ground ribbon (-200m to +200m)
    groundVerts.push(s.xCenter - 200, s.yElevation - 0.22, z);
    groundVerts.push(s.xCenter + 200, s.yElevation - 0.22, z);
    groundUvs.push(0, vCoord);
    groundUvs.push(1, vCoord);

    // Raised curb shoulders (left shoulder + right shoulder)
    curbVerts.push(s.xCenter - hw - 1.5, s.yElevation + 0.14, z);
    curbVerts.push(s.xCenter - hw, s.yElevation + 0.03, z);
    curbVerts.push(s.xCenter + hw, s.yElevation + 0.03, z);
    curbVerts.push(s.xCenter + hw + 1.5, s.yElevation + 0.14, z);

    if (i < segments) {
      const idx = i * 2;
      roadIndices.push(idx, idx + 2, idx + 1, idx + 1, idx + 2, idx + 3);
      groundIndices.push(idx, idx + 2, idx + 1, idx + 1, idx + 2, idx + 3);

      const cIdx = i * 4;
      // Left curb quad
      curbIndices.push(cIdx, cIdx + 4, cIdx + 1, cIdx + 1, cIdx + 4, cIdx + 5);
      // Right curb quad
      curbIndices.push(cIdx + 2, cIdx + 6, cIdx + 3, cIdx + 3, cIdx + 6, cIdx + 7);
    }
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVerts, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeo.setIndex(roadIndices);
  roadGeo.computeVertexNormals();
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.roadMap,
    bumpMap: textures.roadBump,
    bumpScale: 0.045,
    roughness: race.season === 'Monsoon' ? 0.22 : 0.78,
    metalness: race.season === 'Monsoon' ? 0.35 : 0.06,
    side: THREE.DoubleSide,
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  add(roadMesh);

  const curbGeo = new THREE.BufferGeometry();
  curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbVerts, 3));
  curbGeo.setIndex(curbIndices);
  curbGeo.computeVertexNormals();
  const curbMat = new THREE.MeshStandardMaterial({
    color: race.season === 'Winter' ? 0xcbd5e1 : 0x52525b,
    roughness: 0.85,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  add(new THREE.Mesh(curbGeo, curbMat));

  const groundGeo = new THREE.BufferGeometry();
  groundGeo.setAttribute('position', new THREE.Float32BufferAttribute(groundVerts, 3));
  groundGeo.setAttribute('uv', new THREE.Float32BufferAttribute(groundUvs, 2));
  groundGeo.setIndex(groundIndices);
  groundGeo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.terrainMap,
    roughness: 0.92,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  add(groundMesh);

  // 2. Roadside Guardrail Posts + Streetlamps (InstancedMesh)
  const postCount = 190;
  const postGeo = new THREE.BoxGeometry(0.26, 0.88, 0.34);
  const postMat = new THREE.MeshStandardMaterial({
    color: race.id === 0 ? 0xc2410c : race.id === 2 ? 0x991b1b : 0x71717a,
    roughness: 0.45,
    metalness: 0.6,
  });
  const posts = new THREE.InstancedMesh(postGeo, postMat, postCount * 2);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < postCount; i++) {
    const z = 10 + (i / postCount) * race.lengthMeters;
    const s = getSurfaceAt(z);
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1;
      dummy.position.set(s.xCenter + sign * (hw + 0.55), s.yElevation + 0.44, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      posts.setMatrixAt(i * 2 + side, dummy.matrix);
    }
  }
  posts.computeBoundingSphere();
  add(posts);

  // Streetlamps with emissive light heads along the avenue
  const lampCount = 72;
  const lampPoleInst = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.16, 6.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.65, roughness: 0.35 }),
    lampCount,
  );
  const lampHeadInst = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.1, 0.24, 0.42),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: race.id === 4 ? 0x38bdf8 : 0xfde68a,
      emissiveIntensity: race.id === 4 ? 2.2 : 1.15,
    }),
    lampCount,
  );
  for (let i = 0; i < lampCount; i++) {
    const z = 25 + (i / lampCount) * race.lengthMeters;
    const s = getSurfaceAt(z);
    const sign = i % 2 === 0 ? -1 : 1;
    dummy.position.set(s.xCenter + sign * (hw + 1.45), s.yElevation + 3.4, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    lampPoleInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(s.xCenter + sign * (hw + 0.85), s.yElevation + 6.75, z);
    dummy.updateMatrix();
    lampHeadInst.setMatrixAt(i, dummy.matrix);
  }
  lampPoleInst.computeBoundingSphere();
  lampHeadInst.computeBoundingSphere();
  add(lampPoleInst);
  add(lampHeadInst);

  // 3. Layered Multi-Crown Seasonal Trees (InstancedMesh)
  const treeCount = 175;
  const trunkGeo = new THREE.CylinderGeometry(0.24, 0.42, 3.6, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b3621, roughness: 0.9 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);

  const canopyGeo =
    race.season === 'Winter'
      ? new THREE.ConeGeometry(2.5, 6.4, 7)
      : new THREE.DodecahedronGeometry(2.5, 1);
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.02,
  });
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount * 2);
  const tint = new THREE.Color();

  for (let i = 0; i < treeCount; i++) {
    const z = 25 + (i / treeCount) * (race.lengthMeters + 40);
    const s = getSurfaceAt(z);
    const side = i % 2 === 0 ? -1 : 1;
    const distFromRoad = hw + 6.2 + ((i * 17) % 26);
    const sc = 0.85 + ((i * 31) % 35) / 100;
    const tx = s.xCenter + side * distFromRoad;

    dummy.position.set(tx, s.yElevation + 1.6 * sc, z);
    dummy.rotation.set(0, i * 0.4, 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    // Lower foliage crown
    dummy.position.set(tx, s.yElevation + (race.season === 'Winter' ? 4.4 : 3.9) * sc, z);
    dummy.scale.set(sc * 1.15, sc * 0.95, sc * 1.15);
    dummy.updateMatrix();
    canopies.setMatrixAt(i * 2, dummy.matrix);

    // Upper offset crown for rich organic silhouette
    dummy.position.set(
      tx + (i % 2 === 0 ? 0.65 : -0.65) * sc,
      s.yElevation + (race.season === 'Winter' ? 6.2 : 5.4) * sc,
      z + 0.35 * sc,
    );
    dummy.scale.set(sc * 0.82, sc * 0.88, sc * 0.82);
    dummy.updateMatrix();
    canopies.setMatrixAt(i * 2 + 1, dummy.matrix);

    if (race.season === 'Autumn') {
      tint.setHSL(0.055 + (i % 5) * 0.02, 0.8, 0.45);
    } else if (race.season === 'Summer') {
      tint.setHSL(0.31 + (i % 4) * 0.025, 0.68, 0.29);
    } else if (race.season === 'Spring') {
      tint.setHSL(0.93, 0.76, 0.77 + (i % 3) * 0.04);
    } else if (race.season === 'Winter') {
      tint.setHSL(0.55, 0.25, i % 3 === 0 ? 0.88 : 0.4);
    } else {
      tint.setHSL(0.58, 0.25, 0.22);
    }
    canopies.setColorAt(i * 2, tint);
    canopies.setColorAt(i * 2 + 1, tint.clone().offsetHSL(0.01, 0, 0.05));
  }
  trunks.computeBoundingSphere();
  canopies.computeBoundingSphere();
  if (race.biomeStyle !== 'neon_expressway') {
    add(trunks);
    add(canopies);
  } else {
    trunkGeo.dispose();
    trunkMat.dispose();
    canopyGeo.dispose();
    canopyMat.dispose();
  }

  // 4. City-Specific Iconic Landmarks & Architecture
  buildCityLandmarks(add, race, textures, getSurfaceAt);

  // 5. Checkered Finish Line Arch
  const finishSurf = getSurfaceAt(race.lengthMeters);
  const archGroup = new THREE.Group();
  archGroup.position.set(finishSurf.xCenter, finishSurf.yElevation, race.lengthMeters);
  const pillarGeo = new THREE.BoxGeometry(0.95, 8.8, 0.95);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.5 });
  const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
  leftPillar.position.set(-hw - 0.6, 4.4, 0);
  const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
  rightPillar.position.set(hw + 0.6, 4.4, 0);
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(hw * 2 + 2.2, 2.2, 0.55),
    new THREE.MeshStandardMaterial({ map: textures.finishBannerMap, roughness: 0.4 }),
  );
  banner.position.set(0, 7.8, 0);
  archGroup.add(leftPillar, rightPillar, banner);
  add(archGroup);

  return created;
}

function buildCityLandmarks(
  add: (o: THREE.Object3D) => THREE.Object3D,
  race: RaceTrackDef,
  textures: ProceduralTextureSet,
  getSurfaceAt: (z: number) => { xCenter: number; yElevation: number },
): void {
  const hw = race.roadHalfWidth;
  const bldgMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.buildingMap,
    roughness: 0.5,
    metalness: 0.25,
  });

  if (race.biomeStyle === 'bridge_bay') {
    // SAN FRANCISCO / PARIS / NYC / VANCOUVER / MONACO: Suspension Bridge + Bay Water + Skyline
    const bayMat = new THREE.MeshStandardMaterial({
      color: 0x1d4e6b,
      roughness: 0.18,
      metalness: 0.65,
    });
    const bayPlane = new THREE.Mesh(new THREE.PlaneGeometry(460, race.lengthMeters * 0.65), bayMat);
    bayPlane.rotation.x = -Math.PI / 2;
    bayPlane.position.set(0, -1.6, race.lengthMeters * 0.45);
    add(bayPlane);

    const bridgeRed = new THREE.MeshStandardMaterial({
      color: 0xc0392b,
      roughness: 0.4,
      metalness: 0.55,
    });
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0xd9482f,
      roughness: 0.35,
      metalness: 0.72,
    });
    const towerZs = [220, Math.round(race.lengthMeters * 0.42), Math.round(race.lengthMeters * 0.72)];
    for (const tz of towerZs) {
      const s = getSurfaceAt(tz);
      const tower = new THREE.Group();
      tower.position.set(s.xCenter, s.yElevation, tz);
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(2.3, 44, 2.7), bridgeRed);
        leg.position.set(side * (hw + 2.4), 22, 0);
        tower.add(leg);
      }
      for (const h of [15, 29, 41]) {
        const cross = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 5.6, 2.2, 2.0), bridgeRed);
        cross.position.set(0, h, 0);
        tower.add(cross);
      }
      add(tower);
    }

    for (let seg = 0; seg < towerZs.length - 1; seg++) {
      const zA = towerZs[seg];
      const zB = towerZs[seg + 1];
      const steps = 26;
      for (const side of [-1, 1]) {
        for (let k = 0; k < steps; k++) {
          const t0 = k / steps;
          const t1 = (k + 1) / steps;
          const za = zA + (zB - zA) * t0;
          const zb = zA + (zB - zA) * t1;
          const sa = getSurfaceAt(za);
          const sb = getSurfaceAt(zb);
          const catA = sa.yElevation + 16 + Math.pow(t0 * 2 - 1, 2) * 26;
          const catB = sb.yElevation + 16 + Math.pow(t1 * 2 - 1, 2) * 26;
          const pA = new THREE.Vector3(sa.xCenter + side * (hw + 2.4), catA, za);
          const pB = new THREE.Vector3(sb.xCenter + side * (hw + 2.4), catB, zb);
          const len = pA.distanceTo(pB);
          const cableSeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.18, len, 6),
            cableMat,
          );
          cableSeg.position.copy(pA).lerp(pB, 0.5);
          cableSeg.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            pB.clone().sub(pA).normalize(),
          );
          add(cableSeg);
        }
      }
    }

    const pySurf = getSurfaceAt(race.lengthMeters * 0.8);
    const pyramid = new THREE.Mesh(
      new THREE.ConeGeometry(16, 110, 4),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.42, metalness: 0.25 }),
    );
    pyramid.rotation.y = Math.PI / 4;
    pyramid.position.set(pySurf.xCenter - 46, pySurf.yElevation + 52, race.lengthMeters * 0.8);
    add(pyramid);

    const bCount = 72;
    const bGeo = new THREE.BoxGeometry(11, 24, 14);
    const bInst = new THREE.InstancedMesh(bGeo, bldgMat, bCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < bCount; i++) {
      const z = 35 + (i / bCount) * (race.lengthMeters - 120);
      const s = getSurfaceAt(z);
      const side = i % 2 === 0 ? -1 : 1;
      const hScale = 0.7 + ((i * 19) % 16) * 0.12;
      dummy.position.set(s.xCenter + side * (hw + 14 + (i % 3) * 5), s.yElevation + 12 * hScale, z);
      dummy.scale.set(1, hScale, 1);
      dummy.updateMatrix();
      bInst.setMatrixAt(i, dummy.matrix);
    }
    bInst.computeBoundingSphere();
    add(bInst);
  } else if (race.biomeStyle === 'jungle_hills') {
    // MUNNAR / RIO / BALI / CAPE TOWN: Terraced tea estates, mossy rock cliffs & lush jungle
    const cliffMat = new THREE.MeshStandardMaterial({ color: 0x4b5548, roughness: 0.92 });
    const teaMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85 });
    const teaLightMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.88 });
    const cliffCount = 76;
    const cliffInst = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(18, 1),
      cliffMat,
      cliffCount,
    );
    const teaInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(24, 3.8, 30),
      teaMat,
      cliffCount,
    );
    const terraceTop = new THREE.InstancedMesh(
      new THREE.BoxGeometry(16, 2.5, 22),
      teaLightMat,
      cliffCount,
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < cliffCount; i++) {
      const z = 45 + (i / cliffCount) * race.lengthMeters;
      const s = getSurfaceAt(z);
      const side = i % 2 === 0 ? -1 : 1;
      dummy.position.set(s.xCenter + side * (hw + 34), s.yElevation + 12, z);
      dummy.rotation.set(0, i * 0.5, 0);
      dummy.scale.set(1.1, 0.95 + (i % 5) * 0.25, 1.3);
      dummy.updateMatrix();
      cliffInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(s.xCenter - side * (hw + 18), s.yElevation + 1.5, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1 + (i % 3) * 0.4, 1);
      dummy.updateMatrix();
      teaInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(s.xCenter - side * (hw + 22), s.yElevation + 4.4, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      terraceTop.setMatrixAt(i, dummy.matrix);
    }
    cliffInst.computeBoundingSphere();
    teaInst.computeBoundingSphere();
    terraceTop.computeBoundingSphere();
    add(cliffInst);
    add(teaInst);
    add(terraceTop);
  } else if (race.biomeStyle === 'shrine_blossom') {
    // KYOTO / AMSTERDAM / SEOUL / ROME: Torii Gates + Stone Lanterns + Blossom Boulevards + Pagoda
    const toriiRed = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45 });
    const darkRoof = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.85 });
    const lanternGlow = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
    });

    for (let tz = 130; tz < race.lengthMeters - 160; tz += 420) {
      const s = getSurfaceAt(tz);
      const torii = new THREE.Group();
      torii.position.set(s.xCenter, s.yElevation, tz);
      for (const side of [-1, 1]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 10.8, 10), toriiRed);
        col.position.set(side * (hw + 1.2), 5.4, 0);
        torii.add(col);
      }
      const nuki = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 4.8, 0.85, 0.85), toriiRed);
      nuki.position.set(0, 8.3, 0);
      const kasagi = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 8.2, 1.15, 1.5), darkRoof);
      kasagi.position.set(0, 10.7, 0);
      torii.add(nuki, kasagi);
      add(torii);
    }

    for (let lz = 60; lz < race.lengthMeters - 80; lz += 170) {
      const s = getSurfaceAt(lz);
      for (const side of [-1, 1]) {
        const lGroup = new THREE.Group();
        lGroup.position.set(s.xCenter + side * (hw + 2.5), s.yElevation, lz);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 1.6, 6), lanternMat);
        base.position.y = 0.8;
        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), lanternGlow);
        glow.position.y = 1.8;
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.45, 4), darkRoof);
        cap.rotation.y = Math.PI / 4;
        cap.position.y = 2.25;
        lGroup.add(base, glow, cap);
        add(lGroup);
      }
    }

    const ps = getSurfaceAt(race.lengthMeters * 0.52);
    const pagoda = new THREE.Group();
    pagoda.position.set(ps.xCenter + 34, ps.yElevation, race.lengthMeters * 0.52);
    for (let tier = 0; tier < 5; tier++) {
      const w = 10 - tier * 1.4;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 3.8, w * 0.7), toriiRed);
      body.position.y = 2 + tier * 4.2;
      const eave = new THREE.Mesh(new THREE.ConeGeometry(w, 1.8, 4), darkRoof);
      eave.rotation.y = Math.PI / 4;
      eave.position.y = 4.2 + tier * 4.2;
      pagoda.add(body, eave);
    }
    add(pagoda);
  } else if (race.biomeStyle === 'alpine_glacier') {
    // ZERMATT / REYKJAVIK / INNSBRUCK / BANFF: Snow peaks + Timber Chalets
    const peakMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.72 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.88 });
    const peakCount = 56;
    const peakInst = new THREE.InstancedMesh(new THREE.ConeGeometry(28, 68, 4), peakMat, peakCount);
    const baseInst = new THREE.InstancedMesh(new THREE.ConeGeometry(35, 44, 5), rockMat, peakCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < peakCount; i++) {
      const z = 75 + (i / peakCount) * race.lengthMeters;
      const s = getSurfaceAt(z);
      const side = i % 2 === 0 ? -1 : 1;
      const sc = 0.85 + (i % 4) * 0.35;
      dummy.position.set(s.xCenter + side * (hw + 46), s.yElevation + 30 * sc, z);
      dummy.rotation.y = i * 0.7;
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      peakInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(s.xCenter + side * (hw + 42), s.yElevation + 14 * sc, z);
      dummy.updateMatrix();
      baseInst.setMatrixAt(i, dummy.matrix);
    }
    peakInst.computeBoundingSphere();
    baseInst.computeBoundingSphere();
    add(peakInst);
    add(baseInst);

    const timberMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const roofSnowMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.65 });
    const warmWinMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.4,
    });
    for (let cz = 140; cz < race.lengthMeters - 160; cz += 340) {
      const s = getSurfaceAt(cz);
      const side = Math.floor(cz / 340) % 2 === 0 ? -1 : 1;
      const chalet = new THREE.Group();
      chalet.position.set(s.xCenter + side * (hw + 14), s.yElevation, cz);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(8.5, 5.2, 9.5), timberMat);
      wall.position.y = 2.6;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(7.6, 3.8, 4), roofSnowMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 7.0;
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 9.65), warmWinMat);
      win.position.y = 2.8;
      chalet.add(wall, roof, win);
      add(chalet);
    }
  } else {
    // TOKYO SHINJUKU EXPRESSWAY: Illuminated skyscrapers, Neon signage, Highway gantries & Tokyo Tower
    const towerCount = 74;
    const tGeo = new THREE.BoxGeometry(14, 54, 14);
    const tInst = new THREE.InstancedMesh(tGeo, bldgMat, towerCount);
    const neonColors = [0x38bdf8, 0xf59e0b, 0xec4899, 0x22c55e];
    const neonGeo = new THREE.BoxGeometry(14.4, 2.2, 14.4);
    const neonMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const neonInst = new THREE.InstancedMesh(neonGeo, neonMat, towerCount);
    const dummy = new THREE.Object3D();
    const nColor = new THREE.Color();

    for (let i = 0; i < towerCount; i++) {
      const z = 40 + (i / towerCount) * (race.lengthMeters + 60);
      const s = getSurfaceAt(z);
      const side = i % 2 === 0 ? -1 : 1;
      const hScale = 0.72 + ((i * 23) % 16) * 0.1;
      const tx = s.xCenter + side * (hw + 16 + (i % 3) * 8);
      dummy.position.set(tx, s.yElevation + 26 * hScale, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, hScale, 1);
      dummy.updateMatrix();
      tInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tx, s.yElevation + 11 + (i % 3) * 6, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      neonInst.setMatrixAt(i, dummy.matrix);
      neonInst.setColorAt(i, nColor.setHex(neonColors[i % neonColors.length]));
    }
    tInst.computeBoundingSphere();
    neonInst.computeBoundingSphere();
    add(tInst);
    add(neonInst);

    const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.35 });
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x065f46,
      emissive: 0x10b981,
      emissiveIntensity: 0.65,
    });
    for (let gz = 130; gz < race.lengthMeters - 100; gz += 320) {
      const s = getSurfaceAt(gz);
      const gantry = new THREE.Group();
      gantry.position.set(s.xCenter, s.yElevation, gz);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 4, 0.9, 0.9), steelMat);
      bar.position.y = 8.4;
      const sign = new THREE.Mesh(new THREE.BoxGeometry(8.5, 2.2, 0.4), signMat);
      sign.position.set(0, 8.4, 0.3);
      gantry.add(bar, sign);
      add(gantry);
    }

    const ts = getSurfaceAt(1650);
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(8.5, 92, 4),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xf97316,
        emissiveIntensity: 0.75,
        wireframe: true,
      }),
    );
    spire.position.set(ts.xCenter - 46, ts.yElevation + 46, 1650);
    add(spire);
  }
}
