import { BRAND_METADATA, GS25_SAMPLE_PRODUCTS } from '../data/gs25SampleCatalog.ts';
import type {
  BrandId,
  Product,
  RecommendationRequest,
  RecommendationResponse,
  Store,
  VerifiedComboItem,
  VerifiedRecommendation,
} from '../types.ts';
import { calculateDistanceMeters } from './geo.ts';
import {
  calculateLinePricing,
  getTodayIsoDate,
  isPromotionExpired,
  summarizeBudget,
} from './pricing.ts';
import { getProductImageUrl } from './productImages.ts';

function detectBrandClient(name: string): BrandId | null {
  const upper = name.toUpperCase();
  if (
    upper.includes('GS25') ||
    upper.includes('GS 25') ||
    upper.includes('GS편의점') ||
    /지에스\s*(\(GS\))?\s*25/i.test(name)
  ) {
    return 'GS25';
  }
  if (/(^|[\s(\[/·-])CU($|[\s가-힣0-9)\]/·-])/.test(upper) || name.includes('씨유')) {
    return 'CU';
  }
  if (upper.includes('7-ELEVEN') || upper.includes('7ELEVEN') || name.includes('세븐일레븐')) {
    return 'SEVEN_ELEVEN';
  }
  if (upper.includes('EMART24') || /이마트\s*24/.test(name)) {
    return 'EMART24';
  }
  return null;
}

