import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchProfile,
  getOrCreatePlayerId,
  loadProfileBySyncCode,
  purchaseCosmetic,
  saveProfile,
  submitRaceFinish,
} from './game/api';
import { RACES } from './game/catalog';
import { RoadRushEngine } from './game/RoadRushEngine';
import type {
  GameScreenState,
  HudTelemetry,
  MultiplayerRoomInfo,
  PlayerProfile,
  RaceResultSnapshot,
  WeaponId,
} from './game/types';
import { ChallengesTournamentModal } from './components/ChallengesTournamentModal';
import { GarageModal } from './components/GarageModal';
import { MultiplayerLeaderboardModal } from './components/MultiplayerLeaderboardModal';
import { RaceHUD } from './components/RaceHUD';
import { PauseModal, ResultModal } from './components/StatusModals';
import { TitleScreen } from './components/TitleScreen';

const INITIAL_HUD: HudTelemetry = {
  speedKmh: 0,
  rank: 8,
  totalRacers: 11,
  progressPct: 0,
  elapsedTime: 0,
  hp: 100,
  maxHp: 100,
  fuel: 86,
  maxFuel: 100,
  boostActive: false,
  boostTimer: 0,
  weaponTier: 1,
  boosterTier: 1,
  activeWeapon: 'rod',
  meleeWeapon: 'rod',
  weaponCooldownPct: 0,
  brickCooldownPct: 0,
  knockouts: 0,
  fuelCollected: 0,
  boostersHit: 0,
  calloutText: '',
  countdownText: '3',
  gyroEnabled: false,
  gyroSupported: false,
  gyroTiltDeg: 0,
  minimapRacers: [],
  nearbyWarning: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RoadRushEngine | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [playerId] = useState<string>(() => getOrCreatePlayerId());
  const [profile, setProfile] = useState<PlayerProfile>(() => ({
    playerId,
    syncCode: `RR-${playerId.slice(0, 4).toUpperCase()}`,
    name: 'Rider',
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
  }));

  const [screenState, setScreenState] = useState<GameScreenState>('title');
  const [selectedRaceId, setSelectedRaceId] = useState<number>(0);
  const [hud, setHud] = useState<HudTelemetry>(INITIAL_HUD);
  const [result, setResult] = useState<RaceResultSnapshot | null>(null);
  const [muted, setMuted] = useState(false);

  const [activeModal, setActiveModal] = useState<
    'garage' | 'challenges' | 'multiplayer' | null
  >(null);
  const [activeRoom, setActiveRoom] = useState<MultiplayerRoomInfo | null>(null);

  const profileRef = useRef(profile);
  profileRef.current = profile;

  const startRace = useCallback((raceId?: number) => {
    const targetId = typeof raceId === 'number' ? raceId : selectedRaceId;
    setSelectedRaceId(targetId);
    setResult(null);
    setActiveModal(null);
    setScreenState('playing');
    engineRef.current?.startRace(targetId);
  }, [selectedRaceId]);

  // Load cloud profile on mount
  useEffect(() => {
    fetchProfile(playerId)
      .then((loaded) => {
        setProfile(loaded);
        engineRef.current?.updateLoadout({
          name: loaded.name,
          skinId: loaded.equippedSkinId,
          accessoryId: loaded.equippedAccessoryId,
          highestUnlockedRace: loaded.highestUnlockedRace,
          weaponTier: loaded.weaponTier,
          boosterTier: loaded.boosterTier,
        });
      })
      .catch(() => {});
  }, [playerId]);

  // Connect WebSocket for cross-platform multiplayer & live leaderboard updates
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    const remoteMap = new Map<
      string,
      { id: string; name: string; z: number; x: number; vz: number; hp: number; weapon: WeaponId }
    >();

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as {
          type: string;
          room?: MultiplayerRoomInfo;
          raceId?: number;
          playerId?: string;
          playerName?: string;
          state?: { z: number; x: number; vz: number; hp: number; weapon: WeaponId };
        };

        if (msg.type === 'room:joined' || msg.type === 'room:updated') {
          if (msg.room) setActiveRoom(msg.room);
        } else if (msg.type === 'room:started' && typeof msg.raceId === 'number') {
          setActiveModal(null);
          setSelectedRaceId(msg.raceId);
          setResult(null);
          setScreenState('playing');
          engineRef.current?.startRace(msg.raceId);
        } else if (msg.type === 'race:peer' && msg.playerId && msg.state) {
          remoteMap.set(msg.playerId, {
            id: msg.playerId,
            name: msg.playerName || 'Rival',
            ...msg.state,
          });
          engineRef.current?.updateRemoteRacers(
            Array.from(remoteMap.values()),
            profileRef.current.playerId,
          );
        }
      } catch {
        // Ignore WS parse errors
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  // Mount Three.js RoadRushEngine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new RoadRushEngine(
      mount,
      {
        name: profileRef.current.name,
        skinId: profileRef.current.equippedSkinId,
        accessoryId: profileRef.current.equippedAccessoryId,
        highestUnlockedRace: profileRef.current.highestUnlockedRace,
        weaponTier: profileRef.current.weaponTier,
        boosterTier: profileRef.current.boosterTier,
      },
      {
        onHudUpdate: (nextHud) => setHud(nextHud),
        onPauseRequest: () => {
          engine.setScreenState('paused');
          setScreenState('paused');
        },
        onRaceFinish: (snapshot) => {
          setResult(snapshot);
          setScreenState('gameover');
          const p = profileRef.current;
          const platform =
            'ontouchstart' in window ? 'Mobile WebGL' : 'Desktop WebGL';
          submitRaceFinish({
            playerId: p.playerId,
            playerName: p.name,
            raceId: snapshot.raceId,
            rank: snapshot.rank,
            timeSeconds: snapshot.timeSeconds,
            knockouts: snapshot.knockouts,
            fuelCollected: snapshot.fuelCollected,
            boostersHit: snapshot.boostersHit,
            brickHits: snapshot.brickHits,
            coinsEarned: snapshot.coinsEarned,
            topSpeedKmh: snapshot.topSpeedKmh,
            platform,
          })
            .then(({ profile: updated, upgradedWeaponTier, upgradedBoosterTier }) => {
              setProfile(updated);
              if (upgradedWeaponTier || upgradedBoosterTier) {
                setResult((prev) =>
                  prev
                    ? {
                        ...prev,
                        upgradedWeaponTier: upgradedWeaponTier ?? prev.upgradedWeaponTier,
                        upgradedBoosterTier: upgradedBoosterTier ?? prev.upgradedBoosterTier,
                      }
                    : prev,
                );
              }
              engine.updateLoadout({
                name: updated.name,
                skinId: updated.equippedSkinId,
                accessoryId: updated.equippedAccessoryId,
                highestUnlockedRace: updated.highestUnlockedRace,
                weaponTier: updated.weaponTier,
                boosterTier: updated.boosterTier,
              });
            })
            .catch(() => {});
        },
        onMultiplayerSync: (state) => {
          const ws = wsRef.current;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'race:state',
                playerName: profileRef.current.name,
                state,
              }),
            );
          }
        },
      },
    );

    engineRef.current = engine;

    // Support ?autostart=1 or ?race=N query parameters for instant gameplay entry
    const params = new URLSearchParams(window.location.search);
    const raceParam = Number(params.get('race'));
    if (!Number.isNaN(raceParam) && raceParam >= 0 && raceParam < RACES.length) {
      setSelectedRaceId(raceParam);
      engine.loadRace(raceParam);
    }
    if (params.get('autostart') === '1') {
      const startId =
        !Number.isNaN(raceParam) && raceParam >= 0 && raceParam < RACES.length
          ? raceParam
          : 0;
      setScreenState('playing');
      engine.startRace(startId);
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSelectRace = (raceId: number) => {
    setSelectedRaceId(raceId);
    engineRef.current?.loadRace(raceId);
  };

  const handlePurchaseOrEquip = async (
    itemType: 'skin' | 'accessory' | 'coin_pack' | 'weapon_upgrade' | 'booster_upgrade',
    itemId: string,
  ) => {
    const updated = await purchaseCosmetic(profile.playerId, itemType, itemId);
    setProfile(updated);
    engineRef.current?.updateLoadout({
      name: updated.name,
      skinId: updated.equippedSkinId,
      accessoryId: updated.equippedAccessoryId,
      highestUnlockedRace: updated.highestUnlockedRace,
      weaponTier: updated.weaponTier,
      boosterTier: updated.boosterTier,
    });
  };

  const handleUpdateName = async (name: string) => {
    const updated = await saveProfile({ ...profile, name });
    setProfile(updated);
    engineRef.current?.updateLoadout({
      name: updated.name,
      skinId: updated.equippedSkinId,
      accessoryId: updated.equippedAccessoryId,
      highestUnlockedRace: updated.highestUnlockedRace,
      weaponTier: updated.weaponTier,
      boosterTier: updated.boosterTier,
    });
  };

  const handleLoadSyncCode = async (code: string) => {
    const loaded = await loadProfileBySyncCode(code);
    setProfile(loaded);
    engineRef.current?.updateLoadout({
      name: loaded.name,
      skinId: loaded.equippedSkinId,
      accessoryId: loaded.equippedAccessoryId,
      highestUnlockedRace: loaded.highestUnlockedRace,
      weaponTier: loaded.weaponTier,
      boosterTier: loaded.boosterTier,
    });
  };

  const handleCreateRoom = (roomName: string, raceId: number) => {
    wsRef.current?.send(
      JSON.stringify({
        type: 'room:create',
        playerId: profile.playerId,
        playerName: profile.name,
        skinId: profile.equippedSkinId,
        roomName,
        raceId,
      }),
    );
  };

  const handleJoinRoom = (roomId: string) => {
    wsRef.current?.send(
      JSON.stringify({
        type: 'room:join',
        playerId: profile.playerId,
        playerName: profile.name,
        skinId: profile.equippedSkinId,
        roomId,
      }),
    );
  };

  const handleStartRoomRace = () => {
    wsRef.current?.send(JSON.stringify({ type: 'room:start' }));
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-950">
      {/* Isolated WebGL mount container */}
      <div
        ref={canvasMountRef}
        data-testid="road-rush-canvas"
        className="absolute inset-0 w-full h-full"
      />

      {/* Title Screen */}
      {screenState === 'title' && (
        <TitleScreen
          selectedRaceId={selectedRaceId}
          profile={profile}
          onSelectRace={handleSelectRace}
          onStartRace={() => startRace(selectedRaceId)}
          onOpenGarage={() => setActiveModal('garage')}
          onOpenChallenges={() => setActiveModal('challenges')}
          onOpenMultiplayer={() => setActiveModal('multiplayer')}
        />
      )}

      {/* Playing HUD */}
      {screenState === 'playing' && (
        <RaceHUD
          hud={hud}
          race={RACES[selectedRaceId] ?? RACES[0]}
          muted={muted}
          onToggleMute={() => {
            const next = engineRef.current?.toggleMute() ?? false;
            setMuted(next);
          }}
          onPause={() => {
            engineRef.current?.setScreenState('paused');
            setScreenState('paused');
          }}
          onToggleGyro={() => {
            void engineRef.current?.toggleGyroscope();
          }}
          onTouchControl={(ctrl, pressed) => {
            engineRef.current?.setTouchControl(ctrl, pressed);
          }}
          onAttackMelee={() => engineRef.current?.triggerMeleeAttack()}
          onThrowBrick={() => engineRef.current?.triggerBrickThrow()}
          onShiftTool={() => engineRef.current?.shiftMeleeWeapon()}
        />
      )}

      {/* Pause Modal */}
      {screenState === 'paused' && (
        <PauseModal
          onResume={() => {
            engineRef.current?.setScreenState('playing');
            setScreenState('playing');
          }}
          onRestart={() => startRace(selectedRaceId)}
          onQuitToTitle={() => {
            engineRef.current?.setScreenState('title');
            engineRef.current?.loadRace(selectedRaceId);
            setScreenState('title');
          }}
        />
      )}

      {/* Victory / Defeat Result Modal */}
      {screenState === 'gameover' && result && (
        <ResultModal
          result={result}
          onNextOrRetry={(raceId) => startRace(raceId)}
          onBackToTitle={() => {
            engineRef.current?.setScreenState('title');
            engineRef.current?.loadRace(selectedRaceId);
            setScreenState('title');
          }}
        />
      )}

      {/* Garage & Cosmetic Shop Modal */}
      {activeModal === 'garage' && (
        <GarageModal
          profile={profile}
          onClose={() => setActiveModal(null)}
          onPurchaseOrEquip={handlePurchaseOrEquip}
          onUpdateName={handleUpdateName}
          onLoadSyncCode={handleLoadSyncCode}
        />
      )}

      {/* Daily Challenges & Global Tournament Modal */}
      {activeModal === 'challenges' && (
        <ChallengesTournamentModal
          profile={profile}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Cross-Platform Multiplayer & Real-Time Leaderboard Modal */}
      {activeModal === 'multiplayer' && (
        <MultiplayerLeaderboardModal
          profile={profile}
          activeRoom={activeRoom}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onStartRoomRace={handleStartRoomRace}
          onClose={() => setActiveModal(null)}
        />
      )}
    </main>
  );
}
