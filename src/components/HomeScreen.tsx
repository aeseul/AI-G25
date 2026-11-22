import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Compass,
  Crosshair,
  MapPin,
  Search,
  Sparkles,
  Store as StoreIcon,
  Wallet,
} from 'lucide-react';
import type {
  BrandId,
  FlavorTheme,
  MealSituation,
  PreferenceOption,
  StoreWithDistance,
} from '../types.ts';
import { BRAND_METADATA } from '../data/gs25SampleCatalog.ts';
import { AREA_PRESETS, formatDistance } from '../utils/geo.ts';
import { formatKRW } from '../utils/pricing.ts';
import StoreRadarMap from './StoreRadarMap.tsx';
import WoodongsLinkCard from './WoodongsLinkCard.tsx';

export const FLAVOR_THEMES: FlavorTheme[] = [
  '단짠',
  '매콤',
  '담백',
  '고소',
  '새콤',
  '달콤',
  '고단백',
];

export const MEAL_SITUATIONS: MealSituation[] = [
  '한 끼 식사',
  '야식',
  '간식',
  '안주',
  '해장',
];

export const PREFERENCE_OPTIONS: PreferenceOption[] = [
  '1+1 행사 상품 우선',
  '2+1 행사 상품 우선',
  '행사 상품 제외',
  '3분 이내 조리',
  '전자레인지 사용 가능',
  '온수 사용 가능',
  '고단백 상품 우선',
];

const RADIUS_OPTIONS = [100, 300, 500, 1000];
const QUICK_BUDGETS = [3000, 5000, 7000];

interface HomeScreenProps {
  centerLat: number;
  centerLng: number;
  locationLabel: string;
  gpsStatus: 'idle' | 'loading' | 'success' | 'denied' | 'error';
  gpsMessage: string | null;
  gpsAccuracyMeters: number | null;
  isLoadingStores: boolean;
  onRequestGps: () => void;
  onSearchLocation: (query: string) => Promise<{ ok: boolean; message: string }>;
  onSelectPresetArea: (lat: number, lng: number, label: string) => void;
  radiusMeters: number;
  onChangeRadius: (radius: number) => void;
  brandFilter: BrandId | 'ALL';
  onChangeBrandFilter: (brand: BrandId | 'ALL') => void;
  nearbyStores: StoreWithDistance[];
  closestOutsideStores: StoreWithDistance[];
  selectedStore: StoreWithDistance | null;
  onSelectStore: (store: StoreWithDistance) => void;
  onEnterVirtualStore: (store: StoreWithDistance) => void;
  budgetInput: string;
  onChangeBudgetInput: (val: string) => void;
  selectedFlavors: FlavorTheme[];
  onToggleFlavor: (flavor: FlavorTheme) => void;
  selectedSituation: MealSituation;
  onSelectSituation: (situation: MealSituation) => void;
  selectedPreferences: PreferenceOption[];
  onTogglePreference: (pref: PreferenceOption) => void;
  isGenerating: boolean;
  onRunRecommendation: () => void;
}

