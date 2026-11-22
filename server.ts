import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GS25_SAMPLE_PRODUCTS, BRAND_METADATA } from './src/data/gs25SampleCatalog.ts';
import {
  calculateLinePricing,
  getTodayIsoDate,
  isPromotionExpired,
  summarizeBudget,
} from './src/utils/pricing.ts';
import { getProductImageUrl } from './src/utils/productImages.ts';
import type {
  BrandId,
  FlavorTheme,
  MealSituation,
  PreferenceOption,
  Product,
  RecommendationRequest,
  RecommendationResponse,
  Store,
  VerifiedComboItem,
  VerifiedRecommendation,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getCliFlag(name: string): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === `--${name}` && args[i + 1]) {
      return args[i + 1];
    }
    if (arg.startsWith(`--${name}=`)) {
      return arg.slice(`--${name}=`.length);
    }
  }
  return undefined;
}

const PORT = Number(getCliFlag('port') || process.env.PORT || 3000);
const HOST = getCliFlag('host') || process.env.HOST || '0.0.0.0';

function pickComboImage(items: VerifiedComboItem[]): string {
  const lead = items[0]?.product;
  if (lead) {
    return getProductImageUrl(lead);
  }
  return '/assets/products/buldak.jpg';
}

function getEligibleCatalog(req: RecommendationRequest): Product[] {
  const todayIso = getTodayIsoDate();

  return GS25_SAMPLE_PRODUCTS.filter((product) => {
    if (product.brand !== req.brand) return false;
    // 가격 미확인 상품은 총액 검증 불가하므로 추천 후보에서 제외
    if (product.regularPrice === null) return false;
    // 예산 단품 초과 상품 제외
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
}

function verifyAndBuildRecommendation(
  raw: {
    title?: string;
    description?: string;
    items?: Array<{ productId?: string; quantity?: number }>;
    reason?: string;
    estimatedCookingMinutes?: number;
    prepNote?: string;
    safetyNote?: string;
    recipe?: Array<{ step?: number; instruction?: string; minutes?: number }>;
  },
  catalogMap: Map<string, Product>,
  budget: number,
  index: number,
  sourceType: 'GEMINI_AI' | 'DATA_FALLBACK',
): { ok: true; value: VerifiedRecommendation } | { ok: false; overBudget: boolean } {
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  if (rawItems.length === 0) {
    return { ok: false, overBudget: false };
  }

  // Merge duplicate productIds
  const mergedQuantities = new Map<string, number>();
  for (const entry of rawItems) {
    if (!entry?.productId || typeof entry.productId !== 'string') continue;
    const product = catalogMap.get(entry.productId);
    if (!product) continue;
    const qty = Math.max(1, Math.min(5, Math.floor(Number(entry.quantity) || 1)));
    mergedQuantities.set(entry.productId, (mergedQuantities.get(entry.productId) || 0) + qty);
  }

  if (mergedQuantities.size === 0) {
    return { ok: false, overBudget: false };
  }

  const todayIso = getTodayIsoDate();
  const verifiedItems: VerifiedComboItem[] = [];
  for (const [productId, quantity] of mergedQuantities.entries()) {
    const product = catalogMap.get(productId)!;
    const line = calculateLinePricing(product, quantity, todayIso);
    if (line.priceUnknown) {
      return { ok: false, overBudget: false };
    }
    verifiedItems.push(line);
  }

  const budgetSummary = summarizeBudget(verifiedItems, budget);
  if (budgetSummary.isOverBudget) {
    return { ok: false, overBudget: true };
  }

  const usesMicrowave = verifiedItems.some((item) => item.product.microwaveAvailable);
  const usesHotWater = verifiedItems.some((item) => item.product.hotWaterRequired);
  const computedCookMinutes = Math.max(
    1,
    Math.min(
      10,
      Number(raw.estimatedCookingMinutes) ||
        Math.max(...verifiedItems.map((i) => i.product.estimatedPrepMinutes), 1),
    ),
  );

  const recipeSteps =
    Array.isArray(raw.recipe) && raw.recipe.length > 0
      ? raw.recipe
          .filter((s) => s && typeof s.instruction === 'string' && s.instruction.trim().length > 0)
          .map((s, idx) => ({
            step: idx + 1,
            instruction: s.instruction!.trim(),
            minutes: Math.max(0, Number(s.minutes) || 1),
          }))
      : [
          {
            step: 1,
            instruction: '선택한 상품 포장을 개봉하고 전자레인지·온수 조리 순서를 확인합니다.',
            minutes: 1,
          },
          {
            step: 2,
            instruction: '안내된 조리 시간에 맞춰 데우거나 섞어 완성합니다.',
            minutes: Math.max(1, computedCookMinutes - 1),
          },
        ];

  return {
    ok: true,
    value: {
      id: `combo_${Date.now()}_${index}`,
      title: (raw.title || '편의점 간편 꿀조합').trim(),
      description: (raw.description || '예산 안에서 즐기는 간편 편의점 조합').trim(),
      items: verifiedItems,
      regularTotal: budgetSummary.regularTotal,
      totalDiscount: budgetSummary.totalDiscount,
      totalPrice: budgetSummary.finalTotal,
      remainingBudget: budgetSummary.remainingBudget,
      budget,
      hasUnknownPrice: budgetSummary.hasUnknownPrice,
      reason: (raw.reason || '선택하신 예산과 맛 테마에 맞춘 조합입니다.').trim(),
      estimatedCookingMinutes: computedCookMinutes,
      usesMicrowave,
      usesHotWater,
      prepNote:
        (raw.prepNote || '').trim() ||
        '결제 전 매장 내 행사 안내표와 전자레인지·온수기 사용 가능 여부를 확인해 주세요.',
      safetyNote:
        (raw.safetyNote || '').trim() ||
        '조리 직후 용기가 매우 뜨거울 수 있으므로 화상에 주의하고, 은박 포장재는 전자레인지에 넣지 마세요.',
      recipe: recipeSteps,
      imageUrl: pickComboImage(verifiedItems),
      sourceType,
      dataNotice: '샘플 상품 DB 기준 계산 · 매장별 실제 가격 및 재고는 방문 확인 필요',
    },
  };
}

function buildDeterministicFallback(req: RecommendationRequest): RecommendationResponse {
  const eligible = getEligibleCatalog(req);
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

  // Classic 5,000원 example preset if matching items exist & fit budget
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
        { step: 1, instruction: '불닭볶음면 큰컵에 표시선까지 온수를 붓고 2분간 면을 익힌 뒤 물을 2큰술 남기고 버립니다.', minutes: 2 },
        { step: 2, instruction: '액상 소스를 비빈 후 스트링치즈를 잘게 찢어 올리고 전자레인지에 30초 데웁니다.', minutes: 1 },
        { step: 3, instruction: '훈제란을 껍질째 까서 반으로 잘라 올리고 동봉된 김가루·참깨를 뿌려 마무리합니다.', minutes: 0 },
      ],
    });
  }

  // Build up to 2 more greedy budget-safe combos
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
          next.promotionType === 'DISCOUNT' && next.salePrice && !isPromotionExpired(next)
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
        (c) =>
          c.items
            .map((i) => i.productId)
            .sort()
            .join(',') === signature,
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
    const result = verifyAndBuildRecommendation(
      candidates[i],
      catalogMap,
      req.budget,
      i,
      'DATA_FALLBACK',
    );
    if (result.ok) {
      verified.push(result.value);
    }
  }

  return {
    status: verified.length > 0 ? 'OK' : 'NO_DATA',
    recommendations: verified.slice(0, 3),
    excludedOverBudgetCount: 0,
    message:
      verified.length > 0
        ? 'Gemini AI 대신 샘플 상품 DB의 규칙 기반 계산으로 생성된 예산 내 조합입니다.'
        : '설정한 예산 안에서 구성 가능한 조합을 찾지 못했습니다. 예산을 높이거나 조건을 완화해 보세요.',
    generatedAt: new Date().toISOString(),
  };
}

