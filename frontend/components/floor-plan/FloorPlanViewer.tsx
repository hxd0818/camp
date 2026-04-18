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

  // Add unit mode (drawing polygon on canvas by clicking vertices)
  const [addingUnit, setAddingUnit] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

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

  const handleHotspotUpdate = useCallback((unitId: number, newX: number, newY: number, newW: number, newH: number, newPoints?: number[][]) => {
    setRenderData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        hotspots: prev.hotspots.map(hs =>
          hs.unit_id === unitId
            ? { ...hs, x: newX, y: newY, w: newW, h: newH, ...(newPoints ? { points: newPoints } : {}) }
            : hs
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
        const hotspotData: Record<string, unknown> = {
          x: hs.x,
          y: hs.y,
          width: hs.w,
          height: hs.h,
          shape: hs.shape || 'rect',
        };
        if (hs.points && (hs.shape === 'polygon')) {
          hotspotData.points = hs.points;
        }
        await apiClient.updateUnitHotspot(hs.unit_id, hotspotData);
      }
      // Also update floor plan hotspots to persist shape/points
      const plainHotspots = renderData.hotspots.map(hs => ({
        unit_id: hs.unit_id,
        unit_code: hs.unit_code,
        x: hs.x,
        y: hs.y,
        w: hs.w,
        h: hs.h,
        shape: hs.shape || 'rect',
        ...(hs.points ? { points: hs.points } : {}),
      }));
      await apiClient.updateHotspots(planId, plainHotspots);

      setHotspotsDirty(false);
      setEditMode(false);
    } catch (err) {
      alert('保存失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setSaving(false);
    }
  }, [renderData, planId]);

  // --- Add unit handlers (polygon vertex drawing) ---
  const startAddingUnit = useCallback(() => {
    setAddingUnit(true);
    setPolygonPoints([]);
    setMousePos(null);
  }, []);

  const cancelAddingUnit = useCallback(() => {
    setAddingUnit(false);
    setPolygonPoints([]);
    setMousePos(null);
  }, []);

  /** Compute bounding box from polygon points */
  const getBoundsFromPoints = useCallback((pts: {x:number; y:number}[]) => {
    if (pts.length === 0) return { x: 0, y: 0, w: 100, h: 80 };
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return { x: Math.round(minX), y: Math.round(minY), w: Math.round(maxX - minX), h: Math.round(maxY - minY) };
  }, []);

  /** Compute area of a polygon using Shoelace formula */
  const computePolygonArea = useCallback((pts: {x:number; y:number}[]) => {
    if (pts.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
    }
    return Math.abs(area / 2) / 100; // rough px^2 to m^2 conversion
  }, []);

  const confirmAddUnit = useCallback(async () => {
    if (polygonPoints.length < 3 || !floorId || !renderData) return;
    try {
      const bounds = getBoundsFromPoints(polygonPoints);
      const ptsArray = polygonPoints.map(p => [Math.round(p.x), Math.round(p.y)]);

      // Step 1: Create the Unit record
      const unit = await apiClient.createUnit({
        floor_id: floorId,
        code: `NEW-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        name: '新铺位',
        status: 'vacant',
        layout_type: 'retail',
        gross_area: Math.round(computePolygonArea(polygonPoints)),
        hotspot_data: { x: bounds.x, y: bounds.y, width: bounds.w, height: bounds.h, shape: 'polygon', points: ptsArray },
      });

      // Step 2: Add hotspot entry to floor plan's hotspots array
      const newHotspot = {
        unit_id: unit.id,
        unit_code: unit.code || 'NEW',
        x: bounds.x,
        y: bounds.y,
        w: bounds.w,
        h: bounds.h,
        shape: 'polygon' as const,
        points: ptsArray,
      };
      const updatedHotspots = [...renderData.hotspots, newHotspot];
      await apiClient.updateHotspots(planId, updatedHotspots);

      // Step 3: Refresh
      const data = await apiClient.getFloorPlanRenderData(planId);
      setRenderData(prev => prev ? {
        ...data,
        hotspots: data.hotspots || [],
        image_width: data.image_width || prev.image_width,
        image_height: data.image_height || prev.image_height,
      } : null);

      setAddingUnit(false);
      setPolygonPoints([]);
      setMousePos(null);
    } catch (err) {
      alert('创建铺位失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  }, [polygonPoints, floorId, planId, renderData, getBoundsFromPoints, computePolygonArea]);

  /** Remove last point (undo last vertex) */
  const undoLastPoint = useCallback(() => {
    setPolygonPoints(prev => prev.slice(0, -1));
  }, []);

  // Canvas click handler: add vertex point in polygon drawing mode
  const handleCanvasClickForAdd = useCallback((e: React.MouseEvent) => {
    if (!addingUnit || !containerRef.current) return;
    // Only respond to left click on canvas background
    if ((e.target as HTMLElement).closest('.hotspot-edit') ||
        (e.target as HTMLElement).closest('img') ||
        (e.target as HTMLElement).closest('.polygon-preview') ||
        (e.target as HTMLElement).closest('.polygon-toolbar')) return;

    const rect = containerRef.current.getBoundingClientRect();
    const imgX = (e.clientX - rect.left - pan.x) / scale;
    const imgY = (e.clientY - rect.top - pan.y) / scale;

    setPolygonPoints(prev => [...prev, { x: Math.round(imgX), y: Math.round(imgY) }]);
  }, [addingUnit, pan, scale]);

  // Track mouse position for rubber-band line during polygon drawing
  const handleMouseMoveForPoly = useCallback((e: React.MouseEvent) => {
    if (!addingUnit || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const imgX = (e.clientX - rect.left - pan.x) / scale;
    const imgY = (e.clientY - rect.top - pan.y) / scale;
    setMousePos({ x: imgX, y: imgY });
  }, [addingUnit, pan, scale]);

  // Override mouse down for add mode (add vertex instead of starting pan)
  const handleMouseDownWrapper = useCallback((e: React.MouseEvent) => {
    // Don't start pan if clicking on UI controls (toolbar, hotspots, etc.)
    const target = e.target as HTMLElement;
    if (target.closest('.hotspot-edit') ||
        target.closest('button') ||
        target.closest('.polygon-toolbar')) return;

    if (addingUnit) {
      // In polygon mode, click adds a vertex (handled by onClick)
      return;
    }
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  }, [addingUnit, pan]);

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
        style={{ cursor: addingUnit ? 'crosshair' : isDragging ? 'grabbing' : editMode ? 'default' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDownWrapper}
        onClick={addingUnit ? handleCanvasClickForAdd : undefined}
        onMouseMove={addingUnit ? handleMouseMoveForPoly : handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => { if (addingUnit) { e.preventDefault(); undoLastPoint(); } }}
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

          {/* Polygon drawing preview */}
          {addingUnit && polygonPoints.length > 0 && (
            <svg className="polygon-preview absolute inset-0 pointer-events-none" style={{ width: imgW, height: imgH, overflow: 'visible' }}>
              {/* Completed edges */}
              <polygon
                points={polygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="#fbbf2440"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="6,4"
              />
              {/* Vertex dots */}
              {polygonPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
              ))}
              {/* Rubber-band line to mouse cursor */}
              {mousePos && polygonPoints.length > 0 ? (() => {
                const last = polygonPoints[polygonPoints.length - 1];
                return <line x1={last.x} y1={last.y} x2={mousePos.x} y2={mousePos.y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,4" />;
              })() : null}
              {/* Closing line hint when near first vertex */}
              {(() => {
                if (!mousePos || polygonPoints.length < 3) return null;
                const first = polygonPoints[0];
                const dist = Math.sqrt((mousePos.x - first.x) ** 2 + (mousePos.y - first.y) ** 2);
                if (dist < 20) {
                  const last = polygonPoints[polygonPoints.length - 1];
                  return <line x1={last.x} y1={last.y} x2={first.x} y2={first.y} stroke="#22c55e" strokeWidth="2" />;
                }
                return null;
              })()}
            </svg>
          )}

          {/* Polygon toolbar / confirm bar */}
          {addingUnit && (
            <div className="polygon-toolbar absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-white rounded-lg shadow-lg border px-4 py-2">
              {polygonPoints.length < 3 ? (
                <>
                  <span className="text-sm text-gray-500">
                    点击画布添加顶点 ({polygonPoints.length}/3)
                  </span>
                  <button onClick={undoLastPoint} disabled={polygonPoints.length === 0}
                    className="px-2 py-1 text-xs rounded border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                    撤销
                  </button>
                  <button onClick={cancelAddingUnit}
                    className="px-3 py-1 text-sm rounded-md border bg-white text-red-500 hover:bg-red-50">
                    取消
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm text-gray-600">
                    {polygonPoints.length} 个顶点 - 右键撤销 | 靠近起点点击闭合
                  </span>
                  <button onClick={undoLastPoint}
                    className="px-2 py-1 text-xs rounded border bg-white text-gray-600 hover:bg-gray-50">
                    撤销顶点
                  </button>
                  <button onClick={confirmAddUnit}
                    className="px-3 py-1 text-sm font-medium rounded-md bg-camp-600 text-white hover:bg-camp-700">
                    确认创建
                  </button>
                  <button onClick={cancelAddingUnit}
                    className="px-3 py-1 text-sm rounded-md border bg-white text-gray-600 hover:bg-gray-50">
                    取消
                  </button>
                </>
              )}
            </div>
          )}

          {/* Hint text when in add mode but no points yet */}
          {addingUnit && polygonPoints.length === 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
              <div className="bg-white/90 rounded-lg px-4 py-3 shadow-md border">
                <div className="text-sm font-medium text-amber-700 mb-1">绘制新铺位</div>
                <div className="text-xs text-gray-500">依次点击画布添加顶点，至少3个</div>
                <div className="text-xs text-gray-400 mt-1">右键撤销 | 完成后点"确认创建"</div>
              </div>
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

// ──── Hotspot Overlay (view + edit, supports rect & polygon) ────

interface HotspotOverlayProps {
  hotspot: HotspotItem;
  color: string;
  editMode: boolean;
  onClick: () => void;
  onUpdate: (x: number, y: number, w: number, h: number, points?: number[][]) => void;
}

/** Compute centroid of a polygon for label placement */
function getCentroid(points: number[][]): { cx: number; cy: number } {
  let cx = 0, cy = 0;
  for (const p of points) { cx += p[0]; cy += p[1]; }
  return { cx: cx / points.length, cy: cy / points.length };
}

function HotspotOverlay({ hotspot, color, editMode, onClick, onUpdate }: HotspotOverlayProps) {
  const { x, y, w, h, unit_code, unit_name, shape, points } = hotspot;
  const isPolygon = shape === 'polygon' && points && points.length >= 3;

  // --- Rect mode state ---
  const [rectDragging, setRectDragging] = useState<'move' | string | null>(null);
  const rectDragStart = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 });

  // --- Polygon mode state ---
  const [polyPoints, setPolyPoints] = useState<number[][]>(
    isPolygon ? points : []
  );
  const [vertexDragging, setVertexDragging] = useState<number | null>(null); // index of vertex being dragged
  const [polyMoving, setPolyMoving] = useState(false);
  const polyDragStart = useRef({ mx: 0, my: 0, pts: [] as number[][], idx: -1 });

  // Sync points when hotspot changes
  useEffect(() => {
    if (isPolygon && points) setPolyPoints(points);
  }, [isPolygon, points?.toString()]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  // ---- Rect drag handlers ----
  const startRectDrag = useCallback((mode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setRectDragging(mode);
    rectDragStart.current = { mx: e.clientX, my: e.clientY, x, y, w, h };
  }, [x, y, w, h]);

  useEffect(() => {
    if (!rectDragging || isPolygon) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - rectDragStart.current.mx;
      const dy = e.clientY - rectDragStart.current.my;
      const o = rectDragStart.current;
      switch (rectDragging) {
        case 'move': onUpdate(o.x + dx, o.y + dy, o.w, o.h); break;
        case 'resize-se': onUpdate(o.x, o.y, Math.max(30, o.w + dx), Math.max(20, o.h + dy)); break;
        case 'resize-sw': onUpdate(o.x + dx, o.y, Math.max(30, o.w - dx), Math.max(20, o.h + dy)); break;
        case 'resize-ne': onUpdate(o.x, o.y, Math.max(30, o.w + dx), Math.max(20, o.h - dy)); break;
        case 'resize-nw': onUpdate(o.x + dx, o.y + dy, Math.max(30, o.w - dx), Math.max(20, o.h - dy)); break;
        case 'resize-n': onUpdate(o.x, o.y + dy, o.w, Math.max(20, o.h - dy)); break;
        case 'resize-s': onUpdate(o.x, o.y, o.w, Math.max(20, o.h + dy)); break;
        case 'resize-w': onUpdate(o.x + dx, o.y, Math.max(30, o.w - dx), o.h); break;
        case 'resize-e': onUpdate(o.x, o.y, Math.max(30, o.w + dx), o.h); break;
      }
    };
    const onUp = () => setRectDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [rectDragging, onUpdate, isPolygon]);

  // ---- Polygon drag handlers ----
  const startVertexDrag = useCallback((idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setVertexDragging(idx);
    polyDragStart.current = { mx: e.clientX, my: e.clientY, pts: [...polyPoints], idx };
  }, [polyPoints]);

  const startPolyMove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setPolyMoving(true);
    polyDragStart.current = { mx: e.clientX, my: e.clientY, pts: [...polyPoints], idx: -1 };
  }, [polyPoints]);

  useEffect(() => {
    if (!isPolygon) return;
    if (vertexDragging !== null) {
      const onMove = (e: MouseEvent) => {
        const dx = e.clientX - polyDragStart.current.mx;
        const dy = e.clientY - polyDragStart.current.my;
        const updated = polyDragStart.current.pts.map((p, i) =>
          i === vertexDragging ? [Math.round(p[0] + dx), Math.round(p[1] + dy)] : p
        );
        setPolyPoints(updated);
        // Compute new bounds and call onUpdate with points
        const xs = updated.map(p => p[0]);
        const ys = updated.map(p => p[1]);
        const bx = Math.round(Math.min(...xs));
        const by = Math.round(Math.min(...ys));
        const bw = Math.round(Math.max(...xs) - bx);
        const bh = Math.round(Math.max(...ys) - by);
        onUpdate(bx, by, bw, bh, updated);
      };
      const onUp = () => setVertexDragging(null);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }
    if (polyMoving) {
      const onMove = (e: MouseEvent) => {
        const dx = e.clientX - polyDragStart.current.mx;
        const dy = e.clientY - polyDragStart.current.my;
        const updated = polyDragStart.current.pts.map(p => [Math.round(p[0] + dx), Math.round(p[1] + dy)]);
        setPolyPoints(updated);
        const xs = updated.map(p => p[0]);
        const ys = updated.map(p => p[1]);
        const bx = Math.round(Math.min(...xs));
        const by = Math.round(Math.min(...ys));
        const bw = Math.round(Math.max(...xs) - bx);
        const bh = Math.round(Math.max(...ys) - by);
        onUpdate(bx, by, bw, bh, updated);
      };
      const onUp = () => setPolyMoving(false);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }
  }, [vertexDragging, polyMoving, onUpdate, isPolygon]);

  // ---- Render: Polygon shape ----
  if (isPolygon) {
    const pts = vertexDragging !== null || polyMoving ? polyPoints : (points || []);
    const centroid = getCentroid(pts);
    const ptsStr = pts.map(p => `${p[0]},${p[1]}`).join(' ');

    if (editMode) {
      return (
        <svg className="hotspot-edit absolute" style={{ left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
          <polygon
            points={ptsStr}
            fill={`${color}22`}
            stroke={color}
            strokeWidth="2"
            strokeDasharray="6,4"
            style={{ pointerEvents: 'all', cursor: polyMoving ? 'grabbing' : 'grab' }}
            onMouseDown={startPolyMove}
            onClick={handleClick}
          />
          {/* Draggable vertices */}
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p[0]} cy={p[1]}
              r="6"
              fill="#fff"
              stroke={color}
              strokeWidth="2"
              style={{ pointerEvents: 'all', cursor: vertexDragging === i ? 'grabbing' : 'move' }}
              onMouseDown={(e) => startVertexDrag(i, e)}
            />
          ))}
          {/* Label at centroid */}
          <text x={centroid.cx} y={centroid.cy} textAnchor="middle" dominantBaseline="central"
            className="select-none pointer-events-none text-[10px] font-medium" fill="#374151">
            {unit_name || unit_code}
          </text>
        </svg>
      );
    }

    // View mode: clickable polygon
    return (
      <svg className="absolute group" style={{ left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        <title>{`${unit_name || unit_code}${hotspot.tenant_name ? ` - ${hotspot.tenant_name}` : ''}`}</title>
        <polygon
          points={ptsStr}
          fill={`${color}30`}
          stroke={color}
          strokeWidth="2"
          className="hover:brightness-95 transition-all duration-150 cursor-pointer"
          style={{ pointerEvents: 'all' }}
          onClick={handleClick}
        />
        <text x={centroid.cx} y={centroid.cy} textAnchor="middle" dominantBaseline="central"
          className="select-none pointer-events-none text-[11px] font-medium" fill="#1e293b">
          {(unit_name && unit_name !== unit_code) ? unit_name : unit_code}
        </text>
      </svg>
    );
  }

  // ---- Render: Rect shape (original behavior) ----
  if (editMode) {
    return (
      <div
        className="hotspot-edit absolute group"
        style={{
          left: x, top: y, width: w, height: h,
          backgroundColor: `${color}22`,
          border: `2px dashed ${color}`,
          cursor: rectDragging ? 'grabbing' : 'move',
        }}
        onMouseDown={(e) => startRectDrag('move', e)}
      >
        <ResizeHandle cx={0} cy={0} cursor="nw-resize" onStart={(e) => startRectDrag('resize-nw', e)} />
        <ResizeHandle cx={0.5} cy={0} cursor="n-resize" onStart={(e) => startRectDrag('resize-n', e)} />
        <ResizeHandle cx={1} cy={0} cursor="ne-resize" onStart={(e) => startRectDrag('resize-ne', e)} />
        <ResizeHandle cx={1} cy={0.5} cursor="e-resize" onStart={(e) => startRectDrag('resize-e', e)} />
        <ResizeHandle cx={1} cy={1} cursor="se-resize" onStart={(e) => startRectDrag('resize-se', e)} />
        <ResizeHandle cx={0.5} cy={1} cursor="s-resize" onStart={(e) => startRectDrag('resize-s', e)} />
        <ResizeHandle cx={0} cy={1} cursor="sw-resize" onStart={(e) => startRectDrag('resize-sw', e)} />
        <ResizeHandle cx={0} cy={0.5} cursor="w-resize" onStart={(e) => startRectDrag('resize-w', e)} />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium select-none pointer-events-none text-gray-700">
          {unit_name || unit_code}
        </span>
      </div>
    );
  }

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
