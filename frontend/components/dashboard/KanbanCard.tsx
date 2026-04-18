'use client';

import React from 'react';

interface KanbanCardProps {
  card: {
    unit_id: number;
    unit_code: string;
    area: number | null;
    floor_name: string;
    layout_type: string;
    tenant_name: string | null;
    brand_tier: string | null;
    vacancy_days: number | null;
    monthly_rent: number | null;
  };
  provided: {
    innerRef: (el: HTMLElement | null) => void;
    draggableProps: Record<string, unknown>;
    style: Record<string, unknown>;
  };
}

const TIER_COLORS: Record<string, string> = {
  s: 'bg-blue-100 text-blue-700',
  a: 'bg-blue-50 text-blue-600',
  b: 'bg-sky-50 text-sky-600',
  c: 'bg-gray-100 text-gray-500',
  lianfa: 'bg-cyan-50 text-cyan-600',
};

export default function KanbanCard({ card, provided }: KanbanCardProps) {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      style={provided.style}
      className="bg-white rounded-lg border p-3 mb-2 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      {/* Unit code and area */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm text-gray-900">{card.unit_code}</span>
        {card.area != null && (
          <span className="text-xs text-gray-400">{card.area} m&sup2;</span>
        )}
      </div>

      {/* Floor and layout */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
          {card.floor_name}
        </span>
        <span className="text-xs text-gray-400">{card.layout_type}</span>
      </div>

      {/* Tenant name or vacancy indicator */}
      {card.tenant_name ? (
        <p className="text-sm font-medium text-gray-700 truncate">{card.tenant_name}</p>
      ) : (
        <p className="text-sm text-gray-300 italic">空置</p>
      )}

      {/* Brand tier badge */}
      {card.brand_tier && card.tenant_name && (
        <span
          className={`inline-block text-[10px] px-1.5 py-0.5 rounded mt-1 ${
            TIER_COLORS[card.brand_tier] || 'bg-gray-100 text-gray-500'
          }`}
        >
          {card.brand_tier.toUpperCase()}
        </span>
      )}

      {/* Vacancy days warning */}
      {card.vacancy_days != null && card.vacancy_days > 0 && (
        <p className="text-xs text-orange-500 mt-1">空置 {card.vacancy_days} 天</p>
      )}
    </div>
  );
}
