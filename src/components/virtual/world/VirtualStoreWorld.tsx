import React, { useMemo, useState } from 'react';
import { Flame, ShoppingCart, Sparkles, Utensils, X } from 'lucide-react';
import type {
  VirtualCartItem,
  VirtualProduct,
  VirtualRecommendationResult,
  VirtualStoreMeta,
  VirtualStoreTab,
} from '../../../types.ts';
import {
  CHARACTER_GUIDE_TIPS,
  VIRTUAL_STORE_ZONES,
  WORLD_TUTORIAL_STEPS,
  type StoreZoneId,
} from '../../../data/virtualStoreWorldData.ts';
import {
  calculateVirtualLinePricing,
  summarizeVirtualCart,
} from '../../../services/virtualPricingService.ts';
import { formatKRW } from '../../../utils/pricing.ts';
import StoreHUD from './StoreHUD.tsx';
import IsometricStoreScene from './IsometricStoreScene.tsx';
import StoreObjectPanel from './StoreObjectPanel.tsx';

const TUTORIAL_STORAGE_KEY = 'virtual_gs25_world_tutorial_v1';

interface VirtualStoreWorldProps {
  storeMeta: VirtualStoreMeta;
  budget: number;
  products: VirtualProduct[];
  cartItems: VirtualCartItem[];
  featuredCombo: VirtualRecommendationResult | null;
  onAddToCart: (productId: string, qty?: number) => { ok: boolean; message: string };
  onUpdateCartQty: (productId: string, delta: number) => { ok: boolean; message: string };
  onRemoveCartItem: (productId: string) => void;
  onCompleteVirtualPurchase: () => { ok: boolean; message: string };
  onNavigateTab: (tab: VirtualStoreTab) => void;
  onOpenRecipe: (combo: VirtualRecommendationResult) => void;
  onAddComboToCart: (combo: VirtualRecommendationResult) => void;
  onViewExterior: () => void;
  onExitVirtualStore: () => void;
}

