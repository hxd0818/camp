'use client';

import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  change: number | null;
  period?: string;
  color: string; // Tailwind color class like "text-camp-600"
  subtitle?: string; // Additional info like ratio or percentage
  compact?: boolean; // Compact layout for smaller cards
  onClick?: () => void;
  loading?: boolean;
}

export default function KPICard({
  title,
  value,
  unit = '',
  change = null,
  period = '',
  color = 'text-camp-600',
  subtitle,
  compact = false,
  onClick,
  loading = false,
}: KPICardProps) {
  if (loading) {
    return (
      <div className={`bg-white rounded-lg border ${compact ? 'p-2.5' : 'p-4'} animate-pulse`}>
        <div className="h-2 bg-gray-200 rounded w-16 mb-1.5" />
        <div className="h-5 bg-gray-200 rounded w-12 mb-1" />
        <div className="h-2 bg-gray-200 rounded w-20" />
      </div>
    );
  }

  const isPositive = change !== null && change > 0;
  const isNegative = change !== null && change < 0;
  const hasChange = change !== null || period;

  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-lg border ${compact ? 'p-2.5' : 'p-4'} text-left hover:shadow-md transition-shadow w-full ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Title */}
      <p className={`font-medium text-gray-400 uppercase tracking-wider mb-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {title}
      </p>

      {/* Value with unit */}
      <div className="flex items-baseline gap-1">
        <span className={`font-bold ${color} ${compact ? 'text-lg' : 'text-2xl'}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>{unit}</span>}
      </div>

      {/* Subtitle (ratio/percentage) */}
      {subtitle && (
        <p className={`text-gray-500 mt-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {subtitle}
        </p>
      )}

      {/* Change indicator with arrow */}
      {hasChange && (
        <p className={`flex items-center gap-1 mt-1 ${compact ? 'text-[10px]' : 'text-xs'} ${
          isPositive ? 'text-green-600' : isNegative ? 'text-red-500' : 'text-gray-400'
        }`}>
          {change !== null && (
            <>
              <span>{isPositive ? '\u2191' : isNegative ? '\u2193' : '\u2212'}</span>
              <span>{Math.abs(change).toFixed(1)}%</span>
            </>
          )}
          {period && change !== null && <span className="text-gray-300 mx-0.5">|</span>}
          {period && <span>{period}</span>}
        </p>
      )}
    </button>
  );
}
