import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckSquare,
  Clock,
  Flame,
  ShoppingCart,
  Square,
} from 'lucide-react';
import type { VirtualRecommendationResult } from '../../types.ts';
import { formatKRW } from '../../utils/pricing.ts';
import CookingVideoGuide from '../CookingVideoGuide.tsx';

interface VirtualRecipeViewProps {
  combo: VirtualRecommendationResult;
  onBack: () => void;
  onAddComboToCart: (combo: VirtualRecommendationResult) => void;
}

export default function VirtualRecipeView({
  combo,
  onBack,
  onAddComboToCart,
}: VirtualRecipeViewProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());

  const productHints = useMemo(
    () =>
      combo.items.map((line) => ({
        name: line.product.name,
        imageUrl: line.product.imageUrl,
      })),
    [combo.items],
  );

  const toggleCheck = (productId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[42px] px-3.5 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF5EA] text-xs font-bold text-[#252525] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>추천 목록으로</span>
        </button>

        <button
          type="button"
          onClick={() => onAddComboToCart(combo)}
          className="min-h-[42px] px-4 py-2 rounded-xl bg-[#319447] hover:bg-[#257336] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>이 조합 장바구니 담기</span>
        </button>
      </div>

      {/* Header */}
      <section className="bg-white border border-[#EAE0CC] rounded-3xl overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-5 h-52 md:h-auto bg-white p-3 flex items-center justify-center">
          <img
            src={combo.imageUrl}
            alt={combo.title}
            referrerPolicy="no-referrer"
            className="w-full h-full max-h-60 object-contain"
          />
        </div>
        <div className="md:col-span-7 p-4 sm:p-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6355]">
            <span className="font-bold text-[#319447]">상세 레시피 · 영상 가이드</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#F49A24]" /> 약 {combo.estimatedCookingMinutes}분
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#252525]">{combo.title}</h1>
          <p className="text-sm text-[#5C5549]">{combo.description}</p>

          <div className="flex flex-wrap gap-4 pt-2 text-xs text-[#4C453B]">
            <span>
              합계 <strong className="font-num text-[#252525]">{formatKRW(combo.totalPrice)}</strong>
            </span>
            <span>
              남은 잔액{' '}
              <strong className="font-num text-[#319447]">{formatKRW(combo.remainingBudget)}</strong>
            </span>
            <span>전자레인지: {combo.usesMicrowave ? '사용' : '불필요'}</span>
            <span>온수: {combo.usesHotWater ? '필요' : '불필요'}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Prep Checklist */}
        <section className="md:col-span-5 bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-5 space-y-3">
          <div>
            <h2 className="text-base font-bold text-[#252525]">구매 준비 체크리스트</h2>
            <p className="text-xs text-[#6B6355]">
              매장에서 상품을 고를 때 체크하세요 (체크는 준비 상태이며 결제 완료가 아닙니다).
            </p>
          </div>
          <div className="space-y-2">
            {combo.items.map((line) => {
              const checked = checkedIds.has(line.productId);
              return (
                <button
                  key={line.productId}
                  type="button"
                  onClick={() => toggleCheck(line.productId)}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 cursor-pointer ${
                    checked
                      ? 'bg-[#F2FBF4] border-[#B7DEC0]'
                      : 'bg-[#FFFDF9] border-[#EAE0CC]'
                  }`}
                >
                  {checked ? (
                    <CheckSquare className="w-5 h-5 text-[#319447] shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-[#9A9080] shrink-0" />
                  )}
                  <img
                    src={line.product.imageUrl}
                    alt={line.product.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 border border-[#EFE5D2] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-bold truncate ${
                        checked ? 'line-through text-[#6B6355]' : 'text-[#252525]'
                      }`}
                    >
                      {line.product.name} × {line.quantity}
                    </p>
                    <p className="text-xs font-num text-[#6B6355]">
                      {formatKRW(line.appliedLineTotal)}
                      {line.promoAppliedLabel ? ` · ${line.promoAppliedLabel}` : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step-by-Step Video Recipe */}
        <section className="md:col-span-7 bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#F49A24]" />
              <h2 className="text-base font-bold text-[#252525]">단계별 조리 영상 가이드</h2>
            </div>
            <span className="text-xs font-semibold text-[#319447]">
              총 {combo.recipe.length}단계
            </span>
          </div>

          <CookingVideoGuide
            title={combo.title}
            steps={combo.recipe}
            products={productHints}
            prepNote={combo.prepNote}
            safetyNote={combo.safetyNote}
            fallbackPoster={combo.imageUrl}
          />
        </section>
      </div>
    </div>
  );
}
