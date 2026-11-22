import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Home,
  Mail,
  MessageSquare,
  QrCode,
  Receipt,
  Share2,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import type { VirtualReceipt } from '../../types.ts';
import { formatKRW } from '../../utils/pricing.ts';
import {
  buildMailtoHref,
  buildMobileReceiptShareUrl,
  buildSmsHref,
  downloadReceiptPng,
  formatReceiptPlainText,
} from '../../utils/mobileReceipt.ts';

interface VirtualReceiptViewProps {
  receipt: VirtualReceipt;
  recentReceipts: VirtualReceipt[];
  onRetryRecommend: () => void;
  onBackToStoreHome: () => void;
  onSelectReceipt?: (receipt: VirtualReceipt) => void;
}

export default function VirtualReceiptView({
  receipt,
  recentReceipts,
  onRetryRecommend,
  onBackToStoreHome,
  onSelectReceipt,
}: VirtualReceiptViewProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showQrPanel, setShowQrPanel] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);

  const shareUrl = useMemo(() => buildMobileReceiptShareUrl(receipt), [receipt]);
  const plainText = useMemo(
    () => formatReceiptPlainText(receipt, shareUrl),
    [receipt, shareUrl],
  );
  const smsHref = useMemo(
    () => buildSmsHref(phoneNumber, receipt, shareUrl),
    [phoneNumber, receipt, shareUrl],
  );
  const mailtoHref = useMemo(() => buildMailtoHref(receipt, shareUrl), [receipt, shareUrl]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(shareUrl, {
      width: 220,
      margin: 2,
      color: { dark: '#252525', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [shareUrl]);

  const showStatus = (msg: string) => {
    setSendFeedback(msg);
    window.setTimeout(() => {
      setSendFeedback((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  const copyTextWithFallback = async (text: string, successMsg: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        showStatus(successMsg);
        return;
      }
    } catch {
      // Fallback below
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.className = 'fixed opacity-0 pointer-events-none';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showStatus(successMsg);
    } catch {
      showStatus('복사에 실패했습니다. 영수증 이미지 저장이나 문자 보내기를 이용해 보세요.');
    }
  };

  const handleMobileShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `[GS25 모바일 영수증] ${receipt.storeName}`,
          text: formatReceiptPlainText(receipt),
          url: shareUrl,
        });
        showStatus('모바일 기기/메신저로 영수증 공유를 열었습니다.');
        return;
      } catch {
        // User dismissed or share unavailable -> fallback copy
      }
    }
    await copyTextWithFallback(
      plainText,
      '모바일 영수증 내용과 링크가 복사되었습니다. 카카오톡·메신저에 바로 붙여넣기 하세요.',
    );
  };

  const handleSavePng = () => {
    const ok = downloadReceiptPng(receipt);
    showStatus(
      ok
        ? '영수증 이미지(PNG) 파일이 저장되었습니다.'
        : '브라우저에서 이미지 저장을 지원하지 않습니다.',
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <section className="bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#F2FBF4] text-[#319447] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <p className="text-xs font-extrabold text-[#F49A24]">가상 구매 영수증 (체험용)</p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#252525]">
            가상 구매가 완료되었습니다
          </h1>
          <p className="text-xs text-[#6B6355]">
            선택한 상품 수량만큼 가상 매장 재고가 차감되었습니다.
          </p>
        </div>

        {/* Thermal Receipt Card */}
        <div className="bg-[#FFFDF9] border border-dashed border-[#D6C9B0] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C5549] pb-3 border-b border-dashed border-[#D6C9B0]">
            <div className="min-w-0">
              <p className="font-extrabold text-sm text-[#252525] break-words">
                GS25 · {receipt.storeName} (가상 매장)
              </p>
              <p className="mt-0.5 break-all">영수증 번호: {receipt.receiptId}</p>
            </div>
            <span className="font-num shrink-0">{receipt.purchasedAt}</span>
          </div>

          <div className="space-y-2.5 text-sm">
            {receipt.items.map((line) => (
              <div key={line.productId} className="space-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-[#252525] min-w-0 break-words">
                    {line.product.name} × {line.quantity}
                  </span>
                  <div className="font-num text-right shrink-0">
                    {line.discountAmount > 0 && (
                      <span className="text-xs text-[#8A8070] line-through mr-1.5">
                        {formatKRW(line.regularLineTotal)}
                      </span>
                    )}
                    <span className="font-bold text-[#252525]">
                      {formatKRW(line.appliedLineTotal)}
                    </span>
                  </div>
                </div>
                {line.promoAppliedLabel && line.discountAmount > 0 && (
                  <p className="text-[11px] font-semibold text-[#F49A24]">
                    {line.promoAppliedLabel} (-{formatKRW(line.discountAmount)})
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-dashed border-[#D6C9B0] space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-[#6B6355]">
              <span>상품 정가 합계</span>
              <span className="font-num">{formatKRW(receipt.regularTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[#F49A24] font-semibold">
              <span>가상 행사 할인 내역</span>
              <span className="font-num">-{formatKRW(receipt.totalDiscount)}</span>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-[#EFE5D2]">
              <span className="font-bold text-[#252525]">총 가상 결제 금액</span>
              <span className="font-num text-xl font-extrabold text-[#252525]">
                {formatKRW(receipt.finalTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#5C5549] pt-1">
              <span>사용 예산 {formatKRW(receipt.budget)}</span>
              <span className="font-num font-bold text-[#319447]">
                남은 잔액 {formatKRW(receipt.remainingBudget)}
              </span>
            </div>
          </div>
        </div>

        {/* Send Receipt to Mobile Panel */}
        <section
          aria-label="모바일로 영수증 보내기"
          className="rounded-2xl border border-[#CBEAD4] bg-[#F4FBF6] p-4 sm:p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#319447] text-white flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-[#1E582B]">모바일로 영수증 보내기</h2>
                <p className="text-[11px] text-[#396A44]">
                  QR 스캔, SMS 문자, 메신저 공유 또는 이미지 저장으로 휴대폰에 바로 받아보세요.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQrPanel((prev) => !prev)}
              className="min-h-[34px] px-2.5 py-1 rounded-lg border border-[#BCE2C6] bg-white hover:bg-[#ECF8EF] text-[11px] font-bold text-[#226631] inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showQrPanel ? 'QR 접기' : 'QR 보기'}</span>
            </button>
          </div>

          {sendFeedback && (
            <div
              role="status"
              className="p-3 rounded-xl bg-white border border-[#319447]/40 text-xs font-semibold text-[#226631] flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{sendFeedback}</span>
            </div>
          )}

          {/* Quick Actions: Mobile Share / Image Save / Copy */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleMobileShare}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-[#319447] hover:bg-[#257336] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>모바일 공유하기</span>
            </button>
            <button
              type="button"
              onClick={handleSavePng}
              className="min-h-[42px] px-3 py-2 rounded-xl border border-[#C8DFCE] bg-white hover:bg-[#FAF6EC] text-xs font-bold text-[#252525] inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#319447] shrink-0" />
              <span>영수증 이미지 저장</span>
            </button>
            <button
              type="button"
              onClick={() =>
                copyTextWithFallback(plainText, '영수증 전체 내역이 클립보드에 복사되었습니다.')
              }
              className="min-h-[42px] px-3 py-2 rounded-xl border border-[#C8DFCE] bg-white hover:bg-[#FAF6EC] text-xs font-bold text-[#252525] inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-[#F49A24] shrink-0" />
              <span>영수증 텍스트 복사</span>
            </button>
          </div>

          {/* QR Code Scan to Phone */}
          {showQrPanel && (
            <div className="bg-white border border-[#D8EEDF] rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-32 h-32 rounded-xl border border-[#EAE0CC] bg-white p-1.5 flex items-center justify-center shrink-0">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="모바일 영수증 확인용 QR 코드"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-[11px] text-[#756D60]">QR 생성 중...</span>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                <p className="text-xs font-extrabold text-[#252525]">
                  스마트폰 카메라로 QR 스캔해 받기
                </p>
                <p className="text-[11.5px] text-[#5C5549] leading-relaxed">
                  휴대폰 카메라로 위 QR 코드를 비추면 모바일 전용 전자 영수증 화면이 바로 열립니다.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    copyTextWithFallback(
                      shareUrl,
                      '모바일 영수증 전용 링크가 복사되었습니다.',
                    )
                  }
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#FAF5EA] hover:bg-[#F1E8D5] border border-[#DDD2BE] text-[11px] font-bold text-[#252525] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#319447]" />
                  <span>모바일 영수증 링크 복사</span>
                </button>
              </div>
            </div>
          )}

          {/* Direct SMS / Email Sending */}
          <div className="bg-white border border-[#D8EEDF] rounded-2xl p-3.5 space-y-2.5">
            <label
              htmlFor="mobile-receipt-phone"
              className="block text-xs font-bold text-[#252525]"
            >
              문자(SMS) · 이메일로 바로 전송
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="mobile-receipt-phone"
                type="tel"
                inputMode="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="휴대폰 번호 (선택, 예: 010-1234-5678)"
                className="flex-1 min-w-0 min-h-[40px] px-3 py-2 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] text-xs font-num focus:outline-none focus:ring-2 focus:ring-[#319447]"
              />
              <div className="flex gap-2 shrink-0">
                <a
                  href={smsHref}
                  onClick={() =>
                    showStatus('문자 메시지 앱을 호출했습니다. 휴대폰에서 전송을 눌러 완료하세요.')
                  }
                  className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-2 rounded-xl bg-[#252525] hover:bg-[#3A3A3A] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>문자 보내기</span>
                </a>
                <a
                  href={mailtoHref}
                  onClick={() => showStatus('이메일 앱으로 영수증 초안을 전달했습니다.')}
                  className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] text-[#252525] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Mail className="w-3.5 h-3.5 text-[#319447]" />
                  <span>이메일</span>
                </a>
              </div>
            </div>
            <p className="text-[11px] text-[#756D60]">
              번호를 비워두면 기기 문자 앱에서 연락처를 직접 고를 수 있습니다. PC에서는 QR 스캔이나 공유/복사 버튼을 이용해 보세요.
            </p>
          </div>
        </section>

        <p className="text-[11px] text-[#756D60] text-center leading-relaxed">
          ※ 본 영수증은 테스트용 시뮬레이션 기록이며, 실제 카드·현금 결제나 GS25 매장 주문 접수는 이루어지지 않았습니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onRetryRecommend}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#319447] hover:bg-[#257336] text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>다시 추천받기</span>
          </button>
          <button
            type="button"
            onClick={onBackToStoreHome}
            className="min-h-[46px] px-4 py-2.5 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF4E6] text-sm font-bold text-[#252525] inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>가상 매장으로 돌아가기</span>
          </button>
        </div>
      </section>

      {recentReceipts.length > 1 && (
        <section className="bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#F49A24]" />
              <h2 className="text-sm font-bold text-[#252525]">최근 가상 구매 내역</h2>
            </div>
            {onSelectReceipt && (
              <span className="text-[11px] text-[#756D60]">클릭하면 모바일 전송 가능</span>
            )}
          </div>
          <div className="space-y-2 text-xs">
            {recentReceipts.slice(0, 5).map((r) => {
              const isCurrent = r.receiptId === receipt.receiptId;
              return (
                <button
                  key={r.receiptId}
                  type="button"
                  onClick={() => onSelectReceipt?.(r)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between gap-2 text-left transition-colors ${
                    isCurrent
                      ? 'bg-[#F2FBF4] border-[#319447]'
                      : 'bg-[#FFFDF9] border-[#EFE5D2] hover:bg-[#FAF5EA]'
                  } ${onSelectReceipt ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#252525] truncate">
                      {r.storeName} ·{' '}
                      {r.items.map((i) => `${i.product.name}×${i.quantity}`).join(', ')}
                    </p>
                    <p className="text-[#756D60] font-num">{r.purchasedAt}</p>
                  </div>
                  <span className="font-num font-bold text-[#319447] shrink-0">
                    {formatKRW(r.finalTotal)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
