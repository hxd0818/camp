'use client';

import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  change: number | null;
  period?: string;
  color: string; // Tailwind color class like "text-camp-600"
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
  onClick,
  loading = false,
}: KPICardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-4 animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
        <div className="h-7 bg-gray-200 rounded w-16 mb-1" />
        <div className="h-3 bg-gray-200 rounded w-24" />
      </div>
    );
  }

  const isPositive = change !== null && change > 0;
  const isNegative = change !== null && change < 0;

  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-lg border p-4 text-left hover:shadow-md transition-shadow w-full ${onClick ? 'cursor-pointer' : ''}`}
    >
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
        {unit && <span className="text-sm text-gray-400 ml-1">{unit}</span>}
      </div>
      {(change !== null || period) && (
        <p className={`text-xs mt-1.5 flex items-center gap-1 ${
          isPositive ? 'text-green-600' : isNegative ? 'text-red-500' : 'text-gray-400'
        }`}>
          {change !== null && (
            <>
              <span>{isPositive ? '\u2191' : isNegative ? '\u2193' : ''}</span>
              <span>{Math.abs(change).toFixed(1)}%</span>
            </>
          )}
          {period && <span className="text-gray-300 mx-1">|</span>}
          {period && <span>{period}</span>}
        </p>
      )}
    </button>
  );
}
