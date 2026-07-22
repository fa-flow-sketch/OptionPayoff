'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { parseGCData, type BarData } from '@/lib/csv-parser';
import { runSimulation, type Leg, type SimParams, type SimResult } from '@/lib/simulator';
import { CONTRACT_SPECS, type ContractSpec } from '@/lib/contract-specs';
import { fetchESUnderlying, fetchESOptions, parseESData, ALL_ES_CONTRACTS } from '@/lib/es-parser';
import { fetchGCUnderlying, fetchGCOptions, parseGCData as parseGCJsonData, ALL_GC_CONTRACTS } from '@/lib/gc-parser';
import { fetchHSIUnderlying, fetchHSIOptions, parseHSIData, fetchVHSI, hasVHSICoverage, ALL_HSI_CONTRACTS } from '@/lib/hsi-parser';
import LegBuilder from './leg-builder';
import GlobalParams from './global-params';
import ResultsTabs from './results-tabs';
import DataPreview from './data-preview';
import { Upload, Play, Loader2, BarChart3, TrendingUp, Database } from 'lucide-react';
import { toast } from 'sonner';

function getStrategyName(legs: Leg[]): string {
  if (legs.length === 0) return 'No Legs';
  if (legs.length === 1) {
    const l = legs[0];
    if (!l) return 'Custom';
    return `${l.position === 'long' ? 'Long' : 'Short'} ${l.type === 'call' ? 'Call' : 'Put'}`;
  }
  if (legs.length === 2) {
    const [a, b] = legs;
    if (!a || !b) return 'Custom';
    if (a.position === b.position && a.type !== b.type && a.strike === b.strike) {
      return a.position === 'short' ? 'Short Straddle' : 'Long Straddle';
    }
    if (a.position === b.position && a.type !== b.type && a.strike !== b.strike) {
      return a.position === 'short' ? 'Short Strangle' : 'Long Strangle';
    }
    if (a.type === b.type && a.position !== b.position) {
      const spread = a.type === 'call' ? 'Call Spread' : 'Put Spread';
      return spread;
    }
  }
  if (legs.length === 4) {
    const allSamePos = legs.every((l: Leg) => l?.position === legs[0]?.position);
    if (allSamePos) return legs[0]?.position === 'short' ? 'Short Iron Condor' : 'Long Iron Condor';
  }
  return 'Custom';
}

