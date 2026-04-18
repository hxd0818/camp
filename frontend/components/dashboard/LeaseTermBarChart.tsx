'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

  return (
    <ChartWrapper title="\u79df\uea6e\u671f\u9650\u5206\u5e03" loading={loading} empty={isEmpty}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="term" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'count') return [`${value} \u4efd`, '\u5408\u540c\u6570'];
              return [`${value.toLocaleString()} \u33a1`, '\u603b\u9762\u79ef'];
            }}
          />
          <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
