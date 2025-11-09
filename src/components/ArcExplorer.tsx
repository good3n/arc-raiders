import React, { useEffect, useMemo, useState } from 'react';
import ArcCard from './ArcCard';

type TabKey = 'items' | 'arcs' | 'quests' | 'traders' | 'maps';
type ItemTabKey = 'all' | string;

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
  const [itemTypeTab, setItemTypeTab] = useState<ItemTabKey>('all');

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

  // Get unique item types
  const itemTypes = useMemo(() => {
    if (active !== 'items') return [];
    const types = new Set<string>();
    data.forEach(item => {
      if (item.item_type && item.item_type !== 'Misc') {
        types.add(item.item_type);
      }
    });
    return Array.from(types).sort();
  }, [data, active]);

  // Filter data based on search query and item type tab
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
  
    // Filter by item type if on items tab
    if (active === 'items' && itemTypeTab !== 'all') {
      list = list.filter(item => item.item_type === itemTypeTab);
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
  }, [data, query, active, itemTypeTab]);

  // Render item based on type
  const renderItem = (item: any, index: number) => {
    // Skip rendering Misc items (should already be filtered, but double-check)
    if (item.item_type === "Misc") return null;

    // Special rendering for ARCs
    if (active === 'arcs') {
      return <ArcCard key={item.id || index} arc={item} />;
    }

    // Default rendering for other types
    return (
      <article key={item.id || index} className="rounded-2xl border border-slate-200 shadow-sm p-4 bg-white">
        <CardRow row={item} index={index} />
      </article>
    );
  };

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['items', 'arcs', 'quests'] as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActive(tab);
              if (tab === 'items') setItemTypeTab('all');
            }}
            className={classNames(
              'px-3 py-2 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap',
              active === tab
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200'
            )}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Item Type Tabs */}
      {active === 'items' && itemTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setItemTypeTab('all')}
            className={classNames(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              itemTypeTab === 'all'
                ? 'bg-gray-700 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            All
          </button>
          {itemTypes.map((type) => (
            <button
              key={type}
              onClick={() => setItemTypeTab(type)}
              className={classNames(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                itemTypeTab === type
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <label className="block">
          <span className="block text-xs font-semibold text-slate-500">Search (client-side)</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Type to filter results…"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
        <label className="block" hidden={active !== 'maps'}>
          <span className="block text-xs font-semibold text-slate-500">Map</span>
          <select
            value={mapFilter}
            onChange={(e) => setMapFilter(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="">(All available)</option>
            <option>Dam</option>
            <option>Spaceport</option>
            <option>Buried City</option>
            <option>Blue Gate</option>
          </select>
        </label>
      </section>

      {/* Status */}
      <div className="mb-4 text-xs text-slate-600">
        {loading ? `Loading ${endpoint}…` : error ? `Error: ${error}` : `Loaded ${filtered?.length ?? 0} records`}
      </div>

      {/* Results */}
      <section className="grid gap-3">
        {filtered && filtered.length > 0 ? (
          filtered.slice(0, 200).map((row: any, i: number) => renderItem(row, i))
        ) : (
          <div className="text-sm text-slate-500">
            {active === 'maps' ? 'Select a map from the dropdown above to load data.' : 'No results.'}
          </div>
        )}
      </section>
    </div>
  );
}

function CardRow({ row, index }: { row: any; index: number }) {
  const [open, setOpen] = useState(false);
  const title = row?.name || row?.title || row?.displayName || row?.id || `Row ${index + 1}`;
  const subtitle = row?.rarity || row?.type || row?.category || row?.tier || row?.map || '';

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{String(title)}</div>
          {subtitle ? <div className="text-xs text-slate-500">{String(subtitle)}</div> : null}
        </div>
        <button
          onClick={() => setOpen((s) => !s)}
          className="inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-xs border border-slate-200"
        >
          {open ? 'Hide' : 'Details'}
        </button>
      </div>
      {open ? (
        <pre className="mt-3 text-xs overflow-auto bg-slate-50 border border-slate-200 rounded-xl p-3">
          {JSON.stringify(row, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}