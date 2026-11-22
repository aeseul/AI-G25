import React from 'react';
import {
  HelpCircle,
  Home,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import type { VirtualStoreMeta, VirtualStoreTab } from '../../../types.ts';
import { formatKRW } from '../../../utils/pricing.ts';

interface StoreHUDProps {
  storeMeta: VirtualStoreMeta;
  budget: number;
  cartTotal: number;
  cartItemCount: number;
  onNavigateTab: (tab: VirtualStoreTab) => void;
  onOpenTutorial: () => void;
  onExitVirtualStore: () => void;
}

export default function StoreHUD({
  storeMeta,
  budget,
  cartTotal,
  cartItemCount,
  onNavigateTab,
  onOpenTutorial,
  onExitVirtualStore,
}: StoreHUDProps) {
  const remaining = budget - cartTotal;
  const isOverBudget = remaining < 0;
  const fillPercent = Math.min(100, Math.max(0, Math.round((cartTotal / Math.max(1, budget)) * 100)));

  return (
    <section className="bg-white border border-[#EAE0CC] rounded-3xl p-3.5 sm:p-5 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs min-w-0">
          <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#319447] text-white font-extrabold shrink-0">
            가상 매장
          </span>
          <span className="font-extrabold text-xs sm:text-sm text-[#252525] truncate max-w-[180px] sm:max-w-none">
            GS25 · {storeMeta.displayName}
          </span>
          <span className="text-[#756D60] font-num shrink-0">({storeMeta.storeId})</span>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onOpenTutorial}
            className="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] hover:bg-[#FAF4E6] text-xs font-bold text-[#5C5549] inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#319447]" />
            <span>안내</span>
          </button>
          <button
            type="button"
            onClick={onExitVirtualStore}
            className="min-h-[36px] px-3 py-1.5 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] text-xs font-bold text-[#252525] inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>홈으로</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('recommend')}
            className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#319447] hover:bg-[#257336] text-white text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FFD65A] shrink-0" />
            <span>꿀조합 추천</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('cart')}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#252525] hover:bg-[#111111] text-white text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-[#FFD65A] shrink-0" />
            <span>장바구니</span>
            <span className="font-num text-[#FFD65A]">({cartItemCount})</span>
          </button>
        </div>
      </div>

      {/* Real-time Budget Gauge */}
      <div className="p-3.5 rounded-2xl bg-[#FFF9EF] border border-[#EFE5D2] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <span>
              내 예산 <strong className="font-num text-[#252525]">{formatKRW(budget)}</strong>
            </span>
            <span aria-hidden="true" className="text-[#B8AD99]">
              ·
            </span>
            <span>
              장바구니{' '}
              <strong className="font-num text-[#F49A24]">{formatKRW(cartTotal)}</strong>
            </span>
          </div>
          <span
            className={`font-num font-extrabold ${
              isOverBudget ? 'text-red-600' : 'text-[#319447]'
            }`}
          >
            {isOverBudget
              ? `예산 ${formatKRW(Math.abs(remaining))} 초과!`
              : `남은 금액 ${formatKRW(remaining)}`}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="예산 사용량 게이지"
          aria-valuenow={Math.min(budget, cartTotal)}
          aria-valuemin={0}
          aria-valuemax={budget}
          className="w-full h-2.5 rounded-full bg-[#EAE0CC] overflow-hidden"
        >
          <div
            className={`h-full transition-all duration-300 motion-safe-transition ${
              isOverBudget ? 'bg-red-500' : 'bg-[#319447]'
            }`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
}
