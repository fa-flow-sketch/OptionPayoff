'use client';

import { useState, useMemo } from 'react';
import { type SimResult, type BarResult } from '@/lib/simulator';
import { type ContractSpec, CONTRACT_SPECS } from '@/lib/contract-specs';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const GreeksChart = dynamic(() => import('./charts/greeks-chart'), { ssr: false, loading: () => <div className="h-[300px] bg-muted/20 rounded-lg animate-pulse" /> });

const PAGE_SIZE = 50;

interface Props {
  result: SimResult;
  contractSpec?: ContractSpec;
}

export default function GreeksTab({ result, contractSpec = CONTRACT_SPECS.GC }: Props) {
  const hedgeLabel = contractSpec.hedgeInstrument;
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string>('barIndex');
  const [sortAsc, setSortAsc] = useState(true);

  const allBars = result?.bars ?? [];
  const totalPages = Math.max(1, Math.ceil(allBars.length / PAGE_SIZE));

  const sortedBars = useMemo(() => {
    const sorted = [...allBars].sort((a: BarResult, b: BarResult) => {
      const aVal = (a as any)?.[sortCol] ?? 0;
      const bVal = (b as any)?.[sortCol] ?? 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return sorted;
  }, [allBars, sortCol, sortAsc]);

  const pageBars = sortedBars.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const cols = [
    { key: 'barIndex', label: '#' },
    { key: 'datetime', label: 'DateTime' },
    { key: 'close', label: 'Close' },
    { key: 'iv', label: 'IV%' },
    { key: 'netDelta', label: 'Delta' },
    { key: 'netGamma', label: 'Gamma' },
    { key: 'netVega', label: 'Vega' },
    { key: 'netTheta', label: 'Theta' },
    { key: 'hedgeFired', label: 'Hedge' },
    { key: 'mgcQty', label: `${hedgeLabel} Qty` },
    { key: 'netPnl', label: 'Net PnL' },
  ];

  return (
    <div>
      {/* Greeks Chart */}
      <div className="rounded-xl bg-muted/20 border border-border/50 p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Greeks Over Time</h3>
        <div className="h-[300px]">
          <GreeksChart bars={allBars} />
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl bg-muted/20 border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-muted/30">
                {cols.map((col: { key: string; label: string }) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="text-left py-2 px-3 text-muted-foreground cursor-pointer hover:text-[#F5A623] transition-colors whitespace-nowrap"
                  >
                    {col.label}
                    {sortCol === col.key && <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageBars.map((b: BarResult, i: number) => (
                <tr key={b?.barIndex ?? i} className="border-t border-border/30 hover:bg-muted/20">
                  <td className="py-1.5 px-3 text-muted-foreground">{b?.barIndex ?? 0}</td>
                  <td className="py-1.5 px-3 text-muted-foreground">{b?.datetime?.toLocaleString?.('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? ''}</td>
                  <td className="py-1.5 px-3">{b?.close?.toFixed?.(1) ?? '0'}</td>
                  <td className="py-1.5 px-3">{b?.iv?.toFixed?.(1) ?? '0'}</td>
                  <td className={`py-1.5 px-3 ${(b?.netDelta ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{b?.netDelta?.toFixed?.(3) ?? '0'}</td>
                  <td className="py-1.5 px-3">{b?.netGamma?.toFixed?.(4) ?? '0'}</td>
                  <td className="py-1.5 px-3">{b?.netVega?.toFixed?.(2) ?? '0'}</td>
                  <td className="py-1.5 px-3 text-purple-400">{b?.netTheta?.toFixed?.(2) ?? '0'}</td>
                  <td className="py-1.5 px-3">{b?.hedgeFired ? <span className="text-[#F5A623] font-bold">●</span> : ''}</td>
                  <td className="py-1.5 px-3">{b?.mgcQty !== 0 ? b?.mgcQty : ''}</td>
                  <td className={`py-1.5 px-3 font-semibold ${(b?.netPnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>${b?.netPnl?.toFixed?.(0) ?? '0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 bg-muted/10">
          <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages} ({allBars.length} rows)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded hover:bg-muted/30 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded hover:bg-muted/30 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
