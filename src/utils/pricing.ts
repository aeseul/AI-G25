import type { Product, VerifiedComboItem } from '../types.ts';

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isPromotionExpired(product: Product, todayIso = getTodayIsoDate()): boolean {
  if (!product.promotionPeriod || product.promotionType === 'NONE') {
    return false;
  }
  return product.promotionPeriod.end < todayIso;
}

export function calculateLinePricing(
  product: Product,
  quantity: number,
  todayIso = getTodayIsoDate(),
): VerifiedComboItem {
  const safeQty = Math.max(1, Math.floor(quantity));

  if (product.regularPrice === null || typeof product.regularPrice !== 'number') {
    return {
      productId: product.productId,
      product,
      quantity: safeQty,
      unitRegularPrice: null,
      regularLineTotal: 0,
      appliedLineTotal: 0,
      discountAmount: 0,
      priceUnknown: true,
      promoAppliedLabel: '가격 확인 필요 (총액 계산 제외)',
      promoExpired: false,
    };
  }

  const unitRegular = product.regularPrice;
  const regularLineTotal = unitRegular * safeQty;
  const expired = isPromotionExpired(product, todayIso);

  if (product.promotionType === 'NONE' || expired) {
    return {
      productId: product.productId,
      product,
      quantity: safeQty,
      unitRegularPrice: unitRegular,
      regularLineTotal,
      appliedLineTotal: regularLineTotal,
      discountAmount: 0,
      priceUnknown: false,
      promoAppliedLabel: expired ? '행사 기간 만료 (정가 적용)' : null,
      promoExpired: expired,
    };
  }

  if (product.promotionType === '1+1') {
    if (safeQty >= 2) {
      const paidUnits = Math.ceil(safeQty / 2);
      const freeUnits = safeQty - paidUnits;
      const appliedLineTotal = paidUnits * unitRegular;
      const discountAmount = freeUnits * unitRegular;
      return {
        productId: product.productId,
        product,
        quantity: safeQty,
        unitRegularPrice: unitRegular,
        regularLineTotal,
        appliedLineTotal,
        discountAmount,
        priceUnknown: false,
        promoAppliedLabel: `1+1 적용 (${freeUnits}개 무료)`,
        promoExpired: false,
      };
    }
    return {
      productId: product.productId,
      product,
      quantity: safeQty,
      unitRegularPrice: unitRegular,
      regularLineTotal,
      appliedLineTotal: regularLineTotal,
      discountAmount: 0,
      priceUnknown: false,
      promoAppliedLabel: '1+1 행사 대상 (1개 선택 시 정가 적용)',
      promoExpired: false,
    };
  }

  if (product.promotionType === '2+1') {
    if (safeQty >= 3) {
      const freeUnits = Math.floor(safeQty / 3);
      const paidUnits = safeQty - freeUnits;
      const appliedLineTotal = paidUnits * unitRegular;
      const discountAmount = freeUnits * unitRegular;
      return {
        productId: product.productId,
        product,
        quantity: safeQty,
        unitRegularPrice: unitRegular,
        regularLineTotal,
        appliedLineTotal,
        discountAmount,
        priceUnknown: false,
        promoAppliedLabel: `2+1 적용 (${freeUnits}개 무료)`,
        promoExpired: false,
      };
    }
    return {
      productId: product.productId,
      product,
      quantity: safeQty,
      unitRegularPrice: unitRegular,
      regularLineTotal,
      appliedLineTotal: regularLineTotal,
      discountAmount: 0,
      priceUnknown: false,
      promoAppliedLabel: '2+1 행사 대상 (3개 미만 시 정가 적용)',
      promoExpired: false,
    };
  }

  if (
    product.promotionType === 'DISCOUNT' &&
    typeof product.salePrice === 'number' &&
    product.salePrice > 0 &&
    product.salePrice < unitRegular
  ) {
    const appliedLineTotal = product.salePrice * safeQty;
    const discountAmount = regularLineTotal - appliedLineTotal;
    return {
      productId: product.productId,
      product,
      quantity: safeQty,
      unitRegularPrice: unitRegular,
      regularLineTotal,
      appliedLineTotal,
      discountAmount,
      priceUnknown: false,
      promoAppliedLabel: `할인 적용 (-${formatKRW(discountAmount)})`,
      promoExpired: false,
    };
  }

  return {
    productId: product.productId,
    product,
    quantity: safeQty,
    unitRegularPrice: unitRegular,
    regularLineTotal,
    appliedLineTotal: regularLineTotal,
    discountAmount: 0,
    priceUnknown: false,
    promoAppliedLabel: '행사 조건 미확인 (정가 적용)',
    promoExpired: false,
  };
}

export interface BudgetSummary {
  regularTotal: number;
  totalDiscount: number;
  finalTotal: number;
  remainingBudget: number;
  isOverBudget: boolean;
  exceededAmount: number;
  hasUnknownPrice: boolean;
}

export function summarizeBudget(items: VerifiedComboItem[], budget: number): BudgetSummary {
  let regularTotal = 0;
  let totalDiscount = 0;
  let finalTotal = 0;
  let hasUnknownPrice = false;

  for (const item of items) {
    if (item.priceUnknown) {
      hasUnknownPrice = true;
      continue;
    }
    regularTotal += item.regularLineTotal;
    totalDiscount += item.discountAmount;
    finalTotal += item.appliedLineTotal;
  }

  const remainingBudget = budget - finalTotal;
  const isOverBudget = finalTotal > budget;
  const exceededAmount = isOverBudget ? finalTotal - budget : 0;

  return {
    regularTotal,
    totalDiscount,
    finalTotal,
    remainingBudget,
    isOverBudget,
    exceededAmount,
    hasUnknownPrice,
  };
}

export function formatKRW(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}
