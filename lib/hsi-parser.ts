import type { BarData } from './csv-parser';

// HSI futures options expiration dates (from CSV data)
const HSI_EXPIRY: Record<string, string> = {
  HSI22F: '2022-01-21', HSI2F: '2022-01-21', HSI22G: '2022-02-18',
  HSI22H: '2022-03-18', HSI22J: '2022-04-14', HSI22K: '2022-05-20',
  HSI22M: '2022-04-14', HSI22N: '2022-07-15', HSI22Q: '2022-08-19',
  HSI22U: '2022-07-15', HSI22V: '2022-10-21', HSI22X: '2022-11-18',
  HSI22Z: '2022-12-16', HSI23F: '2023-01-20', HSI23G: '2023-02-17',
  HSI23H: '2023-03-17', HSI23J: '2023-04-21', HSI23K: '2023-05-19',
  HSI23M: '2023-06-16', HSI23N: '2023-07-21', HSI23Q: '2023-08-18',
  HSI23U: '2023-09-15', HSI23V: '2023-10-20', HSI23X: '2023-11-17',
  HSI23Z: '2023-12-15', HSI24F: '2024-01-19', HSI24G: '2024-02-16',
  HSI24H: '2024-03-15', HSI24J: '2024-04-19', HSI24K: '2024-05-17',
  HSI24M: '2024-06-21', HSI24N: '2024-07-19', HSI24Q: '2024-08-16',
  HSI24U: '2024-09-20', HSI24V: '2024-10-18', HSI24X: '2024-11-15',
  HSI24Z: '2024-10-18', HSI25F: '2025-01-17', HSI25G: '2025-02-21',
  HSI25H: '2025-03-21', HSI25J: '2025-04-17', HSI25K: '2025-05-16',
  HSI25M: '2025-06-20', HSI25N: '2025-07-18', HSI25Q: '2025-08-15',
  HSI25U: '2025-09-19', HSI25V: '2025-10-17', HSI25X: '2025-11-21',
  HSI25Z: '2025-12-19', HSI26F: '2026-01-16', HSI26G: '2026-02-20',
  HSI26H: '2026-03-20', HSI26J: '2026-04-17', HSI26K: '2026-05-15',
};

export const ALL_HSI_CONTRACTS: { symbol: string; label: string; rows: number }[] = [
  { symbol: 'HSI22F', label: 'HSI22F (exp 2022-01-21)', rows: 5 },
  { symbol: 'HSI2F', label: 'HSI2F (exp 2022-01-21)', rows: 10 },
  { symbol: 'HSI22G', label: 'HSI22G (exp 2022-02-18)', rows: 31 },
  { symbol: 'HSI22H', label: 'HSI22H (exp 2022-03-18)', rows: 41 },
  { symbol: 'HSI22J', label: 'HSI22J (exp 2022-04-14)', rows: 33 },
  { symbol: 'HSI22K', label: 'HSI22K (exp 2022-05-20)', rows: 32 },
  { symbol: 'HSI22M', label: 'HSI22M (exp 2022-04-14)', rows: 59 },
  { symbol: 'HSI22N', label: 'HSI22N (exp 2022-07-15)', rows: 32 },
  { symbol: 'HSI22Q', label: 'HSI22Q (exp 2022-08-19)', rows: 44 },
  { symbol: 'HSI22U', label: 'HSI22U (exp 2022-07-15)', rows: 55 },
  { symbol: 'HSI22V', label: 'HSI22V (exp 2022-10-21)', rows: 43 },
  { symbol: 'HSI22X', label: 'HSI22X (exp 2022-11-18)', rows: 44 },
  { symbol: 'HSI22Z', label: 'HSI22Z (exp 2022-12-16)', rows: 45 },
  { symbol: 'HSI23F', label: 'HSI23F (exp 2023-01-20)', rows: 42 },
  { symbol: 'HSI23G', label: 'HSI23G (exp 2023-02-17)', rows: 39 },
  { symbol: 'HSI23H', label: 'HSI23H (exp 2023-03-17)', rows: 42 },
  { symbol: 'HSI23J', label: 'HSI23J (exp 2023-04-21)', rows: 42 },
  { symbol: 'HSI23K', label: 'HSI23K (exp 2023-05-19)', rows: 41 },
  { symbol: 'HSI23M', label: 'HSI23M (exp 2023-06-16)', rows: 43 },
  { symbol: 'HSI23N', label: 'HSI23N (exp 2023-07-21)', rows: 42 },
  { symbol: 'HSI23Q', label: 'HSI23Q (exp 2023-08-18)', rows: 43 },
  { symbol: 'HSI23U', label: 'HSI23U (exp 2023-09-15)', rows: 42 },
  { symbol: 'HSI23V', label: 'HSI23V (exp 2023-10-20)', rows: 41 },
  { symbol: 'HSI23X', label: 'HSI23X (exp 2023-11-17)', rows: 42 },
  { symbol: 'HSI23Z', label: 'HSI23Z (exp 2023-12-15)', rows: 44 },
  { symbol: 'HSI24F', label: 'HSI24F (exp 2024-01-19)', rows: 42 },
  { symbol: 'HSI24G', label: 'HSI24G (exp 2024-02-16)', rows: 40 },
  { symbol: 'HSI24H', label: 'HSI24H (exp 2024-03-15)', rows: 43 },
  { symbol: 'HSI24J', label: 'HSI24J (exp 2024-04-19)', rows: 42 },
  { symbol: 'HSI24K', label: 'HSI24K (exp 2024-05-17)', rows: 40 },
  { symbol: 'HSI24M', label: 'HSI24M (exp 2024-06-21)', rows: 42 },
  { symbol: 'HSI24N', label: 'HSI24N (exp 2024-07-19)', rows: 43 },
  { symbol: 'HSI24Q', label: 'HSI24Q (exp 2024-08-16)', rows: 44 },
  { symbol: 'HSI24U', label: 'HSI24U (exp 2024-09-20)', rows: 43 },
  { symbol: 'HSI24V', label: 'HSI24V (exp 2024-10-18)', rows: 18 },
  { symbol: 'HSI24X', label: 'HSI24X (exp 2024-11-15)', rows: 38 },
  { symbol: 'HSI24Z', label: 'HSI24Z (exp 2024-10-18)', rows: 68 },
  { symbol: 'HSI25F', label: 'HSI25F (exp 2025-01-17)', rows: 42 },
  { symbol: 'HSI25G', label: 'HSI25G (exp 2025-02-21)', rows: 39 },
  { symbol: 'HSI25H', label: 'HSI25H (exp 2025-03-21)', rows: 42 },
  { symbol: 'HSI25J', label: 'HSI25J (exp 2025-04-17)', rows: 43 },
  { symbol: 'HSI25K', label: 'HSI25K (exp 2025-05-16)', rows: 40 },
  { symbol: 'HSI25M', label: 'HSI25M (exp 2025-06-20)', rows: 42 },
  { symbol: 'HSI25N', label: 'HSI25N (exp 2025-07-18)', rows: 44 },
  { symbol: 'HSI25Q', label: 'HSI25Q (exp 2025-08-15)', rows: 44 },
  { symbol: 'HSI25U', label: 'HSI25U (exp 2025-09-19)', rows: 45 },
  { symbol: 'HSI25V', label: 'HSI25V (exp 2025-10-17)', rows: 43 },
  { symbol: 'HSI25X', label: 'HSI25X (exp 2025-11-21)', rows: 42 },
  { symbol: 'HSI25Z', label: 'HSI25Z (exp 2025-12-19)', rows: 44 },
  { symbol: 'HSI26F', label: 'HSI26F (exp 2026-01-16)', rows: 42 },
  { symbol: 'HSI26G', label: 'HSI26G (exp 2026-02-20)', rows: 39 },
  { symbol: 'HSI26H', label: 'HSI26H (exp 2026-03-20)', rows: 42 },
  { symbol: 'HSI26J', label: 'HSI26J (exp 2026-04-17)', rows: 26 },
  { symbol: 'HSI26K', label: 'HSI26K (exp 2026-05-15)', rows: 9 },
];

