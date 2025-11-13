import React, { useEffect, useMemo, useState } from 'react'
import ArcCard from './ArcCard'

// Cache configuration
const CACHE_VERSION = 'v1'
const CACHE_NAME = `metaforge-cache-${CACHE_VERSION}`
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export default function ArcExplorer() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const endpoint = '/data/arcs.min.json'

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

  // Filter data based on search query
  const filtered = useMemo(() => {
    let list: any[] = []

    if (Array.isArray(data)) {
      list = data
    } else if (data && typeof data === 'object') {
      // Handle different API response structures
      const possibleArrays = [
        (data as any).data,
        (data as any).items,
        (data as any).arcs,
        (data as any).results,
      ]
      const found = possibleArrays.find((v) => Array.isArray(v))
      if (found) list = found
    }

    if (!query) return list

    list = list.filter((arc) => arc.description && arc.description.trim() !== '')

    const q = query.toLowerCase()
    return list.filter((arc) => {
      // Search in ARC-specific fields
      const searchable = [
        arc.name,
        arc.description,
        arc.type,
        arc.category,
        arc.tier,
        arc.rarity,
        arc.abilities?.join(' '),
        arc.characteristics?.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(q)
    })
  }, [data, query])

  return (
    <div>
      {/* Search Control */}
      <section className="mb-6">
        <label className="mx-auto block w-full max-w-md">
          <span className="block text-xs font-semibold text-dark">Search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Search ARCs…"
            className="mt-1 w-full max-w-md rounded-xl border border-light bg-light px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue"
          />
        </label>
      </section>

      {/* Status */}
      <div className="mb-4 text-xs text-light">
        {loading ? 'Loading ARCs…' : error ? `Error: ${error}` : `Showing ${filtered.length} ARCs`}
      </div>

      {/* Results */}
      <section className="grid grid-cols-2 gap-3">
        {filtered && filtered.length > 0 ? (
          filtered
            .slice(0, 200)
            .map((arc: any, index: number) => <ArcCard key={arc.id || index} arc={arc} />)
        ) : (
          <div className="text-sm">No ARCs found.</div>
        )}
      </section>
    </div>
  )
}
