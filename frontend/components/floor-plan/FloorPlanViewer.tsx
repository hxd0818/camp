'use client';

/**
 * FloorPlanViewer - Core component for CAMP's floor plan visualization.
 *
 * View mode: zoom/pan, click hotspot to see detail panel.
 * Edit mode: drag to move units, drag corners/edges to resize, save changes.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { HotspotItem } from '@/lib/types';
import { UnitDetailPanel } from './UnitDetailPanel';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8201';

interface FloorPlanViewerProps {
  planId: number;
  mallId?: number;
  floorId?: number;
  height?: string;
  editable?: boolean;
}

export function FloorPlanViewer({ planId, mallId, floorId, height = '70vh', editable = false }: FloorPlanViewerProps) {
  const [renderData, setRenderData] = useState<{
    image_url: string;
    hotspots: HotspotItem[];
    image_width?: number;
    image_height?: number;
  } | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<HotspotItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Zoom & pan
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hotspotsDirty, setHotspotsDirty] = useState(false);

  // Add unit mode (drawing new unit on canvas)
  const [addingUnit, setAddingUnit] = useState(false);
  const [newUnit, setNewUnit] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [newUnitDragging, setNewUnitDragging] = useState(false);
  const newUnitDragStart = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 });

  // Fetch render data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getFloorPlanRenderData(planId);
        setRenderData({
          image_url: data.image_url,
          hotspots: data.hotspots || [],
          image_width: data.image_width,
          image_height: data.image_height,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }
    if (planId) loadData();
  }, [planId]);

  // Auto-fit on load
  useEffect(() => {
    if (!containerRef.current || !renderData) return;
    const c = containerRef.current;
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    const iw = renderData.image_width || 1200;
    const ih = renderData.image_height || 820;
    const fit = Math.min(cw / iw, ch / ih) * 0.95;
    setScale(fit);
    setPan({ x: (cw - iw * fit) / 2, y: (ch - ih * fit) / 2 });
  }, [renderData]);

  // --- Zoom ---
  const handleZoomIn = useCallback(() => setScale(s => Math.min(s * 1.3, 5)), []);
  const handleZoomOut = useCallback(() => setScale(s => Math.max(s / 1.3, 0.2)), []);
  const handleZoomReset = useCallback(() => {
    if (!containerRef.current || !renderData) return;
    const c = containerRef.current;
    const iw = renderData.image_width || 1200;
    const ih = renderData.image_height || 820;
    const fit = Math.min(c.clientWidth / iw, c.clientHeight / ih) * 0.95;
    setScale(fit);
    setPan({ x: (c.clientWidth - iw * fit) / 2, y: (c.clientHeight - ih * fit) / 2 });
  }, [renderData]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.max(0.2, Math.min(5, s * (e.deltaY > 0 ? 0.9 : 1.1))));
  }, []);

  // --- Pan (canvas) ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.hotspot-edit')) return; // let hotspot handle its own drag
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: panStart.current.x + (e.clientX - dragStart.current.x),
      y: panStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // --- Hotspot click (view mode only) ---
  const handleHotspotClick = useCallback((hotspot: HotspotItem) => {
    if (editMode || isDragging) return;
    setSelectedUnit(hotspot);
  }, [editMode, isDragging]);

  // --- Edit mode handlers ---
  const toggleEditMode = useCallback(() => {
    if (editMode && hotspotsDirty) {
      // Discard changes - reload data
      setHotspotsDirty(false);
      apiClient.getFloorPlanRenderData(planId).then(data => {
        setRenderData(prev => prev ? {
          ...data,
          hotspots: data.hotspots || [],
          image_width: data.image_width || prev.image_width,
          image_height: data.image_height || prev.image_height,
        } : null);
      });
    }
    setEditMode(e => !e);
    setSelectedUnit(null);
  }, [editMode, hotspotsDirty, planId]);

  const handleHotspotUpdate = useCallback((unitId: number, newX: number, newY: number, newW: number, newH: number) => {
    setRenderData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        hotspots: prev.hotspots.map(hs =>
          hs.unit_id === unitId ? { ...hs, x: newX, y: newY, w: newW, h: newH } : hs
        ),
      };
    });
    setHotspotsDirty(true);
  }, []);

  const handleSaveEdits = useCallback(async () => {
    if (!renderData) return;
    setSaving(true);
    try {
      for (const hs of renderData.hotspots) {
        await apiClient.updateUnitHotspot(hs.unit_id, {
          x: hs.x,
          y: hs.y,
          width: hs.w,
          height: hs.h,
        });
      }
      setHotspotsDirty(false);
      setEditMode(false);
    } catch (err) {
      alert('保存失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setSaving(false);
    }
  }, [renderData]);

  // --- Add unit handlers ---
  const startAddingUnit = useCallback(() => {
    setAddingUnit(true);
    setNewUnit(null);
    setNewUnitDragging(false);
  }, []);

  const cancelAddingUnit = useCallback(() => {
    setAddingUnit(false);
    setNewUnit(null);
    setNewUnitDragging(false);
  }, []);

  const confirmAddUnit = useCallback(async () => {
    if (!newUnit || !floorId || !renderData) return;
    try {
      // Step 1: Create the Unit record
      const unit = await apiClient.createUnit({
        floor_id: floorId,
        code: `NEW-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        name: '新铺位',
        status: 'vacant',
        layout_type: 'retail',
        gross_area: Math.round((newUnit.w * newUnit.h) / 100),
        hotspot_data: { x: newUnit.x, y: newUnit.y, width: newUnit.w, height: newUnit.h, shape: 'rect' },
      });

      // Step 2: Add hotspot entry to the active floor plan's hotspots array
      const newHotspot = {
        unit_id: unit.id,
        unit_code: unit.code || `NEW`,
        x: Math.round(newUnit.x),
        y: Math.round(newUnit.y),
        w: Math.round(newUnit.w),
        h: Math.round(newUnit.h),
        shape: 'rect',
      };
      const updatedHotspots = [...renderData.hotspots, newHotspot];
      await apiClient.updateHotspots(planId, updatedHotspots);

      // Step 3: Refresh render data to get enriched hotspot (with color etc.)
      const data = await apiClient.getFloorPlanRenderData(planId);
      setRenderData(prev => prev ? {
        ...data,
        hotspots: data.hotspots || [],
        image_width: data.image_width || prev.image_width,
        image_height: data.image_height || prev.image_height,
      } : null);

      setAddingUnit(false);
      setNewUnit(null);
    } catch (err) {
      alert('创建铺位失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  }, [newUnit, floorId, planId, renderData]);

  // Canvas click handler for adding unit (intercepts before pan)
  const handleCanvasClickForAdd = useCallback((e: React.MouseEvent) => {
    if (!addingUnit || !containerRef.current || !renderData) return;
    // Only respond to left click on canvas background (not on hotspots)
    if ((e.target as HTMLElement).closest('.hotspot-edit') ||
        (e.target as HTMLElement).closest('img')) return;

    const rect = containerRef.current.getBoundingClientRect();
    // Convert screen coords to image-space coords
    const imgX = (e.clientX - rect.left - pan.x) / scale;
    const imgY = (e.clientY - rect.top - pan.y) / scale;

    setNewUnit({ x: Math.round(imgX), y: Math.round(imgY), w: 120, h: 80 });
    setNewUnitDragging(true);
    newUnitDragStart.current = { mx: e.clientX, my: e.clientY, x: Math.round(imgX), y: Math.round(imgY), w: 120, h: 80 };
  }, [addingUnit, pan, scale, renderData]);

  // Override mouse down for add mode
  const handleMouseDownWrapper = useCallback((e: React.MouseEvent) => {
    if (addingUnit && !newUnit) {
      handleCanvasClickForAdd(e);
      return;
    }
    if ((e.target as HTMLElement).closest('.hotspot-edit')) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  }, [addingUnit, newUnit, handleCanvasClickForAdd, pan]);

  // Override mouse move for new unit dragging
  useEffect(() => {
    if (!newUnitDragging || !newUnit) return;
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX - newUnitDragStart.current.mx);
      const dy = (e.clientY - newUnitDragStart.current.my);
      const orig = newUnitDragStart.current;
      const nw = Math.max(30, orig.w + dx);
      const nh = Math.max(20, orig.h + dy);
      setNewUnit({ x: orig.x, y: orig.y, w: nw, h: nh });
    };
    const onUp = () => setNewUnitDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [newUnitDragging, newUnit]);

  const handleClosePanel = useCallback(() => setSelectedUnit(null), []);
  const getStatusColor = (h: HotspotItem): string => h.status_color || '#94a3b8';

  if (loading) {
    return <div className="flex items-center justify-center" style={{ height }}><div className="text-gray-500">加载图纸中...</div></div>;
  }
  if (error || !renderData) {
    return <div className="flex items-center justify-center bg-red-50 rounded-lg" style={{ height }}><div className="text-red-600">{error || '暂无图纸数据'}</div></div>;
  }

  const imgW = renderData.image_width || 1200;
  const imgH = renderData.image_height || 820;

  return (
    <div className="relative flex gap-4" style={{ height }}>
      {/* Canvas */}
      <div
        ref={containerRef}
        className="floor-plan-container flex-1 border rounded-lg overflow-hidden bg-gray-100 relative"
        style={{ cursor: (addingUnit && !newUnit) ? 'crosshair' : isDragging ? 'grabbing' : editMode ? 'default' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDownWrapper}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Toolbar */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border text-gray-600 hover:bg-gray-50 text-sm font-bold" title="放大">+</button>
          <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border text-gray-600 hover:bg-gray-50 text-sm font-bold" title="缩小">-</button>
          <button onClick={handleZoomReset} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border text-gray-600 hover:bg-gray-50 text-xs" title="适应窗口">Fit</button>
          <div className="text-center text-[10px] text-gray-400 mt-1">{Math.round(scale * 100)}%</div>

          {editable && (
            <div className="mt-2 border-t pt-1">
              <button
                onClick={toggleEditMode}
                className={`w-8 h-8 flex items-center justify-center rounded-md shadow-sm border text-xs font-medium ${editMode && !addingUnit ? 'bg-camp-600 text-white border-camp-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title={editMode && !addingUnit ? '退出编辑' : '编辑铺位'}
              >
                {editMode && !addingUnit ? '✕' : '✎'}
              </button>
              {editMode && (
                <button
                  onClick={addingUnit ? cancelAddingUnit : startAddingUnit}
                  className={`w-8 h-8 flex items-center justify-center rounded-md shadow-sm border text-xs font-bold mt-1 ${addingUnit ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' : 'bg-green-500 text-white border-green-500 hover:bg-green-600'}`}
                  title={addingUnit ? '取消新增' : '新增铺位'}
                >
                  {addingUnit ? '✕' : '+'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Edit mode action bar */}
        {editMode && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            <button
              onClick={toggleEditMode}
              disabled={!hotspotsDirty}
              className="px-3 py-1.5 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              取消
            </button>
            <button
              onClick={handleSaveEdits}
              disabled={!hotspotsDirty || saving}
              className="px-4 py-1.5 text-sm font-medium rounded-md bg-camp-600 text-white hover:bg-camp-700 disabled:opacity-50 flex items-center gap-1"
            >
              {saving ? '保存中...' : '保存修改'}
            </button>
          </div>
        )}

        {/* Transformed content */}
        <div className="absolute origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, width: imgW, height: imgH }}>
          <img src={`${API_BASE}${renderData.image_url}`} alt="楼层平面图" className="block pointer-events-none" draggable={false} style={{ width: imgW, height: imgH }} />

          {renderData.hotspots.map((hs, i) => (
            <HotspotOverlay
              key={`hs-${hs.unit_id}-${i}`}
              hotspot={hs}
              color={getStatusColor(hs)}
              editMode={editMode}
              onClick={() => handleHotspotClick(hs)}
              onUpdate={(x, y, w, h) => handleHotspotUpdate(hs.unit_id, x, y, w, h)}
            />
          ))}

          {/* New unit preview (while adding) */}
          {addingUnit && newUnit && (
            <div
              className="absolute"
              style={{
                left: newUnit.x, top: newUnit.y,
                width: newUnit.w, height: newUnit.h,
                backgroundColor: '#fbbf2480',
                border: '2px dashed #f59e0b0',
                cursor: newUnitDragging ? 'crosshair' : 'move',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setNewUnitDragging(true);
                newUnitDragStart.current = { mx: e.clientX, my: e.clientY, x: newUnit.x, y: newUnit.y, w: newUnit.w, h: newUnit.h };
              }}
            >
              <span className="text-[12px] font-bold text-amber-700 select-none pointer-events-none">
                + 新铺位 ({newUnit.w}x{newUnit.h})
              </span>
            </div>
          )}

          {/* Confirm bar for new unit */}
          {addingUnit && newUnit && !newUnitDragging && (
            <div
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-white rounded-lg shadow-lg border px-4 py-2"
            >
              <span className="text-sm text-gray-600">新铺位 {Math.round(newUnit.w)}x{Math.round(newUnit.h)} - 点击确认创建</span>
              <button
                onClick={confirmAddUnit}
                className="px-3 py-1 text-sm font-medium rounded-md bg-camp-600 text-white hover:bg-camp-700"
              >
                确认创建
              </button>
              <button
                onClick={cancelAddingUnit}
                className="px-3 py-1 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          )}
      </div>

      {/* Detail Panel */}
      {selectedUnit && !editMode && (
        <UnitDetailPanel unit={selectedUnit} onClose={handleClosePanel} mallId={mallId} />
      )}
      </div>
    </div>
  );
}

// ──── Hotspot Overlay (view + edit) ────

interface HotspotOverlayProps {
  hotspot: HotspotItem;
  color: string;
  editMode: boolean;
  onClick: () => void;
  onUpdate: (x: number, y: number, w: number, h: number) => void;
}

function HotspotOverlay({ hotspot, color, editMode, onClick, onUpdate }: HotspotOverlayProps) {
  const { x, y, w, h, unit_code, unit_name } = hotspot;
  const [dragging, setDragging] = useState<'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'resize-n' | 'resize-s' | 'resize-w' | 'resize-e' | null>(null);
  const dragStartPos = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 });

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  // Start drag
  const startDrag = useCallback((mode: typeof dragging, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(mode);
    dragStartPos.current = { mx: e.clientX, my: e.clientY, x, y, w, h };
  }, [x, y, w, h]);

  // Mouse move during drag
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStartPos.current.mx) / (window as any).__campScale || (e.clientX - dragStartPos.current.mx);
      const dy = (e.clientY - dragStartPos.current.my) / (window as any).__campScale || (e.clientY - dragStartPos.current.my);
      const orig = dragStartPos.current;

      switch (dragging) {
        case 'move':
          onUpdate(orig.x + dx, orig.y + dy, orig.w, orig.h);
          break;
        case 'resize-se':
          onUpdate(orig.x, orig.y, Math.max(30, orig.w + dx), Math.max(20, orig.h + dy));
          break;
        case 'resize-sw':
          onUpdate(orig.x + dx, orig.y, Math.max(30, orig.w - dx), Math.max(20, orig.h + dy));
          break;
        case 'resize-ne':
          onUpdate(orig.x, orig.y, Math.max(30, orig.w + dx), Math.max(20, orig.h - dy));
          break;
        case 'resize-nw':
          onUpdate(orig.x + dx, orig.y + dy, Math.max(30, orig.w - dx), Math.max(20, orig.h - dy));
          break;
        case 'resize-n':
          onUpdate(orig.x, orig.y + dy, orig.w, Math.max(20, orig.h - dy));
          break;
        case 'resize-s':
          onUpdate(orig.x, orig.y, orig.w, Math.max(20, orig.h + dy));
          break;
        case 'resize-w':
          onUpdate(orig.x + dx, orig.y, Math.max(30, orig.w - dx), orig.h);
          break;
        case 'resize-e':
          onUpdate(orig.x, orig.y, Math.max(30, orig.w + dx), orig.h);
          break;
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, onUpdate]);

  // In edit mode: show handles and allow drag
  if (editMode) {
    return (
      <div
        className="hotspot-edit absolute group"
        style={{
          left: x, top: y, width: w, height: h,
          backgroundColor: `${color}22`,
          border: `2px dashed ${color}`,
          cursor: dragging ? 'grabbing' : 'move',
        }}
        onMouseDown={(e) => startDrag('move', e)}
      >
        {/* Resize handles */}
        <ResizeHandle cx={0} cy={0} cursor="nw-resize" onStart={(e) => startDrag('resize-nw', e)} />
        <ResizeHandle cx={0.5} cy={0} cursor="n-resize" onStart={(e) => startDrag('resize-n', e)} />
        <ResizeHandle cx={1} cy={0} cursor="ne-resize" onStart={(e) => startDrag('resize-ne', e)} />
        <ResizeHandle cx={1} cy={0.5} cursor="e-resize" onStart={(e) => startDrag('resize-e', e)} />
        <ResizeHandle cx={1} cy={1} cursor="se-resize" onStart={(e) => startDrag('resize-se', e)} />
        <ResizeHandle cx={0.5} cy={1} cursor="s-resize" onStart={(e) => startDrag('resize-s', e)} />
        <ResizeHandle cx={0} cy={1} cursor="sw-resize" onStart={(e) => startDrag('resize-sw', e)} />
        <ResizeHandle cx={0} cy={0.5} cursor="w-resize" onStart={(e) => startDrag('resize-w', e)} />

        {/* Label */}
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium select-none pointer-events-none text-gray-700">
          {unit_name || unit_code}
        </span>
      </div>
    );
  }

  // View mode: clickable overlay with label (base image has no unit info)
  const label = unit_name && unit_name !== unit_code ? unit_name : unit_code;
  return (
    <div
      className="absolute group hover:brightness-95 transition-all duration-150"
      style={{
        left: x, top: y, width: w, height: h,
        backgroundColor: `${color}30`,
        border: `2px solid ${color}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={handleClick}
      title={`${unit_name || unit_code}${hotspot.tenant_name ? ` - ${hotspot.tenant_name}` : ''}`}
    >
      <span className="text-[11px] font-medium select-none pointer-events-none text-center leading-tight px-1"
            style={{ color: '#1e293b', maxWidth: w - 8 }}>
        {label}
        {unit_name && unit_name !== unit_code && (
          <span className="block text-[9px] text-gray-500 mt-0.5">{unit_code}</span>
        )}
      </span>
    </div>
  );
}

// ──── Resize Handle ────

function ResizeHandle({ cx, cy, cursor, onStart }: { cx: number; cy: number; cursor: string; onStart: (e: React.MouseEvent) => void }) {
  return (
    <div
      className="absolute w-3 h-3 bg-white border border-camp-600 rounded-full z-10 hover:scale-125 transition-transform"
      style={{ left: `calc(${cx * 100}% - 6px)`, top: `calc(${cy * 100}% - 6px)`, cursor }}
      onMouseDown={onStart}
    />
  );
}

export default FloorPlanViewer;
