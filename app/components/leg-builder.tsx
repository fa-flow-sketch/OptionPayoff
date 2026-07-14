'use client';

import { type Leg } from '@/lib/simulator';
import { bsPrice } from '@/lib/black-scholes';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import dynamic from 'next/dynamic';

const PayoffChart = dynamic(() => import('./payoff-chart'), { ssr: false, loading: () => <div className="h-[220px] bg-muted/20 rounded-lg animate-pulse mt-3" /> });

interface LegBuilderProps {
  legs: Leg[];
  setLegs: (legs: Leg[]) => void;
  currentATM: number;
  strikeStep?: number;
  iv: number; // decimal e.g. 0.25
  rfRate: number; // decimal e.g. 0.05
}

export default function LegBuilder({ legs, setLegs, currentATM, strikeStep = 10, iv, rfRate }: LegBuilderProps) {
  const addLeg = () => {
    if ((legs?.length ?? 0) >= 6) return;
    const newLeg: Leg = {
      id: Date.now().toString(),
      type: 'call',
      position: 'short',
      quantity: 1,
      strike: currentATM,
      dte: 30,
    };
    setLegs([...(legs ?? []), newLeg]);
  };

  const removeLeg = (id: string) => {
    setLegs((legs ?? []).filter((l: Leg) => l?.id !== id));
  };

  const updateLeg = (id: string, field: keyof Leg, value: any) => {
    setLegs((legs ?? []).map((l: Leg) => l?.id === id ? { ...l, [field]: value } : l));
  };

  // Compute summary
  const entryDelta = (legs ?? []).reduce((sum: number, leg: Leg) => {
    if (!leg) return sum;
    const bs = bsPrice(currentATM, leg.strike, leg.dte / 365, rfRate, iv, leg.type);
    const posSign = leg.position === 'long' ? 1 : -1;
    return sum + posSign * leg.quantity * bs.delta;
  }, 0);

  const totalPremium = (legs ?? []).reduce((sum: number, leg: Leg) => {
    if (!leg) return sum;
    const bs = bsPrice(currentATM, leg.strike, leg.dte / 365, rfRate, iv, leg.type);
    const posSign = leg.position === 'long' ? 1 : -1;
    return sum + (-posSign) * leg.quantity * 100 * bs.price;
  }, 0);

  return (
    <div className="rounded-xl bg-card border border-border p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#F5A623]" />
          <h2 className="font-display font-semibold text-sm">Leg Builder</h2>
          <span className="text-xs text-muted-foreground">({(legs?.length ?? 0)}/6)</span>
        </div>
        <button
          onClick={addLeg}
          disabled={(legs?.length ?? 0) >= 6}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F5A623]/15 text-[#F5A623] text-xs font-semibold hover:bg-[#F5A623]/25 transition-colors disabled:opacity-40"
        >
          <Plus className="w-3 h-3" /> Add Leg
        </button>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-none">
        {(legs ?? []).map((leg: Leg) => (
          <div key={leg?.id ?? ''} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
            {/* Type */}
            <select
              value={leg?.type ?? 'call'}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateLeg(leg?.id ?? '', 'type', e.target.value)}
              className="bg-secondary text-xs font-mono rounded px-2 py-1.5 border-0 outline-none focus:ring-1 focus:ring-[#F5A623]"
            >
              <option value="call">CALL</option>
              <option value="put">PUT</option>
            </select>

            {/* Position */}
            <button
              onClick={() => updateLeg(leg?.id ?? '', 'position', leg?.position === 'long' ? 'short' : 'long')}
              className={`px-2 py-1.5 rounded text-xs font-mono font-bold min-w-[52px] transition-colors ${
                leg?.position === 'long'
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {leg?.position === 'long' ? 'LONG' : 'SHORT'}
            </button>

            {/* Qty */}
            <div className="flex flex-col">
              <label className="text-[10px] text-muted-foreground">Qty</label>
              <input
                type="number"
                value={leg?.quantity ?? 1}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLeg(leg?.id ?? '', 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 bg-secondary text-xs font-mono rounded px-2 py-1 border-0 outline-none focus:ring-1 focus:ring-[#F5A623]"
                min={1}
              />
            </div>

            {/* Strike */}
            <div className="flex flex-col">
              <label className="text-[10px] text-muted-foreground">Strike</label>
              <input
                type="number"
                value={leg?.strike ?? currentATM}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLeg(leg?.id ?? '', 'strike', parseFloat(e.target.value) || currentATM)}
                className="w-20 bg-secondary text-xs font-mono rounded px-2 py-1 border-0 outline-none focus:ring-1 focus:ring-[#F5A623]"
                step={strikeStep}
              />
            </div>

            {/* DTE */}
            <div className="flex flex-col">
              <label className="text-[10px] text-muted-foreground">DTE</label>
              <input
                type="number"
                value={leg?.dte ?? 30}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLeg(leg?.id ?? '', 'dte', Math.max(1, parseInt(e.target.value) || 30))}
                className="w-14 bg-secondary text-xs font-mono rounded px-2 py-1 border-0 outline-none focus:ring-1 focus:ring-[#F5A623]"
                min={1}
              />
            </div>

            {/* Remove */}
            <button
              onClick={() => removeLeg(leg?.id ?? '')}
              className="ml-auto p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {(legs?.length ?? 0) > 0 && (
        <>
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">IV:</span>
              <span className="text-sm font-mono font-bold text-[#F5A623]">{(iv * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Net Δ:</span>
              <span className={`text-sm font-mono font-bold ${entryDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {entryDelta >= 0 ? '+' : ''}{entryDelta?.toFixed?.(3) ?? '0.000'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Premium:</span>
              <span className={`text-sm font-mono font-bold ${totalPremium >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${totalPremium?.toFixed?.(0) ?? '0'}
                <span className="text-xs text-muted-foreground ml-1">{totalPremium >= 0 ? '(collected)' : '(paid)'}</span>
              </span>
            </div>
          </div>
          <PayoffChart
            legs={legs}
            currentATM={currentATM}
            iv={iv}
            rfRate={rfRate}
            onUpdateLegStrike={(legId: string, newStrike: number) => {
              setLegs((legs ?? []).map((l: Leg) => l?.id === legId ? { ...l, strike: newStrike } : l));
            }}
          />
        </>
      )}
    </div>
  );
}
