import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  Fuel,
  Pause,
  RefreshCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { MELEE_WEAPONS, WEAPONS } from '../game/catalog';
import type { HudTelemetry, RaceTrackDef } from '../game/types';
import { WeaponSvg } from './Icons';

interface RaceHUDProps {
  hud: HudTelemetry;
  race: RaceTrackDef;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onToggleGyro: () => void;
  onTouchControl: (
    control: 'throttle' | 'brake' | 'steerLeft' | 'steerRight',
    pressed: boolean,
  ) => void;
  onAttackMelee: () => void;
  onThrowBrick: () => void;
  onShiftTool: () => void;
}

function formatRaceTime(sec: number): string {
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${String(mins).padStart(2, '0')}:${rem.toFixed(1).padStart(4, '0')}`;
}

export const RaceHUD: React.FC<RaceHUDProps> = ({
  hud,
  race,
  muted,
  onToggleMute,
  onPause,
  onToggleGyro,
  onTouchControl,
  onAttackMelee,
  onThrowBrick,
  onShiftTool,
}) => {
  const meleeDef = WEAPONS[hud.meleeWeapon];
  const nextIdx = (MELEE_WEAPONS.indexOf(hud.meleeWeapon) + 1) % MELEE_WEAPONS.length;
  const nextMeleeDef = WEAPONS[MELEE_WEAPONS[nextIdx]];

  const hpPips = 5;
  const hpPerPip = hud.maxHp / hpPips;
  const fuelPct = Math.max(0, Math.min(100, Math.round((hud.fuel / Math.max(1, hud.maxFuel)) * 100)));
  const fuelCritical = fuelPct < 20;
  const fuelLow = fuelPct < 35;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 md:p-5">
      {/* TOP BAR CLUSTER: Position / Lap / Timer (Left) · Utility & Minimap (Right) */}
      <div className="flex items-start justify-between gap-3">
        <div
          className="px-3.5 py-2.5 rounded-lg flex items-center gap-4"
          style={{
            backgroundColor: 'rgba(12, 14, 20, 0.78)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              Pos
            </div>
            <div className="font-display text-2xl md:text-3xl font-bold text-amber-400 font-mono-num leading-none">
              {hud.rank}
              <span className="text-sm text-zinc-400">/{hud.totalRacers}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              Lap 1/1
            </div>
            <div className="font-mono-num text-lg md:text-xl font-bold text-white leading-none mt-0.5">
              {hud.progressPct}%
            </div>
          </div>
          <div className="hidden sm:block h-8 w-px bg-white/10" />
          <div className="hidden sm:block">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              #{race.raceNumber} {race.city} · {race.season}
            </div>
            <div className="font-mono-num text-xs font-semibold text-zinc-200 mt-0.5">
              {formatRaceTime(hud.elapsedTime)} · KO {hud.knockouts} · Wpn Mk.{hud.weaponTier} · Boost T{hud.boosterTier}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleGyro();
              }}
              aria-label={hud.gyroEnabled ? 'Disable Gyroscope Steering' : 'Enable Gyroscope Steering'}
              title={
                hud.gyroSupported
                  ? hud.gyroEnabled
                    ? `Gyro ON (${hud.gyroTiltDeg}°)`
                    : 'Enable Phone Tilt Steering'
                  : 'Gyroscope Unavailable on Desktop'
              }
              className={`h-10 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                hud.gyroEnabled
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-200 hover:bg-zinc-800'
              }`}
              style={
                hud.gyroEnabled
                  ? undefined
                  : {
                      backgroundColor: 'rgba(12, 14, 20, 0.82)',
                      border: '1px solid rgba(255,255,255,0.14)',
                    }
              }
            >
              <Compass className="w-4 h-4" />
              <span className="hidden sm:inline">
                {hud.gyroEnabled ? `Tilt ${hud.gyroTiltDeg}°` : 'Gyro'}
              </span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-100 hover:bg-zinc-800 cursor-pointer"
              style={{
                backgroundColor: 'rgba(12, 14, 20, 0.82)',
                border: '1px solid rgba(255,255,255,0.14)',
              }}
            >
              {muted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Pause Race"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-100 hover:bg-zinc-800 cursor-pointer"
              style={{
                backgroundColor: 'rgba(12, 14, 20, 0.82)',
                border: '1px solid rgba(255,255,255,0.14)',
              }}
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          <div
            className="hidden sm:block relative w-14 h-28 rounded-lg overflow-hidden"
            style={{
              backgroundColor: 'rgba(12, 14, 20, 0.78)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            aria-label="Track Radar"
          >
            <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-5 bg-zinc-800/80 rounded-sm" />
            {hud.minimapRacers.map((mr, i) => (
              <div
                key={i}
                className={`absolute rounded-full -translate-x-1/2 translate-y-1/2 ${
                  mr.isPlayer ? 'w-2.5 h-2.5 bg-amber-400 z-10' : 'w-1.5 h-1.5 bg-red-400/90'
                }`}
                style={{
                  left: `${50 + mr.xNorm * 28}%`,
                  bottom: `${8 + mr.zNorm * 84}%`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* TOP-CENTER SKY BAND: Callouts, Turbo Boost & Petrol Alerts kept above road & bike */}
      <div className="fixed inset-x-0 top-16 sm:top-20 lg:top-4 z-10 pointer-events-none flex flex-col items-center justify-start px-4 gap-1.5">
        {hud.countdownText && (
          <div className="font-display text-5xl md:text-6xl font-bold text-amber-400 hud-stroke tracking-wider leading-none">
            {hud.countdownText}
          </div>
        )}
        {!hud.countdownText && hud.calloutText && (
          <div className="px-3.5 py-1 rounded-md bg-zinc-950/75 border border-amber-400/40 font-display text-lg md:text-xl font-bold text-amber-400 tracking-wide shadow-md">
            {hud.calloutText}
          </div>
        )}
        {!hud.countdownText && hud.boostActive && (
          <div className="px-3 py-1 rounded-md bg-cyan-500/95 text-zinc-950 text-xs font-display font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
            <Flame className="w-3.5 h-3.5" />
            TURBO BOOST · {hud.boostTimer.toFixed(1)}s
          </div>
        )}
        {!hud.countdownText && fuelPct === 0 && (
          <div className="px-3 py-1 rounded-md bg-red-600/95 text-white text-xs font-bold uppercase tracking-wider shadow-md">
            OUT OF PETROL — STEER INTO RED CANS!
          </div>
        )}
        {!hud.countdownText && fuelPct > 0 && fuelCritical && (
          <div className="px-3 py-1 rounded-md bg-red-600/95 text-white text-xs font-bold uppercase tracking-wider shadow-md">
            LOW PETROL ({fuelPct}%) — HIT RED CANS
          </div>
        )}
        {hud.nearbyWarning && (
          <div className="px-3 py-1 rounded-md bg-red-600/95 text-white text-xs font-bold uppercase tracking-wider shadow-md">
            {hud.nearbyWarning === 'left' ? '← Rival Attacking Left' : 'Rival Attacking Right →'}
          </div>
        )}
      </div>

      {/* BOTTOM CORNERS: Left (Speed/HP/Petrol + Gas/Brake/Steer) · Right (Throw Brick + Shift Tool + Direct Hit) */}
      <div className="flex items-end justify-between gap-2">
        {/* BOTTOM-LEFT: Speedometer + Stability Pips + Petrol Gauge + Gas / Brake */}
        <div className="flex flex-col items-start gap-2 min-w-0">
          <div
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg flex items-center gap-3 sm:gap-4"
            style={{
              backgroundColor: 'rgba(12, 14, 20, 0.80)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div>
              <span className="font-display text-2xl sm:text-4xl font-bold text-white font-mono-num leading-none">
                {hud.speedKmh}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 ml-1">KM/H</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                Stability
              </span>
              <div className="flex items-center gap-1" aria-label={`Stability ${hud.hp} of ${hud.maxHp}`}>
                {Array.from({ length: hpPips }).map((_, idx) => {
                  const filled = hud.hp >= (idx + 1) * hpPerPip - 5;
                  const cracked = !filled && hud.hp > idx * hpPerPip;
                  return (
                    <span
                      key={idx}
                      className={`w-3 sm:w-3.5 h-2 sm:h-2.5 rounded-xs ${
                        filled
                          ? 'bg-emerald-400'
                          : cracked
                            ? 'bg-amber-400'
                            : 'bg-zinc-700'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1 min-w-[68px] sm:min-w-[82px]" aria-label={`Petrol ${fuelPct}%`}>
              <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold">
                <span className={`flex items-center gap-1 ${fuelCritical ? 'text-red-400' : fuelLow ? 'text-amber-400' : 'text-zinc-400'}`}>
                  <Fuel className="w-3 h-3" />
                  Petrol
                </span>
                <span className={`font-mono-num ${fuelCritical ? 'text-red-400 font-bold' : fuelLow ? 'text-amber-300' : 'text-zinc-200'}`}>
                  {fuelPct}%
                </span>
              </div>
              <div className="h-2 sm:h-2.5 w-full rounded-xs bg-zinc-700 overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    fuelCritical ? 'bg-red-500' : fuelLow ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${fuelPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Mobile Steer Buttons */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:hidden">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Steer Left"
              onPointerDown={() => onTouchControl('steerLeft', true)}
              onPointerUp={() => onTouchControl('steerLeft', false)}
              onPointerLeave={() => onTouchControl('steerLeft', false)}
              className="w-14 h-10 rounded-lg flex items-center justify-center text-white bg-zinc-900/85 border border-white/15"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Steer Right"
              onPointerDown={() => onTouchControl('steerRight', true)}
              onPointerUp={() => onTouchControl('steerRight', false)}
              onPointerLeave={() => onTouchControl('steerRight', false)}
              className="w-14 h-10 rounded-lg flex items-center justify-center text-white bg-zinc-900/85 border border-white/15"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              tabIndex={-1}
              onPointerDown={() => onTouchControl('brake', true)}
              onPointerUp={() => onTouchControl('brake', false)}
              onPointerLeave={() => onTouchControl('brake', false)}
              onPointerCancel={() => onTouchControl('brake', false)}
              className="h-11 sm:h-12 px-3 sm:px-4 rounded-lg bg-red-600/90 active:bg-red-500 text-white font-display font-bold text-xs sm:text-sm uppercase tracking-wider cursor-pointer border border-red-400/40"
            >
              Brake
            </button>
            <button
              type="button"
              tabIndex={-1}
              onPointerDown={() => onTouchControl('throttle', true)}
              onPointerUp={() => onTouchControl('throttle', false)}
              onPointerLeave={() => onTouchControl('throttle', false)}
              onPointerCancel={() => onTouchControl('throttle', false)}
              className="h-11 sm:h-12 px-4 sm:px-5 rounded-lg bg-emerald-600/90 active:bg-emerald-500 text-white font-display font-bold text-xs sm:text-sm uppercase tracking-wider cursor-pointer border border-emerald-400/40"
            >
              Gas
            </button>
          </div>
        </div>

        {/* BOTTOM-RIGHT: Direct Brick Throw + Shift Melee Tool + Direct Melee Hit */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Direct Throw Brick Action */}
            <button
              type="button"
              tabIndex={-1}
              onPointerDown={(e) => {
                e.currentTarget.blur();
                onThrowBrick();
              }}
              aria-label="Throw Road Brick"
              className="relative overflow-hidden flex items-center gap-1.5 px-2.5 py-2 sm:px-3.5 rounded-lg text-white hover:bg-orange-600 active:scale-95 transition-all cursor-pointer bg-orange-700/90 border border-orange-400/40"
            >
              <WeaponSvg id="brick" className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <div className="text-left">
                <div className="text-[11px] sm:text-xs font-bold leading-tight whitespace-nowrap">
                  <span className="hidden sm:inline">[B] </span>Throw Brick
                </div>
              </div>
              {hud.brickCooldownPct > 0.02 && (
                <span
                  className="absolute inset-y-0 left-0 bg-zinc-950/35 pointer-events-none"
                  style={{ width: `${Math.round(hud.brickCooldownPct * 100)}%` }}
                />
              )}
            </button>

            {/* Shift Melee Tool (Cycles Rod -> Chain -> Ball) */}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onShiftTool();
              }}
              aria-label={`Shift Melee Tool (Next: ${nextMeleeDef.name})`}
              className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 rounded-lg text-zinc-100 hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
              style={{
                backgroundColor: 'rgba(12, 14, 20, 0.86)',
                border: '1px solid rgba(255,255,255,0.16)',
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <div className="text-left">
                <div className="text-[11px] sm:text-xs font-bold leading-tight whitespace-nowrap">
                  <span className="hidden sm:inline">[Q] </span>Shift Tool
                </div>
                <div className="hidden sm:block text-[10px] text-zinc-400 leading-tight whitespace-nowrap">
                  Next: {nextMeleeDef.name}
                </div>
              </div>
            </button>
          </div>

          {/* Primary Direct Melee Strike Button (hits nearest left or right opponent) */}
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => {
              e.currentTarget.blur();
              onAttackMelee();
            }}
            aria-label={`Hit Opponent with ${meleeDef.name}`}
            className="relative overflow-hidden h-12 sm:h-14 px-4 sm:px-6 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-display font-bold text-sm sm:text-base uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <WeaponSvg id={hud.meleeWeapon} className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>HIT · {meleeDef.name}</span>
            {hud.weaponCooldownPct > 0.02 && (
              <span
                className="absolute inset-y-0 left-0 bg-zinc-950/35 pointer-events-none"
                style={{ width: `${Math.round(hud.weaponCooldownPct * 100)}%` }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
