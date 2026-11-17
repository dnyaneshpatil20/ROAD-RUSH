export type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type DifficultyLabel =
  | 'Easy'
  | 'Moderate'
  | 'Challenging'
  | 'Hard'
  | 'Very Hard';

export type SeasonType = 'Autumn' | 'Summer' | 'Spring' | 'Winter' | 'Monsoon';

export type BiomeStyle =
  | 'bridge_bay'
  | 'jungle_hills'
  | 'shrine_blossom'
  | 'alpine_glacier'
  | 'neon_expressway';

export type WeaponId = 'rod' | 'chain' | 'ball' | 'brick';

export type CombatActionKind = 'weapon' | 'brick' | 'kick_left' | 'kick_right';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  role: string;
  damage: number;
  rangeLateral: number;
  rangeForward: number;
  cooldown: number;
  knockback: number;
}

export interface UpgradeTierDef {
  tier: number;
  name: string;
  bonusText: string;
  multiplier: number;
  price: number;
  autoUnlockRace: number;
}

export interface RaceTrackDef {
  id: number; // 0..21 (22 Races)
  raceNumber: number;
  city: string;
  landmark: string;
  season: SeasonType;
  biomeStyle: BiomeStyle;
  seasonHeadline: string;
  difficulty: DifficultyLabel;
  lengthMeters: number;
  roadHalfWidth: number;
  maxSpeedKmh: number;
  rivalSpeedScale: number;
  rivalAggression: number;
  hazardCount: number;
  skyColor: string;
  fogColor: string;
  fogDensity: number;
  sunColor: string;
  sunIntensity: number;
  hemiSkyColor: string;
  hemiGroundColor: string;
  roadColor: string;
  accentColor: string;
  availableWeapons: [WeaponId, WeaponId, WeaponId];
  defaultWeaponPair: [WeaponId, WeaponId];
}

export interface BikeSkinDef {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  trimColor: string;
  metalness: number;
  roughness: number;
  price: number;
}

export interface RiderAccessoryDef {
  id: string;
  name: string;
  helmetColor: string;
  visorColor: string;
  jacketColor: string;
  accentTrim: string;
  price: number;
}

export type RivalPolicy = 'brawler' | 'weaver' | 'sprinter';

export interface RacerState {
  id: string;
  name: string;
  isPlayer: boolean;
  isRemoteHuman?: boolean;
  policy: RivalPolicy;
  laneBias: number;
  /** Progress along track in meters (0 .. lengthMeters) */
  z: number;
  /** Lateral offset from track centerline (+X = Screen Left, -X = Screen Right) */
  x: number;
  /** Vertical world height relative to road surface (for jumps/airtime) */
  yOffset: number;
  /** Forward speed in m/s */
  vz: number;
  /** Lateral speed in m/s */
  vx: number;
  /** Vertical speed in m/s */
  vy: number;
  /** Bike roll/lean angle in radians */
  leanAngle: number;
  /** Suspension compression in meters */
  suspensionOffset: number;
  suspensionVel: number;
  /** Rider posture & physics */
  riderTorsoLean: number;
  riderCrouch: number;
  riderDetached: boolean;
  riderEjectPos: { x: number; y: number; z: number };
  riderEjectVel: { x: number; y: number; z: number };
  riderSpin: number;
  /** Stability / Health (0..100) */
  hp: number;
  maxHp: number;
  /** Petrol / Fuel (0..100) */
  fuel: number;
  maxFuel: number;
  /** Active Road Booster turbo timer in seconds */
  boostTimer: number;
  /** Respawn / knockdown timer in seconds */
  knockdownTimer: number;
  invulnTimer: number;
  hitFlashTimer: number;
  /** Combat animation state */
  attackState: 'idle' | 'windup' | 'active' | 'recovery';
  attackTimer: number;
  attackCooldown: number;
  /** Semantic side: -1 = Screen Left (+X), +1 = Screen Right (-X) */
  attackSide: -1 | 1;
  attackKind: CombatActionKind;
  activeWeapon: WeaponId;
  hasHitThisSwing: boolean;
  /** Telegraph warning flag when AI is winding up */
  telegraphing: boolean;
  /** Cosmetics */
  bikeColor: string;
  secondaryColor: string;
  helmetColor: string;
  visorColor: string;
  jacketColor: string;
  /** Finish tracking */
  finished: boolean;
  finishTime: number | null;
  rank: number;
  knockouts: number;
}

