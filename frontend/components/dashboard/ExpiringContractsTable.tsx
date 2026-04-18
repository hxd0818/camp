'use client';

import React from 'react';

interface ExpiringContractItem {
  contract_id: number;
  contract_number: string;
  unit_code: string;
  tenant_name: string | null;
  lease_end: string;
  days_remaining: number;
  monthly_rent: number | null;
  status: string;
}

interface Props {
  items: ExpiringContractItem[];
  loading?: boolean;
}

export default function ExpiringContractsTable({ items, loading }: Props) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-4 h-48 animate-pulse" />
    );
  }

  // Empty state
  if (!items?.length) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          即将到期合同 TOP10
        </h3>
        <p className="text-center text-gray-300 text-sm py-8">暂无即将到期合同</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Table header */}
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-gray-700">
          即将到期合同 TOP10
        </h3>
      </div>

      {/* Table body */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                合同编号
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                铺位
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                租户
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                到期日
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                剩余天数
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                月租金
              </th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 10).map((item) => {
              const isUrgent = item.days_remaining <= 7;
              const isWarning = item.days_remaining <= 30;

              return (
                <tr
                  key={item.contract_id}
                  className={
                    isUrgent
                      ? 'bg-red-50'
                      : isWarning
                        ? 'bg-yellow-50'
                        : ''
                  }
                >
                  <td className="px-3 py-2 text-gray-700 font-mono text-xs">
                    {item.contract_number}
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {item.unit_code}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {item.tenant_name || '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-right">
                    {item.lease_end}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${
                      isUrgent
                        ? 'text-red-600'
                        : isWarning
                          ? 'text-yellow-600'
                          : 'text-gray-700'
                    }`}
                  >
                    {item.days_remaining}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-right">
                    {item.monthly_rent
                      ? `\u00a5${item.monthly_rent.toLocaleString()}`
                      : '-'}
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
