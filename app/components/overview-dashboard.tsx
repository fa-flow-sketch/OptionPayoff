'use client';

import { type SimResult, type LegPnl } from '@/lib/simulator';
import { type ContractSpec, CONTRACT_SPECS } from '@/lib/contract-specs';
import { Hash, TrendingDown, TrendingUp, Shield, Activity, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';

const PriceChart = dynamic(() => import('./charts/price-chart'), { ssr: false, loading: () => <div className="h-[300px] bg-muted/20 rounded-lg animate-pulse" /> });
const PnlChart = dynamic(() => import('./charts/pnl-chart'), { ssr: false, loading: () => <div className="h-[300px] bg-muted/20 rounded-lg animate-pulse" /> });

interface Props {
  result: SimResult;
  contractSpec?: ContractSpec;
}

function StatCard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-muted/30 border border-border/50 p-4 hover:border-[#F5A623]/30 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-mono font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function OverviewDashboard({ result, contractSpec = CONTRACT_SPECS.GC }: Props) {
  if (!result) return null;
  const r = result;
  const hedgeLabel = contractSpec.hedgeInstrument;

  const isNetShort = r.premiumCollected >= 0;
  const optionPnl = r.finalOptionPnl ?? 0;
  const hedgePnl = r.finalHedgePnl ?? 0;
  const slippage = r.totalHedgeCost ?? 0;
  const theta = r.cumulativeTheta ?? 0;
  const netPnl = r.finalNetPnl ?? 0;

  return (
    <div>
      {/* Take Profit Banner */}
      {r.tpHit && r.tpTime && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-3 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <span className="text-lg">🎯</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-400">Take Profit Hit!</p>
            <p className="text-xs text-muted-foreground">
              Closed all positions at bar #{r.tpBar} ({r.tpTime.toLocaleDateString?.('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) ?? 'N/A'}) — locked P&L: <span className="font-mono text-green-400">${r.tpPnl?.toFixed(0) ?? '0'}</span>
            </p>
          </div>
        </div>
      )}

      {/* Hedge Stopped Banner */}
      {r.hedgingStopped && r.hedgingStoppedBar !== null && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-400">Hedging Stopped — Δ Out of Range</p>
            <p className="text-xs text-muted-foreground">
              Effective delta exceeded hedge range at bar #{r.hedgingStoppedBar}. Hedging permanently disabled from this point.
            </p>
          </div>
        </div>
      )}

      {/* P&L Formula Breakdown — simplified */}
      <div className="rounded-xl bg-muted/20 border border-[#F5A623]/30 p-4 mb-6">
        <h3 className="text-xs font-semibold text-[#F5A623] mb-3 uppercase tracking-wider">P&L Breakdown</h3>
        <div className="flex items-center flex-wrap gap-3 font-mono text-sm">
          {/* Option P&L */}
          <div className="flex flex-col items-center min-w-[90px]">
            <span className="text-[10px] text-muted-foreground mb-1">Option P&L</span>
            <span className={`text-lg font-bold ${optionPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${optionPnl.toFixed(0)}
            </span>
            <span className="text-[9px] text-muted-foreground mt-0.5">Entry − current value</span>
          </div>
          <span className="text-muted-foreground text-lg">+</span>
          {/* Hedge P&L */}
          <div className="flex flex-col items-center min-w-[90px]">
            <span className="text-[10px] text-muted-foreground mb-1">{isNetShort ? 'Hedge P&L' : 'Gamma Scalp'}</span>
            <span className={`text-lg font-bold ${hedgePnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${hedgePnl.toFixed(0)}
            </span>
            <span className="text-[9px] text-muted-foreground mt-0.5">{hedgeLabel} positions</span>
          </div>
          <span className="text-muted-foreground text-lg">−</span>
          {/* Slippage */}
          <div className="flex flex-col items-center min-w-[70px]">
            <span className="text-[10px] text-muted-foreground mb-1">Slippage</span>
            <span className="text-lg font-bold text-orange-400">
              ${slippage.toFixed(0)}
            </span>
            <span className="text-[9px] text-muted-foreground mt-0.5">{r.numHedges} trades</span>
          </div>
          <span className="text-muted-foreground text-lg">=</span>
          {/* Net P&L */}
          <div className="flex flex-col items-center min-w-[90px]">
            <span className="text-[10px] text-muted-foreground mb-1">Net P&L</span>
            <span className={`text-2xl font-bold ${netPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${netPnl.toFixed(0)}
            </span>
            <span className={`text-[9px] mt-0.5 ${netPnl >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
              {r.hedgeEfficiency?.toFixed(1)}% efficiency
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Source Breakdown */}
      {r.pricingSources && (r.pricingSources.exact + r.pricingSources.interpolated + r.pricingSources.fallback) > 0 && (
        <div className="rounded-xl bg-muted/20 border border-border/50 p-3 mb-6">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">Option Pricing Source:</span>
            <span className="font-mono text-green-400">{r.pricingSources.exact.toLocaleString()} exact</span>
            <span className="font-mono text-blue-400">{r.pricingSources.interpolated.toLocaleString()} interpolated</span>
            <span className="font-mono text-muted-foreground">{r.pricingSources.fallback.toLocaleString()} fallback (ATM IV)</span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard
          icon={isNetShort ? TrendingDown : TrendingUp}
          label="Option P&L"
          value={`$${optionPnl.toFixed(0)}`}
          color={optionPnl >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
          sub={`Σ (entry − current) × qty × 100`}
        />
        <StatCard
          icon={Activity}
          label={isNetShort ? `Hedge P&L (${hedgeLabel})` : 'Gamma Scalp P&L'}
          value={`$${hedgePnl.toFixed(0)}`}
          color={hedgePnl >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
          sub={hedgePnl >= 0 ? `${hedgeLabel} positions gained` : `${hedgeLabel} positions lost`}
        />
        <StatCard
          icon={Shield}
          label="Slippage"
          value={`$${slippage.toFixed(0)}`}
          color="bg-orange-500/20 text-orange-400"
          sub={`$${(r.numHedges > 0 ? (slippage / r.numHedges).toFixed(1) : '0')}/trade avg`}
        />
        <StatCard
          icon={Activity}
          label={r.cumulativeTheta >= 0 ? 'Theta Income' : 'Theta Cost'}
          value={`$${Math.abs(r.cumulativeTheta ?? 0).toFixed(0)}`}
          color={r.cumulativeTheta >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
          sub={r.cumulativeTheta >= 0 ? 'Time decay works for you' : 'Time decay works against you'}
        />
        <StatCard
          icon={Hash}
          label="# of Hedges"
          value={`${r.numHedges ?? 0}`}
          color="bg-blue-500/20 text-blue-400"
        />
      </div>

      {/* Leg P&L Breakdown */}
      {r.legPnls && r.legPnls.length > 0 && (
        <div className="rounded-xl bg-muted/20 border border-border/50 p-4 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Per-Leg P&L Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {r.legPnls.map((leg: LegPnl, i: number) => (
              <div key={i} className="rounded-lg bg-muted/30 border border-border/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold">{leg.legLabel}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                    leg.position === 'short' ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'
                  }`}>
                    {leg.position === 'short' ? 'SHORT' : 'LONG'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{leg.position === 'short' ? 'Sold @' : 'Bought @'}</span>
                    <span className="font-mono text-muted-foreground">${leg.entryValue.toFixed(2)}/oz</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Current Value</span>
                    <span className={`font-mono ${leg.position === 'short' ? (leg.currentValue < leg.entryValue ? 'text-green-400' : 'text-red-400') : (leg.currentValue > leg.entryValue ? 'text-green-400' : 'text-red-400')}`}>
                      ${leg.currentValue.toFixed(2)}/oz
                    </span>
                  </div>
                  <div className="border-t border-border/50 pt-1.5 flex justify-between">
                    <span className="text-xs font-medium">P&L</span>
                    <span className={`text-sm font-mono font-bold ${leg.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${leg.pnl.toFixed(0)}
                    </span>
                    <span className="text-[9px] text-muted-foreground self-center">
                      {leg.position === 'short' ? '(sold − current) × qty × 100' : '(current − bought) × qty × 100'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-muted/20 border border-border/50 p-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{contractSpec.id} Close Price</h3>
          <div className="h-[300px]">
            <PriceChart bars={r.bars ?? []} />
          </div>
        </div>
        <div className="rounded-xl bg-muted/20 border border-border/50 p-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Net P&L Over Time</h3>
          <div className="h-[300px]">
            <PnlChart bars={r.bars ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}