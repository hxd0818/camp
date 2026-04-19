'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface BrandRow {
  id: number;
  tenant_name: string;
  brand_tier: string | null;
  type: string;
  contract_count: number;
  total_area: number;
  monthly_rent: number;
  status: string;
}

const TIER_OPTIONS = [
  { value: 'all', label: '全部能级' },
  { value: 'S', label: 'S级' },
  { value: 'A', label: 'A级' },
  { value: 'B', label: 'B级' },
  { value: 'C', label: 'C级' },
  { value: 'lianfa', label: '联发' },
];

const TIER_BADGE: Record<string, string> = {
  S: 'bg-red-100 text-red-700',
  A: 'bg-orange-100 text-orange-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-gray-100 text-gray-600',
  lianfa: 'bg-purple-100 text-purple-700',
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active: { label: '在营', cls: 'text-green-600' },
  inactive: { label: '停业', cls: 'text-gray-400' },
  pending: { label: '待开业', cls: 'text-yellow-600' },
};

const PAGE_SIZE = 15;

export default function BrandsQueryPage() {
  const [data, setData] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/dashboard/tools/brands?` +
        new URLSearchParams({
          mall_id: '1',
          search,
          tier: tierFilter !== 'all' ? tierFilter : '',
          status: statusFilter,
          skip: String(skip),
          limit: String(PAGE_SIZE),
        });

      const brandRes: any = await fetch(apiUrl).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      });

      const items: BrandRow[] = brandRes.data ?? brandRes ?? [];
      const count: number = brandRes.total ?? items.length;
      setData(items);
      setTotal(count);
    } catch (err) {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, tierFilter, statusFilter, skip]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">品牌查询</h2>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="搜索租户名称..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSkip(0);
            }}
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none w-56"
          />
          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value);
              setSkip(0);
            }}
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none bg-white"
          >
            {TIER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setSkip(0);
            }}
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none bg-white"
          >
            <option value="">全部状态</option>
            <option value="active">在营</option>
            <option value="inactive">停业</option>
            <option value="pending">待开业</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <LoadingSkeleton />
        ) : data.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                      名称
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                      能级
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                      类型
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                      合同数
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                      总面积 (m&sup2;)
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                      月租金 (¥)
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">
                      状态
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((row) => {
                    const st = STATUS_MAP[row.status] || {
                      label: row.status,
                      cls: 'text-gray-500',
                    };
                    return (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          {row.tenant_name}
                        </td>
                        <td className="px-4 py-2.5">
                          {row.brand_tier ? (
                            <span
                              className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                                TIER_BADGE[row.brand_tier] || 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {row.brand_tier.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{row.type || '-'}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">
                          {row.contract_count}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600">
                          {row.total_area > 0
                            ? row.total_area.toLocaleString()
                            : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600">
                          {row.monthly_rent > 0
                            ? row.monthly_rent.toLocaleString()
                            : '-'}
                        </td>
                        <td className={`px-4 py-2.5 text-center ${st.cls}`}>
                          {st.label}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button className="text-camp-600 hover:text-camp-700 text-xs font-medium">
                            详情
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              total={total}
              onPageChange={(page) => setSkip((page - 1) * PAGE_SIZE)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <div className="h-4 bg-gray-200 rounded w-36" />
          <div className="h-5 bg-gray-200 rounded w-10" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-12 ml-auto" />
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-12" />
          <div className="h-4 bg-gray-200 rounded w-10" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <p className="text-gray-300 text-sm">暂无品牌数据</p>
    </div>
  );
}

function PaginationBar({
  currentPage,
  totalPages,
  total,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    )
      pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-gray-500">
      <span>共 {total} 条记录</span>
      <div className="flex gap-1">
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
        >
          上一页
        </button>
        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`dot-${idx}`} className="px-2 py-1">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`px-2 py-1 border rounded ${
                p === currentPage
                  ? 'bg-camp-600 text-white border-camp-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
        >
          下一页
        </button>
      </div>
    </div>
  );
}
