import assert from 'node:assert/strict';
import test from 'node:test';
import { RACES } from './catalog';
import {
  createInitialRacers,
  createTrackPickups,
  getTrackSurface,
  stepRacePhysics,
  TOTAL_RACERS,
} from './physics';
import type { BrickProjectile, TrackHazard, TrackPickup } from './types';

const DEFAULT_COSMETICS = {
  name: 'TestRider',
  bikeColor: '#dc2626',
  secondaryColor: '#18181b',
  helmetColor: '#f4f4f5',
  visorColor: '#0f172a',
  jacketColor: '#27272a',
};

test('catalog contains >20 races with longer endurance-sprint laps (>= 4800m)', () => {
  assert.ok(RACES.length > 20, `Expected >20 races, got ${RACES.length}`);
  for (const r of RACES) {
    assert.ok(r.lengthMeters >= 4800, `Race ${r.city} lap too short: ${r.lengthMeters}m`);
  }
  assert.equal(RACES[0].difficulty, 'Easy');
  assert.equal(RACES[RACES.length - 1].difficulty, 'Very Hard');
});

test('createInitialRacers spawns exactly 11 racers with fuel and 1 player', () => {
  const racers = createInitialRacers(RACES[0], DEFAULT_COSMETICS);
  assert.equal(racers.length, TOTAL_RACERS);
  assert.equal(racers.filter((r) => r.isPlayer).length, 1);
  assert.ok(racers[0].fuel > 50 && racers[0].fuel <= 100);
});

test('corrected steering: steer left (-1) moves to screen left (+X) and steer right (+1) moves to screen right (-X)', () => {
  const racers = createInitialRacers(RACES[0], DEFAULT_COSMETICS);
  const projectiles: BrickProjectile[] = [];
  const hazards: TrackHazard[] = [];
  const pickups: TrackPickup[] = [];
  const startX = racers[0].x;

  // Steer Left (-1) -> moves toward +X (screen left)
  for (let i = 0; i < 40; i++) {
    stepRacePhysics(
      racers,
      projectiles,
      hazards,
      pickups,
      RACES[0],
      { throttle: true, brake: false, steer: -1, attackJustPressed: false },
      i * 0.02,
      0.02,
      true,
    );
  }
  const afterLeftX = racers[0].x;
  assert.ok(afterLeftX > startX + 0.5, `Expected steering left (-1) to move +X, got ${afterLeftX} vs ${startX}`);

  // Steer Right (+1) -> moves toward -X (screen right)
  for (let i = 0; i < 65; i++) {
    stepRacePhysics(
      racers,
      projectiles,
      hazards,
      pickups,
      RACES[0],
      { throttle: true, brake: false, steer: 1, attackJustPressed: false },
      1 + i * 0.02,
      0.02,
      true,
    );
  }
  assert.ok(racers[0].x < afterLeftX - 1.0, `Expected steering right (+1) to move -X`);
});

test('left leg kick (A) hits rival on screen left (+X) and right leg kick (D) hits rival on screen right (-X)', () => {
  const racers = createInitialRacers(RACES[0], DEFAULT_COSMETICS);
  const player = racers[0];
  const leftRival = racers[1];
  const rightRival = racers[2];
  const projectiles: BrickProjectile[] = [];
  const hazards: TrackHazard[] = [];
  const pickups: TrackPickup[] = [];

  player.x = 0;
  player.z = 50;
  player.vz = 30;
  // Screen Left = +X
  leftRival.x = 1.6;
  leftRival.z = 50.2;
  leftRival.vz = 30;
  // Screen Right = -X
  rightRival.x = -1.6;
  rightRival.z = 50.2;
  rightRival.vz = 30;

  let hitLeft = false;
  for (let i = 0; i < 16; i++) {
    const ev = stepRacePhysics(
      racers,
      projectiles,
      hazards,
      pickups,
      RACES[0],
      { throttle: true, brake: false, steer: 0, attackJustPressed: i === 0, attackAction: 'kick_left' },
      5 + i * 0.02,
      0.02,
      true,
    );
    if (ev.hitImpacts.some((h) => h.targetId === leftRival.id && h.weapon === 'kick_left')) {
      hitLeft = true;
    }
  }
  assert.ok(hitLeft, 'Left leg kick (A) must hit rival on screen left (+X)');
  assert.equal(rightRival.hp, 100, 'Left kick must NOT hit rival on right side');

  for (let i = 0; i < 30; i++) {
    stepRacePhysics(
      racers,
      projectiles,
      hazards,
      pickups,
      RACES[0],
      { throttle: true, brake: false, steer: 0, attackJustPressed: false },
      6 + i * 0.02,
      0.02,
      true,
    );
  }
  player.x = 0;
  rightRival.x = -1.5;
  rightRival.z = player.z;
  rightRival.vz = player.vz;

  let hitRight = false;
  for (let i = 0; i < 16; i++) {
    const ev = stepRacePhysics(
      racers,
      projectiles,
      hazards,
      pickups,
      RACES[0],
      { throttle: true, brake: false, steer: 0, attackJustPressed: i === 0, attackAction: 'kick_right' },
      7 + i * 0.02,
      0.02,
      true,
    );
    if (ev.hitImpacts.some((h) => h.targetId === rightRival.id && h.weapon === 'kick_right')) {
      hitRight = true;
    }
  }
  assert.ok(hitRight, 'Right leg kick (D) must hit rival on screen right (-X)');
});

