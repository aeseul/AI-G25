import React, { useMemo, useState } from 'react';
import {
  ExternalLink,
  List,
  Map as MapIcon,
  MapPin,
  Search,
  Tag,
} from 'lucide-react';
import type {
  BrandId,
  Product,
  ProductCategory,
  PromotionType,
  StoreWithDistance,
} from '../types.ts';
import { BRAND_METADATA, GS25_SAMPLE_PRODUCTS } from '../data/gs25SampleCatalog.ts';
import { formatDistance } from '../utils/geo.ts';
import { formatKRW, isPromotionExpired } from '../utils/pricing.ts';
import { getProductImageUrl } from '../utils/productImages.ts';
import StoreRadarMap from './StoreRadarMap.tsx';
import WoodongsLinkCard from './WoodongsLinkCard.tsx';

interface ExploreScreenProps {
  initialSection: 'stores' | 'promotions';
  centerLat: number;
  centerLng: number;
  locationLabel: string;
  radiusMeters: number;
  onChangeRadius: (r: number) => void;
  brandFilter: BrandId | 'ALL';
  onChangeBrandFilter: (b: BrandId | 'ALL') => void;
  nearbyStores: StoreWithDistance[];
  selectedStore: StoreWithDistance | null;
  onSelectStore: (store: StoreWithDistance) => void;
  onEnterVirtualStore: (store: StoreWithDistance) => void;
}

const CATEGORIES: Array<ProductCategory | '전체'> = [
  '전체',
  '면류',
  '김밥/도시락',
  '계란/간편식',
  '유제품/치즈',
  '육가공/안주',
  '음료',
  '스낵/디저트',
];

function getAvailabilityLabel(status: Product['availabilityStatus']): string {
  switch (status) {
    case 'CONFIRMED':
      return '재고 확인됨';
    case 'OUT_OF_STOCK':
      return '재고 없음';
    case 'PENDING_INTEGRATION':
      return '재고 정보 연동 준비 중';
    default:
      return '재고 미확인';
  }
}

