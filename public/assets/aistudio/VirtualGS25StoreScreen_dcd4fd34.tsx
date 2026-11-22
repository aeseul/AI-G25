import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ShoppingBasket,
  Search,
  Plus,
  Minus,
  Store,
  Sparkles,
  Tag,
  Receipt,
  RotateCcw,
  X,
  CheckCircle2,
} from 'lucide-react';

type Category = '전체' | '면류' | '즉석식품' | '유제품' | '계란' | '음료' | '간식';
type Promotion = 'NONE' | '1+1' | '2+1';

type DemoProduct = {
  id: string;
  name: string;
  category: Exclude<Category, '전체'>;
  price: number;
  stock: number;
  promotion: Promotion;
  tags: string[];
  prepMinutes: number;
  imageEmoji: string;
};

type CartLine = { productId: string; quantity: number };

const INITIAL_PRODUCTS: DemoProduct[] = [
  { id: 'P001', name: '불닭볶음면', category: '면류', price: 1800, stock: 10, promotion: 'NONE', tags: ['매콤'], prepMinutes: 3, imageEmoji: '🍜' },
  { id: 'P002', name: '육개장 사발면', category: '면류', price: 1200, stock: 8, promotion: 'NONE', tags: ['매콤'], prepMinutes: 3, imageEmoji: '🍲' },
  { id: 'P003', name: '참치마요 삼각김밥', category: '즉석식품', price: 1200, stock: 12, promotion: 'NONE', tags: ['고소', '담백'], prepMinutes: 1, imageEmoji: '🍙' },
  { id: 'P004', name: '전주비빔 삼각김밥', category: '즉석식품', price: 1200, stock: 10, promotion: 'NONE', tags: ['매콤'], prepMinutes: 1, imageEmoji: '🍙' },
  { id: 'P005', name: '스트링치즈', category: '유제품', price: 1500, stock: 7, promotion: 'NONE', tags: ['고소'], prepMinutes: 1, imageEmoji: '🧀' },
  { id: 'P006', name: '훈제란 1구', category: '계란', price: 1000, stock: 9, promotion: 'NONE', tags: ['고소', '고단백'], prepMinutes: 1, imageEmoji: '🥚' },
  { id: 'P007', name: '바나나우유', category: '음료', price: 1500, stock: 6, promotion: '1+1', tags: ['달콤'], prepMinutes: 0, imageEmoji: '🥛' },
  { id: 'P008', name: '생수 500ml', category: '음료', price: 800, stock: 15, promotion: 'NONE', tags: ['담백'], prepMinutes: 0, imageEmoji: '💧' },
  { id: 'P009', name: '초코바', category: '간식', price: 1000, stock: 10, promotion: '2+1', tags: ['달콤'], prepMinutes: 0, imageEmoji: '🍫' },
];

const CATEGORIES: Category[] = ['전체', '면류', '즉석식품', '유제품', '계란', '음료', '간식'];
const won = (value: number) => `${value.toLocaleString('ko-KR')}원`;

function getLinePrice(product: DemoProduct, quantity: number) {
  if (product.promotion === '1+1') return Math.ceil(quantity / 2) * product.price;
  if (product.promotion === '2+1') return (Math.floor(quantity / 3) * 2 + quantity % 3) * product.price;
  return quantity * product.price;
}

function getPromotionLabel(promotion: Promotion) {
  return promotion === 'NONE' ? '' : promotion;
}

export interface VirtualGS25StoreScreenProps {
  storeName?: string;
  onBack?: () => void;
}

/**
 * Standalone demo store experience.
 * All products, prices, promotions and stock are simulated locally.
 * No Gemini API, real GS25 inventory API or payment is called.
 */