interface OsmNominatimItem {
  place_id: number;
  osm_id?: number;
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  category?: string;
  type?: string;
  extratags?: Record<string, string> | null;
  address?: {
    shop?: string;
    road?: string;
    house_number?: string;
    quarter?: string;
    suburb?: string;
    borough?: string;
    city?: string;
    town?: string;
    county?: string;
    state?: string;
  };
}

interface PhotonFeatureCollection {
  features?: Array<{
    geometry?: {
      coordinates?: [number, number];
    };
    properties?: {
      osm_id?: number;
      name?: string;
      brand?: string;
      street?: string;
      housenumber?: string;
      locality?: string;
      district?: string;
      city?: string;
      state?: string;
      countrycode?: string;
    };
  }>;
}

interface ArcGisCandidateResponse {
  candidates?: Array<{
    address?: string;
    location?: { x?: number; y?: number };
    attributes?: {
      PlaceName?: string;
      Place_addr?: string;
      Type?: string;
      City?: string;
      District?: string;
      Nbrhd?: string;
      StAddr?: string;
    };
  }>;
}

interface ArcGisReverseResponse {
  address?: {
    Match_addr?: string;
    LongLabel?: string;
    ShortLabel?: string;
    Address?: string;
    Neighborhood?: string;
    District?: string;
    City?: string;
    Subregion?: string;
    Region?: string;
  };
}

