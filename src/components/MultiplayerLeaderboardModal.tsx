import React, { useEffect, useState } from 'react';
import { Globe, Plus, Users, X } from 'lucide-react';
import { fetchLeaderboard, fetchRooms } from '../game/api';
import { RACES } from '../game/catalog';
import type {
  LeaderboardEntry,
  MultiplayerRoomInfo,
  PlayerProfile,
} from '../game/types';

interface MultiplayerLeaderboardModalProps {
  profile: PlayerProfile;
  activeRoom: MultiplayerRoomInfo | null;
  onCreateRoom: (roomName: string, raceId: number) => void;
  onJoinRoom: (roomId: string) => void;
  onStartRoomRace: () => void;
  onClose: () => void;
}

export const MultiplayerLeaderboardModal: React.FC<MultiplayerLeaderboardModalProps> = ({
  profile,
  activeRoom,
  onCreateRoom,
  onJoinRoom,
  onStartRoomRace,
  onClose,
}) => {
  const [tab, setTab] = useState<'leaderboard' | 'multiplayer'>('leaderboard');
  const [raceFilter, setRaceFilter] = useState<number | 'all'>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [rooms, setRooms] = useState<MultiplayerRoomInfo[]>([]);
  const [roomName, setRoomName] = useState(`${profile.name}'s GP`);
  const [roomRaceId, setRoomRaceId] = useState(0);

  const refreshData = () => {
    fetchLeaderboard(raceFilter).then(setEntries).catch(() => {});
    fetchRooms().then(setRooms).catch(() => {});
  };

  useEffect(() => {
    refreshData();
    const timer = window.setInterval(refreshData, 4000);
    return () => window.clearInterval(timer);
  }, [raceFilter]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
      <div
        role="dialog"
        aria-label="Cross-Platform Multiplayer and Real-Time Leaderboard"
        className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'rgba(15, 17, 23, 0.98)',
          border: '1px solid rgba(255,255,255,0.14)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTab('leaderboard')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                tab === 'leaderboard'
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Real-Time Leaderboard
            </button>
            <button
              type="button"
              onClick={() => setTab('multiplayer')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                tab === 'multiplayer'
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Cross-Platform Multiplayer
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Online and Leaderboard"
            className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto modal-scroll space-y-5">
          {tab === 'leaderboard' ? (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRaceFilter('all')}
                  className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                    raceFilter === 'all'
                      ? 'bg-zinc-100 text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All Cities
                </button>
                {RACES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRaceFilter(r.id)}
                    className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                      raceFilter === r.id
                        ? 'bg-zinc-100 text-zinc-950 font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {r.city}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
                {entries.length === 0 ? (
                  <div className="p-6 text-center text-sm text-zinc-400">
                    No lap times recorded yet for this city.
                  </div>
                ) : (
                  entries.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                        entry.playerId === profile.playerId
                          ? 'bg-amber-500/15 text-amber-200 font-semibold'
                          : 'text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono-num text-xs text-zinc-400 w-6">#{idx + 1}</span>
                        <span className="truncate">{entry.playerName}</span>
                        <span className="text-xs text-zinc-500 hidden sm:inline">
                          · {entry.city} · {entry.platform}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 font-mono-num text-xs shrink-0">
                        <span className="text-zinc-400">{entry.knockouts} KO</span>
                        <span className="text-amber-400 font-bold">{entry.timeSeconds.toFixed(2)}s</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-5">
              {/* Active Room Panel */}
              {activeRoom ? (
                <div className="p-4 rounded-lg bg-zinc-900 border border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase text-amber-400 font-semibold">
                        Connected WebSocket Room
                      </div>
                      <h3 className="font-display text-xl font-bold text-white">
                        {activeRoom.name} · {RACES[activeRoom.raceId]?.city}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={onStartRoomRace}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-sm uppercase cursor-pointer"
                    >
                      Launch Multiplayer Race
                    </button>
                  </div>
                  <div className="text-xs text-zinc-300">
                    Players in room ({activeRoom.players.length} humans + {Math.max(0, 11 - activeRoom.players.length)} AI = 11 Grid):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeRoom.players.map((p) => (
                      <span
                        key={p.id}
                        className="px-2.5 py-1 rounded bg-zinc-800 text-xs text-zinc-100"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onCreateRoom(roomName.trim() || 'Global Race Room', roomRaceId);
                  }}
                  className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row gap-2.5"
                >
                  <label className="sr-only" htmlFor="room-name-input">
                    Room Name
                  </label>
                  <input
                    id="room-name-input"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Room Name"
                    className="flex-1 px-3 py-2 rounded-md bg-zinc-950 border border-zinc-700 text-sm text-white"
                  />
                  <label className="sr-only" htmlFor="room-race-select">
                    Select City
                  </label>
                  <select
                    id="room-race-select"
                    value={roomRaceId}
                    onChange={(e) => setRoomRaceId(Number(e.target.value))}
                    className="px-3 py-2 rounded-md bg-zinc-950 border border-zinc-700 text-sm text-white"
                  >
                    {RACES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.city} ({r.season})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Create Room
                  </button>
                </form>
              )}

              {/* Open Cross-Platform Rooms */}
              <div className="space-y-2.5">
                <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400" />
                  Live Cross-Platform Rooms
                </h3>
                <div className="space-y-2">
                  {rooms.map((rm) => (
                    <div
                      key={rm.roomId}
                      className="flex items-center justify-between p-3.5 rounded-lg bg-zinc-900 border border-zinc-800"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">{rm.name}</div>
                        <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                          <span>{RACES[rm.raceId]?.city}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {rm.players.length}/11 Humans
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onJoinRoom(rm.roomId)}
                        className="px-3.5 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white cursor-pointer"
                      >
                        Join Room
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