export default function VirtualGS25StoreScreen({
  storeName = 'GS25 가상 매장',
  onBack,
}: VirtualGS25StoreScreenProps) {
  const [products, setProducts] = useState<DemoProduct[]>(INITIAL_PRODUCTS);
  const [category, setCategory] = useState<Category>('전체');
  const [query, setQuery] = useState('');
  const [onlyPromotions, setOnlyPromotions] = useState(false);
  const [budget, setBudget] = useState(5000);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'cart'>('products');
  const [receipt, setReceipt] = useState<{ lines: CartLine[]; total: number; date: string } | null>(null);
  const [notice, setNotice] = useState('');

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = category === '전체' || product.category === category;
    const matchesQuery = product.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesPromotion = !onlyPromotions || product.promotion !== 'NONE';
    return matchesCategory && matchesQuery && matchesPromotion;
  }), [products, category, query, onlyPromotions]);

  const cartDetails = useMemo(() => cart.map((line) => {
    const product = products.find((item) => item.id === line.productId);
    if (!product) return null;
    return { ...line, product, lineTotal: getLinePrice(product, line.quantity) };
  }).filter(Boolean) as Array<CartLine & { product: DemoProduct; lineTotal: number }>, [cart, products]);

  const total = cartDetails.reduce((sum, line) => sum + line.lineTotal, 0);
  const remaining = budget - total;
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setCart((current) => {
      const existing = current.find((line) => line.productId === productId);
      const nextQuantity = (existing?.quantity ?? 0) + delta;
      if (nextQuantity > product.stock) {
        setNotice(`현재 가상 재고는 ${product.stock}개입니다.`);
        return current;
      }
      if (nextQuantity <= 0) return current.filter((line) => line.productId !== productId);
      if (existing) return current.map((line) => line.productId === productId ? { ...line, quantity: nextQuantity } : line);
      return [...current, { productId, quantity: 1 }];
    });
  };

  const addToCart = (product: DemoProduct) => {
    if (product.stock <= 0) {
      setNotice('품절된 상품입니다.');
      return;
    }
    updateQuantity(product.id, 1);
    setNotice(`${product.name}을(를) 장바구니에 담았습니다.`);
  };

  const completeDemoPurchase = () => {
    if (cart.length === 0) {
      setNotice('장바구니에 상품을 먼저 담아주세요.');
      return;
    }
    if (total > budget) {
      setNotice(`예산을 ${won(total - budget)} 초과했습니다. 상품을 조정해주세요.`);
      return;
    }
    const insufficient = cartDetails.find((line) => line.quantity > line.product.stock);
    if (insufficient) {
      setNotice(`${insufficient.product.name}의 가상 재고가 부족합니다. 수량을 다시 확인해주세요.`);
      return;
    }
    setProducts((current) => current.map((product) => {
      const purchased = cart.find((line) => line.productId === product.id);
      return purchased ? { ...product, stock: product.stock - purchased.quantity } : product;
    }));
    setReceipt({ lines: cart.map((line) => ({ ...line })), total, date: new Date().toLocaleString('ko-KR') });
    setCart([]);
    setNotice('');
  };

  const resetDemo = () => {
    setProducts(INITIAL_PRODUCTS.map((product) => ({ ...product })));
    setCart([]);
    setReceipt(null);
    setNotice('가상 매장 상품 재고를 초기 상태로 되돌렸습니다.');
  };

  const addSuggestedCombo = () => {
    const suggested = ['P001', 'P005', 'P006'];
    const currentCart: CartLine[] = [];
    for (const id of suggested) {
      const product = products.find((item) => item.id === id);
      if (product && product.stock > 0) currentCart.push({ productId: id, quantity: 1 });
    }
    const suggestedTotal = currentCart.reduce((sum, line) => {
      const product = products.find((item) => item.id === line.productId)!;
      return sum + getLinePrice(product, line.quantity);
    }, 0);
    if (suggestedTotal > budget) {
      setNotice('현재 예산으로 추천 조합을 담을 수 없습니다. 예산을 조정해주세요.');
      return;
    }
    setCart(currentCart);
    setActiveTab('cart');
    setNotice('샘플 꿀조합을 장바구니에 담았습니다. 가격과 재고를 확인해주세요.');
  };

  if (receipt) {
    return (
      <main className="min-h-screen bg-[#FFF9EF] px-4 py-8 text-[#252525]">
        <div className="mx-auto max-w-xl rounded-3xl border border-[#EAE0CC] bg-white p-6 sm:p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF5EC] text-[#319447]">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-center text-xs font-bold tracking-wide text-[#319447]">DEMO PURCHASE COMPLETE</p>
          <h1 className="mt-2 text-center text-2xl font-extrabold">가상 구매 영수증</h1>
          <p className="mt-2 text-center text-sm text-[#756D60]">{storeName} · {receipt.date}</p>
          <div className="my-6 border-y border-dashed border-[#DDD2BE] py-4">
            {receipt.lines.map((line) => {
              const product = INITIAL_PRODUCTS.find((item) => item.id === line.productId);
              if (!product) return null;
              return (
                <div key={line.productId} className="flex justify-between gap-3 py-2 text-sm">
                  <span>{product.name} × {line.quantity}</span>
                  <strong>{won(getLinePrice(product, line.quantity))}</strong>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-lg font-extrabold">
            <span>총 구매 금액</span><span>{won(receipt.total)}</span>
          </div>
          <p className="mt-3 rounded-xl bg-[#FFF9EF] p-3 text-center text-xs leading-relaxed text-[#6B6355]">
            이 영수증은 앱 테스트를 위한 가상 구매 결과입니다. 실제 결제나 GS25 주문은 발생하지 않았습니다.
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => setReceipt(null)} className="min-h-11 flex-1 rounded-xl border border-[#DDD2BE] px-4 font-bold">매장으로 돌아가기</button>
            <button onClick={resetDemo} className="min-h-11 flex-1 rounded-xl bg-[#319447] px-4 font-bold text-white">재고 초기화</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF9EF] text-[#252525]">
      <header className="sticky top-0 z-20 border-b border-[#EAE0CC] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {onBack && <button onClick={onBack} aria-label="뒤로가기" className="rounded-xl p-2 hover:bg-[#FAF5EA]"><ArrowLeft className="h-5 w-5" /></button>}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#319447] text-white"><Store className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold sm:text-lg">AI 편의점 꿀조합 큐레이터</h1>
              <p className="truncate text-xs text-[#756D60]">{storeName}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[#EAF5EC] px-3 py-1.5 text-[11px] font-bold text-[#25813A]">가상 매장 DEMO</span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 pb-28 sm:px-6">
        <section className="rounded-3xl bg-[#319447] p-5 text-white sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-white/80">WELCOME TO DEMO GS25</p>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">오늘은 5,000원으로<br />어떤 한 끼를 만들어볼까요?</h2>
              <p className="mt-2 text-sm text-white/85">상품을 둘러보고 예산에 맞춰 나만의 조합을 담아보세요.</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4">
              <ShoppingBasket className="mb-2 h-6 w-6" />
              <p className="text-xs text-white/80">장바구니 상품</p>
              <p className="text-2xl font-extrabold">{itemCount}개</p>
            </div>
          </div>
        </section>

        <div className="rounded-2xl border border-[#E8D8B8] bg-[#FFF3D8] px-4 py-3 text-xs leading-relaxed text-[#6B5630]">
          <strong>가상 매장 안내</strong> · 아래 상품명, 가격, 행사 및 재고는 앱 테스트용으로 만든 가상 데이터이며 실제 GS25 매장의 판매정보·실시간 재고가 아닙니다.
        </div>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#EAE0CC] bg-white p-4">
            <label className="text-xs font-semibold text-[#756D60]" htmlFor="demo-budget">나의 예산</label>
            <div className="mt-2 flex items-center gap-2">
              <input id="demo-budget" type="number" min="1" step="500" value={budget} onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))} className="w-full border-b border-[#DDD2BE] bg-transparent py-1 text-xl font-extrabold outline-none" />
              <span className="font-bold">원</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              {[3000, 5000, 7000].map((value) => <button key={value} onClick={() => setBudget(value)} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${budget === value ? 'bg-[#319447] text-white' : 'bg-[#F7F1E6] text-[#5C5549]'}`}>{value.toLocaleString()}원</button>)}
            </div>
          </div>
          <button onClick={addSuggestedCombo} className="flex min-h-28 items-center gap-3 rounded-2xl border border-[#EAE0CC] bg-white p-4 text-left hover:border-[#319447]">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF5EC] text-[#319447]"><Sparkles className="h-5 w-5" /></span>
            <span><strong className="block">5천 원 꿀조합 담기</strong><small className="mt-1 block text-xs text-[#756D60]">샘플 추천 조합을 장바구니에 담아요</small></span>
          </button>
          <button onClick={() => { setActiveTab('cart'); setNotice(''); }} className="flex min-h-28 items-center gap-3 rounded-2xl border border-[#EAE0CC] bg-white p-4 text-left hover:border-[#319447]">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF1DD] text-[#D98216]"><ShoppingBasket className="h-5 w-5" /><span className="absolute -right-1 -top-1 rounded-full bg-[#319447] px-1.5 text-[10px] font-bold text-white">{itemCount}</span></span>
            <span><strong className="block">장바구니 확인</strong><small className="mt-1 block text-xs text-[#756D60]">총액과 남은 예산을 확인해요</small></span>
          </button>
        </section>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('products')} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${activeTab === 'products' ? 'bg-[#252525] text-white' : 'bg-white text-[#5C5549] border border-[#EAE0CC]'}`}>상품 둘러보기</button>
            <button onClick={() => setActiveTab('cart')} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${activeTab === 'cart' ? 'bg-[#252525] text-white' : 'bg-white text-[#5C5549] border border-[#EAE0CC]'}`}>장바구니 ({itemCount})</button>
          </div>
          <button onClick={resetDemo} title="가상 재고와 장바구니 초기화" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-[#756D60] hover:bg-white"><RotateCcw className="h-3.5 w-3.5" />초기화</button>
        </div>

        {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-[#E8D8B8] bg-[#FFF3D8] px-4 py-3 text-sm text-[#6B5630]"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="안내 닫기"><X className="h-4 w-4" /></button></div>}

        {activeTab === 'products' ? (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C8272]" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="상품명을 검색해보세요" className="h-11 w-full rounded-xl border border-[#EAE0CC] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#319447]" />
              </div>
              <button onClick={() => setOnlyPromotions((value) => !value)} className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold ${onlyPromotions ? 'border-[#319447] bg-[#EAF5EC] text-[#25813A]' : 'border-[#EAE0CC] bg-white text-[#5C5549]'}`}><Tag className="h-4 w-4" />행사 상품만 {onlyPromotions ? '보기 중' : '보기'}</button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${category === item ? 'bg-[#319447] text-white' : 'border border-[#EAE0CC] bg-white text-[#5C5549]'}`}>{item}</button>)}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <article key={product.id} className="flex gap-4 rounded-2xl border border-[#EAE0CC] bg-white p-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#FAF5EA] text-4xl">{product.imageEmoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-[#8C8272]">{product.category}</span>
                      {product.promotion !== 'NONE' && <span className="rounded-md bg-[#FFF0D9] px-1.5 py-0.5 text-[10px] font-extrabold text-[#D98216]">{getPromotionLabel(product.promotion)}</span>}
                    </div>
                    <h3 className="mt-1 font-bold">{product.name}</h3>
                    <p className="mt-1 text-lg font-extrabold">{won(product.price)}</p>
                    <p className={`mt-1 text-[11px] ${product.stock === 0 ? 'text-red-600' : product.stock < 5 ? 'text-[#D98216]' : 'text-[#319447]'}`}>
                      {product.stock === 0 ? '품절' : product.stock < 5 ? `소량 재고 · ${product.stock}개` : `재고 있음 · ${product.stock}개`}
                    </p>
                    <button disabled={product.stock === 0} onClick={() => addToCart(product)} className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-lg bg-[#319447] px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-[#BDB7AA]"><Plus className="h-3.5 w-3.5" />담기</button>
                  </div>
                </article>
              ))}
            </div>
            {filteredProducts.length === 0 && <div className="rounded-2xl border border-dashed border-[#DDD2BE] bg-white p-8 text-center text-sm text-[#756D60]">검색 조건에 맞는 상품이 없습니다.</div>}
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <h2 className="text-lg font-extrabold">내 장바구니</h2>
              {cartDetails.length === 0 ? (
                <div className="rounded-2xl border border-[#EAE0CC] bg-white p-8 text-center text-sm text-[#756D60]">아직 담은 상품이 없습니다. 상품을 둘러보세요.</div>
              ) : cartDetails.map((line) => (
                <article key={line.productId} className="flex items-center gap-3 rounded-2xl border border-[#EAE0CC] bg-white p-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF5EA] text-2xl">{line.product.imageEmoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{line.product.name}</p>
                    <p className="text-xs text-[#756D60]">{line.product.promotion !== 'NONE' ? `${line.product.promotion} 행사 적용` : '행사 없음'}</p>
                    <p className="mt-1 text-sm font-extrabold">{won(line.lineTotal)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(line.productId, -1)} aria-label="수량 줄이기" className="rounded-lg border border-[#EAE0CC] p-2"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-5 text-center text-sm font-bold">{line.quantity}</span>
                    <button onClick={() => updateQuantity(line.productId, 1)} aria-label="수량 늘리기" className="rounded-lg border border-[#EAE0CC] p-2"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                </article>
              ))}
            </div>
            <aside className="h-fit rounded-2xl border border-[#EAE0CC] bg-white p-5">
              <div className="flex items-center gap-2 font-extrabold"><Receipt className="h-5 w-5 text-[#319447]" />예산 계산</div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between text-[#756D60]"><span>설정 예산</span><strong>{won(budget)}</strong></div>
                <div className="flex justify-between text-[#756D60]"><span>상품 수</span><strong>{itemCount}개</strong></div>
                <div className="border-t border-dashed border-[#DDD2BE] pt-3 flex justify-between text-base font-extrabold"><span>예상 금액</span><span>{won(total)}</span></div>
                <div className={`flex justify-between rounded-xl p-3 font-bold ${remaining >= 0 ? 'bg-[#EAF5EC] text-[#25813A]' : 'bg-[#FFF0E9] text-[#C34D2C]'}`}><span>{remaining >= 0 ? '남은 잔액' : '예산 초과'}</span><span>{won(Math.abs(remaining))}{remaining < 0 ? ' 초과' : ' 남음'}</span></div>
              </div>
              <button disabled={cart.length === 0 || remaining < 0} onClick={completeDemoPurchase} className="mt-5 min-h-12 w-full rounded-xl bg-[#319447] px-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-[#BDB7AA]">가상 구매 완료</button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-[#8C8272]">실제 결제 없이 가상 재고만 차감됩니다.</p>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
