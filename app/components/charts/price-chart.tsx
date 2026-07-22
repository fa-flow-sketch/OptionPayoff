'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { type BarResult } from '@/lib/simulator';

export default function PriceChart({ bars }: { bars: BarResult[] }) {
  const data = (bars ?? []).filter((_: BarResult, i: number) => i % 3 === 0).map((b: BarResult) => ({
    time: b?.datetime?.toLocaleDateString?.('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }) ?? '',
    close: b?.close ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
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
          domain={['auto', 'auto']}
          label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11, fill: 'hsl(228 10% 55%)' } }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(228 14% 13%)', border: '1px solid hsl(228 12% 20%)', borderRadius: '8px', fontSize: 11 }}
          labelStyle={{ color: '#F5A623' }}
        />
        <Line type="monotone" dataKey="close" stroke="#F5A623" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
