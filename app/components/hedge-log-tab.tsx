'use client';

import { type SimResult, type HedgeEvent } from '@/lib/simulator';
import { type ContractSpec, CONTRACT_SPECS } from '@/lib/contract-specs';
import { ArrowUpCircle, ArrowDownCircle, Activity } from 'lucide-react';

interface Props {
  result: SimResult;
  isNetShort?: boolean;
  contractSpec?: ContractSpec;
}

export default function HedgeLogTab({ result, isNetShort, contractSpec = CONTRACT_SPECS.GC }: Props) {
  const hedgeLabel = contractSpec.hedgeInstrument;
  const events = result?.hedgeEvents ?? [];
  const totalContracts = events.reduce((sum: number, e: HedgeEvent) => sum + Math.abs(e?.mgcContracts ?? 0), 0);
  const totalSlippage = result?.totalHedgeCost ?? 0;
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;
  const finalHedgePnl = lastEvent?.hedgePnl ?? 0;
  const finalNetHedgeCost = lastEvent?.netHedgeCost ?? 0;
  const short = isNetShort ?? true;

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
          <p className="text-xs text-muted-foreground">Total {hedgeLabel} Traded</p>
          <p className="text-lg font-mono font-bold text-[#F5A623]">{totalContracts}</p>
        </div>
        <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
          <p className="text-xs text-muted-foreground">Slippage Cost</p>
          <p className="text-lg font-mono font-bold text-orange-400">${totalSlippage?.toFixed?.(0) ?? '0'}</p>
          <p className="text-[10px] text-muted-foreground/60">Transaction fees</p>
        </div>
        <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
          <p className="text-xs text-muted-foreground">{short ? `${hedgeLabel} Position P&L` : 'Gamma Scalp P&L'}</p>
          <p className={`text-lg font-mono font-bold ${finalHedgePnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${finalHedgePnl?.toFixed?.(0) ?? '0'}
          </p>
          <p className="text-[10px] text-muted-foreground/60">{short ? `Gains/losses on ${hedgeLabel}` : 'Income from gamma hedging'}</p>
        </div>
        <div className="rounded-xl bg-muted/30 border border-border/50 p-3 border-[#F5A623]/30">
          <p className="text-xs text-muted-foreground">{short ? 'Net Hedge Cost' : 'Net Hedge Income'}</p>
          <p className={`text-lg font-mono font-bold ${finalNetHedgeCost <= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${finalNetHedgeCost?.toFixed?.(0) ?? '0'}
          </p>
          <p className="text-[10px] text-muted-foreground/60">{short ? `Slippage - ${hedgeLabel} P&L` : 'Gamma scalp - Slippage'}</p>
        </div>
        <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
          <p className="text-xs text-muted-foreground"># Hedge Events</p>
          <p className="text-lg font-mono font-bold text-blue-400">{events.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-muted/20 border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left py-2 px-3 text-muted-foreground">#</th>
                <th className="text-left py-2 px-3 text-muted-foreground">DateTime</th>
                <th className="text-right py-2 px-3 text-muted-foreground">GC Price</th>
                <th className="text-right py-2 px-3 text-muted-foreground">{hedgeLabel} Contracts</th>
                <th className="text-center py-2 px-3 text-muted-foreground">Direction</th>
                <th className="text-right py-2 px-3 text-muted-foreground">Cumul. {hedgeLabel}</th>
                <th className="text-right py-2 px-3 text-muted-foreground">Slippage</th>
                <th className="text-right py-2 px-3 text-muted-foreground">{hedgeLabel} P&L</th>
                <th className="text-right py-2 px-3 text-muted-foreground">Net Hedge Cost</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    <Activity className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    No hedge events triggered
                  </td>
                </tr>
              ) : (
                events.map((e: HedgeEvent, i: number) => (
                  <tr key={i} className="border-t border-border/30 hover:bg-muted/20">
                    <td className="py-1.5 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-1.5 px-3 text-muted-foreground">
                      {e?.datetime?.toLocaleString?.('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? ''}
                    </td>
                    <td className="py-1.5 px-3 text-right">{e?.gcPrice?.toFixed?.(1) ?? '0'}</td>
                    <td className="py-1.5 px-3 text-right font-semibold">{Math.abs(e?.mgcContracts ?? 0)}</td>
                    <td className="py-1.5 px-3 text-center">
                      {(e?.mgcContracts ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-green-400">
                          <ArrowUpCircle className="w-3 h-3" /> BUY
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <ArrowDownCircle className="w-3 h-3" /> SELL
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-right">{e?.cumulativeMgcPosition ?? 0}</td>
                    <td className="py-1.5 px-3 text-right text-orange-400">${e?.slippageCost?.toFixed?.(0) ?? '0'}</td>
                    <td className={`py-1.5 px-3 text-right font-semibold ${(e?.hedgePnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${e?.hedgePnl?.toFixed?.(0) ?? '0'}
                    </td>
                    <td className={`py-1.5 px-3 text-right font-semibold ${(e?.netHedgeCost ?? 0) <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${e?.netHedgeCost?.toFixed?.(0) ?? '0'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}