'use client';

import React from 'react';
import type { EfficiencyTableResponse, EfficiencyRow } from '@/lib/types';

interface EfficiencyTableProps {
  data: EfficiencyTableResponse | null;
  loading?: boolean;
}

/** Mini progress bar for completion rate cell */
function MiniProgress({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-600 w-10 text-right">{value.toFixed(1)}%</span>
    </div>
  );
}

function formatNum(val: number): string {
  if (val >= 10000) return `${(val / 10000).toFixed(1)}万`;
  return val.toLocaleString('zh-CN');
}

function formatCurrency(val: number): string {
  if (val >= 10000) return `${(val / 10000).toFixed(1)}万`;
  return `¥${val.toFixed(0)}`;
}

export default function EfficiencyTable({ data, loading }: EfficiencyTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>{[...Array(12)].map((_, i) => <th key={i} className="px-3 py-2"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></th>)}</tr>
            </thead>
            <tbody>
              {[...Array(4)].map((_, i) => (
                <tr key={i}>{[...Array(12)].map((_, j) => <td key={j} className="px-3 py-2"><div className="h-4 w-12 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return null;
  }

  const cols: { key: keyof EfficiencyRow; label: string; render?: (row: EfficiencyRow) => React.ReactNode }[] = [
    { key: 'group_name', label: '楼层' },
    { key: 'total_units', label: '总铺位' },
    { key: 'occupied_units', label: '已入驻',
      render: (r) => <span className={r.occupied_units / Math.max(r.total_units, 1) >= 0.8 ? 'text-green-600 font-medium' : ''}>{r.occupied_units}</span> },
    { key: 'vacant_units', label: '空置',
      render: (r) => <span className={r.vacant_units > 5 ? 'text-red-600 font-medium' : ''}>{r.vacant_units}</span> },
    { key: 'new_signed_this_month', label: '本月新签' },
    { key: 'renewed_this_month', label: '本月续签' },
    { key: 'cumulative_signed', label: '累计签约' },
    { key: 'monthly_completion_rate', label: '月完成率',
      render: (r) => <MiniProgress value={r.monthly_completion_rate} /> },
    { key: 'avg_daily_traffic', label: '日均客流',
      render: (r) => formatNum(r.avg_daily_traffic) },
    { key: 'avg_sales_per_sqm', label: '均坪效',
      render: (r) => formatCurrency(r.avg_sales_per_sqm) },
    { key: 'avg_rent_to_sales_ratio', label: '租售比',
      render: (r) => `${r.avg_rent_to_sales_ratio.toFixed(1)}%` },
    { key: 'rent_per_sqm', label: '租金坪效',
      render: (r) => `${formatCurrency(r.rent_per_sqm)}/m²` },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">招商效率看板</h3>
          <p className="text-xs text-gray-500 mt-0.5">按楼层分组 | 统计周期: {data.period}</p>
        </div>
        <span className="text-xs text-gray-400">{data.mall_name}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              {cols.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.group_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                {cols.map((col) => (
                  <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
            {/* Totals row */}
            <tr className="bg-gray-100 font-semibold text-gray-700">
              {cols.map((col) => (
                <td key={`total-${col.key}`} className="px-3 py-2.5 whitespace-nowrap">
                  {col.key === 'group_name'
                    ? '合计'
                    : col.key === 'monthly_completion_rate'
                      ? <MiniProgress value={data.totals.monthly_completion_rate} />
                      : col.render
                        ? col.render(data.totals)
                        : formatNum((data.totals as Record<string, number>)[col.key] ?? 0)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
