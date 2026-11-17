import type {
  BikeSkinDef,
  BiomeStyle,
  DailyChallenge,
  DifficultyLabel,
  RaceTrackDef,
  RiderAccessoryDef,
  RivalPolicy,
  SeasonType,
  UpgradeTierDef,
  WeaponDef,
  WeaponId,
} from './types.ts';

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  rod: {
    id: 'rod',
    name: 'Steel Rod',
    role: 'Fast Side Strike',
    damage: 34,
    rangeLateral: 2.8,
    rangeForward: 3.4,
    cooldown: 0.45,
    knockback: 12.0,
  },
  chain: {
    id: 'chain',
    name: 'Heavy Chain',
    role: 'Wide Lash Sweep',
    damage: 42,
    rangeLateral: 3.7,
    rangeForward: 4.0,
    cooldown: 0.6,
    knockback: 15.5,
  },
  ball: {
    id: 'ball',
    name: 'Iron Ball',
    role: 'Crushing Mace Swing',
    damage: 52,
    rangeLateral: 3.3,
    rangeForward: 3.7,
    cooldown: 0.68,
    knockback: 18.0,
  },
  brick: {
    id: 'brick',
    name: 'Road Brick',
    role: 'Throw Ahead',
    damage: 48,
    rangeLateral: 1.7,
    rangeForward: 38,
    cooldown: 0.65,
    knockback: 13.5,
  },
};

export const MELEE_WEAPONS: Exclude<WeaponId, 'brick'>[] = ['rod', 'chain', 'ball'];

export const WEAPON_TIERS: UpgradeTierDef[] = [
  {
    tier: 1,
    name: 'Mk.I Street Arsenal',
    bonusText: 'Base Combat Damage & Knockback',
    multiplier: 1.0,
    price: 0,
    autoUnlockRace: 0,
  },
  {
    tier: 2,
    name: 'Mk.II Tempered Steel',
    bonusText: '+18% Strike Damage & Knockback',
    multiplier: 1.18,
    price: 350,
    autoUnlockRace: 2,
  },
  {
    tier: 3,
    name: 'Mk.III Forged Combat Kit',
    bonusText: '+35% Strike Damage & Knockback',
    multiplier: 1.35,
    price: 700,
    autoUnlockRace: 5,
  },
  {
    tier: 4,
    name: 'Mk.IV Titanium Enforcer',
    bonusText: '+52% Strike Damage & Knockback',
    multiplier: 1.52,
    price: 1200,
    autoUnlockRace: 10,
  },
  {
    tier: 5,
    name: 'Mk.V Apex Sovereign Arms',
    bonusText: '+70% Strike Damage & Knockback',
    multiplier: 1.7,
    price: 1800,
    autoUnlockRace: 15,
  },
];

export const BOOSTER_TIERS: UpgradeTierDef[] = [
  {
    tier: 1,
    name: 'Standard Nitro Strip',
    bonusText: '+32% Turbo Speed (2.5s)',
    multiplier: 1.0,
    price: 0,
    autoUnlockRace: 0,
  },
  {
    tier: 2,
    name: 'Twin-Jet Fuel Charger',
    bonusText: '+42% Turbo Speed (2.9s)',
    multiplier: 1.15,
    price: 320,
    autoUnlockRace: 2,
  },
  {
    tier: 3,
    name: 'Hyper Nitro Injector',
    bonusText: '+52% Turbo Speed (3.3s)',
    multiplier: 1.3,
    price: 680,
    autoUnlockRace: 6,
  },
  {
    tier: 4,
    name: 'Apex Surge Overdrive',
    bonusText: '+64% Turbo Speed (3.7s)',
    multiplier: 1.45,
    price: 1150,
    autoUnlockRace: 11,
  },
  {
    tier: 5,
    name: 'Warp Core Afterburner',
    bonusText: '+76% Turbo Speed (4.2s)',
    multiplier: 1.62,
    price: 1750,
    autoUnlockRace: 16,
  },
];

interface CityBlueprint {
  city: string;
  landmark: string;
  season: SeasonType;
  biomeStyle: BiomeStyle;
  difficulty: DifficultyLabel;
  availableWeapons: [WeaponId, WeaponId, WeaponId];
  defaultWeaponPair: [WeaponId, WeaponId];
}

