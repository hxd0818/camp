'use client';

/**
 * Tenant Management Page for a specific mall.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import type { Tenant } from '@/lib/types';

export default function TenantsPage() {
  const params = useParams();
  const mallId = Number(params.mallId);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.listTenants().then(setTenants).finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/malls/${mallId}`} className="text-sm text-gray-500 hover:text-camp-600">&larr; Mall</Link>
            <h1 className="text-xl font-bold">Tenants</h1>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-camp-600 rounded-md hover:bg-camp-700">
            + Add Tenant
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No tenants yet</div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3 text-gray-500">{t.type}</td>
                    <td className="px-4 py-3 text-gray-500">{t.contact_person || t.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        t.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {t.status}
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
