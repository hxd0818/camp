'use client';

/**
 * Mall Detail Page - Overview of a specific shopping mall.
 * Shows buildings, floors summary, and quick navigation to floor plan view.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import type { Mall, Building } from '@/lib/types';

export default function MallDetailPage() {
  const params = useParams();
  const mallId = Number(params.mallId);
  const [mall, setMall] = useState<Mall | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMallData() {
      try {
        const [mallData, buildingData] = await Promise.all([
          apiClient.getMall(mallId),
          apiClient.listBuildings(mallId),
        ]);
        setMall(mallData);
        setBuildings(buildingData);
      } finally {
        setLoading(false);
      }
    }
    loadMallData();
  }, [mallId]);

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;
  if (!mall) return <div className="p-8 text-center text-red-500">购物中心不存在</div>;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/malls" className="text-sm text-gray-500 hover:text-camp-600">
            &larr; 购物中心
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{mall.name}</h1>
          <span className="text-sm text-gray-400">{mall.code}</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Mall Info Card */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">购物中心信息</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoItem label="城市" value={mall.city || '-'} />
            <InfoItem label="总面积" value={mall.total_area ? `${mall.total_area} 平方米` : '-'} />
            <InfoItem label="状态" value={mall.status === 'active' ? '运营中' : '停业'} highlight />
            <InfoItem label="楼宇数" value={String(buildings.length)} />
          </div>
        </div>

        {/* Buildings & Floors */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">楼宇与楼层</h2>
            <button className="text-sm text-camp-600 hover:text-camp-700 font-medium">
              + 新增楼宇
            </button>
          </div>

          {buildings.length === 0 ? (
            <p className="text-gray-400 text-sm py-4">暂无楼宇，请先添加。</p>
          ) : (
            <div className="space-y-4">
              {buildings.map((b) => (
                <div key={b.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{b.name}</h3>
                      <p className="text-sm text-gray-400">{b.code} · {b.total_floors} 层</p>
                    </div>
                    <Link
                      href={`/malls/${mallId}/floors`}
                      className="text-sm text-camp-600 hover:text-camp-700 font-medium"
                    >
                      查看楼层
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function InfoItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-gray-400 text-xs uppercase tracking-wider">{label}</p>
      <p className={`mt-0.5 ${highlight ? 'font-semibold text-camp-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}
