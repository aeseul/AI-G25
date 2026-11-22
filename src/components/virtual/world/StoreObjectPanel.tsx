import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  DoorOpen,
  Flame,
  Info,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  VirtualCartItem,
  VirtualPricedLine,
  VirtualProduct,
  VirtualStoreMeta,
  VirtualStoreTab,
} from '../../../types.ts';
import {
  VIRTUAL_STORE_ZONES,
  type StoreZoneId,
} from '../../../data/virtualStoreWorldData.ts';
import { getAvailabilityLabel } from '../../../services/virtualInventoryService.ts';
import {
  calculateVirtualLinePricing,
  summarizeVirtualCart,
} from '../../../services/virtualPricingService.ts';
import { formatKRW } from '../../../utils/pricing.ts';

interface StoreObjectPanelProps {
  zoneId: StoreZoneId;
  storeMeta: VirtualStoreMeta;
  products: VirtualProduct[];
  cartItems: VirtualCartItem[];
  budget: number;
  onClose: () => void;
  onAddToCart: (productId: string, qty: number) => { ok: boolean; message: string };
  onUpdateCartQty: (productId: string, delta: number) => { ok: boolean; message: string };
  onRemoveCartItem: (productId: string) => void;
  onCompleteVirtualPurchase: () => { ok: boolean; message: string };
  onNavigateTab: (tab: VirtualStoreTab) => void;
  onViewExterior: () => void;
  onExitVirtualStore: () => void;
}

