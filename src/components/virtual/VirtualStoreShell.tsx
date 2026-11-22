import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Home,
  Package,
  ShoppingCart,
  Sparkles,
  Store as StoreIcon,
  Tag,
} from 'lucide-react';
import type {
  FlavorTheme,
  MealSituation,
  PreferenceOption,
  StoreWithDistance,
  VirtualCartItem,
  VirtualCategory,
  VirtualProduct,
  VirtualReceipt,
  VirtualRecommendationResult,
  VirtualStoreMeta,
  VirtualStoreTab,
} from '../../types.ts';
import {
  deductVirtualInventory,
  loadVirtualCart,
  loadVirtualInventory,
  loadVirtualReceipts,
  resetVirtualInventory,
  saveVirtualCart,
  saveVirtualReceipts,
  validateCartAddition,
} from '../../services/virtualInventoryService.ts';
import {
  calculateVirtualLinePricing,
  summarizeVirtualCart,
} from '../../services/virtualPricingService.ts';
import { generateVirtualRecommendations } from '../../services/virtualRecommendationEngine.ts';
import { formatKRW } from '../../utils/pricing.ts';
import StoreExteriorEntrance from './world/StoreExteriorEntrance.tsx';
import VirtualStoreWorld from './world/VirtualStoreWorld.tsx';
import VirtualProductExplore from './VirtualProductExplore.tsx';
import VirtualRecommendView from './VirtualRecommendView.tsx';
import VirtualRecipeView from './VirtualRecipeView.tsx';
import VirtualCartView from './VirtualCartView.tsx';
import VirtualReceiptView from './VirtualReceiptView.tsx';

interface VirtualStoreShellProps {
  selectedRealStore: StoreWithDistance;
  budgetInput: string;
  onChangeBudgetInput: (val: string) => void;
  selectedFlavors: FlavorTheme[];
  onToggleFlavor: (flavor: FlavorTheme) => void;
  selectedSituation: MealSituation;
  onSelectSituation: (situation: MealSituation) => void;
  selectedPreferences: PreferenceOption[];
  onTogglePreference: (pref: PreferenceOption) => void;
  onExitVirtualStore: () => void;
}

const VIRTUAL_NAV_TABS: Array<{
  id: Extract<VirtualStoreTab, 'storeHome' | 'products' | 'promos' | 'recommend' | 'cart'>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'storeHome', label: '매장 월드', icon: Home },
  { id: 'products', label: '상품 보기', icon: Package },
  { id: 'promos', label: '행사 상품', icon: Tag },
  { id: 'recommend', label: '꿀조합 추천', icon: Sparkles },
  { id: 'cart', label: '장바구니', icon: ShoppingCart },
];

