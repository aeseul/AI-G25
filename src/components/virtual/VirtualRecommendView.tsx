import React, { useState } from 'react';
import {
  AlertCircle,
  Clock,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Utensils,
} from 'lucide-react';
import type {
  FlavorTheme,
  MealSituation,
  PreferenceOption,
  VirtualRecommendationResult,
} from '../../types.ts';
import { FLAVOR_THEMES, MEAL_SITUATIONS, PREFERENCE_OPTIONS } from '../HomeScreen.tsx';
import { formatKRW } from '../../utils/pricing.ts';

interface VirtualRecommendViewProps {
  budgetInput: string;
  onChangeBudgetInput: (val: string) => void;
  selectedFlavors: FlavorTheme[];
  onToggleFlavor: (flavor: FlavorTheme) => void;
  selectedSituation: MealSituation;
  onSelectSituation: (situation: MealSituation) => void;
  selectedPreferences: PreferenceOption[];
  onTogglePreference: (pref: PreferenceOption) => void;
  results: VirtualRecommendationResult[] | null;
  onGenerate: () => void;
  onOpenRecipe: (combo: VirtualRecommendationResult) => void;
  onAddComboToCart: (combo: VirtualRecommendationResult) => void;
}

const QUICK_BUDGETS = [3000, 5000, 7000];

