'use client';

import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import ChartWrapper from './ChartWrapper';

interface BrandTierData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

const TIER_LABELS: Record<string, string> = {
  s: 'S\u7ea7',
  a: 'A\u7ea7',
  b: 'B\u7ea7',
  c: 'C\u7ea7',
  lianfa: '\u8054\u53d1',
  unknown: '\u672a\u5206\u7ea7',
};

interface Props {
  data: BrandTierData[];
  loading?: boolean;
}

export default function BrandTierDonut({ data, loading }: Props) {
  const isEmpty = !data || data.length === 0;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  // Map internal keys to display labels for the pie
  const pieData = data.map(d => ({
    ...d,
    name: TIER_LABELS[d.name] || d.name,
  }));

  return (
    <ChartWrapper title="\u54c1\u724c\u80fd\u7ea7\u5206\u5e03" loading={loading} empty={isEmpty}>
      <div className="relative w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="35%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value} \u5bb6 (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`, '']} />
            <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        {!loading && !isEmpty && (
          <div style={{ position: 'absolute', top: '50%', left: '32%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <p className="text-2xl font-bold text-gray-800">{total}</p>
            <p className="text-xs text-gray-400">\u54c1\u724c\u603b\u6570</p>
          </div>
        )}
      </div>
    </ChartWrapper>
  );
}
