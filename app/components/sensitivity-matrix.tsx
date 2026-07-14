'use client';

import { useState, useCallback, useMemo } from 'react';
import { runSensitivityMatrix, type Leg, type SimParams } from '@/lib/simulator';
import { type BarData } from '@/lib/csv-parser';
import { Loader2, Play, Grid3X3 } from 'lucide-react';

const MAX_HEDGES = [1, 2, 3, 4, 5, 8, 10];

function generateBands(legs: Leg[]): number[] {
  // Find max qty of either call side or put side
  let callQty = 0;
  let putQty = 0;
  for (const leg of (legs ?? [])) {
    if (!leg) continue;
    if (leg.type === 'call') callQty += leg.quantity;
    else putQty += leg.quantity;
  }
  const maxSideQty = Math.max(callQty, putQty, 1);

  // Generate bands from 0.05 up to maxSideQty in ~0.05 steps
  // but cap the number of rows to keep the matrix reasonable
  const bands: number[] = [];
  const step = maxSideQty <= 1 ? 0.05 : maxSideQty <= 3 ? 0.10 : 0.20;
  for (let b = 0.05; b <= maxSideQty + 0.001; b += step) {
    bands.push(Math.round(b * 100) / 100);
  }
  // Always include the exact maxSideQty if not already there
  const last = bands[bands.length - 1];
  if (last !== undefined && Math.abs(last - maxSideQty) > 0.01) {
    bands.push(maxSideQty);
  }
  return bands;
}

interface Props {
  bars: BarData[];
  legs: Leg[];
  params: SimParams;
}

export default function SensitivityMatrix({ bars, legs, params }: Props) {
  const [matrix, setMatrix] = useState<number[][] | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [usedBands, setUsedBands] = useState<number[]>([]);

  const bands = useMemo(() => generateBands(legs), [legs]);

  // Max side label
  const maxSideLabel = useMemo(() => {
    let callQty = 0, putQty = 0;
    for (const leg of (legs ?? [])) {
      if (!leg) continue;
      if (leg.type === 'call') callQty += leg.quantity;
      else putQty += leg.quantity;
    }
    if (callQty >= putQty) return `${callQty} call${callQty !== 1 ? 's' : ''}`;
    return `${putQty} put${putQty !== 1 ? 's' : ''}`;
  }, [legs]);

  const totalSims = bands.length * MAX_HEDGES.length;

  const handleRun = useCallback(() => {
    setRunning(true);
    setProgress(0);
    const currentBands = generateBands(legs);
    setUsedBands(currentBands);
    setTimeout(() => {
      try {
        const result = runSensitivityMatrix(bars, legs, params, currentBands, MAX_HEDGES);
        setMatrix(result);
        setProgress(100);
      } catch (err: any) {
        console.error('Sensitivity error:', err);
      } finally {
        setRunning(false);
      }
    }, 50);
  }, [bars, legs, params]);

  // Color gradient
  const getColor = (val: number, min: number, max: number) => {
    if (max === min) return 'bg-muted/30';
    const ratio = (val - min) / (max - min);
    if (ratio > 0.7) return 'bg-green-500/30 text-green-300';
    if (ratio > 0.4) return 'bg-yellow-500/20 text-yellow-300';
    return 'bg-red-500/30 text-red-300';
  };

  const displayBands = usedBands.length > 0 ? usedBands : bands;
  const allVals = (matrix ?? []).flat();
  const minVal = allVals.length > 0 ? Math.min(...allVals) : 0;
  const maxVal = allVals.length > 0 ? Math.max(...allVals) : 0;

  // Find closest band/hedges index to current params for highlight
  const currentBandIdx = displayBands.reduce((best: number, b: number, i: number) =>
    Math.abs(b - (params?.deltaBand ?? 0.10)) < Math.abs(displayBands[best] - (params?.deltaBand ?? 0.10)) ? i : best, 0);
  const currentMaxHIdx = MAX_HEDGES.reduce((best: number, h: number, i: number) =>
    Math.abs(h - (params?.maxHedgesPerDay ?? 2)) < Math.abs(MAX_HEDGES[best] - (params?.maxHedgesPerDay ?? 2)) ? i : best, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-[#F5A623]" /> Sensitivity Matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Band 0.05–{bands[bands.length - 1]?.toFixed(2)} (max side: {maxSideLabel}) × Max Hedges/Day ({totalSims} sims)
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={running || bars.length === 0 || legs.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F5A623]/15 text-[#F5A623] text-sm font-semibold hover:bg-[#F5A623]/25 transition-colors disabled:opacity-40"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Running...' : 'Run Sensitivity Analysis'}
        </button>
      </div>

      {running && (
        <div className="mb-4">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-[#F5A623] rounded-full transition-all" style={{ width: '50%' }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Running {totalSims} simulations...</p>
        </div>
      )}

      {matrix && (
        <div className="rounded-xl bg-muted/20 border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-muted/30">
                  <th className="py-2 px-3 text-left text-muted-foreground sticky left-0 bg-muted/30 z-10">Band \ MaxH</th>
                  {MAX_HEDGES.map((mh: number, ci: number) => (
                    <th key={mh} className={`py-2 px-3 text-center text-muted-foreground whitespace-nowrap ${ci === currentMaxHIdx ? 'text-[#F5A623]' : ''}`}>
                      {mh}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayBands.map((band: number, ri: number) => (
                  <tr key={band} className="border-t border-border/30">
                    <td className={`py-1.5 px-3 font-semibold sticky left-0 bg-card z-10 ${ri === currentBandIdx ? 'text-[#F5A623]' : 'text-muted-foreground'}`}>
                      {band?.toFixed?.(2) ?? '0.00'}
                    </td>
                    {(matrix[ri] ?? []).map((val: number, ci: number) => (
                      <td
                        key={ci}
                        className={`py-1.5 px-3 text-center font-semibold whitespace-nowrap ${
                          getColor(val, minVal, maxVal)
                        } ${ri === currentBandIdx && ci === currentMaxHIdx ? 'ring-2 ring-[#F5A623] ring-inset' : ''}`}
                      >
                        ${val?.toFixed?.(0) ?? '0'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!matrix && !running && (
        <div className="rounded-xl bg-muted/20 border border-border/50 p-8 text-center">
          <Grid3X3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Click &quot;Run Sensitivity Analysis&quot; to generate the matrix</p>
          <p className="text-[10px] text-muted-foreground mt-1">Bands: 0.05 → {bands[bands.length - 1]?.toFixed(2)} (max side: {maxSideLabel}) × {MAX_HEDGES.length} hedge levels = {totalSims} sims</p>
        </div>
      )}
    </div>
  );
}
