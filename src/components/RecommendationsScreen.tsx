import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Clock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Utensils,
} from 'lucide-react';
import type {
  RecommendationRequest,
  RecommendationResponse,
  VerifiedRecommendation,
} from '../types.ts';
import { BRAND_METADATA } from '../data/gs25SampleCatalog.ts';
import { formatKRW } from '../utils/pricing.ts';
import { getProductImageUrl } from '../utils/productImages.ts';
import { resolveAssetPath } from '../utils/assetPath.ts';
import WoodongsLinkCard from './WoodongsLinkCard.tsx';

interface RecommendationsScreenProps {
  lastRequest: RecommendationRequest | null;
  response: RecommendationResponse | null;
  isLoading: boolean;
  favoriteIds: Set<string>;
  onBackToHome: () => void;
  onRetry: () => void;
  onLoadFallback: () => void;
  onSelectRecipe: (combo: VerifiedRecommendation) => void;
  onToggleFavorite: (combo: VerifiedRecommendation) => void;
}

export default function RecommendationsScreen({
  lastRequest,
  response,
  isLoading,
  favoriteIds,
  onBackToHome,
  onRetry,
  onLoadFallback,
  onSelectRecipe,
  onToggleFavorite,
}: RecommendationsScreenProps) {
  if (!lastRequest && !isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 pt-6 sm:pt-8 pb-24 sm:pb-28">
        <div className="bg-white border border-[#EAE0CC] rounded-3xl p-6 sm:p-8 text-center space-y-4">
          <Sparkles className="w-8 h-8 text-[#319447] mx-auto" />
          <h2 className="text-xl font-bold text-[#252525]">아직 추천을 실행하지 않았습니다</h2>
          <p className="text-sm text-[#6B6355]">
            홈 화면에서 주변 GS25 매장과 예산, 맛 테마를 선택한 뒤 「AI 꿀조합 추천받기」를 눌러 주세요.
          </p>
          <button
            type="button"
            onClick={onBackToHome}
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#319447] text-white text-sm font-bold cursor-pointer"
          >
            조건 설정하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-5 pb-24 sm:pb-28 space-y-5 sm:space-y-6">
      {/* Header & Condition Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={onBackToHome}
          className="min-h-[44px] px-3 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF5EA] text-xs font-bold text-[#252525] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>조건 다시 설정</span>
        </button>
        {lastRequest && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isLoading}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#252525] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>다시 추천받기</span>
          </button>
        )}
      </div>

      {lastRequest && (
        <section className="bg-white border border-[#EAE0CC] rounded-2xl p-4 sm:p-5 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6355]">
            <span className="font-bold text-[#319447]">
              {BRAND_METADATA[lastRequest.brand].label}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-[#252525]">{lastRequest.storeName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-num font-bold text-[#F49A24]">
              예산 {formatKRW(lastRequest.budget)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#4C453B]">
            <span>맛 테마: {lastRequest.flavors.join(', ') || '자유'}</span>
            <span aria-hidden="true">·</span>
            <span>상황: {lastRequest.mealSituation}</span>
            {lastRequest.preferences.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>선호: {lastRequest.preferences.join(', ')}</span>
              </>
            )}
          </div>
        </section>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="bg-white border border-[#EAE0CC] rounded-3xl p-5 space-y-4 animate-pulse"
            >
              <div className="h-36 rounded-2xl bg-[#F3EAD8]" />
              <div className="h-5 w-2/3 rounded bg-[#EFE5D2]" />
              <div className="h-4 w-full rounded bg-[#F5EFE0]" />
              <div className="space-y-2 pt-2">
                <div className="h-4 w-full rounded bg-[#F5EFE0]" />
                <div className="h-4 w-4/5 rounded bg-[#F5EFE0]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error / Empty / Budget Excluded States */}
      {!isLoading && response && response.status !== 'OK' && (
        <section className="bg-white border border-[#EAE0CC] rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-[#F49A24] shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-[#252525]">
                {response.status === 'AI_ERROR' && 'Gemini AI 추천을 불러오지 못했습니다'}
                {response.status === 'BUDGET_EXCLUDED' && '예산 초과 조합이 제외되었습니다'}
                {response.status === 'NO_DATA' && '조건에 맞는 상품 조합을 찾지 못했습니다'}
              </h2>
              <p className="text-sm text-[#5C5549] leading-relaxed">
                {response.message || '요청을 처리하는 중 문제가 발생했습니다.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              type="button"
              onClick={onRetry}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#319447] text-white text-xs font-bold cursor-pointer"
            >
              AI 추천 다시 시도
            </button>
            <button
              type="button"
              onClick={onBackToHome}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[#DDD2BE] bg-white text-xs font-bold text-[#252525] cursor-pointer"
            >
              예산·조건 수정하기
            </button>
            {response.status === 'AI_ERROR' && (
              <button
                type="button"
                onClick={onLoadFallback}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FAF4E6] border border-[#E2D6BE] text-xs font-bold text-[#4B453A] cursor-pointer"
              >
                샘플 데이터 기반 기본 조합 보기 (AI 미사용)
              </button>
            )}
          </div>
        </section>
      )}

      {/* Success Recommendation Cards (Max 3) */}
      {!isLoading && response && response.recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C5549]">
            <div className="flex items-center gap-1.5 font-semibold text-[#319447]">
              <ShieldCheck className="w-4 h-4" />
              <span>
                서버 코드 가격·예산 검증 완료 ({response.recommendations.length}개 조합)
                {response.recommendations[0].sourceType === 'DATA_FALLBACK'
                  ? ' · 데이터 기반 대체 안내'
                  : ' · Gemini AI 추천'}
              </span>
            </div>
            {response.excludedOverBudgetCount > 0 && (
              <span className="text-[#F49A24] font-semibold">
                예산 초과 후보 {response.excludedOverBudgetCount}개 자동 제외됨
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {response.recommendations.map((combo, idx) => {
              const isSaved = favoriteIds.has(combo.id);
              return (
                <article
                  key={combo.id}
                  className="bg-white border border-[#EAE0CC] rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Visual Header */}
                    <div className="relative h-44 bg-[#FAF5EA] overflow-hidden">
                      <img
                        src={
                          combo.items[0]?.product
                            ? getProductImageUrl(combo.items[0].product)
                            : combo.imageUrl || resolveAssetPath('/assets/products/buldak.jpg')
                        }
                        alt={combo.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/55 text-[11px] font-semibold text-white">
                        GS25 상품 예시 이미지
                      </span>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-4 flex items-end justify-between gap-2 text-white">
                        <div>
                          <p className="text-[11px] font-bold text-[#FFD65A]">
                            추천 {idx + 1} · 약 {combo.estimatedCookingMinutes}분 조리
                          </p>
                          <h3 className="text-lg font-extrabold leading-snug">{combo.title}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(combo)}
                          aria-label={isSaved ? '찜 해제' : '조합 찜하기'}
                          className="min-w-[40px] min-h-[40px] rounded-xl bg-black/40 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer"
                        >
                          <Bookmark
                            className={`w-4 h-4 ${isSaved ? 'fill-[#FFD65A] text-[#FFD65A]' : ''}`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 space-y-4">
                      <p className="text-sm text-[#4C453B] leading-snug">{combo.description}</p>

                      {/* Product Breakdown Table */}
                      <div className="border-t border-b border-[#F0E7D6] py-3 space-y-2.5">
                        {combo.items.map((item) => (
                          <div key={item.productId} className="flex items-center gap-3">
                            <img
                              src={getProductImageUrl(item.product)}
                              alt={item.product.name}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-xl object-contain bg-white p-0.5 border border-[#EFE5D2] shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-start justify-between gap-2 text-sm">
                                <span className="font-semibold text-[#252525] truncate">
                                  {item.product.name}
                                  {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                                </span>
                                <div className="text-right font-num shrink-0">
                                  {item.discountAmount > 0 && (
                                    <span className="text-xs text-[#8C8272] line-through mr-1.5">
                                      {formatKRW(item.regularLineTotal)}
                                    </span>
                                  )}
                                  <span className="font-bold text-[#252525]">
                                    {item.priceUnknown
                                      ? '가격 확인 필요'
                                      : formatKRW(item.appliedLineTotal)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#756D60]">
                                <span>재고 미확인</span>
                                <span aria-hidden="true">·</span>
                                <span>샘플 데이터</span>
                                {item.promoAppliedLabel && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-semibold text-[#F49A24]">
                                      {item.promoAppliedLabel}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Budget Calculation Summary */}
                      <div className="bg-[#FFF9EF] border border-[#EFE5D2] rounded-2xl p-3.5 space-y-1.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[#5C5549]">총 예상 금액</span>
                          <span className="font-extrabold font-num text-base text-[#252525]">
                            {formatKRW(combo.totalPrice)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#6B6355]">
                            남은 예산 (설정 {formatKRW(combo.budget)})
                          </span>
                          <span className="font-bold font-num text-[#319447]">
                            {formatKRW(combo.remainingBudget)} 남음
                          </span>
                        </div>
                        {combo.totalDiscount > 0 && (
                          <div className="flex items-center justify-between text-xs text-[#F49A24] font-semibold">
                            <span>확인된 행사 할인</span>
                            <span className="font-num">-{formatKRW(combo.totalDiscount)}</span>
                          </div>
                        )}
                      </div>

                      {/* Reason & Cooking Meta */}
                      <div className="space-y-1.5 text-xs text-[#554E43] leading-relaxed">
                        <p>
                          <strong className="text-[#252525]">추천 이유:</strong> {combo.reason}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[#6B6355] pt-0.5">
                          <Clock className="w-3.5 h-3.5 text-[#319447] shrink-0" />
                          <span>약 {combo.estimatedCookingMinutes}분</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {combo.usesMicrowave ? '전자레인지 사용' : '전자레인지 불필요'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{combo.usesHotWater ? '온수 필요' : '온수 불필요'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1">
                    <button
                      type="button"
                      onClick={() => onSelectRecipe(combo)}
                      className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#319447] hover:bg-[#257336] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Utensils className="w-4 h-4 shrink-0" />
                      <span>상세 레시피 · 구매 체크리스트</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <WoodongsLinkCard
            storeName={lastRequest?.storeName ?? null}
            productNames={response.recommendations.flatMap((c) =>
              c.items.map((item) => item.product.name),
            )}
          />

          <p className="text-xs text-[#756D60] text-center pt-1">
            안내: 표시된 상품 가격과 행사 정보는 샘플 데이터 기준이며, 실제 매장의 판매 가격·영업 여부·재고 상태는 방문 시 확인해 주세요.
          </p>
        </div>
      )}
    </div>
  );
}
