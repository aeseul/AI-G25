export type BrandId = 'GS25' | 'CU' | 'SEVEN_ELEVEN' | 'EMART24';

export type FlavorTheme =
  | '단짠'
  | '매콤'
  | '담백'
  | '고소'
  | '새콤'
  | '달콤'
  | '고단백';

export type MealSituation =
  | '한 끼 식사'
  | '야식'
  | '간식'
  | '안주'
  | '해장';

export type PreferenceOption =
  | '1+1 행사 상품 우선'
  | '2+1 행사 상품 우선'
  | '행사 상품 제외'
  | '3분 이내 조리'
  | '전자레인지 사용 가능'
  | '온수 사용 가능'
  | '고단백 상품 우선';

export type PromotionType = 'NONE' | '1+1' | '2+1' | 'DISCOUNT';

export type AvailabilityStatus =
  | 'CONFIRMED'
  | 'OUT_OF_STOCK'
  | 'UNKNOWN'
  | 'PENDING_INTEGRATION';

export type ProductCategory =
  | '면류'
  | '김밥/도시락'
  | '계란/간편식'
  | '유제품/치즈'
  | '육가공/안주'
  | '음료'
  | '스낵/디저트';

export interface ProductNutrition {
  calories: number;
  proteinGrams: number;
  carbsGrams?: number;
  fatGrams?: number;
  verifiedSource: string;
}

export interface Product {
  productId: string;
  brand: BrandId;
  name: string;
  category: ProductCategory;
  regularPrice: number | null;
  salePrice: number | null;
  promotionType: PromotionType;
  promotionDescription: string | null;
  promotionPeriod: {
    start: string;
    end: string;
  } | null;
  nutrition: ProductNutrition | null;
  microwaveAvailable: boolean;
  hotWaterRequired: boolean;
  estimatedPrepMinutes: number;
  flavorTags: FlavorTheme[];
  mealSituations: MealSituation[];
  dataSource: 'DEMO' | 'OFFICIAL_API';
  dataSourceLabel: string;
  lastVerifiedAt: string | null;
  availabilityStatus: AvailabilityStatus;
  imageUrl?: string;
}

export interface Store {
  storeId: string;
  brand: BrandId;
  name: string;
  address: string;
  lat: number;
  lng: number;
  dataSource: 'DEMO' | 'OSM_NOMINATIM' | 'GOOGLE_PLACES';
  lastVerifiedAt: string;
  operatingStatusNote: string;
}

export interface StoreWithDistance extends Store {
  distanceMeters: number;
}

export interface RecommendationRequest {
  budget: number;
  flavors: FlavorTheme[];
  mealSituation: MealSituation;
  preferences: PreferenceOption[];
  brand: BrandId;
  storeName: string;
  storeId: string;
}

export interface VerifiedComboItem {
  productId: string;
  product: Product;
  quantity: number;
  unitRegularPrice: number | null;
  regularLineTotal: number;
  appliedLineTotal: number;
  discountAmount: number;
  priceUnknown: boolean;
  promoAppliedLabel: string | null;
  promoExpired: boolean;
}

export interface RecipeStep {
  step: number;
  instruction: string;
  minutes: number;
}

export interface VerifiedRecommendation {
  id: string;
  title: string;
  description: string;
  items: VerifiedComboItem[];
  regularTotal: number;
  totalDiscount: number;
  totalPrice: number;
  remainingBudget: number;
  budget: number;
  hasUnknownPrice: boolean;
  reason: string;
  estimatedCookingMinutes: number;
  usesMicrowave: boolean;
  usesHotWater: boolean;
  prepNote: string;
  safetyNote: string;
  recipe: RecipeStep[];
  imageUrl?: string;
  sourceType: 'GEMINI_AI' | 'DATA_FALLBACK';
  dataNotice: string;
}

export interface RecommendationResponse {
  status: 'OK' | 'NO_DATA' | 'AI_ERROR' | 'BUDGET_EXCLUDED';
  recommendations: VerifiedRecommendation[];
  excludedOverBudgetCount: number;
  message?: string;
  errorCode?: string;
  generatedAt: string;
}

export interface ChecklistItem {
  product: Product;
  quantity: number;
  checked: boolean;
}

export interface SavedFavorite {
  id: string;
  savedAt: string;
  storeName: string;
  brand: BrandId;
  recommendation: VerifiedRecommendation;
}

export interface UserProfile {
  uid: string;
  nickname: string;
  preferredBrand: BrandId;
  defaultBudget: number;
  email?: string;
}

export type AppTab = 'home' | 'stores' | 'recommend' | 'promotions' | 'mypage';

// --- Virtual GS25 Store Space Types ---
export type VirtualCategory = '면류' | '즉석식품' | '유제품' | '계란' | '음료' | '간식';

export type VirtualAvailabilityStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type VirtualStoreTab =
  | 'storeHome'
  | 'products'
  | 'promos'
  | 'recommend'
  | 'cart'
  | 'recipe'
  | 'receipt';

export interface VirtualProduct {
  id: string;
  brand: 'GS25';
  name: string;
  category: VirtualCategory;
  regularPrice: number;
  promotionType: 'NONE' | '1+1' | '2+1';
  promotionDescription: string | null;
  promotionStartAt: string | null;
  promotionEndAt: string | null;
  stockQuantity: number;
  availabilityStatus: VirtualAvailabilityStatus;
  tasteTags: FlavorTheme[];
  mealTags: MealSituation[];
  nutrition: ProductNutrition | null;
  isMicrowaveSuitable: boolean;
  requiresHotWater: boolean;
  estimatedPrepMinutes: number;
  imageUrl: string;
  dataSource: 'DEMO';
  lastVerifiedAt: string;
  description: string;
}

export interface VirtualStoreMeta {
  storeId: 'GS25_DEMO_001';
  brand: 'GS25';
  displayName: string;
  address: string;
  dataType: 'DEMO';
  statusText: string;
  noticeText: string;
}

export interface VirtualCartItem {
  productId: string;
  quantity: number;
  checked: boolean;
}

export interface VirtualPricedLine {
  productId: string;
  product: VirtualProduct;
  quantity: number;
  paidQuantity: number;
  freeQuantity: number;
  regularLineTotal: number;
  appliedLineTotal: number;
  discountAmount: number;
  promoAppliedLabel: string | null;
}

export interface VirtualCartSummary {
  regularTotal: number;
  totalDiscount: number;
  finalTotal: number;
  remainingBudget: number;
  isOverBudget: boolean;
  exceededAmount: number;
}

export interface VirtualRecommendationItemSpec {
  productId: string;
  quantity: number;
}

export interface VirtualRecommendationResult {
  id: string;
  title: string;
  description: string;
  items: VirtualPricedLine[];
  regularTotal: number;
  totalDiscount: number;
  totalPrice: number;
  remainingBudget: number;
  budget: number;
  estimatedCookingMinutes: number;
  usesMicrowave: boolean;
  usesHotWater: boolean;
  reason: string;
  prepNote: string;
  safetyNote: string;
  recipe: RecipeStep[];
  imageUrl: string;
  isDemoNote: string;
}

export interface VirtualReceipt {
  receiptId: string;
  storeName: string;
  storeId: string;
  purchasedAt: string;
  items: VirtualPricedLine[];
  regularTotal: number;
  totalDiscount: number;
  finalTotal: number;
  budget: number;
  remainingBudget: number;
}

