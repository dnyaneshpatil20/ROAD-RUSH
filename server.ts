import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  BIKE_SKINS,
  BOOSTER_TIERS,
  DAILY_CHALLENGES,
  RACES,
  RIDER_ACCESSORIES,
  WEAPON_TIERS,
} from './src/game/catalog.ts';
import type {
  LeaderboardEntry,
  MultiplayerRoomInfo,
  PlayerProfile,
  TournamentStanding,
} from './src/game/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'road-rush-db.json');

interface DatabaseShape {
  profiles: Record<string, PlayerProfile>;
  syncCodes: Record<string, string>;
  leaderboard: LeaderboardEntry[];
  tournaments: Record<string, TournamentStanding>;
}

function createSeedDatabase(): DatabaseShape {
  const seedLeaderboard: LeaderboardEntry[] = [
    {
      id: 'seed-1',
      playerId: 'seed-rossi',
      playerName: 'V. Rossi',
      raceId: 0,
      city: 'San Francisco',
      timeSeconds: 51.4,
      knockouts: 3,
      rank: 1,
      platform: 'Desktop WebGL',
      createdAt: new Date(Date.now() - 3600_000 * 6).toISOString(),
    },
    {
      id: 'seed-2',
      playerId: 'seed-taka',
      playerName: 'K. Takahashi',
      raceId: 1,
      city: 'Munnar Hills',
      timeSeconds: 58.2,
      knockouts: 4,
      rank: 1,
      platform: 'Mobile Gyro',
      createdAt: new Date(Date.now() - 3600_000 * 5).toISOString(),
    },
    {
      id: 'seed-3',
      playerId: 'seed-moreau',
      playerName: 'E. Moreau',
      raceId: 2,
      city: 'Kyoto',
      timeSeconds: 61.9,
      knockouts: 2,
      rank: 1,
      platform: 'Desktop WebGL',
      createdAt: new Date(Date.now() - 3600_000 * 4).toISOString(),
    },
    {
      id: 'seed-4',
      playerId: 'seed-lindqvist',
      playerName: 'M. Lindqvist',
      raceId: 3,
      city: 'Zermatt',
      timeSeconds: 64.5,
      knockouts: 5,
      rank: 1,
      platform: 'Mobile Gyro',
      createdAt: new Date(Date.now() - 3600_000 * 2).toISOString(),
    },
    {
      id: 'seed-5',
      playerId: 'seed-chen',
      playerName: 'S. Chen',
      raceId: 4,
      city: 'Tokyo Shinjuku',
      timeSeconds: 68.1,
      knockouts: 6,
      rank: 1,
      platform: 'Desktop WebGL',
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
    },
  ];

  const seedTournaments: Record<string, TournamentStanding> = {
    'seed-rossi': {
      playerId: 'seed-rossi',
      playerName: 'V. Rossi',
      points: 1450,
      wins: 6,
      bestLapSum: 298.4,
      tier: 'Apex',
    },
    'seed-taka': {
      playerId: 'seed-taka',
      playerName: 'K. Takahashi',
      points: 1280,
      wins: 5,
      bestLapSum: 306.1,
      tier: 'Gold',
    },
    'seed-moreau': {
      playerId: 'seed-moreau',
      playerName: 'E. Moreau',
      points: 1120,
      wins: 4,
      bestLapSum: 312.8,
      tier: 'Gold',
    },
    'seed-chen': {
      playerId: 'seed-chen',
      playerName: 'S. Chen',
      points: 940,
      wins: 3,
      bestLapSum: 319.5,
      tier: 'Silver',
    },
  };

  return {
    profiles: {},
    syncCodes: {},
    leaderboard: seedLeaderboard,
    tournaments: seedTournaments,
  };
}

function loadDatabase(): DatabaseShape {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(raw) as DatabaseShape;
    }
  } catch {
    // Fallback to seed DB
  }
  const seed = createSeedDatabase();
  saveDatabase(seed);
  return seed;
}