interface UnderlyingRow {
  ts_event: string;
  underlying_price: number;
  iv: number;
}

interface OptionRow {
  ts_event: string;
  option_type: string;
  strike: number;
  close: number;
}

export async function fetchHSIUnderlying(contract: string): Promise<UnderlyingRow[]> {
  const res = await fetch(`/data/hsi/${contract}_underlying.json`);
  if (!res.ok) throw new Error(`No underlying data for ${contract}`);
  return res.json();
}

export async function fetchHSIOptions(contract: string): Promise<OptionRow[]> {
  const res = await fetch(`/data/hsi/${contract}_options.json`);
  if (!res.ok) throw new Error(`No options data for ${contract}`);
  return res.json();
}

export function parseHSIData(
  underlying: UnderlyingRow[],
  options: OptionRow[],
  contract: string,
  _rfr: number = 0.05
): BarData[] {
  // Index options by date
  const optsByTs = new Map<string, OptionRow[]>();
  for (const opt of options) {
    if (!optsByTs.has(opt.ts_event)) optsByTs.set(opt.ts_event, []);
    optsByTs.get(opt.ts_event)!.push(opt);
  }

  // Build price + IV lookup from underlying rows
  const priceByTs = new Map<string, number>();
  const ivByTs = new Map<string, number>();

  for (const row of underlying) {
    priceByTs.set(row.ts_event, row.underlying_price);
    ivByTs.set(row.ts_event, row.iv);
  }

  // Sort all dates
  const allDates = [...new Set(underlying.map(r => r.ts_event))].sort();

  if (allDates.length === 0) return [];

  const expiryDate = HSI_EXPIRY[contract];
  const expiryTime = expiryDate ? new Date(expiryDate + 'T23:59:59Z').getTime() : null;

  const bars: BarData[] = [];

  for (const dateStr of allDates) {
    const t = new Date(dateStr + 'T00:00:00Z').getTime();

    // Stop at contract expiry
    if (expiryTime && t > expiryTime) break;

    const bp = priceByTs.get(dateStr);
    const ivFromData = ivByTs.get(dateStr);

    if (bp === undefined) continue;

    bars.push({
      time: new Date(dateStr + 'T00:00:00Z'),
      timestamp: Math.floor(t / 1000),
      close: bp,
      vix: ivFromData ?? 20,
    });
  }

  bars.sort((a, b) => a.timestamp - b.timestamp);
  return bars;
}
