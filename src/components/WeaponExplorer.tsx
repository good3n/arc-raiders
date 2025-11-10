import React, { useEffect, useMemo, useState } from 'react';

// Cache configuration
const CACHE_VERSION = 'v1';
const CACHE_NAME = `metaforge-cache-${CACHE_VERSION}`;
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

export default function WeaponExplorer() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [ammoTypeFilter, setAmmoTypeFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');

  const endpoint = '/data/items.json';

  // Load data with caching
  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const cacheKey = `${CACHE_NAME}-${endpoint}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
          try {
            const { data: cachedData, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            
            if (age < CACHE_DURATION) {
              if (!ignore) {
                setData(cachedData.filter((item: any) => item.item_type === 'Weapon'));
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

        // Fetch fresh data
        await fetchAndCache(cacheKey, false);
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

    const fetchAndCache = async (cacheKey: string, background: boolean) => {
      try {
        const res = await fetch(endpoint, { 
          headers: { Accept: 'application/json' },
          cache: 'default'
        });
        
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        
        if (!ignore || background) {
          // Store in localStorage
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
          
          if (!ignore && !background) {
            // Filter for weapons only
            setData(json.filter((item: any) => item.item_type === 'Weapon'));
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
  }, []);

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

  // Get unique subcategories for weapons
const subcategories = useMemo(() => {
  const subs = new Set<string>();
  data.forEach(item => {
    if (item.subcategory) {
      let normalized = item.subcategory.trim();
      
      // Apply renaming rules
      if (normalized === 'Hand Cannon') {
        normalized = 'Pistol';
      } else if (normalized === 'Battle Rifle') {
        normalized = 'Rifle';
      }
      
      // Check if name contains "Ferro"
      if (item.name && item.name.includes('Ferro')) {
        normalized = 'Rifle';
      }
      
      subs.add(normalized);
    }
  });
  return Array.from(subs).sort();
}, [data]);

  // Get unique rarities for weapons
  const rarities = useMemo(() => {
    const raritySet = new Set<string>();
    data.forEach(item => {
      if (item.rarity) {
        raritySet.add(item.rarity);
      }
    });
    
    // Define the sort order
    const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    
    // Sort based on the defined order
    return Array.from(raritySet).sort((a, b) => {
      const aIndex = rarityOrder.findIndex(r => r.toLowerCase() === a.toLowerCase());
      const bIndex = rarityOrder.findIndex(r => r.toLowerCase() === b.toLowerCase());
      
      // If both are in the order array, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only one is in the order array, it comes first
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      // If neither is in the order array, sort alphabetically
      return a.localeCompare(b);
    });
  }, [data]);

  // Get unique ammo types for weapons
  const ammoTypes = useMemo(() => {
    const types = new Set<string>();
    data.forEach(item => {
      if (item.ammo_type) {
        // Normalize the ammo type to prevent duplicates
        const normalized = item.ammo_type.trim().toLowerCase();
        types.add(normalized);
      }
    });
    // Sort and capitalize for display
    return Array.from(types).sort().map(type => 
      type.charAt(0).toUpperCase() + type.slice(1)
    );
  }, [data]);

  // Filter data based on search query and filters
  const filtered = useMemo(() => {
    let list = data;

    // Filter by subcategory
if (subcategoryFilter !== 'all') {
  list = list.filter(item => {
    let subcategory = item.subcategory;
    
    // Apply same renaming rules
    if (subcategory === 'Hand Cannon') {
      subcategory = 'Pistol';
    } else if (subcategory === 'Battle Rifle') {
      subcategory = 'Rifle';
    }
    
    // Check if name contains "Ferro"
    if (item.name && item.name.includes('Ferro')) {
      subcategory = 'Rifle';
    }
    
    return subcategory === subcategoryFilter;
  });
}
  
    // Filter by rarity
    if (rarityFilter !== 'all') {
      list = list.filter(item => item.rarity === rarityFilter);
    }

    // Filter by ammo type
    if (ammoTypeFilter !== 'all') {
      list = list.filter(item => {
        const normalized = item.ammo_type?.trim().toLowerCase();
        return normalized === ammoTypeFilter.toLowerCase();
      });
    }
  
    if (!query) return list;
  
    const q = query.toLowerCase();
    return list.filter((item) => {
      // Search in important fields
      const searchable = [
        item.name,
        item.description,
        item.rarity,
        item.workbench,
        item.firingMode,
        item.agility,
        item.stealth,
        item.flavor_text,
        item.subcategory,
        item.ammo_type
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchable.includes(q);
    });
  }, [data, query, rarityFilter, ammoTypeFilter, subcategoryFilter]);

  return (
    <div className="grid grid-cols-[280px_1fr] gap-4">
      <aside className="sticky top-28 pb-10 h-[calc(100vh-7rem)] overflow-y-auto scrollbar-hide">
        {/* Search Control */}
        <section className="mb-6">
          <label className="block">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Type to filter weapons…"
              className="w-full px-3 py-2 rounded-lg border border-gray-300"
            />
          </label>
        </section>

        {/* Subcategory Filters */}
        {subcategories.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2">Subcategory</h3>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setSubcategoryFilter('all')}
                className={classNames(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all text-left',
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
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all text-left',
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
            <h3 className="text-sm font-semibold mb-2">Ammo Type</h3>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setAmmoTypeFilter('all')}
                className={classNames(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all text-left',
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
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all text-left',
                    ammoTypeFilter === type
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
            <h3 className="text-sm font-semibold mb-2">Rarity</h3>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setRarityFilter('all')}
                className={classNames(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all text-left item-tag',
                  rarityFilter === 'all'
                    ? 'bg-blue text-dark'
                    : 'bg-light text-dark hover:bg-blue'
                )}
              >
                All Rarities
              </button>
              {rarities.map((rarity) => (
                <button
                  key={rarity}
                  onClick={() => setRarityFilter(rarity)}
                  className={classNames(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all text-left item-tag',
                    rarity.toLowerCase(),
                    rarityFilter === rarity
                      ? 'opacity-100'
                      : 'opacity-60 hover:opacity-100'
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
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-10 relative items-start">
        {/* Status */}
        <div className="absolute top-0 left-0">
          {loading ? 'Loading weapons…' : error ? `Error: ${error}` : `Showing ${filtered.length} weapons`}
        </div>

        {filtered && filtered.length > 0 ? (
          filtered.map((weapon: any, index: number) => (
            <article key={weapon.id || index} className="rounded-2xl border border-[#442A50] shadow-sm p-4 bg-[#1B0F21]">
              <WeaponCard weapon={weapon} index={index} />
            </article>
          ))
        ) : (
          <div className="text-sm">No weapons found.</div>
        )}
      </section>
    </div>
  );
}

function WeaponCard({ weapon, index }: { weapon: any; index: number }) {
  console.log(weapon);
  const addCommas = (value: number) => {
    return value.toLocaleString();
  }
  
  const title = weapon?.name || `Weapon ${index + 1}`;
  const subtitle = weapon?.rarity || '';
  const description = weapon?.description || weapon?.flavor_text || '';
  const icon = weapon?.icon || weapon?.image || '';
  const value = weapon?.value || null;
  const workbench = weapon?.workbench || null;
  const ammoType = weapon?.ammo_type || null;
  const { 
    weight,
    stackSize,
    damage,
    damagePerSecond,
    fireRate,
    magazineSize,
    range,
    reducedReloadTime,
    stability,
    agility,
    firingMode,
    stealth,
  } = weapon?.stat_block || {};

  return (
    <div>
      <header className="flex items-start justify-between gap-3">
        <div className="flex gap-2">
          <div className={`item-icon-wrap w-16 h-16 shrink-0 ${String(subtitle).toLowerCase()}`}>
            <img src={icon} alt={title} className="w-full h-full object-contain block" />
          </div>
          <div>
            <div className="font-semibold text-xl">{String(title)}</div>
          </div>
        </div>
      </header>
      {subtitle ? (
        <div className={`item-tag mt-2 ${String(subtitle).toLowerCase()}`}>
          {String(subtitle)}
        </div>
      ) : null}
      <p className="mt-2" dangerouslySetInnerHTML={{ __html: description }}></p>        
      <footer className="text-sm bg-[#ece2d0] p-4 rounded-md mt-2">
        <div>
          <span className="text-[#130918] item-tag bg-[#CFC8B8] border border-[#CAC1AF]" title="Item Type">
            Weapon
          </span>
        </div>
        
        <div className="flex flex-col gap-2 mt-2">
          {workbench ? (
            <div className="text-[#130918] font-medium flex items-center">
              <span className="font-semibold">Crafted:&nbsp;</span>
              {workbench}
            </div>
          ) : null}
          {ammoType ? (
            <div className="text-[#130918] font-medium flex items-center">
              <span className="font-semibold">Ammo Type:&nbsp;</span>
              {ammoType.charAt(0).toUpperCase() + ammoType.slice(1)}
            </div>
          ) : null}
          {damage ? (
            <div className="text-[#130918] font-medium flex items-center">
              <span className="font-semibold">Damage:&nbsp;</span>
              {damage}
            </div>
          ) : null}
          {damagePerSecond ? (
            <div className="text-[#130918] font-medium flex items-center">
              <span className="font-semibold">DPS:&nbsp;</span>
              {damagePerSecond}
            </div>
          ) : null}
          {fireRate ? (
            <div className="text-[#130918] font-medium flex items-center">
              <span className="font-semibold">Fire Rate:&nbsp;</span>
              {fireRate}
            </div>
          ) : null}
          {firingMode ? (
            <div className="text-[#130918] font-medium flex items-center">
              <span className="font-semibold">Firing Mode:&nbsp;</span>
              {firingMode}
            </div>
          ) : null}
          {agility ? (
            <div className="text-[#130918] font-medium flex items-center">
              <span className="font-semibold">Agility:&nbsp;</span>
              {agility}
            </div>
          ) : null}
          {stealth ? (
            <div className="text-[#130918] font-medium flex items-center">
              <span className="font-semibold">Stealth:&nbsp;</span>
              {stealth}
            </div>
          ) : null}
          {magazineSize ? (
            <div className="text-[#130918] font-medium flex items-center">
              <span className="font-semibold">Magazine Size:&nbsp;</span>
              {magazineSize}
            </div>
          ) : null}
          {range ? (
            <div className="text-[#130918] font-medium flex items-center">
              <span className="font-semibold">Range:&nbsp;</span>
              {range}m
            </div>
          ) : null}
          {reducedReloadTime ? (
            <div className="text-[#130918] font-medium flex items-center">
              <span className="font-semibold">Reduced Reload Time:&nbsp;</span>
              {reducedReloadTime}%
            </div>
          ) : null}
          {stability ? (
            <div className="text-[#130918] font-medium flex items-center">
              <span className="font-semibold">Stability:&nbsp;</span>
              {stability}
            </div>
          ) : null}
        </div>
        
        {weight || value || stackSize ? (
          <div className="grid grid-cols-3 items-center gap-2 bg-[#CFC8B8] border divide-x divide-dashed divide-[#B1A793] border-[#CAC1AF] rounded-md mt-2">
            {weight ? (
              <span className="text-[#130918] font-medium flex items-center py-1 px-3" title="Weight">
                <img src="https://cdn.metaforge.app/arc-raiders/icons/weightKg.webp" alt="Weight" className="w-4 h-4 block mr-1" />
                {weight} kg
              </span>
            ) : null}
            {value ? (
              <span className="text-[#130918] font-medium flex items-center py-1 px-3" title="Value">
                <img src="https://cdn.metaforge.app/arc-raiders/icons/raider-coin.webp" alt="Value" className="w-4 h-4 block mr-1" />
                {addCommas(value)}
              </span>
            ) : null}
            {stackSize ? (
              <span className="text-[#130918] font-medium flex items-center py-1 px-3" title="Stack Size">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-4 h-4 block mr-1" viewBox="0 0 24 24">
                  <path d="M11.6 1.6h.8L22 6.8a.8.8 0 0 1 0 1.4l-9.7 5.2h-.8L2 8.2a.8.8 0 0 1 0-1.4z"/>
                  <path d="m3.3 10.6 7.6 4.1a2 2 0 0 0 2.2 0l7.6-4.1 1.4.7a.8.8 0 0 1 0 1.4l-9.7 5.2h-.8L2 12.7a.8.8 0 0 1 0-1.4z"/>
                  <path d="m11 19.2-7.7-4.1-1.4.7a.8.8 0 0 0 0 1.4l9.7 5.2q.4.2.8 0l9.7-5.2a.8.8 0 0 0 0-1.4l-1.4-.7-7.6 4.1a2 2 0 0 1-2.2 0"/>
                </svg>
                {stackSize}
              </span>
            ) : null}
          </div>
        ) : null}
      </footer>
    </div>
  );
}