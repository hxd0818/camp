'use client';

/**
 * Mall List Page - Shows all shopping centers.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import type { Mall } from '@/lib/types';

export default function MallsPage() {
  const [malls, setMalls] = useState<Mall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMalls() {
      try {
        const data = await apiClient.listMalls();
        setMalls(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }
    loadMalls();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-500 hover:text-camp-600">&larr; 首页</Link>
            <h1 className="text-xl font-bold text-gray-900">购物中心</h1>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-camp-600 rounded-md hover:bg-camp-700">
            + 新增购物中心
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {malls.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {malls.map((mall) => (
              <MallCard key={mall.id} mall={mall} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function MallCard({ mall }: { mall: Mall }) {
  return (
    <Link href={`/malls/${mall.id}`} className="block group">
      <div className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-camp-600 transition-colors">
              {mall.name}
            </h3>
            <p className="text-sm text-gray-400 mt-0.5">{mall.code}</p>
          </div>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              mall.status === 'active'
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {mall.status === 'active' ? '运营中' : '停业'}
          </span>
        </div>
        {mall.city && (
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <span>{mall.city}</span>
            {mall.address && <span>- {mall.address}</span>}
          </p>
        )}
        {mall.total_area && (
          <p className="text-xs text-gray-400 mt-2">总面积 {mall.total_area.toLocaleString()} 平方米</p>
        )}
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-lg mb-2">暂无购物中心</p>
      <p className="text-gray-300 text-sm">添加您的第一个购物中心开始使用</p>
    </div>
  );
}