export default function VirtualRecommendView({
  budgetInput,
  onChangeBudgetInput,
  selectedFlavors,
  onToggleFlavor,
  selectedSituation,
  onSelectSituation,
  selectedPreferences,
  onTogglePreference,
  results,
  onGenerate,
  onOpenRecipe,
  onAddComboToCart,
}: VirtualRecommendViewProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const parsedBudget = Number(budgetInput.replaceAll(',', '').trim());
  const isBudgetValid = Number.isFinite(parsedBudget) && parsedBudget > 0;

  const handleRun = () => {
    if (!isBudgetValid) {
      setValidationError('예산은 1원 이상의 올바른 숫자로 입력해 주세요.');
      return;
    }
    if (selectedFlavors.length === 0) {
      setValidationError('최소 1개 이상의 맛 테마를 선택해 주세요.');
      return;
    }
    setValidationError(null);
    onGenerate();
  };

  return (
    <div className="space-y-6">
      {/* Condition Input Card */}
      <section className="bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-[#252525]">가상 매장 꿀조합 추천</h1>
            <p className="text-xs text-[#6B6355] mt-0.5">
              외부 유료 API 없이 가상 GS25 재고·행사 데이터와 자체 규칙 엔진으로 즉시 조합을 찾습니다.
            </p>
          </div>
          <span className="text-xs font-bold text-[#319447] shrink-0">자체 규칙 기반 추천</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
          {/* Budget + Meal Situation */}
          <div className="md:col-span-5 space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#252525]">예산 설정</span>
                <span className="font-num font-extrabold text-sm text-[#F49A24]">
                  {isBudgetValid ? formatKRW(parsedBudget) : '입력 필요'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_BUDGETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => onChangeBudgetInput(String(amt))}
                    className={`min-h-[42px] rounded-xl text-xs font-bold font-num border cursor-pointer ${
                      isBudgetValid && parsedBudget === amt
                        ? 'bg-[#319447] border-[#319447] text-white'
                        : 'bg-[#FFFDF9] border-[#DDD2BE] text-[#252525]'
                    }`}
                  >
                    {formatKRW(amt)}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  step={100}
                  inputMode="numeric"
                  value={budgetInput}
                  onChange={(e) => onChangeBudgetInput(e.target.value)}
                  className="w-full min-h-[44px] pl-3.5 pr-10 py-2 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] text-sm font-bold font-num focus:outline-none focus:ring-2 focus:ring-[#319447]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B6355]">
                  원
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-bold text-[#252525]">식사 상황</span>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-3 gap-1.5">
                {MEAL_SITUATIONS.map((sit) => (
                  <button
                    key={sit}
                    type="button"
                    onClick={() => onSelectSituation(sit)}
                    className={`min-h-[40px] px-2.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                      selectedSituation === sit
                        ? 'bg-[#252525] border-[#252525] text-white'
                        : 'bg-white border-[#DDD2BE] text-[#554E43]'
                    }`}
                  >
                    {sit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Flavors + Preferences */}
          <div className="md:col-span-7 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#252525]">맛 테마 (복수 선택)</span>
                <span className="text-xs text-[#756D60]">{selectedFlavors.length}개 선택됨</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FLAVOR_THEMES.map((flavor) => {
                  const active = selectedFlavors.includes(flavor);
                  return (
                    <button
                      key={flavor}
                      type="button"
                      onClick={() => onToggleFlavor(flavor)}
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                        active
                          ? 'bg-[#FFD65A] border-[#EAB82D] text-[#252525]'
                          : 'bg-white border-[#DDD2BE] text-[#554E43]'
                      }`}
                    >
                      {flavor}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-bold text-[#252525]">추가 선호 조건</span>
              <div className="flex flex-wrap gap-1.5">
                {PREFERENCE_OPTIONS.map((pref) => {
                  const active = selectedPreferences.includes(pref);
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => onTogglePreference(pref)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                        active
                          ? 'bg-[#F2FBF4] border-[#319447] text-[#226631] font-bold'
                          : 'bg-white border-[#DDD2BE] text-[#5C5549]'
                      }`}
                    >
                      {active ? `✓ ${pref}` : pref}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#756D60]">
                영양정보가 등록되지 않은 상품의 고단백 여부는 임의로 추정하지 않습니다.
              </p>
            </div>
          </div>
        </div>

        {validationError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleRun}
          className="w-full min-h-[50px] px-5 py-3 rounded-2xl bg-[#319447] hover:bg-[#257336] text-white text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span>내 예산으로 꿀조합 찾기</span>
        </button>
      </section>

      {/* Recommendation Results */}
      {results !== null && (
        <section className="space-y-4">
          {results.length === 0 ? (
            <div className="bg-white border border-dashed border-[#D8CCB4] rounded-3xl p-7 text-center space-y-2">
              <p className="text-base font-extrabold text-[#252525]">
                현재 조건과 예산에 맞는 가상 재고 조합을 찾지 못했습니다.
              </p>
              <p className="text-xs text-[#6B6355]">
                예산을 조금 높이거나 추가 선호 필터(예: 조리 조건·행사 제외)를 완화한 뒤 다시 추천받아 보세요.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C5549]">
                <span className="inline-flex items-center gap-1.5 font-bold text-[#319447]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    가상 재고·행사·예산 계산 검증 완료 ({results.length}개 추천 조합)
                  </span>
                </span>
                <span>가격·재고는 초기 샘플 데이터 기반 데모 예시</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {results.map((combo, idx) => (
                  <article
                    key={combo.id}
                    className="bg-white border border-[#EAE0CC] rounded-3xl overflow-hidden shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-40 bg-[#FAF5EA]">
                        <img
                          src={combo.imageUrl}
                          alt={combo.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-4 text-white">
                          <p className="text-[11px] font-bold text-[#FFD65A]">
                            추천 {idx + 1} · 약 {combo.estimatedCookingMinutes}분 조리
                          </p>
                          <h2 className="text-lg font-extrabold leading-snug">{combo.title}</h2>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 space-y-4">
                        <p className="text-sm text-[#4C453B]">{combo.description}</p>

                        <div className="border-t border-b border-[#F0E7D6] py-3 space-y-2.5">
                          {combo.items.map((line) => (
                            <div key={line.productId} className="flex items-center gap-2.5">
                              <img
                                src={line.product.imageUrl}
                                alt={line.product.name}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 border border-[#EFE5D2] shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <span className="font-bold text-[#252525] truncate">
                                    {line.product.name} × {line.quantity}
                                  </span>
                                  <span className="font-num font-bold text-[#252525] shrink-0">
                                    {formatKRW(line.appliedLineTotal)}
                                  </span>
                                </div>
                                {line.promoAppliedLabel && (
                                  <p className="text-[11px] font-semibold text-[#F49A24]">
                                    {line.promoAppliedLabel}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="bg-[#FFF9EF] border border-[#EFE5D2] rounded-2xl p-3.5 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[#5C5549]">총 예상 금액</span>
                            <span className="font-num font-extrabold text-base text-[#252525]">
                              {formatKRW(combo.totalPrice)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#6B6355]">
                              남은 잔액 (예산 {formatKRW(combo.budget)})
                            </span>
                            <span className="font-num font-bold text-[#319447]">
                              {formatKRW(combo.remainingBudget)} 남음
                            </span>
                          </div>
                          {combo.totalDiscount > 0 && (
                            <div className="flex items-center justify-between text-[#F49A24] font-semibold">
                              <span>행사 할인 적용</span>
                              <span className="font-num">-{formatKRW(combo.totalDiscount)}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5 text-xs text-[#554E43] leading-relaxed">
                          <p>
                            <strong className="text-[#252525]">추천 이유:</strong> {combo.reason}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[#6B6355]">
                            <Clock className="w-3.5 h-3.5 text-[#319447] shrink-0" />
                            <span>약 {combo.estimatedCookingMinutes}분</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {combo.usesMicrowave ? '전자레인지 가능' : '가열 불필요'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenRecipe(combo)}
                        className="min-h-[42px] px-2.5 sm:px-3 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] text-xs font-bold text-[#252525] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Utensils className="w-3.5 h-3.5 text-[#319447] shrink-0" />
                        <span className="truncate">상세 레시피</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddComboToCart(combo)}
                        className="min-h-[42px] px-2.5 sm:px-3 py-2 rounded-xl bg-[#319447] hover:bg-[#257336] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">장바구니 담기</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
