import React from 'react';
import { Flame, ShieldCheck } from 'lucide-react';
import { BOOSTER_TIERS, RACES, WEAPON_TIERS } from '../game/catalog';
import type { RaceResultSnapshot } from '../game/types';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onQuitToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onQuitToTitle,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/65">
      <div
        className="w-full max-w-sm rounded-xl p-6 space-y-5"
        style={{
          backgroundColor: 'rgba(15, 17, 23, 0.96)',
          border: '1px solid rgba(255,255,255,0.14)',
        }}
      >
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
            Race Paused
          </p>
          <h2 className="font-display text-2xl font-bold text-white mt-1">
            Catch Your Breath
          </h2>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold uppercase tracking-wide cursor-pointer"
          >
            Resume Race
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-sm cursor-pointer"
          >
            Restart Lap
          </button>
          <button
            type="button"
            onClick={onQuitToTitle}
            className="w-full py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-sm border border-zinc-800 cursor-pointer"
          >
            Exit to Title
          </button>
        </div>
      </div>
    </div>
  );
};

interface ResultModalProps {
  result: RaceResultSnapshot;
  onNextOrRetry: (raceId: number) => void;
  onBackToTitle: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  result,
  onNextOrRetry,
  onBackToTitle,
}) => {
  const hasNextRace = result.won && result.raceId < RACES.length - 1;
  const nextRace = hasNextRace ? RACES[result.raceId + 1] : null;
  const weaponUpgradeDef = result.upgradedWeaponTier
    ? WEAPON_TIERS.find((t) => t.tier === result.upgradedWeaponTier)
    : undefined;
  const boosterUpgradeDef = result.upgradedBoosterTier
    ? BOOSTER_TIERS.find((t) => t.tier === result.upgradedBoosterTier)
    : undefined;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70">
      <div
        className="w-full max-w-lg rounded-xl p-6 space-y-4 max-h-[92vh] overflow-y-auto modal-scroll"
        style={{
          backgroundColor: 'rgba(15, 17, 23, 0.96)',
          border: '1px solid rgba(255,255,255,0.14)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
              Race #{result.raceId + 1} · {result.city} · {result.season} · {result.difficulty}
            </p>
            <h2 className="font-display text-3xl font-bold text-white mt-1">
              {result.won ? 'Victory — 1st Place!' : `Finished #${result.rank} of ${result.totalRacers}`}
            </h2>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs text-zinc-400 block">Reward</span>
            <span className="font-mono-num text-xl font-bold text-amber-400">
              +{result.coinsEarned} RC
            </span>
            {result.stageBonusCoins > 0 && (
              <span className="block text-[11px] font-mono-num text-emerald-400 font-semibold">
                incl. +{result.stageBonusCoins} Stage Bonus
              </span>
            )}
          </div>
        </div>

        {/* Next-Stage Weapon / Booster Upgrade Banners */}
        {(weaponUpgradeDef || boosterUpgradeDef) && (
          <div className="space-y-2">
            {weaponUpgradeDef && (
              <div className="px-3.5 py-2.5 rounded-lg bg-amber-500/15 border border-amber-400/50 flex items-center gap-2.5 text-xs text-amber-200">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <strong className="uppercase tracking-wider text-amber-300">
                    WEAPONS UPGRADED TO MK.{weaponUpgradeDef.tier}!
                  </strong>{' '}
                  {weaponUpgradeDef.name} ({weaponUpgradeDef.bonusText})
                </div>
              </div>
            )}
            {boosterUpgradeDef && (
              <div className="px-3.5 py-2.5 rounded-lg bg-cyan-500/15 border border-cyan-400/50 flex items-center gap-2.5 text-xs text-cyan-100">
                <Flame className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <strong className="uppercase tracking-wider text-cyan-300">
                    BOOSTER UPGRADED TO TIER {boosterUpgradeDef.tier}!
                  </strong>{' '}
                  {boosterUpgradeDef.name} ({boosterUpgradeDef.bonusText})
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mastery / Endurance Metrics */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] uppercase text-zinc-400">Lap Time</div>
            <div className="font-mono-num text-lg font-bold text-white mt-0.5">
              {result.timeSeconds.toFixed(1)}s
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] uppercase text-zinc-400">Knockouts</div>
            <div className="font-mono-num text-lg font-bold text-white mt-0.5">
              {result.knockouts}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] uppercase text-zinc-400">Top Speed</div>
            <div className="font-mono-num text-lg font-bold text-white mt-0.5">
              {result.topSpeedKmh} km/h
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] uppercase text-zinc-400">Petrol Cans</div>
            <div className="font-mono-num text-lg font-bold text-emerald-400 mt-0.5">
              {result.fuelCollected}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] uppercase text-zinc-400">Road Boosters</div>
            <div className="font-mono-num text-lg font-bold text-cyan-400 mt-0.5">
              {result.boostersHit}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] uppercase text-zinc-400">Brick Hits</div>
            <div className="font-mono-num text-lg font-bold text-orange-400 mt-0.5">
              {result.brickHits}
            </div>
          </div>
        </div>

        {/* Top 6 Standings Preview */}
        <div className="rounded-lg bg-zinc-900/90 border border-zinc-800 divide-y divide-zinc-800/80 max-h-40 overflow-y-auto modal-scroll">
          {result.standings.slice(0, 6).map((row) => (
            <div
              key={row.rank}
              className={`flex items-center justify-between px-3 py-2 text-xs ${
                row.isPlayer ? 'bg-amber-500/15 text-amber-300 font-bold' : 'text-zinc-300'
              }`}
            >
              <span className="font-mono-num">
                #{row.rank} · {row.name}
              </span>
              <span className="font-mono-num">
                {row.timeSeconds ? `${row.timeSeconds.toFixed(1)}s` : 'Racing'}
              </span>
            </div>
          ))}
        </div>

        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          {nextRace ? (
            <button
              type="button"
              data-start="true"
              onClick={() => onNextOrRetry(nextRace.id)}
              className="flex-1 py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold uppercase tracking-wide cursor-pointer"
            >
              Next Race #{nextRace.raceNumber}: {nextRace.city}
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={() => onNextOrRetry(result.raceId)}
              className="flex-1 py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold uppercase tracking-wide cursor-pointer"
            >
              {result.won ? 'Race Again' : 'Try Again (Must Finish 1st)'}
            </button>
          )}
          <button
            type="button"
            onClick={onBackToTitle}
            className="py-3 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-sm cursor-pointer"
          >
            Title Menu
          </button>
        </div>
      </div>
    </div>
  );
};
