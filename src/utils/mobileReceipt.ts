import type { VirtualReceipt } from '../types.ts';
import { formatKRW } from './pricing.ts';

export interface CompactMobileReceiptLine {
  n: string; // product name
  q: number; // quantity
  p: number; // appliedLineTotal
  d: number; // discountAmount
  l?: string | null; // promoAppliedLabel
}

export interface CompactMobileReceiptPayload {
  id: string;
  sn: string;
  at: string;
  b: number;
  r: number;
  d: number;
  f: number;
  rem: number;
  i: CompactMobileReceiptLine[];
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (input.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeMobileReceiptPayload(receipt: VirtualReceipt): string {
  const payload: CompactMobileReceiptPayload = {
    id: receipt.receiptId,
    sn: receipt.storeName,
    at: receipt.purchasedAt,
    b: receipt.budget,
    r: receipt.regularTotal,
    d: receipt.totalDiscount,
    f: receipt.finalTotal,
    rem: receipt.remainingBudget,
    i: receipt.items.map((line) => ({
      n: line.product.name,
      q: line.quantity,
      p: line.appliedLineTotal,
      d: line.discountAmount,
      ...(line.promoAppliedLabel && line.discountAmount > 0 ? { l: line.promoAppliedLabel } : {}),
    })),
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64Url(bytes);
}

export function decodeMobileReceiptPayload(encoded: string): CompactMobileReceiptPayload | null {
  try {
    if (!encoded || encoded.length > 6000) return null;
    const bytes = base64UrlToBytes(encoded);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<CompactMobileReceiptPayload>;
    if (
      !parsed ||
      typeof parsed.id !== 'string' ||
      typeof parsed.sn !== 'string' ||
      typeof parsed.at !== 'string' ||
      !Array.isArray(parsed.i)
    ) {
      return null;
    }
    return {
      id: parsed.id,
      sn: parsed.sn,
      at: parsed.at,
      b: Number(parsed.b) || 0,
      r: Number(parsed.r) || 0,
      d: Number(parsed.d) || 0,
      f: Number(parsed.f) || 0,
      rem: Number(parsed.rem) || 0,
      i: parsed.i.map((item) => ({
        n: String(item.n || ''),
        q: Math.max(1, Number(item.q) || 1),
        p: Number(item.p) || 0,
        d: Number(item.d) || 0,
        l: item.l ? String(item.l) : null,
      })),
    };
  } catch {
    return null;
  }
}

export function buildMobileReceiptShareUrl(receipt: VirtualReceipt): string {
  const encoded = encodeMobileReceiptPayload(receipt);
  const baseUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://aistudio.google.com/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}?mobileReceipt=${encoded}`;
}

export function formatReceiptPlainText(receipt: VirtualReceipt, shareUrl?: string): string {
  const lines = [
    '[GS25 가상 모바일 영수증]',
    `매장: GS25 · ${receipt.storeName}`,
    `영수증 번호: ${receipt.receiptId}`,
    `일시: ${receipt.purchasedAt}`,
    '------------------------------',
    ...receipt.items.map((line) => {
      const promoText =
        line.promoAppliedLabel && line.discountAmount > 0
          ? ` (${line.promoAppliedLabel} -${formatKRW(line.discountAmount)})`
          : '';
      return `• ${line.product.name} × ${line.quantity} : ${formatKRW(line.appliedLineTotal)}${promoText}`;
    }),
    '------------------------------',
    `상품 정가 합계: ${formatKRW(receipt.regularTotal)}`,
    `행사 할인 합계: -${formatKRW(receipt.totalDiscount)}`,
    `최종 금액: ${formatKRW(receipt.finalTotal)}`,
    `사용 예산 ${formatKRW(receipt.budget)} / 남은 잔액 ${formatKRW(receipt.remainingBudget)}`,
  ];

  if (shareUrl) {
    lines.push('', `모바일 영수증 보기: ${shareUrl}`);
  }
  lines.push('', '※ 본 영수증은 AI 편의점 꿀조합 큐레이터 테스트용 가상 영수증입니다.');
  return lines.join('\n');
}

export function formatCompactReceiptPlainText(payload: CompactMobileReceiptPayload): string {
  return [
    '[GS25 가상 모바일 영수증]',
    `매장: GS25 · ${payload.sn}`,
    `영수증 번호: ${payload.id}`,
    `일시: ${payload.at}`,
    '------------------------------',
    ...payload.i.map((line) => {
      const promoText = line.l && line.d > 0 ? ` (${line.l} -${formatKRW(line.d)})` : '';
      return `• ${line.n} × ${line.q} : ${formatKRW(line.p)}${promoText}`;
    }),
    '------------------------------',
    `상품 정가 합계: ${formatKRW(payload.r)}`,
    `행사 할인 합계: -${formatKRW(payload.d)}`,
    `최종 금액: ${formatKRW(payload.f)}`,
    `사용 예산 ${formatKRW(payload.b)} / 남은 잔액 ${formatKRW(payload.rem)}`,
  ].join('\n');
}

export function buildSmsHref(phoneInput: string, receipt: VirtualReceipt, shareUrl?: string): string {
  const digits = phoneInput.replace(/[^\d+]/g, '');
  const body = formatReceiptPlainText(receipt, shareUrl);
  return digits ? `sms:${digits}?body=${encodeURIComponent(body)}` : `sms:?body=${encodeURIComponent(body)}`;
}

export function buildMailtoHref(receipt: VirtualReceipt, shareUrl?: string): string {
  const subject = `[GS25 모바일 영수증] ${receipt.storeName} (${formatKRW(receipt.finalTotal)})`;
  const body = formatReceiptPlainText(receipt, shareUrl);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function downloadReceiptPng(receipt: VirtualReceipt): boolean {
  if (typeof document === 'undefined') return false;
  const lineHeight = 32;
  const height = 430 + receipt.items.length * 46;
  const width = 560;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  // Thermal receipt background
  ctx.fillStyle = '#FFFDF9';
  ctx.fillRect(0, 0, width, height);

  // Top GS25 accent strip
  ctx.fillStyle = '#319447';
  ctx.fillRect(0, 0, width, 12);

  ctx.strokeStyle = '#DFD5C0';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 24, width - 32, height - 40);

  // Header
  ctx.fillStyle = '#007CFF';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GS25 모바일 영수증 (체험용)', width / 2, 72);

  ctx.fillStyle = '#252525';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`GS25 · ${receipt.storeName}`, width / 2, 106);

  ctx.fillStyle = '#6B6355';
  ctx.font = '14px sans-serif';
  ctx.fillText(`영수증 번호: ${receipt.receiptId}`, width / 2, 134);
  ctx.fillText(receipt.purchasedAt, width / 2, 156);

  const drawDashed = (y: number) => {
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#C9BCA3';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(width - 40, y);
    ctx.stroke();
    ctx.restore();
  };

  drawDashed(178);

  // Items
  let y = 212;
  for (const line of receipt.items) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#252525';
    ctx.font = 'bold 16px sans-serif';
    const title = `${line.product.name} × ${line.quantity}`;
    ctx.fillText(title.slice(0, 24), 40, y);

    ctx.textAlign = 'right';
    ctx.fillText(formatKRW(line.appliedLineTotal), width - 40, y);

    if (line.promoAppliedLabel && line.discountAmount > 0) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F49A24';
      ctx.font = '13px sans-serif';
      ctx.fillText(`${line.promoAppliedLabel} (-${formatKRW(line.discountAmount)})`, 48, y + 19);
    }
    y += 46;
  }

  drawDashed(y + 4);
  y += lineHeight + 6;

  const drawSummaryRow = (label: string, value: string, color = '#5C5549', bold = false, size = 16) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${size}px sans-serif`;
    ctx.fillText(label, 40, y);
    ctx.textAlign = 'right';
    ctx.fillText(value, width - 40, y);
    y += 30;
  };

  drawSummaryRow('상품 정가 합계', formatKRW(receipt.regularTotal));
  drawSummaryRow('가상 행사 할인액', `-${formatKRW(receipt.totalDiscount)}`, '#F49A24', true);
  y += 4;
  drawSummaryRow('총 가상 결제 금액', formatKRW(receipt.finalTotal), '#252525', true, 22);
  drawSummaryRow(
    `사용 예산 ${formatKRW(receipt.budget)}`,
    `남은 잔액 ${formatKRW(receipt.remainingBudget)}`,
    '#319447',
    true,
    14,
  );

  y += 12;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#756D60';
  ctx.font = '12px sans-serif';
  ctx.fillText('※ 테스트용 시뮬레이션 모바일 영수증 (실제 결제 아님)', width / 2, y);

  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = `GS25_모바일영수증_${receipt.receiptId}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
