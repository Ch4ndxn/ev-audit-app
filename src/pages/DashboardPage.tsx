import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchDashboardData } from '../lib/db';
import { DEMO_MODE } from '../lib/supabase';
import type { DashboardData, CityRow, SmRow } from '../types';

const TOKEN = import.meta.env.VITE_DASHBOARD_TOKEN || '';

function pct(n: number, d: number) { return d === 0 ? 0 : Math.round((n / d) * 100); }
function pctBar(p: number) {
  return p >= 80 ? 'bg-green-500' : p >= 50 ? 'bg-amber-400' : 'bg-red-500';
}

// ── Grand Summary card ────────────────────────────────────────────
function GrandSummary({ data }: { data: DashboardData }) {
  const total   = data.grandTotal;
  const audited = data.grandAudited;
  const flagged = data.grandFlagged;
  const cities  = data.rows.length;
  const done = pct(audited, total);
  return (
    <div className="bg-gradient-to-br from-[#0d3d82] to-[#1a6be8] text-white rounded-2xl p-4 mb-3">
      <div className="text-[11px] opacity-70 font-bold uppercase tracking-wide mb-2">Overall Fleet Progress</div>
      <div className="flex gap-3 mb-3">
        <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
          <div className="text-[26px] font-black">{audited}<span className="text-[14px] font-bold opacity-60">/{total}</span></div>
          <div className="text-[10px] opacity-70 mt-0.5">Vehicles Audited</div>
        </div>
        <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
          <div className="text-[26px] font-black text-amber-300">{flagged}</div>
          <div className="text-[10px] opacity-70 mt-0.5">Flagged / Action</div>
        </div>
        <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
          <div className="text-[26px] font-black text-green-300">{done}%</div>
          <div className="text-[10px] opacity-70 mt-0.5">Completion</div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-green-400 rounded-full transition-all duration-500"
             style={{ width: `${done}%` }} />
      </div>
      <div className="flex justify-between text-[10px] opacity-60 mt-1">
        <span>{audited} done</span><span>{total - audited} pending · {cities} cities</span>
      </div>
    </div>
  );
}

// ── City card ─────────────────────────────────────────────────────
function CityCard({ row }: { row: CityRow }) {
  const done = pct(row.audited, row.total);
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-2">
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-[16px] flex-shrink-0">🏙️</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[13px] truncate">{row.city}</div>
          <div className="text-[11px] text-gray-500">{row.audited}/{row.total} vehicles</div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <span className={`text-[11px] font-black px-2 py-0.5 rounded-full
            ${done >= 80 ? 'bg-green-100 text-green-700' : done >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            {done}%
          </span>
          {row.flagged > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              ⚠️ {row.flagged}
            </span>
          )}
        </div>
      </div>
      <div className="h-1 bg-gray-100">
        <div className={`h-full ${pctBar(done)} transition-all duration-500`}
             style={{ width: `${done}%` }} />
      </div>
    </div>
  );
}

// ── SM card ───────────────────────────────────────────────────────
function SmCard({ row }: { row: SmRow }) {
  const done = pct(row.audited, row.total);
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-2">
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-[15px] font-black text-indigo-600 flex-shrink-0">
          {row.sm[0] || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[13px] truncate">{row.sm}</div>
          <div className="text-[11px] text-gray-500">{row.city} · {row.center}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`text-[13px] font-black
            ${done >= 80 ? 'text-green-600' : done >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
            {row.audited}/{row.total}
          </div>
          <div className="text-[10px] text-gray-400">{row.total - row.audited} pending</div>
        </div>
      </div>
      <div className="h-1 bg-gray-100">
        <div className={`h-full ${pctBar(done)} transition-all duration-500`}
             style={{ width: `${done}%` }} />
      </div>
    </div>
  );
}

// ── Main Dashboard Page ───────────────────────────────────────────
export default function DashboardPage() {
  const navigate        = useNavigate();
  const [params]        = useSearchParams();
  const [data,  setData]  = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]   = useState('');
  const [view,  setView]  = useState<'city' | 'sm'>('city');
  const [query, setQuery] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const authorized = !TOKEN || params.get('token') === TOKEN || DEMO_MODE;

  async function load() {
    setLoading(true);
    try {
      const d = await fetchDashboardData();
      setData(d);
      setLastRefresh(new Date());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (authorized) load(); }, [authorized]);

  const filteredCities = useMemo(() => {
    if (!data) return [];
    if (!query) return data.rows;
    return data.rows.filter(r => r.city.toLowerCase().includes(query.toLowerCase()));
  }, [data, query]);

  const filteredSMs = useMemo(() => {
    if (!data) return [];
    if (!query) return data.smRows;
    const q = query.toLowerCase();
    return data.smRows.filter(r =>
      r.sm.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q) ||
      r.center.toLowerCase().includes(q)
    );
  }, [data, query]);

  if (!authorized) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 text-center max-w-sm shadow-lg">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="font-bold text-[17px] mb-1">Access Restricted</h2>
        <p className="text-[13px] text-gray-500">This dashboard requires an access token.<br/>
           Add <code className="bg-gray-100 px-1 rounded text-xs">?token=YOUR_TOKEN</code> to the URL.</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-[720px] mx-auto min-h-screen bg-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-br from-[#0d3d82] to-[#1a6be8] text-white px-4 py-3.5 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">📊</div>
          <div className="flex-1">
            <div className="font-bold text-[15px]">Audit Dashboard</div>
            <div className="text-[11px] opacity-75">EV Fleet Status · Last: {lastRefresh.toLocaleTimeString()}</div>
          </div>
          <button
            className="text-[11px] bg-white/20 px-3 py-1.5 rounded-lg font-semibold"
            onClick={() => navigate('/')}
          >📋 Audit Form</button>
          <button
            className="text-[11px] bg-white/20 px-3 py-1.5 rounded-lg font-semibold ml-1"
            onClick={load}
          >🔄</button>
        </div>
      </div>

      {DEMO_MODE && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-[11px] text-amber-700 text-center font-medium">
          🧪 Demo mode — showing sample data
        </div>
      )}

      <div className="px-3.5 py-4">
        {loading && !data && (
          <div className="text-center py-16">
            <div className="w-10 h-10 rounded-full border-[3px] border-blue-100 border-t-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading dashboard…</p>
          </div>
        )}

        {err && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-sm text-red-600 mb-3">
            ❌ {err}
          </div>
        )}

        {data && (
          <>
            <GrandSummary data={data} />

            {/* View toggle + search */}
            <div className="flex gap-2 mb-3">
              <div className="flex bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <button
                  className={`px-4 py-2 text-[12px] font-bold transition-colors
                    ${view === 'city' ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  onClick={() => { setView('city'); setQuery(''); }}
                >By City</button>
                <button
                  className={`px-4 py-2 text-[12px] font-bold transition-colors
                    ${view === 'sm' ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  onClick={() => { setView('sm'); setQuery(''); }}
                >By SM</button>
              </div>
              <input
                className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2 text-sm bg-white outline-none focus:border-blue-500 shadow-sm"
                placeholder={view === 'city' ? '🔍 Search city…' : '🔍 Search SM / city / center…'}
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>

            {/* Cards */}
            {view === 'city' && (
              <div>
                {filteredCities.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">No cities match</p>
                ) : (
                  filteredCities.map(r => <CityCard key={r.city} row={r} />)
                )}
              </div>
            )}
            {view === 'sm' && (
              <div>
                {filteredSMs.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">No SMs match</p>
                ) : (
                  filteredSMs.map(r => <SmCard key={`${r.sm}-${r.city}-${r.center}`} row={r} />)
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
