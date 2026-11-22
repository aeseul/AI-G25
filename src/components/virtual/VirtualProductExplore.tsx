import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  Eye,
  Flame,
  RotateCcw,
  Search,
  ShoppingCart,
  X,
} from 'lucide-react';
import type { VirtualCategory, VirtualProduct } from '../../types.ts';
import { VIRTUAL_CATEGORIES } from '../../data/virtualProductData.ts';
import { getAvailabilityLabel } from '../../services/virtualInventoryService.ts';
import { formatKRW } from '../../utils/pricing.ts';

interface VirtualProductExploreProps {
  products: VirtualProduct[];
  initialPromoOnly?: boolean;
  selectedCategoryFilter: VirtualCategory | '전체';
  onChangeCategoryFilter: (cat: VirtualCategory | '전체') => void;
  cartQuantities: Record<string, number>;
  onAddToCart: (productId: string, qty?: number) => { ok: boolean; message: string };
  onResetInventory: () => void;
}

export default function VirtualProductExplore({
  products,
  initialPromoOnly = false,
  selectedCategoryFilter,
  onChangeCategoryFilter,
  cartQuantities,
  onAddToCart,
  onResetInventory,
}: VirtualProductExploreProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyPromo, setOnlyPromo] = useState(initialPromoOnly);
  const [detailProduct, setDetailProduct] = useState<VirtualProduct | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (selectedCategoryFilter !== '전체' && p.category !== selectedCategoryFilter) return false;
      if (onlyInStock && p.stockQuantity <= 0) return false;
      if (onlyPromo && p.promotionType === 'NONE') return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    if (sortOrder === 'price_asc') {
      return [...list].sort((a, b) => a.regularPrice - b.regularPrice);
    }
    if (sortOrder === 'price_desc') {
      return [...list].sort((a, b) => b.regularPrice - a.regularPrice);
    }
    return list;
  }, [products, selectedCategoryFilter, onlyInStock, onlyPromo, searchQuery, sortOrder]);

  const handleAdd = (productId: string) => {
    const res = onAddToCart(productId, 1);
    setFeedback({ type: res.ok ? 'success' : 'error', text: res.message });
    window.setTimeout(() => {
      setFeedback((cur) => (cur?.text === res.message ? null : cur));
    }, 3000);
  };

  return (
    <div className="space-y-5">
      {/* Header & Virtual Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#252525]">
            {onlyPromo ? '가상 1+1 · 2+1 행사 상품' : '가상 GS25 상품 진열대'}
          </h1>
          <p className="text-xs text-[#6B6355] mt-0.5">
            표시되는 가격·행사·재고 수량은 테스트용 가상 시뮬레이션 데이터입니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onResetInventory();
            setFeedback({ type: 'success', text: '가상 매장 재고가 초기 수량으로 복원되었습니다.' });
          }}
          className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF5EA] text-xs font-bold text-[#4C453B] inline-flex items-center gap-1.5 self-start cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>가상 재고 초기화</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-2xl text-xs font-semibold border flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-[#F2FBF4] border-[#319447]/40 text-[#226631]'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8B8172] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="상품명 검색 (예: 불닭, 삼각김밥, 바나나우유)"
              className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] text-sm focus:outline-none focus:ring-2 focus:ring-[#319447]"
            />
          </div>

          <select
            aria-label="가격 정렬"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DDD2BE] bg-white text-xs font-bold text-[#252525] cursor-pointer"
          >
            <option value="default">기본 진열 순</option>
            <option value="price_asc">가격 낮은 순</option>
            <option value="price_desc">가격 높은 순</option>
          </select>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onChangeCategoryFilter('전체')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
              selectedCategoryFilter === '전체'
                ? 'bg-[#252525] text-white'
                : 'bg-[#FAF6EC] text-[#554E43] hover:bg-[#EFE5D2]'
            }`}
          >
            전체
          </button>
          {VIRTUAL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onChangeCategoryFilter(cat)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                selectedCategoryFilter === cat
                  ? 'bg-[#252525] text-white'
                  : 'bg-[#FAF6EC] text-[#554E43] hover:bg-[#EFE5D2]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Stock & Promo Toggles */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#F0E7D6]">
          <button
            type="button"
            onClick={() => setOnlyInStock((v) => !v)}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
              onlyInStock
                ? 'bg-[#F2FBF4] border-[#319447] text-[#226631]'
                : 'bg-white border-[#DDD2BE] text-[#5C5549]'
            }`}
          >
            {onlyInStock ? '✓ 재고 있는 상품만 보기' : '재고 있는 상품만 보기'}
          </button>
          <button
            type="button"
            onClick={() => setOnlyPromo((v) => !v)}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
              onlyPromo
                ? 'bg-[#FFF6E8] border-[#F49A24] text-[#9A5B0B]'
                : 'bg-white border-[#DDD2BE] text-[#5C5549]'
            }`}
          >
            {onlyPromo ? '✓ 행사 상품만 보기 (1+1·2+1)' : '행사 상품만 보기'}
          </button>
        </div>
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="bg-white border border-dashed border-[#D8CCB4] rounded-3xl p-8 text-center space-y-3">
          <p className="text-sm font-bold text-[#252525]">가상 상품 목록이 비어 있습니다.</p>
          <button
            type="button"
            onClick={onResetInventory}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#319447] text-white text-xs font-bold cursor-pointer"
          >
            샘플 상품 데이터 초기화
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-dashed border-[#D8CCB4] rounded-3xl p-8 text-center space-y-2">
          <p className="text-sm font-bold text-[#252525]">조건에 맞는 가상 상품이 없습니다.</p>
          <p className="text-xs text-[#6B6355]">검색어나 카테고리·필터 조건을 변경해 보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const inCartQty = cartQuantities[product.id] ?? 0;
            const isOutOfStock = product.stockQuantity <= 0;
            const maxReached = inCartQty >= product.stockQuantity;
            const stockLabel = getAvailabilityLabel(product.availabilityStatus);

            return (
              <article
                key={product.id}
                className="bg-white border border-[#EAE0CC] rounded-2xl p-4 flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start gap-3.5">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-xl object-contain bg-white p-1 border border-[#EFE5D2] shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-[#6B6355]">
                      <span className="truncate">
                        {product.category} · {product.id}
                      </span>
                      {product.promotionType !== 'NONE' && (
                        <span className="font-extrabold text-[#F49A24] shrink-0">
                          {product.promotionType} 행사
                        </span>
                      )}
                    </div>

                    <h2 className="text-base font-extrabold text-[#252525] truncate">
                      {product.name}
                    </h2>

                    <p className="text-lg font-extrabold font-num text-[#252525]">
                      {formatKRW(product.regularPrice)}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span
                        className={`font-bold ${
                          product.availabilityStatus === 'OUT_OF_STOCK'
                            ? 'text-red-600'
                            : product.availabilityStatus === 'LOW_STOCK'
                              ? 'text-[#F49A24]'
                              : 'text-[#319447]'
                        }`}
                      >
                        {stockLabel} · 가상 {product.stockQuantity}개
                      </span>
                      {inCartQty > 0 && (
                        <>
                          <span aria-hidden="true" className="text-[#9A9080]">
                            ·
                          </span>
                          <span className="font-semibold text-[#252525]">
                            장바구니 {inCartQty}개
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {product.promotionDescription && (
                  <p className="text-xs text-[#9A5B0B] bg-[#FFF8EB] rounded-xl px-3 py-2 leading-relaxed">
                    {product.promotionDescription}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDetailProduct(product)}
                    className="shrink-0 min-h-[42px] px-3 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF5EA] text-xs font-bold text-[#252525] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span>상세</span>
                  </button>
                  <button
                    type="button"
                    disabled={isOutOfStock || maxReached}
                    onClick={() => handleAdd(product.id)}
                    className="flex-1 min-w-0 min-h-[42px] px-3 py-2 rounded-xl bg-[#319447] hover:bg-[#257336] disabled:bg-[#D5CEBF] disabled:text-[#6B6355] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {isOutOfStock
                        ? '품절'
                        : maxReached
                          ? '가상 재고 한도 도달'
                          : '장바구니 담기'}
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {detailProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${detailProduct.name} 상세 정보`}
          className="fixed inset-0 z-50 bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="bg-white border border-[#EAE0CC] rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-[#6B6355]">
                  GS25 가상 상품 ({detailProduct.id}) · {detailProduct.category}
                </p>
                <h2 className="text-lg font-extrabold text-[#252525] break-words">
                  {detailProduct.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                aria-label="상세 닫기"
                className="w-9 h-9 rounded-xl border border-[#EAE0CC] flex items-center justify-center text-[#5C5549] hover:bg-[#FAF4E6] shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3.5 sm:gap-4">
              <img
                src={detailProduct.imageUrl}
                alt={detailProduct.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-contain bg-white p-1.5 border border-[#EFE5D2] shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <p className="text-xl font-extrabold font-num text-[#252525]">
                  {formatKRW(detailProduct.regularPrice)}
                </p>
                <p className="text-xs font-bold text-[#319447]">
                  {getAvailabilityLabel(detailProduct.availabilityStatus)} · 가상 재고{' '}
                  {detailProduct.stockQuantity}개
                </p>
                <p className="text-xs text-[#6B6355]">
                  {detailProduct.promotionType !== 'NONE'
                    ? detailProduct.promotionDescription
                    : '행사 없음 (정상가 적용)'}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#4C453B] leading-relaxed">{detailProduct.description}</p>

            <div className="p-3.5 rounded-2xl bg-[#FFF9EF] border border-[#EFE5D2] space-y-1.5 text-xs text-[#554E43]">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#319447]" />
                <span>예상 조리: {detailProduct.estimatedPrepMinutes}분</span>
                <span aria-hidden="true">·</span>
                <Flame className="w-3.5 h-3.5 text-[#F49A24]" />
                <span>
                  {detailProduct.isMicrowaveSuitable ? '전자레인지 가능' : '전자레인지 불필요'}
                </span>
              </div>
              <p>온수 필요 여부: {detailProduct.requiresHotWater ? '온수 필요' : '온수 불필요'}</p>
              <p>맛 태그: {detailProduct.tasteTags.join(', ')}</p>
              <p>
                영양 정보:{' '}
                {detailProduct.nutrition
                  ? `${detailProduct.nutrition.calories}kcal · 단백질 ${detailProduct.nutrition.proteinGrams}g (${detailProduct.nutrition.verifiedSource})`
                  : '미등록 (영양 수치 추정 안 함)'}
              </p>
            </div>

            <p className="text-[11px] text-[#756D60]">
              데이터 출처: DEMO · 실제 매장 판매 여부 및 재고와 무관한 테스트 데이터입니다.
            </p>

            <button
              type="button"
              disabled={
                detailProduct.stockQuantity <= 0 ||
                (cartQuantities[detailProduct.id] ?? 0) >= detailProduct.stockQuantity
              }
              onClick={() => {
                handleAdd(detailProduct.id);
                setDetailProduct(null);
              }}
              className="w-full min-h-[46px] rounded-xl bg-[#319447] hover:bg-[#257336] disabled:bg-[#D5CEBF] text-white text-sm font-bold cursor-pointer disabled:cursor-not-allowed"
            >
              {detailProduct.stockQuantity <= 0 ? '품절된 상품입니다' : '장바구니에 담기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
