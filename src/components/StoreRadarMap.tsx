import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import type { StoreWithDistance } from '../types.ts';
import { formatDistance } from '../utils/geo.ts';
import { BRAND_METADATA } from '../data/gs25SampleCatalog.ts';

interface StoreRadarMapProps {
  centerLat: number;
  centerLng: number;
  locationLabel: string;
  radiusMeters: number;
  stores: StoreWithDistance[];
  selectedStoreId: string | null;
  onSelectStore: (store: StoreWithDistance) => void;
}

export default function StoreRadarMap({
  centerLat,
  centerLng,
  locationLabel,
  radiusMeters,
  stores,
  selectedStoreId,
  onSelectStore,
}: StoreRadarMapProps) {
  const maxMeterSpan = Math.max(radiusMeters, 150);

  const projectPoint = (lat: number, lng: number) => {
    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);
    const dx = (lng - centerLng) * metersPerDegLng;
    const dy = (lat - centerLat) * metersPerDegLat;

    // Map [-maxMeterSpan, maxMeterSpan] to [12%, 88%] inside preview frame
    const xPct = 50 + (dx / maxMeterSpan) * 38;
    const yPct = 50 - (dy / maxMeterSpan) * 38;
    return {
      x: Math.max(10, Math.min(90, xPct)),
      y: Math.max(12, Math.min(88, yPct)),
    };
  };

  return (
    <div className="rounded-2xl border border-[#EAE0CC] bg-[#FAF6EB] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#EAE0CC] bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-[#4B453A] font-medium min-w-0">
          <Navigation className="w-3.5 h-3.5 text-[#319447] shrink-0" />
          <span className="truncate max-w-[180px] sm:max-w-xs">{locationLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="font-num font-semibold text-[#319447] shrink-0">
            반경 {formatDistance(radiusMeters)}
          </span>
        </div>
        <span className="text-[11px] text-[#7D7465] font-num">
          {stores.some((s) => s.dataSource === 'OSM_NOMINATIM')
            ? `실제 지도 매장(OSM) · ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}`
            : `주변 레이더 미리보기 · ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}`}
        </span>
      </div>

      <div className="relative h-56 sm:h-64 w-full bg-[#F6EFE0] overflow-hidden select-none">
        {/* Subtle Street Grid Lines */}
        <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
          <defs>
            <pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="#E8DEC8"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-grid)" />
          {/* Radius rings */}
          <circle
            cx="50%"
            cy="50%"
            r="38%"
            fill="rgba(49, 148, 71, 0.06)"
            stroke="#319447"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <circle
            cx="50%"
            cy="50%"
            r="19%"
            fill="none"
            stroke="#319447"
            strokeOpacity="0.35"
            strokeWidth="1"
          />
        </svg>

        {/* Center User Marker */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 pointer-events-none"
          title="기준 위치"
        >
          <div className="w-4 h-4 rounded-full bg-[#252525] border-2 border-white shadow-md" />
          <span className="mt-1 px-1.5 py-0.5 rounded bg-white/95 border border-[#DFD5C0] text-[10px] font-bold text-[#252525] whitespace-nowrap">
            내 위치
          </span>
        </div>

        {/* Store Pins */}
        {stores.map((store) => {
          const { x, y } = projectPoint(store.lat, store.lng);
          const isSelected = store.storeId === selectedStoreId;
          const brandMeta = BRAND_METADATA[store.brand];
          return (
            <button
              key={store.storeId}
              type="button"
              onClick={() => onSelectStore(store)}
              style={{ left: `${x}%`, top: `${y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center group cursor-pointer focus:outline-none"
            >
              <div
                className={`min-w-[36px] min-h-[36px] px-2 py-1 rounded-xl flex items-center gap-1 text-[11px] font-bold shadow-sm transition-transform ${
                  isSelected
                    ? 'bg-[#319447] text-white scale-110 ring-2 ring-white'
                    : 'bg-white text-[#252525] border border-[#D8CEBA] hover:scale-105'
                }`}
              >
                <MapPin
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: isSelected ? '#FFFFFF' : brandMeta.accentColor }}
                />
                <span className="whitespace-nowrap">{brandMeta.shortLabel}</span>
              </div>
              <span className="mt-0.5 px-1.5 py-0.5 rounded bg-white/90 text-[10px] font-num font-semibold text-[#4B453A] whitespace-nowrap shadow-xs">
                {formatDistance(store.distanceMeters)}
              </span>
            </button>
          );
        })}

        {stores.length === 0 && (
          <div className="absolute inset-x-4 bottom-3 bg-white/95 border border-[#E6DAC2] rounded-xl px-3 py-2 text-center text-xs text-[#5C5549]">
            반경 {formatDistance(radiusMeters)} 내 확인된 편의점이 없습니다. 검색 반경을 넓혀 보세요.
          </div>
        )}
      </div>
    </div>
  );
}
