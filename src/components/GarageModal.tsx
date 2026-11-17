import React, { useState } from 'react';
import { Check, Cloud, Flame, Swords, X } from 'lucide-react';
import {
  BIKE_SKINS,
  BOOSTER_TIERS,
  RIDER_ACCESSORIES,
  WEAPON_TIERS,
} from '../game/catalog';
import type { PlayerProfile } from '../game/types';

interface GarageModalProps {
  profile: PlayerProfile;
  onClose: () => void;
  onPurchaseOrEquip: (
    itemType: 'skin' | 'accessory' | 'coin_pack' | 'weapon_upgrade' | 'booster_upgrade',
    itemId: string,
  ) => Promise<void>;
  onUpdateName: (name: string) => Promise<void>;
  onLoadSyncCode: (code: string) => Promise<void>;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  profile,
  onClose,
  onPurchaseOrEquip,
  onUpdateName,
  onLoadSyncCode,
}) => {
  const [riderName, setRiderName] = useState(profile.name);
  const [syncInput, setSyncInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  const currentWeaponTier =
    WEAPON_TIERS.find((t) => t.tier === profile.weaponTier) ?? WEAPON_TIERS[0];
  const nextWeaponTier = WEAPON_TIERS.find((t) => t.tier === profile.weaponTier + 1);

  const currentBoosterTier =
    BOOSTER_TIERS.find((t) => t.tier === profile.boosterTier) ?? BOOSTER_TIERS[0];
  const nextBoosterTier = BOOSTER_TIERS.find((t) => t.tier === profile.boosterTier + 1);

  const handleAction = async (fn: () => Promise<void>, successMsg: string) => {
    setBusy(true);
    setFeedback('');
    try {
      await fn();
      setFeedback(successMsg);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
      <div
        role="dialog"
        aria-label="Garage, Upgrades, Cosmetic Shop & Cloud Save"
        className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'rgba(15, 17, 23, 0.98)',
          border: '1px solid rgba(255,255,255,0.14)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              Garage, Upgrades &amp; Cosmetic Shop
            </h2>
            <p className="text-xs text-zinc-400">
              Upgrade combat weapons, turbo road boosters, bike skins, and cloud sync.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono-num text-sm font-bold text-amber-400">
              {profile.coins.toLocaleString()} RC
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Garage"
              className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto modal-scroll space-y-6">
          {feedback && (
            <div className="px-3.5 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200">
              {feedback}
            </div>
          )}

          {/* Weapons & Nitro Booster Upgrades */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">
                Upgrades: Weapons &amp; Nitro Booster
              </h3>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  handleAction(
                    () => onPurchaseOrEquip('coin_pack', 'starter-500'),
                    'Claimed +500 Rush Coins sponsor pack!',
                  )
                }
                className="px-3 py-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 cursor-pointer"
              >
                +500 RC Sponsor Pack
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Weapon Tier Card */}
              <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                      <Swords className="w-4 h-4" />
                      Combat Weapons · Mk.{currentWeaponTier.tier}
                    </span>
                    <span className="font-mono-num text-[11px] text-zinc-400">
                      Tier {currentWeaponTier.tier}/5
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white">{currentWeaponTier.name}</div>
                  <div className="text-xs text-zinc-400">{currentWeaponTier.bonusText}</div>
                </div>

                {nextWeaponTier ? (
                  <button
                    type="button"
                    disabled={busy || profile.coins < nextWeaponTier.price}
                    onClick={() =>
                      handleAction(
                        () => onPurchaseOrEquip('weapon_upgrade', String(nextWeaponTier.tier)),
                        `Upgraded Weapons to Mk.${nextWeaponTier.tier} (${nextWeaponTier.name})!`,
                      )
                    }
                    className="w-full py-2 px-3 rounded-md bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold text-xs cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    Upgrade to Mk.{nextWeaponTier.tier} · {nextWeaponTier.price} RC (or Race {nextWeaponTier.autoUnlockRace + 1})
                  </button>
                ) : (
                  <div className="py-2 px-3 rounded-md bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
                    MAX WEAPON TIER UNLOCKED
                  </div>
                )}
              </div>

              {/* Booster Tier Card */}
              <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
                      <Flame className="w-4 h-4" />
                      Nitro Road Booster · T{currentBoosterTier.tier}
                    </span>
                    <span className="font-mono-num text-[11px] text-zinc-400">
                      Tier {currentBoosterTier.tier}/5
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white">{currentBoosterTier.name}</div>
                  <div className="text-xs text-zinc-400">{currentBoosterTier.bonusText}</div>
                </div>

                {nextBoosterTier ? (
                  <button
                    type="button"
                    disabled={busy || profile.coins < nextBoosterTier.price}
                    onClick={() =>
                      handleAction(
                        () => onPurchaseOrEquip('booster_upgrade', String(nextBoosterTier.tier)),
                        `Upgraded Booster to Tier ${nextBoosterTier.tier} (${nextBoosterTier.name})!`,
                      )
                    }
                    className="w-full py-2 px-3 rounded-md bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold text-xs cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    Upgrade to Tier {nextBoosterTier.tier} · {nextBoosterTier.price} RC (or Race {nextBoosterTier.autoUnlockRace + 1})
                  </button>
                ) : (
                  <div className="py-2 px-3 rounded-md bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
                    MAX BOOSTER TIER UNLOCKED
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Bike Skins */}
          <section className="space-y-3">
            <h3 className="font-display text-lg font-bold text-white">Bike Paint &amp; Fairing Skins</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BIKE_SKINS.map((skin) => {
                const owned = profile.ownedSkins.includes(skin.id);
                const equipped = profile.equippedSkinId === skin.id;
                return (
                  <button
                    key={skin.id}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      handleAction(
                        () => onPurchaseOrEquip('skin', skin.id),
                        owned ? `Equipped ${skin.name}` : `Unlocked & equipped ${skin.name}`,
                      )
                    }
                    className={`p-3.5 rounded-lg text-left transition-colors cursor-pointer border ${
                      equipped
                        ? 'bg-amber-500/15 border-amber-400'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-sm border border-white/20 shrink-0"
                          style={{ backgroundColor: skin.primaryColor }}
                        />
                        <span className="text-sm font-semibold text-white">{skin.name}</span>
                      </div>
                      {equipped && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="mt-2 text-xs font-mono-num text-zinc-400">
                      {equipped ? 'Equipped' : owned ? 'Owned · Click to Equip' : `${skin.price} RC`}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Rider Accessories */}
          <section className="space-y-3">
            <h3 className="font-display text-lg font-bold text-white">Rider Helmets &amp; Racing Suits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {RIDER_ACCESSORIES.map((acc) => {
                const owned = profile.ownedAccessories.includes(acc.id);
                const equipped = profile.equippedAccessoryId === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      handleAction(
                        () => onPurchaseOrEquip('accessory', acc.id),
                        owned ? `Equipped ${acc.name}` : `Unlocked & equipped ${acc.name}`,
                      )
                    }
                    className={`p-3.5 rounded-lg text-left transition-colors cursor-pointer border ${
                      equipped
                        ? 'bg-amber-500/15 border-amber-400'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: acc.helmetColor }}
                        />
                        <span className="text-sm font-semibold text-white">{acc.name}</span>
                      </div>
                      {equipped && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="mt-2 text-xs font-mono-num text-zinc-400">
                      {equipped ? 'Equipped' : owned ? 'Owned · Click to Equip' : `${acc.price} RC`}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Cloud Save & Rider Identity */}
          <section className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-amber-400" />
                <h3 className="font-display text-base font-bold text-white">
                  Cross-Platform Cloud Save
                </h3>
              </div>
              <span className="font-mono-num text-xs text-zinc-300">
                Your Sync Code: <strong className="text-amber-400">{profile.syncCode}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!riderName.trim()) return;
                  void handleAction(
                    () => onUpdateName(riderName.trim()),
                    'Rider name saved to Cloud Save.',
                  );
                }}
                className="flex gap-2"
              >
                <label className="sr-only" htmlFor="rider-name-input">
                  Rider Name
                </label>
                <input
                  id="rider-name-input"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  maxLength={18}
                  placeholder="Rider Name"
                  className="flex-1 px-3 py-2 rounded-md bg-zinc-950 border border-zinc-700 text-sm text-white"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="px-3.5 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white cursor-pointer"
                >
                  Save Name
                </button>
              </form>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!syncInput.trim()) return;
                  void handleAction(
                    () => onLoadSyncCode(syncInput.trim()),
                    'Loaded profile from Cloud Sync Code!',
                  );
                }}
                className="flex gap-2"
              >
                <label className="sr-only" htmlFor="sync-code-input">
                  Load Cloud Sync Code
                </label>
                <input
                  id="sync-code-input"
                  value={syncInput}
                  onChange={(e) => setSyncInput(e.target.value)}
                  placeholder="Enter Sync Code (e.g. RR-XXXX)"
                  className="flex-1 px-3 py-2 rounded-md bg-zinc-950 border border-zinc-700 text-sm text-white uppercase"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="px-3.5 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-xs font-bold text-zinc-950 cursor-pointer"
                >
                  Restore
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
