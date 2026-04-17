'use client';

/**
 * UnitDetailPanel - Side panel showing detailed info for a selected unit.
 *
 * Displays when user clicks a hotspot on the floor plan.
 * Shows tenant info, contract status, financial summary, and quick actions.
 */

import React from 'react';
import type { HotspotItem } from '@/lib/types';

interface UnitDetailPanelProps {
  unit: HotspotItem;
  onClose: () => void;
  mallId?: number;
}

export function UnitDetailPanel({ unit, onClose, mallId }: UnitDetailPanelProps) {
  const statusLabel: Record<string, string> = {
    vacant: '空置',
    occupied: '已租',
    reserved: '预留',
    maintenance: '维保中',
    blocked: '封禁',
  };

  const contractStatusLabel: Record<string, string> = {
    draft: '草稿',
    active: '有效',
    expiring: '即将到期',
    expired: '已过期',
    terminated: '已终止',
    renewed: '已续约',
  };

  return (
    <div className="w-80 bg-white border-l shadow-lg flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-sm text-gray-900">铺位详情</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="关闭面板"
        >
          &times;
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Unit Basic Info */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: unit.status_color || '#94a3b8' }}
            />
            <span className="font-semibold text-base">{unit.unit_name || unit.unit_code}</span>
          </div>
          <p className="text-sm text-gray-500">{unit.unit_code}</p>
        </section>

        {/* Status */}
        <section className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">状态</span>
            <span className="font-medium">{statusLabel[unit.unit_status] || unit.unit_status}</span>
          </div>
          {unit.area && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">面积</span>
              <span className="font-medium">{unit.area} 平方米</span>
            </div>
          )}
        </section>

        {/* Tenant Info */}
        {unit.tenant_name && (
          <section>
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              租户信息
            </h4>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="font-medium text-sm text-blue-900">{unit.tenant_name}</p>
            </div>
          </section>
        )}

        {/* Contract Info */}
        {unit.contract_status && (
          <section>
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              合同信息
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">合同状态</span>
                <span
                  className={`font-medium ${
                    unit.contract_status === 'active'
                      ? 'text-green-600'
                      : unit.contract_status === 'expiring'
                      ? 'text-amber-600'
                      : 'text-gray-600'
                  }`}
                >
                  {contractStatusLabel[unit.contract_status] || unit.contract_status}
                </span>
              </div>
              {unit.lease_end && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">租期截止</span>
                  <span className="font-medium">{formatDate(unit.lease_end)}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!unit.tenant_name && !unit.contract_status && (
          <section className="text-center py-6">
            <p className="text-sm text-gray-400">暂无合同</p>
            <p className="text-xs text-gray-300 mt-1">该铺位当前可出租</p>
          </section>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t p-3 space-y-2">
        <button
          className="w-full py-2 px-3 text-sm font-medium text-camp-600 bg-camp-50 rounded-md hover:bg-camp-100 transition-colors"
          onClick={() => {
            /* Navigate to unit edit page */
          }}
        >
          编辑铺位
        </button>
        {unit.tenant_name && (
          <button
            className="w-full py-2 px-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            onClick={() => {
              /* Navigate to contract page */
            }}
          >
            查看合同
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default UnitDetailPanel;
