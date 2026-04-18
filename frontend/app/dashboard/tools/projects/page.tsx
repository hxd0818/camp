'use client';

import React, { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/dashboard-api';
import type { DashboardStats } from '@/lib/types';

interface ProjectCardProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
}

function ProjectCard({ title, children, loading }: ProjectCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6 animate-pulse space-y-3">
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
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">
        {title}
      </h3>
      {children}
    </div>
  );
}

const MALL_ID = 1;

export default function ProjectsInfoPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [brandData, setBrandData] = useState<
    Array<{ tier: string; count: number; percentage: number }>
  >([]);
  const [floorSummary, setFloorSummary] = useState<
    Array<{ floor_name: string; occupied: number; vacant: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const [statsRes, brandRes, floorRes] = await Promise.all([
          dashboardApi.getStats(MALL_ID),
          fetch(
            `${
              process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            }/api/v1/dashboard/brand-tier?mall_id=${MALL_ID}`
          ).then((r) => r.json()),
          fetch(
            `${
              process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            }/api/v1/dashboard/floor-summary?mall_id=${MALL_ID}`
          ).then((r) => r.json()),
        ]);

        setStats(statsRes as DashboardStats);
        setBrandData(
          (brandRes.tiers ?? brandRes.data ?? []) as typeof brandData
        );
        setFloorSummary(
          (floorRes.floors ?? floorRes.data ?? []) as typeof floorSummary
        );
      } catch (err) {
        console.error('Failed to load project info:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const occupancyRate = stats
    ? stats.summary.total_units > 0
      ? (
          (stats.summary.occupied_units / stats.summary.total_units) *
          100
        ).toFixed(1)
      : '0.0'
    : '-';

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">项目概况</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Basic Info */}
        <ProjectCard title="基本信息" loading={loading}>
          <dl className="space-y-2.5 text-sm">
            <InfoItem label="城市" value={stats?.mall_name ?? '-'} />
            <InfoItem
              label="总面积"
              value={
                stats?.summary.total_area
                  ? `${stats.summary.total_area.toLocaleString()} m²`
                  : '-'
              }
            />
            <InfoItem label="楼宇数" value="-" />
            <InfoItem label="楼层数" value="-" />
          </dl>
        </ProjectCard>

        {/* Card 2: Operations Summary */}
        <ProjectCard title="运营概览" loading={loading}>
          <dl className="space-y-2.5 text-sm">
            <InfoItem
              label="月营收"
              value={
                stats?.kpis.monthly_revenue
                  ? `¥${stats.kpis.monthly_revenue.value.toLocaleString()}`
                  : '-'
              }
            />
            <InfoItem
              label="出租率"
              value={`${occupancyRate}%`}
              highlight={occupancyRate !== '-'}
            />
            <InfoItem
              label="总铺位数"
              value={stats?.summary.total_units?.toLocaleString() ?? '-'}
            />
            <InfoItem
              label="有效合同"
              value={stats?.summary.active_contracts?.toLocaleString() ?? '-'}
            />
          </dl>
        </ProjectCard>

        {/* Card 3: Brand Structure */}
        <ProjectCard title="品牌结构" loading={loading}>
          {brandData.length > 0 ? (
            <dl className="space-y-2.5 text-sm">
              {brandData.map((item) => (
                <InfoItem
                  key={item.tier}
                  label={item.tier.toUpperCase()}
                  value={`${item.count} 家 (${item.percentage.toFixed(1)}%)`}
                />
              ))}
            </dl>
          ) : (
            <p className="text-gray-300 text-sm py-4 text-center">
              暂无品牌数据
            </p>
          )}
        </ProjectCard>

        {/* Card 4: Unit Structure by Floor */}
        <ProjectCard title="铺位结构（按楼层）" loading={loading}>
          {floorSummary.length > 0 ? (
            <dl className="space-y-2.5 text-sm">
              {floorSummary.map((item) => (
                <div key={item.floor_name} className="flex justify-between">
                  <dt className="text-gray-500">{item.floor_name}</dt>
                  <dd className="text-gray-800">
                    <span className="text-green-600 font-medium">
                      {item.occupied}
                    </span>{' '}
                    /{' '}
                    <span className="text-yellow-600">{item.vacant}</span>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-gray-300 text-sm py-4 text-center">
              暂无楼层数据
            </p>
          )}
        </ProjectCard>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd
        className={`font-medium ${highlight ? 'text-camp-600' : 'text-gray-800'}`}
      >
        {value}
      </dd>
    </div>
  );
}
