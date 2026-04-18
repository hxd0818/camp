'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import type { Building, Floor } from '@/lib/types';

interface UnitRow {
  id: number;
  unit_code: string;
  floor_id: number;
  floor_number: number;
  floor_name: string;
  building_id: number;
  building_name: string;
  area: number;
  layout_type: string;
  status: string;
  tenant_name: string | null;
  monthly_rent: number | null;
  mall_id: number;
}

const STATUS_TAG: Record<string, string> = {
  vacant: 'bg-yellow-100 text-yellow-700',
  occupied: 'bg-green-100 text-green-700',
  reserved: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-orange-100 text-orange-700',
  blocked: 'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<string, string> = {
  vacant: '空置',
  occupied: '已租',
  reserved: '预留',
  maintenance: '维保中',
  blocked: '封存',
};

const LAYOUT_LABEL: Record<string, string> = {
  retail: '零售',
  kiosk: '专柜',
  food_court: '餐饮',
  anchor: '主力店',
  common_area: '公区',
  other: '其他',
};

const MALL_ID = 1;

export default function UnitsQueryPage() {
  const [data, setData] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);

  // Filter states
  const [buildingId, setBuildingId] = useState<number>(0);
  const [floorId, setFloorId] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [areaMin, setAreaMin] = useState('');
  const [areaMax, setAreaMax] = useState('');
  const [rentMin, setRentMin] = useState('');
  const [rentMax, setRentMax] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (buildingId) params.building_id = String(buildingId);
      if (floorId) params.floor_id = String(floorId);
      if (statusFilter) params.status = statusFilter;
      if (areaMin) params.area_min = areaMin;
      if (areaMax) params.area_max = areaMax;
      if (rentMin) params.rent_min = rentMin;
      if (rentMax) params.rent_max = rentMax;

      const search = new URLSearchParams(params).toString();
      const url =
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/dashboard/tools/units?mall_id=${MALL_ID}` +
        (search ? `&${search}` : '');

      const res: any = await fetch(url).then((r) => r.json());
      setData(res.data ?? res ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [buildingId, floorId, statusFilter, areaMin, areaMax, rentMin, rentMax]);

  useEffect(() => {
    apiClient
      .listBuildings(MALL_ID)
      .then(setBuildings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (buildingId) {
      apiClient
        .listFloors(buildingId)
        .then(setFloors)
        .catch(() => {});
      setFloorId(0);
    } else {
      setFloors([]);
      setFloorId(0);
    }
  }, [buildingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">铺位查询</h2>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <select
            value={buildingId}
            onChange={(e) => setBuildingId(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none bg-white"
          >
            <option value={0}>全部楼宇</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={floorId}
            onChange={(e) => setFloorId(Number(e.target.value))}
            disabled={!buildingId}
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none bg-white disabled:bg-gray-100"
          >
            <option value={0}>全部楼层</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none bg-white"
          >
            <option value="">全部状态</option>
            <option value="vacant">空置</option>
            <option value="occupied">已租</option>
            <option value="reserved">预留</option>
            <option value="maintenance">维保中</option>
            <option value="blocked">封存</option>
          </select>

          <input
            type="number"
            placeholder="面积最小 (m&sup2;)"
            value={areaMin}
            onChange={(e) => setAreaMin(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none"
          />

          <input
            type="number"
            placeholder="面积最大 (m&sup2;)"
            value={areaMax}
            onChange={(e) => setAreaMax(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none"
          />

          <input
            type="number"
            placeholder="月租最小 (¥)"
            value={rentMin}
            onChange={(e) => setRentMin(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none"
          />

          <input
            type="number"
            placeholder="月租最大 (¥)"
            value={rentMax}
            onChange={(e) => setRentMax(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <UnitsSkeleton />
        ) : data.length === 0 ? (
          <UnitsEmpty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    铺位编号
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    楼层
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                    面积 (m&sup2;)
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    类型
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">
                    状态
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    租户
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                    月租金 (¥)
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-medium text-gray-900">
                      {row.unit_code}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {row.floor_name || `${row.floor_number}F`}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {row.area > 0 ? row.area.toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {LAYOUT_LABEL[row.layout_type] || row.layout_type || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                          STATUS_TAG[row.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {STATUS_LABEL[row.status] || row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {row.tenant_name || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {row.monthly_rent != null && row.monthly_rent > 0
                        ? row.monthly_rent.toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Link
                        href={`/malls/${row.mall_id}/floors/${row.floor_id}`}
                        className="text-camp-600 hover:text-camp-700 text-xs font-medium"
                      >
                        定位
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function UnitsSkeleton() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-14" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-12" />
          <div className="h-5 bg-gray-200 rounded w-12" />
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
          <div className="h-4 bg-gray-200 rounded w-10" />
        </div>
      ))}
    </div>
  );
}

function UnitsEmpty() {
  return (
    <div className="py-16 text-center">
      <p className="text-gray-300 text-sm">暂无铺位数据</p>
    </div>
  );
}
