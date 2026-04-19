'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { dashboardApi } from '@/lib/dashboard-api';
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
  leasing_type: string | null;
  lease_end: string | null;
  vacancy_days: number | null;
  previous_rent: number | null;
}

const STATUS_TAG: Record<string, string> = {
  vacant: 'bg-red-100 text-red-700',
  occupied: 'bg-green-100 text-green-700',
  reserved: 'bg-purple-100 text-purple-700',
  maintenance: 'bg-orange-100 text-orange-700',
  blocked: 'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<string, string> = {
  vacant: '空置',
  occupied: '在营',
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

const LEASING_TYPE_LABEL: Record<string, string> = {
  new: '新招',
  renewal: '续签',
  adjustment: '调整',
};

const LEASING_TYPE_OPTIONS = [
  { value: '', label: '全部招商类型' },
  { value: 'new', label: '新招' },
  { value: 'renewal', label: '续签' },
  { value: 'adjustment', label: '调整' },
];

const LAYOUT_TYPE_OPTIONS = [
  { value: '', label: '全部铺位类型' },
  { value: 'retail', label: '零售' },
  { value: 'kiosk', label: '专柜' },
  { value: 'food_court', label: '餐饮' },
  { value: 'anchor', label: '主力店' },
  { value: 'common_area', label: '公区' },
  { value: 'other', label: '其他' },
];

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
  const [leasingType, setLeasingType] = useState('');
  const [layoutType, setLayoutType] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (buildingId) params.building_id = buildingId;
      if (floorId) params.floor_id = floorId;
      if (statusFilter) params.status = statusFilter;
      if (areaMin) params.area_min = parseFloat(areaMin);
      if (areaMax) params.area_max = parseFloat(areaMax);
      if (rentMin) params.rent_min = parseFloat(rentMin);
      if (rentMax) params.rent_max = parseFloat(rentMax);
      if (leasingType) params.leasing_type = leasingType;
      if (layoutType) params.layout_type = layoutType;

      const res = await dashboardApi.getUnitsTool(MALL_ID, params);
      setData(res.data ?? res ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [buildingId, floorId, statusFilter, areaMin, areaMax, rentMin, rentMax, leasingType, layoutType]);

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
    <div className="max-w-full mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">铺位查询</h2>
        {!loading && data.length > 0 && (
          <span className="text-xs text-gray-400">共 {data.length} 条</span>
        )}
      </div>

      {/* Filters - Compact flex layout */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Row 1: Dropdowns */}
          <select
            value={buildingId}
            onChange={(e) => setBuildingId(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none bg-white min-w-[120px]"
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
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none bg-white disabled:bg-gray-100 min-w-[120px]"
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
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none bg-white min-w-[100px]"
          >
            <option value="">全部状态</option>
            <option value="vacant">空置</option>
            <option value="occupied">在营</option>
            <option value="reserved">预留</option>
            <option value="maintenance">维保中</option>
            <option value="blocked">封存</option>
          </select>

          <select
            value={leasingType}
            onChange={(e) => setLeasingType(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none bg-white min-w-[110px]"
          >
            {LEASING_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={layoutType}
            onChange={(e) => setLayoutType(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none bg-white min-w-[110px]"
          >
            {LAYOUT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Separator */}
          <div className="w-px h-8 bg-gray-200 hidden sm:block" />

          {/* Area range */}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="面积最小(m²)"
              value={areaMin}
              onChange={(e) => setAreaMin(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none w-[110px]"
            />
            <span className="text-gray-400 text-xs">-</span>
            <input
              type="number"
              placeholder="面积最大(m²)"
              value={areaMax}
              onChange={(e) => setAreaMax(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none w-[110px]"
            />
          </div>

          {/* Rent range */}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="月租最小(¥/m²)"
              value={rentMin}
              onChange={(e) => setRentMin(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none w-[120px]"
            />
            <span className="text-gray-400 text-xs">-</span>
            <input
              type="number"
              placeholder="月租最大(¥/m²)"
              value={rentMax}
              onChange={(e) => setRentMax(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-camp-500 outline-none w-[120px]"
            />
          </div>
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
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    铺位编号
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    楼层
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    铺位类型
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                    面积 (m²)
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
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    招商类型
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">
                    合同到期日
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">
                    空置天数
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row, index) => {
                  const leaseEnd = row.lease_end ? new Date(row.lease_end) : null;
                  const isExpiringSoon = leaseEnd && (leaseEnd.getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50 transition-colors ${index % 2 === 1 ? 'bg-gray-50/40' : ''}`}
                    >
                      <td className="px-4 py-2.5 font-mono font-medium text-gray-900 whitespace-nowrap">
                        {row.unit_code}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {row.floor_name || `${row.floor_number}F`}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {LAYOUT_LABEL[row.layout_type] || row.layout_type || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600 whitespace-nowrap">
                        {row.area > 0 ? row.area.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        <span
                          className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                            STATUS_TAG[row.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {STATUS_LABEL[row.status] || row.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 max-w-[140px] truncate" title={row.tenant_name || ''}>
                        {row.tenant_name || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600 whitespace-nowrap">
                        {row.monthly_rent != null && row.monthly_rent > 0
                          ? row.monthly_rent.toLocaleString()
                          : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {LEASING_TYPE_LABEL[row.leasing_type as keyof typeof LEASING_TYPE_LABEL] || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        {leaseEnd ? (
                          <span className={isExpiringSoon ? 'text-orange-600 font-medium' : 'text-gray-600'}>
                            {leaseEnd.toLocaleDateString('zh-CN')}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-600 whitespace-nowrap">
                        {row.vacancy_days != null && row.status === 'vacant' ? (
                          <span className="text-red-600">{row.vacancy_days}天</span>
                        ) : row.vacancy_days != null ? (
                          `${row.vacancy_days}天`
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        <Link
                          href={`/malls/${row.mall_id}/floors/${row.floor_id}`}
                          className="text-camp-600 hover:text-camp-700 text-xs font-medium"
                        >
                          定位
                        </Link>
                      </td>
                    </tr>
                  );
                })}
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
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-12" />
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
