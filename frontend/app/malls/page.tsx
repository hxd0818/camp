'use client';

/**
 * Mall List Page - Shows all shopping centers with create functionality.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import type { Mall } from '@/lib/types';

export default function MallsPage() {
  const [malls, setMalls] = useState<Mall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadMalls();
  }, []);

  async function loadMalls() {
    try {
      setLoading(true);
      const data = await apiClient.listMalls();
      setMalls(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    try {
      const form = e.currentTarget;
      const data = {
        name: (form.elements.namedItem('name') as HTMLInputElement).value.trim(),
        code: (form.elements.namedItem('code') as HTMLInputElement).value.trim(),
        city: (form.elements.namedItem('city') as HTMLInputElement).value.trim() || undefined,
        address: (form.elements.namedItem('address') as HTMLInputElement).value.trim() || undefined,
        total_area: (form.elements.namedItem('total_area') as HTMLInputElement).value
          ? Number((form.elements.namedItem('total_area') as HTMLInputElement).value) : undefined,
        description: (form.elements.namedItem('description') as HTMLTextAreaElement).value.trim() || undefined,
      };
      await apiClient.createMall(data);
      setShowCreateModal(false);
      await loadMalls();
    } catch (err) {
      alert('创建失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setCreating(false);
    }
  }

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
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-camp-600 rounded-md hover:bg-camp-700"
          >
            + 新增购物中心
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {malls.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreateModal(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {malls.map((mall) => (
              <MallCard key={mall.id} mall={mall} />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">新增购物中心</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">名称 *</label>
                  <input name="name" required type="text" maxLength={200}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none"
                    placeholder="如：阳光广场" autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">编码 *</label>
                  <input name="code" required type="text" maxLength={50}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none"
                    placeholder="如：SUNSHINE-001" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">城市</label>
                  <input name="city" type="text"
                    className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none"
                    placeholder="如：上海" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">总面积 (m²)</label>
                  <input name="total_area" type="number" min={0} step={0.01}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none"
                    placeholder="如：65000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">地址</label>
                <input name="address" type="text"
                  className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none"
                  placeholder="详细地址" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">备注</label>
                <textarea name="description" rows={2} maxLength={500}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none resize-none"
                  placeholder="可选描述信息" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">
                  取消
                </button>
                <button type="submit" disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-white bg-camp-600 rounded-md hover:bg-camp-700 disabled:opacity-50">
                  {creating ? '创建中...' : '确认创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-lg mb-2">暂无购物中心</p>
      <p className="text-gray-300 text-sm mb-4">添加您的第一个购物中心开始使用</p>
      <button onClick={onCreateClick}
        className="px-4 py-2 text-sm font-medium text-white bg-camp-600 rounded-md hover:bg-camp-700">
        + 新增购物中心
      </button>
    </div>
  );
}
