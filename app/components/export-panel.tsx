'use client';

import { type SimResult, type BarResult, type HedgeEvent } from '@/lib/simulator';
import { type ContractSpec, CONTRACT_SPECS } from '@/lib/contract-specs';
import { Download, FileSpreadsheet, FileJson } from 'lucide-react';

function downloadFile(content: string, filename: string, type: string) {
  try {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    console.error('Download error:', err);
  }
}

export default function ExportPanel({ result, contractSpec = CONTRACT_SPECS.GC }: { result: SimResult; contractSpec?: ContractSpec }) {
  const hedgeLabel = contractSpec.hedgeInstrument;
  const exportHourlyCSV = () => {
    const headers = `Bar,DateTime,Close,IV%,Delta,Gamma,Vega,Theta,HedgeFired,${hedgeLabel}_Qty,NetPnL`;
    const rows = (result?.bars ?? []).map((b: BarResult) =>
      `${b?.barIndex ?? 0},${b?.datetime?.toISOString?.() ?? ''},${b?.close ?? 0},${(b?.iv ?? 0)?.toFixed?.(2) ?? '0'},${(b?.netDelta ?? 0)?.toFixed?.(4) ?? '0'},${(b?.netGamma ?? 0)?.toFixed?.(6) ?? '0'},${(b?.netVega ?? 0)?.toFixed?.(4) ?? '0'},${(b?.netTheta ?? 0)?.toFixed?.(4) ?? '0'},${b?.hedgeFired ? 1 : 0},${b?.mgcQty ?? 0},${(b?.netPnl ?? 0)?.toFixed?.(2) ?? '0'}`
    );
    downloadFile([headers, ...rows].join('\n'), 'gc_hourly_data.csv', 'text/csv');
  };

  const exportHedgeCSV = () => {
    const headers = `DateTime,GC_Price,${hedgeLabel}_Contracts,Direction,Cumulative_${hedgeLabel},Slippage,${hedgeLabel}_PnL,Net_Hedge_Cost`;
    const rows = (result?.hedgeEvents ?? []).map((e: HedgeEvent) =>
      `${e?.datetime?.toISOString?.() ?? ''},${e?.gcPrice ?? 0},${Math.abs(e?.mgcContracts ?? 0)},${e?.direction ?? ''},${e?.cumulativeMgcPosition ?? 0},${(e?.slippageCost ?? 0)?.toFixed?.(2) ?? '0'},${(e?.hedgePnl ?? 0)?.toFixed?.(2) ?? '0'},${(e?.netHedgeCost ?? 0)?.toFixed?.(2) ?? '0'}`
    );
    downloadFile([headers, ...rows].join('\n'), 'gc_hedge_log.csv', 'text/csv');
  };

  const exportSummaryJSON = () => {
    const summary = {
      premiumCollected: result?.premiumCollected ?? 0,
      finalOptionPnl: result?.finalOptionPnl ?? 0,
      finalHedgePnl: result?.finalHedgePnl ?? 0,
      finalNetPnl: result?.finalNetPnl ?? 0,
      totalHedgeCost: result?.totalHedgeCost ?? 0,
      numHedges: result?.numHedges ?? 0,
      cumulativeTheta: result?.cumulativeTheta ?? 0,
      hedgeEfficiency: result?.hedgeEfficiency ?? 0,
      totalBars: result?.bars?.length ?? 0,
      totalHedgeEvents: result?.hedgeEvents?.length ?? 0,
    };
    downloadFile(JSON.stringify(summary, null, 2), 'gc_summary.json', 'application/json');
  };

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Download className="w-4 h-4 text-[#F5A623]" /> Export Data
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={exportHourlyCSV}
          className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-[#F5A623]/50 hover:bg-muted/40 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Hourly Data CSV</p>
            <p className="text-xs text-muted-foreground">{result?.bars?.length ?? 0} rows of bar data</p>
          </div>
        </button>

        <button
          onClick={exportHedgeCSV}
          className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-[#F5A623]/50 hover:bg-muted/40 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Hedge Log CSV</p>
            <p className="text-xs text-muted-foreground">{result?.hedgeEvents?.length ?? 0} hedge events</p>
          </div>
        </button>

        <button
          onClick={exportSummaryJSON}
          className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-[#F5A623]/50 hover:bg-muted/40 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <FileJson className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Summary JSON</p>
            <p className="text-xs text-muted-foreground">Key metrics & stats</p>
          </div>
        </button>
      </div>
    </div>
  );
}
