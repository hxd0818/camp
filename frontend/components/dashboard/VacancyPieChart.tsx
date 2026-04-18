'use client';

import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import ChartWrapper from './ChartWrapper';

interface VacancyData {
  name: string;
  value: number;
  count: number;
  color: string;
}

const BUCKET_COLORS: Record<string, string> = {
  '\u77ed\u671f': '#22c55e',
  '\u4e2d\u671f': '#f59e0b',
  '\u957f\u671f': '#f97316',
  '\u8d85\u957f\u671f': '#ef4444',
};

interface Props {
  data: VacancyData[];
  loading?: boolean;
}

export default function VacancyPieChart({ data, loading }: Props) {
  const isEmpty = !data || data.length === 0 || data.every(d => d.value === 0);

  return (
    <ChartWrapper title="\u7a7a\u94fa\u7ed3\u6784" loading={loading} empty={isEmpty}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="40%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || BUCKET_COLORS[entry.name] || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [`${value.toLocaleString()} \u33a1`, name]} />
          <Legend
            verticalAlign="middle"
            align="right"
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => `${value} (${data.find(d => d.name === value)?.count || 0})`}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
