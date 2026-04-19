'use client';

import React, { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/dashboard-api';
import type {
  ProjectInfoDetailResponse,
  FloorStructureItem,
} from '@/lib/types';

interface CardProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
}

function InfoCard({ title, children, loading }: CardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-5 animate-pulse space-y-3">
        <div className="h-5 bg-gray-200 rounded w-28" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">
        {title}
      </h3>
      {children}
    </div>
  );
}

function MetricRow({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex justify-between py-1.5">
      <dt className="text-gray-500 text-sm">{label}</dt>
      <dd className={`text-sm font-medium ${highlight ? 'text-camp-600' : 'text-gray-800'}`}>
        {value}
      </dd>
    </div>
  );
}

const MALL_ID = 1;

function isOperationsEmpty(ops: ProjectInfoDetailResponse['operations']): boolean {
  return (
    ops.annual_rent === 0 &&
    ops.rent_per_sqm === 0 &&
    ops.daily_traffic === 0 &&
    ops.monthly_sales === 0 &&
    ops.rent_to_sales_ratio === 0
  );
}

export default function ProjectsInfoPage() {
  const [data, setData] = useState<ProjectInfoDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      try {
        const res = await dashboardApi.getProjectDetail(MALL_ID);
        setData(res as ProjectInfoDetailResponse);
      } catch (err) {
        console.error('Failed to load project detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, []);

  if (!data && !loading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="py-16 text-center">
          <p className="text-gray-400 text-sm">暂无数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">项目综合信息</h2>
          {data && (
            <span className="px-2.5 py-0.5 bg-camp-50 text-camp-700 text-xs font-medium rounded-full">
              {data.mall_name}
            </span>
          )}
        </div>
        {data && (
          <span className="text-xs text-gray-400">
            更新时间: {new Date(data.updated_at).toLocaleString('zh-CN')}
          </span>
        )}
      </div>

      {/* Top 3 Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Basic Info */}
        <InfoCard title="基础信息" loading={loading}>
          {data ? (
            <dl className="space-y-0.5">
              <MetricRow label="开业时间" value={data.basic_info.opening_date || '-'} />
              <MetricRow label="经营分类" value={data.basic_info.operation_category || '-'} />
              <MetricRow label="商业体量" value={`${data.basic_info.total_area.toLocaleString()} m²`} />
              <MetricRow label="可租赁面积" value={`${data.basic_info.leasable_area.toLocaleString()} m²`} />
              <MetricRow label="楼宇数" value={`${data.basic_info.building_count} 栋`} />
              <MetricRow label="楼层数" value={`${data.basic_info.floor_count} 层`} />
            </dl>
          ) : null}
        </InfoCard>

        {/* Card 2: Operations */}
        <InfoCard title="经营情况" loading={loading}>
          {data ? (
            isOperationsEmpty(data.operations) ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                经营数据待接入
              </div>
            ) : (
              <dl className="space-y-0.5">
                <MetricRow label="年租金" value={`${(data.operations.annual_rent / 10000).toFixed(1)} 万`} />
                <MetricRow label="均坪效" value={`¥${data.operations.rent_per_sqm.toLocaleString()}/m²`} />
                <MetricRow label="客流总量" value={`${data.operations.daily_traffic.toLocaleString()} 人次`} />
                <MetricRow label="年销售额" value={`${(data.operations.monthly_sales * 12 / 10000).toFixed(0)} 万`} />
                <MetricRow label="租售比" value={`${data.operations.rent_to_sales_ratio.toFixed(1)}%`} highlight />
              </dl>
            )
          ) : null}
        </InfoCard>

        {/* Card 3: Brand Structure */}
        <InfoCard title="品牌结构" loading={loading}>
          {data?.brand_structure ? (
            <dl className="space-y-0.5">
              <MetricRow
                label="总品牌数"
                value={<span className="font-semibold">{data.brand_structure.total} 家</span>}
              />
              {data.brand_structure.items.map((item) => (
                <div key={item.tier} className="flex justify-between items-center py-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <dt className="text-gray-500 text-sm">{item.tier_name}</dt>
                  </div>
                  <dd className="text-sm text-gray-800">
                    <span className="font-medium">{item.count}家</span>
                    <span className="text-gray-400 ml-1">({item.percentage}%)</span>
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </InfoCard>
      </div>

      {/* Card 4: Floor Structure Table - Full Width */}
      <InfoCard title="铺位结构（按楼层）" loading={loading}>
        {data?.floor_structure ? (
          data.floor_structure.floors.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
              暂无楼层铺位数据
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">楼层</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">总数</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">在营</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">空置</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">出租率</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">到期预警</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">面积</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.floor_structure.floors.map((floor: FloorStructureItem) => (
                    <tr key={floor.floor_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2 font-medium text-gray-800">{floor.floor_name}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{floor.total_units}</td>
                      <td className="px-3 py-2 text-right text-green-600">{floor.occupied_units}</td>
                      <td className="px-3 py-2 text-right text-yellow-600">{floor.vacant_units}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={floor.occupancy_rate >= 0.9 ? 'text-green-600 font-medium' : floor.occupancy_rate >= 0.7 ? 'text-camp-600' : 'text-orange-600'}>
                          {(floor.occupancy_rate * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {floor.expiring_count > 0 ? (
                          <span className="text-orange-600 font-medium">{floor.expiring_count}</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{floor.total_area.toLocaleString()} m²</td>
                    </tr>
                  ))}
                  {/* Summary row */}
                  <tr className="border-t-2 border-gray-200 bg-gray-50/80 font-medium">
                    <td className="px-3 py-2 text-gray-700">合计</td>
                    <td className="px-3 py-2 text-right text-gray-700">{data.floor_structure.total_units}</td>
                    <td className="px-3 py-2 text-right text-green-700">{data.floor_structure.occupied_units}</td>
                    <td className="px-3 py-2 text-right text-yellow-700">{data.floor_structure.vacant_units}</td>
                    <td className="px-3 py-2 text-right text-camp-700">{(data.floor_structure.occupancy_rate * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right text-orange-700">{data.floor_structure.expiring_total}</td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {data.floor_structure.floors.reduce((sum, f) => sum + f.total_area, 0).toLocaleString()} m²
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </InfoCard>
    </div>
  );
}
