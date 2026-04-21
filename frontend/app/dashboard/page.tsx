'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import FilterBar from '@/components/dashboard/FilterBar';
import KPICard from '@/components/dashboard/KPICard';
import KanbanBoard from '@/components/dashboard/KanbanBoard';
import ExpiringContractsTable from '@/components/dashboard/ExpiringContractsTable';
import PlanProgressTable from '@/components/dashboard/PlanProgressTable';
import AlertPanel from '@/components/dashboard/AlertPanel';
import EfficiencyTable from '@/components/dashboard/EfficiencyTable';
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
  AlertsResponse,
  EfficiencyTableResponse,
} from '@/lib/types';

/** Helper to safely extract a KPIMetric value with fallback */
function kpiVal(kpis: DashboardStats['kpis'], field: string): number {
  const m = (kpis as Record<string, unknown>)[field] as { value?: number } | undefined;
  return m?.value ?? 0;
}

/** Helper to safely extract a KPIMetric change */
function kpiChange(kpis: DashboardStats['kpis'], field: string): number | null {
  const m = (kpis as Record<string, unknown>)[field] as { change?: number | null } | undefined;
  return m?.change ?? null;
}

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
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [efficiency, setEfficiency] = useState<EfficiencyTableResponse | null>(null);

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
        alertsRes,
        efficiencyRes,
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
        dashboardApi.getAlerts(mallId),
        dashboardApi.getEfficiency(mallId),
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
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value as unknown as AlertsResponse);
      if (efficiencyRes.status === 'fulfilled') setEfficiency(efficiencyRes.value as unknown as EfficiencyTableResponse);
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setLoading(false);
    }
  }, [mallId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const kpis = stats?.kpis;

  return (
    <>
      <FilterBar currentMallId={mallId} onMallChange={setMallId} />

      {/* KPI Cards - Row 1: Core Business Metrics (6 cards) */}
      {loading ? (
        <div className="grid grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {[...Array(6)].map((_, i) => (
            <KPICard key={`r1-${i}`} title="" value="" loading />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {/* 1. Dynamic Occupancy Rate */}
          <KPICard
            title="动态出租率"
            value={kpiVal(kpis!, 'dynamic_occupancy_rate')}
            unit="%"
            change={kpiChange(kpis!, 'dynamic_occupancy_rate')}
            color="text-green-600"
          />
          {/* 2. Static Occupancy Rate */}
          <KPICard
            title="静态出租率"
            value={kpiVal(kpis!, 'static_occupancy_rate')}
            unit="%"
            color="text-emerald-600"
          />
          {/* 3. Vacant Area */}
          <KPICard
            title="空置面积"
            value={(kpiVal(kpis!, 'vacant_area') / 10000).toFixed(1)}
            unit="万m²"
            change={kpiChange(kpis!, 'vacant_area')}
            subtitle={
              kpiVal(kpis!, 'vacant_area_ratio') > 0
                ? `占招调${kpiVal(kpis!, 'vacant_area_ratio').toFixed(1)}%`
                : undefined
            }
            color="text-red-500"
          />
          {/* 4. New Vacant Area */}
          <KPICard
            title="新增空置"
            value={(kpiVal(kpis!, 'new_vacant_area') / 10000).toFixed(1)}
            unit="万m²"
            change={kpiChange(kpis!, 'new_vacant_area')}
            color="text-orange-500"
          />
          {/* 5. Lianfa Brand Ratio */}
          <KPICard
            title="联发占比"
            value={kpiVal(kpis!, 'lianfa_brand_ratio')}
            unit="%"
            change={kpiChange(kpis!, 'lianfa_brand_ratio')}
            subtitle={
              kpiVal(kpis!, 'lianfa_total_area') > 0
                ? `${(kpiVal(kpis!, 'lianfa_total_area') / 10000).toFixed(1)}万m²`
                : undefined
            }
            color="text-cyan-600"
          />
          {/* 6. Lease Adjustment Rate */}
          <KPICard
            title="租费招调增长率"
            value={kpiVal(kpis!, 'lease_adjustment_rate')}
            unit="%"
            change={kpiChange(kpis!, 'lease_adjustment_rate')}
            color="text-blue-600"
          />
        </div>
      ) : null}

      {/* KPI Cards - Row 2: Process Control Metrics (7 cards) */}
      {!loading && stats ? (
        <div className="grid grid-cols-3 xl:grid-cols-7 gap-4 mb-6">
          {/* 7. Cumulative Adjustment Rate */}
          <KPICard
            title="累计招调增长率"
            value={kpiVal(kpis!, 'cumulative_adjustment_rate')}
            unit="%"
            change={kpiChange(kpis!, 'cumulative_adjustment_rate')}
            color="text-indigo-600"
          />
          {/* 8. Expiring Vacant Count */}
          <KPICard
            title="到期铺出空"
            value={kpiVal(kpis!, 'expiring_vacant_count')}
            unit="个"
            subtitle={
              kpiVal(kpis!, 'expiring_vacant_ratio') > 0
                ? `占比${kpiVal(kpis!, 'expiring_vacant_ratio').toFixed(1)}%`
                : undefined
            }
            color="text-rose-500"
          />
          {/* 9. Warning Vacant Count */}
          <KPICard
            title="预警铺出空"
            value={kpiVal(kpis!, 'warning_vacant_count')}
            unit="个"
            subtitle={
              kpiVal(kpis!, 'warning_vacant_ratio') > 0
                ? `占比${kpiVal(kpis!, 'warning_vacant_ratio').toFixed(1)}%`
                : undefined
            }
            color="text-amber-600"
          />
          {/* 10. Leasing Completion Rate */}
          <KPICard
            title="招商按时完成率"
            value={kpiVal(kpis!, 'leasing_completion_rate')}
            unit="%"
            change={kpiChange(kpis!, 'leasing_completion_rate')}
            subtitle={
              kpiVal(kpis!, 'leasing_early_completion_rate') > 0
                ? `提前30天${kpiVal(kpis!, 'leasing_early_completion_rate').toFixed(0)}%`
                : undefined
            }
            color="text-purple-600"
          />
          {/* 11. Expiring Completion Rate */}
          <KPICard
            title="到期按时完成率"
            value={kpiVal(kpis!, 'expiring_completion_rate')}
            unit="%"
            change={kpiChange(kpis!, 'expiring_completion_rate')}
            color="text-teal-600"
          />
          {/* 12. Warning Completion Rate */}
          <KPICard
            title="预警按时完成率"
            value={kpiVal(kpis!, 'warning_completion_rate')}
            unit="%"
            change={kpiChange(kpis!, 'warning_completion_rate')}
            color="text-sky-600"
          />
          {/* 13. Lianfa Total Area */}
          <KPICard
            title="联发合作总面积"
            value={(kpiVal(kpis!, 'lianfa_total_area') / 10000).toFixed(1)}
            unit="万m²"
            change={kpiChange(kpis!, 'lianfa_total_area')}
            subtitle={
              kpiVal(kpis!, 'new_lianfa_area') > 0
                ? `新增${(kpiVal(kpis!, 'new_lianfa_area') / 10000).toFixed(1)}万m²`
                : undefined
            }
            color="text-violet-600"
          />
        </div>
      ) : loading ? (
        <div className="grid grid-cols-3 xl:grid-cols-7 gap-4 mb-6">
          {[...Array(7)].map((_, i) => (
            <KPICard key={`r2-${i}`} title="" value="" loading />
          ))}
        </div>
      ) : null}

      {/* Alert Panel - P1 Feature */}
      <AlertPanel alerts={alerts} loading={loading} />

      {/* Charts Row - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <VacancyPieChart
          data={vacancyBuckets}
          loading={loading}
          changePercent={kpiChange(kpis ?? {} as any, 'vacant_area')}
        />
        <LeaseTermBarChart data={leaseTerms} loading={loading} />
        <BrandTierDonut
          data={brandTiers}
          loading={loading}
          totalNewThisMonth={brandTrend?.items.reduce((sum, item) => sum + item.new_count, 0)}
          totalChangePercent={
            brandTrend?.items.length
              ? brandTrend.items.reduce((sum, item) => sum + (item.month_on_month || 0), 0)
                / brandTrend.items.filter(i => i.month_on_month !== null).length || 1
              : undefined
          }
        />
        <SigningStructureChart
          data={signingStructure?.buckets ?? []}
          totalArea={signingStructure?.total_area}
          totalCount={signingStructure?.total_count}
          loading={loading}
        />
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

      {/* Efficiency Table - P1 Feature */}
      <EfficiencyTable data={efficiency} loading={loading} />
    </>
  );
}