export default function VirtualStoreWorld({
  storeMeta,
  budget,
  products,
  cartItems,
  featuredCombo,
  onAddToCart,
  onUpdateCartQty,
  onRemoveCartItem,
  onCompleteVirtualPurchase,
  onNavigateTab,
  onOpenRecipe,
  onAddComboToCart,
  onViewExterior,
  onExitVirtualStore,
}: VirtualStoreWorldProps) {
  const [selectedZone, setSelectedZone] = useState<StoreZoneId | null>(null);
  const [characterPos, setCharacterPos] = useState<{ x: number; y: number }>({ x: 350, y: 332 });
  const [tipIndex, setTipIndex] = useState(0);
  const [characterTip, setCharacterTip] = useState<string | null>(CHARACTER_GUIDE_TIPS[0]);
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TUTORIAL_STORAGE_KEY) !== 'done';
    } catch {
      return true;
    }
  });

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const totalCartUnits = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const cartSummary = useMemo(() => {
    const lines = cartItems
      .map((item) => {
        const product = productMap.get(item.productId);
        return product ? calculateVirtualLinePricing(product, item.quantity) : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    return summarizeVirtualCart(lines, budget);
  }, [cartItems, productMap, budget]);

  const handleSelectZone = (zoneId: StoreZoneId) => {
    const zone = VIRTUAL_STORE_ZONES[zoneId];
    setSelectedZone(zoneId);
    setCharacterPos(zone.characterTarget);
    setCharacterTip(null);
  };

  const handleClickCharacter = () => {
    const nextIdx = (tipIndex + 1) % CHARACTER_GUIDE_TIPS.length;
    setTipIndex(nextIdx);
    setCharacterTip(CHARACTER_GUIDE_TIPS[nextIdx]);
  };

  const dismissTutorial = () => {
    setShowTutorial(false);
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'done');
    } catch {
      // Ignore storage error
    }
  };

  return (
    <div className="world-enter-anim space-y-5">
      {/* Top Game HUD */}
      <StoreHUD
        storeMeta={storeMeta}
        budget={budget}
        cartTotal={cartSummary.finalTotal}
        cartItemCount={totalCartUnits}
        onNavigateTab={onNavigateTab}
        onOpenTutorial={() => setShowTutorial(true)}
        onExitVirtualStore={onExitVirtualStore}
      />

      {/* 3-Step First-Time Onboarding Tutorial */}
      {showTutorial && (
        <section
          aria-label="가상 편의점 이용 튜토리얼"
          className="bg-[#F2FBF4] border border-[#319447]/35 rounded-3xl p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#226631]">
              <Sparkles className="w-4 h-4 text-[#319447]" />
              <span>가상 GS25 월드 3단계 가이드</span>
            </div>
            <button
              type="button"
              onClick={dismissTutorial}
              aria-label="튜토리얼 닫기"
              className="min-h-[32px] px-2.5 py-1 rounded-lg bg-white border border-[#CBEAD4] text-xs font-bold text-[#226631] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>확인했어요</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {WORLD_TUTORIAL_STEPS.map((item) => (
              <div
                key={item.step}
                className="bg-white border border-[#D8EEDF] rounded-2xl p-3 flex items-start gap-2.5"
              >
                <span className="w-6 h-6 rounded-lg bg-[#319447] text-white font-num font-extrabold text-xs flex items-center justify-center shrink-0">
                  {item.step}
                </span>
                <div className="text-xs">
                  <p className="font-bold text-[#252525]">{item.title}</p>
                  <p className="text-[#5C5549] mt-0.5 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Isometric World + Desktop Floating Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className={selectedZone ? 'lg:col-span-8' : 'lg:col-span-12'}>
          <IsometricStoreScene
            storeName={storeMeta.displayName}
            selectedZone={selectedZone}
            cartItemCount={totalCartUnits}
            characterPos={characterPos}
            characterTip={characterTip}
            onSelectZone={handleSelectZone}
            onClickCharacter={handleClickCharacter}
            onClearSelection={() => setSelectedZone(null)}
          />
        </div>

        {selectedZone && (
          <div className="lg:col-span-4">
            <StoreObjectPanel
              key={selectedZone}
              zoneId={selectedZone}
              storeMeta={storeMeta}
              products={products}
              cartItems={cartItems}
              budget={budget}
              onClose={() => setSelectedZone(null)}
              onAddToCart={(id, qty) => onAddToCart(id, qty)}
              onUpdateCartQty={onUpdateCartQty}
              onRemoveCartItem={onRemoveCartItem}
              onCompleteVirtualPurchase={onCompleteVirtualPurchase}
              onNavigateTab={onNavigateTab}
              onViewExterior={onViewExterior}
              onExitVirtualStore={onExitVirtualStore}
            />
          </div>
        )}
      </div>

      {/* Featured Demo Combo Banner connected directly to Recipe & Cart */}
      {featuredCombo && (
        <section className="bg-white border border-[#EAE0CC] rounded-3xl overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-4 h-44 md:h-auto bg-white p-2 flex items-center justify-center">
            <img
              src={featuredCombo.imageUrl}
              alt={featuredCombo.title}
              referrerPolicy="no-referrer"
              className="w-full h-full max-h-48 object-contain"
            />
          </div>
          <div className="md:col-span-8 p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6355]">
                <span className="font-bold text-[#F49A24] inline-flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> 오늘의 추천 데모 꿀조합
                </span>
                <span aria-hidden="true">·</span>
                <span>약 {featuredCombo.estimatedCookingMinutes}분 조리</span>
                <span aria-hidden="true">·</span>
                <span className="font-num font-bold text-[#319447]">
                  {formatKRW(featuredCombo.totalPrice)}
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-[#252525]">{featuredCombo.title}</h2>
              <p className="text-xs sm:text-sm text-[#5C5549]">{featuredCombo.description}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F0E7D6]">
              <span className="text-xs text-[#6B6355]">
                {storeMeta.noticeText}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpenRecipe(featuredCombo)}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] text-xs font-bold text-[#252525] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Utensils className="w-3.5 h-3.5 text-[#319447]" />
                  <span>상세 레시피</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddComboToCart(featuredCombo)}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#319447] hover:bg-[#257336] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>장바구니 담기</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
