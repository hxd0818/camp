'use client';

/**
 * UnitDetailPanel - Side panel showing detailed info for a selected unit.
 *
 * Displays when user clicks a hotspot on the floor plan.
 * Supports inline editing of unit info and contract upload with AI extraction.
 */

import React, { useState, useRef } from 'react';
import type { HotspotItem } from '@/lib/types';
import { apiClient } from '@/lib/api';

interface UnitDetailPanelProps {
  unit: HotspotItem;
  onClose: () => void;
  mallId?: number;
  onUpdated?: () => void;
}

export function UnitDetailPanel({ unit, onClose, mallId, onUpdated }: UnitDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [aiImportResult, setAiImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    code: unit.unit_code || '',
    name: unit.unit_name || '',
    status: (unit.unit_status as string) || 'vacant',
    layout_type: 'retail',
    gross_area: unit.area != null ? String(unit.area) : '',
    monthly_rent: unit.monthly_rent != null ? String(unit.monthly_rent) : '',
    lease_start: unit.lease_start || '',
    lease_end: unit.lease_end || '',
    description: '',
  });

  const resetForm = () => setEditForm({
    code: unit.unit_code || '',
    name: unit.unit_name || '',
    status: (unit.unit_status as string) || 'vacant',
    layout_type: 'retail',
    gross_area: unit.area != null ? String(unit.area) : '',
    monthly_rent: unit.monthly_rent != null ? String(unit.monthly_rent) : '',
    lease_start: unit.lease_start || '',
    lease_end: unit.lease_end || '',
    description: '',
  });

  // --- Save unit edit ---
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
      // If contract dates changed and there's an existing active contract, update it too
      if (unit.contract_status && (editForm.lease_start || editForm.lease_end)) {
        try {
          await apiClient.updateUnit(unit.unit_id, {
            code: editForm.code,
            name: editForm.name,
            status: editForm.status,
            layout_type: editForm.layout_type,
            gross_area: editForm.gross_area ? Number(editForm.gross_area) : null,
          });
        } catch (_) { /* best effort */ }
      }
      setEditing(false);
      setAiImportResult(null);
      onUpdated?.();
    } catch (err) {
      alert('保存失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  // --- Contract upload & AI import ---
  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !mallId) return;

    setUploadingContract(true);
    setAiImportResult(null);
    try {
      const result = await apiClient.aiImportContract(file, mallId);
      setAiImportResult(result);
      // Pre-fill form with extracted data
      const extracted = result.extracted_data || {};
      setEditForm(f => ({
        ...f,
        name: extracted.tenant_name || f.name,
        gross_area: extracted.area ? String(extracted.area) : f.gross_area,
        monthly_rent: extracted.monthly_rent ? String(extracted.monthly_rent) : f.monthly_rent,
        lease_start: extracted.lease_start || f.lease_start,
        lease_end: extracted.lease_end || f.lease_end,
      }));
    } catch (err) {
      alert('合同解析失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setUploadingContract(false);
      // Reset file input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /** Confirm AI-imported contract and create it */
  const handleConfirmImport = async () => {
    if (!aiImportResult?.extracted_data) return;
    setSaving(true);
    try {
      const ext = aiImportResult.extracted_data;
      await apiClient.confirmAiImport({
        tenant_name: ext.tenant_name || undefined,
        unit_id: unit.unit_id,
        contract_number: ext.contract_number || `${unit.unit_code}-${Date.now()}`,
        lease_start: editForm.lease_start || ext.lease_start,
        lease_end: editForm.lease_end || ext.lease_end,
        monthly_rent: editForm.monthly_rent ? Number(editForm.monthly_rent) : ext.monthly_rent,
        confidence_score: aiImportResult.confidence_score,
        source_file_name: aiImportResult.source_file_name,
        raw_data: aiImportResult.raw_data,
      });
      setAiImportResult(null);
      setEditing(false);
      onUpdated?.();
    } catch (err) {
      alert('确认导入失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelImport = () => {
    setAiImportResult(null);
  };

  return (
    <div className="w-80 bg-white border-l shadow-lg flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-sm text-gray-900 truncate">
          {editing ? '编辑铺位' : aiImportResult ? '确认合同导入' : '铺位详情'}
        </h3>
        {!editing && !aiImportResult && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none" aria-label="关闭">&times;</button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* AI Import Result Preview */}
        {aiImportResult && (
          <section className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 text-sm">AI 解析完成</span>
              <span className="text-xs text-amber-600 bg-amber-100 rounded-full px-1.5 py-0.5">
                置信度 {Math.round((aiImportResult.confidence_score || 0) * 100)}%
              </span>
            </div>
            {aiImportResult.source_file_name && (
              <p className="text-xs text-gray-500 truncate">文件: {aiImportResult.source_file_name}</p>
            )}
            {aiImportResult.warnings && aiImportResult.warnings.length > 0 && (
              <div className="text-xs text-amber-700 space-y-1 mt-1">
                {aiImportResult.warnings.map((w: string, i: number) => (
                  <p key={i}>- {w}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button onClick={handleConfirmImport} disabled={saving}
                className="flex-1 py-1.5 text-xs font-medium text-white bg-camp-600 rounded-md hover:bg-camp-700 disabled:opacity-50">
                {saving ? '创建中...' : '确认导入'}
              </button>
              <button onClick={handleCancelImport} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border rounded-md hover:bg-gray-50">
                取消
              </button>
            </div>
          </section>
        )}

        {/* Edit Form */}
        {editing && !aiImportResult ? (
          <section className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">铺位编号</label>
              <input type="text" value={editForm.code}
                onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none" maxLength={50} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">铺位名称</label>
              <input type="text" value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none" maxLength={200} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">状态</label>
                <select value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none">
                  <option value="vacant">空置</option>
                  <option value="occupied">已租</option>
                  <option value="reserved">预留</option>
                  <option value="maintenance">维保中</option>
                  <option value="blocked">封禁</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">面积 (m²)</label>
                <input type="number" value={editForm.gross_area}
                  onChange={e => setEditForm(f => ({ ...f, gross_area: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none" min={0} step={0.01} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">月租金</label>
                <input type="number" value={editForm.monthly_rent}
                  onChange={e => setEditForm(f => ({ ...f, monthly_rent: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none" min={0} step={0.01} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">业态类型</label>
                <select value={editForm.layout_type}
                  onChange={e => setEditForm(f => ({ ...f, layout_type: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none">
                  <option value="retail">零售</option>
                  <option value="kiosk">专柜</option>
                  <option value="food_court">餐饮</option>
                  <option value="anchor">主力店</option>
                  <option value="other">其他</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">起租时间</label>
                <input type="date" value={editForm.lease_start}
                  onChange={e => setEditForm(f => ({ ...f, lease_start: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">到期时间</label>
                <input type="date" value={editForm.lease_end}
                  onChange={e => setEditForm(f => ({ ...f, lease_end: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">备注</label>
              <textarea value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none resize-none" rows={2} maxLength={500} />
            </div>

            {/* Contract Upload */}
            <div className="border-t pt-3 mt-2">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">合同文件</h4>
              <input ref={fileInputRef} type="file" accept=".pdf,image/*"
                onChange={handleContractUpload}
                className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingContract}
                className="w-full py-2 px-3 text-sm font-medium border-2 border-dashed rounded-md text-gray-500 hover:text-camp-600 hover:border-camp-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploadingContract ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-camp-600" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /></svg>
                    <span>解析中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2zm-3 5H7v8H5V7zm4 4V9h4v4h4v-4z" fill="currentColor"/></svg>
                    <span>上传合同 (PDF/图片), AI 自动提取信息</span>
                  </>
                )}
              </button>
            </div>
          </section>
        ) : (
          /* Read-only View */
          <>
            {/* Unit Basic Info */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: unit.status_color || '#94a3b8' }} />
                <span className="font-semibold text-base">{unit.unit_name || unit.unit_code}</span>
              </div>
              <p className="text-sm text-gray-500">{unit.unit_code}</p>
            </section>

            {/* Status & Area */}
            <section className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">状态</span><span className="font-medium">{unit.unit_status === 'occupied' ? '已租' : unit.unit_status === 'vacant' ? '空置' : unit.unit_status}</span></div>
              {unit.area != null && <div className="flex justify-between text-sm"><span className="text-gray-500">面积</span><span className="font-medium">{unit.area} m²</span></div>}
              {unit.monthly_rent != null && <div className="flex justify-between text-sm"><span className="text-gray-500">月租金</span><span className="font-medium text-camp-600">¥{unit.monthly_rent.toLocaleString()}</span></div>}
            </section>

            {/* Tenant Info */}
            {unit.tenant_name && (
              <section>
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">租户信息</h4>
                <div className="bg-blue-50 rounded-lg p-3"><p className="font-medium text-sm text-blue-900">{unit.tenant_name}</p></div>
              </section>
            )}

            {/* Contract Info */}
            {(unit.contract_status || unit.lease_start) && (
              <section>
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">合同信息</h4>
                <div className="space-y-2">
                  {unit.contract_status && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">状态</span>
                      <span className={`font-medium ${unit.contract_status === 'active' ? 'text-green-600' : unit.contract_status === 'expiring' ? 'text-amber-600' : 'text-gray-600'}`}>
                        {unit.contract_status === 'active' ? '有效' : unit.contract_status === 'expiring' ? '即将到期' : unit.contract_status}
                      </span>
                    </div>
                  )}
                  {unit.lease_start && <div className="flex justify-between text-sm"><span className="text-gray-500">起租</span><span className="font-medium">{formatDate(unit.lease_start)}</span></div>}
                  {unit.lease_end && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">到期</span>
                      <span className={`font-medium ${new Date(unit.lease_end) < new Date() ? 'text-red-500' : ''}`}>{formatDate(unit.lease_end)}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* No Contract */}
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
          <div className="flex gap-2">
            <button onClick={() => { resetForm(); setEditing(false); }} disabled={saving}
              className="flex-1 py-2 px-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50">取消</button>
            <button onClick={handleSave} disabled={saving || !editForm.code.trim()}
              className="flex-1 py-2 px-3 text-sm font-medium text-white bg-camp-600 rounded-md hover:bg-camp-700 disabled:opacity-50">
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        ) : (
          <>
            <button onClick={() => setEditing(true)}
              className="w-full py-2 px-3 text-sm font-medium text-camp-600 bg-camp-50 rounded-md hover:bg-camp-100 transition-colors">编辑铺位</button>
          </>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch { return dateStr; }
}

export default UnitDetailPanel;
