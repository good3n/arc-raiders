import React, { useEffect, useMemo, useState } from 'react';

type TabKey = 'items' | 'arcs' | 'quests' | 'traders' | 'maps';

const ENDPOINTS = {
  items: '/data/items.json',
  arcs: '/data/arcs.json',
  quests: '/data/quests.json',
  traders: '/data/traders.json', // Keep for future use
  maps: '/api/game-map-data'
};

// Cache version - increment this to bust cache when data structure changes
const CACHE_VERSION = 'v1';
const CACHE_NAME = `metaforge-cache-${CACHE_VERSION}`;
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

export default function ArcExplorer() {
  const [active, setActive] = useState<TabKey>('items');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mapFilter, setMapFilter] = useState('');

  // Auto-set default map when user switches to "maps" tab
  useEffect(() => {
    if (active === 'maps' && !mapFilter) {
      setMapFilter('Dam');
    }
  }, [active, mapFilter]);

  // Build the endpoint URL
  const endpoint = useMemo(() => {
    if (active === 'maps' && mapFilter) {
      const p = new URLSearchParams({ mapID: mapFilter });
      return `${ENDPOINTS[active]}?${p.toString()}`;
    }
    return ENDPOINTS[active];
  }, [active, mapFilter]);

  // Load data with caching
  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // For static JSON files, try localStorage first
        if (!endpoint.includes('/api/')) {
          const cacheKey = `${CACHE_NAME}-${endpoint}`;
          const cached = localStorage.getItem(cacheKey);
          
          if (cached) {
            try {
              const { data: cachedData, timestamp } = JSON.parse(cached);
              const age = Date.now() - timestamp;
              
              if (age < CACHE_DURATION) {
                if (!ignore) {
                  setData(cachedData);
                  setLoading(false);
                }
                
                // If cache is older than 1 day, refresh in background
                if (age > 24 * 60 * 60 * 1000) {
                  fetchAndCache(cacheKey, true);
                }
                return;
              }
            } catch (e) {
              // Invalid cache data, remove it
              localStorage.removeItem(cacheKey);
            }
          }
        }

        // Fetch fresh data
        await fetchAndCache(endpoint.includes('/api/') ? null : `${CACHE_NAME}-${endpoint}`, false);
      } catch (e: any) {
        if (!ignore) {
          setError(e.message || 'Failed to load data');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    const fetchAndCache = async (cacheKey: string | null, background: boolean) => {
      try {
        const res = await fetch(endpoint, { 
          headers: { Accept: 'application/json' },
          // Add cache control for better browser caching
          cache: 'default'
        });
        
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        
        if (!ignore || background) {
          // Store in localStorage for static files
          if (cacheKey) {
            try {
              localStorage.setItem(cacheKey, JSON.stringify({
                data: json,
                timestamp: Date.now()
              }));
            } catch (e) {
              // localStorage might be full, clear old data
              clearOldCache();
              try {
                localStorage.setItem(cacheKey, JSON.stringify({
                  data: json,
                  timestamp: Date.now()
                }));
              } catch (e2) {
                console.warn('Failed to cache data:', e2);
              }
            }
          }
          
          if (!ignore && !background) {
            setData(json);
          }
        }
      } catch (e: any) {
        if (!background) {
          throw e;
        }
      }
    };

    loadData();
    
    return () => {
      ignore = true;
    };
  }, [endpoint]);

  // Clear old cache entries
  const clearOldCache = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('metaforge-cache-') && !key.startsWith(CACHE_NAME)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  };

  // Filter data based on search query
  const filtered = useMemo(() => {
    let list: any[] = [];
  
    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === "object") {
      // Handle different API response structures
      const possibleArrays = [
        (data as any).data,
        (data as any).items,
        (data as any).points,
        (data as any).results,
      ];
      const found = possibleArrays.find((v) => Array.isArray(v));
      if (found) list = found;
    }
  
    if (!query) return list;
  
    const q = query.toLowerCase();
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
        item.ammo_type
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchable.includes(q);
    });
  }, [data, query]);

  // Render item based on type
  const renderItem = (item: any, index: number) => {
    // Skip rendering Misc items (should already be filtered, but double-check)
    if (item.item_type === "Misc") return null;

    return (
      <div
        key={item.id || index}
        className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-4">
          {item.icon && (
            <img
              src={item.icon}
              alt={item.name || 'Icon'}
              className="w-16 h-16 object-cover rounded"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{item.name || 'Unnamed'}</h3>
            {item.description && (
              <p className="text-gray-600 dark:text-gray-300 mt-1">{item.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {item.item_type && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded">
                  {item.item_type}
                </span>
              )}
              {item.rarity && (
                <span className={classNames(
                  'px-2 py-1 rounded',
                  item.rarity === 'Common' && 'bg-gray-200 dark:bg-gray-700',
                  item.rarity === 'Uncommon' && 'bg-green-100 dark:bg-green-900',
                  item.rarity === 'Rare' && 'bg-blue-100 dark:bg-blue-900',
                  item.rarity === 'Epic' && 'bg-purple-100 dark:bg-purple-900',
                  item.rarity === 'Legendary' && 'bg-yellow-100 dark:bg-yellow-900'
                )}>
                  {item.rarity}
                </span>
              )}
              {item.value > 0 && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900 rounded">
                  Value: {item.value}
                </span>
              )}
              {item.workbench && (
                <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 rounded">
                  {item.workbench}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(['items', 'arcs', 'quests'] as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={classNames(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              active === tab
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        <div className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          Note: "traders" and "maps" tabs coming soon
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${active}...`}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Map Filter (for future use) */}
      {active === 'maps' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Maps functionality coming soon!
          </p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading {active}...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {query ? `No ${active} found matching "${query}"` : `No ${active} available`}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filtered.length} {active}
              {query && ` matching "${query}"`}
            </div>
            <div className="space-y-3">
              {filtered.map((item, idx) => renderItem(item, idx))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}