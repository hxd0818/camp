'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import KanbanColumn from './KanbanColumn';
import { dashboardApi } from '@/lib/dashboard-api';
import type { KanbanData } from '@/lib/types';

interface Props {
  mallId: number;
}

export default function KanbanBoard({ mallId }: Props) {
  const [data, setData] = useState<KanbanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getKanban(mallId);
      setData(res as unknown as KanbanData);
    } catch (err: any) {
      setError(err?.message || String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [mallId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;

    if (!destination || destination.droppableId === source.droppableId) {
      return;
    }

    try {
      await dashboardApi.moveUnit(
        parseInt(result.draggableId),
        destination.droppableId
      );
      await fetchData();
    } catch {
      // Error handled silently
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center text-red-400 py-12 text-sm">看板加载失败: {error}</p>
    );
  }

  if (!data?.columns?.length) {
    return (
      <p className="text-center text-gray-400 py-12 text-sm">无法加载看板数据</p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-800">招商状态看板</h3>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {data.columns.map((col) => (
            <KanbanColumn key={col.id} column={col} />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
