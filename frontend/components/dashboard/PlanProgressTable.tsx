'use client';

import React from 'react';
import type { LeasingPlan } from '@/lib/types';

interface Props {
  initialPlans?: LeasingPlan[];
  loading?: boolean;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'bg-gray-100 text-gray-600' },
  active: { label: '激活', cls: 'bg-blue-100 text-blue-600' },
  in_progress: { label: '进行中', cls: 'bg-cyan-100 text-cyan-600' },
  completed: { label: '已完成', cls: 'bg-green-100 text-green-600' },
  overdue: { label: '已逾期', cls: 'bg-red-100 text-red-600' },
  cancelled: { label: '已取消', cls: 'bg-gray-100 text-gray-400' },
};

function calcProgressPct(plan: LeasingPlan): number {
  if (!plan.target_area) {
    return plan.completed_area > 0 ? 100 : 0;
  }
  return Math.min(
    100,
    Math.round((plan.completed_area / plan.target_area) * 100)
  );
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

export default function PlanProgressTable({
  initialPlans = [],
  loading,
}: Props) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-4 h-48 animate-pulse" />
    );
  }

  // Empty state
  if (!initialPlans.length) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          招商计划进度
        </h3>
        <p className="text-center text-gray-300 text-sm py-8">暂无计划</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Table header */}
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-gray-700">
          招商计划进度
        </h3>
      </div>

      {/* Table body */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                计划名称
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                类型
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                目标
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                已完成
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                进度
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                负责人
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                截止日
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                状态
              </th>
            </tr>
          </thead>
          <tbody>
            {initialPlans.map((plan) => {
              const pct = calcProgressPct(plan);
              const st = STATUS_MAP[plan.status] || STATUS_MAP.draft;
              const barColor = getProgressBarColor(plan.status);
              const isOverdue =
                new Date(plan.due_date) < new Date() &&
                plan.status !== 'completed' &&
                plan.status !== 'cancelled';

              return (
                <tr
                  key={plan.id}
                  className={isOverdue ? 'bg-red-50/50' : ''}
                >
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {plan.name}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${st.cls}`}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500">
                    {plan.target_area
                      ? `${plan.target_area.toLocaleString()} m&sup2;`
                      : '-'}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {plan.completed_area.toLocaleString()} m&sup2;
                  </td>
                  <td className="px-3 py-2 w-32">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${barColor}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">{pct}%</span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {plan.owner || '-'}
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${
                      isOverdue ? 'font-bold text-red-600' : 'text-gray-500'
                    }`}
                  >
                    {plan.due_date}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${st.cls}`}
                    >
                      {st.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
