'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import ChartWrapper from './ChartWrapper';
import type { SigningStructureBucket } from '@/lib/types';

interface SigningData {
  type: string;
  name: string;
  count: number;
  area: number;
  ratio: number;
  color?: string;
}

const TYPE_COLORS: Record<string, string> = {
  new: '#0ea5e9',
  renewal: '#22c55e',
  transfer: '#f59e0b',
};

interface Props {
  data: SigningData[];
  totalArea?: number;
  totalCount?: number;
  loading?: boolean;
}

const RADIAN = Math.PI / 180;

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  name,
  count,
}: Record<string, unknown>) {
  const radius = Number(outerRadius) + 28;
  const x = (cx as number) + radius * Math.cos(-(midAngle as number) * RADIAN);
  const y = (cy as number) + radius * Math.sin(-(midAngle as number) * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > (cx as number) ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={500}
    >
      {name as string} ({count})
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
      }L${cxx + (or + 22) * Math.cos(-ma * RADIAN)},${
        cyy + (or + 22) * Math.sin(-ma * RADIAN)
      }`}
      stroke="#9ca3af"
      strokeWidth={1}
      fill="none"
    />
  );
}

export default function SigningStructureChart({
  data,
  totalArea = 0,
  totalCount,
  loading,
}: Props) {
  const isEmpty = !data || data.length === 0 || data.every(d => d.count === 0);

  const displayData = data.filter(d => d.count > 0);
  const computedTotalCount = totalCount ?? displayData.reduce((s, d) => s + d.count, 0);

  const renderCustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    return (
      <div className="bg-white border rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-700">{item.name}</p>
        <p className="text-sm text-gray-600">
          数量: <span className="font-semibold">{item.count}</span> 个
        </p>
        <p className="text-sm text-gray-600">
          面积: <span className="font-semibold">{item.area.toLocaleString()}</span> m²
        </p>
        <p className="text-sm text-gray-600">
          占比: <span className="font-semibold">{item.ratio.toFixed(1)}%</span>
        </p>
      </div>
    );
  };

  return (
    <ChartWrapper title="签约结构" loading={loading} empty={isEmpty}>
      <div className="flex flex-col items-center justify-center w-full h-full overflow-visible">
        <PieChart width={340} height={260}>
          <Pie
            data={displayData}
            cx="50%"
            cy="48%"
            innerRadius={42}
            outerRadius={72}
            paddingAngle={3}
            dataKey="count"
            stroke="none"
            labelLine={renderCustomConnector}
            label={renderCustomLabel}
          >
            {displayData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || TYPE_COLORS[entry.type] || '#94a3b8'}
              />
            ))}
          </Pie>
          <Tooltip content={renderCustomTooltip} />
        </PieChart>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          {displayData.map((item) => (
            <div key={item.type} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color || TYPE_COLORS[item.type] || '#94a3b8' }}
              />
              <span className="text-xs text-gray-600">
                {item.name}: {item.count}个 ({item.ratio.toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>

        {/* Total area */}
        {totalArea > 0 && (
          <div className="text-center mt-1 text-xs text-gray-500">
            签约总面积: {totalArea.toLocaleString()} m² | 共{computedTotalCount}个
          </div>
        )}
      </div>
    </ChartWrapper>
  );
}
