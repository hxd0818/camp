'use client';

/**
 * Operations / Work Orders page.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import type { WorkOrder } from '@/lib/types';

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-orange-50 text-orange-700',
  urgent: 'bg-red-50 text-red-700',
};

const statusColors: Record<string, string> = {
  open: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
};

export default function OperationsPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.listWorkOrders().then(setWorkOrders).finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-500 hover:text-camp-600">&larr; Home</Link>
            <h1 className="text-xl font-bold">Operations</h1>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-camp-600 rounded-md hover:bg-camp-700">
            + New Work Order
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : workOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No work orders yet</div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map((wo) => (
                  <tr key={wo.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium max-w-xs truncate">{wo.title}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{wo.category.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${priorityColors[wo.priority]}`}>
                        {wo.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[wo.status]}`}>
                        {wo.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(wo.created_at).toLocaleDateString()}
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
