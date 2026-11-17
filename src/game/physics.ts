import { BOOSTER_TIERS, RACES, RIVAL_ROSTER, WEAPON_TIERS, WEAPONS } from './catalog';
import type {
  BrickProjectile,
  CombatActionKind,
  RacerState,
  RaceTrackDef,
  TrackHazard,
  TrackPickup,
  TrackSurfaceSample,
  WeaponId,
} from './types';

export const GRAVITY = 9.81;
export const PROJECTILE_GRAVITY = 18.0;
export const TOTAL_RACERS = 11;

export interface PlayerInputState {
  throttle: boolean;
  brake: boolean;
  steer: number; // -1 (left -> +X on screen) .. +1 (right -> -X on screen)
  attackJustPressed: boolean;
  attackAction?: CombatActionKind;
  attackWeapon?: WeaponId;
  switchWeapon?: WeaponId;
  weaponTier?: number;
  boosterTier?: number;
}

export interface PhysicsTickEvents {
  playerAttacked?: WeaponId | 'kick_left' | 'kick_right';
  hitImpacts: {
    attackerId: string;
    targetId: string;
    weapon: WeaponId | 'kick_left' | 'kick_right';
    x: number;
    y: number;
    z: number;
    knockout: boolean;
  }[];
  pickups: {
    racerId: string;
    kind: 'booster' | 'petrol';
    x: number;
    y: number;
    z: number;
  }[];
  collisions: { x: number; y: number; z: number; intensity: number }[];
  playerCrashed: boolean;
  playerLanded: boolean;
}

/**
 * Deterministic city & mountain terrain profile along track distance z.
 * Supports all 22 global races with authentic hills, sweeps, and bridge climbs.
 */
export function getTrackSurface(raceId: number, z: number): TrackSurfaceSample {
  const safeZ = Math.max(0, z);
  const race = getRace(raceId);
  const seedShift = (race.id % 7) * 0.14;
  const style = race.biomeStyle;

  let yElevation = 0;
  let dyDz = 0;
  let xCenter = 0;
  let dxDz = 0;

  if (style === 'bridge_bay') {
    const bridgePeakZ = race.lengthMeters * 0.48;
    yElevation =
      Math.sin(safeZ * (0.0042 + seedShift * 0.0005)) * 4.5 +
      Math.exp(-Math.pow((safeZ - bridgePeakZ) / 420, 2)) * 12.0;
    dyDz =
      Math.cos(safeZ * (0.0042 + seedShift * 0.0005)) * 4.5 * (0.0042 + seedShift * 0.0005) +
      Math.exp(-Math.pow((safeZ - bridgePeakZ) / 420, 2)) *
        12.0 *
        ((-2 * (safeZ - bridgePeakZ)) / (420 * 420));
    xCenter = Math.sin(safeZ * 0.003 + seedShift) * 19 + Math.cos(safeZ * 0.0014) * 8;
    dxDz =
      Math.cos(safeZ * 0.003 + seedShift) * 19 * 0.003 -
      Math.sin(safeZ * 0.0014) * 8 * 0.0014;
  } else if (style === 'jungle_hills') {
    yElevation =
      safeZ * 0.016 + Math.sin(safeZ * 0.0065 + seedShift) * 5.0 + Math.cos(safeZ * 0.014) * 1.4;
    dyDz =
      0.016 +
      Math.cos(safeZ * 0.0065 + seedShift) * 5.0 * 0.0065 -
      Math.sin(safeZ * 0.014) * 1.4 * 0.014;
    xCenter = Math.sin(safeZ * 0.0052 + seedShift) * 28 + Math.sin(safeZ * 0.01) * 9;
    dxDz =
      Math.cos(safeZ * 0.0052 + seedShift) * 28 * 0.0052 +
      Math.cos(safeZ * 0.01) * 9 * 0.01;
  } else if (style === 'shrine_blossom') {
    const archPeakZ = race.lengthMeters * 0.56;
    yElevation =
      Math.sin(safeZ * 0.0055 + seedShift) * 3.8 +
      Math.exp(-Math.pow((safeZ - archPeakZ) / 280, 2)) * 7.5;
    dyDz =
      Math.cos(safeZ * 0.0055 + seedShift) * 3.8 * 0.0055 +
      Math.exp(-Math.pow((safeZ - archPeakZ) / 280, 2)) *
        7.5 *
        ((-2 * (safeZ - archPeakZ)) / (280 * 280));
    xCenter = Math.sin(safeZ * 0.0045 + seedShift) * 23 + Math.cos(safeZ * 0.0085) * 7;
    dxDz =
      Math.cos(safeZ * 0.0045 + seedShift) * 23 * 0.0045 -
      Math.sin(safeZ * 0.0085) * 7 * 0.0085;
  } else if (style === 'alpine_glacier') {
    yElevation =
      48 - safeZ * 0.008 + Math.sin(safeZ * 0.0072 + seedShift) * 6.0;
    dyDz = -0.008 + Math.cos(safeZ * 0.0072 + seedShift) * 6.0 * 0.0072;
    xCenter = Math.sin(safeZ * 0.0058 + seedShift) * 32 + Math.cos(safeZ * 0.011) * 8;
    dxDz =
      Math.cos(safeZ * 0.0058 + seedShift) * 32 * 0.0058 -
      Math.sin(safeZ * 0.011) * 8 * 0.011;
  } else {
    yElevation =
      8 +
      Math.sin(safeZ * 0.0048 + seedShift) * 5.2 +
      Math.sin(safeZ * 0.012) * 1.8;
    dyDz =
      Math.cos(safeZ * 0.0048 + seedShift) * 5.2 * 0.0048 +
      Math.cos(safeZ * 0.012) * 1.8 * 0.012;
    xCenter = Math.sin(safeZ * 0.0062 + seedShift) * 34 + Math.sin(safeZ * 0.0024) * 14;
    dxDz =
      Math.cos(safeZ * 0.0062 + seedShift) * 34 * 0.0062 +
      Math.cos(safeZ * 0.0024) * 14 * 0.0024;
  }

  const pitch = Math.atan(dyDz);
  const bankAngle = Math.max(-0.14, Math.min(0.14, -dxDz * 0.35));

  return {
    xCenter,
    yElevation,
    pitch,
    curvature: dxDz,
    bankAngle,
  };
}

