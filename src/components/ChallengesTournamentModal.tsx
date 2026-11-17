import React, { useEffect, useState } from 'react';
import { CheckCircle2, Trophy, X } from 'lucide-react';
import { fetchChallenges, fetchTournaments } from '../game/api';
import { DAILY_CHALLENGES } from '../game/catalog';
import type { DailyChallenge, PlayerProfile, TournamentStanding } from '../game/types';

interface ChallengesTournamentModalProps {
  profile: PlayerProfile;
  onClose: () => void;
}

export const ChallengesTournamentModal: React.FC<ChallengesTournamentModalProps> = ({
  profile,
  onClose,
}) => {
  const [challenges, setChallenges] = useState<DailyChallenge[]>(DAILY_CHALLENGES);
  const [standings, setStandings] = useState<TournamentStanding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchChallenges(), fetchTournaments()])
      .then(([ch, st]) => {
        setChallenges(ch);
        setStandings(st);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
      <div
        role="dialog"
        aria-label="Daily Challenges and Global Tournament"
        className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'rgba(15, 17, 23, 0.98)',
          border: '1px solid rgba(255,255,255,0.14)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              Daily Challenges & Global Tournament
            </h2>
            <p className="text-xs text-zinc-400">
              Complete daily combat & speed trials and climb the 5-Season World Tour standings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Tour and Challenges"
            className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto modal-scroll space-y-6">
          {/* Daily Challenges */}
          <section className="space-y-3">
            <h3 className="font-display text-lg font-bold text-white">Active Daily Challenges</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {challenges.map((ch) => {
                const progress = Math.min(ch.target, profile.challengeProgress[ch.id] || 0);
                const done = profile.completedChallenges.includes(ch.id);
                const pct = Math.round((progress / ch.target) * 100);
                return (
                  <div
                    key={ch.id}
                    className={`p-4 rounded-lg border ${
                      done
                        ? 'bg-emerald-950/30 border-emerald-500/40'
                        : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {ch.title}
                          {done && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1">{ch.description}</p>
                      </div>
                      <span className="font-mono-num text-xs font-bold text-amber-400 shrink-0">
                        +{ch.rewardCoins} RC
                      </span>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[11px] font-mono-num text-zinc-400">
                        <span>{done ? 'Completed' : 'Progress'}</span>
                        <span>
                          {progress} / {ch.target}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full ${done ? 'bg-emerald-400' : 'bg-amber-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Global Tournament Standings */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                5-Season Global Tournament Standings
              </h3>
              <span className="font-mono-num text-xs text-zinc-400">
                Your Tour Points: <strong className="text-amber-400">{profile.tournamentPoints}</strong>
              </span>
            </div>

            {loading ? (
              <div className="p-6 text-center text-sm text-zinc-400">
                Loading global tournament rankings...
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
                {standings.map((row, idx) => (
                  <div
                    key={row.playerId}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                      row.playerId === profile.playerId
                        ? 'bg-amber-500/15 text-amber-200 font-semibold'
                        : 'text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono-num text-xs text-zinc-400 w-6">#{idx + 1}</span>
                      <span>{row.playerName}</span>
                      <span className="text-xs text-zinc-500">· {row.tier}</span>
                    </div>
                    <div className="flex items-center gap-5 font-mono-num text-xs">
                      <span className="text-zinc-400">{row.wins} Wins</span>
                      <span className="text-amber-400 font-bold">{row.points} PTS</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
