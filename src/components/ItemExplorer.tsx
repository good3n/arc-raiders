import React, { useEffect, useMemo, useState } from 'react'

type ItemTabKey = 'all' | string

// Cache configuration
const CACHE_VERSION = 'v1'
const CACHE_NAME = `metaforge-cache-${CACHE_VERSION}`
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

export default function ItemExplorer() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [itemTypeTab, setItemTypeTab] = useState<ItemTabKey>('all')
  const [rarityFilter, setRarityFilter] = useState<string>('all')

  const endpoint = '/data/items.min.json'

  // Load data with caching
  useEffect(() => {
    let ignore = false

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const cacheKey = `${CACHE_NAME}-${endpoint}`
        const cached = localStorage.getItem(cacheKey)

        if (cached) {
          try {
            const { data: cachedData, timestamp } = JSON.parse(cached)
            const age = Date.now() - timestamp

            if (age < CACHE_DURATION) {
              if (!ignore) {
                setData(cachedData)
                setLoading(false)
              }

              // If cache is older than 1 day, refresh in background
              if (age > 24 * 60 * 60 * 1000) {
                fetchAndCache(cacheKey, true)
              }
              return
            }
          } catch (e) {
            // Invalid cache data, remove it
            localStorage.removeItem(cacheKey)
          }
        }

        // Fetch fresh data
        await fetchAndCache(cacheKey, false)
      } catch (e: any) {
        if (!ignore) {
          setError(e.message || 'Failed to load data')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    const fetchAndCache = async (cacheKey: string, background: boolean) => {
      try {
        const res = await fetch(endpoint, {
          headers: { Accept: 'application/json' },
          cache: 'default',
        })

        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`)
        }

        const json = await res.json()

        if (!ignore || background) {
          // Store in localStorage
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                data: json,
                timestamp: Date.now(),
              })
            )
          } catch (e) {
            // localStorage might be full, clear old data
            clearOldCache()
            try {
              localStorage.setItem(
                cacheKey,
                JSON.stringify({
                  data: json,
                  timestamp: Date.now(),
                })
              )
            } catch (e2) {
              console.warn('Failed to cache data:', e2)
            }
          }

          if (!ignore && !background) {
            setData(json)
          }
        }
      } catch (e: any) {
        if (!background) {
          throw e
        }
      }
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [])

  // Clear old cache entries
  const clearOldCache = () => {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('metaforge-cache-') && !key.startsWith(CACHE_NAME)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }

  // Get unique item types
  const itemTypes = useMemo(() => {
    const types = new Set<string>()
    data.forEach((item) => {
      if (
        item.item_type &&
        item.item_type !== 'Misc' &&
        item.item_type !== 'Cosmetic' &&
        item.item_type !== 'Refinement'
      ) {
        // Rename categories
        let type = item.item_type
        if (
          type === 'Quick use' ||
          type === 'Consumable' ||
          type === 'Throwable' ||
          type === 'Explosives'
        ) {
          type = 'Quick Use'
        } else if (type === 'Medical') {
          type = 'Nature'
        } else if (type === 'Modification' || type === 'Modfication') {
          type = 'Mods'
        } else if (type === 'Quest Item') {
          type = 'Key'
        } else if (type === 'Advanced Material') {
          type = 'Refined Material'
        }
        types.add(type)
      }
    })
    return Array.from(types).sort()
  }, [data])

  // Get unique rarities
  const rarities = useMemo(() => {
    const raritySet = new Set<string>()
    data.forEach((item) => {
      if (
        item.rarity &&
        item.item_type !== 'Misc' &&
        item.item_type !== 'Cosmetic' &&
        item.item_type !== 'Refinement'
      ) {
        raritySet.add(item.rarity)
      }
    })

    // Define the sort order
    const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']

    // Sort based on the defined order
    return Array.from(raritySet).sort((a, b) => {
      const aIndex = rarityOrder.findIndex((r) => r.toLowerCase() === a.toLowerCase())
      const bIndex = rarityOrder.findIndex((r) => r.toLowerCase() === b.toLowerCase())

      // If both are in the order array, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }
      // If only one is in the order array, it comes first
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      // If neither is in the order array, sort alphabetically
      return a.localeCompare(b)
    })
  }, [data])

  // Filter data based on search query and item type tab
  const filtered = useMemo(() => {
    let list = data

    // Filter by item type
    if (itemTypeTab !== 'all') {
      list = list.filter((item) => {
        let type = item.item_type
        // Apply same renaming logic
        if (
          type === 'Quick use' ||
          type === 'Consumable' ||
          type === 'Throwable' ||
          type === 'Explosives'
        ) {
          type = 'Quick Use'
        } else if (type === 'Medical') {
          type = 'Nature'
        } else if (type === 'Modification' || type === 'Modfication') {
          type = 'Mods'
        } else if (type === 'Quest Item') {
          type = 'Key'
        } else if (type === 'Advanced Material') {
          type = 'Refined Material'
        }
        return type === itemTypeTab
      })
    }

    // Filter by rarity
    if (rarityFilter !== 'all') {
      list = list.filter((item) => item.rarity === rarityFilter)
    }

    if (!query) return list

    const q = query.toLowerCase()
    return list.filter((item) => {
      // Search in important fields
      const searchable = [
        item.name,
        item.description,
        item.item_type,
        item.rarity,
        item.workbench,
        item.flavor_text,
        item.subcategory,
        item.ammo_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(q)
    })
  }, [data, query, itemTypeTab, rarityFilter])

  return (
    <div className="grid grid-cols-[280px_1fr] gap-4">
      <aside className="sticky top-28 h-72">
        {/* Search Control */}
        <section className="mb-6">
          <label className="block">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Type to filter items…"
            />
          </label>
        </section>

        {/* Item Type Tabs */}
        <h3 className="mb-2 text-sm font-semibold">Item Type</h3>
        {itemTypes.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setItemTypeTab('all')}
              className={classNames(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                itemTypeTab === 'all' ? 'bg-blue text-dark' : 'bg-light text-dark hover:bg-blue'
              )}
            >
              All
            </button>
            {itemTypes.map((type) => (
              <button
                key={type}
                onClick={() => setItemTypeTab(type)}
                className={classNames(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                  itemTypeTab === type ? 'bg-blue text-dark' : 'bg-light text-dark hover:bg-blue'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {/* Rarity Filters */}
        {rarities.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold">Rarity</h3>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setRarityFilter('all')}
                className={classNames(
                  'item-tag rounded-md px-3 py-1.5 text-left text-xs font-medium transition-all',
                  rarityFilter === 'all' ? 'bg-blue text-dark' : 'bg-light text-dark hover:bg-blue'
                )}
              >
                All Rarities
              </button>
              {rarities.map((rarity) => (
                <button
                  key={rarity}
                  onClick={() => setRarityFilter(rarity)}
                  className={classNames(
                    'item-tag rounded-md px-3 py-1.5 text-left text-xs font-medium transition-all',
                    rarity.toLowerCase(),
                    rarityFilter === rarity ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                  )}
                >
                  {rarity}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Results */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Status */}
        <div className="col-span-2 mb-2">
          {loading
            ? 'Loading items…'
            : error
              ? `Error: ${error}`
              : `Showing ${filtered.length} items`}
        </div>

        {filtered && filtered.length > 0 ? (
          filtered.slice(0, 200).map((item: any, index: number) =>
            item.item_type !== 'Misc' ? (
              <article
                key={item.id || index}
                className="rounded-2xl border border-[#442A50] bg-[#1B0F21] p-4 shadow-sm"
              >
                <ItemCard item={item} index={index} />
              </article>
            ) : null
          )
        ) : (
          <div className="text-sm">No items found.</div>
        )}
      </section>
    </div>
  )
}

function ItemCard({ item, index }: { item: any; index: number }) {
  console.log(item)
  const addCommas = (value: number) => {
    return value.toLocaleString()
  }

  const title = item?.name || item?.title || item?.displayName || item?.id || `Item ${index + 1}`
  const subtitle = item?.rarity || item?.type || item?.category || item?.tier || ''
  const description = item?.description || item?.flavor_text || item?.notes || ''
  const icon = item?.icon || item?.image || ''
  const value = item?.value || null
  const workbench = item?.workbench || null
  const itemType = item?.item_type || null
  const lootArea = item?.loot_area || null
  const ammoType = item?.ammo_type || null
  const {
    weight,
    movementPenalty,
    healingPerSecond,
    stackSize,
    radius,
    raiderStun,
    arcStun,
    damage,
    damagePerSecond,
    staminaPerSecond,
    duration,
    agility,
    fireRate,
    magazineSize,
    range,
    reducedReloadTime,
    stability,
    stealth,
    damageMitigation,
    durability,
    shieldCharge,
  } = item?.stat_block || {}

  return (
    <div>
      <header className="flex items-start justify-between gap-3">
        <div className="flex gap-2">
          <div className={`item-icon-wrap h-16 w-16 shrink-0 ${String(subtitle).toLowerCase()}`}>
            <img src={icon} alt={title} className="block h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-xl font-semibold">{String(title)}</div>
          </div>
        </div>
      </header>
      {subtitle ? (
        <div className={`item-tag mt-2 ${String(subtitle).toLowerCase()}`}>{String(subtitle)}</div>
      ) : null}
      <p className="mt-2" dangerouslySetInnerHTML={{ __html: description }}></p>
      <footer className="mt-2 rounded-md bg-[#ece2d0] p-4 text-sm">
        <div>
          {itemType ? (
            <span
              className="item-tag border border-[#CAC1AF] bg-[#CFC8B8] text-[#130918]"
              title="Item Type"
            >
              {itemType}
            </span>
          ) : null}
        </div>
        {movementPenalty ||
        workbench ||
        healingPerSecond ||
        lootArea ||
        radius ||
        raiderStun ||
        arcStun ||
        damage ||
        damagePerSecond ||
        staminaPerSecond ||
        duration ||
        ammoType ||
        agility ||
        fireRate ||
        magazineSize ||
        range ||
        reducedReloadTime ||
        stability ||
        stealth ||
        damageMitigation ||
        durability ||
        shieldCharge ? (
          <div className="mt-2 flex flex-col gap-2">
            {movementPenalty ? (
              <div
                className="flex items-center font-medium text-[#130918]"
                title="Movement Penalty"
              >
                <span className="font-semibold">Movement Penalty:&nbsp;</span>-{movementPenalty}%
              </div>
            ) : null}
            {workbench ? (
              <div className="flex items-center font-medium text-[#130918]" title="Workbench">
                <span className="font-semibold">Crafted:&nbsp;</span>
                {workbench}
              </div>
            ) : null}
            {healingPerSecond ? (
              <div
                className="flex items-center font-medium text-[#130918]"
                title="Healing Per Second"
              >
                <span className="font-semibold">Healing Per Second:&nbsp;</span>
                {healingPerSecond}
              </div>
            ) : null}
            {lootArea ? (
              <div className="flex items-center font-medium text-[#130918]" title="Loot Area">
                <span className="font-semibold">Loot from:&nbsp;</span>
                {lootArea}
              </div>
            ) : null}
            {radius ? (
              <div className="flex items-center font-medium text-[#130918]" title="Radius">
                <span className="font-semibold">Radius:&nbsp;</span>
                {radius}m
              </div>
            ) : null}
            {raiderStun ? (
              <div className="flex items-center font-medium text-[#130918]" title="Raider Stun">
                <span className="font-semibold">Raider Stun:&nbsp;</span>
                {raiderStun}
              </div>
            ) : null}
            {arcStun ? (
              <div className="flex items-center font-medium text-[#130918]" title="Arc Stun">
                <span className="font-semibold">Arc Stun:&nbsp;</span>
                {arcStun}
              </div>
            ) : null}
            {duration ? (
              <div className="flex items-center font-medium text-[#130918]" title="Duration">
                <span className="font-semibold">Duration:&nbsp;</span>
                {duration}s
              </div>
            ) : null}
            {ammoType ? (
              <div className="flex items-center font-medium text-[#130918]" title="Ammo Type">
                <span className="font-semibold">Ammo Type:&nbsp;</span>
                {ammoType.charAt(0).toUpperCase() + ammoType.slice(1)}
              </div>
            ) : null}
            {damage ? (
              <div className="flex items-center font-medium text-[#130918]" title="Damage">
                <span className="font-semibold">Damage:&nbsp;</span>
                {damage}
              </div>
            ) : null}
            {damagePerSecond ? (
              <div
                className="flex items-center font-medium text-[#130918]"
                title="Damage Per Second"
              >
                <span className="font-semibold">Damage Per Second:&nbsp;</span>
                {damagePerSecond}
              </div>
            ) : null}
            {staminaPerSecond ? (
              <div
                className="flex items-center font-medium text-[#130918]"
                title="Stamina Per Second"
              >
                <span className="font-semibold">Stamina Per Second:&nbsp;</span>
                {staminaPerSecond}
              </div>
            ) : null}
            {agility ? (
              <div className="flex items-center font-medium text-[#130918]" title="Agility">
                <span className="font-semibold">Agility:&nbsp;</span>
                {agility}
              </div>
            ) : null}
            {fireRate ? (
              <div className="flex items-center font-medium text-[#130918]" title="Fire Rate">
                <span className="font-semibold">Fire Rate:&nbsp;</span>
                {fireRate}
              </div>
            ) : null}
            {magazineSize ? (
              <div className="flex items-center font-medium text-[#130918]" title="Magazine Size">
                <span className="font-semibold">Magazine Size:&nbsp;</span>
                {magazineSize}
              </div>
            ) : null}
            {range ? (
              <div className="flex items-center font-medium text-[#130918]" title="Range">
                <span className="font-semibold">Range:&nbsp;</span>
                {range}m
              </div>
            ) : null}
            {reducedReloadTime ? (
              <div
                className="flex items-center font-medium text-[#130918]"
                title="Reduced Reload Time"
              >
                <span className="font-semibold">Reduced Reload Time:&nbsp;</span>
                {reducedReloadTime}%
              </div>
            ) : null}
            {stability ? (
              <div className="flex items-center font-medium text-[#130918]" title="Stability">
                <span className="font-semibold">Stability:&nbsp;</span>
                {stability}
              </div>
            ) : null}
            {stealth ? (
              <div className="flex items-center font-medium text-[#130918]" title="Stealth">
                <span className="font-semibold">Stealth:&nbsp;</span>
                {stealth}
              </div>
            ) : null}
            {damageMitigation ? (
              <div
                className="flex items-center font-medium text-[#130918]"
                title="Damage Mitigation"
              >
                <span className="font-semibold">Damage Mitigation:&nbsp;</span>
                {damageMitigation}%
              </div>
            ) : null}
            {durability ? (
              <div className="flex items-center font-medium text-[#130918]" title="Durability">
                <span className="font-semibold">Durability:&nbsp;</span>
                {durability}
              </div>
            ) : null}
            {shieldCharge ? (
              <div className="flex items-center font-medium text-[#130918]" title="Shield Charge">
                <span className="font-semibold">Shield Charge:&nbsp;</span>
                {shieldCharge}
              </div>
            ) : null}
          </div>
        ) : null}
        {weight || value || stackSize ? (
          <div className="mt-2 grid grid-cols-3 items-center gap-2 divide-x divide-dashed divide-[#B1A793] rounded-md border border-[#CAC1AF] bg-[#CFC8B8]">
            {weight ? (
              <span
                className="flex items-center px-3 py-1 font-medium text-[#130918]"
                title="Weight"
              >
                <img
                  src="https://cdn.metaforge.app/arc-raiders/icons/weightKg.webp"
                  alt="Weight"
                  className="mr-1 block h-4 w-4"
                />
                {weight} kg
              </span>
            ) : null}
            {value ? (
              <span
                className="flex items-center px-3 py-1 font-medium text-[#130918]"
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
                className="flex items-center px-3 py-1 font-medium text-[#130918]"
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
          </div>
        ) : null}
      </footer>
    </div>
  )
}
