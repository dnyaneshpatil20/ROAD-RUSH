import type {
  DailyChallenge,
  LeaderboardEntry,
  MultiplayerRoomInfo,
  PlayerProfile,
  TournamentStanding,
} from './types';

const PLAYER_ID_KEY = 'road_rush_player_id_v1';

export function getOrCreatePlayerId(): string {
  try {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = `rr_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    return `rr_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export async function fetchProfile(playerId: string): Promise<PlayerProfile> {
  const res = await fetch(`/api/profile/${encodeURIComponent(playerId)}`);
  if (!res.ok) throw new Error('Failed to load cloud profile');
  return res.json();
}

export async function saveProfile(profile: PlayerProfile): Promise<PlayerProfile> {
  const res = await fetch(`/api/profile/${encodeURIComponent(profile.playerId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error('Failed to sync cloud save');
  return res.json();
}

export async function loadProfileBySyncCode(code: string): Promise<PlayerProfile> {
  const res = await fetch(`/api/profile/sync/${encodeURIComponent(code.trim())}`);
  if (!res.ok) throw new Error('Invalid or unknown Cloud Sync Code');
  const loaded = (await res.json()) as PlayerProfile;
  try {
    localStorage.setItem(PLAYER_ID_KEY, loaded.playerId);
  } catch {
    // Ignore storage error
  }
  return loaded;
}

export async function submitRaceFinish(payload: {
  playerId: string;
  playerName: string;
  raceId: number;
  rank: number;
  timeSeconds: number;
  knockouts: number;
  fuelCollected: number;
  boostersHit: number;
  brickHits: number;
  coinsEarned: number;
  topSpeedKmh: number;
  platform: string;
}): Promise<{
  profile: PlayerProfile;
  entry: LeaderboardEntry;
  upgradedWeaponTier?: number;
  upgradedBoosterTier?: number;
}> {
  const res = await fetch('/api/race/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to record race result');
  return res.json();
}

export async function purchaseCosmetic(
  playerId: string,
  itemType: 'skin' | 'accessory' | 'coin_pack' | 'weapon_upgrade' | 'booster_upgrade',
  itemId: string,
): Promise<PlayerProfile> {
  const res = await fetch('/api/shop/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, itemType, itemId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Purchase failed');
  return data.profile;
}

export async function fetchLeaderboard(raceId: number | 'all'): Promise<LeaderboardEntry[]> {
  const res = await fetch(`/api/leaderboard?raceId=${raceId}`);
  if (!res.ok) throw new Error('Failed to load leaderboard');
  return res.json();
}

export async function fetchChallenges(): Promise<DailyChallenge[]> {
  const res = await fetch('/api/challenges');
  if (!res.ok) throw new Error('Failed to load daily challenges');
  return res.json();
}

export async function fetchTournaments(): Promise<TournamentStanding[]> {
  const res = await fetch('/api/tournaments');
  if (!res.ok) throw new Error('Failed to load tournaments');
  return res.json();
}

export async function fetchRooms(): Promise<MultiplayerRoomInfo[]> {
  const res = await fetch('/api/rooms');
  if (!res.ok) throw new Error('Failed to load multiplayer rooms');
  return res.json();
}
