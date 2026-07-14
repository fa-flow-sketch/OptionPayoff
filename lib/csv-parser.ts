export interface BarData {
  time: Date;
  timestamp: number;
  close: number;
  vix: number;
}

export function parseGCData(csvText: string): BarData[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // Find column indices from header
  const header = lines[0]?.split(',') ?? [];
  const timeIdx = header.findIndex((h: string) => h.trim().toLowerCase() === 'time');
  const closeIdx = header.findIndex((h: string) => h.trim().toLowerCase() === 'close');
  const vixIdx = header.findIndex((h: string) => h.trim().includes('VIX'));

  if (timeIdx < 0 || closeIdx < 0) return [];

  const bars: BarData[] = [];
  let lastVix = 15; // default VIX fallback

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]?.split(',') ?? [];
    const timeVal = cols[timeIdx]?.trim() ?? '';
    const closeVal = cols[closeIdx]?.trim() ?? '';

    // Filter duplicate header rows
    if (!timeVal || isNaN(Number(timeVal))) continue;

    const timestamp = Number(timeVal);
    const close = Number(closeVal);
    if (isNaN(close) || close <= 0) continue;

    let vix = lastVix;
    if (vixIdx >= 0) {
      const vixStr = cols[vixIdx]?.trim() ?? '';
      const vixNum = Number(vixStr);
      if (!isNaN(vixNum) && vixNum > 0) {
        vix = vixNum;
        lastVix = vix;
      }
    }

    bars.push({
      time: new Date(timestamp * 1000),
      timestamp,
      close,
      vix,
    });
  }

  // Sort by time
  bars.sort((a: BarData, b: BarData) => a.timestamp - b.timestamp);
  return bars;
}
