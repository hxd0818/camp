'use client';

import React, { useState } from 'react';
import type { AlertsResponse, AlertItem } from '@/lib/types';

interface AlertPanelProps {
  alerts: AlertsResponse | null;
  loading?: boolean;
}

/** Severity config: label, bg color, border color, text color, dot color */
const SEVERITY_CONFIG = {
  critical: {
    label: '紧急',
    bg: 'bg-red-50',
    border: 'border-l-red-500',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  warning: {
    label: '预警',
    bg: 'bg-amber-50',
    border: 'border-l-amber-500',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  info: {
    label: '提示',
    bg: 'bg-blue-50',
    border: 'border-l-blue-500',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
} as const;

function AlertTypeIcon(type: string): string {
  switch (type) {
    case 'overdue_plan': return 'P';
    case 'due_soon_plan': return 'C';
    case 'long_vacant': return 'U';
    case 'expiring_contract': return '$';
    default: return '?';
  }
}

function formatDays(value: number | null, unit: string): string {
  if (value === null) return '-';
  if (value > 0) return `超期 ${value} ${unit}`;
  if (value < 0) return `剩余 ${Math.abs(value)} ${unit}`;
  return '-';
}

export default function AlertPanel({ alerts, loading }: AlertPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!alerts || alerts.items.length === 0) {
    return null;
  }

  const hasCritical = alerts.critical_count > 0;

  // Group items by severity
  const grouped = {
    critical: alerts.items.filter((i) => i.severity === 'critical'),
    warning: alerts.items.filter((i) => i.severity === 'warning'),
    info: alerts.items.filter((i) => i.severity === 'info'),
  };

  // Auto-expand when there are critical alerts
  const isExpanded = hasCritical ? expanded : false;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">预警中心</span>
          {hasCritical && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              {alerts.total_count} 条待处理
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Summary badges */}
          {alerts.critical_count > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {alerts.critical_count} 紧急
            </span>
          )}
          {alerts.warning_count > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {alerts.warning_count} 预警
            </span>
          )}
          {alerts.info_count > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-blue-600">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {alerts.info_count} 提示
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {(['critical', 'warning', 'info'] as const).map((sev) => {
            const items = grouped[sev];
            if (items.length === 0) return null;
            const cfg = SEVERITY_CONFIG[sev];

            return (
              <div key={sev}>
                <div className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider ${cfg.text} bg-gray-50`}>
                  {cfg.label} ({items.length})
                </div>
                {items.map((item, idx) => (
                  <div
                    key={`${item.alert_type}-${item.entity_id}-${idx}`}
                    className={`flex items-start gap-3 px-4 py-2.5 ${cfg.bg} border-l-4 ${cfg.border}`}
                  >
                    {/* Type icon */}
                    <span className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white ${cfg.dot}`}>
                      {AlertTypeIcon(item.alert_type)}
                    </span>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${cfg.text} truncate`}>
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</div>
                    </div>
                    {/* Metric */}
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-sm font-semibold ${cfg.text}`}>
                        {formatDays(item.days_overdue, item.unit)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