export function createInitialRacers(
  race: RaceTrackDef,
  playerConfig: {
    name: string;
    bikeColor: string;
    secondaryColor: string;
    helmetColor: string;
    visorColor: string;
    jacketColor: string;
  },
): RacerState[] {
  const racers: RacerState[] = [];
  const defaultWeapon = race.defaultWeaponPair[0];

  for (let i = 0; i < TOTAL_RACERS; i++) {
    const isPlayer = i === 0;
    const gridSlot = isPlayer ? 7 : i <= 7 ? i - 1 : i;
    const row = Math.floor(gridSlot / 3);
    const col = gridSlot % 3;
    const laneX = (col - 1) * 4.2 + (row % 2 === 0 ? -0.6 : 0.6);
    const startZ = 34 - row * 7.5;

    if (isPlayer) {
      racers.push({
        id: 'player',
        name: playerConfig.name || 'You',
        isPlayer: true,
        policy: 'sprinter',
        laneBias: 0,
        z: startZ,
        x: laneX,
        yOffset: 0,
        vz: 0,
        vx: 0,
        vy: 0,
        leanAngle: 0,
        suspensionOffset: 0,
        suspensionVel: 0,
        riderTorsoLean: 0,
        riderCrouch: 0,
        riderDetached: false,
        riderEjectPos: { x: 0, y: 0, z: 0 },
        riderEjectVel: { x: 0, y: 0, z: 0 },
        riderSpin: 0,
        hp: 100,
        maxHp: 100,
        fuel: 86,
        maxFuel: 100,
        boostTimer: 0,
        knockdownTimer: 0,
        invulnTimer: 0,
        hitFlashTimer: 0,
        attackState: 'idle',
        attackTimer: 0,
        attackCooldown: 0,
        attackSide: 1,
        attackKind: 'weapon',
        activeWeapon: defaultWeapon === 'brick' ? 'rod' : defaultWeapon,
        hasHitThisSwing: false,
        telegraphing: false,
        bikeColor: playerConfig.bikeColor,
        secondaryColor: playerConfig.secondaryColor,
        helmetColor: playerConfig.helmetColor,
        visorColor: playerConfig.visorColor,
        jacketColor: playerConfig.jacketColor,
        finished: false,
        finishTime: null,
        rank: gridSlot + 1,
        knockouts: 0,
      });
    } else {
      const rival = RIVAL_ROSTER[(i - 1) % RIVAL_ROSTER.length];
      racers.push({
        id: `rival-${i}`,
        name: rival.name,
        isPlayer: false,
        policy: rival.policy,
        laneBias: ((i % 5) - 2) * 2.6,
        z: startZ,
        x: laneX,
        yOffset: 0,
        vz: 0,
        vx: 0,
        vy: 0,
        leanAngle: 0,
        suspensionOffset: 0,
        suspensionVel: 0,
        riderTorsoLean: 0,
        riderCrouch: 0,
        riderDetached: false,
        riderEjectPos: { x: 0, y: 0, z: 0 },
        riderEjectVel: { x: 0, y: 0, z: 0 },
        riderSpin: 0,
        hp: 100,
        maxHp: 100,
        fuel: 100,
        maxFuel: 100,
        boostTimer: 0,
        knockdownTimer: 0,
        invulnTimer: 0,
        hitFlashTimer: 0,
        attackState: 'idle',
        attackTimer: 0,
        attackCooldown: 1.5 + i * 0.25,
        attackSide: i % 2 === 0 ? 1 : -1,
        attackKind: 'weapon',
        activeWeapon: race.availableWeapons[i % race.availableWeapons.length],
        hasHitThisSwing: false,
        telegraphing: false,
        bikeColor: rival.bikeColor,
        secondaryColor: '#18181b',
        helmetColor: rival.helmetColor,
        visorColor: '#0f172a',
        jacketColor: rival.jacketColor,
        finished: false,
        finishTime: null,
        rank: gridSlot + 1,
        knockouts: 0,
      });
    }
  }

  return racers;
}

