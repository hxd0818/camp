'use client';

import React, { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/dashboard-api';
import type { ProjectInfoDetailResponse } from '@/lib/types';

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

function MetricRow({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex justify-between py-1">
      <dt className="text-gray-500 text-sm">{label}</dt>
      <dd className={`text-sm font-medium ${highlight ? 'text-camp-600' : 'text-gray-800'}`}>
        {value}
      </dd>
    </div>
  );
}

const MALL_ID = 1;

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

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">项目信息</h2>
        {data && (
          <span className="text-xs text-gray-400">
            更新时间: {new Date(data.updated_at).toLocaleString('zh-CN')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Basic Info */}
        <InfoCard title="基础信息" loading={loading}>
          {data ? (
            <dl className="space-y-1">
              <MetricRow label="开业时间" value={data.basic_info.opening_date || '-'} />
              <MetricRow label="经营分类" value={data.basic_info.operation_category || '-'} />
              <MetricRow label="总面积" value={`${data.basic_info.total_area.toLocaleString()} m²`} />
              <MetricRow label="可租赁面积" value={`${data.basic_info.leasable_area.toLocaleString()} m²`} />
              <MetricRow label="楼宇数" value={data.basic_info.building_count} />
              <MetricRow label="楼层数" value={data.basic_info.floor_count} />
            </dl>
          ) : null}
        </InfoCard>

        {/* Card 2: Operations */}
        <InfoCard title="经营情况" loading={loading}>
          {data ? (
            <dl className="space-y-1">
              <MetricRow label="年租金" value={`¥${data.operations.annual_rent.toLocaleString()}`} />
              <MetricRow label="坪效" value={`¥${data.operations.rent_per_sqm.toLocaleString()}/m²`} />
              <MetricRow label="日均客流" value={`${data.operations.daily_traffic.toLocaleString()}人次`} />
              <MetricRow label="月均销售" value={`¥${data.operations.monthly_sales.toLocaleString()}`} />
              <MetricRow label="租售比" value={`${data.operations.rent_to_sales_ratio.toFixed(1)}%`} />
            </dl>
          ) : null}
        </InfoCard>

        {/* Card 3: Brand Structure */}
        <InfoCard title="品牌结构" loading={loading}>
          {data?.brand_structure ? (
            <dl className="space-y-1">
              <MetricRow label="总品牌数" value={`${data.brand_structure.total}家`} />
              {data.brand_structure.items.map((item) => (
                <div key={item.tier} className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
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

        {/* Card 4: Floor Structure */}
        <InfoCard title="铺位结构" loading={loading}>
          {data?.floor_structure ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm pb-2 border-b">
                <span className="text-gray-500">总铺位数</span>
                <span className="font-medium">{data.floor_structure.total_units}个</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">已租 / 空置</span>
                <span>
                  <span className="text-green-600 font-medium">{data.floor_structure.occupied_units}</span>
                  {' / '}
                  <span className="text-yellow-600">{data.floor_structure.vacant_units}</span>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">出租率</span>
                <span className="font-medium text-camp-600">
                  {data.floor_structure.occupancy_rate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">到期预警</span>
                <span className="font-medium text-orange-600">
                  {data.floor_structure.expiring_total}个
                </span>
              </div>

              {/* Floor breakdown */}
              {data.floor_structure.floors.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-400 mb-2">楼层详情</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {data.floor_structure.floors.map((floor) => (
                      <div key={floor.floor_id} className="flex justify-between text-xs">
                        <span className="text-gray-500">{floor.floor_name}</span>
                        <span>
                          <span className="text-green-600">{floor.occupied_units}</span>
                          /<span className="text-yellow-600">{floor.vacant_units}</span>
                          {floor.expiring_count > 0 && (
                            <span className="text-orange-500 ml-1">
                              ({floor.expiring_count}到期)
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </InfoCard>
      </div>
    </div>
  );
}