interface BigDataCloudReverseResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  localityInfo?: {
    administrative?: Array<{ name?: string; order?: number }>;
  };
}

const nearbyStoresCache = new Map<
  string,
  { expiresAt: number; addressLabel: string | null; stores: Store[] }
>();

function detectBrandFromName(
  name: string,
  extratags?: Record<string, string> | null,
): BrandId | null {
  const combined = [
    name,
    extratags?.brand || '',
    extratags?.['brand:ko'] || '',
    extratags?.['brand:en'] || '',
    extratags?.operator || '',
  ]
    .join(' ')
    .trim();
  const upper = combined.toUpperCase();

  if (
    upper.includes('GS25') ||
    upper.includes('GS 25') ||
    upper.includes('GS편의점') ||
    /지에스\s*(\(GS\))?\s*25/i.test(combined)
  ) {
    return 'GS25';
  }
  if (
    /(^|[\s(\[/·-])CU($|[\s가-힣0-9)\]/·-])/.test(upper) ||
    combined.includes('씨유')
  ) {
    return 'CU';
  }
  if (
    upper.includes('7-ELEVEN') ||
    upper.includes('7ELEVEN') ||
    combined.includes('세븐일레븐')
  ) {
    return 'SEVEN_ELEVEN';
  }
  if (upper.includes('EMART24') || /이마트\s*24/.test(combined)) {
    return 'EMART24';
  }
  return null;
}

function formatKoreanOsmAddress(item: OsmNominatimItem): string {
  const addr = item.address;
  if (addr) {
    const parts = [
      addr.city || addr.state,
      addr.borough || addr.county,
      addr.suburb || addr.quarter || addr.town,
      addr.road,
      addr.house_number,
    ].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }
  }
  return item.display_name || '주소 정보 없음';
}

function formatArcGisAddress(rev: ArcGisReverseResponse | null): string | null {
  const addr = rev?.address;
  if (!addr) return null;
  const parts = [addr.Region, addr.City, addr.Neighborhood, addr.Address].filter(
    (v): v is string => Boolean(v && v.trim()),
  );
  if (parts.length > 0) {
    return Array.from(new Set(parts)).join(' ');
  }
  return addr.LongLabel || addr.Match_addr || addr.ShortLabel || null;
}

function formatBigDataCloudAddress(rev: BigDataCloudReverseResponse | null): string | null {
  if (!rev) return null;
  const parts = [rev.principalSubdivision, rev.city, rev.locality].filter(
    (v): v is string => Boolean(v && v.trim()),
  );
  if (parts.length > 0) {
    return Array.from(new Set(parts)).join(' ');
  }
  return null;
}

function approxMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchExternalJson<T>(url: string, timeoutMs = 5000): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CVSMealCurator/1.0 (https://aistudio.google.com)',
        'Accept-Language': 'ko,en;q=0.8',
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    return next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
    });
  });

  app.get('/api/geocode', async (req, res) => {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.status(400).json({ ok: false, message: '검색어를 입력해 주세요.' });
    }

    const arcgisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=${encodeURIComponent(
      query,
    )}&countryCode=KOR&langCode=ko&outFields=PlaceName,Place_addr,City,Nbrhd&maxLocations=1`;
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query,
    )}&countrycodes=kr&format=jsonv2&addressdetails=1&accept-language=ko&limit=1`;

    const [arcgisRes, nominatimRes] = await Promise.all([
      fetchExternalJson<ArcGisCandidateResponse>(arcgisUrl, 4500),
      fetchExternalJson<OsmNominatimItem[]>(nominatimUrl, 4500),
    ]);

    const arcTop = arcgisRes?.candidates?.[0];
    if (
      arcTop?.location &&
      Number.isFinite(arcTop.location.y) &&
      Number.isFinite(arcTop.location.x)
    ) {
      return res.json({
        ok: true,
        lat: Number(arcTop.location.y),
        lng: Number(arcTop.location.x),
        label: arcTop.attributes?.PlaceName || arcTop.address || query,
        fullAddress: arcTop.attributes?.Place_addr || arcTop.address || query,
      });
    }

    if (nominatimRes && nominatimRes.length > 0) {
      const top = nominatimRes[0];
      const lat = Number(top.lat);
      const lng = Number(top.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return res.json({
          ok: true,
          lat,
          lng,
          label: top.name || formatKoreanOsmAddress(top),
          fullAddress: formatKoreanOsmAddress(top),
        });
      }
    }

    return res.json({ ok: false, message: '해당 위치 좌표를 찾지 못했습니다.' });
  });

  app.get('/api/stores/nearby', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, stores: [], addressLabel: null });
    }

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = nearbyStoresCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() && (cached.stores.length > 0 || cached.addressLabel)) {
      return res.json({
        ok: true,
        addressLabel: cached.addressLabel,
        stores: cached.stores,
        source: 'OSM_NOMINATIM',
      });
    }

    // Tight ~450m extent & wide ~1.3km extent for ArcGIS + Nominatim
    const tightLat = 0.0042;
    const tightLng = 0.0052;
    const wideLat = 0.0115;
    const wideLng = 0.0145;

    const arcgisTightExtent = `${(lng - tightLng).toFixed(5)},${(lat - tightLat).toFixed(5)},${(
      lng + tightLng
    ).toFixed(5)},${(lat + tightLat).toFixed(5)}`;
    const arcgisWideExtent = `${(lng - wideLng).toFixed(5)},${(lat - wideLat).toFixed(5)},${(
      lng + wideLng
    ).toFixed(5)},${(lat + wideLat).toFixed(5)}`;

    const buildArcGisStoreUrl = (query: string, extent: string, maxLocations: number) =>
      `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=${encodeURIComponent(
        query,
      )}&location=${lng.toFixed(5)},${lat.toFixed(
        5,
      )}&searchExtent=${extent}&countryCode=KOR&langCode=ko&outFields=PlaceName,Place_addr,Type&maxLocations=${maxLocations}`;

    const arcgisReverseUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=json&location=${lng.toFixed(
      6,
    )},${lat.toFixed(6)}&langCode=ko`;
    const bigDataCloudReverseUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat.toFixed(
      6,
    )}&longitude=${lng.toFixed(6)}&localityLanguage=ko`;

    const osmTightViewbox = `${(lng - 0.003).toFixed(5)},${(lat + 0.0028).toFixed(5)},${(
      lng + 0.003
    ).toFixed(5)},${(lat - 0.0028).toFixed(5)}`;
    const nominatimReverseUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ko&addressdetails=1`;
    const nominatimTightUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      '[shop=convenience]',
    )}&format=jsonv2&addressdetails=1&extratags=1&accept-language=ko&viewbox=${osmTightViewbox}&bounded=1&limit=40`;

    const [
      arcRev,
      bdcRev,
      arcTightConvenience,
      arcWideConvenience,
      arcBrandGs25,
      arcBrandCu,
      arcBrandSeven,
      arcBrandEmart,
      osmRev,
      osmTightItems,
    ] = await Promise.all([
      fetchExternalJson<ArcGisReverseResponse>(arcgisReverseUrl, 4500),
      fetchExternalJson<BigDataCloudReverseResponse>(bigDataCloudReverseUrl, 4500),
      fetchExternalJson<ArcGisCandidateResponse>(
        buildArcGisStoreUrl('Convenience Store', arcgisTightExtent, 35),
        4500,
      ),
      fetchExternalJson<ArcGisCandidateResponse>(
        buildArcGisStoreUrl('Convenience Store', arcgisWideExtent, 50),
        4500,
      ),
      fetchExternalJson<ArcGisCandidateResponse>(
        buildArcGisStoreUrl('GS25', arcgisWideExtent, 20),
        4500,
      ),
      fetchExternalJson<ArcGisCandidateResponse>(
        buildArcGisStoreUrl('CU', arcgisWideExtent, 20),
        4500,
      ),
      fetchExternalJson<ArcGisCandidateResponse>(
        buildArcGisStoreUrl('세븐일레븐', arcgisWideExtent, 20),
        4500,
      ),
      fetchExternalJson<ArcGisCandidateResponse>(
        buildArcGisStoreUrl('이마트24', arcgisWideExtent, 20),
        4500,
      ),
      fetchExternalJson<OsmNominatimItem>(nominatimReverseUrl, 3500),
      fetchExternalJson<OsmNominatimItem[]>(nominatimTightUrl, 3500),
    ]);

    const addressLabel =
      formatArcGisAddress(arcRev) ||
      formatBigDataCloudAddress(bdcRev) ||
      (osmRev ? formatKoreanOsmAddress(osmRev) : null);

    const todayIso = getTodayIsoDate();
    const storeMap = new Map<string, Store>();

    const upsertStore = (candidate: Store) => {
      if (approxMeters(lat, lng, candidate.lat, candidate.lng) > 1500) {
        return;
      }
      for (const existing of storeMap.values()) {
        if (
          existing.storeId === candidate.storeId ||
          (existing.brand === candidate.brand &&
            approxMeters(existing.lat, existing.lng, candidate.lat, candidate.lng) <= 25)
        ) {
          return;
        }
      }
      storeMap.set(candidate.storeId, candidate);
    };

    const addArcGisCandidates = (resp: ArcGisCandidateResponse | null) => {
      const candidates = resp?.candidates;
      if (!Array.isArray(candidates)) return;
      for (const cand of candidates) {
        const itemLat = Number(cand.location?.y);
        const itemLng = Number(cand.location?.x);
        if (!Number.isFinite(itemLat) || !Number.isFinite(itemLng)) continue;

        const rawName = (cand.attributes?.PlaceName || cand.address || '').trim();
        const detectedBrand = detectBrandFromName(rawName);
        if (!detectedBrand) continue;

        const addrText = (cand.attributes?.Place_addr || '').trim();
        const storeId = `live_${detectedBrand.toLowerCase()}_${itemLat.toFixed(5)}_${itemLng.toFixed(5)}`;
        upsertStore({
          storeId,
          brand: detectedBrand,
          name: rawName || BRAND_METADATA[detectedBrand].label,
          address: addrText || addressLabel || '주소 정보 확인 필요',
          lat: itemLat,
          lng: itemLng,
          dataSource: 'OSM_NOMINATIM',
          lastVerifiedAt: todayIso,
          operatingStatusNote:
            '실제 지도 위치 데이터 · 영업 여부 및 매장별 재고는 방문 확인 필요',
        });
      }
    };

    const addNominatimItems = (items: OsmNominatimItem[] | null) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        const itemLat = Number(item.lat);
        const itemLng = Number(item.lon);
        if (!Number.isFinite(itemLat) || !Number.isFinite(itemLng)) continue;

        const rawName = (item.name || item.address?.shop || '').trim();
        const detectedBrand = detectBrandFromName(rawName, item.extratags);
        if (!detectedBrand) continue;

        const osmKey = item.osm_id ? `osm_${item.osm_id}` : `osm_p_${item.place_id}`;
        upsertStore({
          storeId: osmKey,
          brand: detectedBrand,
          name: rawName || BRAND_METADATA[detectedBrand].label,
          address: formatKoreanOsmAddress(item),
          lat: itemLat,
          lng: itemLng,
          dataSource: 'OSM_NOMINATIM',
          lastVerifiedAt: todayIso,
          operatingStatusNote:
            '실제 지도 위치 데이터 · 영업 여부 및 매장별 재고는 방문 확인 필요',
        });
      }
    };

    addArcGisCandidates(arcTightConvenience);
    addArcGisCandidates(arcWideConvenience);
    addArcGisCandidates(arcBrandGs25);
    addArcGisCandidates(arcBrandCu);
    addArcGisCandidates(arcBrandSeven);
    addArcGisCandidates(arcBrandEmart);
    addNominatimItems(osmTightItems);

    const mappedStores = Array.from(storeMap.values()).sort(
      (a, b) => approxMeters(lat, lng, a.lat, a.lng) - approxMeters(lat, lng, b.lat, b.lng),
    );

    if (mappedStores.length > 0 || addressLabel) {
      nearbyStoresCache.set(cacheKey, {
        expiresAt: Date.now() + 5 * 60 * 1000,
        addressLabel,
        stores: mappedStores,
      });
    }

    return res.json({
      ok: true,
      addressLabel,
      stores: mappedStores,
      source: 'OSM_NOMINATIM',
    });
  });

  app.post('/api/recommendations/fallback', (req, res) => {
    const body = req.body as Partial<RecommendationRequest>;
    const budget = Number(body.budget);
    if (!Number.isFinite(budget) || budget <= 0) {
      return res.status(400).json({
        status: 'NO_DATA',
        recommendations: [],
        excludedOverBudgetCount: 0,
        message: '올바른 예산(1원 이상)을 입력해 주세요.',
        generatedAt: new Date().toISOString(),
      } satisfies RecommendationResponse);
    }

    const requestPayload: RecommendationRequest = {
      budget: Math.floor(budget),
      flavors: Array.isArray(body.flavors) ? (body.flavors as FlavorTheme[]) : [],
      mealSituation: (body.mealSituation || '한 끼 식사') as MealSituation,
      preferences: Array.isArray(body.preferences) ? (body.preferences as PreferenceOption[]) : [],
      brand: (body.brand || 'GS25') as BrandId,
      storeName: body.storeName || 'GS25 샘플 매장',
      storeId: body.storeId || 'store_demo_sku_01',
    };

    return res.json(buildDeterministicFallback(requestPayload));
  });

  app.post('/api/recommendations', async (req, res) => {
    const body = req.body as Partial<RecommendationRequest>;
    const budget = Number(body.budget);
    const brand = (body.brand || 'GS25') as BrandId;

    if (!Number.isFinite(budget) || budget <= 0) {
      return res.status(400).json({
        status: 'NO_DATA',
        recommendations: [],
        excludedOverBudgetCount: 0,
        message: '예산은 1원 이상으로 입력해 주세요.',
        generatedAt: new Date().toISOString(),
      } satisfies RecommendationResponse);
    }

    if (!BRAND_METADATA[brand]?.supportedInPhase1) {
      return res.json({
        status: 'NO_DATA',
        recommendations: [],
        excludedOverBudgetCount: 0,
        message: `${BRAND_METADATA[brand]?.label || brand} 상품 데이터는 현재 연동 준비 중입니다. 1차 지원 브랜드인 GS25 매장을 선택해 주세요.`,
        generatedAt: new Date().toISOString(),
      } satisfies RecommendationResponse);
    }

    const requestPayload: RecommendationRequest = {
      budget: Math.floor(budget),
      flavors: Array.isArray(body.flavors) ? (body.flavors as FlavorTheme[]) : [],
      mealSituation: (body.mealSituation || '한 끼 식사') as MealSituation,
      preferences: Array.isArray(body.preferences) ? (body.preferences as PreferenceOption[]) : [],
      brand,
      storeName: body.storeName || 'GS25 샘플 매장',
      storeId: body.storeId || 'store_demo_sku_01',
    };

    const eligibleCatalog = getEligibleCatalog(requestPayload);
    if (eligibleCatalog.length < 2) {
      return res.json({
        status: 'NO_DATA',
        recommendations: [],
        excludedOverBudgetCount: 0,
        message: '설정한 예산 또는 조리·행사 필터에 해당하는 샘플 상품이 부족합니다. 예산을 늘리거나 조건을 조정해 보세요.',
        generatedAt: new Date().toISOString(),
      } satisfies RecommendationResponse);
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({
        status: 'AI_ERROR',
        recommendations: [],
        excludedOverBudgetCount: 0,
        errorCode: 'MISSING_API_KEY',
        message: 'GEMINI_API_KEY가 서버 환경변수에 설정되지 않아 AI 추천을 호출할 수 없습니다.',
        generatedAt: new Date().toISOString(),
      } satisfies RecommendationResponse);
    }

    const catalogMap = new Map(eligibleCatalog.map((p) => [p.productId, p]));
    const todayIso = getTodayIsoDate();

    const compactCatalogForPrompt = eligibleCatalog.map((p) => {
      const expired = isPromotionExpired(p, todayIso);
      const effectiveUnitPrice =
        p.promotionType === 'DISCOUNT' && !expired && p.salePrice ? p.salePrice : p.regularPrice;
      return {
        productId: p.productId,
        name: p.name,
        category: p.category,
        regularPrice: p.regularPrice,
        effectiveUnitPrice,
        promotionType: expired ? 'NONE' : p.promotionType,
        promotionNote: expired ? '행사 기간 만료(정가 적용)' : p.promotionDescription,
        proteinGrams: p.nutrition ? p.nutrition.proteinGrams : '영양정보 미확인(추정 금지)',
        microwaveAvailable: p.microwaveAvailable,
        hotWaterRequired: p.hotWaterRequired,
        estimatedPrepMinutes: p.estimatedPrepMinutes,
        flavorTags: p.flavorTags,
        mealSituations: p.mealSituations,
        availabilityStatus: p.availabilityStatus,
      };
    });

    const systemInstruction = `너는 한국 편의점 식사 조합을 추천하는 AI 큐레이터다.
반드시 아래 규칙을 100% 준수한다:
1. 제공된 catalog JSON 안에 있는 productId만 사용한다. 목록에 없는 상품명이나 가격을 절대 임의로 만들지 않는다.
2. 각 추천 조합의 총 예상 결제 금액은 반드시 사용자 예산(${requestPayload.budget}원) 이하가 되도록 상품을 구성한다. (1+1은 2개 담아야 1개 가격, 2+1은 3개 담아야 2개 가격이며 1개만 담으면 정가가 적용됨에 유의한다.)
3. 최대 3개의 서로 다른 매력적인 조합을 추천한다.
4. 사용자의 맛 테마(${requestPayload.flavors.join(', ') || '자유'}), 식사 상황(${requestPayload.mealSituation}), 추가 선호(${requestPayload.preferences.join(', ') || '없음'})를 적극 반영한다.
5. '3분 이내 조리' 선호가 있거나 기본적으로 빠른 식사가 유리하므로, 가급적 3분 이내에 편의점 전자레인지·온수기로 완성할 수 있는 조합과 단계별 레시피를 제시한다.
6. nutrition이 "영양정보 미확인(추정 금지)"인 상품에 대해서는 고단백·저칼로리 같은 영양 효과를 절대 단정하지 않는다.
7. 재고 상태는 모두 미확인(UNKNOWN)이므로 특정 매장에 무조건 재고가 있다고 단정하지 않는다.
8. 응답은 지정된 JSON 스키마 형식으로만 출력한다.`;

    const userPrompt = JSON.stringify(
      {
        store: {
          brand: requestPayload.brand,
          name: requestPayload.storeName,
        },
        conditions: {
          budgetWon: requestPayload.budget,
          flavorThemes: requestPayload.flavors,
          mealSituation: requestPayload.mealSituation,
          preferences: requestPayload.preferences,
        },
        catalog: compactCatalogForPrompt,
      },
      null,
      2,
    );

    try {
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: '조합 메뉴 이름 (한국어)' },
                    description: { type: Type.STRING, description: '메뉴에 대한 한 줄 설명' },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          productId: { type: Type.STRING, description: '카탈로그에 있는 정확한 productId' },
                          quantity: { type: Type.INTEGER, description: '구매 수량 (1 이상 정수)' },
                        },
                        required: ['productId', 'quantity'],
                      },
                    },
                    reason: { type: Type.STRING, description: '맛·상황·예산 관점의 추천 이유' },
                    estimatedCookingMinutes: { type: Type.INTEGER, description: '총 예상 조리 시간(분)' },
                    prepNote: { type: Type.STRING, description: '조리 전 준비 안내' },
                    safetyNote: { type: Type.STRING, description: '전자레인지/온수 안전 주의사항' },
                    recipe: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          step: { type: Type.INTEGER },
                          instruction: { type: Type.STRING },
                          minutes: { type: Type.INTEGER },
                        },
                        required: ['step', 'instruction', 'minutes'],
                      },
                    },
                  },
                  required: [
                    'title',
                    'description',
                    'items',
                    'reason',
                    'estimatedCookingMinutes',
                    'recipe',
                  ],
                },
              },
            },
            required: ['recommendations'],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      const parsed = JSON.parse(rawText) as {
        recommendations?: Array<{
          title?: string;
          description?: string;
          items?: Array<{ productId?: string; quantity?: number }>;
          reason?: string;
          estimatedCookingMinutes?: number;
          prepNote?: string;
          safetyNote?: string;
          recipe?: Array<{ step?: number; instruction?: string; minutes?: number }>;
        }>;
      };

      const candidateList = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
      const verifiedRecommendations: VerifiedRecommendation[] = [];
      let excludedOverBudgetCount = 0;

      for (let i = 0; i < candidateList.length; i++) {
        const verified = verifyAndBuildRecommendation(
          candidateList[i],
          catalogMap,
          requestPayload.budget,
          i,
          'GEMINI_AI',
        );
        if (verified.ok) {
          verifiedRecommendations.push(verified.value);
        } else if (verified.overBudget) {
          excludedOverBudgetCount += 1;
        }
      }

      if (verifiedRecommendations.length === 0) {
        return res.json({
          status: excludedOverBudgetCount > 0 ? 'BUDGET_EXCLUDED' : 'NO_DATA',
          recommendations: [],
          excludedOverBudgetCount,
          message:
            excludedOverBudgetCount > 0
              ? `AI가 제안한 ${excludedOverBudgetCount}개 조합이 설정 예산(${requestPayload.budget.toLocaleString('ko-KR')}원)을 초과하여 서버 검증에서 제외되었습니다. 예산을 올리거나 다시 추천받아 보세요.`
              : '조건에 맞는 유효한 조합을 생성하지 못했습니다. 조건을 조정해 다시 시도해 주세요.',
          generatedAt: new Date().toISOString(),
        } satisfies RecommendationResponse);
      }

      return res.json({
        status: 'OK',
        recommendations: verifiedRecommendations.slice(0, 3),
        excludedOverBudgetCount,
        generatedAt: new Date().toISOString(),
      } satisfies RecommendationResponse);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Gemini recommendation error:', errMsg);
      const isBillingRequired =
        errMsg.includes('free tier is not available') ||
        errMsg.includes('set up billing') ||
        errMsg.includes('upgrade to the paid tier');
      const isAuthError =
        !isBillingRequired &&
        (errMsg.includes('API_KEY_INVALID') ||
          errMsg.includes('PERMISSION_DENIED') ||
          errMsg.includes('403'));
      const isQuotaError = errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429');

      return res.status(200).json({
        status: 'AI_ERROR',
        recommendations: [],
        excludedOverBudgetCount: 0,
        errorCode: isBillingRequired
          ? 'GEMINI_BILLING_REQUIRED'
          : isAuthError
            ? 'GEMINI_AUTH_ERROR'
            : isQuotaError
              ? 'GEMINI_QUOTA_ERROR'
              : 'GEMINI_UPSTREAM_ERROR',
        message: isBillingRequired
          ? '현재 연결된 Google 프로젝트에서는 Gemini API 무료 등급을 사용할 수 없어 결제(Billing)가 연결된 API 키가 필요합니다. AI Studio의 Settings > Secrets 패널에서 유료 등급 API 키(GEMINI_API_KEY)를 설정하시거나, 아래 「샘플 데이터 기반 기본 조합 보기」 버튼을 눌러 예산 검증된 조합을 바로 확인해 보세요.'
          : isAuthError
            ? 'Gemini API 키 확인이 필요합니다(Settings > Secrets 패널에서 GEMINI_API_KEY를 확인해 주세요). 아래 버튼으로 샘플 데이터 기반 기본 조합을 먼저 확인하실 수 있습니다.'
            : isQuotaError
              ? 'Gemini API 사용량 한도(429)에 도달했습니다. 잠시 후 다시 시도하거나 아래 샘플 데이터 기반 기본 조합을 이용해 주세요.'
              : `Gemini AI 추천 호출 중 오류가 발생했습니다(${errMsg.slice(0, 140)}). 다시 시도하거나 아래 샘플 데이터 기반 기본 조합을 확인해 주세요.`,
        generatedAt: new Date().toISOString(),
      } satisfies RecommendationResponse);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: {
          middlewareMode: true,
          ...(disableHmr ? { hmr: false, ws: false } : {}),
        },
        appType: 'spa',
      }),
    );
    vitePromise.catch((err) => {
      console.error('Vite middleware initialization failed:', err);
    });
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  const httpServer = app.listen(PORT, HOST, () => {
    console.log(`AI 편의점 꿀조합 큐레이터 서버가 http://${HOST}:${PORT} 에서 실행 중입니다.`);
  });
  httpServer.on('error', (err) => {
    console.error(`Failed to bind server on ${HOST}:${PORT}:`, err);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
