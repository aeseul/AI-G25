import type { Store, StoreWithDistance } from '../types.ts';

export interface AreaPreset {
  id: string;
  label: string;
  description: string;
  lat: number;
  lng: number;
}

export const AREA_PRESETS: AreaPreset[] = [
  {
    id: 'seokyeong',
    label: '성북구 서경대 앞',
    description: '서울 성북구 서경로 일대 (샘플 테스트 기준지)',
    lat: 37.6148,
    lng: 127.0127,
  },
  {
    id: 'gangnam',
    label: '강남역 2번 출구',
    description: '서울 강남구 강남대로 일대',
    lat: 37.4979,
    lng: 127.0276,
  },
  {
    id: 'hongdae',
    label: '홍대입구역 9번 출구',
    description: '서울 마포구 양화로 일대',
    lat: 37.5568,
    lng: 126.9239,
  },
  {
    id: 'sinchon',
    label: '신촌역 3번 출구',
    description: '서울 서대문구 연세로 일대',
    lat: 37.5556,
    lng: 126.9369,
  },
];

export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function sortAndFilterStores(
  stores: Store[],
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
): StoreWithDistance[] {
  return stores
    .map((store) => ({
      ...store,
      distanceMeters: calculateDistanceMeters(centerLat, centerLng, store.lat, store.lng),
    }))
    .filter((store) => store.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