const SEASON_THEMES: Record<
  SeasonType,
  {
    seasonHeadline: string;
    skyColor: string;
    fogColor: string;
    fogDensity: number;
    sunColor: string;
    sunIntensity: number;
    hemiSkyColor: string;
    hemiGroundColor: string;
    roadColor: string;
    accentColor: string;
  }
> = {
  Autumn: {
    seasonHeadline: 'Crisp Golden Autumn',
    skyColor: '#e8a87c',
    fogColor: '#d9a482',
    fogDensity: 0.0017,
    sunColor: '#ffe0b2',
    sunIntensity: 2.25,
    hemiSkyColor: '#7eb6e6',
    hemiGroundColor: '#5c4938',
    roadColor: '#36383e',
    accentColor: '#e05a36',
  },
  Summer: {
    seasonHeadline: 'Sunlit Summer Jungle',
    skyColor: '#72b8d8',
    fogColor: '#90c7b8',
    fogDensity: 0.0020,
    sunColor: '#fff5d6',
    sunIntensity: 2.45,
    hemiSkyColor: '#87d4f5',
    hemiGroundColor: '#244726',
    roadColor: '#3d3c39',
    accentColor: '#22c55e',
  },
  Spring: {
    seasonHeadline: 'Spring Cherry Blossom',
    skyColor: '#f3d5de',
    fogColor: '#eed3dc',
    fogDensity: 0.0019,
    sunColor: '#fff0e6',
    sunIntensity: 2.15,
    hemiSkyColor: '#c9d9f8',
    hemiGroundColor: '#594842',
    roadColor: '#34363c',
    accentColor: '#f472b6',
  },
  Winter: {
    seasonHeadline: 'Winter Alpine Snowfall',
    skyColor: '#a6c4db',
    fogColor: '#c8dce8',
    fogDensity: 0.0024,
    sunColor: '#e8f4ff',
    sunIntensity: 2.05,
    hemiSkyColor: '#bcd9f2',
    hemiGroundColor: '#6b7a8c',
    roadColor: '#2c333d',
    accentColor: '#38bdf8',
  },
  Monsoon: {
    seasonHeadline: 'Midnight Monsoon Storm',
    skyColor: '#0c1324',
    fogColor: '#131b30',
    fogDensity: 0.0026,
    sunColor: '#8ab4f8',
    sunIntensity: 1.55,
    hemiSkyColor: '#2b3e6b',
    hemiGroundColor: '#181822',
    roadColor: '#1e222b',
    accentColor: '#f59e0b',
  },
};

