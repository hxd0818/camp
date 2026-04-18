'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import type { Mall } from '@/lib/types';

interface Props {
  onMallChange: (id: number) => void;
  currentMallId: number;
}

export default function FilterBar({ onMallChange, currentMallId }: Props) {
  const [malls, setMalls] = useState<Mall[]>([]);

  useEffect(() => {
    apiClient
      .listMalls()
      .then(setMalls)
      .catch(() => {
        // Silently ignore fetch errors for mall list
      });
  }, []);

  return (
    <div className="bg-white border-b px-4 py-3 flex items-center gap-4 flex-wrap">
      <h1 className="text-lg font-bold text-gray-900 mr-2">
        招商业务驾驶舱
      </h1>

      {/* Mall selector dropdown */}
      <select
        value={currentMallId}
        onChange={(e) => onMallChange(Number(e.target.value))}
        className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none bg-white"
      >
        {malls.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <span className="text-xs text-gray-400 ml-auto">数据更新可用数据</span>
    </div>
  );
}
