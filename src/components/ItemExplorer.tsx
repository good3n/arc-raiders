import React, { useEffect, useMemo, useState } from 'react'
import ItemCard from './ItemCard'
import FilterSidebar from './FilterSidebar'

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

  // Prepare filter groups for the sidebar
  const filterGroups = [
    {
      title: 'Item Type',
      options: itemTypes,
      selected: itemTypeTab,
      onSelect: setItemTypeTab,
      type: 'buttons' as const,
    },
    {
      title: 'Rarity',
      options: rarities,
      selected: rarityFilter,
      onSelect: setRarityFilter,
      type: 'tags' as const,
    },
  ].filter((group) => group.options.length > 0)

  return (
    <div className="grid grid-cols-[280px_1fr] gap-4">
      <FilterSidebar
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Type to filter items…"
        filterGroups={filterGroups}
        className="h-72"
      />

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
          filtered
            .slice(0, 200)
            .map((item: any, index: number) =>
              item.item_type !== 'Misc' ? <ItemCard item={item} isWeapon={false} /> : null
            )
        ) : (
          <div className="text-sm">No items found.</div>
        )}
      </section>
    </div>
  )
}