const CITY_BLUEPRINTS: CityBlueprint[] = [
  { city: 'San Francisco', landmark: 'Golden Gate Bayfront', season: 'Autumn', biomeStyle: 'bridge_bay', difficulty: 'Easy', availableWeapons: ['rod', 'chain', 'ball'], defaultWeaponPair: ['rod', 'brick'] },
  { city: 'Munnar Hills', landmark: 'January Jungle & Tea Pass', season: 'Summer', biomeStyle: 'jungle_hills', difficulty: 'Moderate', availableWeapons: ['chain', 'ball', 'rod'], defaultWeaponPair: ['chain', 'brick'] },
  { city: 'Kyoto', landmark: 'Sakura Shrine & Arashiyama', season: 'Spring', biomeStyle: 'shrine_blossom', difficulty: 'Challenging', availableWeapons: ['rod', 'ball', 'chain'], defaultWeaponPair: ['rod', 'chain'] },
  { city: 'Zermatt', landmark: 'Alpine Glacier Ridge', season: 'Winter', biomeStyle: 'alpine_glacier', difficulty: 'Hard', availableWeapons: ['ball', 'chain', 'rod'], defaultWeaponPair: ['ball', 'brick'] },
  { city: 'Tokyo Shinjuku', landmark: 'Midnight Bayshore Expressway', season: 'Monsoon', biomeStyle: 'neon_expressway', difficulty: 'Very Hard', availableWeapons: ['chain', 'ball', 'rod'], defaultWeaponPair: ['chain', 'brick'] },
  { city: 'Paris', landmark: 'Seine Autumn Boulevard', season: 'Autumn', biomeStyle: 'bridge_bay', difficulty: 'Moderate', availableWeapons: ['rod', 'chain', 'ball'], defaultWeaponPair: ['rod', 'brick'] },
  { city: 'Rio de Janeiro', landmark: 'Tijuca Tropical Coast', season: 'Summer', biomeStyle: 'jungle_hills', difficulty: 'Moderate', availableWeapons: ['chain', 'ball', 'rod'], defaultWeaponPair: ['chain', 'brick'] },
  { city: 'Amsterdam', landmark: 'Blossom Canal Ring', season: 'Spring', biomeStyle: 'shrine_blossom', difficulty: 'Challenging', availableWeapons: ['ball', 'rod', 'chain'], defaultWeaponPair: ['ball', 'brick'] },
  { city: 'Reykjavik', landmark: 'Fjord Glacier Highway', season: 'Winter', biomeStyle: 'alpine_glacier', difficulty: 'Hard', availableWeapons: ['chain', 'ball', 'rod'], defaultWeaponPair: ['chain', 'brick'] },
  { city: 'Mumbai', landmark: 'Marine Drive Monsoon', season: 'Monsoon', biomeStyle: 'neon_expressway', difficulty: 'Hard', availableWeapons: ['ball', 'chain', 'rod'], defaultWeaponPair: ['ball', 'brick'] },
  { city: 'New York', landmark: 'Hudson Autumn Parkway', season: 'Autumn', biomeStyle: 'bridge_bay', difficulty: 'Challenging', availableWeapons: ['rod', 'ball', 'chain'], defaultWeaponPair: ['rod', 'brick'] },
  { city: 'Bali', landmark: 'Ubud Emerald Jungle', season: 'Summer', biomeStyle: 'jungle_hills', difficulty: 'Challenging', availableWeapons: ['chain', 'ball', 'rod'], defaultWeaponPair: ['chain', 'brick'] },
  { city: 'Seoul', landmark: 'Han River Blossom Skyway', season: 'Spring', biomeStyle: 'shrine_blossom', difficulty: 'Hard', availableWeapons: ['ball', 'chain', 'rod'], defaultWeaponPair: ['ball', 'brick'] },
  { city: 'Innsbruck', landmark: 'Tyrol Alpine Descent', season: 'Winter', biomeStyle: 'alpine_glacier', difficulty: 'Hard', availableWeapons: ['rod', 'ball', 'chain'], defaultWeaponPair: ['rod', 'brick'] },
  { city: 'Singapore', landmark: 'Marina Bay Night Circuit', season: 'Monsoon', biomeStyle: 'neon_expressway', difficulty: 'Very Hard', availableWeapons: ['ball', 'chain', 'rod'], defaultWeaponPair: ['ball', 'brick'] },
  { city: 'Vancouver', landmark: 'Lions Gate Seawall', season: 'Autumn', biomeStyle: 'bridge_bay', difficulty: 'Hard', availableWeapons: ['chain', 'ball', 'rod'], defaultWeaponPair: ['chain', 'brick'] },
  { city: 'Cape Town', landmark: "Chapman's Peak Ocean Pass", season: 'Summer', biomeStyle: 'jungle_hills', difficulty: 'Hard', availableWeapons: ['ball', 'chain', 'rod'], defaultWeaponPair: ['ball', 'brick'] },
  { city: 'Rome', landmark: 'Tiber Blossom Avenue', season: 'Spring', biomeStyle: 'shrine_blossom', difficulty: 'Hard', availableWeapons: ['rod', 'ball', 'chain'], defaultWeaponPair: ['rod', 'brick'] },
  { city: 'Banff', landmark: 'Icefields Glacier Parkway', season: 'Winter', biomeStyle: 'alpine_glacier', difficulty: 'Very Hard', availableWeapons: ['chain', 'ball', 'rod'], defaultWeaponPair: ['chain', 'brick'] },
  { city: 'Bangkok', landmark: 'Chao Phraya Neon Skyway', season: 'Monsoon', biomeStyle: 'neon_expressway', difficulty: 'Very Hard', availableWeapons: ['ball', 'chain', 'rod'], defaultWeaponPair: ['ball', 'brick'] },
  { city: 'Monaco', landmark: 'Riviera Harbor Circuit', season: 'Spring', biomeStyle: 'bridge_bay', difficulty: 'Very Hard', availableWeapons: ['ball', 'chain', 'rod'], defaultWeaponPair: ['ball', 'brick'] },
  { city: 'Dubai', landmark: 'Crescent Palm Championship', season: 'Summer', biomeStyle: 'neon_expressway', difficulty: 'Very Hard', availableWeapons: ['ball', 'chain', 'rod'], defaultWeaponPair: ['ball', 'brick'] },
];