export default function SimulatorClient() {
  const [bars, setBars] = useState<BarData[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [legs, setLegs] = useState<Leg[]>([]);
  const [params, setParams] = useState<SimParams>({
    ivOverride: null,
    riskFreeRate: 0.05,
    deltaBand: 0.10,
    maxHedgesPerDay: 2,
    mgcSlippage: 5,
    entryBar: 0,
    hedgeMode: 'delta_band',
    hedgeScheduledTimes: ['13:30'],
    hedgeIntervalHours: 1,
    takeProfitPct: null,
    stopHedgeDeltaLo: -0.30,
    stopHedgeDeltaHi: 0.30,
    stopHedgeTime: null,
    contractSpec: CONTRACT_SPECS.GC,
  });
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dataSource, setDataSource] = useState<'gc_json' | 'es_json' | 'hsi_json'>('gc_json');
  const [esContract, setEsContract] = useState('ESH6');
  const [esLoading, setEsLoading] = useState(false);
  const [gcContract, setGcContract] = useState('OGH6');
  const [gcLoading, setGcLoading] = useState(false);
  const [hsiContract, setHsiContract] = useState('HSI26H');
  const [hsiLoading, setHsiLoading] = useState(false);
  const [hsiIvSource, setHsiIvSource] = useState<'bs' | 'vhsi'>('bs');

  // Load GC Parquet data on mount and when contract changes
  useEffect(() => {
    if (dataSource !== 'gc_json') return;
    setGcLoading(true);
    setDataLoaded(false);
    setSimResult(null);

    Promise.all([
      fetchGCUnderlying(gcContract),
      fetchGCOptions(gcContract),
    ])
      .then(([underlying, options]) => {
        const parsed = parseGCJsonData(underlying, options, gcContract, params.riskFreeRate);
        if (parsed.length > 0) {
          setBars(parsed);
          setDataLoaded(true);
          setFileName(`${gcContract} (GC Options)`);
          const first = parsed[0]?.time;
          const last = parsed[parsed.length - 1]?.time;
          if (first) setStartDate(first.toISOString().slice(0, 10));
          if (last) setEndDate(last.toISOString().slice(0, 10));
          const step = CONTRACT_SPECS.GC.strikeStep;
          const atm = Math.round((parsed[0]?.close ?? 4500) / step) * step;
          setLegs([
            { id: '1', type: 'call', position: 'short', quantity: 1, strike: atm, dte: 30 },
            { id: '2', type: 'put', position: 'short', quantity: 1, strike: atm, dte: 30 },
          ]);
          // Switch to GC contract specs
          setParams(p => ({ ...p, mgcSlippage: CONTRACT_SPECS.GC.defaultSlippage, contractSpec: CONTRACT_SPECS.GC }));
          toast.success(`Loaded ${parsed.length} bars for ${gcContract}`);
        }
      })
      .catch((err: any) => {
        console.error('Failed to load GC data:', err);
        toast.error(`Failed to load GC data: ${err?.message ?? 'Unknown'}`);
      })
      .finally(() => setGcLoading(false));
  }, [dataSource, gcContract, params.riskFreeRate]);

  // Load ES data when contract changes
  useEffect(() => {
    if (dataSource !== 'es_json') return;
    setEsLoading(true);
    setDataLoaded(false);
    setSimResult(null);

    Promise.all([
      fetchESUnderlying(esContract),
      fetchESOptions(esContract),
    ])
      .then(([underlying, options]) => {
        const parsed = parseESData(underlying, options, esContract, params.riskFreeRate);
        if (parsed.length > 0) {
          setBars(parsed);
          setDataLoaded(true);
          setFileName(`${esContract} (ES Options)`);
          const first = parsed[0]?.time;
          const last = parsed[parsed.length - 1]?.time;
          if (first) setStartDate(first.toISOString().slice(0, 10));
          if (last) setEndDate(last.toISOString().slice(0, 10));
          const step = CONTRACT_SPECS.ES.strikeStep;
          const atm = Math.round((parsed[0]?.close ?? 6000) / step) * step;
          setLegs([
            { id: '1', type: 'call', position: 'short', quantity: 1, strike: atm, dte: 30 },
            { id: '2', type: 'put', position: 'short', quantity: 1, strike: atm, dte: 30 },
          ]);
          // Switch to ES contract specs
          setParams(p => ({ ...p, mgcSlippage: CONTRACT_SPECS.ES.defaultSlippage, contractSpec: CONTRACT_SPECS.ES }));
          toast.success(`Loaded ${parsed.length} bars for ${esContract}`);
        }
      })
      .catch((err: any) => {
        console.error('Failed to load ES data:', err);
        toast.error(`Failed to load ES data: ${err?.message ?? 'Unknown'}`);
      })
      .finally(() => setEsLoading(false));
  }, [dataSource, esContract, params.riskFreeRate]);

  // Load HSI data when contract changes
  useEffect(() => {
    if (dataSource !== 'hsi_json') return;
    setHsiLoading(true);
    setDataLoaded(false);
    setSimResult(null);

    const fetchers: Promise<any>[] = [
      fetchHSIUnderlying(hsiContract),
      fetchHSIOptions(hsiContract),
    ];
    if (hsiIvSource === 'vhsi') {
      fetchers.push(fetchVHSI().catch(() => null));
    }

    Promise.all(fetchers)
      .then((results) => {
        const underlying = results[0];
        const options = results[1];
        const vhsiMap = hsiIvSource === 'vhsi' ? results[2] : null;
        const parsed = parseHSIData(underlying, options, hsiContract, params.riskFreeRate, vhsiMap);
        if (vhsiMap) {
          const count = parsed.filter(b => b.vix >= 16 && b.vix <= 35).length;
          if (count === 0) {
            toast.warning('VHSI coverage not available for this contract, using data IV');
          }
        }
        if (parsed.length > 0) {
          setBars(parsed);
          setDataLoaded(true);
          const ivLabel = hsiIvSource === 'vhsi' ? 'VHSI' : 'BS IV';
          setFileName(`${hsiContract} (HSI ${ivLabel})`);
          const first = parsed[0]?.time;
          const last = parsed[parsed.length - 1]?.time;
          if (first) setStartDate(first.toISOString().slice(0, 10));
          if (last) setEndDate(last.toISOString().slice(0, 10));
          const step = CONTRACT_SPECS.HSI.strikeStep;
          const atm = Math.round((parsed[0]?.close ?? 20000) / step) * step;
          setLegs([
            { id: '1', type: 'call', position: 'short', quantity: 1, strike: atm, dte: 30 },
            { id: '2', type: 'put', position: 'short', quantity: 1, strike: atm, dte: 30 },
          ]);
          setParams(p => ({ ...p, mgcSlippage: CONTRACT_SPECS.HSI.defaultSlippage, contractSpec: CONTRACT_SPECS.HSI }));
          toast.success(`Loaded ${parsed.length} bars for ${hsiContract}`);
        }
      })
      .catch((err: any) => {
        console.error('Failed to load HSI data:', err);
        toast.error(`Failed to load HSI data: ${err?.message ?? 'Unknown'}`);
      })
      .finally(() => setHsiLoading(false));
  }, [dataSource, hsiContract, params.riskFreeRate, hsiIvSource]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev: ProgressEvent<FileReader>) => {
      const text = ev?.target?.result as string;
      if (!text) return;
      const parsed = parseGCData(text);
      if (parsed.length === 0) {
        toast.error('Could not parse CSV. Check format.');
        return;
      }
      setBars(parsed);
      setDataLoaded(true);
      setFileName(file.name);
      setSimResult(null);
      const first = parsed[0]?.time;
      const last = parsed[parsed.length - 1]?.time;
      if (first) setStartDate(first.toISOString().slice(0, 10));
      if (last) setEndDate(last.toISOString().slice(0, 10));
      toast.success(`Loaded ${parsed.length} bars from ${file.name}`);
    };
    reader.readAsText(file);
  }, []);

  // Filter bars by date range
  const filteredBars = useMemo(() => {
    if (!startDate && !endDate) return bars;
    return bars.filter((b: BarData) => {
      if (!b?.time) return false;
      const d = b.time.toISOString().slice(0, 10);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [bars, startDate, endDate]);

  const handleRunSimulation = useCallback(() => {
    if (filteredBars.length === 0) {
      toast.error('No data in selected date range');
      return;
    }
    if (legs.length === 0) {
      toast.error('Add at least one leg');
      return;
    }
    setIsRunning(true);
    setTimeout(() => {
      try {
        const result = runSimulation(filteredBars, legs, params);
        setSimResult(result);
        toast.success(`Simulation complete — ${filteredBars.length} bars`);
      } catch (err: any) {
        console.error(err);
        toast.error('Simulation error: ' + (err?.message ?? 'Unknown'));
      } finally {
        setIsRunning(false);
      }
    }, 50);
  }, [filteredBars, legs, params]);

  const strategyName = useMemo(() => getStrategyName(legs), [legs]);

  const spec = params.contractSpec || CONTRACT_SPECS.GC;
  const currentATM = useMemo(() => {
    const step = spec.strikeStep;
    const fallback = spec.id === 'ES' ? 6000 : spec.id === 'HSI' ? 20000 : 2600;
    if (filteredBars.length === 0) return bars.length > 0 ? Math.round((bars[0]?.close ?? fallback) / step) * step : fallback;
    return Math.round((filteredBars[0]?.close ?? fallback) / step) * step;
  }, [filteredBars, bars, spec.strikeStep]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-[hsl(228,14%,11%)]/95 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F5A623]/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#F5A623]" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-[#F5A623]">{spec.label} Delta-Hedge Simulator</h1>
              <p className="text-xs text-muted-foreground">Black-Scholes P&L Engine • {spec.id === 'ES' ? 'E-mini S&P 500' : spec.id === 'HSI' ? 'Hang Seng Index' : 'Gold Futures'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {strategyName !== 'No Legs' && (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30">
                {strategyName}
              </span>
            )}
            <button
              onClick={handleRunSimulation}
              disabled={isRunning || !dataLoaded || legs.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#F5A623] text-[hsl(228,15%,8%)] font-semibold text-sm hover:bg-[#F5A623]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isRunning ? 'Running...' : 'Run Simulation'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Top Configuration Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          {/* Data Source */}
          <div className="lg:col-span-3">
            <div className="rounded-xl bg-card border border-border p-4 h-full">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-[#F5A623]" />
                <h2 className="font-display font-semibold text-sm">Data Source</h2>
              </div>

              {/* Data Source Toggle */}
              <div className="grid grid-cols-3 gap-1 mb-3">
                <button
                  onClick={() => setDataSource('gc_json')}
                  className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-all border ${
                    dataSource === 'gc_json'
                      ? 'bg-[#F5A623]/15 border-[#F5A623]/50 text-[#F5A623]'
                      : 'bg-secondary/50 border-border/50 text-muted-foreground hover:border-[#F5A623]/30'
                  }`}
                >
                  GC
                </button>
                <button
                  onClick={() => setDataSource('es_json')}
                  className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-all border ${
                    dataSource === 'es_json'
                      ? 'bg-[#F5A623]/15 border-[#F5A623]/50 text-[#F5A623]'
                      : 'bg-secondary/50 border-border/50 text-muted-foreground hover:border-[#F5A623]/30'
                  }`}
                >
                  ES
                </button>
                <button
                  onClick={() => setDataSource('hsi_json')}
                  className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-all border ${
                    dataSource === 'hsi_json'
                      ? 'bg-[#F5A623]/15 border-[#F5A623]/50 text-[#F5A623]'
                      : 'bg-secondary/50 border-border/50 text-muted-foreground hover:border-[#F5A623]/30'
                  }`}
                >
                  HSI
                </button>
              </div>

              {/* GC Contract Selector */}
              {dataSource === 'gc_json' && (
                <div className="mb-3">
                  <label className="text-xs text-muted-foreground">Contract</label>
                  <select
                    value={gcContract}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGcContract(e.target.value)}
                    className="w-full bg-secondary text-xs font-mono rounded-lg px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-[#F5A623] mt-1"
                  >
                    {ALL_GC_CONTRACTS.map((c) => (
                      <option key={c.symbol} value={c.symbol} disabled={c.rows === 0}>
                        {c.label} {c.rows === 0 ? '(no data)' : c.rows < 100 ? `(${c.rows} ⚠️)` : `(${c.rows})`}
                      </option>
                    ))}
                  </select>
                  {gcLoading && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading GC data...
                    </div>
                  )}
                </div>
              )}

              {/* GC CSV Upload (legacy) */}
              <details className="mb-3">
                <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-[#F5A623] transition-colors">Or upload GC CSV</summary>
                <label className="flex items-center justify-center gap-2 px-4 py-3 mt-1 rounded-lg border border-dashed border-border hover:border-[#F5A623]/50 cursor-pointer transition-colors bg-muted/30">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload GC CSV</span>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
              </details>

              {/* HSI Contract Selector */}
              {dataSource === 'hsi_json' && (
                <div className="mb-3">
                  <label className="text-xs text-muted-foreground">Contract</label>
                  <select
                    value={hsiContract}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setHsiContract(e.target.value)}
                    className="w-full bg-secondary text-xs font-mono rounded-lg px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-[#F5A623] mt-1"
                  >
                    {ALL_HSI_CONTRACTS.map((c) => (
                      <option key={c.symbol} value={c.symbol} disabled={c.rows < 5}>
                        {c.label} {c.rows < 5 ? '(no data)' : c.rows < 20 ? `(${c.rows} ⚠️)` : `(${c.rows})`}{hasVHSICoverage(c.symbol) ? ' VHSI' : ''}
                      </option>
                    ))}
                  </select>
                  {/* IV Source toggle */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground">IV Source:</span>
                    <button
                      onClick={() => setHsiIvSource('bs')}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                        hsiIvSource === 'bs'
                          ? 'bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/40'
                          : 'bg-secondary text-muted-foreground border border-border/30 hover:border-[#F5A623]/30'
                      }`}
                    >
                      BS IV
                    </button>
                    <button
                      onClick={() => setHsiIvSource('vhsi')}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                        hsiIvSource === 'vhsi'
                          ? 'bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/40'
                          : 'bg-secondary text-muted-foreground border border-border/30 hover:border-[#F5A623]/30'
                      }`}
                    >
                      VHSI
                    </button>
                  </div>
                  {hsiLoading && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading HSI data...
                    </div>
                  )}
                </div>
              )}

              {/* ES Contract Selector */}
              {dataSource === 'es_json' && (
                <div className="mb-3">
                  <label className="text-xs text-muted-foreground">Contract</label>
                  <select
                    value={esContract}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEsContract(e.target.value)}
                    className="w-full bg-secondary text-xs font-mono rounded-lg px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-[#F5A623] mt-1"
                  >
                    {ALL_ES_CONTRACTS.map((c) => (
                      <option key={c.symbol} value={c.symbol} disabled={c.rows === 0}>
                        {c.label} {c.rows === 0 ? '(no data)' : c.rows < 100 ? `(${c.rows} ⚠️)` : `(${c.rows})`}
                      </option>
                    ))}
                  </select>
                  {esLoading && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading ES data...
                    </div>
                  )}
                </div>
              )}
              {dataLoaded && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-xs">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span className="text-green-400 font-mono">{fileName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {bars.length} total bars
                  </p>
                  {/* Date Range Selector */}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Backtest Date Range</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground">From</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setStartDate(e.target.value); setSimResult(null); }}
                          className="w-full bg-secondary text-xs font-mono rounded px-2 py-1.5 border-0 outline-none focus:ring-1 focus:ring-[#F5A623] [color-scheme:dark]"
                        />
                      </div>
                      <span className="text-muted-foreground text-xs mt-3">→</span>
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground">To</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEndDate(e.target.value); setSimResult(null); }}
                          className="w-full bg-secondary text-xs font-mono rounded px-2 py-1.5 border-0 outline-none focus:ring-1 focus:ring-[#F5A623] [color-scheme:dark]"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
                      {filteredBars.length} bars selected
                      {filteredBars.length > 0 && (
                        <> | {filteredBars[0]?.time?.toLocaleDateString?.('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }) ?? ''} → {filteredBars[filteredBars.length - 1]?.time?.toLocaleDateString?.('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }) ?? ''}</>
                      )}
                    </p>
                  </div>
                </div>
              )}
              {dataLoaded && <DataPreview bars={filteredBars} />}
            </div>
          </div>

          {/* Leg Builder */}
          <div className="lg:col-span-5">
            <LegBuilder legs={legs} setLegs={setLegs} currentATM={currentATM} strikeStep={spec.strikeStep} iv={params.ivOverride !== null ? params.ivOverride : ((filteredBars[0]?.vix ?? 15) / 100)} rfRate={params.riskFreeRate} />
          </div>

          {/* Global Parameters */}
          <div className="lg:col-span-4">
            <GlobalParams params={params} setParams={setParams} maxBars={filteredBars.length} contractSpec={spec} />
          </div>
        </div>

        {/* Results */}
        {simResult && (
          <ResultsTabs
            result={simResult}
            bars={bars}
            legs={legs}
            params={params}
          />
        )}

        {!simResult && dataLoaded && (
          <div className="rounded-xl bg-card border border-border p-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Configure your strategy above and click <span className="text-[#F5A623] font-semibold">Run Simulation</span> to see results</p>
          </div>
        )}
      </main>
    </div>
  );
}
