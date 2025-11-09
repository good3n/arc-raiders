
import React, { useEffect, useMemo, useState } from 'react';

type TabKey = 'items' | 'arcs' | 'quests' | 'traders' | 'maps';

const ENDPOINTS: Record<TabKey, string> = {
  items: '/api/arc-raiders/items',
  arcs: '/api/arc-raiders/arcs',
  quests: '/api/arc-raiders/quests',
  traders: '/api/arc-raiders/traders',
  maps: '/api/game-map-data',
};

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

  const endpoint = useMemo(() => {
    if (active === 'maps' && mapFilter) {
      const p = new URLSearchParams({ map: mapFilter });
      return `${ENDPOINTS[active]}?${p.toString()}`;
    }
    return ENDPOINTS[active];
  }, [active, mapFilter]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        const arr = Array.isArray(json) ? json : (json?.data || json?.items || json?.arcs || json?.quests || json?.traders || json?.points || []);
        if (!ignore) setData(arr);
      } catch (e: any) {
        if (!ignore) setError(String(e));
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [endpoint]);

  const filtered = useMemo(() => {
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter((x) => JSON.stringify(x).toLowerCase().includes(q));
  }, [data, query]);

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['items','arcs','quests','traders','maps'] as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={classNames(
              'px-3 py-2 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap',
              active === tab ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'
            )}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

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
        {filtered && filtered.length > 0 ? filtered.slice(0, 200).map((row: any, i: number) => (
          <article key={i} className="rounded-2xl border border-slate-200 shadow-sm p-4 bg-white">
            <CardRow row={row} index={i} />
          </article>
        )) : (
          <div className="text-sm text-slate-500">No results.</div>
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
