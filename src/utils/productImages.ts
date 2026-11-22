import type { Product } from '../types.ts';
import { resolveAssetPath } from './assetPath.ts';

export const GS25_PRODUCT_IMAGES = {
  buldak: resolveAssetPath('/assets/products/buldak.jpg'),
  yukgaejang: resolveAssetPath('/assets/products/yukgaejang.jpg'),
  shinRamyun: resolveAssetPath('/assets/products/shin_ramyun_pack.jpg'),
  chapagetti: resolveAssetPath('/assets/products/chapagetti.jpg'),
  samgakTuna: resolveAssetPath('/assets/products/samgak_tuna.jpg'),
  samgakBibim: resolveAssetPath('/assets/products/samgak_bibim.jpg'),
  tteokbokki: resolveAssetPath('/assets/products/tteokbokki.jpg'),
  sandwich: resolveAssetPath('/assets/products/sandwich.jpg'),
  dosirakLunchbox: resolveAssetPath('/assets/products/dosirak_lunchbox.jpg'),
  stringCheese: resolveAssetPath('/assets/products/string_cheese.jpg'),
  greekYogurt: resolveAssetPath('/assets/products/greek_yogurt.jpg'),
  smokedEgg: resolveAssetPath('/assets/products/smoked_egg.jpg'),
  sausageHotbar: resolveAssetPath('/assets/products/sausage_hotbar.jpg'),
  chickenBreast: resolveAssetPath('/assets/products/chicken_breast.jpg'),
  bananaMilk: resolveAssetPath('/assets/products/banana_milk.jpg'),
  water500ml: resolveAssetPath('/assets/products/water_500ml.jpg'),
  letsbeCoffee: resolveAssetPath('/assets/products/letsbe_coffee.jpg'),
  georgiaCoffee: resolveAssetPath('/assets/products/georgia_coffee.jpg'),
  chilsungCider: resolveAssetPath('/assets/products/chilsung_cider.jpg'),
  chocobar: resolveAssetPath('/assets/products/chocobar.jpg'),
  honeyButterChip: resolveAssetPath('/assets/products/honey_butter_chip.jpg'),
  saeukkang: resolveAssetPath('/assets/products/saeukkang.jpg'),
  chocopie: resolveAssetPath('/assets/products/chocopie.jpg'),
  // Category fallbacks (also mapped to real convenience store product photos)
  ramenCup: resolveAssetPath('/assets/products/shin_ramyun_pack.jpg'),
  kimbapRice: resolveAssetPath('/assets/products/dosirak_lunchbox.jpg'),
  dairyEgg: resolveAssetPath('/assets/products/string_cheese.jpg'),
  chickenSausage: resolveAssetPath('/assets/products/sausage_hotbar.jpg'),
  tteokDrink: resolveAssetPath('/assets/products/tteokbokki.jpg'),
} as const;

export function getProductImageUrl(
  product: Pick<Product, 'productId' | 'category' | 'name' | 'imageUrl'>,
): string {
  const name = product.name || '';

  if (name.includes('불닭')) {
    return GS25_PRODUCT_IMAGES.buldak;
  }
  if (name.includes('짜파게티') || name.includes('짜파')) {
    return GS25_PRODUCT_IMAGES.chapagetti;
  }
  if (name.includes('신라면') || name.includes('김치찌개라면') || name.includes('참깨라면')) {
    return GS25_PRODUCT_IMAGES.shinRamyun;
  }
  if (name.includes('육개장') || name.includes('우동') || name.includes('라면')) {
    return GS25_PRODUCT_IMAGES.yukgaejang;
  }
  if (name.includes('떡볶이')) {
    return GS25_PRODUCT_IMAGES.tteokbokki;
  }
  if (name.includes('참치마요')) {
    return GS25_PRODUCT_IMAGES.samgakTuna;
  }
  if (name.includes('전주비빔') || name.includes('삼각김밥')) {
    return GS25_PRODUCT_IMAGES.samgakBibim;
  }
  if (name.includes('도시락') || name.includes('볶음밥') || name.includes('컵반') || name.includes('국밥')) {
    return GS25_PRODUCT_IMAGES.dosirakLunchbox;
  }
  if (name.includes('샌드위치') || name.includes('카스텔라') || name.includes('샌드')) {
    return GS25_PRODUCT_IMAGES.sandwich;
  }
  if (name.includes('요거트')) {
    return GS25_PRODUCT_IMAGES.greekYogurt;
  }
  if (name.includes('스트링치즈') || name.includes('치즈')) {
    return GS25_PRODUCT_IMAGES.stringCheese;
  }
  if (name.includes('훈제란') || name.includes('반숙란') || name.includes('계란')) {
    return GS25_PRODUCT_IMAGES.smokedEgg;
  }
  if (name.includes('소시지') || name.includes('후랑크') || name.includes('핫바')) {
    return GS25_PRODUCT_IMAGES.sausageHotbar;
  }
  if (name.includes('닭가슴살') || name.includes('오징어')) {
    return GS25_PRODUCT_IMAGES.chickenBreast;
  }
  if (name.includes('바나나')) {
    return GS25_PRODUCT_IMAGES.bananaMilk;
  }
  if (name.includes('레쓰비')) {
    return GS25_PRODUCT_IMAGES.letsbeCoffee;
  }
  if (name.includes('조지아') || name.includes('커피')) {
    return GS25_PRODUCT_IMAGES.georgiaCoffee;
  }
  if (name.includes('사이다') || name.includes('탄산수')) {
    return GS25_PRODUCT_IMAGES.chilsungCider;
  }
  if (name.includes('생수') || name.includes('꿀물')) {
    return GS25_PRODUCT_IMAGES.water500ml;
  }
  if (name.includes('허니버터칩')) {
    return GS25_PRODUCT_IMAGES.honeyButterChip;
  }
  if (name.includes('새우깡')) {
    return GS25_PRODUCT_IMAGES.saeukkang;
  }
  if (name.includes('초코파이') || name.includes('단팥빵')) {
    return GS25_PRODUCT_IMAGES.chocopie;
  }
  if (name.includes('초코바') || name.includes('초코') || name.includes('스낵')) {
    return GS25_PRODUCT_IMAGES.chocobar;
  }

  if (product.imageUrl) {
    return product.imageUrl;
  }

  if (product.category === '면류') {
    return GS25_PRODUCT_IMAGES.ramenCup;
  }
  if (product.category === '김밥/도시락') {
    return GS25_PRODUCT_IMAGES.kimbapRice;
  }
  if (product.category === '유제품/치즈' || product.category === '계란/간편식') {
    return GS25_PRODUCT_IMAGES.dairyEgg;
  }
  if (product.category === '육가공/안주') {
    return GS25_PRODUCT_IMAGES.chickenSausage;
  }
  if (product.category === '음료') {
    return GS25_PRODUCT_IMAGES.bananaMilk;
  }

  return GS25_PRODUCT_IMAGES.chocobar;
}
