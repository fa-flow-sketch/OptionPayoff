'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { type BarResult } from '@/lib/simulator';

export default function PnlChart({ bars }: { bars: BarResult[] }) {
  const data = (bars ?? []).filter((_: BarResult, i: number) => i % 3 === 0).map((b: BarResult) => ({
    time: b?.datetime?.toLocaleDateString?.('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }) ?? '',
    pnl: Math.round(b?.netPnl ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
        <defs>
          <linearGradient id="pnlGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tickLine={false}
          tick={{ fontSize: 10, fill: 'hsl(228 10% 55%)' }}
          interval="preserveStartEnd"
          label={{ value: 'Date', position: 'insideBottom', offset: -15, style: { textAnchor: 'middle', fontSize: 11, fill: 'hsl(228 10% 55%)' } }}
        />
        <YAxis
          tickLine={false}
          tick={{ fontSize: 10, fill: 'hsl(228 10% 55%)' }}
          label={{ value: 'P&L ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11, fill: 'hsl(228 10% 55%)' } }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(228 14% 13%)', border: '1px solid hsl(228 12% 20%)', borderRadius: '8px', fontSize: 11 }}
          labelStyle={{ color: '#F5A623' }}
        />
        <ReferenceLine y={0} stroke="hsl(228 12% 20%)" strokeDasharray="3 3" />
        <Area type="monotone" dataKey="pnl" stroke="#22c55e" fill="url(#pnlGreen)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
