'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import ChartWrapper from './ChartWrapper';

interface SigningData {
  type: string;
  count: number;
  area: number;
  percentage: number;
  color: string;
}

const TYPE_LABELS: Record<string, string> = {
  new: '新签',
  renewal: '续签',
  transfer: '转让',
};

const DEFAULT_COLORS = ['#22c55e', '#3b82f6', '#f59e0b'];

interface Props {
  data: SigningData[];
  totalArea?: number;
  changePercent?: number | null;
  loading?: boolean;
}

export default function SigningStructureChart({
  data,
  totalArea,
  changePercent,
  loading,
}: Props) {
  const isEmpty = !data || data.length === 0 || data.every(d => d.count === 0);

  const displayData = data.filter(d => d.count > 0);
  const totalCount = displayData.reduce((s, d) => s + d.count, 0);

  const renderCustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    return (
      <div className="bg-white border rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-700">
          {TYPE_LABELS[item.type] || item.type}
        </p>
        <p className="text-sm text-gray-600">
          数量: <span className="font-semibold">{item.count}</span> 个
        </p>
        <p className="text-sm text-gray-600">
          面积: <span className="font-semibold">{item.area.toLocaleString()}</span> m²
        </p>
        <p className="text-sm text-gray-600">
          占比: <span className="font-semibold">{item.percentage.toFixed(1)}%</span>
        </p>
      </div>
    );
  };

  return (
    <ChartWrapper
      title="签约结构"
      loading={loading}
      empty={isEmpty}
      extra={
        changePercent !== null && changePercent !== undefined ? (
          <div className={`text-sm font-medium ${changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {changePercent >= 0 ? '\u2191' : '\u2193'} {Math.abs(changePercent).toFixed(1)}% 环比
          </div>
        ) : null
      }
    >
      <div className="flex items-center justify-center w-full h-full">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
              dataKey="count"
              stroke="none"
              label={({ type, percentage }: { type: string; percentage: number }) =>
                `${TYPE_LABELS[type] || type} ${percentage.toFixed(0)}%`
              }
              labelLine={false}
            >
              {displayData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={renderCustomTooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {displayData.map((item) => (
          <div key={item.type} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color || DEFAULT_COLORS[displayData.indexOf(item)] }}
            />
            <span className="text-sm text-gray-600">
              {TYPE_LABELS[item.type] || item.type}: {item.count}个
            </span>
          </div>
        ))}
      </div>

      {/* Total area */}
      {totalArea !== undefined && totalArea > 0 && (
        <div className="text-center mt-2 text-xs text-gray-500">
          签约总面积: {totalArea.toLocaleString()} m²
        </div>
      )}
    </ChartWrapper>
  );
}