export default function StoreObjectPanel({
  zoneId,
  storeMeta,
  products,
  cartItems,
  budget,
  onClose,
  onAddToCart,
  onUpdateCartQty,
  onRemoveCartItem,
  onCompleteVirtualPurchase,
  onNavigateTab,
  onViewExterior,
  onExitVirtualStore,
}: StoreObjectPanelProps) {
  const zoneMeta = VIRTUAL_STORE_ZONES[zoneId];
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const zoneProducts = useMemo(
    () =>
      zoneMeta.productIds
        .map((id) => productMap.get(id))
        .filter((p): p is VirtualProduct => Boolean(p)),
    [zoneMeta.productIds, productMap],
  );

  const pricedLines: VirtualPricedLine[] = useMemo(() => {
    const list: VirtualPricedLine[] = [];
    for (const item of cartItems) {
      const product = productMap.get(item.productId);
      if (product) list.push(calculateVirtualLinePricing(product, item.quantity));
    }
    return list;
  }, [cartItems, productMap]);

  const cartSummary = useMemo(
    () => summarizeVirtualCart(pricedLines, budget),
    [pricedLines, budget],
  );

  const getDraftQty = (product: VirtualProduct) => {
    const raw = qtyDrafts[product.id] ?? 1;
    if (product.stockQuantity <= 0) return 0;
    return Math.max(1, Math.min(product.stockQuantity, raw));
  };

  const changeDraftQty = (product: VirtualProduct, delta: number) => {
    const current = getDraftQty(product);
    const next = Math.max(1, Math.min(Math.max(1, product.stockQuantity), current + delta));
    setQtyDrafts((prev) => ({ ...prev, [product.id]: next }));
  };

  const handleAddProduct = (product: VirtualProduct) => {
    const qty = getDraftQty(product);
    const result = onAddToCart(product.id, qty);
    if (result.ok) {
      setFeedback({ type: 'ok', text: `장바구니에 담았어요! (${product.name} × ${qty})` });
      setQtyDrafts((prev) => ({ ...prev, [product.id]: 1 }));
    } else {
      setFeedback({ type: 'error', text: result.message });
    }
  };

  const handleQuickCheckout = () => {
    const result = onCompleteVirtualPurchase();
    if (!result.ok) {
      setFeedback({ type: 'error', text: result.message });
    }
  };

  const panelBody = (
    <div className="bg-white border border-[#EAE0CC] rounded-t-3xl lg:rounded-3xl shadow-lg lg:shadow-xs flex flex-col max-h-[78vh] lg:max-h-[620px] overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-[#F0E7D6] bg-[#FFFDF8] flex items-start justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-[#319447]">가상 GS25 코너 상세</p>
          <h2 className="text-lg font-extrabold text-[#252525] truncate">{zoneMeta.title}</h2>
          <p className="text-xs text-[#6B6355] mt-0.5 leading-relaxed">{zoneMeta.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="코너 패널 닫기"
          className="w-9 h-9 rounded-xl border border-[#E5DAC4] bg-white hover:bg-[#FAF4E6] flex items-center justify-center text-[#5C5549] shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`mx-4 mt-3 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 ${
            feedback.type === 'ok'
              ? 'bg-[#F2FBF4] border border-[#319447]/35 text-[#226631]'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Scrollable Body */}
      <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
        {/* Entrance Zone */}
        {zoneId === 'entrance' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-[#FFF6E8] border border-[#F49A24]/30 text-xs text-[#66410B] space-y-1.5">
              <p className="font-bold">
                {storeMeta.displayName} ({storeMeta.storeId})
              </p>
              <p className="leading-relaxed">{storeMeta.noticeText}</p>
            </div>
            <button
              type="button"
              onClick={onViewExterior}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] text-xs font-bold text-[#252525] inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <DoorOpen className="w-4 h-4 text-[#319447]" />
              <span>매장 입구 화면 다시 보기</span>
            </button>
            <button
              type="button"
              onClick={onExitVirtualStore}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#252525] text-white text-xs font-bold cursor-pointer"
            >
              실제 주변 매장 선택으로 돌아가기
            </button>
          </div>
        )}

        {/* Microwave & Hot Water Zone */}
        {zoneId === 'microwave' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-[#FFF6E8] border border-[#F49A24]/35 text-xs text-[#66410B] flex items-start gap-2">
              <Flame className="w-4 h-4 text-[#F49A24] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>조리 안전 안내:</strong> 조리 시간과 용기 전자레인지 가능 여부는 반드시 실제 상품 포장지의 안내를 우선 확인해 주세요.
              </p>
            </div>

            {zoneProducts.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-2xl border border-[#EAE0CC] bg-[#FFFDF9] flex items-center gap-3"
              >
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-xl object-contain bg-white p-0.5 border border-[#EFE5D2] shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-bold text-[#252525] truncate">{p.name}</p>
                  <p className="text-[11px] text-[#5C5549]">
                    {p.isMicrowaveSuitable ? '전자레인지 가능' : '가열 비권장'} ·{' '}
                    {p.requiresHotWater ? '온수 필요' : '온수 불필요'} · 약 {p.estimatedPrepMinutes}분
                  </p>
                </div>
                <button
                  type="button"
                  disabled={p.stockQuantity <= 0}
                  onClick={() => handleAddProduct(p)}
                  className="min-h-[36px] px-3 rounded-xl bg-[#319447] hover:bg-[#257336] disabled:bg-[#D5CEBF] text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  담기
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => onNavigateTab('recommend')}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#252525] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#FFD65A]" />
              <span>조리 조건 맞춰 꿀조합 추천받기</span>
            </button>
          </div>
        )}

        {/* Checkout & Basket Zone */}
        {(zoneId === 'checkout' || zoneId === 'basket') && (
          <div className="space-y-3">
            {pricedLines.length === 0 ? (
              <div className="py-8 text-center space-y-2 border border-dashed border-[#D8CCB4] rounded-2xl bg-[#FFFDF8]">
                <ShoppingCart className="w-7 h-7 text-[#F49A24] mx-auto" />
                <p className="text-sm font-bold text-[#252525]">장바구니가 비어 있어요</p>
                <p className="text-xs text-[#6B6355]">
                  라면 코너, 음료 냉장고, 행사 코너를 눌러 상품을 담아보세요.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {pricedLines.map((line) => (
                    <div
                      key={line.productId}
                      className="p-3 rounded-2xl border border-[#EAE0CC] bg-[#FFFDF9] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#252525] truncate">
                            {line.product.name}
                          </p>
                          {line.promoAppliedLabel && (
                            <p className="text-[11px] font-semibold text-[#F49A24]">
                              {line.promoAppliedLabel}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label={`${line.product.name} 삭제`}
                          onClick={() => onRemoveCartItem(line.productId)}
                          className="p-1.5 rounded-lg text-[#8A8070] hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label="수량 감소"
                            onClick={() => {
                              const r = onUpdateCartQty(line.productId, -1);
                              if (!r.ok) setFeedback({ type: 'error', text: r.message });
                            }}
                            className="w-8 h-8 rounded-lg border border-[#DDD2BE] bg-white flex items-center justify-center cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold font-num">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="수량 증가"
                            onClick={() => {
                              const r = onUpdateCartQty(line.productId, 1);
                              if (!r.ok) setFeedback({ type: 'error', text: r.message });
                            }}
                            className="w-8 h-8 rounded-lg border border-[#DDD2BE] bg-white flex items-center justify-center cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="font-num text-right">
                          {line.discountAmount > 0 && (
                            <span className="text-[11px] text-[#8A8070] line-through mr-1">
                              {formatKRW(line.regularLineTotal)}
                            </span>
                          )}
                          <span className="text-sm font-extrabold text-[#252525]">
                            {formatKRW(line.appliedLineTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Box */}
                <div className="p-3.5 rounded-2xl bg-[#FFF9EF] border border-[#EFE5D2] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#5C5549]">
                    <span>설정 예산</span>
                    <span className="font-num font-bold text-[#252525]">{formatKRW(budget)}</span>
                  </div>
                  {cartSummary.totalDiscount > 0 && (
                    <div className="flex justify-between text-[#F49A24] font-semibold">
                      <span>가상 행사 할인</span>
                      <span className="font-num">-{formatKRW(cartSummary.totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-extrabold text-[#252525] pt-1 border-t border-[#EAE0CC]">
                    <span>총 예상 금액</span>
                    <span className="font-num">{formatKRW(cartSummary.finalTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-[#5C5549]">남은 잔액</span>
                    <span
                      className={`font-num ${
                        cartSummary.isOverBudget ? 'text-red-600' : 'text-[#319447]'
                      }`}
                    >
                      {cartSummary.isOverBudget
                        ? `${formatKRW(cartSummary.exceededAmount)} 초과`
                        : `${formatKRW(cartSummary.remainingBudget)} 남음`}
                    </span>
                  </div>
                </div>

                {cartSummary.isOverBudget && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700"
                  >
                    예산을 초과해 가상 구매를 완료할 수 없습니다. 수량을 줄이거나 예산을 조정해 주세요.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={cartSummary.isOverBudget}
                    onClick={handleQuickCheckout}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#319447] hover:bg-[#257336] disabled:bg-[#D5CEBF] text-white text-xs font-extrabold cursor-pointer disabled:cursor-not-allowed"
                  >
                    가상 구매 완료
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('cart')}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] text-xs font-bold text-[#252525] cursor-pointer"
                  >
                    전체 계산기 보기
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Product Shelf Zones (ramen, fridge, dairy, promo, snacks) */}
        {zoneProducts.length > 0 && zoneId !== 'microwave' && (
          <div className="space-y-3">
            {zoneId === 'promo' && (
              <div className="p-3 rounded-2xl bg-[#FFF6E8] border border-[#F49A24]/35 flex items-start gap-2 text-[11px] text-[#66410B]">
                <Info className="w-4 h-4 text-[#F49A24] shrink-0 mt-0.5" />
                <span>
                  1+1·2+1 행사는 앱 테스트용 예시 데이터이며 실제 GS25 점포 행사와 다를 수 있습니다.
                </span>
              </div>
            )}

            {zoneProducts.map((product) => {
              const draftQty = getDraftQty(product);
              const outOfStock = product.stockQuantity <= 0;
              const previewPricing = calculateVirtualLinePricing(
                product,
                Math.max(1, draftQty),
              );
              const stockLabel = getAvailabilityLabel(product.availabilityStatus);

              return (
                <div
                  key={product.id}
                  className="p-3.5 rounded-2xl border border-[#EAE0CC] bg-[#FFFDF9] space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-contain bg-white p-1 border border-[#EFE5D2] shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-[#6B6355]">
                          {product.category} · DEMO
                        </span>
                        {product.promotionType !== 'NONE' && (
                          <span className="font-extrabold text-[#F49A24]">
                            가상 {product.promotionType}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold text-[#252525]">{product.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-num font-extrabold text-[#252525]">
                          {formatKRW(product.regularPrice)}
                        </span>
                        <span aria-hidden="true" className="text-[#9A9080]">
                          ·
                        </span>
                        <span
                          className={`font-bold ${
                            outOfStock
                              ? 'text-red-600'
                              : product.stockQuantity <= 4
                                ? 'text-[#F49A24]'
                                : 'text-[#319447]'
                          }`}
                        >
                          {stockLabel} ({product.stockQuantity}개)
                        </span>
                      </div>
                      {product.promotionDescription && (
                        <p className="text-[11px] font-semibold text-[#C97812]">
                          {product.promotionDescription}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stepper + Add to Cart */}
                  <div className="pt-2 border-t border-[#EFE5D2] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={outOfStock || draftQty <= 1}
                        onClick={() => changeDraftQty(product, -1)}
                        aria-label={`${product.name} 수량 감소`}
                        className="w-8 h-8 rounded-lg border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] disabled:opacity-40 flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold font-num">
                        {draftQty}개
                      </span>
                      <button
                        type="button"
                        disabled={outOfStock || draftQty >= product.stockQuantity}
                        onClick={() => changeDraftQty(product, 1)}
                        aria-label={`${product.name} 수량 증가`}
                        className="w-8 h-8 rounded-lg border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] disabled:opacity-40 flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={outOfStock}
                      onClick={() => handleAddProduct(product)}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#319447] hover:bg-[#257336] disabled:bg-[#D5CEBF] disabled:text-[#6B6355] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>
                        {outOfStock
                          ? '품절'
                          : `장바구니 담기 (${formatKRW(previewPricing.appliedLineTotal)})`}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Side Panel */}
      <aside
        aria-label={`${zoneMeta.title} 상세 패널`}
        className="hidden lg:block w-full"
      >
        {panelBody}
      </aside>

      {/* Mobile Bottom Sheet / Tablet Centered Drawer */}
      <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center md:p-6">
        <button
          type="button"
          aria-label="배경 눌러 닫기"
          onClick={onClose}
          className="flex-1 md:fixed md:inset-0 bg-black/40 cursor-default"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoneMeta.title}
          className="relative z-10 w-full md:max-w-lg pb-safe"
        >
          {panelBody}
        </div>
      </div>
    </>
  );
}
