import React, { useState } from 'react';

interface StoreHotspotProps {
  ariaLabel: string;
  label: string;
  badgeText?: string;
  badgeColor?: string;
  labelPos: { x: number; y: number };
  hitPoints: string;
  isSelected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}

export default function StoreHotspot({
  ariaLabel,
  label,
  badgeText,
  badgeColor = '#319447',
  labelPos,
  hitPoints,
  isSelected,
  onSelect,
  children,
}: StoreHotspotProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onSelect();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer focus:outline-none"
    >
      {/* Visual 2.5D Object Group */}
      <g
        className="transition-all duration-150 motion-safe-transition"
        style={{
          filter: isSelected
            ? 'drop-shadow(0px 0px 6px rgba(49, 148, 71, 0.55))'
            : hovered
              ? 'brightness(1.05) drop-shadow(0px 3px 5px rgba(37, 37, 37, 0.16))'
              : undefined,
          transform: hovered || isSelected ? 'translateY(-2px)' : 'translateY(0px)',
        }}
      >
        {children}
      </g>

      {/* Transparent Isometric Hit Area + Active Selection Ring */}
      <polygon
        points={hitPoints}
        fill={isSelected ? 'rgba(49, 148, 71, 0.08)' : 'transparent'}
        stroke={isSelected ? '#319447' : hovered ? '#F49A24' : 'transparent'}
        strokeWidth={isSelected ? '2.5' : '2'}
        strokeDasharray={isSelected ? undefined : '5 3'}
      />

      {/* Floating Zone Label Tag */}
      <g transform={`translate(${labelPos.x}, ${labelPos.y})`} className="pointer-events-none">
        <rect
          x="-52"
          y="-14"
          width="104"
          height="26"
          rx="13"
          fill={isSelected ? '#319447' : hovered ? '#252525' : '#FFFFFF'}
          fillOpacity={isSelected || hovered ? 0.96 : 0.94}
          stroke={isSelected ? '#FFFFFF' : hovered ? '#FFD65A' : '#D8CCB4'}
          strokeWidth="1.8"
        />
        <text
          x="0"
          y="3"
          textAnchor="middle"
          fontSize="12"
          fontWeight="800"
          fill={isSelected || hovered ? '#FFFFFF' : '#252525'}
        >
          {label}
        </text>
        {badgeText && (
          <g transform="translate(42, -16)">
            <rect x="-20" y="-9" width="40" height="17" rx="8.5" fill={badgeColor} />
            <text x="0" y="3" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#FFFFFF">
              {badgeText}
            </text>
          </g>
        )}
      </g>
    </g>
  );
}
