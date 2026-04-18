'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { dashboardApi } from '@/lib/dashboard-api';
import type { LeasingPlan } from '@/lib/types';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'bg-gray-100 text-gray-600' },
  active: { label: '激活', cls: 'bg-blue-100 text-blue-600' },
  in_progress: { label: '进行中', cls: 'bg-cyan-100 text-cyan-600' },
  completed: { label: '已完成', cls: 'bg-green-100 text-green-600' },
  overdue: { label: '已逾期', cls: 'bg-red-100 text-red-600' },
  cancelled: { label: '已取消', cls: 'bg-gray-100 text-gray-400' },
};

const TYPE_MAP: Record<string, { label: string; cls: string }> = {
  adjustment: { label: '调整计划', cls: 'bg-indigo-100 text-indigo-700' },
  special: { label: '专项计划', cls: 'bg-amber-100 text-amber-700' },
};

interface PlanFormData {
  name: string;
  plan_type: string;
  target_area: string;
  target_units: string;
  owner: string;
  start_date: string;
  due_date: string;
  notes: string;
}

const EMPTY_FORM: PlanFormData = {
  name: '',
  plan_type: 'adjustment',
  target_area: '',
  target_units: '',
  owner: '',
  start_date: '',
  due_date: '',
  notes: '',
};

export default function PlansManagementPage() {
  const [data, setData] = useState<LeasingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanFormData>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: LeasingPlan[] = await dashboardApi.listPlans();
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

  function openEdit(plan: LeasingPlan) {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      plan_type: plan.plan_type,
      target_area: plan.target_area != null ? String(plan.target_area) : '',
      target_units:
        plan.target_units != null ? String(plan.target_units) : '',
      owner: plan.owner ?? '',
      start_date: plan.start_date ? plan.start_date.split('T')[0] : '',
      due_date: plan.due_date ? plan.due_date.split('T')[0] : '',
      notes: plan.notes ?? '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('请输入计划名称');
      return;
    }
    if (!form.start_date) {
      alert('请选择开始日期');
      return;
    }
    if (!form.due_date) {
      alert('请选择截止日期');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        plan_type: form.plan_type,
        start_date: form.start_date,
        due_date: form.due_date,
        owner: form.owner || null,
        notes: form.notes || null,
      };
      if (form.target_area) payload.target_area = Number(form.target_area);
      if (form.target_units) payload.target_units = Number(form.target_units);

      if (editingId != null) {
        await dashboardApi.updatePlan(editingId, payload);
      } else {
        await dashboardApi.createPlan(payload);
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
    if (!window.confirm('确定要删除该招商计划吗？')) return;
    try {
      await dashboardApi.deletePlan(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  }

  function calcProgressPct(plan: LeasingPlan): number {
    const target = plan.target_area ?? plan.target_units ?? 1;
    const completed = plan.target_area
      ? plan.completed_area
      : plan.completed_units;
    if (target === 0) return completed > 0 ? 100 : 0;
    return Math.min(100, Math.round((completed / target) * 100));
  }

  function getProgressBarColor(status: string): string {
    switch (status) {
      case 'overdue':
        return 'bg-red-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-camp-500';
    }
  }

  function isOverdue(plan: LeasingPlan): boolean {
    return (
      new Date(plan.due_date) < new Date() &&
      plan.status !== 'completed' &&
      plan.status !== 'cancelled'
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">招商计划管理</h2>
        <button
          onClick={openCreate}
          className="px-4 py-1.5 text-sm bg-camp-600 text-white rounded-md hover:bg-camp-700 transition-colors"
        >
          + 新建计划
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <PlansSkeleton />
        ) : data.length === 0 ? (
          <PlansEmpty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    计划名称
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">
                    类型
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                    目标
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                    已完成
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    进度
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    负责人
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                    截止日
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
                {data.map((plan) => {
                  const pct = calcProgressPct(plan);
                  const st = STATUS_MAP[plan.status] || STATUS_MAP.draft;
                  const tp = TYPE_MAP[plan.plan_type] || {
                    label: plan.plan_type,
                    cls: 'bg-gray-100 text-gray-600',
                  };
                  const barColor = getProgressBarColor(plan.status);
                  const overdue = isOverdue(plan);

                  return (
                    <tr
                      key={plan.id}
                      className={overdue ? 'bg-red-50/50' : ''}
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[200px] truncate">
                        {plan.name}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${tp.cls}`}
                        >
                          {tp.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {plan.target_area != null
                          ? `${plan.target_area.toLocaleString()} m²`
                          : plan.target_units != null
                            ? `${plan.target_units} 个`
                            : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {plan.target_area != null
                          ? `${plan.completed_area.toLocaleString()} m²`
                          : `${plan.completed_units} 个`}
                      </td>
                      <td className="px-4 py-2.5 w-36">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${barColor} transition-all`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-400 mt-0.5">
                          {pct}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {plan.owner || '-'}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right whitespace-nowrap ${
                          overdue
                            ? 'font-bold text-red-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {plan.due_date ? plan.due_date.split('T')[0] : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${st.cls}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(plan)}
                            className="text-camp-600 hover:text-camp-700 text-xs font-medium"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(plan.id)}
                            className="text-red-500 hover:text-red-600 text-xs font-medium"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              {editingId != null ? '编辑计划' : '新建计划'}
            </h3>

            <FormField
              label="计划名称 *"
              required
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  计划类型
                </label>
                <select
                  value={form.plan_type}
                  onChange={(e) =>
                    setForm({ ...form, plan_type: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none bg-white"
                >
                  <option value="adjustment">调整计划</option>
                  <option value="special">专项计划</option>
                </select>
              </div>
              <FormField
                label="负责人"
                value={form.owner}
                onChange={(v) => setForm({ ...form, owner: v })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="目标面积 (m²)"
                value={form.target_area}
                onChange={(v) => setForm({ ...form, target_area: v })}
              />
              <FormField
                label="目标铺位数"
                value={form.target_units}
                onChange={(v) => setForm({ ...form, target_units: v })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  开始日期 *
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm({ ...form, start_date: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  截止日期 *
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm({ ...form, due_date: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                备注
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none resize-vertical"
                placeholder="可选备注信息..."
              />
            </div>

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
                {submitting
                  ? '提交中...'
                  : editingId != null
                    ? '保存'
                    : '创建'}
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

function PlansSkeleton() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-5 bg-gray-200 rounded w-14" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-28" />
          <div className="h-4 bg-gray-200 rounded w-14" />
          <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
          <div className="h-5 bg-gray-200 rounded w-12" />
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>
      ))}
    </div>
  );
}

function PlansEmpty() {
  return (
    <div className="py-16 text-center">
      <p className="text-gray-300 text-sm">暂无招商计划</p>
    </div>
  );
}
