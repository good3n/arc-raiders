import React, { useState } from 'react'

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

const ItemCard = ({ item, isWeapon = false }: { item: any; isWeapon?: boolean }) => {
  const [selectedLevel, setSelectedLevel] = useState(0)

  console.log(item)

  // Get the currently selected level data (for weapons)
  const currentLevel = isWeapon ? item.levels?.[selectedLevel] || item.levels?.[0] : null

  // Determine values based on whether it's a weapon with levels or a regular item
  const baseName = item.baseName || item.name || item.title || item.displayName || 'Unknown Item'
  const subtitle = item.rarity || item.type || item.category || item.tier || ''
  const subcategory = item.subcategory || item.item_type || ''
  const description = item.description || item.flavor_text || item.notes || ''
  const icon = currentLevel?.icon || item.icon || item.image || '/images/noimage.png'
  const value = currentLevel?.value || item.value || item.stat_block?.value || null
  const workbench = currentLevel?.workbench || item.workbench || null
  const ammoType = item.ammoType || item.ammo_type || null

  // Get stats from the current level (weapons) or item
  const stats = currentLevel?.stats || item.stat_block || {}
  const modifiers = currentLevel?.modifiers || {}
  const hasDirectOverrides = currentLevel?.hasDirectOverrides || {}

  const {
    weight,
    damage,
    damagePerSecond,
    fireRate,
    magazineSize,
    range,
    stability,
    agility,
    firingMode,
    stealth,
    movementPenalty,
    healingPerSecond,
    stackSize,
    radius,
    raiderStun,
    arcStun,
    staminaPerSecond,
    duration,
    reducedReloadTime,
    damageMitigation,
    durability,
    shieldCharge,
  } = stats

  // Get modifiers from the current level
  const {
    increasedFireRate,
    reducedReloadTime: modifierReducedReloadTime,
    reducedMaxShotDispersion,
    reducedPerShotDispersion,
    reducedDispersionRecoveryTime,
    increasedBulletVelocity,
    reducedDurabilityBurnRate,
  } = modifiers

  // Get base weapon magazine size for comparison (weapons only)
  const baseMagazineSize = isWeapon ? item.levels?.[0]?.stats?.magazineSize : null
  const hasMagazineUpgrade = magazineSize && baseMagazineSize && magazineSize > baseMagazineSize

  // Check if fireRate has a direct override (weapons only)
  const hasDirectFireRateOverride = hasDirectOverrides?.fireRate

  const addCommas = (value: number) => {
    return value.toLocaleString()
  }

  // Reusable component for stat rows
  const StatRow = ({
    label,
    value,
    suffix = '',
    negative = false,
  }: {
    label: string
    value: any
    suffix?: string
    negative?: boolean
  }) => {
    if (!value) return null
    return (
      <div className="flex items-center justify-between py-1 font-medium text-[#130918]">
        <span className="font-semibold">{label}&nbsp;</span>
        <span>
          {negative ? `-${value}` : value}
          {suffix}
        </span>
      </div>
    )
  }

  const StatRowBar = ({
    label,
    value,
    max = 100,
    isModified = false,
  }: {
    label: string
    value: any
    max?: number
    isModified?: boolean
  }) => {
    if (!value) return null

    // Ensure value is a number and calculate percentage
    const numValue = typeof value === 'number' ? value : parseFloat(value)
    const percentage = Math.min((numValue / max) * 100, 100)

    return (
      <div className="flex flex-col font-medium text-[#130918]">
        <span className="text-sm font-semibold">
          {label}&nbsp;({numValue.toFixed ? numValue.toFixed(1) : numValue}){isModified && ' ✨'}
        </span>
        <span className="mt-1 block w-full">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#CAC1AF]">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isModified ? 'bg-itemGreen' : 'bg-[#130918]'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </span>
      </div>
    )
  }

  return (
    <article className="relative w-full overflow-hidden rounded-xl bg-light p-4 pb-16">
      <header className="flex items-start justify-between gap-3">
        <div className="flex gap-2">
          <div className={`item-icon-wrap h-16 w-16 shrink-0 ${String(subtitle).toLowerCase()}`}>
            <img src={icon} alt={baseName} className="block h-full w-full object-contain" />
          </div>
          <div>
            {subtitle || subcategory ? (
              <div className="flex items-center gap-2">
                {subtitle ? (
                  <div className={`item-tag !text-dark ${String(subtitle).toLowerCase()}`}>
                    {String(subtitle)}
                  </div>
                ) : null}
                {subcategory && subcategory !== subtitle ? (
                  <div className={`item-tag !text-dark ${String(subcategory).toLowerCase()}`}>
                    {String(subcategory)}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="mt-1 text-xl font-bold text-dark">{String(baseName).toUpperCase()}</div>
          </div>
        </div>
      </header>
      <p
        className="mt-2 font-medium text-dark"
        dangerouslySetInnerHTML={{ __html: description }}
      ></p>

      {/* Level Selector (Weapons Only) */}
      {isWeapon && item.levels && item.levels.length > 1 && (
        <div className="mt-3 flex items-center gap-1">
          {item.levels.map((level: any, idx: number) => {
            return (
              <button
                key={level.id || idx}
                onClick={() => setSelectedLevel(idx)}
                className={classNames(
                  'flex aspect-square h-8 w-8 shrink-0 items-center justify-center rounded-md font-medium transition-all',
                  idx === selectedLevel
                    ? 'bg-dark text-light'
                    : 'bg-[#CAC1AF] text-[#130918] hover:bg-[#B1A793]'
                )}
              >
                {level.level}
              </button>
            )
          })}
        </div>
      )}

      {/* Primary stat rows for weapons */}
      {isWeapon && (ammoType || magazineSize || firingMode) && (
        <div className="mt-4 flex flex-col divide-y divide-[#E4DAC9]">
          <StatRow
            label="Ammo Type"
            value={ammoType ? ammoType.charAt(0).toUpperCase() + ammoType.slice(1) : null}
          />
          <StatRow
            label="Magazine Size"
            value={magazineSize}
            suffix={hasMagazineUpgrade ? ' ✨' : ''}
          />
          <StatRow label="Firing Mode" value={firingMode} />
        </div>
      )}

      {/* Stat bars for weapons */}
      {isWeapon && (damage || fireRate || range || stability || agility || stealth) && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatRowBar label="Damage" value={damage} />
          <StatRowBar
            label="Fire Rate"
            value={fireRate}
            isModified={!!increasedFireRate || hasDirectFireRateOverride}
          />
          <StatRowBar label="Range" value={range} />
          <StatRowBar
            label="Stability"
            value={stability}
            isModified={!!reducedMaxShotDispersion || !!reducedPerShotDispersion}
          />
          <StatRowBar label="Agility" value={agility} />
          <StatRowBar label="Stealth" value={stealth} />
        </div>
      )}

      {/* DPS for weapons */}
      {isWeapon && damagePerSecond ? (
        <div className="mt-3">
          <StatRowBar
            label="DPS"
            value={damagePerSecond}
            max={500}
            isModified={!!increasedFireRate}
          />
        </div>
      ) : null}

      {/* Modifier Stats for weapons */}
      {isWeapon &&
        (modifierReducedReloadTime ||
          increasedBulletVelocity ||
          reducedDurabilityBurnRate ||
          reducedMaxShotDispersion ||
          reducedDispersionRecoveryTime) && (
          <div className="mt-3 flex flex-col gap-2">
            {modifierReducedReloadTime ? (
              <StatRow label="Reload Time" value={modifierReducedReloadTime} suffix="% faster" />
            ) : null}
            {increasedBulletVelocity ? (
              <StatRow label="Bullet Velocity" value={increasedBulletVelocity} suffix="% faster" />
            ) : null}
            {reducedDurabilityBurnRate ? (
              <StatRow label="Durability" value={reducedDurabilityBurnRate} suffix="% better" />
            ) : null}
            {reducedMaxShotDispersion ? (
              <StatRow label="Accuracy" value={reducedMaxShotDispersion} suffix="% better" />
            ) : null}
            {reducedDispersionRecoveryTime ? (
              <StatRow
                label="Recovery Time"
                value={reducedDispersionRecoveryTime}
                suffix="% faster"
              />
            ) : null}
          </div>
        )}

      {/* Regular item stats */}
      {!isWeapon &&
        (movementPenalty ||
          healingPerSecond ||
          radius ||
          raiderStun ||
          arcStun ||
          damage ||
          damagePerSecond ||
          staminaPerSecond ||
          duration ||
          fireRate ||
          magazineSize ||
          range ||
          reducedReloadTime ||
          stability ||
          stealth ||
          damageMitigation ||
          durability ||
          shieldCharge ||
          workbench) && (
          <div className="mt-4 flex flex-col divide-y divide-[#E4DAC9]">
            {movementPenalty ? (
              <StatRow label="Movement Penalty" value={movementPenalty} suffix="%" negative />
            ) : null}
            {workbench ? <StatRow label="Crafted" value={workbench} /> : null}
            {healingPerSecond ? (
              <StatRow label="Healing Per Second" value={healingPerSecond} />
            ) : null}
            {radius ? <StatRow label="Radius" value={radius} suffix="m" /> : null}
            {raiderStun ? <StatRow label="Raider Stun" value={raiderStun} /> : null}
            {arcStun ? <StatRow label="Arc Stun" value={arcStun} /> : null}
            {damage ? <StatRow label="Damage" value={damage} /> : null}
            {damagePerSecond ? <StatRow label="Damage Per Second" value={damagePerSecond} /> : null}
            {staminaPerSecond ? (
              <StatRow label="Stamina Per Second" value={staminaPerSecond} />
            ) : null}
            {duration ? <StatRow label="Duration" value={duration} suffix="s" /> : null}
            {ammoType && !isWeapon ? (
              <StatRow
                label="Ammo Type"
                value={ammoType.charAt(0).toUpperCase() + ammoType.slice(1)}
              />
            ) : null}
            {fireRate ? <StatRow label="Fire Rate" value={fireRate} /> : null}
            {magazineSize ? <StatRow label="Magazine Size" value={magazineSize} /> : null}
            {range ? <StatRow label="Range" value={range} suffix="m" /> : null}
            {reducedReloadTime ? (
              <StatRow label="Reduced Reload Time" value={reducedReloadTime} suffix="%" />
            ) : null}
            {stability ? <StatRow label="Stability" value={stability} /> : null}
            {stealth ? <StatRow label="Stealth" value={stealth} /> : null}
            {damageMitigation ? (
              <StatRow label="Damage Mitigation" value={damageMitigation} suffix="%" />
            ) : null}
            {durability ? <StatRow label="Durability" value={durability} /> : null}
            {shieldCharge ? <StatRow label="Shield Charge" value={shieldCharge} /> : null}
          </div>
        )}

      {/* Footer with weight/value/stackSize */}
      {(() => {
        const footerItemCount = [weight, value, stackSize].filter(Boolean).length
        if (footerItemCount === 0) return null

        const gridCols =
          footerItemCount === 1
            ? 'grid-cols-1'
            : footerItemCount === 2
              ? 'grid-cols-2'
              : 'grid-cols-3'

        return (
          <footer
            className={`absolute bottom-0 left-0 right-0 -mx-4 mt-2 grid ${gridCols} items-center gap-2 divide-x divide-light bg-[#CDC2B0]`}
          >
            {weight ? (
              <span
                className="flex items-center justify-center px-3 py-3 font-bold text-dark"
                title="Weight"
              >
                <img
                  src="https://cdn.metaforge.app/arc-raiders/icons/weightKg.webp"
                  alt="Weight"
                  className="mr-1 block h-4 w-4"
                />
                {weight}
              </span>
            ) : null}
            {value ? (
              <span
                className="flex items-center justify-center px-3 py-3 font-bold text-dark"
                title="Value"
              >
                <img
                  src="https://cdn.metaforge.app/arc-raiders/icons/raider-coin.webp"
                  alt="Value"
                  className="mr-1 block h-4 w-4"
                />
                {addCommas(value)}
              </span>
            ) : null}
            {stackSize ? (
              <span
                className="flex items-center justify-center px-3 py-3 font-bold text-dark"
                title="Stack Size"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  className="mr-1 block h-4 w-4"
                  viewBox="0 0 24 24"
                >
                  <path d="M11.6 1.6h.8L22 6.8a.8.8 0 0 1 0 1.4l-9.7 5.2h-.8L2 8.2a.8.8 0 0 1 0-1.4z" />
                  <path d="m3.3 10.6 7.6 4.1a2 2 0 0 0 2.2 0l7.6-4.1 1.4.7a.8.8 0 0 1 0 1.4l-9.7 5.2h-.8L2 12.7a.8.8 0 0 1 0-1.4z" />
                  <path d="m11 19.2-7.7-4.1-1.4.7a.8.8 0 0 0 0 1.4l9.7 5.2q.4.2.8 0l9.7-5.2a.8.8 0 0 0 0-1.4l-1.4-.7-7.6 4.1a2 2 0 0 1-2.2 0" />
                </svg>
                {stackSize}
              </span>
            ) : null}
          </footer>
        )
      })()}
    </article>
  )
}

export default ItemCard
