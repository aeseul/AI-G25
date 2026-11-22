import React, { useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Copy, Download, Share2, Smartphone } from 'lucide-react';
import type { CompactMobileReceiptPayload } from '../../utils/mobileReceipt.ts';
import {
  downloadReceiptPng,
  formatCompactReceiptPlainText,
} from '../../utils/mobileReceipt.ts';
import { formatKRW } from '../../utils/pricing.ts';
import type { VirtualReceipt } from '../../types.ts';

interface MobileReceiptViewProps {
  payload: CompactMobileReceiptPayload;
  onEnterApp: () => void;
}

export default function MobileReceiptView({ payload, onEnterApp }: MobileReceiptViewProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const toVirtualReceipt = (): VirtualReceipt => ({
    receiptId: payload.id,
    storeName: payload.sn,
    storeId: 'GS25_MOBILE_RECEIPT',
    purchasedAt: payload.at,
    items: payload.i.map((item, idx) => ({
      productId: `mr_${idx}`,
      product: {
        id: `mr_${idx}`,
        brand: 'GS25',
        name: item.n,
        category: '즉석식품',
        regularPrice: item.p + item.d,
        promotionType: item.d > 0 ? '1+1' : 'NONE',
        promotionDescription: item.l ?? null,
        promotionStartAt: null,
        promotionEndAt: null,
        stockQuantity: 1,
        availabilityStatus: 'IN_STOCK',
        tasteTags: [],
        mealTags: [],
        nutrition: null,
        isMicrowaveSuitable: false,
        requiresHotWater: false,
        estimatedPrepMinutes: 1,
        imageUrl: '',
        dataSource: 'DEMO',
        lastVerifiedAt: '',
        description: '',
      },
      quantity: item.q,
      paidQuantity: item.q,
      freeQuantity: 0,
      regularLineTotal: item.p + item.d,
      appliedLineTotal: item.p,
      discountAmount: item.d,
      promoAppliedLabel: item.l ?? null,
    })),
    regularTotal: payload.r,
    totalDiscount: payload.d,
    finalTotal: payload.f,
    budget: payload.b,
    remainingBudget: payload.rem,
  });

  const handleCopyText = async () => {
    const text = formatCompactReceiptPlainText(payload);
    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage('모바일 영수증 내역이 클립보드에 복사되었습니다.');
    } catch {
      setStatusMessage('영수증 복사에 실패했습니다. 화면을 캡처해 보관해 주세요.');
    }
  };

  const handleShare = async () => {
    const text = formatCompactReceiptPlainText(payload);
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `[GS25 모바일 영수증] ${payload.sn}`,
          text,
          url: window.location.href,
        });
        setStatusMessage('모바일 공유가 완료되었습니다.');
        return;
      } catch {
        // Fallback to copy below if user cancelled or unsupported
      }
    }
    await handleCopyText();
  };

  const handleDownloadPng = () => {
    const ok = downloadReceiptPng(toVirtualReceipt());
    setStatusMessage(ok ? '영수증 이미지(PNG)가 저장되었습니다.' : '이미지 저장을 지원하지 않는 브라우저입니다.');
  };

  return (
    <div className="min-h-screen bg-[#FFF9EF] text-[#252525] px-3.5 sm:px-6 py-6 sm:py-10 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-center gap-2 text-xs font-extrabold text-[#319447]">
          <Smartphone className="w-4 h-4" />
          <span>모바일 전자 영수증</span>
        </div>

        <section className="bg-white border border-[#EAE0CC] rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="text-center space-y-1.5">
            <div className="w-11 h-11 rounded-2xl bg-[#F2FBF4] text-[#319447] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs font-extrabold text-[#F49A24]">GS25 가상 매장 모바일 영수증</p>
            <h1 className="text-xl font-extrabold text-[#252525] break-words">GS25 · {payload.sn}</h1>
            <p className="text-xs text-[#6B6355] font-num">
              {payload.id} · {payload.at}
            </p>
          </div>

          <div className="bg-[#FFFDF9] border border-dashed border-[#D6C9B0] rounded-2xl p-4 space-y-3">
            <div className="space-y-2.5 text-sm">
              {payload.i.map((line, index) => (
                <div key={`${line.n}_${index}`} className="space-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-[#252525] min-w-0 break-words">
                      {line.n} × {line.q}
                    </span>
                    <span className="font-num font-bold text-[#252525] shrink-0">
                      {formatKRW(line.p)}
                    </span>
                  </div>
                  {line.l && line.d > 0 && (
                    <p className="text-[11px] font-semibold text-[#F49A24]">
                      {line.l} (-{formatKRW(line.d)})
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-dashed border-[#D6C9B0] space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-[#6B6355] text-xs">
                <span>상품 정가 합계</span>
                <span className="font-num">{formatKRW(payload.r)}</span>
              </div>
              <div className="flex items-center justify-between text-[#F49A24] font-semibold text-xs">
                <span>가상 행사 할인액</span>
                <span className="font-num">-{formatKRW(payload.d)}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-[#EFE5D2]">
                <span className="font-bold text-[#252525]">총 가상 결제 금액</span>
                <span className="font-num text-xl font-extrabold text-[#252525]">
                  {formatKRW(payload.f)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#5C5549]">
                <span>사용 예산 {formatKRW(payload.b)}</span>
                <span className="font-num font-bold text-[#319447]">
                  남은 잔액 {formatKRW(payload.rem)}
                </span>
              </div>
            </div>
          </div>

          {statusMessage && (
            <div
              role="status"
              className="p-3 rounded-xl bg-[#F2FBF4] border border-[#319447]/35 text-xs font-semibold text-[#226631] flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-[#319447] hover:bg-[#257336] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>공유하기</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPng}
              className="min-h-[42px] px-3 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] text-xs font-bold text-[#252525] inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>이미지 저장</span>
            </button>
            <button
              type="button"
              onClick={handleCopyText}
              className="min-h-[42px] px-3 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] text-xs font-bold text-[#252525] inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>내역 복사</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onEnterApp}
            className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#252525] hover:bg-[#3A3A3A] text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>AI 편의점 꿀조합 큐레이터 열기</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-[#756D60] text-center leading-relaxed">
            ※ 본 모바일 영수증은 테스트용 가상 체험 기록이며, 실제 결제·주문 시스템과 연동되지 않습니다.
          </p>
        </section>
      </div>
    </div>
  );
}
