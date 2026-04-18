'use client';

import React from 'react';
import { useDroppable } from '@hello-pangea/dnd';
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

const COLUMN_COLORS: Record<string, string> = {
  vacant: 'border-t-red-400 bg-red-50/30',
  reserved: 'border-t-purple-400 bg-purple-50/30',
  occupied: 'border-t-green-400 bg-green-50/30',
  maintenance: 'border-t-gray-400 bg-gray-50/30',
  blocked: 'border-t-red-300 bg-red-50/20',
};

export default function KanbanColumn({ column }: KanbanColumnProps) {
  const { isOver, setRef, ...droppableProps } = useDroppable({
    droppableId: column.id,
  });

  return (
    <div
      className={`flex-1 min-w-[220px] bg-white rounded-lg border ${
        COLUMN_COLORS[column.id] || 'border-t-gray-300'
      } flex flex-col`}
    >
      {/* Column header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">{column.title}</h3>
          <span className="text-xs bg-white/80 px-2 py-0.5 rounded-full text-gray-500">
            {column.unit_count}
          </span>
        </div>
        {column.total_area > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            {column.total_area.toLocaleString()} m&sup2;
          </p>
        )}
      </div>

      {/* Droppable card area */}
      <div
        ref={setRef}
        {...droppableProps}
        className="flex-1 p-2 overflow-y-auto min-h-[120px]"
      >
        {/* Drop target overlay when dragging over */}
        {isOver && (
          <div className="h-full w-full border-2 border-dashed border-camp-300 rounded-lg flex items-center justify-center text-camp-400 text-sm mb-2">
            拖放至此
          </div>
        )}

        {/* Cards */}
        {column.cards.map((card) => (
          <KanbanCard key={card.unit_id} card={card} />
        ))}

        {/* Empty state */}
        {column.cards.length === 0 && !isOver && (
          <p className="text-center text-gray-300 text-xs py-8">暂无铺位</p>
        )}
      </div>
    </div>
  );
}
