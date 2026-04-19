'use client';

import React, { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    unit_count: number;
    total_area: number;
    cards: Array<{
      unit_id: number;
      unit_code: string;
      area: number | null;
      floor_name: string;
      layout_type: string;
      tenant_name: string | null;
      brand_tier: string | null;
      vacancy_days: number | null;
      monthly_rent: number | null;
    }>;
  };
}

const COLUMN_COLORS: Record<string, { border: string; bg: string; badge: string }> = {
  vacant: { border: 'border-t-red-400', bg: 'bg-red-50/30', badge: 'bg-red-100 text-red-600' },
  reserved: { border: 'border-t-purple-400', bg: 'bg-purple-50/30', badge: 'bg-purple-100 text-purple-600' },
  occupied: { border: 'border-t-green-400', bg: 'bg-green-50/30', badge: 'bg-green-100 text-green-600' },
  maintenance: { border: 'border-t-gray-400', bg: 'bg-gray-50/30', badge: 'bg-gray-100 text-gray-600' },
  blocked: { border: 'border-t-red-300', bg: 'bg-red-50/20', badge: 'bg-red-50 text-red-500' },
};

export default function KanbanColumn({ column }: KanbanColumnProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = COLUMN_COLORS[column.id] || COLUMN_COLORS.maintenance;

  // Summary stats from cards
  const occupiedCount = column.cards.filter((c) => c.tenant_name).length;
  const vacantCount = column.unit_count - occupiedCount;
  const avgVacancyDays = column.cards
    .filter((c) => c.vacancy_days != null && c.vacancy_days > 0)
    .reduce((sum, c, _, arr) => sum + (c.vacancy_days || 0) / arr.length, 0);

  return (
    <div
      className={`flex-1 min-w-[200px] bg-white rounded-lg border ${colors.border} flex flex-col`}
    >
      {/* Clickable header - always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left hover:bg-black/[0.02] transition-colors"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">{column.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
            {column.unit_count}
          </span>
        </div>

        {/* Summary info when collapsed */}
        {!expanded && (
          <div className="mt-2 space-y-1">
            {/* Area */}
            {column.total_area > 0 && (
              <p className="text-xs text-gray-400">{column.total_area.toLocaleString()} m&sup2;</p>
            )}
            {/* Quick breakdown */}
            <div className="flex gap-2 text-xs">
              {vacantCount > 0 && (
                <span className="text-orange-500">空{vacantCount}</span>
              )}
              {occupiedCount > 0 && (
                <span className="text-green-600">租{occupiedCount}</span>
              )}
              {avgVacancyDays > 0 && (
                <span className="text-gray-400">均{Math.round(avgVacancyDays)}天</span>
              )}
            </div>
            {/* Expand hint */}
            <p className="text-[10px] text-gray-300 pt-1">点击展开详情</p>
          </div>
        )}

        {/* Arrow indicator */}
        <svg
          className={`w-3.5 h-3.5 text-gray-300 mt-1 transition-transform ml-auto block ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded card list */}
      {expanded && (
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex-1 p-2 overflow-y-auto min-h-[120px] border-t"
            >
              {snapshot.isDraggingOver && (
                <div className="h-full w-full border-2 border-dashed border-camp-300 rounded-lg flex items-center justify-center text-camp-400 text-sm mb-2">
                  拖放至此
                </div>
              )}

              {column.cards.map((card, index) => (
                <Draggable key={card.unit_id} draggableId={String(card.unit_id)} index={index}>
                  {(dragProvided) => (
                    <KanbanCard card={card} provided={dragProvided} />
                  )}
                </Draggable>
              ))}

              {provided.placeholder}

              {column.cards.length === 0 && !snapshot.isDraggingOver && (
                <p className="text-center text-gray-300 text-xs py-8">暂无铺位</p>
              )}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
}
