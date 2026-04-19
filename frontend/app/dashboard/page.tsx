'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import FilterBar from '@/components/dashboard/FilterBar';
import KPICard from '@/components/dashboard/KPICard';
import KanbanBoard from '@/components/dashboard/KanbanBoard';
import ExpiringContractsTable from '@/components/dashboard/ExpiringContractsTable';
import PlanProgressTable from '@/components/dashboard/PlanProgressTable';
import { dashboardApi } from '@/lib/dashboard-api';

const VacancyPieChart = dynamic(
  () => import('@/components/dashboard/VacancyPieChart'),
  { ssr: false }
);
const LeaseTermBarChart = dynamic(
  () => import('@/components/dashboard/LeaseTermBarChart'),
  { ssr: false }
);
const BrandTierDonut = dynamic(
  () => import('@/components/dashboard/BrandTierDonut'),
  { ssr: false }
);
const SigningStructureChart = dynamic(
  () => import('@/components/dashboard/SigningStructureChart'),
  { ssr: false }
);
import type {
  DashboardStats,
  KanbanData,
  VacancyBucketSchema,
  LeaseTermBucketSchema,
  BrandTierBucketSchema,
  ExpiringContractItem,
  LeasingPlan,
  SigningStructureResponse,
  BrandTrendResponse,
} from '@/lib/types';

