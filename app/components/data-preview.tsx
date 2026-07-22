'use client';

import { type BarData } from '@/lib/csv-parser';

export default function DataPreview({ bars }: { bars: BarData[] }) {
  const preview = (bars ?? []).slice(0, 5);
  if (preview.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-xs text-muted-foreground mb-1">Preview (first 5 bars)</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left py-1 pr-2">Time</th>
              <th className="text-right py-1 pr-2">Close</th>
              <th className="text-right py-1">VIX</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((b: BarData, i: number) => (
              <tr key={i} className="border-t border-border/30">
                <td className="py-1 pr-2 text-muted-foreground">{b?.time?.toLocaleDateString?.('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }) ?? 'N/A'}</td>
                <td className="text-right py-1 pr-2">{b?.close?.toFixed?.(1) ?? '0'}</td>
                <td className="text-right py-1">{b?.vix?.toFixed?.(1) ?? '0'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
