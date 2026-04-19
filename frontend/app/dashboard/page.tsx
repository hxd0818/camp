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
import type {
  DashboardStats,
  KanbanData,
  VacancyBucketSchema,
  LeaseTermBucketSchema,
  BrandTierBucketSchema,
  ExpiringContractItem,
  LeasingPlan,
} from '@/lib/types';

export default function DashboardPage() {
  const [mallId, setMallId] = useState<number>(1);

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [kanbanData, setKanbanData] = useState<KanbanData | null>(null);
  const [vacancyBuckets, setVacancyBuckets] = useState<VacancyBucketSchema[]>([]);
  const [leaseTerms, setLeaseTerms] = useState<LeaseTermBucketSchema[]>([]);
  const [brandTiers, setBrandTiers] = useState<BrandTierBucketSchema[]>([]);
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
        expiringRes,
        plansRes,
      ] = await Promise.allSettled([
        dashboardApi.getStats(mallId),
        dashboardApi.getKanban(mallId),
        dashboardApi.getVacancy(mallId),
        dashboardApi.getLeaseTerm(mallId),
        dashboardApi.getBrandTier(mallId),
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

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {[...Array(6)].map((_, i) => (
            <KPICard key={i} title="" value="" loading />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <KPICard
            title="出租率"
            value={stats.kpis.occupancy_rate.value}
            unit="%"
            change={stats.kpis.occupancy_rate.change}
            color="text-green-600"
          />
          <KPICard
            title="空置面积"
            value={stats.kpis.vacant_area.value}
            unit="m²"
            change={stats.kpis.vacant_area.change}
            color="text-red-500"
          />
          <KPICard
            title="月租收入"
            value={Math.round(stats.kpis.monthly_revenue.value / 10000)}
            unit="万"
            change={stats.kpis.monthly_revenue.change}
            color="text-blue-600"
          />
          <KPICard
            title="即到合同"
            value={stats.kpis.expiring_count.value}
            unit="个"
            color="text-orange-500"
          />
          <KPICard
            title="招商完成"
            value={stats.kpis.leasing_completion.value}
            unit="%"
            change={stats.kpis.leasing_completion.change}
            color="text-purple-600"
          />
          <KPICard
            title="联发品牌"
            value={stats.kpis.lianfa_ratio.value}
            unit="%"
            change={stats.kpis.lianfa_ratio.change}
            color="text-cyan-600"
          />
        </div>
      ) : null}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <VacancyPieChart data={vacancyBuckets} loading={loading} />
        <LeaseTermBarChart data={leaseTerms} loading={loading} />
        <BrandTierDonut data={brandTiers} loading={loading} />
      </div>

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
