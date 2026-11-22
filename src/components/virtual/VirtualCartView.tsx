import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Minus,
  Plus,
  Receipt,
  ShoppingBag,
  Square,
  Trash2,
} from 'lucide-react';
import type {
  VirtualCartItem,
  VirtualPricedLine,
  VirtualProduct,
} from '../../types.ts';
import {
  calculateVirtualLinePricing,
  summarizeVirtualCart,
} from '../../services/virtualPricingService.ts';
import { getAvailabilityLabel } from '../../services/virtualInventoryService.ts';
import { formatKRW } from '../../utils/pricing.ts';

interface VirtualCartViewProps {
  products: VirtualProduct[];
  cartItems: VirtualCartItem[];
  budget: number;
  onChangeBudget: (nextBudget: number) => void;
  onAddProduct: (productId: string, qty?: number) => { ok: boolean; message: string };
  onUpdateQty: (productId: string, delta: number) => { ok: boolean; message: string };
  onToggleCheck: (productId: string) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCompleteVirtualPurchase: () => { ok: boolean; message: string };
  onGoExploreProducts: () => void;
}

export default function VirtualCartView({
  products,
  cartItems,
  budget,
  onChangeBudget,
  onAddProduct,
  onUpdateQty,
  onToggleCheck,
  onRemoveItem,
  onClearCart,
  onCompleteVirtualPurchase,
  onGoExploreProducts,
}: VirtualCartViewProps) {
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notice, setNotice] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const pricedLines: VirtualPricedLine[] = useMemo(() => {
    const list: VirtualPricedLine[] = [];
    for (const item of cartItems) {
      const product = productMap.get(item.productId);
      if (!product) continue;
      list.push(calculateVirtualLinePricing(product, item.quantity));
    }
    return list;
  }, [cartItems, productMap]);

  const summary = useMemo(() => summarizeVirtualCart(pricedLines, budget), [pricedLines, budget]);

  const hasStockConflict = pricedLines.some((l) => l.quantity > l.product.stockQuantity || l.product.stockQuantity <= 0);
  const checkedCount = cartItems.filter((c) => c.checked).length;

  const availableToAdd = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, searchTerm]);

  const handleQty = (productId: string, delta: number) => {
    const res = onUpdateQty(productId, delta);
    if (!res.ok) {
      setNotice({ type: 'error', text: res.message });
    } else {
      setNotice(null);
    }
  };

  const handleAdd = (productId: string) => {
    const res = onAddProduct(productId, 1);
    if (!res.ok) {
      setNotice({ type: 'error', text: res.message });
    } else {
      setNotice(null);
      setShowAddDrawer(false);
    }
  };

  const handleCheckout = () => {
    const res = onCompleteVirtualPurchase();
    if (!res.ok) {
      setNotice({ type: 'error', text: res.message });
    } else {
      setNotice(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#252525]">
            장바구니 · 예산 계산기
          </h1>
          <p className="text-xs text-[#6B6355] mt-0.5">
            가상 재고·1+1/2+1 행사 조건을 실시간 반영하여 계산합니다 (실제 결제 미지원).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddDrawer((v) => !v)}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#319447] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>상품 추가</span>
          </button>
          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="min-h-[42px] px-3.5 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF5EA] text-xs font-bold text-[#5C5549] cursor-pointer"
            >
              비우기
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{notice.text}</span>
        </div>
      )}

      {showAddDrawer && (
        <div className="bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-5 space-y-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="추가할 가상 GS25 상품명 검색..."
            className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] text-sm focus:outline-none focus:ring-2 focus:ring-[#319447]"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
            {availableToAdd.map((p) => {
              const outOfStock = p.stockQuantity <= 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => handleAdd(p.id)}
                  className="p-2.5 rounded-xl border border-[#EAE0CC] hover:border-[#319447] disabled:opacity-50 bg-[#FFFDF9] flex items-center gap-2.5 text-left cursor-pointer disabled:cursor-not-allowed"
                >
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 border border-[#EFE5D2] shrink-0"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-bold text-[#252525] truncate">{p.name}</p>
                    <p className="text-[#6B6355] font-num">
                      {formatKRW(p.regularPrice)} ·{' '}
                      {outOfStock ? '품절' : `재고 ${p.stockQuantity}개`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left: Cart Items + Prep Checklist */}
        <section className="md:col-span-7 bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#252525]">
                담긴 상품 ({pricedLines.length}종)
              </h2>
              <p className="text-xs text-[#6B6355]">
                체크리스트 {checkedCount}/{pricedLines.length}개 준비됨 (체크는 준비 상태이며 실제 결제 완료가 아닙니다)
              </p>
            </div>
          </div>

          {pricedLines.length === 0 ? (
            <div className="py-10 text-center space-y-3 border border-dashed border-[#D8CCB4] rounded-2xl bg-[#FFFDF8]">
              <ShoppingBag className="w-8 h-8 text-[#F49A24] mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#252525]">장바구니가 비어 있습니다.</p>
                <p className="text-xs text-[#6B6355]">
                  가상 매장 진열대에서 상품을 담거나 꿀조합 추천 결과를 장바구니에 추가해 보세요.
                </p>
              </div>
              <button
                type="button"
                onClick={onGoExploreProducts}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#319447] text-white text-xs font-bold cursor-pointer"
              >
                상품 보러 가기
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pricedLines.map((line) => {
                const entry = cartItems.find((c) => c.productId === line.productId);
                const checked = entry?.checked ?? false;
                const stockTooLow = line.quantity > line.product.stockQuantity;
                return (
                  <div
                    key={line.productId}
                    className={`p-3.5 rounded-2xl border transition-colors ${
                      stockTooLow
                        ? 'bg-red-50 border-red-200'
                        : checked
                          ? 'bg-[#F5FBF6] border-[#B7DEC0]'
                          : 'bg-[#FFFDF9] border-[#EAE0CC]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleCheck(line.productId)}
                        className="flex items-start gap-2.5 text-left min-w-0 flex-1 cursor-pointer"
                      >
                        {checked ? (
                          <CheckSquare className="w-5 h-5 text-[#319447] shrink-0 mt-2.5" />
                        ) : (
                          <Square className="w-5 h-5 text-[#9A9080] shrink-0 mt-2.5" />
                        )}
                        <img
                          src={line.product.imageUrl}
                          alt={line.product.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-contain bg-white p-0.5 border border-[#EFE5D2] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-bold break-words ${
                              checked ? 'line-through text-[#6B6355]' : 'text-[#252525]'
                            }`}
                          >
                            {line.product.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#756D60] mt-0.5">
                            <span>
                              {getAvailabilityLabel(line.product.availabilityStatus)} (가상{' '}
                              {line.product.stockQuantity}개)
                            </span>
                            {line.promoAppliedLabel && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-[#F49A24]">
                                  {line.promoAppliedLabel}
                                </span>
                              </>
                            )}
                          </div>
                          {stockTooLow && (
                            <p className="text-[11px] font-bold text-red-600 mt-1">
                              현재 가상 재고({line.product.stockQuantity}개)보다 많이 담겨 있습니다.
                            </p>
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(line.productId)}
                        aria-label={`${line.product.name} 삭제`}
                        className="min-w-[36px] min-h-[36px] rounded-lg text-[#8A8070] hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#EFE5D2] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQty(line.productId, -1)}
                          aria-label="수량 감소"
                          className="w-9 h-9 rounded-lg border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold font-num">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQty(line.productId, 1)}
                          aria-label="수량 증가"
                          className="w-9 h-9 rounded-lg border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right font-num">
                        {line.discountAmount > 0 && (
                          <span className="text-xs text-[#8A8070] line-through mr-1.5">
                            {formatKRW(line.regularLineTotal)}
                          </span>
                        )}
                        <span className="text-sm font-extrabold text-[#252525]">
                          {formatKRW(line.appliedLineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Budget & Virtual Checkout */}
        <section className="md:col-span-5 bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#F49A24]" />
              <h2 className="text-base font-bold text-[#252525]">가상 결제 계산서</h2>
            </div>
            <span className="text-xs text-[#756D60]">실시간 자동 계산</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFF9EF] border border-[#EFE5D2] space-y-2">
            <label htmlFor="virtual-cart-budget" className="block text-xs font-bold text-[#4C453B]">
              적용 예산 조정 (원)
            </label>
            <div className="flex items-center gap-2">
              {[3000, 5000, 7000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => onChangeBudget(amt)}
                  className={`flex-1 min-h-[36px] rounded-lg text-xs font-bold font-num border cursor-pointer ${
                    budget === amt
                      ? 'bg-[#319447] border-[#319447] text-white'
                      : 'bg-white border-[#DDD2BE] text-[#252525]'
                  }`}
                >
                  {formatKRW(amt)}
                </button>
              ))}
            </div>
            <input
              id="virtual-cart-budget"
              type="number"
              min={100}
              step={100}
              value={budget}
              onChange={(e) => {
                const next = Math.floor(Number(e.target.value) || 0);
                if (next > 0) onChangeBudget(next);
              }}
              className="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-[#DDD2BE] bg-white text-sm font-bold font-num focus:outline-none focus:ring-2 focus:ring-[#319447]"
            />
          </div>

          {summary.isOverBudget && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1"
            >
              <div className="flex items-center gap-1.5 font-bold text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>예산 초과 (+{formatKRW(summary.exceededAmount)})</span>
              </div>
              <p className="leading-relaxed">
                설정 예산({formatKRW(budget)})을 초과하여 가상 구매 완료를 진행할 수 없습니다. 수량이나 품목을 줄여 주세요.
              </p>
            </div>
          )}

          <div className="border-t border-b border-dashed border-[#D6C9B0] py-3 space-y-2 text-xs">
            {pricedLines.map((line) => (
              <div key={line.productId} className="flex items-center justify-between gap-2">
                <span className="text-[#4C453B] truncate">
                  {line.product.name} × {line.quantity}
                </span>
                <span className="font-num font-bold text-[#252525] shrink-0">
                  {formatKRW(line.appliedLineTotal)}
                </span>
              </div>
            ))}
            {pricedLines.length === 0 && (
              <p className="text-[#756D60] text-center py-1">선택된 상품 없음</p>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-[#6B6355]">
              <span>설정 예산</span>
              <span className="font-num font-bold text-[#252525]">{formatKRW(budget)}</span>
            </div>
            <div className="flex items-center justify-between text-[#6B6355]">
              <span>상품 정가 합계</span>
              <span className="font-num">{formatKRW(summary.regularTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[#F49A24] font-semibold">
              <span>가상 행사 할인액</span>
              <span className="font-num">-{formatKRW(summary.totalDiscount)}</span>
            </div>
            <div className="pt-2 border-t border-[#EFE5D2] flex items-center justify-between">
              <span className="font-bold text-[#252525]">최종 예상 금액</span>
              <span className="font-num text-xl font-extrabold text-[#252525]">
                {formatKRW(summary.finalTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#5C5549]">남은 잔액</span>
              <span
                className={`font-num text-base font-extrabold ${
                  summary.isOverBudget ? 'text-red-600' : 'text-[#319447]'
                }`}
              >
                {summary.isOverBudget
                  ? `${formatKRW(summary.exceededAmount)} 초과`
                  : `${formatKRW(summary.remainingBudget)} 남음`}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={pricedLines.length === 0 || summary.isOverBudget || hasStockConflict}
            onClick={handleCheckout}
            className="w-full min-h-[50px] px-4 py-3 rounded-2xl bg-[#319447] hover:bg-[#257336] disabled:bg-[#D5CEBF] disabled:text-[#6B6355] text-white text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>가상 구매 완료</span>
          </button>

          <p className="text-[11px] text-[#756D60] leading-relaxed text-center">
            실제 카드·현금 결제 및 GS25 주문 시스템과는 연동되지 않으며, 완료 시 앱 내 가상 재고만 차감됩니다.
          </p>
        </section>
      </div>
    </div>
  );
}
