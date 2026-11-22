import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Check,
  CheckSquare,
  Clock,
  Flame,
  Minus,
  Plus,
  Receipt,
  Share2,
  Square,
  Trash2,
} from 'lucide-react';
import type { ChecklistItem, Product, VerifiedRecommendation } from '../types.ts';
import { GS25_SAMPLE_PRODUCTS } from '../data/gs25SampleCatalog.ts';
import { calculateLinePricing, formatKRW, summarizeBudget } from '../utils/pricing.ts';
import { getProductImageUrl } from '../utils/productImages.ts';
import CookingVideoGuide from './CookingVideoGuide.tsx';
import WoodongsLinkCard from './WoodongsLinkCard.tsx';

interface RecipeChecklistScreenProps {
  combo: VerifiedRecommendation;
  storeName?: string | null;
  budget: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onBack: () => void;
}

export default function RecipeChecklistScreen({
  combo,
  storeName,
  budget,
  isFavorite,
  onToggleFavorite,
  onBack,
}: RecipeChecklistScreenProps) {
  const [items, setItems] = useState<ChecklistItem[]>(() =>
    combo.items.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      checked: false,
    })),
  );
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [shareFeedback, setShareFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const lineResults = useMemo(
    () => items.map((entry) => calculateLinePricing(entry.product, entry.quantity)),
    [items],
  );

  const summary = useMemo(
    () => summarizeBudget(lineResults, budget),
    [lineResults, budget],
  );

  const availableToAdd = useMemo(() => {
    const existingIds = new Set(items.map((i) => i.product.productId));
    return GS25_SAMPLE_PRODUCTS.filter((p) => {
      if (existingIds.has(p.productId)) return false;
      if (!addSearch.trim()) return true;
      return p.name.toLowerCase().includes(addSearch.trim().toLowerCase());
    });
  }, [items, addSearch]);

  const handleToggleCheck = (productId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.productId === productId ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.productId !== productId) return item;
        const nextQty = Math.max(1, Math.min(10, item.quantity + delta));
        return { ...item, quantity: nextQty };
      }),
    );
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.productId !== productId));
  };

  const handleAddProduct = (product: Product) => {
    setItems((prev) => [...prev, { product, quantity: 1, checked: false }]);
    setShowAddDrawer(false);
    setAddSearch('');
  };

  const checkedCount = items.filter((i) => i.checked).length;

  const buildShareText = () => {
    const itemLines = lineResults.map((line) => {
      const priceText = line.priceUnknown ? '가격 확인 필요' : formatKRW(line.appliedLineTotal);
      return `• ${line.product.name} × ${line.quantity} (${priceText})`;
    });
    const budgetStatusLine = summary.isOverBudget
      ? `예산 ${formatKRW(budget)} 대비 +${formatKRW(summary.exceededAmount)} 초과`
      : `예산 ${formatKRW(budget)} · 남은 잔액 ${formatKRW(summary.remainingBudget)}`;

    return [
      `[AI 편의점 꿀조합 큐레이터] ${combo.title}`,
      ...(itemLines.length > 0 ? itemLines : ['• 선택된 상품 없음']),
      `총 예상 금액: ${formatKRW(summary.finalTotal)} (${budgetStatusLine})`,
      `조리 시간: 약 ${combo.estimatedCookingMinutes}분`,
    ].join('\n');
  };

  const showTimedFeedback = (type: 'success' | 'error', message: string) => {
    setShareFeedback({ type, message });
    window.setTimeout(() => {
      setShareFeedback((current) => (current?.message === message ? null : current));
    }, 3500);
  };

  const handleShare = async () => {
    const shareText = buildShareText();

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${combo.title} · AI 편의점 꿀조합`,
          text: shareText,
        });
        showTimedFeedback('success', '추천 조합 정보를 공유했습니다.');
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Fall through to clipboard copy if native share is unavailable in iframe
      }
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        showTimedFeedback(
          'success',
          '조합 내용과 총액이 클립보드에 복사되었습니다. 메신저나 SNS에 붙여넣어 공유해 보세요!',
        );
        return;
      }
    } catch {
      // Fall through to textarea copy fallback
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (copied) {
        showTimedFeedback(
          'success',
          '조합 내용과 총액이 클립보드에 복사되었습니다. 메신저나 SNS에 붙여넣어 공유해 보세요!',
        );
      } else {
        showTimedFeedback('error', '클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.');
      }
    } catch {
      showTimedFeedback('error', '공유 기능을 사용할 수 없는 환경입니다.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-5 pb-28 space-y-5 sm:space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF5EA] text-xs font-bold text-[#252525] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>추천 결과로 돌아가기</span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF5EA] text-xs font-bold text-[#252525] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            {shareFeedback?.type === 'success' ? (
              <Check className="w-4 h-4 text-[#319447]" />
            ) : (
              <Share2 className="w-4 h-4 text-[#319447]" />
            )}
            <span>공유하기</span>
          </button>

          <button
            type="button"
            onClick={onToggleFavorite}
            className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              isFavorite
                ? 'bg-[#FFD65A] border-[#EAB82D] text-[#252525]'
                : 'bg-white border-[#DDD2BE] text-[#4C453B] hover:bg-[#FAF5EA]'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-[#252525]' : ''}`} />
            <span>{isFavorite ? '찜한 조합' : '조합 저장하기'}</span>
          </button>
        </div>
      </div>

      {shareFeedback && (
        <div
          role="status"
          className={`px-4 py-3 rounded-2xl text-xs font-semibold border ${
            shareFeedback.type === 'success'
              ? 'bg-[#F2FBF4] border-[#319447]/40 text-[#226631]'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {shareFeedback.message}
        </div>
      )}

      {/* Combo Title Header */}
      <header className="bg-white border border-[#EAE0CC] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6355]">
            <span className="font-bold text-[#319447]">3분 레시피 · 구매 체크리스트</span>
            <span aria-hidden="true">·</span>
            <span>샘플 데이터 기준</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#252525]">{combo.title}</h1>
          <p className="text-sm text-[#5C5549]">{combo.description}</p>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#4C453B] shrink-0">
          <div className="bg-[#FFF9EF] border border-[#EFE5D2] rounded-2xl px-4 py-2.5 text-center">
            <p className="text-[#756D60] mb-0.5">예상 조리</p>
            <p className="font-num font-extrabold text-base text-[#252525]">
              약 {combo.estimatedCookingMinutes}분
            </p>
          </div>
          <div className="bg-[#FFF9EF] border border-[#EFE5D2] rounded-2xl px-4 py-2.5 text-center">
            <p className="text-[#756D60] mb-0.5">남은 잔액</p>
            <p
              className={`font-num font-extrabold text-base ${
                summary.isOverBudget ? 'text-red-600' : 'text-[#319447]'
              }`}
            >
              {summary.isOverBudget
                ? `-${formatKRW(summary.exceededAmount)}`
                : formatKRW(summary.remainingBudget)}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Left Column: A. Purchase Checklist + B. Receipt Calculator */}
        <section className="md:col-span-6 space-y-5">
          {/* A. Checklist */}
          <div className="bg-white border border-[#EAE0CC] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-[#252525]">구매 체크리스트</h2>
                <p className="text-xs text-[#6B6355]">
                  장바구니 담은 현황 ({checkedCount}/{items.length}개 체크 · 실제 결제는 매장에서 진행)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDrawer((prev) => !prev)}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#319447] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>상품 추가</span>
              </button>
            </div>

            {showAddDrawer && (
              <div className="p-4 rounded-2xl bg-[#FFF9EF] border border-[#E6DAC2] space-y-3">
                <input
                  type="text"
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="GS25 샘플 상품명 검색..."
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-[#DDD2BE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#319447]"
                />
                <div className="max-h-52 overflow-y-auto space-y-1.5">
                  {availableToAdd.map((p) => (
                    <button
                      key={p.productId}
                      type="button"
                      onClick={() => handleAddProduct(p)}
                      className="w-full text-left px-3 py-2.5 rounded-xl bg-white border border-[#EAE0CC] hover:border-[#319447] flex items-center justify-between gap-2 text-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={getProductImageUrl(p)}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 border border-[#EFE5D2] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-[#252525] truncate">{p.name}</p>
                          <p className="text-[#756D60]">
                            {p.category}
                            {p.promotionType !== 'NONE' ? ` · ${p.promotionType}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="font-num font-bold text-[#319447] shrink-0">
                        {p.regularPrice === null ? '가격 확인 필요' : formatKRW(p.regularPrice)}
                      </span>
                    </button>
                  ))}
                  {availableToAdd.length === 0 && (
                    <p className="text-xs text-[#756D60] text-center py-3">
                      추가할 수 있는 검색 결과가 없습니다.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {items.map((entry, idx) => {
                const line = lineResults[idx];
                return (
                  <div
                    key={entry.product.productId}
                    className={`p-3.5 rounded-2xl border transition-colors ${
                      entry.checked
                        ? 'bg-[#F5FBF6] border-[#B7DEC0]'
                        : 'bg-[#FFFDF9] border-[#EAE0CC]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleCheck(entry.product.productId)}
                        className="flex items-start gap-2.5 text-left min-w-0 flex-1 cursor-pointer"
                      >
                        {entry.checked ? (
                          <CheckSquare className="w-5 h-5 text-[#319447] shrink-0 mt-2.5" />
                        ) : (
                          <Square className="w-5 h-5 text-[#9A9080] shrink-0 mt-2.5" />
                        )}
                        <img
                          src={getProductImageUrl(entry.product)}
                          alt={entry.product.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-contain bg-white p-0.5 border border-[#EFE5D2] shrink-0"
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-bold ${
                              entry.checked ? 'line-through text-[#6B6355]' : 'text-[#252525]'
                            }`}
                          >
                            {entry.product.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#756D60] mt-0.5">
                            <span>재고 미확인</span>
                            {line.promoAppliedLabel && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-[#F49A24]">
                                  {line.promoAppliedLabel}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(entry.product.productId)}
                        aria-label={`${entry.product.name} 삭제`}
                        className="min-w-[36px] min-h-[36px] rounded-lg text-[#8A8070] hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#EFE5D2] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(entry.product.productId, -1)}
                          aria-label="수량 감소"
                          className="w-9 h-9 rounded-lg border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold font-num">
                          {entry.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(entry.product.productId, 1)}
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
                          {line.priceUnknown ? '가격 확인 필요' : formatKRW(line.appliedLineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {items.length === 0 && (
                <p className="text-sm text-[#756D60] text-center py-6">
                  체크리스트가 비어 있습니다. 상단 &ldquo;상품 추가&rdquo;로 품목을 담아 보세요.
                </p>
              )}
            </div>
          </div>

          {/* B. Receipt Calculator */}
          <div className="bg-white border border-[#EAE0CC] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#F49A24]" />
                <h2 className="text-lg font-bold text-[#252525]">예상 결제 영수증</h2>
              </div>
              <span className="text-xs text-[#756D60]">실시간 자동 계산</span>
            </div>

            {summary.isOverBudget && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1"
              >
                <div className="flex items-center gap-1.5 font-bold text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>예산 초과 (+{formatKRW(summary.exceededAmount)})</span>
                </div>
                <p className="leading-relaxed">
                  설정한 예산({formatKRW(budget)})을 초과하여 구매 가능한 추천 범위에서 벗어났습니다. 수량을 줄이거나 품목을 조정해 예산을 맞춰 주세요.
                </p>
              </div>
            )}

            {summary.hasUnknownPrice && (
              <div className="p-3 rounded-xl bg-[#FFF6E8] border border-[#F49A24]/40 text-xs text-[#66410B]">
                가격이 확인되지 않은 상품이 포함되어 있으며, 해당 상품은 총액 계산에서 제외되었습니다.
              </div>
            )}

            <div className="border-t border-b border-dashed border-[#D6C9B0] py-3 space-y-2 text-xs">
              {lineResults.map((line) => (
                <div key={line.productId} className="flex items-center justify-between gap-2">
                  <span className="text-[#4C453B] truncate">
                    {line.product.name} × {line.quantity}
                  </span>
                  <span className="font-num font-semibold text-[#252525] shrink-0">
                    {line.priceUnknown ? '가격 확인 필요' : formatKRW(line.appliedLineTotal)}
                  </span>
                </div>
              ))}
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
                <span>확인된 행사 할인액</span>
                <span className="font-num">-{formatKRW(summary.totalDiscount)}</span>
              </div>
              <div className="pt-2 border-t border-[#EFE5D2] flex items-center justify-between">
                <span className="font-bold text-[#252525]">최종 예상 결제 금액</span>
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
          </div>

          <WoodongsLinkCard
            storeName={storeName ?? null}
            productNames={items.map((entry) => entry.product.name)}
          />
        </section>

        {/* Right Column: C. 3-Minute Video Recipe */}
        <section className="md:col-span-6 bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#F49A24]" />
              <h2 className="text-lg font-bold text-[#252525]">3분 초간단 조리 영상</h2>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#319447]">
              <Clock className="w-3.5 h-3.5" /> 총 약 {combo.estimatedCookingMinutes}분
            </span>
          </div>

          <div className="flex flex-wrap gap-3 px-3.5 py-2.5 rounded-xl bg-[#FFF9EF] border border-[#EFE5D2] text-xs font-semibold text-[#252525]">
            <span>
              전자레인지: {combo.usesMicrowave ? '필요 (매장 사용 가능 확인)' : '불필요'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              온수기: {combo.usesHotWater ? '필요 (매장 온수 확인)' : '불필요'}
            </span>
          </div>

          <CookingVideoGuide
            title={combo.title}
            steps={combo.recipe}
            products={items.map((entry) => ({
              name: entry.product.name,
              imageUrl: getProductImageUrl(entry.product),
            }))}
            prepNote={combo.prepNote}
            safetyNote={combo.safetyNote}
            fallbackPoster={
              items[0]?.product ? getProductImageUrl(items[0].product) : combo.imageUrl
            }
          />
        </section>
      </div>
    </div>
  );
}
