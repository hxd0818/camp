'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { dashboardApi } from '@/lib/dashboard-api';
import type { MarketNews } from '@/lib/types';

const CATEGORY_OPTIONS = [
  { value: 'industry', label: '行业动态' },
  { value: 'policy', label: '政策法规' },
  { value: 'market', label: '市场分析' },
  { value: 'competitor', label: '竞品动态' },
  { value: 'other', label: '其他' },
];

const CATEGORY_COLOR: Record<string, string> = {
  industry: 'bg-blue-100 text-blue-700',
  policy: 'bg-purple-100 text-purple-700',
  market: 'bg-green-100 text-green-700',
  competitor: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-600',
};

interface NewsFormData {
  title: string;
  content: string;
  source: string;
  category: string;
  cover_image_url: string;
}

const EMPTY_FORM: NewsFormData = {
  title: '',
  content: '',
  source: '',
  category: 'industry',
  cover_image_url: '',
};

export default function NewsManagementPage() {
  const [data, setData] = useState<MarketNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<NewsFormData>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: MarketNews[] = await dashboardApi.listNews();
      setData(res);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(item: MarketNews) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      content: item.content ?? '',
      source: item.source ?? '',
      category: item.category,
      cover_image_url: item.cover_image_url ?? '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('请输入标题');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId != null) {
        await dashboardApi.updateNews(editingId, form);
      } else {
        await dashboardApi.createNews(form);
      }
      setShowModal(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || '操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('确定要删除这条资讯吗？')) return;
    try {
      await dashboardApi.deleteNews(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  }

  async function handleTogglePublish(item: MarketNews) {
    try {
      await dashboardApi.togglePublish(item.id, !item.is_published);
      await fetchData();
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">市场资讯管理</h2>
        <button
          onClick={openCreate}
          className="px-4 py-1.5 text-sm bg-camp-600 text-white rounded-md hover:bg-camp-700 transition-colors"
        >
          + 新建文章
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <NewsSkeleton />
        ) : data.length === 0 ? (
          <NewsEmpty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    标题
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">
                    分类
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    来源
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">
                    已发布
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    日期
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[280px] truncate">
                      {item.title}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                          CATEGORY_COLOR[item.category] ||
                          CATEGORY_COLOR.other
                        }`}
                      >
                        {
                          CATEGORY_OPTIONS.find(
                            (o) => o.value === item.category
                          )?.label ?? item.category
                        }
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {item.source || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleTogglePublish(item)}
                        className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                          item.is_published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {item.is_published ? '是' : '否'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString('zh-CN')
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-camp-600 hover:text-camp-700 text-xs font-medium"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-500 hover:text-red-600 text-xs font-medium"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              {editingId != null ? '编辑文章' : '新建文章'}
            </h3>

            <FormField
              label="标题 *"
              required
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v })}
            />

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                内容
              </label>
              <textarea
                value={form.content}
                onChange={(e) =>
                  setForm({ ...form, content: e.target.value })
                }
                rows={5}
                className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none resize-vertical"
                placeholder="请输入文章内容..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="来源"
                value={form.source}
                onChange={(v) => setForm({ ...form, source: v })}
              />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  分类
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none bg-white"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <FormField
              label="封面图片 URL"
              value={form.cover_image_url}
              onChange={(v) =>
                setForm({ ...form, cover_image_url: v })
              }
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 text-sm border rounded-md hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 text-sm bg-camp-600 text-white rounded-md hover:bg-camp-700 transition-colors disabled:opacity-50"
              >
                {submitting ? '提交中...' : editingId != null ? '保存' : '创建'}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}
    </div>
  );
}

/* ---------- Reusable sub-components ---------- */

function FormField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none"
      />
    </div>
  );
}

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function NewsSkeleton() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="h-5 bg-gray-200 rounded w-14" />
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-5 bg-gray-200 rounded w-10" />
          <div className="h-4 bg-gray-200 rounded w-24 ml-auto" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

function NewsEmpty() {
  return (
    <div className="py-16 text-center">
      <p className="text-gray-300 text-sm">暂无资讯数据</p>
    </div>
  );
}