export default function DashboardPage() {
  const [mallId, setMallId] = useState<number>(1);

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [kanbanData, setKanbanData] = useState<KanbanData | null>(null);
  const [vacancyBuckets, setVacancyBuckets] = useState<VacancyBucketSchema[]>([]);
  const [leaseTerms, setLeaseTerms] = useState<LeaseTermBucketSchema[]>([]);
  const [brandTiers, setBrandTiers] = useState<BrandTierBucketSchema[]>([]);
  const [brandTrend, setBrandTrend] = useState<BrandTrendResponse | null>(null);
  const [signingStructure, setSigningStructure] = useState<SigningStructureResponse | null>(null);
  const [expiringItems, setExpiringItems] = useState<ExpiringContractItem[]>([]);
  const [plans, setPlans] = useState<LeasingPlan[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        kanbanRes,
        vacancyRes,
        leaseRes,
        brandRes,
        brandTrendRes,
        signingRes,
        expiringRes,
        plansRes,
      ] = await Promise.allSettled([
        dashboardApi.getStats(mallId),
        dashboardApi.getKanban(mallId),
        dashboardApi.getVacancy(mallId),
        dashboardApi.getLeaseTerm(mallId),
        dashboardApi.getBrandTier(mallId),
        dashboardApi.getBrandTrend(mallId),
        dashboardApi.getSigningStructure(mallId),
        dashboardApi.getExpiring(mallId, 30),
        dashboardApi.listPlans({ mall_id: mallId }),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value as unknown as DashboardStats);
      if (kanbanRes.status === 'fulfilled') setKanbanData(kanbanRes.value as unknown as KanbanData);
      if (vacancyRes.status === 'fulfilled') {
        const d = vacancyRes.value as any;
        setVacancyBuckets(d?.buckets || []);
      }
      if (leaseRes.status === 'fulfilled') {
        const d = leaseRes.value as any;
        setLeaseTerms(d?.buckets || []);
      }
      if (brandRes.status === 'fulfilled') {
        const d = brandRes.value as any;
        setBrandTiers(d?.buckets || []);
      }
      if (brandTrendRes.status === 'fulfilled') {
        setBrandTrend(brandTrendRes.value as unknown as BrandTrendResponse);
      }
      if (signingRes.status === 'fulfilled') {
        setSigningStructure(signingRes.value as unknown as SigningStructureResponse);
      }
      if (expiringRes.status === 'fulfilled') {
        const d = expiringRes.value as any;
        setExpiringItems(d?.items || []);
      }
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value as unknown as LeasingPlan[]);
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setLoading(false);
    }
  }, [mallId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return (
    <>
      <FilterBar currentMallId={mallId} onMallChange={setMallId} />

      {/* KPI Cards - 13 KPIs in compact layout */}
      {loading ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-13 gap-2 mb-6">
          {[...Array(13)].map((_, i) => (
            <KPICard key={i} title="" value="" loading compact />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-13 gap-2 mb-6">
          <KPICard
            title="出租率"
            value={stats.kpis.occupancy_rate.value}
            unit="%"
            change={stats.kpis.occupancy_rate.change}
            color="text-green-600"
            compact
          />
          <KPICard
            title="空置面积"
            value={stats.kpis.vacant_area.value}
            unit="m²"
            change={stats.kpis.vacant_area.change}
            color="text-red-500"
            compact
          />
          <KPICard
            title="月租收入"
            value={Math.round(stats.kpis.monthly_revenue.value / 10000)}
            unit="万"
            change={stats.kpis.monthly_revenue.change}
            color="text-blue-600"
            compact
          />
          <KPICard
            title="即到合同"
            value={stats.kpis.expiring_count.value}
            unit="个"
            color="text-orange-500"
            compact
          />
          <KPICard
            title="招商完成"
            value={stats.kpis.leasing_completion.value}
            unit="%"
            change={stats.kpis.leasing_completion.change}
            color="text-purple-600"
            compact
          />
          <KPICard
            title="联发品牌"
            value={stats.kpis.lianfa_ratio.value}
            unit="%"
            change={stats.kpis.lianfa_ratio.change}
            color="text-cyan-600"
            compact
          />
          {/* Additional KPIs */}
          <KPICard
            title="总面积"
            value={stats.kpis.total_area?.value || 0}
            unit="m²"
            color="text-gray-600"
            compact
          />
          <KPICard
            title="已租面积"
            value={stats.kpis.leased_area?.value || 0}
            unit="m²"
            color="text-indigo-600"
            compact
          />
          <KPICard
            title="总铺位数"
            value={stats.kpis.total_units?.value || 0}
            unit="个"
            color="text-slate-600"
            compact
          />
          <KPICard
            title="已租铺位"
            value={stats.kpis.occupied_units?.value || 0}
            unit="个"
            color="text-emerald-600"
            compact
          />
          <KPICard
            title="空置铺位"
            value={stats.kpis.vacant_units?.value || 0}
            unit="个"
            color="text-rose-500"
            compact
          />
          <KPICard
            title="品牌总数"
            value={stats.kpis.total_tenants?.value || 0}
            unit="家"
            color="text-violet-600"
            compact
          />
          <KPICard
            title="平均租金"
            value={stats.kpis.avg_rent_per_sqm?.value || 0}
            unit="元/m²"
            color="text-amber-600"
            compact
          />
        </div>
      ) : null}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <VacancyPieChart
          data={vacancyBuckets}
          loading={loading}
          changePercent={stats?.kpis.vacant_area.change}
        />
        <LeaseTermBarChart data={leaseTerms} loading={loading} />
        <BrandTierDonut
          data={brandTiers}
          loading={loading}
          totalNewThisMonth={brandTrend?.total_new_this_month}
          totalChangePercent={brandTrend?.items.reduce((sum, item) => sum + (item.change_percentage || 0), 0) / (brandTrend?.items.length || 1)}
        />
      </div>

      {/* Signing Structure Chart - New Row */}
      {signingStructure && (
        <div className="grid grid-cols-1 gap-6 mb-6">
          <SigningStructureChart
            data={signingStructure.items}
            totalArea={signingStructure.total_area}
            changePercent={signingStructure.change_percentage}
            loading={loading}
          />
        </div>
      )}

      {/* Kanban Board */}
      <div className="mb-6">
        <KanbanBoard mallId={mallId} />
      </div>

      {/* Bottom Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpiringContractsTable items={expiringItems} loading={loading} />
        <PlanProgressTable initialPlans={plans} loading={loading} />
      </div>
    </>
  );
}