export default function HomeScreen({
  centerLat,
  centerLng,
  locationLabel,
  gpsStatus,
  gpsMessage,
  gpsAccuracyMeters,
  isLoadingStores,
  onRequestGps,
  onSearchLocation,
  onSelectPresetArea,
  radiusMeters,
  onChangeRadius,
  brandFilter,
  onChangeBrandFilter,
  nearbyStores,
  closestOutsideStores,
  selectedStore,
  onSelectStore,
  onEnterVirtualStore,
  budgetInput,
  onChangeBudgetInput,
  selectedFlavors,
  onToggleFlavor,
  selectedSituation,
  onSelectSituation,
  selectedPreferences,
  onTogglePreference,
  isGenerating,
  onRunRecommendation,
}: HomeScreenProps) {
  const [manualQuery, setManualQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [manualNotice, setManualNotice] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const parsedBudget = Number(budgetInput.replaceAll(',', '').trim());
  const isBudgetValid = Number.isFinite(parsedBudget) && parsedBudget > 0;

  const handleManualAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = manualQuery.trim();
    if (!q) {
      setManualNotice('동네 이름, 역명 또는 도로명 주소를 입력하거나 아래 테스트 지역을 선택해 주세요.');
      return;
    }

    setIsSearchingLocation(true);
    setManualNotice('입력한 위치의 실제 좌표와 주변 편의점을 찾는 중...');
    try {
      const result = await onSearchLocation(q);
      setManualNotice(result.message);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedStore) {
      setValidationError('먼저 방문할 편의점 매장을 선택해 주세요.');
      return;
    }
    if (!isBudgetValid) {
      setValidationError('예산은 1원 이상의 올바른 숫자로 입력해 주세요.');
      return;
    }
    if (selectedFlavors.length === 0) {
      setValidationError('최소 1개 이상의 맛 테마를 선택해 주세요.');
      return;
    }
    setValidationError(null);
    onRunRecommendation();
  };

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-5 pb-28 space-y-5 sm:space-y-6">
      {/* Hero Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#319447]">5,000원의 선택을 더 쉽고, 맛있게</p>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#252525]">
            오늘의 편의점 꿀조합 찾기
          </h1>
        </div>
        <p className="text-xs text-[#6B6355]">
          1차 지원: GS25 · 샘플 상품 DB 기반 추천
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Left Column: A. Location & Convenience Store Selection */}
        <section className="md:col-span-6 bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-5 lg:p-6 shadow-sm space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#319447]" />
              <h2 className="text-lg font-bold text-[#252525]">1. 위치 및 편의점 선택</h2>
            </div>
            <span className="text-xs font-medium text-[#756D60]">기본 반경 100m</span>
          </div>

          {/* GPS Trigger */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={onRequestGps}
              disabled={gpsStatus === 'loading'}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#319447] hover:bg-[#257336] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Crosshair className="w-4 h-4" />
              <span>
                {gpsStatus === 'loading'
                  ? '현재 GPS 위치 확인 중...'
                  : '현재 위치로 주변 편의점 찾기'}
              </span>
            </button>

            {gpsMessage && (
              <div
                className={`p-3 rounded-xl text-xs leading-relaxed border ${
                  gpsStatus === 'denied' || gpsStatus === 'error'
                    ? 'bg-[#FFF6E8] border-[#F49A24]/40 text-[#66410B]'
                    : 'bg-[#F2FBF4] border-[#319447]/30 text-[#226631]'
                }`}
              >
                <p>{gpsMessage}</p>
                {(gpsStatus === 'denied' || gpsStatus === 'error') && (
                  <button
                    type="button"
                    onClick={onRequestGps}
                    className="mt-1.5 font-bold underline text-[#319447] cursor-pointer"
                  >
                    위치 권한 다시 시도
                  </button>
                )}
              </div>
            )}

            {/* Manual Address / Preset Fallback */}
            <form onSubmit={handleManualAddressSubmit} className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-[#8B8172] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="지역·역명 검색 (예: 잠실역, 정릉동)"
                  className="w-full min-w-0 min-h-[44px] pl-9 pr-3 py-2 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] text-sm focus:outline-none focus:ring-2 focus:ring-[#319447]"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingLocation}
                className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl border border-[#DDD2BE] bg-[#FAF5EA] hover:bg-[#F1E8D5] disabled:opacity-60 text-xs font-bold text-[#252525] whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isSearchingLocation ? '검색 중...' : '위치 적용'}
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {AREA_PRESETS.map((preset) => {
                const active = locationLabel === preset.label;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onSelectPresetArea(preset.lat, preset.lng, preset.label);
                      setManualNotice(null);
                    }}
                    className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#252525] text-white'
                        : 'bg-[#F6EFE0] text-[#4C453B] hover:bg-[#ECE2CC]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {manualNotice && (
              <p className="text-xs text-[#6B6355] bg-[#FAF6EC] rounded-lg px-3 py-2">
                {manualNotice}
              </p>
            )}
          </div>

          {/* Radius & Brand Filter */}
          <div className="space-y-3 pt-1">
            <div>
              <span className="block text-xs font-semibold text-[#5E574B] mb-1.5">검색 반경</span>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#F5EFE0] rounded-xl">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onChangeRadius(r)}
                    className={`min-h-[40px] rounded-lg text-xs font-bold font-num transition-colors cursor-pointer ${
                      radiusMeters === r
                        ? 'bg-white text-[#319447] shadow-xs'
                        : 'text-[#6A6256] hover:text-[#252525]'
                    }`}
                  >
                    {formatDistance(r)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#5E574B] mb-1.5">브랜드 필터</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangeBrandFilter('ALL')}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    brandFilter === 'ALL'
                      ? 'bg-[#319447] text-white'
                      : 'bg-[#F5EFE0] text-[#554E43] hover:bg-[#EAE0CC]'
                  }`}
                >
                  전체
                </button>
                {(['GS25', 'CU', 'SEVEN_ELEVEN', 'EMART24'] as BrandId[]).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => onChangeBrandFilter(b)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      brandFilter === b
                        ? 'bg-[#319447] text-white'
                        : 'bg-[#F5EFE0] text-[#554E43] hover:bg-[#EAE0CC]'
                    }`}
                  >
                    {BRAND_METADATA[b].label}
                    {b === 'GS25' ? ' (추천 가능)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Radar Map Preview */}
          <StoreRadarMap
            centerLat={centerLat}
            centerLng={centerLng}
            locationLabel={locationLabel}
            radiusMeters={radiusMeters}
            stores={nearbyStores}
            selectedStoreId={selectedStore?.storeId ?? null}
            onSelectStore={onSelectStore}
          />

          {/* Nearby Stores List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#6B6355]">
              <span>
                {isLoadingStores
                  ? '실제 주변 편의점 검색 중...'
                  : `검색된 주변 매장 (${nearbyStores.length}곳)`}
              </span>
              <span>영업 여부·재고는 매장 확인 필요</span>
            </div>

            {nearbyStores.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-[#D8CCB4] bg-[#FFFDF8] text-center space-y-3">
                <Compass className="w-6 h-6 text-[#F49A24] mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#252525]">
                    {isLoadingStores
                      ? '주변 편의점 위치를 조회하고 있습니다...'
                      : `반경 ${formatDistance(radiusMeters)} 내 확인된 매장이 없습니다`}
                  </p>
                  <p className="text-xs text-[#6B6355] leading-relaxed">
                    {gpsAccuracyMeters && gpsAccuracyMeters > 80
                      ? `현재 브라우저 GPS 오차가 약 ±${gpsAccuracyMeters}m로 잡혀 있어 바로 앞 매장도 거리 계산상 100m 밖으로 나올 수 있습니다. `
                      : 'OpenStreetMap 지도 데이터에 미등록된 지점이거나 반경 경계 밖일 수 있습니다. '}
                    반경을 넓히거나 아래 가장 가까운 매장을 바로 선택해 보세요.
                  </p>
                </div>

                {closestOutsideStores.length > 0 && (
                  <div className="pt-1 space-y-1.5 text-left">
                    <p className="text-[11px] font-bold text-[#4B453A] text-center">
                      현재 위치 기준 가장 가까운 주변 매장 (클릭 시 반경 자동 확장)
                    </p>
                    <div className="space-y-1.5">
                      {closestOutsideStores.map((store) => (
                        <button
                          key={store.storeId}
                          type="button"
                          onClick={() => {
                            const nextRadius =
                              store.distanceMeters <= 300
                                ? 300
                                : store.distanceMeters <= 500
                                  ? 500
                                  : 1000;
                            onChangeRadius(nextRadius);
                            onSelectStore(store);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#E6DAC2] bg-white hover:border-[#319447] flex items-center justify-between gap-2 text-xs cursor-pointer"
                        >
                          <span className="font-bold text-[#252525] truncate">
                            {BRAND_METADATA[store.brand].label} · {store.name}
                          </span>
                          <span className="font-num font-bold text-[#F49A24] shrink-0">
                            {formatDistance(store.distanceMeters)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {brandFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => onChangeBrandFilter('ALL')}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#252525] text-white text-xs font-bold cursor-pointer"
                    >
                      전체 브랜드 보기
                    </button>
                  )}
                  {[300, 500, 1000]
                    .filter((r) => r > radiusMeters)
                    .map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => onChangeRadius(r)}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#319447] text-white text-xs font-bold cursor-pointer"
                      >
                        {formatDistance(r)}로 반경 넓히기
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {nearbyStores.map((store) => {
                  const isSelected = selectedStore?.storeId === store.storeId;
                  const meta = BRAND_METADATA[store.brand];
                  return (
                    <button
                      key={store.storeId}
                      type="button"
                      onClick={() => onSelectStore(store)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-[#319447] bg-[#F2FBF4]'
                          : 'border-[#EAE0CC] bg-white hover:bg-[#FFFDF8]'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-[#6B6355]">
                          <span className="font-bold" style={{ color: meta.accentColor }}>
                            {meta.label}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-num font-bold text-[#F49A24]">
                            {formatDistance(store.distanceMeters)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {store.dataSource === 'OSM_NOMINATIM' ? '실제 위치(OSM)' : '샘플 매장'}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-[#252525] truncate">{store.name}</p>
                        <p className="text-xs text-[#6B6355] truncate">{store.address}</p>
                      </div>
                      <div className="shrink-0 flex items-center pt-1">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#319447]">
                            <Check className="w-4 h-4" /> 선택됨
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-[#756D60]">선택</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedStore && (
              <button
                type="button"
                onClick={() => onEnterVirtualStore(selectedStore)}
                className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-[#252525] hover:bg-[#111111] text-white text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <StoreIcon className="w-4 h-4 text-[#FFD65A]" />
                <span>{selectedStore.name} · 가상 편의점 입장하기</span>
              </button>
            )}
          </div>

          <WoodongsLinkCard storeName={selectedStore?.name ?? null} compact />
        </section>

        {/* Right Column: B. Budget, C. Flavor, D. Situation, E. Preferences */}
        <section className="md:col-span-6 space-y-5 sm:space-y-6">
          {/* Selected Store Banner */}
          <div className="bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-5 lg:p-6 shadow-sm space-y-4 sm:space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0E7D6]">
              <div className="flex items-center gap-2.5 min-w-0">
                <StoreIcon className="w-5 h-5 text-[#319447] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-[#6B6355]">추천 기준 매장</p>
                  <p className="text-sm font-bold text-[#252525] truncate">
                    {selectedStore ? selectedStore.name : '매장을 선택해 주세요'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {selectedStore && !BRAND_METADATA[selectedStore.brand].supportedInPhase1 && (
                  <span className="text-xs font-semibold text-[#F49A24]">
                    GS25 우선 지원 중
                  </span>
                )}
                {selectedStore && (
                  <button
                    type="button"
                    onClick={() => onEnterVirtualStore(selectedStore)}
                    className="w-full sm:w-auto min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#252525] hover:bg-[#111111] text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    가상 편의점 입장하기 →
                  </button>
                )}
              </div>
            </div>

            {/* B. Budget */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#F49A24]" />
                  <h2 className="text-lg font-bold text-[#252525]">2. 예산 설정</h2>
                </div>
                <span className="text-sm font-extrabold font-num text-[#F49A24]">
                  {isBudgetValid ? formatKRW(parsedBudget) : '예산 입력 필요'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {QUICK_BUDGETS.map((amt) => {
                  const active = isBudgetValid && parsedBudget === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => onChangeBudgetInput(String(amt))}
                      className={`min-h-[44px] rounded-xl text-sm font-bold font-num border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#319447] border-[#319447] text-white'
                          : 'bg-[#FFFDF9] border-[#DDD2BE] text-[#252525] hover:bg-[#FAF4E6]'
                      }`}
                    >
                      {formatKRW(amt)}
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <input
                  type="number"
                  min={1}
                  step={100}
                  inputMode="numeric"
                  value={budgetInput}
                  onChange={(e) => onChangeBudgetInput(e.target.value)}
                  placeholder="직접 입력 (예: 5000)"
                  className="w-full min-h-[46px] pl-4 pr-12 py-2.5 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] text-base font-bold font-num text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#319447]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#6B6355]">
                  원
                </span>
              </div>
              {!isBudgetValid && (
                <p className="text-xs font-semibold text-red-600">
                  0원 이하이거나 올바르지 않은 금액입니다. 1원 이상 입력해 주세요.
                </p>
              )}
            </div>

            {/* C. Flavor Themes */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#252525]">3. 맛 테마 선택</h2>
                <span className="text-xs text-[#756D60]">복수 선택 가능</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {FLAVOR_THEMES.map((flavor) => {
                  const active = selectedFlavors.includes(flavor);
                  return (
                    <button
                      key={flavor}
                      type="button"
                      onClick={() => onToggleFlavor(flavor)}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#FFD65A] border-[#EAB82D] text-[#252525] font-bold'
                          : 'bg-white border-[#DDD2BE] text-[#554E43] hover:bg-[#FAF5EA]'
                      }`}
                    >
                      {flavor}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* D. Meal Situation */}
            <div className="space-y-2.5 pt-2">
              <h2 className="text-base font-bold text-[#252525]">4. 식사 상황 선택</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {MEAL_SITUATIONS.map((sit) => {
                  const active = selectedSituation === sit;
                  return (
                    <button
                      key={sit}
                      type="button"
                      onClick={() => onSelectSituation(sit)}
                      className={`min-h-[44px] px-2 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[#252525] border-[#252525] text-white'
                          : 'bg-white border-[#DDD2BE] text-[#554E43] hover:bg-[#FAF5EA]'
                      }`}
                    >
                      {sit}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* E. Additional Preferences */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#252525]">5. 추가 선호 조건</h2>
                <span className="text-xs text-[#756D60]">선택 사항</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PREFERENCE_OPTIONS.map((pref) => {
                  const active = selectedPreferences.includes(pref);
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => onTogglePreference(pref)}
                      className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#F2FBF4] border-[#319447] text-[#226631] font-bold'
                          : 'bg-white border-[#DDD2BE] text-[#5C5549] hover:bg-[#FAF5EA]'
                      }`}
                    >
                      {active ? `✓ ${pref}` : pref}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#7D7465]">
                영양정보가 등록되지 않은 상품은 고단백 여부를 추정하지 않으며, 확인된 영양정보 상품만 고단백 기준으로 우선합니다.
              </p>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* F. Execute Recommendation CTA */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isGenerating}
              className="w-full min-h-[54px] px-5 py-3.5 rounded-2xl bg-[#319447] hover:bg-[#257336] disabled:opacity-60 text-white text-base font-extrabold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>{isGenerating ? 'AI가 예산 내 꿀조합을 찾는 중...' : 'AI 꿀조합 추천받기'}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
