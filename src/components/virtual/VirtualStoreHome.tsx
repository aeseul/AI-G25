import React from 'react';
import {
  ArrowRight,
  Flame,
  Info,
  Package,
  ShoppingCart,
  Sparkles,
  Tag,
  Utensils,
} from 'lucide-react';
import type {
  VirtualCategory,
  VirtualProduct,
  VirtualRecommendationResult,
  VirtualStoreMeta,
  VirtualStoreTab,
} from '../../types.ts';
import { VIRTUAL_CATEGORIES } from '../../data/virtualProductData.ts';
import { formatKRW } from '../../utils/pricing.ts';

interface VirtualStoreHomeProps {
  storeMeta: VirtualStoreMeta;
  budget: number;
  products: VirtualProduct[];
  featuredCombo: VirtualRecommendationResult | null;
  cartItemCount: number;
  onNavigateTab: (tab: VirtualStoreTab) => void;
  onSelectCategory: (category: VirtualCategory) => void;
  onOpenRecipe: (combo: VirtualRecommendationResult) => void;
  onAddComboToCart: (combo: VirtualRecommendationResult) => void;
}

export default function VirtualStoreHome({
  storeMeta,
  budget,
  products,
  featuredCombo,
  cartItemCount,
  onNavigateTab,
  onSelectCategory,
  onOpenRecipe,
  onAddComboToCart,
}: VirtualStoreHomeProps) {
  const promoCount = products.filter((p) => p.promotionType !== 'NONE').length;
  const inStockCount = products.filter((p) => p.stockQuantity > 0).length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="bg-white border border-[#EAE0CC] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6355]">
          <span className="font-extrabold text-[#007CFF]">GS25</span>
          <span aria-hidden="true">·</span>
          <span className="font-bold text-[#252525]">{storeMeta.displayName}</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-[#319447]">{storeMeta.statusText}</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#252525]">
            어서 오세요! 오늘은 {formatKRW(budget)}으로 어떤 한 끼를 만들어볼까요?
          </h1>
          <p className="text-sm text-[#5C5549] leading-relaxed">
            5,000원의 선택을 더 쉽고, 맛있게! 선택한 매장을 기준으로 구성된 가상 GS25 공간에서 상품을 둘러보고, 행사 혜택과 예산에 맞는 꿀조합을 체험해 보세요.
          </p>
        </div>

        {/* Virtual Data Disclosure */}
        <div className="p-3.5 rounded-2xl bg-[#FFF6E8] border border-[#F49A24]/35 flex items-start gap-2.5 text-xs text-[#66410B]">
          <Info className="w-4 h-4 text-[#F49A24] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>가상 매장 안내 ({storeMeta.storeId}):</strong> {storeMeta.noticeText} 앞 화면에서 선택한 매장명({storeMeta.displayName})을 기준으로 체험하며, 실제 GS25 매장의 실재고·결제 시스템과는 연동되지 않습니다.
          </p>
        </div>
      </section>

      {/* 4 Main Action Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onNavigateTab('products')}
          className="bg-white border border-[#EAE0CC] hover:border-[#319447] rounded-2xl p-4 sm:p-5 text-left space-y-2.5 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[#F2FBF4] text-[#319447] flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-[#252525]">전체 상품 보기</p>
            <p className="text-xs text-[#6B6355] mt-0.5">
              구매 가능 {inStockCount}종 / 전체 {products.length}종
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('promos')}
          className="bg-white border border-[#EAE0CC] hover:border-[#F49A24] rounded-2xl p-4 sm:p-5 text-left space-y-2.5 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FFF6E8] text-[#F49A24] flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-[#252525]">1+1·2+1 행사 보기</p>
            <p className="text-xs text-[#6B6355] mt-0.5">진행 중 가상 행사 {promoCount}종</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('recommend')}
          className="bg-[#319447] hover:bg-[#257336] text-white rounded-2xl p-4 sm:p-5 text-left space-y-2.5 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold">AI 꿀조합 찾기</p>
            <p className="text-xs text-white/85 mt-0.5">예산 {formatKRW(budget)} 맞춤 추천</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('cart')}
          className="bg-white border border-[#EAE0CC] hover:border-[#252525] rounded-2xl p-4 sm:p-5 text-left space-y-2.5 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FAF4E6] text-[#252525] flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-[#252525]">내 장바구니</p>
            <p className="text-xs text-[#6B6355] mt-0.5 font-num">담긴 상품 {cartItemCount}개</p>
          </div>
        </button>
      </section>

      {/* Today's Featured Combo */}
      {featuredCombo && (
        <section className="bg-white border border-[#EAE0CC] rounded-3xl overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-5 relative h-48 md:h-auto bg-[#FAF5EA]">
            <img
              src={featuredCombo.imageUrl}
              alt={featuredCombo.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="md:col-span-7 p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6355]">
                <span className="font-bold text-[#F49A24] inline-flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> 오늘의 추천 데모 조합
                </span>
                <span aria-hidden="true">·</span>
                <span>약 {featuredCombo.estimatedCookingMinutes}분 조리</span>
              </div>
              <h2 className="text-xl font-extrabold text-[#252525]">{featuredCombo.title}</h2>
              <p className="text-sm text-[#5C5549]">{featuredCombo.description}</p>

              <div className="pt-2 space-y-1 text-xs text-[#4C453B]">
                {featuredCombo.items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between gap-2">
                    <span>
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="font-num font-bold text-[#252525]">
                      {formatKRW(item.appliedLineTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0E7D6] flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#6B6355]">예상 합계 (잔액 {formatKRW(featuredCombo.remainingBudget)})</p>
                <p className="text-lg font-extrabold font-num text-[#319447]">
                  {formatKRW(featuredCombo.totalPrice)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpenRecipe(featuredCombo)}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] text-xs font-bold text-[#252525] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Utensils className="w-3.5 h-3.5 text-[#319447]" />
                  <span>상세 레시피</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddComboToCart(featuredCombo)}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#319447] hover:bg-[#257336] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>장바구니 담기</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category Shortcuts */}
      <section className="bg-white border border-[#EAE0CC] rounded-3xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#252525]">카테고리 바로가기</h2>
          <button
            type="button"
            onClick={() => onNavigateTab('products')}
            className="text-xs font-bold text-[#319447] inline-flex items-center gap-1 cursor-pointer"
          >
            <span>전체 보기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {VIRTUAL_CATEGORIES.map((category) => {
            const count = products.filter((p) => p.category === category).length;
            return (
              <button
                key={category}
                type="button"
                onClick={() => onSelectCategory(category)}
                className="min-h-[56px] px-3 py-2.5 rounded-2xl border border-[#EAE0CC] bg-[#FFFDF9] hover:border-[#319447] hover:bg-[#F2FBF4] text-center transition-colors cursor-pointer"
              >
                <p className="text-sm font-bold text-[#252525]">{category}</p>
                <p className="text-[11px] text-[#756D60] font-num mt-0.5">{count}개</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