function saveDatabase(db: DatabaseShape): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch {
    // Ignore write failure in read-only edge cases
  }
}

function defaultProfile(playerId: string, name?: string): PlayerProfile {
  const code = `RR-${playerId.slice(0, 4).toUpperCase()}`;
  return {
    playerId,
    syncCode: code,
    name: name || 'Rider',
    coins: 500,
    highestUnlockedRace: 0,
    weaponTier: 1,
    boosterTier: 1,
    equippedSkinId: 'crimson-corsa',
    equippedAccessoryId: 'street-pro',
    ownedSkins: ['crimson-corsa'],
    ownedAccessories: ['street-pro'],
    totalWins: 0,
    totalKnockouts: 0,
    bestTimes: {},
    tournamentPoints: 0,
    completedChallenges: [],
    challengeProgress: {},
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const db = loadDatabase();

  // Active multiplayer rooms & connected sockets
  const rooms = new Map<string, MultiplayerRoomInfo>();
  const roomClients = new Map<string, Set<WebSocket>>();
  const socketMeta = new WeakMap<WebSocket, { playerId: string; roomId?: string }>();

  // Seed one open cross-platform lobby room so players can jump right in
  rooms.set('sf-autumn-open', {
    roomId: 'sf-autumn-open',
    name: 'San Francisco Grand Prix',
    raceId: 0,
    players: [],
    status: 'waiting',
  });
  roomClients.set('sf-autumn-open', new Set());

  function broadcastAll(payload: unknown) {
    const msg = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  function broadcastRoom(roomId: string, payload: unknown, exclude?: WebSocket) {
    const set = roomClients.get(roomId);
    if (!set) return;
    const msg = JSON.stringify(payload);
    set.forEach((client) => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  wss.on('connection', (ws) => {
    socketMeta.set(ws, { playerId: '' });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type: string;
          playerId?: string;
          playerName?: string;
          skinId?: string;
          roomId?: string;
          roomName?: string;
          raceId?: number;
          state?: { z: number; x: number; vz: number; hp: number; weapon: string };
        };

        const meta = socketMeta.get(ws)!;

        if (msg.type === 'room:create' && msg.playerId) {
          const roomId = `room-${Math.random().toString(36).slice(2, 7)}`;
          const room: MultiplayerRoomInfo = {
            roomId,
            name: (msg.roomName || 'Global Race Room').slice(0, 32),
            raceId: Math.max(0, Math.min(RACES.length - 1, msg.raceId ?? 0)),
            players: [
              {
                id: msg.playerId,
                name: msg.playerName || 'Rider',
                skinId: msg.skinId || 'crimson-corsa',
                ready: true,
              },
            ],
            status: 'waiting',
          };
          rooms.set(roomId, room);
          roomClients.set(roomId, new Set([ws]));
          meta.playerId = msg.playerId;
          meta.roomId = roomId;
          ws.send(JSON.stringify({ type: 'room:joined', room }));
          broadcastAll({ type: 'rooms:list', rooms: Array.from(rooms.values()) });
        } else if (msg.type === 'room:join' && msg.roomId && msg.playerId) {
          const room = rooms.get(msg.roomId);
          if (!room) return;
          meta.playerId = msg.playerId;
          meta.roomId = msg.roomId;
          if (!roomClients.has(msg.roomId)) roomClients.set(msg.roomId, new Set());
          roomClients.get(msg.roomId)!.add(ws);
          if (!room.players.some((p) => p.id === msg.playerId)) {
            room.players.push({
              id: msg.playerId,
              name: msg.playerName || 'Rider',
              skinId: msg.skinId || 'crimson-corsa',
              ready: true,
            });
          }
          broadcastRoom(msg.roomId, { type: 'room:updated', room });
          broadcastAll({ type: 'rooms:list', rooms: Array.from(rooms.values()) });
        } else if (msg.type === 'room:start' && meta.roomId) {
          const room = rooms.get(meta.roomId);
          if (room) {
            room.status = 'racing';
            broadcastRoom(meta.roomId, { type: 'room:started', raceId: room.raceId, room });
          }
        } else if (msg.type === 'race:state' && meta.roomId && msg.state) {
          broadcastRoom(
            meta.roomId,
            {
              type: 'race:peer',
              playerId: meta.playerId,
              playerName: msg.playerName || 'Rival',
              state: msg.state,
            },
            ws,
          );
        }
      } catch {
        // Ignore malformed WS payloads
      }
    });

    ws.on('close', () => {
      const meta = socketMeta.get(ws);
      if (meta?.roomId) {
        roomClients.get(meta.roomId)?.delete(ws);
        const room = rooms.get(meta.roomId);
        if (room && meta.playerId) {
          room.players = room.players.filter((p) => p.id !== meta.playerId);
          broadcastRoom(meta.roomId, { type: 'room:updated', room });
          broadcastAll({ type: 'rooms:list', rooms: Array.from(rooms.values()) });
        }
      }
    });
  });

  // === REST APIs ===
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, races: RACES.length });
  });

  // Cloud Save GET / POST
  app.get('/api/profile/:id', (req, res) => {
    const id = req.params.id;
    let profile = db.profiles[id];
    if (!profile) {
      profile = defaultProfile(id);
      db.profiles[id] = profile;
      db.syncCodes[profile.syncCode] = id;
      saveDatabase(db);
    }
    if (!profile.weaponTier) profile.weaponTier = 1;
    if (!profile.boosterTier) profile.boosterTier = 1;
    res.json(profile);
  });

  app.get('/api/profile/sync/:code', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const targetId = db.syncCodes[code];
    if (!targetId || !db.profiles[targetId]) {
      res.status(404).json({ error: 'Sync code not found' });
      return;
    }
    res.json(db.profiles[targetId]);
  });

  app.post('/api/profile/:id', (req, res) => {
    const id = req.params.id;
    const incoming = req.body as Partial<PlayerProfile>;
    const existing = db.profiles[id] ?? defaultProfile(id, incoming.name);
    const merged: PlayerProfile = {
      ...existing,
      ...incoming,
      playerId: id,
      syncCode: existing.syncCode,
    };
    db.profiles[id] = merged;
    db.syncCodes[merged.syncCode] = id;
    saveDatabase(db);
    res.json(merged);
  });

  // Real-time Leaderboard
  app.get('/api/leaderboard', (req, res) => {
    const raceIdParam = req.query.raceId;
    let list = [...db.leaderboard];
    if (raceIdParam !== undefined && raceIdParam !== 'all') {
      const rId = Number(raceIdParam);
      list = list.filter((e) => e.raceId === rId);
    }
    list.sort((a, b) => a.timeSeconds - b.timeSeconds);
    res.json(list.slice(0, 30));
  });

  // Record Race Finish -> updates Cloud Save, Leaderboard, Daily Challenges, Next-Step Upgrades & Global Tournament
  app.post('/api/race/finish', (req, res) => {
    const body = req.body as {
      playerId: string;
      playerName: string;
      raceId: number;
      rank: number;
      timeSeconds: number;
      knockouts: number;
      fuelCollected?: number;
      boostersHit?: number;
      coinsEarned: number;
      topSpeedKmh: number;
      brickHits?: number;
      platform?: string;
    };

    const race = RACES[Math.max(0, Math.min(RACES.length - 1, body.raceId))];
    const profile = db.profiles[body.playerId] ?? defaultProfile(body.playerId, body.playerName);
    if (!profile.weaponTier) profile.weaponTier = 1;
    if (!profile.boosterTier) profile.boosterTier = 1;

    profile.name = body.playerName || profile.name;
    profile.coins += Math.max(0, Math.round(body.coinsEarned || 0));
    profile.totalKnockouts += body.knockouts || 0;

    let upgradedWeaponTier: number | undefined;
    let upgradedBoosterTier: number | undefined;

    if (body.rank === 1) {
      profile.totalWins += 1;
      if (race.id >= profile.highestUnlockedRace && race.id < RACES.length - 1) {
        profile.highestUnlockedRace = race.id + 1;
      }
      // Check automatic Weapon & Booster tier upgrades as player advances to next levels!
      for (const wt of WEAPON_TIERS) {
        if (profile.highestUnlockedRace >= wt.autoUnlockRace && wt.tier > profile.weaponTier) {
          profile.weaponTier = wt.tier;
          upgradedWeaponTier = wt.tier;
        }
      }
      for (const bt of BOOSTER_TIERS) {
        if (profile.highestUnlockedRace >= bt.autoUnlockRace && bt.tier > profile.boosterTier) {
          profile.boosterTier = bt.tier;
          upgradedBoosterTier = bt.tier;
        }
      }
    }

    const prevBest = profile.bestTimes[race.id];
    if (prevBest === undefined || body.timeSeconds < prevBest) {
      profile.bestTimes[race.id] = Number(body.timeSeconds.toFixed(2));
    }

    // Update Daily Challenge & Activity progress
    const cp = profile.challengeProgress;
    cp['daily-ko-3'] = (cp['daily-ko-3'] || 0) + (body.knockouts || 0);
    cp['daily-fuel-5'] = (cp['daily-fuel-5'] || 0) + (body.fuelCollected || 0);
    cp['daily-boost-4'] = (cp['daily-boost-4'] || 0) + (body.boostersHit || 0);
    cp['daily-brick-2'] = (cp['daily-brick-2'] || 0) + (body.brickHits || 0);
    if (body.rank === 1) cp['daily-win-any'] = (cp['daily-win-any'] || 0) + 1;
    cp['daily-speed-260'] = Math.max(cp['daily-speed-260'] || 0, Math.round(body.topSpeedKmh || 0));

    for (const ch of DAILY_CHALLENGES) {
      if ((cp[ch.id] || 0) >= ch.target && !profile.completedChallenges.includes(ch.id)) {
        profile.completedChallenges.push(ch.id);
        profile.coins += ch.rewardCoins;
      }
    }

    const ptsEarned = Math.max(25, (12 - body.rank) * 30 + (body.rank === 1 ? 120 : 0));
    profile.tournamentPoints += ptsEarned;
    const tEntry = db.tournaments[body.playerId] ?? {
      playerId: body.playerId,
      playerName: profile.name,
      points: 0,
      wins: 0,
      bestLapSum: 0,
      tier: 'Bronze' as const,
    };
    tEntry.playerName = profile.name;
    tEntry.points += ptsEarned;
    if (body.rank === 1) tEntry.wins += 1;
    const times = Object.values(profile.bestTimes);
    tEntry.bestLapSum = times.length > 0 ? Number(times.reduce((a, b) => a + b, 0).toFixed(1)) : 0;
    tEntry.tier =
      tEntry.points >= 1400
        ? 'Apex'
        : tEntry.points >= 1000
          ? 'Gold'
          : tEntry.points >= 500
            ? 'Silver'
            : 'Bronze';
    db.tournaments[body.playerId] = tEntry;

    const entry: LeaderboardEntry = {
      id: `lb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      playerId: body.playerId,
      playerName: profile.name,
      raceId: race.id,
      city: race.city,
      timeSeconds: Number(body.timeSeconds.toFixed(2)),
      knockouts: body.knockouts || 0,
      rank: body.rank,
      platform: body.platform || 'WebGL',
      createdAt: new Date().toISOString(),
    };
    db.leaderboard.push(entry);
    db.leaderboard = db.leaderboard
      .sort((a, b) => a.timeSeconds - b.timeSeconds)
      .slice(0, 100);

    db.profiles[body.playerId] = profile;
    db.syncCodes[profile.syncCode] = body.playerId;
    saveDatabase(db);

    broadcastAll({ type: 'leaderboard:updated', entry });
    res.json({
      profile,
      entry,
      tournament: tEntry,
      upgradedWeaponTier,
      upgradedBoosterTier,
    });
  });

  // In-App Cosmetic & Performance Upgrade Shop
  app.post('/api/shop/purchase', (req, res) => {
    const { playerId, itemType, itemId } = req.body as {
      playerId: string;
      itemType: 'skin' | 'accessory' | 'coin_pack' | 'weapon_upgrade' | 'booster_upgrade';
      itemId: string;
    };
    const profile = db.profiles[playerId] ?? defaultProfile(playerId);
    if (!profile.weaponTier) profile.weaponTier = 1;
    if (!profile.boosterTier) profile.boosterTier = 1;

    if (itemType === 'coin_pack') {
      profile.coins += 500;
      db.profiles[playerId] = profile;
      saveDatabase(db);
      res.json({ profile });
      return;
    }

    if (itemType === 'weapon_upgrade') {
      const nextTier = WEAPON_TIERS.find((t) => t.tier === profile.weaponTier + 1);
      if (!nextTier) {
        res.status(400).json({ error: 'Weapons already at maximum Tier 5!' });
        return;
      }
      if (profile.coins < nextTier.price) {
        res.status(400).json({ error: 'Insufficient Rush Coins' });
        return;
      }
      profile.coins -= nextTier.price;
      profile.weaponTier = nextTier.tier;
    } else if (itemType === 'booster_upgrade') {
      const nextTier = BOOSTER_TIERS.find((t) => t.tier === profile.boosterTier + 1);
      if (!nextTier) {
        res.status(400).json({ error: 'Booster already at maximum Tier 5!' });
        return;
      }
      if (profile.coins < nextTier.price) {
        res.status(400).json({ error: 'Insufficient Rush Coins' });
        return;
      }
      profile.coins -= nextTier.price;
      profile.boosterTier = nextTier.tier;
    } else if (itemType === 'skin') {
      const skin = BIKE_SKINS.find((s) => s.id === itemId);
      if (!skin) {
        res.status(404).json({ error: 'Skin not found' });
        return;
      }
      if (!profile.ownedSkins.includes(skin.id)) {
        if (profile.coins < skin.price) {
          res.status(400).json({ error: 'Insufficient Rush Coins' });
          return;
        }
        profile.coins -= skin.price;
        profile.ownedSkins.push(skin.id);
      }
      profile.equippedSkinId = skin.id;
    } else if (itemType === 'accessory') {
      const acc = RIDER_ACCESSORIES.find((a) => a.id === itemId);
      if (!acc) {
        res.status(404).json({ error: 'Accessory not found' });
        return;
      }
      if (!profile.ownedAccessories.includes(acc.id)) {
        if (profile.coins < acc.price) {
          res.status(400).json({ error: 'Insufficient Rush Coins' });
          return;
        }
        profile.coins -= acc.price;
        profile.ownedAccessories.push(acc.id);
      }
      profile.equippedAccessoryId = acc.id;
    }

    db.profiles[playerId] = profile;
    saveDatabase(db);
    res.json({ profile });
  });

  // Daily Challenges & Global Tournaments
  app.get('/api/challenges', (_req, res) => {
    res.json(DAILY_CHALLENGES);
  });

  app.get('/api/tournaments', (_req, res) => {
    const standings = Object.values(db.tournaments).sort((a, b) => b.points - a.points);
    res.json(standings);
  });

  app.get('/api/rooms', (_req, res) => {
    res.json(Array.from(rooms.values()));
  });

  // Mount Vite middleware in dev, or serve dist in prod
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Road Rush server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
