'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Label, LabelList } from 'recharts';
import ChartWrapper from './ChartWrapper';

interface VacancyData {
  name: string;
  value: number;
  count: number;
  color: string;
}

const BUCKET_COLORS: Record<string, string> = {
  '短期': '#22c55e',
  '中期': '#f59e0b',
  '长期': '#f97316',
  '超长期': '#ef4444',
};

interface Props {
  data: VacancyData[];
  loading?: boolean;
  changePercent?: number | null; // Month-over-month change
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

export default function VacancyPieChart({ data, loading, changePercent }: Props) {
  const isEmpty = !data || data.length === 0 || data.every(d => d.value === 0);

  const displayData = data.filter(d => d.value > 0);
  const total = displayData.reduce((s, d) => s + d.value, 0);

  return (
    <ChartWrapper
      title="空置结构"
      loading={loading}
      empty={isEmpty}
      extra={
        changePercent !== null && changePercent !== undefined ? (
          <div className={`text-sm font-medium ${changePercent >= 0 ? 'text-red-500' : 'text-green-600'}`}>
            {changePercent >= 0 ? '\u2191' : '\u2193'} {Math.abs(changePercent).toFixed(1)}% 环比
          </div>
        ) : null
      }
    >
      <div className="flex items-center justify-center w-full h-full overflow-visible">
        <PieChart width={340} height={260}>
          <Pie
            data={displayData}
            cx="50%"
            cy="48%"
            innerRadius={42}
            outerRadius={72}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            labelLine={renderCustomConnector}
            label={renderCustomLabel}
          >
            {displayData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || BUCKET_COLORS[entry.name] || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [`${value.toLocaleString()} m²`, name]} />
        </PieChart>

      </div>
    </ChartWrapper>
  );
}
