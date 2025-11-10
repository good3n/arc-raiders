import React, { useEffect, useMemo, useState } from 'react';

const AVAILABLE_MAPS = [
  'Dam',
  'Spaceport',
  'Buried City',
  'Blue Gate'
];

export default function MapExplorer() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedMap, setSelectedMap] = useState('Dam'); // Default to Dam

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ 
      tableID: 'arc-raiders',
      mapID: selectedMap 
    });
    return `/api/game-map-data?${params.toString()}`;
  }, [selectedMap]);

  // Load data when endpoint changes
  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(endpoint, { 
          headers: { Accept: 'application/json' }
        });
        
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        
        if (!ignore) {
          setData(json);
        }
      } catch (e: any) {
        if (!ignore) {
          setError(e.message || 'Failed to load data');
          setData([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    if (selectedMap) {
      loadData();
    } else {
      setData([]);
    }
    
    return () => {
      ignore = true;
    };
  }, [endpoint, selectedMap]);

  // Filter data based on search query
  const filtered = useMemo(() => {
    let list: any[] = [];
  
    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === "object") {
      // Handle different API response structures
      const possibleArrays = [
        (data as any).data,
        (data as any).points,
        (data as any).locations,
        (data as any).results,
      ];
      const found = possibleArrays.find((v) => Array.isArray(v));
      if (found) list = found;
    }
  
    if (!query) return list;
  
    const q = query.toLowerCase();
    return list.filter((item) => {
      // Search in map point fields
      const searchable = [
        item.name,
        item.description,
        item.type,
        item.category,
        item.zone,
        item.coordinates?.toString(),
        item.notes
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchable.includes(q);
    });
  }, [data, query]);

  // Render map point or location
  const renderMapItem = (item: any, index: number) => {
    const title = item?.name || item?.location || item?.id || `Location ${index + 1}`;
    const type = item?.type || item?.category || '';
    const description = item?.description || item?.notes || '';
    const coordinates = item?.coordinates || item?.position || null;
    const zone = item?.zone || item?.area || '';

    return (
      <article key={item.id || index} className="rounded-2xl border border-[#442A50] shadow-sm p-4 bg-[#1B0F21]">
        <div>
          <header className="mb-3">
            <h3 className="font-semibold text-xl text-light">{title}</h3>
            {type && (
              <span className="inline-block mt-1 px-2 py-1 text-xs rounded-md bg-[#442A50]">
                {type}
              </span>
            )}
          </header>
          
          {description && (
            <p className="text-sm mb-3">{description}</p>
          )}
          
          <div className="space-y-2 text-sm">
            {zone && (
              <div className="flex items-center">
                <span className="font-medium">Zone:</span>
                <span className="ml-2">{zone}</span>
              </div>
            )}
            
            {coordinates && (
              <div className="flex items-center">
                <span className="font-medium">Coordinates:</span>
                <span className="ml-2 font-mono text-xs">
                  {Array.isArray(coordinates) ? coordinates.join(', ') : coordinates}
                </span>
              </div>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div>
      {/* Controls */}
      <section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
        <label className="block">
          <span className="block text-xs font-semibold text-dark">Search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Type to filter locations…"
            className="mt-1 w-full rounded-xl border border-light bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue1"
          />
        </label>
        
        <label className="block">
          <span className="block text-xs font-semibold">Map</span>
          <select
            value={selectedMap}
            onChange={(e) => setSelectedMap(e.target.value)}
            className="mt-1 w-full rounded-xl border border-light bg-light px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue"
          >
            <option value="">Select a map…</option>
            {AVAILABLE_MAPS.map((map) => (
              <option key={map} value={map}>
                {map}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* Status */}
      <div className="mb-4 text-xs">
        {!selectedMap 
          ? 'Select a map from the dropdown above to load data.'
          : loading 
          ? `Loading ${selectedMap} map data…` 
          : error 
          ? `Error: ${error}` 
          : `Showing ${filtered.length} locations on ${selectedMap}`}
      </div>

      {/* Results */}
      <section className="grid grid-cols-3 gap-3">
        {selectedMap && filtered && filtered.length > 0 ? (
          filtered.slice(0, 200).map((item: any, index: number) => renderMapItem(item, index))
        ) : selectedMap && !loading && filtered.length === 0 ? (
          <div className="text-sm">No locations found on {selectedMap}.</div>
        ) : null}
      </section>
    </div>
  );
}