'use client';

/**
 * Floor List Page - Shows all floors for a mall, with links to floor plan views.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import type { Mall } from '@/lib/types';

export default function FloorsPage() {
  const params = useParams();
  const mallId = Number(params.mallId);
  const [mall, setMall] = useState<Mall | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMall() {
      try {
        const data = await apiClient.getMall(mallId);
        setMall(data);
      } finally {
        setLoading(false);
      }
    }
    loadMall();
  }, [mallId]);

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;
  if (!mall) return <div className="p-8 text-center text-red-500">购物中心不存在</div>;

  // Show floors 1-5 with links to floor plan view
  const floors = [1, 2, 3, 4, 5];

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/malls/${mallId}`} className="text-sm text-gray-500 hover:text-camp-600">
            &larr; {mall.name}
          </Link>
          <h1 className="text-xl font-bold text-gray-900">楼层管理</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">{mall.name} - 楼层列表</h2>
          <p className="text-sm text-gray-400 mb-4">点击楼层查看铺位图纸</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {floors.map((floorNum) => (
              <Link
                key={floorNum}
                href={`/malls/${mallId}/floors/${floorNum}`}
                className="block group"
              >
                <div className="border rounded-lg p-5 hover:shadow-md transition-shadow hover:border-camp-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-gray-900 group-hover:text-camp-600 transition-colors">
                      {floorNum}层
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      F{floorNum}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 text-center mt-2">
                    查看图纸与铺位
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