export async function geocodeLocationClient(
  query: string,
): Promise<{ ok: boolean; lat?: number; lng?: number; label?: string; fullAddress?: string }> {
  try {
    const arcUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=${encodeURIComponent(
      query,
    )}&countryCode=KOR&langCode=ko&outFields=PlaceName,Place_addr&maxLocations=1`;
    const res = await fetch(arcUrl);
    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: Array<{
          address?: string;
          location?: { x?: number; y?: number };
          attributes?: { PlaceName?: string; Place_addr?: string };
        }>;
      };
      const top = data.candidates?.[0];
      if (top?.location && Number.isFinite(top.location.y) && Number.isFinite(top.location.x)) {
        return {
          ok: true,
          lat: Number(top.location.y),
          lng: Number(top.location.x),
          label: top.attributes?.PlaceName || top.address || query,
          fullAddress: top.attributes?.Place_addr || top.address || query,
        };
      }
    }
  } catch {
    // Ignore CORS/network errors
  }
  return { ok: false };
}

export async function fetchNearbyStoresClient(
  lat: number,
  lng: number,
): Promise<{ ok: boolean; addressLabel: string | null; stores: Store[] }> {
  const todayIso = getTodayIsoDate();
  let addressLabel: string | null = null;
  const stores: Store[] = [];

  try {
    const reverseUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat.toFixed(
      6,
    )}&longitude=${lng.toFixed(6)}&localityLanguage=ko`;
    const tightLat = 0.0115;
    const tightLng = 0.0145;
    const extent = `${(lng - tightLng).toFixed(5)},${(lat - tightLat).toFixed(5)},${(
      lng + tightLng
    ).toFixed(5)},${(lat + tightLat).toFixed(5)}`;
    const storeSearchUrl = (keyword: string) =>
      `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=${encodeURIComponent(
        keyword,
      )}&location=${lng.toFixed(5)},${lat.toFixed(
        5,
      )}&searchExtent=${extent}&countryCode=KOR&langCode=ko&outFields=PlaceName,Place_addr&maxLocations=25`;

    const [revRes, gsRes, convRes] = await Promise.all([
      fetch(reverseUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(storeSearchUrl('GS25')).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(storeSearchUrl('Convenience Store')).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);

    if (revRes) {
      const rev = revRes as { principalSubdivision?: string; city?: string; locality?: string };
      const parts = [rev.principalSubdivision, rev.city, rev.locality].filter(
        (v): v is string => Boolean(v && v.trim()),
      );
      if (parts.length > 0) {
        addressLabel = Array.from(new Set(parts)).join(' ');
      }
    }

    const seenIds = new Set<string>();
    const addCandidates = (resp: unknown) => {
      const cands = (resp as {
        candidates?: Array<{
          address?: string;
          location?: { x?: number; y?: number };
          attributes?: { PlaceName?: string; Place_addr?: string };
        }>;
      } | null)?.candidates;
      if (!Array.isArray(cands)) return;
      for (const cand of cands) {
        const itemLat = Number(cand.location?.y);
        const itemLng = Number(cand.location?.x);
        if (!Number.isFinite(itemLat) || !Number.isFinite(itemLng)) continue;
        if (calculateDistanceMeters(lat, lng, itemLat, itemLng) > 1500) continue;

        const rawName = (cand.attributes?.PlaceName || cand.address || '').trim();
        const brand = detectBrandClient(rawName);
        if (!brand) continue;

        const storeId = `live_${brand.toLowerCase()}_${itemLat.toFixed(5)}_${itemLng.toFixed(5)}`;
        if (seenIds.has(storeId)) continue;
        seenIds.add(storeId);

        stores.push({
          storeId,
          brand,
          name: rawName || BRAND_METADATA[brand].label,
          address: (cand.attributes?.Place_addr || '').trim() || addressLabel || '주소 정보 확인 필요',
          lat: itemLat,
          lng: itemLng,
          dataSource: 'OSM_NOMINATIM',
          lastVerifiedAt: todayIso,
          operatingStatusNote:
            '실제 지도 위치 데이터 · 영업 여부 및 매장별 재고는 방문 확인 필요',
        });
      }
    };

    addCandidates(gsRes);
    addCandidates(convRes);
    stores.sort(
      (a, b) =>
        calculateDistanceMeters(lat, lng, a.lat, a.lng) -
        calculateDistanceMeters(lat, lng, b.lat, b.lng),
    );
  } catch {
    return { ok: false, addressLabel: null, stores: [] };
  }

  return { ok: true, addressLabel, stores };
}

export function buildClientFallbackRecommendationResponse(
  req: RecommendationRequest,
): RecommendationResponse {
  const todayIso = getTodayIsoDate();

  if (!BRAND_METADATA[req.brand]?.supportedInPhase1) {
    return {
      status: 'NO_DATA',
      recommendations: [],
      excludedOverBudgetCount: 0,
      message: `${BRAND_METADATA[req.brand]?.label || req.brand} 상품 데이터는 현재 연동 준비 중입니다. 1차 지원 브랜드인 GS25 매장을 선택해 주세요.`,
      generatedAt: new Date().toISOString(),
    };
  }

  const eligible = GS25_SAMPLE_PRODUCTS.filter((product) => {
    if (product.brand !== req.brand) return false;
    if (product.regularPrice === null) return false;
    if (product.regularPrice > req.budget && !(product.salePrice && product.salePrice <= req.budget)) {
      return false;
    }
    if (req.preferences.includes('행사 상품 제외')) {
      const hasActivePromo = product.promotionType !== 'NONE' && !isPromotionExpired(product, todayIso);
      if (hasActivePromo) return false;
    }
    if (req.preferences.includes('3분 이내 조리') && product.estimatedPrepMinutes > 3) {
      return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    return {
      status: 'NO_DATA',
      recommendations: [],
      excludedOverBudgetCount: 0,
      message: '선택한 브랜드 또는 예산 조건에 맞는 샘플 상품 데이터가 부족합니다.',
      generatedAt: new Date().toISOString(),
    };
  }

  const catalogMap = new Map(eligible.map((p) => [p.productId, p]));
  const scored = [...eligible].sort((a, b) => {
    const scoreProduct = (p: Product) => {
      let score = 0;
      for (const f of req.flavors) {
        if (p.flavorTags.includes(f)) score += 3;
      }
      if (p.mealSituations.includes(req.mealSituation)) score += 3;
      if (req.preferences.includes('1+1 행사 상품 우선') && p.promotionType === '1+1') score += 4;
      if (req.preferences.includes('2+1 행사 상품 우선') && p.promotionType === '2+1') score += 4;
      if (req.preferences.includes('고단백 상품 우선') && p.nutrition && p.nutrition.proteinGrams >= 15) {
        score += 4;
      }
      if (req.preferences.includes('3분 이내 조리') && p.estimatedPrepMinutes <= 3) score += 2;
      return score;
    };
    return scoreProduct(b) - scoreProduct(a);
  });

  const candidates: Array<{
    title: string;
    description: string;
    items: Array<{ productId: string; quantity: number }>;
    reason: string;
    estimatedCookingMinutes: number;
    recipe: Array<{ step: number; instruction: string; minutes: number }>;
  }> = [];

  if (
    req.budget >= 4300 &&
    (req.flavors.includes('매콤') || req.flavors.includes('고소') || req.flavors.length === 0) &&
    catalogMap.has('gs25_demo_001') &&
    catalogMap.has('gs25_demo_002') &&
    catalogMap.has('gs25_demo_003')
  ) {
    candidates.push({
      title: '치즈 불닭 계란범벅',
      description: '매콤한 볶음면에 모짜렐라 치즈와 훈제란을 더한 든든한 한 끼',
      items: [
        { productId: 'gs25_demo_001', quantity: 1 },
        { productId: 'gs25_demo_002', quantity: 1 },
        { productId: 'gs25_demo_003', quantity: 1 },
      ],
      reason: '매콤한 맛과 고소한 치즈, 훈제란이 어우러져 5,000원 이하로 균형 잡힌 포만감을 줍니다.',
      estimatedCookingMinutes: 3,
      recipe: [
        {
          step: 1,
          instruction: '불닭볶음면 큰컵에 표시선까지 온수를 붓고 2분간 면을 익힌 뒤 물을 2큰술 남기고 버립니다.',
          minutes: 2,
        },
        {
          step: 2,
          instruction: '액상 소스를 비빈 후 스트링치즈를 잘게 찢어 올리고 전자레인지에 30초 데웁니다.',
          minutes: 1,
        },
        {
          step: 3,
          instruction: '훈제란을 껍질째 까서 반으로 잘라 올리고 동봉된 김가루·참깨를 뿌려 마무리합니다.',
          minutes: 0,
        },
      ],
    });
  }

  for (let start = 0; start < Math.min(scored.length, 4) && candidates.length < 3; start++) {
    const picked: Product[] = [];
    let runningCost = 0;
    const anchor = scored[start];
    if ((anchor.regularPrice ?? 999999) <= req.budget) {
      picked.push(anchor);
      runningCost += anchor.regularPrice ?? 0;
      for (const next of scored) {
        if (picked.some((p) => p.productId === next.productId)) continue;
        if (picked.length >= 3) break;
        const unitCost =
          next.promotionType === 'DISCOUNT' && next.salePrice && !isPromotionExpired(next, todayIso)
            ? next.salePrice
            : next.regularPrice ?? 999999;
        if (runningCost + unitCost <= req.budget) {
          picked.push(next);
          runningCost += unitCost;
        }
      }
    }
    if (picked.length >= 2) {
      const signature = picked.map((p) => p.productId).sort().join(',');
      const duplicate = candidates.some(
        (c) => c.items.map((i) => i.productId).sort().join(',') === signature,
      );
      if (!duplicate) {
        candidates.push({
          title: `${picked[0].name.split(' ')[0]} · ${picked[1].name.split(' ')[0]} 알뜰 세트`,
          description: `${req.mealSituation}에 맞춰 예산 내에서 구성한 간편 조합`,
          items: picked.map((p) => ({ productId: p.productId, quantity: 1 })),
          reason: `선택하신 '${req.flavors.join(', ') || '기본'}' 취향과 ${req.mealSituation} 조건에 맞춰 샘플 DB에서 계산한 조합입니다.`,
          estimatedCookingMinutes: Math.max(...picked.map((p) => p.estimatedPrepMinutes), 1),
          recipe: picked.map((p, idx) => {
            let instruction = `${p.name} 포장을 개봉해 먹기 좋게 준비합니다.`;
            if (/불닭/.test(p.name)) {
              instruction = `${p.name}에 표시선까지 온수를 붓고 2~3분 익힌 뒤 물을 2큰술만 남기고 따라내 소스를 비빕니다.`;
            } else if (p.hotWaterRequired) {
              instruction = `${p.name} 뚜껑을 1/3 열고 표시선까지 온수를 부어 약 ${Math.max(2, p.estimatedPrepMinutes)}분간 조리합니다.`;
            } else if (/삼각김밥/.test(p.name)) {
              instruction = `${p.name} 포장을 1·2·3 순서로 개봉하거나 살짝 튼 뒤 전자레인지에 20~30초 데웁니다.`;
            } else if (/치즈/.test(p.name)) {
              instruction = `${p.name}을(를) 결대로 찢어 올리고 전자레인지에 20~30초 데워 녹여줍니다.`;
            } else if (p.microwaveAvailable) {
              instruction = `${p.name} 포장 모서리를 살짝 뜯은 뒤 전자레인지에 약 ${Math.max(1, p.estimatedPrepMinutes)}분 데워 준비합니다.`;
            } else if (/훈제란|반숙란/.test(p.name)) {
              instruction = `${p.name} 껍질을 까서 반으로 쪼개 토핑으로 곁들입니다 (달걀 통째 가열 금지).`;
            }
            return {
              step: idx + 1,
              instruction,
              minutes: p.estimatedPrepMinutes,
            };
          }),
        });
      }
    }
  }

  const verified: VerifiedRecommendation[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const raw = candidates[i];
    const verifiedItems: VerifiedComboItem[] = [];
    let valid = true;
    for (const entry of raw.items) {
      const product = catalogMap.get(entry.productId);
      if (!product) {
        valid = false;
        break;
      }
      const line = calculateLinePricing(product, entry.quantity, todayIso);
      if (line.priceUnknown) {
        valid = false;
        break;
      }
      verifiedItems.push(line);
    }
    if (!valid || verifiedItems.length === 0) continue;

    const summary = summarizeBudget(verifiedItems, req.budget);
    if (summary.isOverBudget) continue;

    verified.push({
      id: `combo_static_${Date.now()}_${i}`,
      title: raw.title,
      description: raw.description,
      items: verifiedItems,
      regularTotal: summary.regularTotal,
      totalDiscount: summary.totalDiscount,
      totalPrice: summary.finalTotal,
      remainingBudget: summary.remainingBudget,
      budget: req.budget,
      hasUnknownPrice: summary.hasUnknownPrice,
      reason: raw.reason,
      estimatedCookingMinutes: raw.estimatedCookingMinutes,
      usesMicrowave: verifiedItems.some((item) => item.product.microwaveAvailable),
      usesHotWater: verifiedItems.some((item) => item.product.hotWaterRequired),
      prepNote: '결제 전 매장 내 행사 안내표와 전자레인지·온수기 사용 가능 여부를 확인해 주세요.',
      safetyNote: '조리 직후 용기가 매우 뜨거울 수 있으므로 화상에 주의하고, 은박 포장재는 전자레인지에 넣지 마세요.',
      recipe: raw.recipe,
      imageUrl: verifiedItems[0] ? getProductImageUrl(verifiedItems[0].product) : undefined,
      sourceType: 'DATA_FALLBACK',
      dataNotice: '샘플 상품 DB 기준 규칙 계산 · GitHub Pages 정적 환경 지원 모드',
    });
  }

  return {
    status: verified.length > 0 ? 'OK' : 'NO_DATA',
    recommendations: verified.slice(0, 3),
    excludedOverBudgetCount: 0,
    message:
      verified.length > 0
        ? '샘플 상품 DB의 규칙 기반 계산으로 생성된 예산 내 조합입니다.'
        : '설정한 예산 안에서 구성 가능한 조합을 찾지 못했습니다. 예산을 높이거나 조건을 완화해 보세요.',
    generatedAt: new Date().toISOString(),
  };
}
