import type { RecipeStep } from '../types.ts';
import { resolveAssetPath } from './assetPath.ts';

export interface ProductMediaHint {
  name: string;
  imageUrl?: string;
}

export interface ResolvedStepVideo {
  step: number;
  instruction: string;
  minutes: number;
  videoUrl: string;
  posterUrl: string;
  shortTitle: string;
  matchedProductName: string | null;
  timerSeconds: number | null;
  timerLabel: string | null;
}

const VIDEO_PATHS = {
  ramenWater: resolveAssetPath('/assets/videos/step_ramen_water.mp4'),
  buldakSauce: resolveAssetPath('/assets/videos/step_buldak_sauce.mp4'),
  kimbapMicrowave: resolveAssetPath('/assets/videos/step_kimbap_microwave.mp4'),
  cheeseMelt: resolveAssetPath('/assets/videos/step_cheese_melt.mp4'),
  eggTopping: resolveAssetPath('/assets/videos/step_egg_topping.mp4'),
  chickenHeat: resolveAssetPath('/assets/videos/step_chicken_heat.mp4'),
  drinkPairing: resolveAssetPath('/assets/videos/step_drink_pairing.mp4'),
  safetyFinish: resolveAssetPath('/assets/videos/step_safety_finish.mp4'),
} as const;

export function resolveStepVideo(
  step: RecipeStep,
  products: ProductMediaHint[],
  fallbackPoster?: string,
): ResolvedStepVideo {
  const text = step.instruction;
  const matchedProduct =
    products.find((p) => {
      const base = p.name.replace(/\s*\(.*?\)/g, '').trim();
      const firstWord = base.split(/\s+/)[0] || base;
      return text.includes(base) || (firstWord.length >= 2 && text.includes(firstWord));
    }) ?? null;

  const posterUrl =
    matchedProduct?.imageUrl || fallbackPoster || resolveAssetPath('/assets/products/yukgaejang.jpg');

  // 1. Buldak / Jjapagetti / stir-fried noodles (drain water & mix sauce)
  if (/불닭|짜파게티|짜파|짜장|액상\s*소스|물을.*버리|물을.*남긴|비벼|비빔/.test(text)) {
    const isMixOnly = /액상\s*소스.*섞|짜장.*비벼|비벼/.test(text) && !/온수/.test(text);
    return {
      step: step.step,
      instruction: step.instruction,
      minutes: step.minutes,
      videoUrl: VIDEO_PATHS.buldakSauce,
      posterUrl,
      shortTitle: isMixOnly ? '물 남기고 소스 골고루 비비기' : '온수 조리 후 소스 비비기',
      matchedProductName: matchedProduct?.name ?? null,
      timerSeconds: isMixOnly ? null : Math.max(120, step.minutes * 60),
      timerLabel: isMixOnly ? null : `${Math.max(2, step.minutes)}분 타이머`,
    };
  }

  // 2. Cup ramen / soup hot water cooking
  if (/온수|뜨거운\s*물|사발면|신라면|우동|김치찌개라면|참깨라면|컵국밥|컵라면/.test(text)) {
    const secs = step.minutes > 0 ? step.minutes * 60 : 180;
    return {
      step: step.step,
      instruction: step.instruction,
      minutes: step.minutes,
      videoUrl: VIDEO_PATHS.ramenWater,
      posterUrl,
      shortTitle: '뚜껑 개봉 · 표시선 온수 붓기',
      matchedProductName: matchedProduct?.name ?? null,
      timerSeconds: secs,
      timerLabel: `${Math.round(secs / 60)}분 타이머`,
    };
  }

  // 3. String cheese / cheese melting
  if (/치즈|콘치즈/.test(text)) {
    return {
      step: step.step,
      instruction: step.instruction,
      minutes: step.minutes,
      videoUrl: VIDEO_PATHS.cheeseMelt,
      posterUrl,
      shortTitle: '치즈 찢어 올리고 25초 녹이기',
      matchedProductName: matchedProduct?.name ?? null,
      timerSeconds: 25,
      timerLabel: '25초 타이머',
    };
  }

  // 4. Triangle kimbap / rice bowl microwave
  if (/삼각김밥|김밥|볶음밥/.test(text)) {
    return {
      step: step.step,
      instruction: step.instruction,
      minutes: step.minutes,
      videoUrl: VIDEO_PATHS.kimbapMicrowave,
      posterUrl,
      shortTitle: '1·2·3 개봉 및 전자레인지 30초',
      matchedProductName: matchedProduct?.name ?? null,
      timerSeconds: 30,
      timerLabel: '30초 타이머',
    };
  }

  // 5. Smoked / soft-boiled egg
  if (/훈제란|반숙란|달걀|계란/.test(text)) {
    return {
      step: step.step,
      instruction: step.instruction,
      minutes: step.minutes,
      videoUrl: VIDEO_PATHS.eggTopping,
      posterUrl,
      shortTitle: '껍질 까서 반으로 쪼개 토핑',
      matchedProductName: matchedProduct?.name ?? null,
      timerSeconds: null,
      timerLabel: null,
    };
  }

  // 6. Chicken breast / sausage / tteokbokki / lunchbox / generic microwave item
  if (/닭가슴살|소시지|후랑크|떡볶이|도시락|오징어|전자레인지|데워/.test(text)) {
    const secs = step.minutes >= 2 ? step.minutes * 60 : 60;
    return {
      step: step.step,
      instruction: step.instruction,
      minutes: step.minutes,
      videoUrl: VIDEO_PATHS.chickenHeat,
      posterUrl,
      shortTitle: /도시락/.test(text) ? '뚜껑 살짝 열고 전자레인지 가열' : '모서리 개봉 후 전자레인지 조리',
      matchedProductName: matchedProduct?.name ?? null,
      timerSeconds: secs,
      timerLabel: secs >= 60 ? `${Math.round(secs / 60)}분 타이머` : `${secs}초 타이머`,
    };
  }

  // 7. Drink / sandwich / yogurt / snack pairing
  if (/우유|생수|사이다|커피|레쓰비|조지아|탄산수|쉐이크|꿀물|샌드위치|초코바|초코파이|허니버터칩|새우깡|카스텔라|단팥빵|스낵|요거트|곁들입니다|함께/.test(text)) {
    return {
      step: step.step,
      instruction: step.instruction,
      minutes: step.minutes,
      videoUrl: VIDEO_PATHS.drinkPairing,
      posterUrl,
      shortTitle: '음료·간식 개봉 및 한 상 세팅',
      matchedProductName: matchedProduct?.name ?? null,
      timerSeconds: null,
      timerLabel: null,
    };
  }

  // 8. Final safety & completion step
  return {
    step: step.step,
    instruction: step.instruction,
    minutes: step.minutes,
    videoUrl: VIDEO_PATHS.safetyFinish,
    posterUrl,
    shortTitle: '조리 안전 체크 및 조합 완성',
    matchedProductName: matchedProduct?.name ?? null,
    timerSeconds: null,
    timerLabel: null,
  };
}

export function buildCookingYouTubeSearchUrl(productNames: string[], comboTitle: string): string {
  const cleanNames = productNames
    .slice(0, 3)
    .map((n) => n.replace(/\s*\(.*?\)/g, '').trim())
    .filter(Boolean);
  const query =
    cleanNames.length > 0
      ? `GS25 편의점 꿀조합 ${cleanNames.join(' ')} 레시피`
      : `GS25 편의점 꿀조합 ${comboTitle} 레시피`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