export interface BrickProjectile {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  active: boolean;
  age: number;
}

export interface TrackHazard {
  id: number;
  z: number;
  x: number;
  radius: number;
  kind: 'cone' | 'barrel' | 'crate' | 'snowbank' | 'ramp';
  hitCooldown: number;
}

export interface TrackPickup {
  id: number;
  z: number;
  x: number;
  kind: 'booster' | 'petrol';
  collected: boolean;
  respawnTimer: number;
}

export interface TrackSurfaceSample {
  xCenter: number;
  yElevation: number;
  pitch: number; // radians, positive = uphill
  curvature: number; // lateral bend rate
  bankAngle: number;
}

export interface PlayerProfile {
  playerId: string;
  syncCode: string;
  name: string;
  coins: number;
  highestUnlockedRace: number; // 0..21
  weaponTier: number; // 1..5
  boosterTier: number; // 1..5
  equippedSkinId: string;
  equippedAccessoryId: string;
  ownedSkins: string[];
  ownedAccessories: string[];
  totalWins: number;
  totalKnockouts: number;
  bestTimes: Record<number, number>;
  tournamentPoints: number;
  completedChallenges: string[];
  challengeProgress: Record<string, number>;
}

export interface LeaderboardEntry {
  id: string;
  playerId: string;
  playerName: string;
  raceId: number;
  city: string;
  timeSeconds: number;
  knockouts: number;
  rank: number;
  platform: string;
  createdAt: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  raceId: number | null;
  target: number;
  rewardCoins: number;
  metric:
    | 'knockouts'
    | 'brick_hits'
    | 'wins'
    | 'top_speed_kmh'
    | 'finish_races'
    | 'fuel_pickups'
    | 'boost_hits';
}

export interface TournamentStanding {
  playerId: string;
  playerName: string;
  points: number;
  wins: number;
  bestLapSum: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Apex';
}

export interface MultiplayerRoomInfo {
  roomId: string;
  name: string;
  raceId: number;
  players: { id: string; name: string; skinId: string; ready: boolean }[];
  status: 'waiting' | 'racing';
}

export interface HudTelemetry {
  speedKmh: number;
  rank: number;
  totalRacers: number;
  progressPct: number;
  elapsedTime: number;
  hp: number;
  maxHp: number;
  fuel: number;
  maxFuel: number;
  boostActive: boolean;
  boostTimer: number;
  weaponTier: number;
  boosterTier: number;
  activeWeapon: WeaponId;
  meleeWeapon: Exclude<WeaponId, 'brick'>;
  weaponCooldownPct: number;
  brickCooldownPct: number;
  knockouts: number;
  fuelCollected: number;
  boostersHit: number;
  calloutText: string;
  countdownText: string;
  gyroEnabled: boolean;
  gyroSupported: boolean;
  gyroTiltDeg: number;
  minimapRacers: { xNorm: number; zNorm: number; isPlayer: boolean }[];
  nearbyWarning: 'left' | 'right' | null;
}

export interface RaceResultSnapshot {
  raceId: number;
  city: string;
  season: SeasonType;
  difficulty: DifficultyLabel;
  won: boolean;
  rank: number;
  totalRacers: number;
  timeSeconds: number;
  knockouts: number;
  fuelCollected: number;
  boostersHit: number;
  brickHits: number;
  coinsEarned: number;
  stageBonusCoins: number;
  unlockedNextRace: boolean;
  upgradedWeaponTier?: number;
  upgradedBoosterTier?: number;
  topSpeedKmh: number;
  standings: { rank: number; name: string; isPlayer: boolean; timeSeconds: number | null; hp: number }[];
}
