import React, { useEffect, useMemo, useState } from 'react';

type ItemTabKey = 'all' | string;

// Cache configuration
const CACHE_VERSION = 'v1';
const CACHE_NAME = `metaforge-cache-${CACHE_VERSION}`;
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

export default function ItemExplorer() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [itemTypeTab, setItemTypeTab] = useState<ItemTabKey>('all');

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

  // Get unique item types
  const itemTypes = useMemo(() => {
    const types = new Set<string>();
    data.forEach(item => {
      if (item.item_type && item.item_type !== 'Misc') {
        types.add(item.item_type);
      }
    });
    return Array.from(types).sort();
  }, [data]);

  // Filter data based on search query and item type tab
  const filtered = useMemo(() => {
    let list = data;
  
    // Filter by item type
    if (itemTypeTab !== 'all') {
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
  }, [data, query, itemTypeTab]);

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
        {itemTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setItemTypeTab('all')}
              className={classNames(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                itemTypeTab === 'all'
                  ? 'bg-blue text-dark'
                  : 'bg-light text-dark hover:bg-blue'
              )}
            >
              All
            </button>
            {itemTypes.map((type) => (
              <button
                key={type}
                onClick={() => setItemTypeTab(type)}
                className={classNames(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  itemTypeTab === type
                    ? 'bg-blue text-dark'
                    : 'bg-light text-dark hover:bg-blue'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* Results */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Status */}
        <div className="mb-2 col-span-2">
          {loading ? 'Loading items…' : error ? `Error: ${error}` : `Showing ${filtered.length} items`}
        </div>

        {filtered && filtered.length > 0 ? (
          filtered.slice(0, 200).map((item: any, index: number) => (
            item.item_type !== "Misc" ? (
              <article key={item.id || index} className="rounded-2xl border border-[#442A50] shadow-sm p-4 bg-[#1B0F21]">
                <ItemCard item={item} index={index} />
              </article>
            ) : null
          ))
        ) : (
          <div className="text-sm">No items found.</div>
        )}
      </section>
    </div>
  );
}

function ItemCard({ item, index }: { item: any; index: number }) {
  const addCommas = (value: number) => {
    return value.toLocaleString();
  }
  
  const title = item?.name || item?.title || item?.displayName || item?.id || `Item ${index + 1}`;
  const subtitle = item?.rarity || item?.type || item?.category || item?.tier || '';
  const description = item?.description || item?.flavor_text || item?.notes || '';
  const icon = item?.icon || item?.image || '';
  const value = item?.value || null;
  const workbench = item?.workbench || null;
  const itemType = item?.item_type || null;
  const lootArea = item?.loot_area || null;
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
  } = item?.stat_block || {};

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
          {itemType ? (
            <span className="text-[#130918] item-tag bg-[#CFC8B8] border border-[#CAC1AF]" title="Item Type">
              {itemType}
            </span>
          ) : null}
        </div>
        {
          movementPenalty ||
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
        <div className="flex flex-col gap-2 mt-2">
          {movementPenalty ? (
            <div className="text-[#130918] font-medium flex items-center" title="Movement Penalty">
              <span className="font-semibold">Movement Penalty:&nbsp;</span>
              -{movementPenalty}%
            </div>
          ) : null}
          {workbench ? (
            <div className="text-[#130918] font-medium flex items-center" title="Workbench">
              <span className="font-semibold">Crafted:&nbsp;</span>
              {workbench}
            </div>
          ) : null}
          {healingPerSecond ? (
            <div className="text-[#130918] font-medium flex items-center" title="Healing Per Second">
              <span className="font-semibold">Healing Per Second:&nbsp;</span>
              {healingPerSecond}
            </div>
          ) : null}
          {lootArea ? (
            <div className="text-[#130918] font-medium flex items-center" title="Loot Area">
              <span className="font-semibold">Loot from:&nbsp;</span>
              {lootArea}
            </div>
          ) : null}
          {radius ? (
            <div className="text-[#130918] font-medium flex items-center" title="Radius">
              <span className="font-semibold">Radius:&nbsp;</span>
              {radius}m
            </div>
          ) : null}
          {raiderStun ? (
            <div className="text-[#130918] font-medium flex items-center" title="Raider Stun">
              <span className="font-semibold">Raider Stun:&nbsp;</span>
              {raiderStun}
            </div>
          ) : null}
          {arcStun ? (
            <div className="text-[#130918] font-medium flex items-center" title="Arc Stun">
              <span className="font-semibold">Arc Stun:&nbsp;</span>
              {arcStun}
            </div> 
          ) : null}
          {duration ? (
            <div className="text-[#130918] font-medium flex items-center" title="Duration">
              <span className="font-semibold">Duration:&nbsp;</span>
              {duration}s
            </div>
          ) : null}
          {damage ? (
            <div className="text-[#130918] font-medium flex items-center" title="Damage">
              <span className="font-semibold">Damage:&nbsp;</span>
              {damage}
            </div>
          ) : null}
          {damagePerSecond ? (
            <div className="text-[#130918] font-medium flex items-center" title="Damage Per Second">
              <span className="font-semibold">Damage Per Second:&nbsp;</span>
              {damagePerSecond}
            </div>
          ) : null}
          {staminaPerSecond ? (
            <div className="text-[#130918] font-medium flex items-center" title="Stamina Per Second">
              <span className="font-semibold">Stamina Per Second:&nbsp;</span>
              {staminaPerSecond}
            </div>
          ) : null}
          {agility ? (
            <div className="text-[#130918] font-medium flex items-center" title="Agility">
              <span className="font-semibold">Agility:&nbsp;</span>
              {agility}
            </div>
          ) : null}
          {fireRate ? (
            <div className="text-[#130918] font-medium flex items-center" title="Fire Rate">
              <span className="font-semibold">Fire Rate:&nbsp;</span>
              {fireRate}
            </div>
          ) : null}
          {magazineSize ? (
            <div className="text-[#130918] font-medium flex items-center" title="Magazine Size">
              <span className="font-semibold">Magazine Size:&nbsp;</span>
              {magazineSize}
            </div>
          ) : null}
          {range ? (
            <div className="text-[#130918] font-medium flex items-center" title="Range">
              <span className="font-semibold">Range:&nbsp;</span>
              {range}m
            </div>
          ) : null}
          {reducedReloadTime ? (
            <div className="text-[#130918] font-medium flex items-center" title="Reduced Reload Time">
              <span className="font-semibold">Reduced Reload Time:&nbsp;</span>
              {reducedReloadTime}%
            </div>
          ) : null}
          {stability ? (
            <div className="text-[#130918] font-medium flex items-center" title="Stability">
              <span className="font-semibold">Stability:&nbsp;</span>
              {stability}
            </div>
          ) : null}
          {stealth ? (
            <div className="text-[#130918] font-medium flex items-center" title="Stealth">
              <span className="font-semibold">Stealth:&nbsp;</span>
              {stealth}
            </div>
          ) : null}
          {damageMitigation ? (
            <div className="text-[#130918] font-medium flex items-center" title="Damage Mitigation">
              <span className="font-semibold">Damage Mitigation:&nbsp;</span>
              {damageMitigation}%
            </div>
          ) : null}
          {durability ? (
            <div className="text-[#130918] font-medium flex items-center" title="Durability">
              <span className="font-semibold">Durability:&nbsp;</span>
              {durability}
            </div>
          ) : null}
          {shieldCharge ? (
            <div className="text-[#130918] font-medium flex items-center" title="Shield Charge">
              <span className="font-semibold">Shield Charge:&nbsp;</span>
              {shieldCharge}
            </div>
          ) : null}
        </div>
        ) : null}
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