test('petrol can pickup refills fuel, out-of-petrol limits speed, and road booster triggers high-speed surge', () => {
  const racers = createInitialRacers(RACES[0], DEFAULT_COSMETICS);
  const player = racers[0];
  const pickups = createTrackPickups(RACES[0]);
  assert.ok(pickups.some((p) => p.kind === 'petrol'), 'Track should have petrol cans');
  assert.ok(pickups.some((p) => p.kind === 'booster'), 'Track should have road boosters');

  const customPickups: TrackPickup[] = [
    { id: 1001, z: 60, x: 0, kind: 'petrol', collected: false, respawnTimer: 0 },
    { id: 1002, z: 75, x: 0, kind: 'booster', collected: false, respawnTimer: 0 },
  ];

  // Put player low on petrol right in front of Petrol Can
  player.x = 0;
  player.z = 58.5;
  player.vz = 28;
  player.fuel = 20;

  let gotPetrol = false;
  let gotBooster = false;
  for (let i = 0; i < 40; i++) {
    const ev = stepRacePhysics(
      racers,
      [],
      [],
      customPickups,
      RACES[0],
      { throttle: true, brake: false, steer: 0, attackJustPressed: false, boosterTier: 3 },
      2 + i * 0.03,
      0.03,
      true,
    );
    if (ev.pickups.some((p) => p.kind === 'petrol')) gotPetrol = true;
    if (ev.pickups.some((p) => p.kind === 'booster')) gotBooster = true;
  }

  assert.ok(gotPetrol, 'Player should collect petrol can on road');
  assert.ok(player.fuel > 45, `Fuel should be refilled above 45%, got ${player.fuel}`);
  assert.ok(gotBooster, 'Player should trigger road booster');
  assert.ok(player.boostTimer > 0, 'Booster timer should be active');
  assert.ok(
    player.vz * 3.6 > RACES[0].maxSpeedKmh,
    `Booster should push speed above base max (${RACES[0].maxSpeedKmh} km/h), got ${(player.vz * 3.6).toFixed(1)}`,
  );
});

test('direct brick throw and Iron Ball left/right targeting + surface continuity across all 22 races', () => {
  for (const r of RACES) {
    const a = getTrackSurface(r.id, 1500);
    const b = getTrackSurface(r.id, 1501);
    assert.ok(Math.abs(a.yElevation - b.yElevation) < 1.5, `Race ${r.id} track discontinuous`);
  }

  const racers = createInitialRacers(RACES[3], DEFAULT_COSMETICS);
  const player = racers[0];
  const rival = racers[1];
  player.x = 0;
  player.z = 100;
  player.vz = 30;
  rival.x = 1.8; // Screen Left (+X)
  rival.z = 100.5;
  rival.vz = 30;
  rival.hp = 40;

  let koEvent = false;
  for (let i = 0; i < 16; i++) {
    const ev = stepRacePhysics(
      racers,
      [],
      [],
      [],
      RACES[3],
      {
        throttle: true,
        brake: false,
        steer: 0,
        attackJustPressed: i === 0,
        attackAction: 'weapon',
        attackWeapon: 'ball',
        weaponTier: 2,
      },
      6 + i * 0.02,
      0.02,
      true,
    );
    if (ev.hitImpacts.some((h) => h.targetId === rival.id && h.knockout && h.weapon === 'ball')) {
      koEvent = true;
    }
  }
  assert.ok(koEvent, 'Iron Ball should target nearest opponent on left side and KO');
  assert.equal(rival.riderDetached, true);
});