export default function ExploreScreen({
  initialSection,
  centerLat,
  centerLng,
  locationLabel,
  radiusMeters,
  onChangeRadius,
  brandFilter,
  onChangeBrandFilter,
  nearbyStores,
  selectedStore,
  onSelectStore,
  onEnterVirtualStore,
}: ExploreScreenProps) {
  const [section, setSection] = useState<'stores' | 'promotions'>(initialSection);
  const [storeViewMode, setStoreViewMode] = useState<'split' | 'map' | 'list'>('split');

  // Promotions filtering
  const [promoFilter, setPromoFilter] = useState<'ALL' | PromotionType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | '전체'>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default');

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = GS25_SAMPLE_PRODUCTS.filter((p) => {
      if (promoFilter !== 'ALL' && p.promotionType !== promoFilter) return false;
      if (categoryFilter !== '전체' && p.category !== categoryFilter) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    if (sortOrder === 'price_asc') {
      return [...list].sort((a, b) => (a.regularPrice ?? 999999) - (b.regularPrice ?? 999999));
    }
    if (sortOrder === 'price_desc') {
      return [...list].sort((a, b) => (b.regularPrice ?? -1) - (a.regularPrice ?? -1));
    }
    return list;
  }, [promoFilter, categoryFilter, searchQuery, sortOrder]);

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-5 pb-28 space-y-5 sm:space-y-6">
      {/* Header & Top Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#319447]">매장 · 행사 · 재고 확인 원칙 준수</p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#252525]">주변 매장 및 행사 탐색</h1>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 bg-[#F2EADA] rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSection('stores')}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
              section === 'stores' ? 'bg-white text-[#252525] shadow-xs' : 'text-[#6B6355]'
            }`}
          >
            <MapPin className="w-4 h-4 text-[#319447]" />
            <span>주변 매장</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('promotions')}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
              section === 'promotions' ? 'bg-white text-[#252525] shadow-xs' : 'text-[#6B6355]'
            }`}
          >
            <Tag className="w-4 h-4 text-[#F49A24]" />
            <span>GS25 행사 상품</span>
          </button>
        </div>
      </div>

      {section === 'stores' && (
        <section className="space-y-5">
          {/* Store Filter Controls */}
          <div className="bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[100, 300, 500, 1000].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onChangeRadius(r)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold font-num cursor-pointer ${
                      radiusMeters === r
                        ? 'bg-[#319447] text-white'
                        : 'bg-[#F5EFE0] text-[#554E43]'
                    }`}
                  >
                    {formatDistance(r)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#F5EFE0] rounded-xl">
                <button
                  type="button"
                  onClick={() => setStoreViewMode('split')}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-bold cursor-pointer ${
                    storeViewMode === 'split' ? 'bg-white text-[#252525]' : 'text-[#6B6355]'
                  }`}
                >
                  함께 보기
                </button>
                <button
                  type="button"
                  onClick={() => setStoreViewMode('map')}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                    storeViewMode === 'map' ? 'bg-white text-[#252525]' : 'text-[#6B6355]'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" /> 지도
                </button>
                <button
                  type="button"
                  onClick={() => setStoreViewMode('list')}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                    storeViewMode === 'list' ? 'bg-white text-[#252525]' : 'text-[#6B6355]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" /> 목록
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onChangeBrandFilter('ALL')}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  brandFilter === 'ALL' ? 'bg-[#252525] text-white' : 'bg-[#F5EFE0] text-[#554E43]'
                }`}
              >
                전체 브랜드
              </button>
              {(['GS25', 'CU', 'SEVEN_ELEVEN', 'EMART24'] as BrandId[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => onChangeBrandFilter(b)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    brandFilter === b ? 'bg-[#252525] text-white' : 'bg-[#F5EFE0] text-[#554E43]'
                  }`}
                >
                  {BRAND_METADATA[b].label}
                </button>
              ))}
            </div>
          </div>

          {/* Map & List */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {storeViewMode !== 'list' && (
              <div className={storeViewMode === 'map' ? 'md:col-span-12' : 'md:col-span-6'}>
                <StoreRadarMap
                  centerLat={centerLat}
                  centerLng={centerLng}
                  locationLabel={locationLabel}
                  radiusMeters={radiusMeters}
                  stores={nearbyStores}
                  selectedStoreId={selectedStore?.storeId ?? null}
                  onSelectStore={onSelectStore}
                />
              </div>
            )}

            {storeViewMode !== 'map' && (
              <div
                className={`${
                  storeViewMode === 'list' ? 'md:col-span-12' : 'md:col-span-6'
                } space-y-3`}
              >
                {nearbyStores.map((store) => {
                  const isSelected = selectedStore?.storeId === store.storeId;
                  const meta = BRAND_METADATA[store.brand];
                  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`;
                  return (
                    <div
                      key={store.storeId}
                      className={`bg-white border rounded-2xl p-4 space-y-3 ${
                        isSelected ? 'border-[#319447] bg-[#F5FBF6]' : 'border-[#EAE0CC]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#6B6355]">
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
                          <h3 className="text-base font-bold text-[#252525]">{store.name}</h3>
                          <p className="text-xs text-[#5C5549]">{store.address}</p>
                          <p className="text-[11px] text-[#7D7465]">{store.operatingStatusNote}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#F0E7D6]">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEnterVirtualStore(store)}
                            className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#252525] hover:bg-[#111111] text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                          >
                            가상 편의점 입장하기 →
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectStore(store)}
                            className={`flex-1 sm:flex-none min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
                              isSelected
                                ? 'bg-[#319447] text-white'
                                : 'bg-[#FAF4E6] text-[#252525] hover:bg-[#EFE5D2]'
                            }`}
                          >
                            {isSelected ? '선택됨' : '이 매장으로 선택'}
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {store.brand === 'GS25' && (
                            <a
                              href="https://m.woodongs.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#E8F8FC] hover:bg-[#D5F2FA] border border-[#B5DFEA] text-xs font-bold text-[#124E5B] inline-flex items-center gap-1.5"
                            >
                              <span>우리동네GS 재고찾기</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF5EA] text-xs font-bold text-[#252525] inline-flex items-center gap-1.5"
                          >
                            <span>지도 길찾기</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {nearbyStores.length === 0 && (
                  <div className="bg-white border border-dashed border-[#D8CCB4] rounded-2xl p-6 text-center text-sm text-[#6B6355]">
                    반경 {formatDistance(radiusMeters)} 내 확인된 매장이 없습니다. 반경을 넓혀 주세요.
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Store-level Woodongs Integration Card */}
          <WoodongsLinkCard storeName={selectedStore?.name ?? null} />
        </section>
      )}

      {section === 'promotions' && (
        <section className="space-y-5">
          {/* Notice on data source & inventory */}
          <div className="bg-white border border-[#EAE0CC] rounded-2xl p-4 text-xs text-[#5C5549] leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              <strong>데이터 출처:</strong> GS25 샘플 상품 DB (개발용 예시) · 실시간 매장 재고 API는 연동 준비 중이므로 모든 상품의 재고 상태를 사실처럼 단정하지 않습니다.
            </span>
            <span className="font-num text-[#756D60] shrink-0">기준일 2026-11-20</span>
          </div>

          <WoodongsLinkCard
            storeName={selectedStore?.name ?? null}
            productNames={filteredProducts.slice(0, 5).map((p) => p.name)}
          />

          {/* Search & Filters */}
          <div className="bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8B8172] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="상품명 또는 카테고리 검색 (예: 불닭, 치즈, 닭가슴살)"
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] text-sm focus:outline-none focus:ring-2 focus:ring-[#319447]"
                />
              </div>

              <select
                aria-label="가격 정렬"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DDD2BE] bg-white text-xs font-bold text-[#252525] cursor-pointer"
              >
                <option value="default">기본 순</option>
                <option value="price_asc">가격 낮은 순</option>
                <option value="price_desc">가격 높은 순</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'ALL', label: '전체 상품' },
                  { id: '1+1', label: '1+1 행사' },
                  { id: '2+1', label: '2+1 행사' },
                  { id: 'DISCOUNT', label: '가격 할인' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPromoFilter(tab.id)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    promoFilter === tab.id
                      ? 'bg-[#F49A24] text-white'
                      : 'bg-[#F5EFE0] text-[#554E43]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[#F0E7D6]">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#252525] text-white'
                      : 'bg-[#FAF6EC] text-[#5C5549] hover:bg-[#EFE5D2]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const expired = isPromotionExpired(product);
              return (
                <article
                  key={product.productId}
                  className="bg-white border border-[#EAE0CC] rounded-2xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={getProductImageUrl(product)}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-xl object-contain bg-white p-1 border border-[#EFE5D2] shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs text-[#6B6355]">
                        <span>
                          GS25 · {product.category}
                        </span>
                        <span
                          className={`font-bold shrink-0 ${
                            expired
                              ? 'text-[#8A8070]'
                              : product.promotionType !== 'NONE'
                                ? 'text-[#F49A24]'
                                : 'text-[#6B6355]'
                          }`}
                        >
                          {expired
                            ? '행사 종료'
                            : product.promotionType !== 'NONE'
                              ? product.promotionType
                              : '일반 상품'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#252525]">{product.name}</h3>

                      {product.promotionDescription && (
                        <p className="text-xs text-[#5C5549] leading-relaxed">
                          {product.promotionDescription}
                        </p>
                      )}

                      {product.promotionPeriod && (
                        <p className="text-[11px] font-num text-[#7D7465]">
                          행사 기간: {product.promotionPeriod.start} ~ {product.promotionPeriod.end}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F0E7D6] space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs text-[#6B6355]">예시 가격</span>
                      <div className="font-num text-right">
                        {product.regularPrice === null ? (
                          <span className="text-sm font-bold text-[#F49A24]">가격 확인 필요</span>
                        ) : !expired && product.salePrice ? (
                          <>
                            <span className="text-xs text-[#8A8070] line-through mr-1.5">
                              {formatKRW(product.regularPrice)}
                            </span>
                            <span className="text-base font-extrabold text-[#252525]">
                              {formatKRW(product.salePrice)}
                            </span>
                          </>
                        ) : (
                          <span className="text-base font-extrabold text-[#252525]">
                            {formatKRW(product.regularPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#756D60]">
                      <span>{getAvailabilityLabel(product.availabilityStatus)}</span>
                      <span>
                        {product.dataSourceLabel} · 확인 {product.lastVerifiedAt || '미확인'}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white border border-dashed border-[#D8CCB4] rounded-2xl p-8 text-center text-sm text-[#6B6355]">
              검색 조건에 맞는 상품이 없습니다.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
