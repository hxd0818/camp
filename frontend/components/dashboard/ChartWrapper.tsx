'use client';

import React from 'react';

interface ChartWrapperProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
  className?: string;
}

export default function ChartWrapper({
  title,
  children,
  loading = false,
  empty = false,
  emptyText = '\u6682\u65e0\u6570\u636e',
  className = '',
}: ChartWrapperProps) {
  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-4 h-72 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border p-4 h-72 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      {empty ? (
        <div className="flex items-center justify-center h-52 text-gray-300 text-sm">
          {emptyText}
        </div>
      ) : (
        <div className="h-52">{children}</div>
      )}
    </div>
  );
}
