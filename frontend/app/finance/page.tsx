'use client';

/**
 * Finance Dashboard - Invoices and payments overview.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import type { Invoice } from '@/lib/types';

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.listInvoices().then(setInvoices).finally(() => setLoading(false));
  }, []);

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingCount = invoices.filter((i) => i.status === 'pending').length;
  const paidCount = invoices.filter((i) => i.status === 'paid').length;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-camp-600">&larr; 首页</Link>
          <h1 className="text-xl font-bold">财务管理</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard label="开票总额" value={`${totalAmount.toLocaleString()}`} />
          <SummaryCard label="待收款" value={String(pendingCount)} subLabel="张发票" />
          <SummaryCard label="已收款" value={String(paidCount)} subLabel="张发票" />
        </div>

        {/* Invoices Table */}
        {loading ? (
          <p className="text-gray-500">加载中...</p>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-400">暂无账单数据</div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">发票编号</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">金额</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">到期日</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">状态</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="px-4 py-3 font-medium">{Number(inv.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.due_date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        inv.status === 'paid' ? 'bg-green-50 text-green-700' :
                        inv.status === 'overdue' ? 'bg-red-50 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {inv.status === 'paid' ? '已付' : inv.status === 'overdue' ? '逾期' : inv.status}
                      </span>
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

function SummaryCard({
  label,
  value,
  subLabel,
}: {
  label: string;
  value: string;
  subLabel?: string;
}) {
  return (
    <div className="bg-white rounded-lg border p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subLabel && <p className="text-xs text-gray-400 mt-0.5">{subLabel}</p>}
    </div>
  );
}
