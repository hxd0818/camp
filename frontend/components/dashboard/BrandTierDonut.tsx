'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import ChartWrapper from './ChartWrapper';

interface BrandTierData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

const TIER_LABELS: Record<string, string> = {
  s: 'S级',
  a: 'A级',
  b: 'B级',
  c: 'C级',
  lianfa: '联发',
  unknown: '未分级',
};

const TIER_COLORS: Record<string, string> = {
  s: '#1e40af',
  a: '#3b82f6',
  b: '#93c5fd',
  c: '#9ca3af',
  lianfa: '#06b6d4',
  unknown: '#d1d5db',
};

interface Props {
  data: BrandTierData[];
  loading?: boolean;
}

const RADIAN = Math.PI / 180;

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  name,
}: Record<string, unknown>) {
  const radius = Number(outerRadius) + 22;
  const x = (cx as number) + radius * Math.cos(-(midAngle as number) * RADIAN);
  const y = (cy as number) + radius * Math.sin(-(midAngle as number) * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > (cx as number) ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={10.5}
      fontWeight={500}
    >
      {TIER_LABELS[name as string] || (name as string)}
    </text>
  );
}

function renderCustomConnector({
  cx,
  cy,
  midAngle,
  outerRadius,
}: Record<string, unknown>) {
  const or = Number(outerRadius);
  const ma = midAngle as number;
  const cxx = cx as number;
  const cyy = cy as number;

  return (
    <path
      d={`M${cxx + or * Math.cos(-ma * RADIAN)},${
        cyy + or * Math.sin(-ma * RADIAN)
      }L${cxx + (or + 18) * Math.cos(-ma * RADIAN)},${
        cyy + (or + 18) * Math.sin(-ma * RADIAN)
      }`}
      stroke="#9ca3af"
      strokeWidth={1}
      fill="none"
    />
  );
}

export default function BrandTierDonut({ data, loading }: Props) {
  const isEmpty = !data || data.length === 0;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const pieData = data
    .filter(d => d.value > 0)
    .map(d => ({
      ...d,
      displayName: TIER_LABELS[d.name] || d.name,
    }));

  return (
    <ChartWrapper title="品牌能级分布" loading={loading} empty={isEmpty}>
      <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="relative">
          <PieChart width={200} height={200}>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={66}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              labelLine={renderCustomConnector}
              label={renderCustomLabel}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || TIER_COLORS[entry.name] || '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value} 家 (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`, '']} />
          </PieChart>

          {/* Center label */}
          {!loading && !isEmpty && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-gray-800 leading-none">{total}</span>
              <span className="text-[10px] text-gray-400 mt-0.5">品牌总数</span>
            </div>
          )}
        </div>

      </div>
    </ChartWrapper>
  );
}