export function createTrackHazards(race: RaceTrackDef): TrackHazard[] {
  const hazards: TrackHazard[] = [];
  const count = race.hazardCount;
  const usableStart = 200;
  const usableSpan = Math.max(800, race.lengthMeters - 420);

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const z = usableStart + t * usableSpan;
    const hash = Math.sin(i * 12.9898 + race.id * 78.233) * 43758.5453;
    const frac = hash - Math.floor(hash);
    const x = (frac * 2 - 1) * (race.roadHalfWidth - 1.8);
    const kind: TrackHazard['kind'] =
      i % 5 === 0
        ? 'ramp'
        : race.season === 'Winter' && i % 3 === 0
          ? 'snowbank'
          : i % 2 === 0
            ? 'barrel'
            : 'cone';
    hazards.push({
      id: i,
      z,
      x,
      radius: kind === 'ramp' ? 1.5 : 0.9,
      kind,
      hitCooldown: 0,
    });
  }
  return hazards;
}

/**
 * Generates Road Boosters and Petrol Cans along the highway.
 * Petrol cans appear every ~360m across alternating lanes so riders must steer
 * into them to keep fuel above 0% over long laps; Boosters trigger high-speed surges.
 */
export function createTrackPickups(race: RaceTrackDef): TrackPickup[] {
  const pickups: TrackPickup[] = [];
  let nextId = 0;

  // Petrol cans spaced regularly from z = 340m to finish - 280m
  const petrolInterval = 360;
  for (let z = 340; z < race.lengthMeters - 280; z += petrolInterval) {
    const hash = Math.sin(z * 0.037 + race.id * 19.3) * 43758.5453;
    const frac = hash - Math.floor(hash);
    const x = (frac * 2 - 1) * (race.roadHalfWidth - 2.3);
    pickups.push({
      id: nextId++,
      z,
      x,
      kind: 'petrol',
      collected: false,
      respawnTimer: 0,
    });
  }

  // Turbo road boosters spaced every ~430m (offset from petrol cans)
  const boosterInterval = 430;
  for (let z = 240; z < race.lengthMeters - 260; z += boosterInterval) {
    const hash = Math.cos(z * 0.051 + race.id * 31.7) * 43758.5453;
    const frac = hash - Math.floor(hash);
    const x = (frac * 2 - 1) * (race.roadHalfWidth - 2.6);
    pickups.push({
      id: nextId++,
      z,
      x,
      kind: 'booster',
      collected: false,
      respawnTimer: 0,
    });
  }

  return pickups;
}

/**
 * Advances bike, rider, fuel, road boosters, AI, combat, projectiles, and collisions by dt (seconds).
 * Coordinate convention (camera at z - 6.6 looking toward +Z forward):
 * - Screen LEFT  = +X (`steer = -1` -> `+vx`, `attackSide = -1` -> targets `dx > 0`)
 * - Screen RIGHT = -X (`steer = +1` -> `-vx`, `attackSide = +1` -> targets `dx < 0`)
 */