// 22 Longer Endurance-Combat Laps (4,800m up to 7,950m) with progressive difficulty
export const RACES: RaceTrackDef[] = CITY_BLUEPRINTS.map((bp, idx) => {
  const theme = SEASON_THEMES[bp.season];
  const progress = idx / (CITY_BLUEPRINTS.length - 1);
  return {
    id: idx,
    raceNumber: idx + 1,
    city: bp.city,
    landmark: bp.landmark,
    season: bp.season,
    biomeStyle: bp.biomeStyle,
    ...theme,
    difficulty: bp.difficulty,
    lengthMeters: Math.round(4800 + idx * 150),
    roadHalfWidth: Number((10.6 - progress * 1.4).toFixed(1)),
    maxSpeedKmh: Math.round(220 + idx * 3.0),
    rivalSpeedScale: Number((0.83 + progress * 0.25).toFixed(3)),
    rivalAggression: Number((0.25 + progress * 0.68).toFixed(2)),
    hazardCount: 16 + idx * 2,
    availableWeapons: bp.availableWeapons,
    defaultWeaponPair: bp.defaultWeaponPair,
  };
});

export const BIKE_SKINS: BikeSkinDef[] = [
  {
    id: 'crimson-corsa',
    name: 'Crimson Corsa',
    primaryColor: '#dc2626',
    secondaryColor: '#18181b',
    trimColor: '#e4e4e7',
    metalness: 0.55,
    roughness: 0.25,
    price: 0,
  },
  {
    id: 'carbon-stealth',
    name: 'Carbon Stealth',
    primaryColor: '#27272a',
    secondaryColor: '#09090b',
    trimColor: '#f59e0b',
    metalness: 0.4,
    roughness: 0.42,
    price: 250,
  },
  {
    id: 'emerald-apex',
    name: 'Emerald Apex',
    primaryColor: '#059669',
    secondaryColor: '#0f172a',
    trimColor: '#a7f3d0',
    metalness: 0.65,
    roughness: 0.2,
    price: 450,
  },
  {
    id: 'cobalt-volt',
    name: 'Cobalt Volt',
    primaryColor: '#2563eb',
    secondaryColor: '#f8fafc',
    trimColor: '#38bdf8',
    metalness: 0.7,
    roughness: 0.18,
    price: 650,
  },
  {
    id: 'gold-sovereign',
    name: 'Gold Sovereign',
    primaryColor: '#d97706',
    secondaryColor: '#18181b',
    trimColor: '#fef08a',
    metalness: 0.88,
    roughness: 0.16,
    price: 1100,
  },
];

export const RIDER_ACCESSORIES: RiderAccessoryDef[] = [
  {
    id: 'street-pro',
    name: 'Street Pro Gear',
    helmetColor: '#f4f4f5',
    visorColor: '#111827',
    jacketColor: '#27272a',
    accentTrim: '#ef4444',
    price: 0,
  },
  {
    id: 'chrome-visor',
    name: 'Chrome Aero Helmet',
    helmetColor: '#d4d4d8',
    visorColor: '#0284c7',
    jacketColor: '#1e293b',
    accentTrim: '#38bdf8',
    price: 200,
  },
  {
    id: 'amber-tour',
    name: 'Amber Rally Jacket',
    helmetColor: '#18181b',
    visorColor: '#f59e0b',
    jacketColor: '#92400e',
    accentTrim: '#fbbf24',
    price: 400,
  },
  {
    id: 'alpine-parka',
    name: 'Alpine Winter Suit',
    helmetColor: '#e0f2fe',
    visorColor: '#0f172a',
    jacketColor: '#334155',
    accentTrim: '#7dd3fc',
    price: 600,
  },
  {
    id: 'shinjuku-carbon',
    name: 'Shinjuku Carbon Suit',
    helmetColor: '#09090b',
    visorColor: '#f97316',
    jacketColor: '#18181b',
    accentTrim: '#f59e0b',
    price: 950,
  },
];

