'use client';

/**
 * FloorPlanViewer - Core component for CAMP's floor plan visualization.
 *
 * Renders a floor plan image with interactive hotspot overlays.
 * Supports zoom in/out and drag-to-pan.
 * Hotspot positions are percentage-based so they stay aligned at any zoom level.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { HotspotItem } from '@/lib/types';
import { UnitDetailPanel } from './UnitDetailPanel';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8201';

interface FloorPlanViewerProps {
  planId: number;
  mallId?: number;
  height?: string;
}

export function FloorPlanViewer({ planId, mallId, height = '70vh' }: FloorPlanViewerProps) {
  const [renderData, setRenderData] = useState<{
    image_url: string;
    hotspots: HotspotItem[];
    image_width?: number;
    image_height?: number;
  } | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<HotspotItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Zoom & pan state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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

    if (planId) {
      loadData();
    }
  }, [planId]);

  // Auto-fit image on load
  useEffect(() => {
    if (!containerRef.current || !renderData) return;
    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iw = renderData.image_width || 1200;
    const ih = renderData.image_height || 820;
    const fitScale = Math.min(cw / iw, ch / ih) * 0.95;
    setScale(fitScale);
    const ox = (cw - iw * fitScale) / 2;
    const oy = (ch - ih * fitScale) / 2;
    setPan({ x: ox, y: oy });
  }, [renderData]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setScale(s => Math.min(s * 1.3, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(s => Math.max(s / 1.3, 0.2));
  }, []);

  const handleZoomReset = useCallback(() => {
    if (!containerRef.current || !renderData) return;
    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iw = renderData.image_width || 1200;
    const ih = renderData.image_height || 820;
    const fitScale = Math.min(cw / iw, ch / ih) * 0.95;
    setScale(fitScale);
    setPan({ x: (cw - iw * fitScale) / 2, y: (ch - ih * fitScale) / 2 });
  }, [renderData]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.max(0.2, Math.min(5, s * delta)));
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // left click only
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({
      x: panStart.current.x + dx,
      y: panStart.current.y + dy,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle hotspot click
  const handleHotspotClick = useCallback((hotspot: HotspotItem) => {
    if (isDragging) return; // ignore clicks after drag
    setSelectedUnit(hotspot);
  }, [isDragging]);

  // Close detail panel
  const handleClosePanel = useCallback(() => {
    setSelectedUnit(null);
  }, []);

  // Get status color
  const getStatusColor = (hotspot: HotspotItem): string => {
    return hotspot.status_color || '#94a3b8';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-gray-500">加载图纸中...</div>
      </div>
    );
  }

  if (error || !renderData) {
    return (
      <div className="flex items-center justify-center bg-red-50 rounded-lg" style={{ height }}>
        <div className="text-red-600">
          {error || '暂无图纸数据，请先上传楼层平面图'}
        </div>
      </div>
    );
  }

  const imgW = renderData.image_width || 1200;
  const imgH = renderData.image_height || 820;

  return (
    <div className="relative flex gap-4" style={{ height }}>
      {/* Floor Plan Area */}
      <div
        ref={containerRef}
        className="floor-plan-container flex-1 border rounded-lg overflow-hidden bg-gray-100 relative"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Zoom Controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border text-gray-600 hover:bg-gray-50 text-sm font-bold"
            title="放大"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border text-gray-600 hover:bg-gray-50 text-sm font-bold"
            title="缩小"
          >
            -
          </button>
          <button
            onClick={handleZoomReset}
            className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border text-gray-600 hover:bg-gray-50 text-xs"
            title="适应窗口"
          >
            Fit
          </button>
          <div className="text-center text-[10px] text-gray-400 mt-1">
            {Math.round(scale * 100)}%
          </div>
        </div>

        {/* Transformable content */}
        <div
          className="absolute origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            width: imgW,
            height: imgH,
          }}
        >
          {/* Background Image */}
          <img
            src={`${API_BASE}${renderData.image_url}`}
            alt="楼层平面图"
            className="block pointer-events-none"
            draggable={false}
            style={{ width: imgW, height: imgH }}
          />

          {/* Hotspot Overlays */}
          {renderData.hotspots.map((hotspot, index) => (
            <HotspotOverlay
              key={`hs-${hotspot.unit_id}-${index}`}
              hotspot={hotspot}
              imgW={imgW}
              imgH={imgH}
              color={getStatusColor(hotspot)}
              onClick={() => handleHotspotClick(hotspot)}
            />
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedUnit && (
        <UnitDetailPanel
          unit={selectedUnit}
          onClose={handleClosePanel}
          mallId={mallId}
        />
      )}
    </div>
  );
}

// --- Sub-component: Hotspot Overlay ---

interface HotspotOverlayProps {
  hotspot: HotspotItem;
  imgW: number;
  imgH: number;
  color: string;
  onClick: () => void;
}

function HotspotOverlay({ hotspot, imgW, imgH, color, onClick }: HotspotOverlayProps) {
  const { x, y, w, h, shape, unit_code, unit_name, tenant_name } = hotspot;
  const handleClick = useCallback(() => { onClick(); }, [onClick]);

  // Percentage-based positioning relative to image dimensions
  const pctStyle: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width: w,
    height: h,
    backgroundColor: `${color}33`,
    borderColor: color,
    borderWidth: 2,
    borderStyle: 'solid',
    cursor: 'pointer',
  };

  if (shape === 'polygon' && hotspot.points) {
    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ overflow: 'visible', width: imgW, height: imgH }}
      >
        <polygon
          points={hotspot.points.map(p => p.join(',')).join(' ')}
          fill={`${color}33`}
          stroke={color}
          strokeWidth="2"
          className="cursor-pointer pointer-events-auto hover:brightness-110"
          onClick={handleClick}
          style={{ transition: 'all 0.15s ease' }}
        />
        <title>{unit_name || unit_code}</title>
      </svg>
    );
  }

  return (
    <div
      className="group hover:brightness-90 transition-all duration-150"
      style={pctStyle}
      onClick={handleClick}
      title={`${unit_name || unit_code}${tenant_name ? ` - ${tenant_name}` : ''}`}
    />
  );
}

export default FloorPlanViewer;
