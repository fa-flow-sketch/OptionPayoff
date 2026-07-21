import { bsIv } from './black-scholes';
import type { BarData } from './csv-parser';

// ES futures quarterly expiration dates (3rd Friday of contract month, approximate)
const ES_EXPIRY: Record<string, string> = {
  ESH0: '2020-03-20', ESH1: '2021-03-19', ESH2: '2022-03-18', ESH3: '2023-03-17',
  ESH4: '2024-03-15', ESH5: '2025-03-21', ESH6: '2026-03-20', ESH7: '2027-03-19',
  ESH8: '2028-03-17',
  ESM0: '2020-06-19', ESM1: '2021-06-18', ESM2: '2022-06-17', ESM3: '2023-06-16',
  ESM4: '2024-06-21', ESM5: '2025-06-20', ESM6: '2026-06-19', ESM7: '2027-06-18',
  ESM8: '2028-06-16',
  ESU0: '2020-09-18', ESU1: '2021-09-17', ESU2: '2022-09-16', ESU3: '2023-09-15',
  ESU4: '2024-09-20', ESU5: '2025-09-19', ESU6: '2026-09-18', ESU7: '2027-09-17',
  ESZ0: '2020-12-18', ESZ1: '2021-12-17', ESZ2: '2022-12-16', ESZ3: '2023-12-15',
  ESZ4: '2024-12-20', ESZ5: '2025-12-19', ESZ6: '2026-12-18', ESZ7: '2027-12-17',
  ESZ8: '2028-12-15', ESZ9: '2029-12-21',
};

// All known ES contracts with underlying row counts
export const ALL_ES_CONTRACTS: { symbol: string; label: string; rows: number }[] = [
  { symbol: 'ESH0', label: 'ESH0 (Mar 2020)', rows: 84248 },
  { symbol: 'ESM0', label: 'ESM0 (Jun 2020)', rows: 146225 },
  { symbol: 'ESU0', label: 'ESU0 (Sep 2020)', rows: 128019 },
  { symbol: 'ESZ0', label: 'ESZ0 (Dec 2020)', rows: 132390 },
  { symbol: 'ESH1', label: 'ESH1 (Mar 2021)', rows: 105091 },
  { symbol: 'ESM1', label: 'ESM1 (Jun 2021)', rows: 96077 },
  { symbol: 'ESU1', label: 'ESU1 (Sep 2021)', rows: 91846 },
  { symbol: 'ESZ1', label: 'ESZ1 (Dec 2021)', rows: 117600 },
  { symbol: 'ESH2', label: 'ESH2 (Mar 2022)', rows: 120755 },
  { symbol: 'ESM2', label: 'ESM2 (Jun 2022)', rows: 117841 },
  { symbol: 'ESU2', label: 'ESU2 (Sep 2022)', rows: 112890 },
  { symbol: 'ESZ2', label: 'ESZ2 (Dec 2022)', rows: 138105 },
  { symbol: 'ESH3', label: 'ESH3 (Mar 2023)', rows: 109039 },
  { symbol: 'ESM3', label: 'ESM3 (Jun 2023)', rows: 102352 },
  { symbol: 'ESU3', label: 'ESU3 (Sep 2023)', rows: 82915 },
  { symbol: 'ESZ3', label: 'ESZ3 (Dec 2023)', rows: 104816 },
  { symbol: 'ESH4', label: 'ESH4 (Mar 2024)', rows: 89661 },
  { symbol: 'ESM4', label: 'ESM4 (Jun 2024)', rows: 96171 },
  { symbol: 'ESU4', label: 'ESU4 (Sep 2024)', rows: 100653 },
  { symbol: 'ESZ4', label: 'ESZ4 (Dec 2024)', rows: 101543 },
  { symbol: 'ESH5', label: 'ESH5 (Mar 2025)', rows: 90464 },
  { symbol: 'ESM5', label: 'ESM5 (Jun 2025)', rows: 88567 },
  { symbol: 'ESU5', label: 'ESU5 (Sep 2025)', rows: 71372 },
  { symbol: 'ESZ5', label: 'ESZ5 (Dec 2025)', rows: 85894 },
  { symbol: 'ESH6', label: 'ESH6 (Mar 2026)', rows: 80916 },
  { symbol: 'ESM6', label: 'ESM6 (Jun 2026)', rows: 84246 },
  { symbol: 'ESU6', label: 'ESU6 (Sep 2026)', rows: 31235 },
  { symbol: 'ESZ6', label: 'ESZ6 (Dec 2026)', rows: 17745 },
  { symbol: 'ESH7', label: 'ESH7 (Mar 2027)', rows: 4924 },
  { symbol: 'ESM7', label: 'ESM7 (Jun 2027)', rows: 1973 },
  { symbol: 'ESU7', label: 'ESU7 (Sep 2027)', rows: 669 },
  { symbol: 'ESZ7', label: 'ESZ7 (Dec 2027)', rows: 2571 },
  { symbol: 'ESH8', label: 'ESH8 (Mar 2028)', rows: 180 },
  { symbol: 'ESM8', label: 'ESM8 (Jun 2028)', rows: 25 },
  { symbol: 'ESZ8', label: 'ESZ8 (Dec 2028)', rows: 672 },
  { symbol: 'ESZ9', label: 'ESZ9 (Dec 2029)', rows: 261 },
].sort((a, b) => (ES_EXPIRY[a.symbol] ?? '').localeCompare(ES_EXPIRY[b.symbol] ?? ''));

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
