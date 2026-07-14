import { bsIv } from './black-scholes';
import type { BarData } from './csv-parser';

// ES futures quarterly expiration dates (3rd Friday of contract month, approximate)
const ES_EXPIRY: Record<string, string> = {
  ESH6: '2026-03-20',
  ESM6: '2026-06-19',
  ESU6: '2026-09-18',
  ESZ6: '2026-12-18',
  ESH7: '2027-03-19',
  ESM7: '2027-06-18',
  ESU7: '2027-09-17',
  ESZ7: '2027-12-17',
  ESH8: '2028-03-17',
  ESM8: '2028-06-16',
  ESU8: '2028-09-15',
  ESZ8: '2028-12-15',
  ESH9: '2029-03-16',
  ESM9: '2029-06-15',
  ESU9: '2029-09-21',
  ESZ9: '2029-12-21',
  ESZ0: '2030-12-20',
};

// All known ES contracts with underlying row counts for the bundled dataset
export const ALL_ES_CONTRACTS: { symbol: string; label: string; rows: number }[] = [
  { symbol: 'ESH6', label: 'ESH6 (Mar 2026)', rows: 1273 },
  { symbol: 'ESM6', label: 'ESM6 (Jun 2026)', rows: 1409 },
  { symbol: 'ESU6', label: 'ESU6 (Sep 2026)', rows: 630 },
  { symbol: 'ESZ6', label: 'ESZ6 (Dec 2026)', rows: 30 },
  { symbol: 'ESH7', label: 'ESH7 (Mar 2027)', rows: 5 },
  { symbol: 'ESM7', label: 'ESM7 (Jun 2027)', rows: 0 },
  { symbol: 'ESU7', label: 'ESU7 (Sep 2027)', rows: 0 },
  { symbol: 'ESZ7', label: 'ESZ7 (Dec 2027)', rows: 0 },
  { symbol: 'ESH8', label: 'ESH8 (Mar 2028)', rows: 0 },
  { symbol: 'ESZ8', label: 'ESZ8 (Dec 2028)', rows: 0 },
  { symbol: 'ESZ9', label: 'ESZ9 (Dec 2029)', rows: 0 },
  { symbol: 'ESZ0', label: 'ESZ0 (Dec 2030)', rows: 0 },
];

interface UnderlyingRow {
  ts_event: string;
  underlying_price: number;
}

interface OptionRow {
  ts_event: string;
  option_type: string;
  strike: number;
  close: number;
}

export function getAvailableESContracts(): string[] {
  return Object.keys(ES_EXPIRY);
}

export async function fetchESUnderlying(contract: string): Promise<UnderlyingRow[]> {
  const res = await fetch(`/data/es/${contract}_underlying.json`);
  if (!res.ok) throw new Error(`No underlying data for ${contract}`);
  return res.json();
}

export async function fetchESOptions(contract: string): Promise<OptionRow[]> {
  const res = await fetch(`/data/es/${contract}_options.json`);
  if (!res.ok) throw new Error(`No options data for ${contract}`);
  return res.json();
}

export function parseESData(
  underlying: UnderlyingRow[],
  options: OptionRow[],
  contract: string,
  rfr: number = 0.05
): BarData[] {
  // Normalize date format: some JSON has space-separated dates ("2026-01-01 23:00:00+00:00")
  function normTs(ts: string): string {
    return ts.replace('T', ' ').replace(/\.\d{3}Z/, '+00:00').replace(/\.\d{3}\+/, '+');
  }

  // Index options by timestamp for fast lookup
  const optsByTs = new Map<string, OptionRow[]>();
  for (const opt of options) {
    const ts = normTs(opt.ts_event);
    if (!optsByTs.has(ts)) optsByTs.set(ts, []);
    optsByTs.get(ts)!.push(opt);
  }

  // Index underlying prices by timestamp
  const priceByTs = new Map<string, number>();
  for (const row of underlying) {
    priceByTs.set(normTs(row.ts_event), row.underlying_price);
  }

  // Sort timestamps
  const allTimestamps = [...new Set([
    ...underlying.map(r => r.ts_event),
    ...options.map(o => o.ts_event),
  ])].sort();

  if (allTimestamps.length === 0) return [];

  // Get expiry date for the selected contract
  const expiryDate = ES_EXPIRY[contract];
  const expiryTime = expiryDate ? new Date(expiryDate + 'T23:59:59Z').getTime() : null;

  // Generate continuous hourly timeline, truncated at contract expiry
  const firstTs = new Date(allTimestamps[0]).getTime();
  let lastTs = new Date(allTimestamps[allTimestamps.length - 1]).getTime();
  if (expiryTime && expiryTime < lastTs) {
    lastTs = expiryTime;
  }
  const HOUR_MS = 3600 * 1000;

  const bars: BarData[] = [];
  let lastIv = 15;
  let lastPrice = 6000; // fallback price

  for (let t = firstTs; t <= lastTs; t += HOUR_MS) {
    // Generate lookup key in same format as JSON data: "2026-01-01 23:00:00+00:00"
    const tsKey = new Date(t).toISOString().replace('T', ' ').replace('Z', '+00:00').replace(/\.\d{3}/, '');

    // Forward-fill underlying price
    const rawPrice = priceByTs.get(tsKey);
    if (rawPrice !== undefined) {
      lastPrice = rawPrice;
    }
    // else: forward-fill — use lastPrice

    const S = lastPrice;
    const opts = optsByTs.get(tsKey) ?? [];

    // Compute IV from ATM options
    let iv = lastIv;
    if (opts.length > 0 && expiryTime) {
      const T = Math.max((expiryTime - t) / (365 * 24 * 3600 * 1000), 0.001);

      let bestOpt: OptionRow | null = null;
      let bestDist = Infinity;
      for (const opt of opts) {
        const dist = Math.abs(opt.strike - S);
        if (dist < bestDist) {
          bestDist = dist;
          bestOpt = opt;
        }
      }

      if (bestOpt) {
        const optType = bestOpt.option_type as 'call' | 'put';
        const sigma = bsIv(bestOpt.close, S, bestOpt.strike, T, rfr, optType);
        if (sigma !== null && sigma > 0.001 && sigma < 5.0) {
          iv = sigma * 100;
          lastIv = iv;
        }
      }
    }

    bars.push({
      time: new Date(t),
      timestamp: Math.floor(t / 1000),
      close: S,
      vix: iv,
    });
  }

  bars.sort((a, b) => a.timestamp - b.timestamp);
  return bars;
}

