'use client';

import { useState } from 'react';
import { type SimParams, type HedgeMode } from '@/lib/simulator';
import { type ContractSpec, CONTRACT_SPECS } from '@/lib/contract-specs';
import { Settings, Clock, Zap, Timer, Plus, X, Target, Shield } from 'lucide-react';

interface GlobalParamsProps {
  params: SimParams;
  setParams: (p: SimParams) => void;
  maxBars: number;
  contractSpec?: ContractSpec;
}

export default function GlobalParams({ params, setParams, maxBars, contractSpec = CONTRACT_SPECS.GC }: GlobalParamsProps) {
  const hedgeLabel = contractSpec.hedgeInstrument;
  const [newTime, setNewTime] = useState('13:30');

  const update = (field: keyof SimParams, value: any) => {
    setParams({ ...(params ?? {}), [field]: value } as SimParams);
  };

  const addScheduledTime = () => {
    if (!newTime) return;
    const times = [...(params.hedgeScheduledTimes || [])];
    if (!times.includes(newTime)) {
      times.push(newTime);
      times.sort();
      update('hedgeScheduledTimes', times);
    }
  };

  const removeScheduledTime = (t: string) => {
    update('hedgeScheduledTimes', (params.hedgeScheduledTimes || []).filter((x: string) => x !== t));
  };

  const hedgeModes: { value: HedgeMode; label: string; icon: any; desc: string }[] = [
    { value: 'delta_band', label: 'Delta Band', icon: Zap, desc: 'Hedge whenever |delta| exceeds band (checked every bar)' },
    { value: 'scheduled', label: 'Scheduled', icon: Clock, desc: 'Hedge at specific times of day if |delta| > band' },
    { value: 'interval', label: 'Every N Hours', icon: Timer, desc: 'Hedge every N hours if |delta| > band' },
  ];

  return (
    <div className="rounded-xl bg-card border border-border p-4 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="w-4 h-4 text-[#F5A623]" />
        <h2 className="font-display font-semibold text-sm">Parameters</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* IV Override */}
        <div>
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            IV Override %
            <span className="text-[10px] text-muted-foreground/60">(blank=VIX)</span>
          </label>
          <input
            type="number"
            placeholder="Use VIX"
            value={params?.ivOverride !== null ? ((params?.ivOverride ?? 0) * 100) : ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value;
              update('ivOverride', val === '' ? null : parseFloat(val) / 100);
            }}
            className="w-full bg-secondary text-xs font-mono rounded-lg px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-[#F5A623] placeholder:text-muted-foreground/40"
            step={1}
          />
        </div>

        {/* Risk-Free Rate */}
        <div>
          <label className="text-xs text-muted-foreground">Risk-Free Rate %</label>
          <input
            type="number"
            value={((params?.riskFreeRate ?? 0.05) * 100)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('riskFreeRate', (parseFloat(e.target.value) || 5) / 100)}
            className="w-full bg-secondary text-xs font-mono rounded-lg px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-[#F5A623]"
            step={0.5}
          />
        </div>

        {/* Delta Band */}
        <div>
          <label className="text-xs text-muted-foreground">Delta Band Threshold</label>
          <input
            type="number"
            value={params?.deltaBand ?? 0.10}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('deltaBand', parseFloat(e.target.value) || 0.10)}
            className="w-full bg-secondary text-xs font-mono rounded-lg px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-[#F5A623]"
            step={0.05}
          />
        </div>

        {/* Max Hedges/Day */}
        <div>
          <label className="text-xs text-muted-foreground">Max Hedges/Day</label>
          <input
            type="number"
            value={params?.maxHedgesPerDay ?? 2}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('maxHedgesPerDay', Math.max(1, parseInt(e.target.value) || 2))}
            className="w-full bg-secondary text-xs font-mono rounded-lg px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-[#F5A623]"
            min={1}
          />
        </div>

        {/* MGC Slippage */}
        <div>
          <label className="text-xs text-muted-foreground">{hedgeLabel} Slippage $/contract</label>
          <input
            type="number"
            value={params?.mgcSlippage ?? 5}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('mgcSlippage', Math.max(0, parseFloat(e.target.value) || 5))}
            className="w-full bg-secondary text-xs font-mono rounded-lg px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-[#F5A623]"
            step={1}
          />
        </div>

        {/* Entry Bar */}
        <div>
          <label className="text-xs text-muted-foreground">Entry Bar (0={'>'} first)</label>
          <input
            type="number"
            value={params?.entryBar ?? 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('entryBar', Math.max(0, Math.min(maxBars - 1, parseInt(e.target.value) || 0)))}
            className="w-full bg-secondary text-xs font-mono rounded-lg px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-[#F5A623]"
            min={0}
            max={maxBars > 0 ? maxBars - 1 : 0}
          />
        </div>
      </div>

      {/* Take Profit & Stop Hedge */}
      <div className="border-t border-border/50 pt-3 mb-3">
        <div className="grid grid-cols-3 gap-3">
          {/* Take Profit */}
          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="w-3 h-3 text-green-400" />
              TP % of Premium
              <span className="text-[10px] text-muted-foreground/60">(blank=off)</span>
            </label>
            <input
              type="number"
              placeholder="Off"
              value={params?.takeProfitPct !== null ? ((params?.takeProfitPct ?? 0) * 100) : ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value;
                update('takeProfitPct', val === '' ? null : Math.max(0, parseFloat(val)) / 100);
              }}
              className="w-full bg-secondary text-xs font-mono rounded-lg px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-green-400 placeholder:text-muted-foreground/40"
              step={5}
              min={0}
            />
            <p className="text-[9px] text-muted-foreground/60 mt-0.5">Close all legs when option P&L ≥ TP%</p>
          </div>

          {/* Stop Hedge Delta Range */}
          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3 text-blue-400" />
              No-Hedge Δ Range
              <span className="text-[10px] text-muted-foreground/60">(blank=off)</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="Off"
                value={params?.stopHedgeDeltaLo ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  update('stopHedgeDeltaLo', val === '' ? null : parseFloat(val));
                }}
                className="w-full bg-secondary text-xs font-mono rounded-lg px-2 py-2 border-0 outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-muted-foreground/40"
                step={0.05}
              />
              <span className="text-muted-foreground text-[10px]">↔</span>
              <input
                type="number"
                placeholder="Off"
                value={params?.stopHedgeDeltaHi ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  update('stopHedgeDeltaHi', val === '' ? null : parseFloat(val));
                }}
                className="w-full bg-secondary text-xs font-mono rounded-lg px-2 py-2 border-0 outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-muted-foreground/40"
                step={0.05}
              />
            </div>
            <p className="text-[9px] text-muted-foreground/60 mt-0.5">If set, skip hedging when Δ is within this range (even if {'>'} band)</p>
          </div>
          {/* Stop Hedge Time */}
          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3 text-yellow-400" />
              Stop Hedge Time (UTC)
              <span className="text-[10px] text-muted-foreground/60">(blank=off)</span>
            </label>
            <input
              type="time"
              value={params?.stopHedgeTime ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('stopHedgeTime', e.target.value || null)}
              className="w-full bg-secondary text-xs font-mono rounded-lg px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-yellow-400 [color-scheme:dark]"
            />
            <p className="text-[9px] text-muted-foreground/60 mt-0.5">No hedging after this time (bar HH:MM {"≥>"} stop time)</p>
          </div>
        </div>
      </div>

      {/* Hedge Mode Section */}
      <div className="border-t border-border/50 pt-3">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-3.5 h-3.5 text-[#F5A623]" />
          <span className="text-xs font-semibold text-muted-foreground">Hedge Timing Mode</span>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {hedgeModes.map((m) => (
            <button
              key={m.value}
              onClick={() => update('hedgeMode', m.value)}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-[10px] font-medium transition-all border ${
                params.hedgeMode === m.value
                  ? 'bg-[#F5A623]/15 border-[#F5A623]/50 text-[#F5A623]'
                  : 'bg-secondary/50 border-border/50 text-muted-foreground hover:border-[#F5A623]/30'
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground/70 mb-2">
          {hedgeModes.find((m) => m.value === params.hedgeMode)?.desc}
        </p>

        {/* Mode-specific controls */}
        {params.hedgeMode === 'scheduled' && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Hedge Times (UTC)</label>
            <div className="flex gap-2">
              <input
                type="time"
                value={newTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTime(e.target.value)}
                className="flex-1 bg-secondary text-xs font-mono rounded-lg px-3 py-1.5 border-0 outline-none focus:ring-1 focus:ring-[#F5A623]"
              />
              <button
                onClick={addScheduledTime}
                className="px-2 py-1.5 rounded-lg bg-[#F5A623]/20 text-[#F5A623] hover:bg-[#F5A623]/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(params.hedgeScheduledTimes || []).map((t: string) => (
                <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F5A623]/10 text-[#F5A623] text-[10px] font-mono">
                  {t}
                  <button onClick={() => removeScheduledTime(t)} className="hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {(params.hedgeScheduledTimes || []).length === 0 && (
                <span className="text-[10px] text-muted-foreground/50">No times set — add at least one</span>
              )}
            </div>
          </div>
        )}

        {params.hedgeMode === 'interval' && (
          <div>
            <label className="text-xs text-muted-foreground">Hedge Every N Hours</label>
            <input
              type="number"
              value={params.hedgeIntervalHours ?? 1}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('hedgeIntervalHours', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-secondary text-xs font-mono rounded-lg px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-[#F5A623]"
              min={1}
              max={24}
            />
            <p className="text-[10px] text-muted-foreground/50 mt-1">Check delta every {params.hedgeIntervalHours ?? 1}h, hedge with {hedgeLabel} if |delta| {'>'} band</p>
          </div>
        )}
      </div>
    </div>
  );
}