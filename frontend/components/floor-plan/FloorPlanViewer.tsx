'use client';

/**
 * FloorPlanViewer - Core component for CAMP's floor plan visualization.
 *
 * Renders a floor plan image with interactive hotspot overlays.
 * Each hotspot represents a store unit and is clickable to show details.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { HotspotItem, UnitWithContract } from '@/lib/types';
import { UnitDetailPanel } from './UnitDetailPanel';

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
        setError(err instanceof Error ? err.message : 'Failed to load floor plan');
      } finally {
        setLoading(false);
      }
    }

    if (planId) {
      loadData();
    }
  }, [planId]);

  // Handle hotspot click
  const handleHotspotClick = useCallback((hotspot: HotspotItem) => {
    setSelectedUnit(hotspot);
  }, []);

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
        <div className="text-gray-500">Loading floor plan...</div>
      </div>
    );
  }

  if (error || !renderData) {
    return (
      <div className="flex items-center justify-center bg-red-50 rounded-lg" style={{ height }}>
        <div className="text-red-600">
          {error || 'No floor plan available. Please upload a floor plan first.'}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex gap-4" style={{ height }}>
      {/* Floor Plan Area */}
      <div
        ref={containerRef}
        className="floor-plan-container flex-1 border rounded-lg overflow-hidden bg-white"
      >
        <div className="floor-plan-image relative inline-block">
          {/* Background Image */}
          <img
            src={renderData.image_url}
            alt="Floor Plan"
            className="block max-w-full"
            draggable={false}
          />

          {/* Hotspot Overlays */}
          {renderData.hotspots.map((hotspot, index) => (
            <HotspotOverlay
              key={`hs-${hotspot.unit_id}-${index}`}
              hotspot={hotspot}
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
  color: string;
  onClick: () => void;
}

function HotspotOverlay({ hotspot, color, onClick }: HotspotOverlayProps) {
  const { x, y, w, h, shape, unit_code, unit_name, tenant_name } = hotspot;

  // Convert to percentage-based positioning for responsive scaling
  const style: React.CSSProperties = {
    left: `${x}px`,
    top: `${y}px`,
    width: `${w}px`,
    height: `${h}px`,
    backgroundColor: `${color}33`, // 20% opacity background
    borderColor: color,
  };

  if (shape === 'polygon' && hotspot.points) {
    // SVG polygon for irregular shapes
    const pointsStr = hotspot.points.map(p => p.join(',')).join(' ');
    return (
      <svg
        className="hotspot-polygon absolute inset-0 pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        <polygon
          points={pointsStr}
          fill={`${color}33`}
          stroke={color}
          strokeWidth="2"
          className="cursor-pointer pointer-events-auto"
          onClick={onClick}
          style={{ transition: 'all 0.2s ease' }}
        />
        {/* Tooltip on hover */}
        <title>{unit_name || unit_code}</title>
      </svg>
    );
  }

  return (
    <div
      className="hotspot"
      style={style}
      onClick={onClick}
      title={`${unit_name || unit_code}${tenant_name ? ` - ${tenant_name}` : ''}`}
    >
      {/* Unit code label inside hotspot */}
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white drop-shadow-sm select-none pointer-events-none">
        {unit_code}
      </span>
    </div>
  );
}

export default FloorPlanViewer;
