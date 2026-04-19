'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from 'recharts';
import ChartWrapper from './ChartWrapper';

interface LeaseTermData {
  term: string;
  count: number;
  area: number;
}

interface Props {
  data: LeaseTermData[];
  loading?: boolean;
}

export default function LeaseTermBarChart({ data, loading }: Props) {
  const isEmpty = !data || data.length === 0;

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const yMax = Math.ceil(maxCount * 1.25 / 5) * 5;

  return (
    <ChartWrapper title="租约期限分布" loading={loading} empty={isEmpty}>
      <div className="flex items-center justify-center w-full h-full">
        <BarChart width={300} height={220} data={data} margin={{ top: 16, right: 8, left: -6, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="term" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} domain={[0, yMax]} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'count') return [`${value} 份`, '合同数'];
              return [`${value.toLocaleString()} m²`, '总面积'];
            }}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={40}>
            <LabelList
              dataKey="count"
              position="top"
              fontSize={12}
              fontWeight={600}
              fill="#0ea5e9"
              offset={4}
            />
          </Bar>
        </BarChart>
      </div>
    </ChartWrapper>
  );
}
