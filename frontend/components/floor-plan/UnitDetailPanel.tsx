'use client';

/**
 * UnitDetailPanel - Side panel showing detailed info for a selected unit.
 *
 * Displays when user clicks a hotspot on the floor plan.
 * Shows tenant info, contract status, financial summary, and quick actions.
 * Supports inline editing of unit basic information.
 */

import React, { useState } from 'react';
import type { HotspotItem } from '@/lib/types';
import { apiClient } from '@/lib/api';

interface UnitDetailPanelProps {
  unit: HotspotItem;
  onClose: () => void;
  mallId?: number;
  onUpdated?: () => void; // callback after successful edit
}

export function UnitDetailPanel({ unit, onClose, onUpdated }: UnitDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    code: unit.unit_code || '',
    name: unit.unit_name || '',
    status: (unit.unit_status as string) || 'vacant',
    layout_type: 'retail',
    gross_area: unit.area || '',
    description: '',
  });

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.updateUnit(unit.unit_id, {
        code: editForm.code,
        name: editForm.name,
        status: editForm.status,
        layout_type: editForm.layout_type,
        gross_area: editForm.gross_area ? Number(editForm.gross_area) : null,
        description: editForm.description || null,
      });
      setEditing(false);
      onUpdated?.();
    } catch (err) {
      alert('保存失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditForm({
      code: unit.unit_code || '',
      name: unit.unit_name || '',
      status: (unit.unit_status as string) || 'vacant',
      layout_type: 'retail',
      gross_area: unit.area || '',
      description: '',
    });
  };

  return (
    <div className="w-80 bg-white border-l shadow-lg flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-sm text-gray-900">
          {editing ? '编辑铺位' : '铺位详情'}
        </h3>
        {!editing && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="关闭面板"
          >
            &times;
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {editing ? (
          /* Edit Form */
          <section className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">铺位编号</label>
              <input
                type="text"
                value={editForm.code}
                onChange={(e) => setEditForm(f => ({ ...f, code: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 focus:border-camp-500 outline-none"
                maxLength={50}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">铺位名称</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 focus:border-camp-500 outline-none"
                maxLength={200}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">状态</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none"
                >
                  <option value="vacant">空置</option>
                  <option value="occupied">已租</option>
                  <option value="reserved">预留</option>
                  <option value="maintenance">维保中</option>
                  <option value="blocked">封禁</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">面积 (m²)</label>
                <input
                  type="number"
                  value={editForm.gross_area}
                  onChange={(e) => setEditForm(f => ({ ...f, gross_area: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 focus:border-camp-500 outline-none"
                  min={0}
                  step={0.01}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">备注</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 focus:border-camp-500 outline-none resize-none"
                rows={2}
                maxLength={500}
              />
            </div>
          </section>
        ) : (
          /* Read-only View */
          <>
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

            {/* Status & Area */}
            <section className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">状态</span>
                <span className="font-medium">{statusLabel[unit.unit_status] || unit.unit_status}</span>
              </div>
              {unit.area != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">面积</span>
                  <span className="font-medium">{unit.area} m²</span>
                </div>
              )}
              {unit.monthly_rent != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">月租金</span>
                  <span className="font-medium text-camp-600">¥{unit.monthly_rent.toLocaleString()}</span>
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
            {(unit.contract_status || unit.lease_start) && (
              <section>
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  合同信息
                </h4>
                <div className="space-y-2">
                  {unit.contract_status && (
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
                  )}
                  {unit.lease_start && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">起租时间</span>
                      <span className="font-medium">{formatDate(unit.lease_start)}</span>
                    </div>
                  )}
                  {unit.lease_end && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">到期时间</span>
                      <span className={`font-medium ${new Date(unit.lease_end) < new Date() ? 'text-red-500' : ''}`}>
                        {formatDate(unit.lease_end)}
                      </span>
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
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t p-3 space-y-2">
        {editing ? (
          <>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 py-2 px-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editForm.code.trim()}
                className="flex-1 py-2 px-3 text-sm font-medium text-white bg-camp-600 rounded-md hover:bg-camp-700 transition-colors disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              className="w-full py-2 px-3 text-sm font-medium text-camp-600 bg-camp-50 rounded-md hover:bg-camp-100 transition-colors"
              onClick={() => setEditing(true)}
            >
              编辑铺位
            </button>
            {unit.tenant_name && (
              <button
                className="w-full py-2 px-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                onClick={() => {
                  /* TODO: navigate to contract page */
                }}
              >
                查看合同
              </button>
            )}
          </>
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