export const RIVAL_ROSTER: {
  name: string;
  policy: RivalPolicy;
  bikeColor: string;
  helmetColor: string;
  jacketColor: string;
}[] = [
  { name: 'V. Rossi', policy: 'sprinter', bikeColor: '#2563eb', helmetColor: '#facc15', jacketColor: '#1e3a8a' },
  { name: 'K. Takahashi', policy: 'brawler', bikeColor: '#e11d48', helmetColor: '#f8fafc', jacketColor: '#3f3f46' },
  { name: 'M. Lindqvist', policy: 'weaver', bikeColor: '#0891b2', helmetColor: '#e2e8f0', jacketColor: '#164e63' },
  { name: 'R. Deshmukh', policy: 'brawler', bikeColor: '#ea580c', helmetColor: '#18181b', jacketColor: '#431407' },
  { name: 'E. Moreau', policy: 'sprinter', bikeColor: '#16a34a', helmetColor: '#dcfce7', jacketColor: '#14532d' },
  { name: 'T. Kovacs', policy: 'weaver', bikeColor: '#7c3aed', helmetColor: '#f5f3ff', jacketColor: '#2e1065' },
  { name: 'S. Chen', policy: 'sprinter', bikeColor: '#d97706', helmetColor: '#fef3c7', jacketColor: '#27272a' },
  { name: 'L. Navarro', policy: 'brawler', bikeColor: '#be123c', helmetColor: '#18181b', jacketColor: '#4c0519' },
  { name: 'A. Petrov', policy: 'weaver', bikeColor: '#4f46e5', helmetColor: '#e0e7ff', jacketColor: '#1e1b4b' },
  { name: 'D. Mercer', policy: 'brawler', bikeColor: '#0d9488', helmetColor: '#f0fdfa', jacketColor: '#134e4a' },
];

export const DAILY_CHALLENGES: DailyChallenge[] = [
  {
    id: 'daily-ko-3',
    title: 'Road Enforcer',
    description: 'Knock down 3 rival riders using Steel Rod, Chain, Iron Ball, or Kicks.',
    raceId: null,
    target: 3,
    rewardCoins: 300,
    metric: 'knockouts',
  },
  {
    id: 'daily-fuel-5',
    title: 'Tank Top-Up',
    description: 'Collect 5 Petrol Cans along the highway to stay fueled.',
    raceId: null,
    target: 5,
    rewardCoins: 280,
    metric: 'fuel_pickups',
  },
  {
    id: 'daily-boost-4',
    title: 'Nitro Overdrive',
    description: 'Hit 4 Road Boosters at high speed to overtake rivals.',
    raceId: null,
    target: 4,
    rewardCoins: 320,
    metric: 'boost_hits',
  },
  {
    id: 'daily-brick-2',
    title: 'Precision Masonry',
    description: 'Land 2 direct brick hits on opponents ahead of you.',
    raceId: null,
    target: 2,
    rewardCoins: 250,
    metric: 'brick_hits',
  },
  {
    id: 'daily-win-any',
    title: 'Podium Sovereign',
    description: 'Finish 1st out of 11 racers in any city race.',
    raceId: null,
    target: 1,
    rewardCoins: 450,
    metric: 'wins',
  },
  {
    id: 'daily-speed-260',
    title: 'Booster Velocity',
    description: 'Hit 260 km/h using Road Boosters during a race.',
    raceId: null,
    target: 260,
    rewardCoins: 350,
    metric: 'top_speed_kmh',
  },
];
