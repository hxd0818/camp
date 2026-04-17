'use client';

/**
 * Floor Plan View Page - THE CORE PAGE of CAMP.
 *
 * Displays an interactive floor plan image with unit hotspot overlays.
 * Users can click units to see details, upload new floor plans,
 * and manage unit positions visually.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FloorPlanViewer } from '@/components/floor-plan/FloorPlanViewer';
import { apiClient } from '@/lib/api';
import type { FloorPlan } from '@/lib/types';

export default function FloorPlanViewPage() {
  const params = useParams();
  const mallId = Number(params.mallId);
  const floorId = Number(params.floorId);

  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFloorPlans() {
      try {
        const plans = await apiClient.listFloorPlans(floorId);
        setFloorPlans(plans);
        const active = plans.find((p) => p.is_active) || plans[0];
        setActivePlanId(active?.id || null);
      } finally {
        setLoading(false);
      }
    }

    if (floorId) {
      loadFloorPlans();
    }
  }, [floorId]);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/malls/${mallId}`}
              className="text-sm text-gray-500 hover:text-camp-600"
            >
              &larr; 购物中心
            </Link>
            <h1 className="text-lg font-bold text-gray-900">铺位图纸视图</h1>
            <span className="text-sm text-gray-400">{floorId}层</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Plan Version Selector */}
            {floorPlans.length > 1 && (
              <select
                className="text-sm border rounded-md px-2 py-1 bg-white"
                value={activePlanId || ''}
                onChange={(e) => setActivePlanId(Number(e.target.value))}
              >
                {floorPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    v{p.version} {p.is_active ? '(当前)' : ''}
                  </option>
                ))}
              </select>
            )}

            {/* Upload Button */}
            <label className="cursor-pointer px-3 py-1.5 text-sm font-medium text-white bg-camp-600 rounded-md hover:bg-camp-700">
              上传图纸
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>
      </header>

      {/* Status Legend */}
      <div className="max-w-[1920px] mx-auto px-4 py-2 flex items-center gap-6 text-xs text-gray-500">
        <span className="font-medium">图例：</span>
        <LegendItem color="#22c55e" label="已租" />
        <LegendItem color="#ef4444" label="空置" />
        <LegendItem color="#f59e0b" label="即将到期" />
        <LegendItem color="#a855f7" label="预留" />
        <LegendItem color="#6b7280" label="维保中" />
      </div>

      {/* Floor Plan Viewer - THE CORE COMPONENT */}
      <div className="max-w-[1920px] mx-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-[70vh] text-gray-500">
            加载中...
          </div>
        ) : activePlanId ? (
          <FloorPlanViewer planId={activePlanId} mallId={mallId} floorId={floorId} editable />
        ) : (
          <NoPlanState floorId={floorId} onUpload={() => {}} />
        )}
      </div>
    </main>
  );
}

async function handleUpload(file: File | undefined) {
  if (!file) return;

  // TODO: Implement upload flow with file selection dialog
  // This will call apiClient.uploadFloorPlan()
  alert('上传功能将在下一阶段实现');
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function NoPlanState({
  floorId,
  onUpload,
}: {
  floorId: number;
  onUpload: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-lg border">
      <svg
        className="w-16 h-16 text-gray-300 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-600 mb-1">尚未上传楼层图纸</h3>
      <p className="text-sm text-gray-400 mb-4">
        上传楼层平面图即可启用交互式铺位管理
      </p>
      <button
        onClick={onUpload}
        className="px-4 py-2 text-sm font-medium text-white bg-camp-600 rounded-md hover:bg-camp-700"
      >
        上传楼层图纸
      </button>
    </div>
  );
}
