import React, { useState } from 'react';
import { ArrowLeft, DoorOpen, Info, Sparkles } from 'lucide-react';
import type { VirtualStoreMeta } from '../../../types.ts';
import { formatKRW } from '../../../utils/pricing.ts';

interface StoreExteriorEntranceProps {
  storeMeta: VirtualStoreMeta;
  budget: number;
  onEnterInterior: () => void;
  onExitStore: () => void;
}

export default function StoreExteriorEntrance({
  storeMeta,
  budget,
  onEnterInterior,
  onExitStore,
}: StoreExteriorEntranceProps) {
  const [isOpeningDoor, setIsOpeningDoor] = useState(false);

  const handleOpenDoor = () => {
    if (isOpeningDoor) return;
    setIsOpeningDoor(true);
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => {
      onEnterInterior();
    }, prefersReduced ? 40 : 420);
  };

  return (
    <div className="world-enter-anim max-w-4xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onExitStore}
          className="min-h-[40px] px-3 sm:px-3.5 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] text-xs font-bold text-[#252525] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>매장 다시 선택</span>
        </button>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-[#5C5549] min-w-0">
          <span className="font-bold text-[#319447]">{storeMeta.statusText}</span>
          <span aria-hidden="true">·</span>
          <span className="font-num font-bold text-[#6B6355] truncate">{storeMeta.storeId}</span>
        </div>
      </div>

      {/* Storefront Card */}
      <section
        className={`bg-white border border-[#EAE0CC] rounded-3xl overflow-hidden shadow-sm transition-all duration-300 motion-safe-transition ${
          isOpeningDoor ? 'scale-[1.03] opacity-80' : 'scale-100 opacity-100'
        }`}
      >
        <div className="p-4 sm:p-7 pb-3 text-center space-y-1.5 sm:space-y-2 bg-gradient-to-b from-[#F2FBF4] to-white border-b border-[#EFE5D2]">
          <p className="text-xs font-bold text-[#319447] break-words">
            GS25 (가상 시뮬레이션) · {storeMeta.displayName}
          </p>
          <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-[#252525]">
            어서 오세요! 오늘의 한 끼를 골라볼까요?
          </h1>
          <p className="text-xs sm:text-sm text-[#5C5549]">
            설정 예산 <strong className="font-num text-[#F49A24]">{formatKRW(budget)}</strong>으로
            가상 편의점 안 진열대를 직접 클릭하며 꿀조합을 만들어 보세요.
          </p>
        </div>

        {/* Retro 2.5D Exterior SVG */}
        <div className="px-3 sm:px-8 pt-4 sm:pt-5 pb-4 bg-[#FFFDF8] flex flex-col items-center">
          <svg
            viewBox="0 0 760 400"
            className="w-full max-w-2xl h-auto select-none"
            role="img"
            aria-label={`${storeMeta.displayName} 가상 편의점 입구`}
          >
            {/* Sky & Evening Pastel Backdrop */}
            <rect x="20" y="16" width="720" height="368" rx="28" fill="#E8F6EE" />
            <circle cx="115" cy="78" r="28" fill="#FFD65A" opacity="0.85" />
            <ellipse cx="620" cy="70" rx="46" ry="18" fill="#FFFFFF" opacity="0.8" />
            <ellipse cx="648" cy="74" rx="28" ry="14" fill="#FFFFFF" opacity="0.8" />

            {/* Sidewalk */}
            <polygon points="40,320 720,320 740,384 20,384" fill="#F2E9D8" />
            <line x1="40" y1="320" x2="720" y2="320" stroke="#DDD0B8" strokeWidth="3" />
            <line x1="160" y1="320" x2="120" y2="384" stroke="#E5DAC4" strokeWidth="2" />
            <line x1="380" y1="320" x2="380" y2="384" stroke="#E5DAC4" strokeWidth="2" />
            <line x1="600" y1="320" x2="640" y2="384" stroke="#E5DAC4" strokeWidth="2" />

            {/* Store Building Body */}
            <rect
              x="120"
              y="92"
              width="520"
              height="228"
              rx="14"
              fill="#FFFDF9"
              stroke="#D8CCB4"
              strokeWidth="3"
            />

            {/* Top GS25-style Fascia Sign */}
            <rect x="108" y="64" width="544" height="54" rx="14" fill="#319447" />
            <rect x="108" y="106" width="544" height="12" fill="#007CFF" />
            <rect x="126" y="73" width="84" height="28" rx="8" fill="#FFFFFF" />
            <text
              x="168"
              y="92"
              textAnchor="middle"
              fontSize="16"
              fontWeight="900"
              fill="#007CFF"
            >
              GS25
            </text>
            <text
              x="386"
              y="92"
              textAnchor="middle"
              fontSize="16"
              fontWeight="800"
              fill="#FFFFFF"
            >
              {storeMeta.displayName.slice(0, 16)}
            </text>
            <rect x="558" y="75" width="76" height="24" rx="6" fill="#FFD65A" />
            <text
              x="596"
              y="91"
              textAnchor="middle"
              fontSize="11"
              fontWeight="800"
              fill="#252525"
            >
              가상 체험관
            </text>

            {/* Striped Pastel Awning */}
            <g>
              <rect x="128" y="118" width="504" height="20" fill="#F49A24" opacity="0.9" />
              <rect x="164" y="118" width="44" height="20" fill="#FFF9EF" />
              <rect x="252" y="118" width="44" height="20" fill="#FFF9EF" />
              <rect x="340" y="118" width="44" height="20" fill="#FFF9EF" />
              <rect x="428" y="118" width="44" height="20" fill="#FFF9EF" />
              <rect x="516" y="118" width="44" height="20" fill="#FFF9EF" />
              <rect x="604" y="118" width="28" height="20" fill="#FFF9EF" />
            </g>

            {/* Left Showcase Window showing cozy interior shelves */}
            <rect
              x="146"
              y="156"
              width="154"
              height="126"
              rx="10"
              fill="#DCF4FA"
              stroke="#B8DFEA"
              strokeWidth="3"
            />
            <rect x="160" y="200" width="126" height="10" rx="3" fill="#F49A24" opacity="0.7" />
            <rect x="168" y="182" width="18" height="18" rx="3" fill="#E85D2C" />
            <rect x="192" y="180" width="18" height="20" rx="3" fill="#FFD65A" />
            <rect x="216" y="183" width="20" height="17" rx="3" fill="#319447" />
            <rect x="242" y="180" width="18" height="20" rx="3" fill="#007CFF" />
            <rect x="160" y="242" width="126" height="10" rx="3" fill="#319447" opacity="0.7" />
            <rect x="172" y="224" width="22" height="18" rx="4" fill="#FF9E44" />
            <rect x="202" y="222" width="22" height="20" rx="4" fill="#FFD65A" />
            <rect x="232" y="224" width="24" height="18" rx="4" fill="#6BCB77" />
            {/* Poster inside left window */}
            <rect x="156" y="162" width="66" height="16" rx="4" fill="#FFD65A" />
            <text x="189" y="174" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#252525">
              1+1 행사중
            </text>

            {/* Right Showcase Window showing promo & warm lighting */}
            <rect
              x="460"
              y="156"
              width="154"
              height="126"
              rx="10"
              fill="#FFF5DC"
              stroke="#E7D8B7"
              strokeWidth="3"
            />
            <rect x="476" y="172" width="122" height="36" rx="8" fill="#319447" />
            <text x="537" y="189" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFFFFF">
              5,000원 한 끼
            </text>
            <text x="537" y="202" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#FFD65A">
              꿀조합 추천 체험
            </text>
            <rect x="476" y="224" width="54" height="44" rx="8" fill="#FFFFFF" stroke="#E5DAC4" />
            <text x="503" y="245" textAnchor="middle" fontSize="10" fontWeight="800" fill="#F49A24">
              2+1
            </text>
            <text x="503" y="259" textAnchor="middle" fontSize="9" fontWeight="700" fill="#5C5549">
              초코바
            </text>
            <rect x="540" y="224" width="58" height="44" rx="8" fill="#FFFFFF" stroke="#E5DAC4" />
            <text x="569" y="245" textAnchor="middle" fontSize="10" fontWeight="800" fill="#007CFF">
              1+1
            </text>
            <text x="569" y="259" textAnchor="middle" fontSize="9" fontWeight="700" fill="#5C5549">
              바나나우유
            </text>

            {/* Potted Plants beside door */}
            <rect x="292" y="290" width="22" height="26" rx="4" fill="#D98218" />
            <circle cx="303" cy="280" r="14" fill="#4BAE60" />
            <rect x="446" y="290" width="22" height="26" rx="4" fill="#D98218" />
            <circle cx="457" cy="280" r="14" fill="#4BAE60" />

            {/* Welcome Mat */}
            <polygon points="326,320 434,320 448,342 312,342" fill="#319447" />
            <text x="380" y="335" textAnchor="middle" fontSize="10" fontWeight="800" fill="#FFFFFF">
              WELCOME
            </text>

            {/* Interactive Automatic Sliding Glass Doors */}
            <g
              role="button"
              tabIndex={0}
              aria-label="가상 편의점 문 열고 입장하기"
              onClick={handleOpenDoor}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenDoor();
                }
              }}
              className="cursor-pointer focus:outline-none"
            >
              {/* Warm Glowing Interior Behind Open Door */}
              <rect
                x="322"
                y="154"
                width="116"
                height="164"
                rx="6"
                fill="#FFF8E2"
                stroke="#257336"
                strokeWidth="3"
              />
              {/* Interior hint when sliding */}
              <rect x="348" y="205" width="64" height="44" rx="6" fill="#FFD65A" opacity="0.45" />
              <text x="380" y="232" textAnchor="middle" fontSize="11" fontWeight="800" fill="#257336">
                입장하기!
              </text>

              {/* Left Glass Door Leaf */}
              <g
                className="transition-transform duration-300 motion-safe-transition"
                style={{ transform: isOpeningDoor ? 'translateX(-42px)' : 'translateX(0px)' }}
              >
                <rect
                  x="324"
                  y="156"
                  width="56"
                  height="160"
                  rx="3"
                  fill="#BEE8F5"
                  fillOpacity="0.88"
                  stroke="#319447"
                  strokeWidth="2.5"
                />
                <rect x="330" y="218" width="44" height="18" rx="4" fill="#319447" />
                <text x="352" y="230" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#FFFFFF">
                  PUSH
                </text>
              </g>

              {/* Right Glass Door Leaf */}
              <g
                className="transition-transform duration-300 motion-safe-transition"
                style={{ transform: isOpeningDoor ? 'translateX(42px)' : 'translateX(0px)' }}
              >
                <rect
                  x="380"
                  y="156"
                  width="56"
                  height="160"
                  rx="3"
                  fill="#BEE8F5"
                  fillOpacity="0.88"
                  stroke="#319447"
                  strokeWidth="2.5"
                />
                <rect x="386" y="218" width="44" height="18" rx="4" fill="#007CFF" />
                <text x="408" y="230" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#FFFFFF">
                  OPEN
                </text>
              </g>

              {/* Hover/Click Prompt Tag above Door */}
              <rect x="330" y="138" width="100" height="20" rx="10" fill="#252525" />
              <text x="380" y="151.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#FFD65A">
                문 클릭하여 입장
              </text>
            </g>
          </svg>

          <div className="w-full max-w-md pt-2 space-y-3">
            <button
              type="button"
              onClick={handleOpenDoor}
              disabled={isOpeningDoor}
              className="w-full min-h-[52px] px-5 py-3.5 rounded-2xl bg-[#319447] hover:bg-[#257336] disabled:opacity-75 text-white text-base font-extrabold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <DoorOpen className="w-5 h-5" />
              <span>{isOpeningDoor ? '매장 안으로 들어가는 중...' : '문 열고 입장하기'}</span>
              <Sparkles className="w-4 h-4 text-[#FFD65A]" />
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3.5 bg-[#FFF6E8] border-t border-[#F49A24]/30 flex items-start gap-2 text-xs text-[#66410B]">
          <Info className="w-4 h-4 text-[#F49A24] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>가상 매장 안내:</strong> {storeMeta.noticeText} 선택한 매장명(
            <strong>{storeMeta.displayName}</strong>)을 배경으로 한 체험 공간이며 실제 점포 재고·결제와는 무관합니다.
          </p>
        </div>
      </section>
    </div>
  );
}
