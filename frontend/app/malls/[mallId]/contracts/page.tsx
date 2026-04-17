'use client';

/**
 * Contract Management Page with AI Import capability.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import type { Contract, ContractAIImportResponse } from '@/lib/types';

export default function ContractsPage() {
  const params = useParams();
  const mallId = Number(params.mallId);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState<ContractAIImportResponse | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient.listContracts().then(setContracts).finally(() => setLoading(false));
  }, [mallId]);

  // Handle AI contract import
  const handleAiImport = async (file: File) => {
    try {
      setImporting(true);
      const result = await apiClient.aiImportContract(file, mallId);
      setAiResult(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/malls/${mallId}`} className="text-sm text-gray-500 hover:text-camp-600">&larr; 购物中心</Link>
            <h1 className="text-xl font-bold">合同管理</h1>
          </div>
          <div className="flex gap-3">
            {/* AI Import Button */}
            <label
              className={`cursor-pointer px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                importing ? 'bg-gray-400 cursor-wait' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {importing ? '处理中...' : 'AI 智能导入合同'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAiImport(e.target.files[0])}
              />
            </label>
            <button
              onClick={() => {}}
              className="px-4 py-2 text-sm font-medium text-white bg-camp-600 rounded-md hover:bg-camp-700"
            >
              + 新建合同
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* AI Import Result Panel */}
        {aiResult && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
            <h3 className="font-semibold text-purple-900 mb-3">AI 识别结果</h3>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <AiField label="商户名称" value={aiResult.extracted_data.tenant_name} />
              <AiField label="铺位编号" value={aiResult.extracted_data.unit_code || '-'} />
              <AiField label="面积" value={aiResult.extracted_data.area ? `${aiResult.extracted_data.area} 平方米` : '-'} />
              <AiField label="月租金" value={aiResult.extracted_data.monthly_rent?.toString() || '-'} />
              <AiField label="租期开始" value={aiResult.extracted_data.lease_start || '-'} />
              <AiField label="租期结束" value={aiResult.extracted_data.lease_end || '-'} />
              <AiField label="置信度" value={`${(aiResult.extracted_data.confidence_score * 100).toFixed(0)}%`} />
              <AiField label="匹配铺位" value={aiResult.matched_unit_code || '未匹配'} />
            </div>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                onClick={() => {
                  alert('确认流程将在下一阶段实现');
                  setAiResult(null);
                }}
              >
                确认并创建合同
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border rounded-md hover:bg-gray-50"
                onClick={() => setAiResult(null)}
              >
                放弃
              </button>
            </div>
          </div>
        )}

        {/* Contracts Table */}
        {loading ? (
          <p className="text-gray-500">加载中...</p>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">暂无合同数据</div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">合同编号</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">铺位</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">租赁期限</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">月租金</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">状态</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">来源</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{c.contract_number}</td>
                    <td className="px-4 py-3">铺位 #{c.unit_id}</td>
                    <td className="px-4 py-3 text-gray-500">{c.lease_start} ~ {c.lease_end}</td>
                    <td className="px-4 py-3">{c.monthly_rent || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        c.status === 'active' ? 'bg-green-50 text-green-700' :
                        c.status === 'expiring' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {c.status === 'active' ? '有效' : c.status === 'expiring' ? '即将到期' : c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.ai_imported ? (
                        <span className="text-xs text-purple-600 font-medium">AI导入</span>
                      ) : (
                        <span className="text-xs text-gray-400">手动录入</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function AiField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-purple-400 text-xs uppercase tracking-wider">{label}</p>
      <p className="font-medium text-purple-900">{value}</p>
    </div>
  );
}
