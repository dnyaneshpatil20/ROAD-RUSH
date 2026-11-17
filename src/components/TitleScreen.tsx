import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Shield, ShoppingBag, Trophy, Users } from 'lucide-react';
import { RACES } from '../game/catalog';
import type { PlayerProfile } from '../game/types';
import { RoadRushLogoSvg } from './Icons';

interface TitleScreenProps {
  selectedRaceId: number;
  profile: PlayerProfile;
  onSelectRace: (raceId: number) => void;
  onStartRace: () => void;
  onOpenGarage: () => void;
  onOpenChallenges: () => void;
  onOpenMultiplayer: () => void;
}

const RACES_PER_PAGE = 6;

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedRaceId,
  profile,
  onSelectRace,
  onStartRace,
  onOpenGarage,
  onOpenChallenges,
  onOpenMultiplayer,
}) => {
  const activeRace = RACES[selectedRaceId] ?? RACES[0];
  const totalPages = Math.ceil(RACES.length / RACES_PER_PAGE);
  const [stagePage, setStagePage] = useState<number>(() =>
    Math.floor(selectedRaceId / RACES_PER_PAGE),
  );

  useEffect(() => {
    setStagePage(Math.floor(selectedRaceId / RACES_PER_PAGE));
  }, [selectedRaceId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.body.dataset.state !== 'title') return;
      if (e.key === 'Enter' || e.key === ' ') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
        e.preventDefault();
        onStartRace();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStartRace]);

  const pageStart = stagePage * RACES_PER_PAGE;
  const visibleRaces = RACES.slice(pageStart, pageStart + RACES_PER_PAGE);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-5 md:p-8">
      {/* Subtle left contrast scrim over live 3D scene for crisp typography */}
      <div
        className="fixed inset-y-0 left-0 w-full md:w-[560px] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(9,9,11,0.88) 0%, rgba(9,9,11,0.62) 66%, rgba(9,9,11,0) 100%)',
        }}
      />

      {/* Top row: Brand Emblem + Coins / Rider Name / Tiers */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="pointer-events-auto max-w-md">
          <RoadRushLogoSvg className="w-72 md:w-[360px] h-auto" />
        </div>

        <div
          className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-zinc-100"
          style={{
            backgroundColor: 'rgba(15, 17, 23, 0.85)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <span className="text-zinc-300 font-semibold">{profile.name}</span>
          <span className="hidden sm:inline text-zinc-600" aria-hidden="true">·</span>
          <span className="hidden sm:inline text-zinc-300 font-mono-num text-xs">
            Wpn Mk.{profile.weaponTier} · Boost T{profile.boosterTier}
          </span>
          <span className="text-zinc-600" aria-hidden="true">·</span>
          <span className="font-mono-num text-amber-400 font-bold">
            {profile.coins.toLocaleString()} RC
          </span>
        </div>
      </div>

      {/* Left-third Focus Panel: 22-City Paginated Stage Selector + Primary Start CTA */}
      <div className="relative z-10 max-w-md pointer-events-auto space-y-4 my-auto">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold tracking-widest uppercase text-amber-400">
            Race {activeRace.raceNumber} of {RACES.length} · {activeRace.season} · {activeRace.difficulty}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight">
            {activeRace.city} — {activeRace.landmark}
          </h1>
          <p className="text-sm text-zinc-300 leading-relaxed">
            11 riders · {(activeRace.lengthMeters / 1000).toFixed(1)} km lap · Hit Road Boosters &amp; Petrol Cans to finish 1st.
          </p>
        </div>

        {/* 22-Race World Tour Paginated Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span className="font-semibold uppercase tracking-wider text-zinc-400">
              World Tour Stages ({pageStart + 1}–{Math.min(RACES.length, pageStart + RACES_PER_PAGE)} of {RACES.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous Stages"
                disabled={stagePage === 0}
                onClick={() => setStagePage((p) => Math.max(0, p - 1))}
                className="w-7 h-7 rounded bg-zinc-900/90 border border-zinc-700/80 flex items-center justify-center text-zinc-200 disabled:opacity-35 hover:bg-zinc-800 cursor-pointer disabled:cursor-default"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono-num px-1.5 text-[11px] text-zinc-400">
                {stagePage + 1}/{totalPages}
              </span>
              <button
                type="button"
                aria-label="Next Stages"
                disabled={stagePage >= totalPages - 1}
                onClick={() => setStagePage((p) => Math.min(totalPages - 1, p + 1))}
                className="w-7 h-7 rounded bg-zinc-900/90 border border-zinc-700/80 flex items-center justify-center text-zinc-200 disabled:opacity-35 hover:bg-zinc-800 cursor-pointer disabled:cursor-default"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Select Race">
            {visibleRaces.map((race) => {
              const locked = race.id > profile.highestUnlockedRace;
              const selected = race.id === selectedRaceId;
              return (
                <button
                  key={race.id}
                  type="button"
                  disabled={locked}
                  onClick={() => onSelectRace(race.id)}
                  title={
                    locked
                      ? `Win Race ${race.raceNumber - 1} to unlock ${race.city}`
                      : `${race.city} (${race.season} · ${race.difficulty})`
                  }
                  className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-md text-center transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                    selected
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-md cursor-pointer'
                      : locked
                        ? 'bg-zinc-900/70 text-zinc-500 cursor-not-allowed border border-zinc-800'
                        : 'bg-zinc-900/90 text-zinc-200 hover:bg-zinc-800 border border-zinc-700/80 cursor-pointer'
                  }`}
                >
                  <span className="font-display text-sm font-bold leading-none">
                    {race.raceNumber}
                  </span>
                  <span className="text-[9px] mt-1 truncate max-w-full">
                    {locked ? (
                      <Lock className="w-3 h-3 mx-auto" aria-label="Locked" />
                    ) : (
                      race.city.split(' ')[0]
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Start Action */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onStartRace}
            className="w-full py-3.5 px-6 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-zinc-950 font-display text-lg font-bold tracking-wide uppercase transition-all cursor-pointer shadow-lg focus-visible:outline-2 focus-visible:outline-white"
          >
            Start Race {activeRace.raceNumber} — {activeRace.city}
          </button>

          {/* Compact Secondary Hub Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onOpenGarage}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
              style={{
                backgroundColor: 'rgba(20, 22, 28, 0.9)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="whitespace-nowrap">Garage</span>
            </button>
            <button
              type="button"
              onClick={onOpenChallenges}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
              style={{
                backgroundColor: 'rgba(20, 22, 28, 0.9)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="whitespace-nowrap">Tour & Daily</span>
            </button>
            <button
              type="button"
              onClick={onOpenMultiplayer}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
              style={{
                backgroundColor: 'rgba(20, 22, 28, 0.9)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="whitespace-nowrap">Online & Ranks</span>
            </button>
          </div>
        </div>
      </div>

      {/* Single flat bottom control hint */}
      <div className="relative z-10 flex items-center justify-between text-xs text-zinc-300/90">
        <p className="tracking-wide">
          ←/→ or Tilt Steer · W/S Gas/Brake · A/D Left/Right Kick · Space Hit · B Brick · Q Shift Tool · Hit Boosters &amp; Petrol Cans
        </p>
        <div className="hidden md:flex items-center gap-1.5 text-zinc-400">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>Cloud Sync: {profile.syncCode}</span>
        </div>
      </div>
    </div>
  );
};