export default function VirtualStoreShell({
  selectedRealStore,
  budgetInput,
  onChangeBudgetInput,
  selectedFlavors,
  onToggleFlavor,
  selectedSituation,
  onSelectSituation,
  selectedPreferences,
  onTogglePreference,
  onExitVirtualStore,
}: VirtualStoreShellProps) {
  const [hasEnteredDoor, setHasEnteredDoor] = useState(false);
  const [activeTab, setActiveTab] = useState<VirtualStoreTab>('storeHome');
  const [products, setProducts] = useState<VirtualProduct[]>(() => loadVirtualInventory());
  const [cartItems, setCartItems] = useState<VirtualCartItem[]>(() => loadVirtualCart());
  const [receipts, setReceipts] = useState<VirtualReceipt[]>(() => loadVirtualReceipts());
  const [latestReceipt, setLatestReceipt] = useState<VirtualReceipt | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<VirtualCategory | '전체'>('전체');
  const [recommendationResults, setRecommendationResults] = useState<
    VirtualRecommendationResult[] | null
  >(null);
  const [activeRecipeCombo, setActiveRecipeCombo] = useState<VirtualRecommendationResult | null>(
    null,
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const parsedBudget = Math.max(100, Math.floor(Number(budgetInput.replaceAll(',', '').trim()) || 5000));

  useEffect(() => {
    saveVirtualCart(cartItems);
  }, [cartItems]);

  const storeMeta: VirtualStoreMeta = useMemo(
    () => ({
      storeId: 'GS25_DEMO_001',
      brand: 'GS25',
      displayName: selectedRealStore.name.replace(/\s*\(샘플\)\s*$/, ''),
      address: selectedRealStore.address,
      dataType: 'DEMO',
      statusText: '가상 매장 체험 중',
      noticeText: '상품·가격·재고·행사 정보는 앱 테스트용 가상 데이터입니다.',
    }),
    [selectedRealStore],
  );

  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems) {
      map[item.productId] = item.quantity;
    }
    return map;
  }, [cartItems]);

  const totalCartUnits = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const featuredCombo = useMemo(() => {
    const combos = generateVirtualRecommendations({
      budget: parsedBudget,
      flavors: ['매콤', '고소'],
      mealSituation: '한 끼 식사',
      preferences: ['3분 이내 조리'],
      products,
    });
    return combos[0] ?? null;
  }, [parsedBudget, products]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3000);
  };

  const handleAddToCart = (productId: string, addQty = 1): { ok: boolean; message: string } => {
    const validation = validateCartAddition(products, cartItems, productId, addQty);
    if (!validation.ok) {
      return { ok: false, message: validation.reason };
    }
    const product = products.find((p) => p.id === productId);
    setCartItems((prev) => {
      const exists = prev.some((i) => i.productId === productId);
      if (exists) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: validation.nextQty } : i,
        );
      }
      return [...prev, { productId, quantity: validation.nextQty, checked: false }];
    });
    return {
      ok: true,
      message: `${product?.name ?? '상품'}을(를) 장바구니에 담았습니다 (현재 ${validation.nextQty}개).`,
    };
  };

  const handleUpdateCartQty = (productId: string, delta: number): { ok: boolean; message: string } => {
    const existing = cartItems.find((i) => i.productId === productId);
    if (!existing) return { ok: false, message: '장바구니에 없는 상품입니다.' };
    const product = products.find((p) => p.id === productId);
    const nextQty = existing.quantity + delta;
    if (nextQty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.productId !== productId));
      return { ok: true, message: '상품을 삭제했습니다.' };
    }
    if (product && nextQty > product.stockQuantity) {
      return {
        ok: false,
        message: `${product.name}의 현재 가상 재고는 최대 ${product.stockQuantity}개입니다.`,
      };
    }
    setCartItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: nextQty } : i)),
    );
    return { ok: true, message: '수량이 변경되었습니다.' };
  };

  const handleAddComboToCart = (combo: VirtualRecommendationResult) => {
    let nextCart = [...cartItems];
    for (const line of combo.items) {
      const validation = validateCartAddition(products, nextCart, line.productId, line.quantity);
      if (!validation.ok) {
        showToast(validation.reason);
        return;
      }
      const exists = nextCart.some((i) => i.productId === line.productId);
      if (exists) {
        nextCart = nextCart.map((i) =>
          i.productId === line.productId ? { ...i, quantity: validation.nextQty } : i,
        );
      } else {
        nextCart.push({ productId: line.productId, quantity: validation.nextQty, checked: false });
      }
    }
    setCartItems(nextCart);
    setActiveTab('cart');
    showToast(`「${combo.title}」 구성 상품을 장바구니에 담았습니다.`);
  };

  const handleGenerateRecommendations = () => {
    const combos = generateVirtualRecommendations({
      budget: parsedBudget,
      flavors: selectedFlavors,
      mealSituation: selectedSituation,
      preferences: selectedPreferences,
      products,
    });
    setRecommendationResults(combos);
  };

  const handleCompleteVirtualPurchase = (): { ok: boolean; message: string } => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    const pricedLines = cartItems
      .map((item) => {
        const product = productMap.get(item.productId);
        return product ? calculateVirtualLinePricing(product, item.quantity) : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const summary = summarizeVirtualCart(pricedLines, parsedBudget);
    if (pricedLines.length === 0) {
      return { ok: false, message: '장바구니가 비어 있습니다.' };
    }
    if (summary.isOverBudget) {
      return {
        ok: false,
        message: `예산(${formatKRW(parsedBudget)})을 ${formatKRW(summary.exceededAmount)} 초과해 구매를 완료할 수 없습니다.`,
      };
    }

    const deduction = deductVirtualInventory(products, cartItems);
    if (!deduction.ok) {
      return { ok: false, message: deduction.reason };
    }

    const now = new Date();
    const receipt: VirtualReceipt = {
      receiptId: `VR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
        now.getDate(),
      ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(
        now.getMinutes(),
      ).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`,
      storeName: storeMeta.displayName,
      storeId: storeMeta.storeId,
      purchasedAt: `${now.toLocaleDateString('ko-KR')} ${now.toLocaleTimeString('ko-KR')}`,
      items: pricedLines,
      regularTotal: summary.regularTotal,
      totalDiscount: summary.totalDiscount,
      finalTotal: summary.finalTotal,
      budget: parsedBudget,
      remainingBudget: summary.remainingBudget,
    };

    const nextReceipts = [receipt, ...receipts];
    setProducts(deduction.nextProducts);
    setCartItems([]);
    setReceipts(nextReceipts);
    saveVirtualReceipts(nextReceipts);
    setLatestReceipt(receipt);
    setActiveTab('receipt');
    return { ok: true, message: '가상 구매가 완료되었습니다.' };
  };

  const handleResetInventory = () => {
    const fresh = resetVirtualInventory();
    setProducts(fresh);
  };

  const handleOpenRecipe = (combo: VirtualRecommendationResult) => {
    setActiveRecipeCombo(combo);
    setActiveTab('recipe');
  };

  if (!hasEnteredDoor) {
    return (
      <StoreExteriorEntrance
        storeMeta={storeMeta}
        budget={parsedBudget}
        onEnterInterior={() => {
          setHasEnteredDoor(true);
          setActiveTab('storeHome');
        }}
        onExitStore={onExitVirtualStore}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Virtual Store Context Sub-Header */}
      <div className="bg-white border-b border-[#EAE0CC]">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={onExitVirtualStore}
              className="min-h-[36px] sm:min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] hover:bg-[#FAF4E6] text-xs font-bold text-[#252525] inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>매장 밖으로</span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs min-w-0">
                <StoreIcon className="w-3.5 h-3.5 text-[#007CFF] shrink-0" />
                <span className="font-extrabold text-[#007CFF] shrink-0">GS25</span>
                <span className="font-bold text-[#252525] truncate">{storeMeta.displayName}</span>
                <span aria-hidden="true" className="text-[#9A9080] shrink-0">
                  ·
                </span>
                <span className="font-bold text-[#319447] shrink-0">가상 매장</span>
              </div>
              <p className="text-[11px] text-[#756D60] truncate">
                {storeMeta.noticeText} · 적용 예산{' '}
                <strong className="font-num text-[#F49A24]">{formatKRW(parsedBudget)}</strong>
              </p>
            </div>
          </div>

          {/* Desktop Virtual Store Tabs */}
          <nav aria-label="가상 매장 메뉴" className="hidden md:flex items-center gap-1 bg-[#F5EFE0] p-1 rounded-xl shrink-0">
            {VIRTUAL_NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive =
                activeTab === tab.id ||
                (tab.id === 'recommend' && activeTab === 'recipe') ||
                (tab.id === 'cart' && activeTab === 'receipt');
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveRecipeCombo(null);
                    setActiveTab(tab.id);
                  }}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-white text-[#319447] shadow-xs'
                      : 'text-[#5C5549] hover:text-[#252525]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.id === 'cart' && totalCartUnits > 0 && (
                    <span className="font-num text-[#F49A24]">({totalCartUnits})</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl w-full mx-auto px-3.5 sm:px-6 pt-4 sm:pt-5 pb-24 md:pb-10 space-y-4 sm:space-y-5 flex-1">
        {toastMessage && (
          <div
            role="status"
            className="p-3.5 rounded-2xl bg-[#F2FBF4] border border-[#319447]/40 text-xs font-bold text-[#226631]"
          >
            {toastMessage}
          </div>
        )}

        {activeTab === 'storeHome' && (
          <VirtualStoreWorld
            storeMeta={storeMeta}
            budget={parsedBudget}
            products={products}
            cartItems={cartItems}
            featuredCombo={featuredCombo}
            onAddToCart={handleAddToCart}
            onUpdateCartQty={handleUpdateCartQty}
            onRemoveCartItem={(productId) =>
              setCartItems((prev) => prev.filter((i) => i.productId !== productId))
            }
            onCompleteVirtualPurchase={handleCompleteVirtualPurchase}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenRecipe={handleOpenRecipe}
            onAddComboToCart={handleAddComboToCart}
            onViewExterior={() => setHasEnteredDoor(false)}
            onExitVirtualStore={onExitVirtualStore}
          />
        )}

        {activeTab === 'products' && (
          <VirtualProductExplore
            key="all-products"
            products={products}
            initialPromoOnly={false}
            selectedCategoryFilter={categoryFilter}
            onChangeCategoryFilter={setCategoryFilter}
            cartQuantities={cartQuantities}
            onAddToCart={handleAddToCart}
            onResetInventory={handleResetInventory}
          />
        )}

        {activeTab === 'promos' && (
          <VirtualProductExplore
            key="promo-products"
            products={products}
            initialPromoOnly={true}
            selectedCategoryFilter={categoryFilter}
            onChangeCategoryFilter={setCategoryFilter}
            cartQuantities={cartQuantities}
            onAddToCart={handleAddToCart}
            onResetInventory={handleResetInventory}
          />
        )}

        {activeTab === 'recommend' && (
          <VirtualRecommendView
            budgetInput={budgetInput}
            onChangeBudgetInput={onChangeBudgetInput}
            selectedFlavors={selectedFlavors}
            onToggleFlavor={onToggleFlavor}
            selectedSituation={selectedSituation}
            onSelectSituation={onSelectSituation}
            selectedPreferences={selectedPreferences}
            onTogglePreference={onTogglePreference}
            results={recommendationResults}
            onGenerate={handleGenerateRecommendations}
            onOpenRecipe={handleOpenRecipe}
            onAddComboToCart={handleAddComboToCart}
          />
        )}

        {activeTab === 'recipe' && activeRecipeCombo && (
          <VirtualRecipeView
            combo={activeRecipeCombo}
            onBack={() => {
              setActiveRecipeCombo(null);
              setActiveTab('recommend');
            }}
            onAddComboToCart={handleAddComboToCart}
          />
        )}

        {activeTab === 'cart' && (
          <VirtualCartView
            products={products}
            cartItems={cartItems}
            budget={parsedBudget}
            onChangeBudget={(next) => onChangeBudgetInput(String(next))}
            onAddProduct={handleAddToCart}
            onUpdateQty={handleUpdateCartQty}
            onToggleCheck={(productId) =>
              setCartItems((prev) =>
                prev.map((i) =>
                  i.productId === productId ? { ...i, checked: !i.checked } : i,
                ),
              )
            }
            onRemoveItem={(productId) =>
              setCartItems((prev) => prev.filter((i) => i.productId !== productId))
            }
            onClearCart={() => setCartItems([])}
            onCompleteVirtualPurchase={handleCompleteVirtualPurchase}
            onGoExploreProducts={() => setActiveTab('products')}
          />
        )}

        {activeTab === 'receipt' && (latestReceipt || receipts[0]) && (
          <VirtualReceiptView
            receipt={latestReceipt || receipts[0]}
            recentReceipts={receipts}
            onRetryRecommend={() => {
              handleGenerateRecommendations();
              setActiveTab('recommend');
            }}
            onBackToStoreHome={() => setActiveTab('storeHome')}
            onSelectReceipt={(selected) => setLatestReceipt(selected)}
          />
        )}
      </div>

      {/* Mobile Bottom Navigation inside Virtual Store */}
      <nav
        aria-label="가상 매장 모바일 메뉴"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EAE0CC]"
      >
        <div className="grid grid-cols-5 items-center h-16">
          {VIRTUAL_NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              activeTab === tab.id ||
              (tab.id === 'recommend' && activeTab === 'recipe') ||
              (tab.id === 'cart' && activeTab === 'receipt');
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveRecipeCombo(null);
                  setActiveTab(tab.id);
                }}
                className={`relative min-h-[48px] flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  isActive ? 'text-[#319447]' : 'text-[#756D60]'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {tab.id === 'cart' && totalCartUnits > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#F49A24] text-white text-[10px] font-bold font-num flex items-center justify-center">
                      {totalCartUnits}
                    </span>
                  )}
                </div>
                <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
