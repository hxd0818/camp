'use client';

/**
 * HotspotOverlay - Reusable hotspot overlay component for floor plans.
 *
 * Renders clickable regions on top of floor plan images.
 */

import React from 'react';
import type { HotspotItem } from '@/lib/types';

interface HotspotOverlayProps {
  hotspot: HotspotItem;
  color: string;
  onClick: (hotspot: HotspotItem) => void;
  showLabel?: boolean;
}

export function HotspotOverlay({
  hotspot,
  color,
  onClick,
  showLabel = true,
}: HotspotOverlayProps) {
  const { x, y, w, h, shape, unit_code, unit_name, tenant_name } = hotspot;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    width: `${w}px`,
    height: `${h}px`,
    backgroundColor: `${color}33`,
    border: `2px solid ${color}`,
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  const handleClick = () => onClick(hotspot);

  if (shape === 'polygon' && hotspot.points) {
    const pointsStr = hotspot.points.map(p => p.join(',')).join(' ');
    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        <polygon
          points={pointsStr}
          fill={`${color}33`}
          stroke={color}
          strokeWidth="2"
          className="cursor-pointer pointer-events-auto hover:brightness-110"
          onClick={handleClick}
        />
        <title>{unit_name || unit_code}</title>
      </svg>
    );
  }

  return (
    <div
      className="group"
      style={baseStyle}
      onClick={handleClick}
      title={`${unit_name || unit_code}${tenant_name ? ` - ${tenant_name}` : ''}`}
    >
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white opacity-80 group-hover:opacity-100 select-none pointer-events-none whitespace-nowrap overflow-hidden">
          {unit_code}
        </span>
      )}
    </div>
  );
}

export default HotspotOverlay;
