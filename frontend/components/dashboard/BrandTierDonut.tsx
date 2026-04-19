'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import ChartWrapper from './ChartWrapper';

interface BrandTierData {
  name: string;
  value: number;
  color: string;
  percentage: number;
  new_this_month?: number; // New brands added this month
  change_percentage?: number; // Month-over-month change
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
  totalNewThisMonth?: number; // Total new brands this month across all tiers
  totalChangePercent?: number | null; // Overall month-over-month change
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

export default function BrandTierDonut({
  data,
  loading,
  totalNewThisMonth = 0,
  totalChangePercent,
}: Props) {
  const isEmpty = !data || data.length === 0;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const pieData = data
    .filter(d => d.value > 0)
    .map(d => ({
      ...d,
      displayName: TIER_LABELS[d.name] || d.name,
    }));

  const renderCustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    return (
      <div className="bg-white border rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-700">
          {item.displayName || item.name}
        </p>
        <p className="text-sm text-gray-600">
          数量: <span className="font-semibold">{item.value}</span> 家
        </p>
        {item.new_this_month > 0 && (
          <p className="text-sm text-green-600">
            本月新增: +{item.new_this_month} 家
          </p>
        )}
        {item.change_percentage !== undefined && item.change_percentage !== 0 && (
          <p className={`text-sm ${item.change_percentage > 0 ? 'text-green-600' : 'text-red-500'}`}>
            环比: {item.change_percentage > 0 ? '+' : ''}{item.change_percentage.toFixed(1)}%
          </p>
        )}
      </div>
    );
  };

  return (
    <ChartWrapper
      title="品牌能级分布"
      loading={loading}
      empty={isEmpty}
      extra={
        totalNewThisMonth > 0 || totalChangePercent !== undefined ? (
          <div className="flex items-center gap-3">
            {totalNewThisMonth > 0 && (
              <div className="text-sm font-medium text-green-600">
                本月新增 +{totalNewThisMonth}
              </div>
            )}
            {totalChangePercent !== undefined && totalChangePercent !== null && (
              <div className={`text-sm font-medium ${totalChangePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {totalChangePercent >= 0 ? '\u2191' : '\u2193'} {Math.abs(totalChangePercent).toFixed(1)}% 环比
              </div>
            )}
          </div>
        ) : null
      }
    >
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
            <Tooltip content={renderCustomTooltip} />
          </PieChart>

          {/* Center label */}
          {!loading && !isEmpty && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-gray-800 leading-none">{total}</span>
              <span className="text-[10px] text-gray-400 mt-0.5">品牌总数</span>
              {totalNewThisMonth > 0 && (
                <span className="text-[9px] text-green-600 mt-0.5">+{totalNewThisMonth}</span>
              )}
            </div>
          )}
        </div>

      </div>
    </ChartWrapper>
  );
}