export function stepRacePhysics(
  racers: RacerState[],
  projectiles: BrickProjectile[],
  hazards: TrackHazard[],
  pickups: TrackPickup[],
  race: RaceTrackDef,
  playerInput: PlayerInputState,
  elapsedTime: number,
  rawDt: number,
  raceStarted: boolean,
): PhysicsTickEvents {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  const events: PhysicsTickEvents = {
    hitImpacts: [],
    pickups: [],
    collisions: [],
    playerCrashed: false,
    playerLanded: false,
  };

  if (dt <= 0) return events;

  const baseMaxSpeedMs = race.maxSpeedKmh / 3.6;
  const totalMass = 260;
  const weaponTier = Math.max(1, Math.min(5, playerInput.weaponTier ?? 1));
  const boosterTier = Math.max(1, Math.min(5, playerInput.boosterTier ?? 1));
  const weaponMult = (WEAPON_TIERS[weaponTier - 1] ?? WEAPON_TIERS[0]).multiplier;
  const boosterDef = BOOSTER_TIERS[boosterTier - 1] ?? BOOSTER_TIERS[0];

  for (const h of hazards) {
    if (h.hitCooldown > 0) h.hitCooldown = Math.max(0, h.hitCooldown - dt);
  }
  for (const pk of pickups) {
    if (pk.collected && pk.respawnTimer > 0) {
      pk.respawnTimer = Math.max(0, pk.respawnTimer - dt);
      if (pk.respawnTimer === 0) pk.collected = false;
    }
  }

  let activeAiAttackers = 0;
  for (const r of racers) {
    if (!r.isPlayer && (r.attackState === 'windup' || r.attackState === 'active')) {
      activeAiAttackers++;
    }
  }

  const player = racers.find((r) => r.isPlayer)!;

  for (const r of racers) {
    if (r.hitFlashTimer > 0) r.hitFlashTimer = Math.max(0, r.hitFlashTimer - dt);
    if (r.invulnTimer > 0) r.invulnTimer = Math.max(0, r.invulnTimer - dt);
    if (r.attackCooldown > 0) r.attackCooldown = Math.max(0, r.attackCooldown - dt);
    if (r.boostTimer > 0) r.boostTimer = Math.max(0, r.boostTimer - dt);

    if (r.knockdownTimer > 0) {
      r.knockdownTimer = Math.max(0, r.knockdownTimer - dt);
      r.vz = Math.max(0, r.vz * Math.exp(-3.2 * dt));
      r.vx *= Math.exp(-4.0 * dt);
      r.z += r.vz * dt;
      r.x += r.vx * dt;

      if (r.riderDetached) {
        r.riderEjectVel.y -= GRAVITY * dt;
        r.riderEjectPos.x += r.riderEjectVel.x * dt;
        r.riderEjectPos.y += r.riderEjectVel.y * dt;
        r.riderEjectPos.z += r.riderEjectVel.z * dt;
        r.riderSpin += 9.5 * dt;

        if (r.riderEjectPos.y <= 0) {
          r.riderEjectPos.y = 0;
          r.riderEjectVel.y = Math.abs(r.riderEjectVel.y) * 0.32;
          r.riderEjectVel.x *= 0.65;
          r.riderEjectVel.z *= 0.65;
        }
      }

      if (r.knockdownTimer === 0) {
        r.riderDetached = false;
        r.riderEjectPos = { x: 0, y: 0, z: 0 };
        r.riderEjectVel = { x: 0, y: 0, z: 0 };
        r.riderSpin = 0;
        r.hp = r.maxHp;
        r.invulnTimer = 1.4;
        r.vz = Math.max(r.vz, 16);
      }
      continue;
    }

    if (!raceStarted) {
      r.vz = 0;
      r.vx = 0;
      r.leanAngle *= 0.9;
      continue;
    }

    let throttle = 0;
    let brake = 0;
    let steerCmd = 0; // -1 = Steer Left (+X), +1 = Steer Right (-X)
    let wantsAttack = false;
    let desiredSide: -1 | 1 = r.attackSide;
    let actionKind: CombatActionKind = 'weapon';

    if (r.isPlayer) {
      if (r.finished) {
        throttle = 0.45;
      } else {
        throttle = playerInput.throttle ? 1 : 0;
        brake = playerInput.brake ? 1 : 0;
        steerCmd = Math.max(-1, Math.min(1, playerInput.steer));
        if (playerInput.switchWeapon && playerInput.switchWeapon !== 'brick') {
          r.activeWeapon = playerInput.switchWeapon;
        }
        wantsAttack = playerInput.attackJustPressed;
        if (wantsAttack) {
          actionKind = playerInput.attackAction ?? 'weapon';
          if (playerInput.attackWeapon && playerInput.attackWeapon !== 'brick') {
            r.activeWeapon = playerInput.attackWeapon;
          }
        }

        if (actionKind === 'kick_left') {
          desiredSide = -1; // Left = +X
        } else if (actionKind === 'kick_right') {
          desiredSide = 1; // Right = -X
        } else {
          // Aim side-by-side strike toward nearest rival on Screen Left (+X -> -1) or Screen Right (-X -> +1)
          let bestDistSq = 999;
          for (const other of racers) {
            if (other.id === r.id || other.knockdownTimer > 0) continue;
            const dz = other.z - r.z;
            const dx = other.x - r.x;
            if (Math.abs(dz) < 5.2 && Math.abs(dx) < 5.0) {
              const dSq = dx * dx + dz * dz;
              if (dSq < bestDistSq) {
                bestDistSq = dSq;
                desiredSide = dx >= 0 ? -1 : 1;
              }
            }
          }
        }
      }
    } else if (!r.isRemoteHuman) {
      const rubberBand = Math.max(
        -0.08,
        Math.min(0.1, (player.z - r.z) * 0.0012),
      );
      const targetCruise =
        baseMaxSpeedMs *
        race.rivalSpeedScale *
        (r.policy === 'sprinter' ? 1.03 : r.policy === 'weaver' ? 0.99 : 0.97) *
        (1 + rubberBand);

      throttle = r.vz < targetCruise ? 0.92 : 0.35;
      brake = r.vz > targetCruise * 1.1 ? 0.4 : 0;

      let targetX = r.laneBias;
      const distToPlayerZ = player.z - r.z;

      if (r.policy === 'brawler' && Math.abs(distToPlayerZ) < 28 && !r.finished) {
        const sideOffset = r.x >= player.x ? 1.9 : -1.9;
        targetX = Math.max(
          -race.roadHalfWidth + 1.4,
          Math.min(race.roadHalfWidth - 1.4, player.x + sideOffset),
        );
        if (distToPlayerZ > 1.5) throttle = 1.0;

        if (
          Math.abs(distToPlayerZ) < 3.2 &&
          Math.abs(r.x - player.x) < 3.0 &&
          r.attackCooldown <= 0 &&
          player.knockdownTimer <= 0 &&
          player.invulnTimer <= 0 &&
          activeAiAttackers < 2 &&
          elapsedTime > 4.0
        ) {
          wantsAttack = true;
          // Player is on AI's Screen Left (+X) if player.x >= r.x -> attackSide = -1
          desiredSide = player.x >= r.x ? -1 : 1;
          activeAiAttackers++;
        }
      } else if (r.policy === 'weaver') {
        targetX =
          Math.sin(elapsedTime * 1.15 + r.laneBias) * (race.roadHalfWidth * 0.65);
      } else {
        targetX = r.laneBias * 0.6 + Math.sin(elapsedTime * 0.4) * 2.2;
      }

      for (const h of hazards) {
        if (h.z > r.z && h.z - r.z < 26 && Math.abs(h.x - r.x) < 2.2) {
          targetX = h.x > 0 ? h.x - 3.2 : h.x + 3.2;
        }
      }

      // Note: -dx maps positive dx (+X Screen Left) -> negative steerCmd (-1 Steer Left)
      const dx = targetX - r.x;
      steerCmd = Math.max(-1, Math.min(1, -dx * 0.45));
    }

    const surface = getTrackSurface(race.id, r.z);

    // Slipstream bonus
    let drafting = false;
    for (const other of racers) {
      if (other.id === r.id || other.knockdownTimer > 0) continue;
      const dz = other.z - r.z;
      if (dz > 2.5 && dz < 16 && Math.abs(other.x - r.x) < 1.8) {
        drafting = true;
        break;
      }
    }

    // Player Petrol Consumption & Empty-Tank Limp Cap
    if (r.isPlayer && !r.finished && r.vz > 1) {
      const consumptionRate = 0.021 * (throttle > 0.5 ? 1.12 : 0.55);
      r.fuel = Math.max(0, r.fuel - r.vz * dt * consumptionRate);
    }
    const outOfPetrol = r.isPlayer && r.fuel <= 0;

    // Road Booster speed multiplier
    const boostActive = r.boostTimer > 0;
    const boostSpeedMult = boostActive ? 1.32 + (boosterDef.tier - 1) * 0.11 : 1.0;
    const effectiveMaxSpeed = outOfPetrol
      ? Math.min(9.5, baseMaxSpeedMs * boostSpeedMult)
      : baseMaxSpeedMs * boostSpeedMult;

    const enginePeakForce = r.isPlayer
      ? (outOfPetrol ? 700 : 3600) * (boostActive ? 1.48 * boosterDef.multiplier : 1.0)
      : 3150 * race.rivalSpeedScale;
    const speedRatio = Math.min(1.15, r.vz / effectiveMaxSpeed);
    const torqueFactor = Math.max(0.24, 1 - speedRatio * 0.65);
    const effectiveThrottle = boostActive ? Math.max(throttle, 1.0) : throttle;
    const driveForce = effectiveThrottle * enginePeakForce * torqueFactor * (drafting ? 1.14 : 1.0);
    const brakeForce = brake * 3100;
    const aeroDrag = 0.42 * r.vz * r.vz;
    const rollingDrag = 38 + (r.vz > 0.1 ? 14 : 0);
    const slopeGravityForce = -totalMass * GRAVITY * Math.sin(surface.pitch);

    const netForce =
      driveForce - brakeForce - aeroDrag - rollingDrag + slopeGravityForce;
    const az = netForce / totalMass;
    r.vz = Math.max(0, Math.min(effectiveMaxSpeed * (drafting ? 1.08 : 1.0), r.vz + az * dt));

    // Lateral steering: steerCmd = -1 (Left) moves +X; steerCmd = +1 (Right) moves -X
    const steerAuthority = Math.min(1, 0.35 + r.vz / 28);
    const targetVx = -steerCmd * 11.8 * steerAuthority;
    r.vx += (targetVx - r.vx) * (1 - Math.exp(-8.5 * dt));

    const prevYOffset = r.yOffset;
    r.z += r.vz * dt;
    r.x += r.vx * dt;

    // Road boundary guardrail bounce
    const limitX = race.roadHalfWidth - 0.85;
    if (r.x < -limitX) {
      r.x = -limitX;
      r.vx = Math.abs(r.vx) * 0.45 + 1.5;
      r.vz *= 0.94;
      if (r.isPlayer) events.collisions.push({ x: r.x, y: 0.5, z: r.z, intensity: 0.4 });
    } else if (r.x > limitX) {
      r.x = limitX;
      r.vx = -Math.abs(r.vx) * 0.45 - 1.5;
      r.vz *= 0.94;
      if (r.isPlayer) events.collisions.push({ x: r.x, y: 0.5, z: r.z, intensity: 0.4 });
    }

    // Vertical gravity & suspension
    if (r.yOffset > 0 || r.vy > 0) {
      r.vy -= GRAVITY * dt;
      r.yOffset += r.vy * dt;
      if (r.yOffset <= 0) {
        const impactVy = Math.abs(r.vy);
        r.yOffset = 0;
        r.vy = 0;
        r.suspensionVel -= impactVy * 0.55;
        if (r.isPlayer && prevYOffset > 0.15) events.playerLanded = true;
      }
    }

    const roadRipple = Math.sin(r.z * 0.35) * 0.015 * Math.min(1, r.vz / 30);
    const springForce = -380 * (r.suspensionOffset - roadRipple) - 28 * r.suspensionVel;
    r.suspensionVel += springForce * dt;
    r.suspensionOffset = Math.max(-0.18, Math.min(0.18, r.suspensionOffset + r.suspensionVel * dt));

    // Lean into turn: moving toward +X (Left) requires negative rotation.z
    const targetLean = Math.max(
      -0.65,
      Math.min(0.65, -r.vx * 0.045 - surface.curvature * r.vz * 0.012),
    );
    r.leanAngle += (targetLean - r.leanAngle) * (1 - Math.exp(-10 * dt));
    const targetTorsoLean = targetLean * 1.32;
    r.riderTorsoLean += (targetTorsoLean - r.riderTorsoLean) * (1 - Math.exp(-9 * dt));
    const targetCrouch = boostActive ? 0.52 : throttle > 0.5 ? 0.35 : brake > 0.2 ? -0.2 : 0.05;
    r.riderCrouch += (targetCrouch - r.riderCrouch) * (1 - Math.exp(-8 * dt));

    // Check Road Boosters & Petrol Cans!
    for (const pk of pickups) {
      if (pk.collected) continue;
      if (Math.abs(pk.z - r.z) < 2.25 && Math.abs(pk.x - r.x) < 1.85 && r.yOffset < 1.5) {
        if (pk.kind === 'petrol' && r.isPlayer) {
          pk.collected = true;
          pk.respawnTimer = 4.0;
          r.fuel = Math.min(r.maxFuel, r.fuel + 42);
          events.pickups.push({
            racerId: r.id,
            kind: 'petrol',
            x: pk.x,
            y: 0.9,
            z: pk.z,
          });
        } else if (pk.kind === 'booster') {
          pk.collected = true;
          pk.respawnTimer = 2.0;
          const dur = 2.5 + (boosterDef.tier - 1) * 0.42;
          r.boostTimer = r.isPlayer ? dur : 1.6;
          r.vz = Math.min(
            baseMaxSpeedMs * (1.32 + (boosterDef.tier - 1) * 0.11),
            Math.max(r.vz + 11, baseMaxSpeedMs * 1.15),
          );
          if (r.isPlayer) {
            events.pickups.push({
              racerId: r.id,
              kind: 'booster',
              x: pk.x,
              y: 0.6,
              z: pk.z,
            });
          }
        }
      }
    }

    // Combat state machine
    if (wantsAttack && r.attackState === 'idle' && r.attackCooldown <= 0) {
      r.attackSide = desiredSide;
      r.attackKind = actionKind;
      r.hasHitThisSwing = false;
      const isBrickThrow =
        actionKind === 'brick' || (actionKind === 'weapon' && r.activeWeapon === 'brick');

      if (isBrickThrow) {
        r.attackKind = 'brick';
        r.attackState = 'active';
        r.attackTimer = 0.2;
        r.attackCooldown = WEAPONS.brick.cooldown;
        let aimVx = r.vx * 0.4 - steerCmd * 3.0;
        let nearestAheadDist = 999;
        for (const other of racers) {
          if (other.id === r.id || other.knockdownTimer > 0) continue;
          const dz = other.z - r.z;
          const dx = other.x - r.x;
          if (dz > 2 && dz < 32 && Math.abs(dx) < 6) {
            if (dz < nearestAheadDist) {
              nearestAheadDist = dz;
              const flightTime = dz / 28;
              aimVx = dx / Math.max(0.25, flightTime);
            }
          }
        }
        projectiles.push({
          id: Math.floor(Math.random() * 1e9),
          ownerId: r.id,
          x: r.x - r.attackSide * 0.4,
          y: 1.25 + r.yOffset,
          z: r.z + 1.1,
          vx: Math.max(-10, Math.min(10, aimVx)),
          vy: 4.8,
          vz: r.vz + 28,
          rotX: 0,
          rotY: 0,
          active: true,
          age: 0,
        });
        if (r.isPlayer) events.playerAttacked = 'brick';
      } else if (actionKind === 'kick_left' || actionKind === 'kick_right') {
        r.attackState = 'windup';
        r.attackTimer = 0.06;
        r.telegraphing = false;
        if (r.isPlayer) events.playerAttacked = actionKind;
      } else {
        r.attackState = 'windup';
        r.attackTimer = r.isPlayer ? 0.07 : 0.42 * (1.15 - race.rivalAggression * 0.3);
        r.telegraphing = !r.isPlayer;
        if (r.isPlayer) events.playerAttacked = r.activeWeapon;
      }
    }

    if (r.attackState !== 'idle') {
      r.attackTimer -= dt;
      if (r.attackState === 'windup' && r.attackTimer <= 0) {
        r.attackState = 'active';
        r.attackTimer =
          r.attackKind === 'kick_left' || r.attackKind === 'kick_right'
            ? 0.2
            : r.activeWeapon === 'chain' || r.activeWeapon === 'ball'
              ? 0.24
              : 0.19;
        r.telegraphing = false;
      } else if (r.attackState === 'active') {
        if (!r.hasHitThisSwing && r.attackKind !== 'brick') {
          const isKick = r.attackKind === 'kick_left' || r.attackKind === 'kick_right';
          const weapon = WEAPONS[r.activeWeapon];
          const rangeLat = isKick ? 2.7 : weapon.rangeLateral;
          const rangeFwd = isKick ? 3.2 : weapon.rangeForward;
          const tierBoost = r.isPlayer ? weaponMult : 1.0;
          const baseDmg = (isKick ? 28 : weapon.damage) * tierBoost;
          const baseKb = (isKick ? 13.5 : weapon.knockback) * (0.9 + tierBoost * 0.1);

          // World X sign matching semantic attackSide (-1 Left -> +X, +1 Right -> -X)
          const worldSide = -r.attackSide;
          let bestTarget: RacerState | null = null;
          let bestDist = 999;

          for (const target of racers) {
            if (target.id === r.id || target.knockdownTimer > 0 || target.invulnTimer > 0) continue;
            const dz = target.z - r.z;
            const dx = target.x - r.x;
            const onCorrectSide = isKick
              ? dx * worldSide >= -0.35 && Math.abs(dx) <= rangeLat
              : dx * worldSide >= -0.55 && Math.abs(dx) <= rangeLat;

            if (onCorrectSide && Math.abs(dz) <= rangeFwd) {
              const d = Math.hypot(dx, dz);
              if (d < bestDist) {
                bestDist = d;
                bestTarget = target;
              }
            }
          }

          if (bestTarget) {
            r.hasHitThisSwing = true;
            const dmg = r.isPlayer
              ? baseDmg
              : baseDmg * (0.45 + race.rivalAggression * 0.45);
            bestTarget.hp = Math.max(0, bestTarget.hp - dmg);
            bestTarget.hitFlashTimer = 0.09;
            bestTarget.vx += worldSide * baseKb;
            bestTarget.vz *= 0.84;

            const ko = bestTarget.hp <= 0;
            if (ko) {
              triggerKnockdown(bestTarget, worldSide);
              r.knockouts += 1;
              if (bestTarget.isPlayer) events.playerCrashed = true;
            }
            events.hitImpacts.push({
              attackerId: r.id,
              targetId: bestTarget.id,
              weapon: isKick ? (r.attackKind as 'kick_left' | 'kick_right') : r.activeWeapon,
              x: (r.x + bestTarget.x) * 0.5,
              y: 1.1,
              z: (r.z + bestTarget.z) * 0.5,
              knockout: ko,
            });
          }
        }
        if (r.attackTimer <= 0) {
          r.attackState = 'recovery';
          r.attackTimer = 0.17;
          r.attackCooldown =
            r.attackKind === 'kick_left' || r.attackKind === 'kick_right'
              ? 0.36
              : WEAPONS[r.activeWeapon].cooldown;
        }
      } else if (r.attackState === 'recovery' && r.attackTimer <= 0) {
        r.attackState = 'idle';
      }
    }

    // Track hazards & ramps
    for (const h of hazards) {
      if (h.hitCooldown > 0) continue;
      if (Math.abs(h.z - r.z) < 1.5 && Math.abs(h.x - r.x) < h.radius + 0.65 && r.yOffset < 1.1) {
        h.hitCooldown = 2.0;
        if (h.kind === 'ramp') {
          r.vy = Math.max(r.vy, Math.min(8.5, r.vz * 0.16));
          r.yOffset = Math.max(r.yOffset, 0.1);
        } else {
          r.vz *= 0.62;
          r.hp = Math.max(0, r.hp - 22);
          r.hitFlashTimer = 0.08;
          events.collisions.push({ x: r.x, y: 0.7, z: r.z, intensity: 0.85 });
          if (r.hp <= 0 && r.invulnTimer <= 0) {
            triggerKnockdown(r, r.x >= h.x ? 1 : -1);
            if (r.isPlayer) events.playerCrashed = true;
          }
        }
      }
    }

    if (!r.finished && r.z >= race.lengthMeters) {
      r.finished = true;
      r.finishTime = elapsedTime;
    }
  }

  // Bike-to-bike momentum collision resolution
  for (let i = 0; i < racers.length; i++) {
    const a = racers[i];
    if (a.knockdownTimer > 0) continue;
    for (let j = i + 1; j < racers.length; j++) {
      const b = racers[j];
      if (b.knockdownTimer > 0) continue;
      const dz = b.z - a.z;
      const dx = b.x - a.x;
      if (Math.abs(dz) < 2.25 && Math.abs(dx) < 1.1 && Math.abs(a.yOffset - b.yOffset) < 1.2) {
        const overlapX = 1.1 - Math.abs(dx);
        const signX = dx >= 0 ? 1 : -1;
        a.x -= signX * overlapX * 0.5;
        b.x += signX * overlapX * 0.5;

        const relVx = b.vx - a.vx;
        const impulse = relVx * 0.65;
        a.vx += impulse - signX * 2.4;
        b.vx -= impulse - signX * 2.4;

        const avgVz = (a.vz + b.vz) * 0.5;
        a.vz = a.vz * 0.85 + avgVz * 0.15;
        b.vz = b.vz * 0.85 + avgVz * 0.15;

        if (a.isPlayer || b.isPlayer) {
          events.collisions.push({
            x: (a.x + b.x) * 0.5,
            y: 0.7,
            z: (a.z + b.z) * 0.5,
            intensity: 0.5,
          });
        }
      }
    }
  }

  // Thrown Brick projectiles
  for (const p of projectiles) {
    if (!p.active) continue;
    p.age += dt;
    p.vy -= PROJECTILE_GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.rotX += 11 * dt;
    p.rotY += 8 * dt;

    if (p.y <= 0.15 || p.age > 2.2) {
      p.active = false;
      continue;
    }

    for (const target of racers) {
      if (target.id === p.ownerId || target.knockdownTimer > 0 || target.invulnTimer > 0) continue;
      if (
        Math.abs(target.z - p.z) < 1.8 &&
        Math.abs(target.x - p.x) < 1.15 &&
        p.y < 2.1 + target.yOffset
      ) {
        p.active = false;
        const attacker = racers.find((r) => r.id === p.ownerId);
        const dmg = attacker?.isPlayer ? WEAPONS.brick.damage * weaponMult : 26;
        target.hp = Math.max(0, target.hp - dmg);
        target.hitFlashTimer = 0.1;
        target.vz *= 0.68;
        target.vx += (p.vx >= 0 ? 1 : -1) * 5.5;
        const ko = target.hp <= 0;
        if (ko) {
          triggerKnockdown(target, target.x >= p.x ? 1 : -1);
          if (attacker) attacker.knockouts += 1;
          if (target.isPlayer) events.playerCrashed = true;
        }
        events.hitImpacts.push({
          attackerId: p.ownerId,
          targetId: target.id,
          weapon: 'brick',
          x: p.x,
          y: p.y,
          z: p.z,
          knockout: ko,
        });
        break;
      }
    }
  }

  const sorted = [...racers].sort((a, b) => {
    if (a.finished && b.finished) {
      return (a.finishTime ?? 9999) - (b.finishTime ?? 9999);
    }
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.z - a.z;
  });
  sorted.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  return events;
}

function triggerKnockdown(r: RacerState, pushDir: number): void {
  r.knockdownTimer = 1.65;
  r.riderDetached = true;
  r.riderEjectPos = { x: 0, y: 1.1, z: 0 };
  r.riderEjectVel = {
    x: pushDir * 5.2,
    y: 6.4,
    z: Math.max(4, r.vz * 0.28),
  };
  r.riderSpin = 0;
  r.attackState = 'idle';
  r.telegraphing = false;
}

export function getRace(raceId: number): RaceTrackDef {
  return RACES[Math.max(0, Math.min(RACES.length - 1, raceId))];
}
