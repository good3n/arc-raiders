import React, { useEffect, useMemo, useState } from 'react'
import ItemCard from './ItemCard'

// Cache configuration
const CACHE_VERSION = 'v1'
const CACHE_NAME = `metaforge-cache-${CACHE_VERSION}`
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

export default function WeaponExplorer() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [rarityFilter, setRarityFilter] = useState<string>('all')
  const [ammoTypeFilter, setAmmoTypeFilter] = useState<string>('all')
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all')

  const endpoint = '/data/weapons.min.json'

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

  // Get unique subcategories for weapons
  const subcategories = useMemo(() => {
    const subs = new Set<string>()
    data.forEach((weapon) => {
      if (weapon.subcategory) {
        subs.add(weapon.subcategory)
      }
    })
    return Array.from(subs).sort()
  }, [data])

  // Get unique rarities for weapons
  const rarities = useMemo(() => {
    const raritySet = new Set<string>()
    data.forEach((weapon) => {
      if (weapon.rarity) {
        raritySet.add(weapon.rarity)
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

  // Get unique ammo types for weapons
  const ammoTypes = useMemo(() => {
    const types = new Set<string>()
    data.forEach((weapon) => {
      if (weapon.ammoType) {
        // Normalize the ammo type to prevent duplicates
        const normalized = weapon.ammoType.trim().toLowerCase()
        types.add(normalized)
      }
    })
    // Sort and capitalize for display
    return Array.from(types)
      .sort()
      .map((type) => type.charAt(0).toUpperCase() + type.slice(1))
  }, [data])

  // Filter data based on search query and filters
  const filtered = useMemo(() => {
    let filteredData = data

    filteredData = filteredData.filter(
      (weapon) => weapon.description && weapon.description.trim() !== ''
    )

    // Filter by subcategory
    if (subcategoryFilter !== 'all') {
      filteredData = filteredData.filter((weapon) => weapon.subcategory === subcategoryFilter)
    }

    // Filter by rarity
    if (rarityFilter !== 'all') {
      filteredData = filteredData.filter((weapon) => weapon.rarity === rarityFilter)
    }

    // Filter by ammo type
    if (ammoTypeFilter !== 'all') {
      filteredData = filteredData.filter((weapon) => {
        const normalized = weapon.ammoType?.trim().toLowerCase()
        return normalized === ammoTypeFilter.toLowerCase()
      })
    }

    if (query) {
      const q = query.toLowerCase()
      filteredData = filteredData.filter((weapon) => {
        // Search in important fields
        const searchable = [
          weapon.baseName,
          weapon.description,
          weapon.rarity,
          weapon.subcategory,
          weapon.ammoType,
          weapon.baseStats?.firingMode,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return searchable.includes(q)
      })
    }

    return filteredData
  }, [data, query, rarityFilter, ammoTypeFilter, subcategoryFilter])

  return (
    <div className="grid grid-cols-[300px_1fr] gap-10">
      <aside className="scrollbar-hide sticky top-28 h-[calc(100vh-7rem)] overflow-y-auto pb-10">
        {/* Search Control */}
        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold">Search</h3>
          <label className="block">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Type to filter weapons…"
              className="border-gray-300 w-full rounded-lg border px-3 py-2"
            />
          </label>
        </section>

        {/* Subcategory Filters */}
        {subcategories.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold">Subcategory</h3>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSubcategoryFilter('all')}
                className={classNames(
                  'rounded-md px-3 py-1.5 text-left font-medium transition-all',
                  subcategoryFilter === 'all'
                    ? 'bg-blue text-dark'
                    : 'bg-light text-dark hover:bg-blue'
                )}
              >
                All
              </button>
              {subcategories.map((subcategory) => (
                <button
                  key={subcategory}
                  onClick={() => setSubcategoryFilter(subcategory)}
                  className={classNames(
                    'rounded-md px-3 py-1.5 text-left font-medium transition-all',
                    subcategoryFilter === subcategory
                      ? 'bg-blue text-dark'
                      : 'bg-light text-dark hover:bg-blue'
                  )}
                >
                  {subcategory}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ammo Type Filters */}
        {ammoTypes.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold">Ammo Type</h3>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setAmmoTypeFilter('all')}
                className={classNames(
                  'rounded-md px-3 py-1.5 font-medium transition-all',
                  ammoTypeFilter === 'all'
                    ? 'bg-blue text-dark'
                    : 'bg-light text-dark hover:bg-blue'
                )}
              >
                All Types
              </button>
              {ammoTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setAmmoTypeFilter(type.toLowerCase())}
                  className={classNames(
                    'rounded-md px-3 py-1.5 font-medium transition-all',
                    ammoTypeFilter === type.toLowerCase()
                      ? 'bg-blue text-dark'
                      : 'bg-light text-dark hover:bg-blue'
                  )}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rarity Filters */}
        {rarities.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Rarity</h3>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setRarityFilter('all')}
                className={classNames(
                  'item-tag rounded-md px-3 py-1.5 text-left text-sm font-medium transition-all',
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
                    'item-tag rounded-md px-3 py-1.5 text-left text-sm font-medium transition-all',
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
      <section className="relative flex flex-col items-start items-center gap-3 pt-10">
        {/* Status */}
        <div className="absolute left-0 right-0 top-0 text-center">
          {loading
            ? 'Loading weapons…'
            : error
              ? `Error: ${error}`
              : `Showing ${filtered.length} weapons`}
        </div>

        {filtered.length > 0 ? (
          filtered.map((weapon) => (
            <span key={weapon.id} className="inline-block w-full">
              <ItemCard item={weapon} isWeapon={true} />
            </span>
          ))
        ) : (
          <div className="italic">No weapons found. Try adjusting your filters.</div>
        )}
      </section>
    </div>
  )
}
