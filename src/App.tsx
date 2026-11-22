import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { AlertTriangle, UtensilsCrossed } from 'lucide-react';
import { auth, firebaseProjectId } from './firebase.ts';
import {
  deleteFavoriteFromFirestore,
  ensureUserProfile,
  saveFavoriteToFirestore,
  saveRecommendationHistoryToFirestore,
  subscribeFavorites,
  subscribeRecommendationHistory,
  subscribeUserProfile,
  updateUserProfileInFirestore,
} from './services/firestoreService.ts';
import { BRAND_METADATA, SAMPLE_STORES } from './data/gs25SampleCatalog.ts';
import { AREA_PRESETS, calculateDistanceMeters, sortAndFilterStores } from './utils/geo.ts';
import type {
  AppTab,
  BrandId,
  FlavorTheme,
  MealSituation,
  PreferenceOption,
  RecommendationRequest,
  RecommendationResponse,
  SavedFavorite,
  Store,
  StoreWithDistance,
  UserProfile,
  VerifiedRecommendation,
} from './types.ts';
import LoginScreen from './components/LoginScreen.tsx';
import BottomNav from './components/BottomNav.tsx';
import HomeScreen from './components/HomeScreen.tsx';
import RecommendationsScreen from './components/RecommendationsScreen.tsx';
import RecipeChecklistScreen from './components/RecipeChecklistScreen.tsx';
import ExploreScreen from './components/ExploreScreen.tsx';
import MyPageScreen from './components/MyPageScreen.tsx';
import VirtualStoreShell from './components/virtual/VirtualStoreShell.tsx';
import MobileReceiptView from './components/virtual/MobileReceiptView.tsx';
import {
  decodeMobileReceiptPayload,
  type CompactMobileReceiptPayload,
} from './utils/mobileReceipt.ts';
import { apiUrl, getApiBaseUrl } from './utils/apiConfig.ts';
import {
  buildClientFallbackRecommendationResponse,
  fetchNearbyStoresClient,
  geocodeLocationClient,
} from './utils/staticFallback.ts';

const FAVORITES_STORAGE_KEY = 'cvs_curator_preview_favorites_v1';

function readInitialMobileReceipt(): CompactMobileReceiptPayload | null {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get('mobileReceipt');
  if (!param) return null;
  return decodeMobileReceiptPayload(param);
}

export default function App() {
  const [sharedMobileReceipt, setSharedMobileReceipt] =
    useState<CompactMobileReceiptPayload | null>(() => readInitialMobileReceipt());
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [firestoreSyncError, setFirestoreSyncError] = useState<string | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [previewNickname, setPreviewNickname] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [activeRecipeCombo, setActiveRecipeCombo] = useState<VerifiedRecommendation | null>(null);
  const [enteredVirtualStore, setEnteredVirtualStore] = useState<StoreWithDistance | null>(null);

  // Location & Store State
  const defaultArea = AREA_PRESETS[0];
  const [centerLat, setCenterLat] = useState<number>(defaultArea.lat);
  const [centerLng, setCenterLng] = useState<number>(defaultArea.lng);
  const [locationLabel, setLocationLabel] = useState<string>(defaultArea.label);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'denied' | 'error'>('idle');
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);
  const [gpsRequestSeq, setGpsRequestSeq] = useState<number>(0);
  const [radiusMeters, setRadiusMeters] = useState<number>(100);
  const [brandFilter, setBrandFilter] = useState<BrandId | 'ALL'>('ALL');
  const [liveStores, setLiveStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState<boolean>(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const hasAutoLocatedRef = useRef(false);

  // Recommendation Conditions
  const [budgetInput, setBudgetInput] = useState<string>('5000');
  const [selectedFlavors, setSelectedFlavors] = useState<FlavorTheme[]>(['매콤', '고소']);
  const [selectedSituation, setSelectedSituation] = useState<MealSituation>('한 끼 식사');
  const [selectedPreferences, setSelectedPreferences] = useState<PreferenceOption[]>([
    '3분 이내 조리',
  ]);

  // AI Results State
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastRequest, setLastRequest] = useState<RecommendationRequest | null>(null);
  const [recommendationResponse, setRecommendationResponse] =
    useState<RecommendationResponse | null>(null);
  const [localHistory, setLocalHistory] = useState<VerifiedRecommendation[]>([]);
  const [cloudHistory, setCloudHistory] = useState<VerifiedRecommendation[]>([]);

  // Local fallback favorites
  const [localFavorites, setLocalFavorites] = useState<SavedFavorite[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedFavorite[]) : [];
    } catch {
      return [];
    }
  });
  const [cloudFavorites, setCloudFavorites] = useState<SavedFavorite[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(localFavorites));
    } catch {
      // Ignore storage quota errors
    }
  }, [localFavorites]);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      setFirestoreSyncError(null);
      if (user) {
        setGuestMode(false);
        try {
          await ensureUserProfile(user);
        } catch (err) {
          console.error('Failed to ensure user profile:', err);
          setFirestoreSyncError(
            'Firestore에 회원 문서를 저장하지 못했습니다. Firebase Console → Firestore Database → 규칙에서 인증된 본인(request.auth.uid == userId) 읽기/쓰기를 허용했는지 확인해 주세요.',
          );
        }
      } else {
        setUserProfile(null);
        setCloudFavorites([]);
        setCloudHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore real-time listeners (whenever authReady and authenticated Firebase user exists)
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      return;
    }

    const handleSyncError = () => {
      setFirestoreSyncError(
        'Cloud Firestore 읽기/쓰기 권한이 거부되었습니다. Firebase Console → Firestore Database → 규칙에서 본인 문서 접근을 허용해 주세요.',
      );
    };

    const unsubProfile = subscribeUserProfile(firebaseUser, setUserProfile, handleSyncError);
    const unsubFavs = subscribeFavorites(firebaseUser, setCloudFavorites, handleSyncError);
    const unsubHist = subscribeRecommendationHistory(firebaseUser, setCloudHistory, handleSyncError);

    return () => {
      unsubProfile();
      unsubFavs();
      unsubHist();
    };
  }, [authReady, firebaseUser]);

  const useCloudPersistence = Boolean(firebaseUser);
  const favorites = useCloudPersistence ? cloudFavorites : localFavorites;
  const history = useCloudPersistence ? cloudHistory : localHistory;

  const combinedStores = useMemo(() => {
    const merged: Store[] = [...liveStores];
    for (const demo of SAMPLE_STORES) {
      const duplicateNearby = liveStores.some(
        (osm) =>
          osm.brand === demo.brand &&
          calculateDistanceMeters(osm.lat, osm.lng, demo.lat, demo.lng) <= 35,
      );
      if (!duplicateNearby) {
        merged.push(demo);
      }
    }
    return merged;
  }, [liveStores]);

  const nearbyStores = useMemo(() => {
    const filtered = sortAndFilterStores(combinedStores, centerLat, centerLng, radiusMeters);
    if (brandFilter === 'ALL') return filtered;
    return filtered.filter((s) => s.brand === brandFilter);
  }, [combinedStores, centerLat, centerLng, radiusMeters, brandFilter]);

  const closestOutsideStores = useMemo(() => {
    if (nearbyStores.length > 0) return [];
    const wider = sortAndFilterStores(combinedStores, centerLat, centerLng, 1000);
    const filtered = brandFilter === 'ALL' ? wider : wider.filter((s) => s.brand === brandFilter);
    return filtered.slice(0, 3);
  }, [nearbyStores.length, combinedStores, centerLat, centerLng, brandFilter]);

  const selectedStore: StoreWithDistance | null = useMemo(() => {
    if (nearbyStores.length === 0) return null;
    const found = nearbyStores.find((s) => s.storeId === selectedStoreId);
    if (found) return found;
    const preferredGs25 = nearbyStores.find((s) => s.brand === 'GS25');
    return preferredGs25 ?? nearbyStores[0];
  }, [nearbyStores, selectedStoreId]);

  // Fetch real nearby convenience stores whenever center coordinates or GPS trigger settle
  useEffect(() => {
    if (gpsStatus === 'loading') return;
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    setIsLoadingStores(true);

    fetch(apiUrl(`/api/stores/nearby?lat=${centerLat}&lng=${centerLng}`), {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.ok) {
          return (await res.json()) as {
            ok?: boolean;
            addressLabel?: string | null;
            stores?: Store[];
          };
        }
        return fetchNearbyStoresClient(centerLat, centerLng);
      })
      .catch(() => fetchNearbyStoresClient(centerLat, centerLng))
      .then(
        (
          data: {
            ok?: boolean;
            addressLabel?: string | null;
            stores?: Store[];
          } | null,
        ) => {
          if (cancelled) return;
          if (!data?.ok) {
            if (gpsStatus === 'success') {
              setGpsMessage(
                `현재 GPS 좌표(${centerLat.toFixed(4)}, ${centerLng.toFixed(
                  4,
                )})는 확인했으나 주변 매장 서버 응답을 받지 못했습니다. 잠시 후 다시 시도하거나 아래 지역 검색을 이용해 주세요.`,
              );
            }
            return;
          }

          const fetchedStores = Array.isArray(data.stores) ? data.stores : [];
          setLiveStores(fetchedStores);

          if (gpsStatus === 'success') {
            const resolvedLabel =
              data.addressLabel || `내 GPS 위치 (${centerLat.toFixed(4)}, ${centerLng.toFixed(4)})`;
            setLocationLabel(resolvedLabel);

            const within100Count = fetchedStores.filter(
              (s) => calculateDistanceMeters(centerLat, centerLng, s.lat, s.lng) <= 100,
            ).length;
            const within1kmCount = fetchedStores.filter(
              (s) => calculateDistanceMeters(centerLat, centerLng, s.lat, s.lng) <= 1000,
            ).length;

            setGpsMessage(
              within100Count > 0
                ? `현재 실제 위치(${resolvedLabel}) 반경 100m 내에서 편의점 ${within100Count}곳을 찾았습니다.`
                : within1kmCount > 0
                  ? `현재 실제 위치(${resolvedLabel}${
                      gpsAccuracyMeters ? `, 측정 오차 약 ±${gpsAccuracyMeters}m` : ''
                    })를 확인했습니다. 반경 100m 내 매장은 0곳이며, 1km 이내에 ${within1kmCount}곳이 있어 검색 반경을 300m 이상으로 넓혀 확인해 보세요.`
                  : `현재 실제 위치(${resolvedLabel}${
                      gpsAccuracyMeters ? `, 측정 오차 약 ±${gpsAccuracyMeters}m` : ''
                    })를 확인했습니다. 반경 100m 내 등록 매장이 없어 아래 테스트 지역 또는 수동 검색을 이용해 주세요.`,
            );
          }
        },
      )
      .catch(() => {
        if (!cancelled && gpsStatus === 'success') {
          setGpsMessage(
            `현재 GPS 좌표(${centerLat.toFixed(4)}, ${centerLng.toFixed(
              4,
            )})를 확인했으나 주변 매장 조회가 지연되고 있습니다. 잠시 후 다시 시도하거나 아래 지역 검색을 이용해 주세요.`,
          );
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (!cancelled) {
          setIsLoadingStores(false);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [centerLat, centerLng, gpsStatus, gpsAccuracyMeters, gpsRequestSeq]);

  const handleRequestGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsMessage('현재 브라우저는 GPS 위치 기능을 지원하지 않습니다. 아래 지역 검색을 이용해 주세요.');
      return;
    }

    setGpsStatus('loading');
    setGpsMessage('현재 실제 GPS 위치를 확인하는 중입니다...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Number.isFinite(position.coords.accuracy)
          ? Math.round(position.coords.accuracy)
          : null;
        setCenterLat(lat);
        setCenterLng(lng);
        setGpsAccuracyMeters(accuracy);
        setLocationLabel(`내 GPS 위치 (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setGpsStatus('success');
        setGpsRequestSeq((n) => n + 1);
        setGpsMessage(
          `현재 GPS 좌표(${lat.toFixed(4)}, ${lng.toFixed(4)}${
            accuracy ? `, 오차 약 ±${accuracy}m` : ''
          })를 확인해 반경 100m 주변 편의점을 검색 중입니다...`,
        );
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus('denied');
          setGpsMessage(
            '위치 권한이 거부되었습니다. 브라우저 주소창 왼쪽 아이콘에서 위치 권한을 허용하거나, 아래 실제 지역 검색을 이용해 주세요.',
          );
        } else {
          setGpsStatus('error');
          setGpsMessage(
            '현재 위치를 불러오지 못했습니다. 다시 시도하거나 아래 지역 검색을 이용해 주세요.',
          );
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 },
    );
  }, []);

  // Automatically request user's live GPS location once when entering the app
  useEffect(() => {
    if (!authReady) return;
    if (!firebaseUser && !guestMode) return;
    if (hasAutoLocatedRef.current) return;
    hasAutoLocatedRef.current = true;
    handleRequestGps();
  }, [authReady, firebaseUser, guestMode, handleRequestGps]);

  const handleSearchLocation = async (
    queryText: string,
  ): Promise<{ ok: boolean; message: string }> => {
    try {
      const res = await fetch(apiUrl(`/api/geocode?q=${encodeURIComponent(queryText)}`));
      const data = res.ok
        ? ((await res.json()) as {
            ok?: boolean;
            lat?: number;
            lng?: number;
            label?: string;
            fullAddress?: string;
            message?: string;
          })
        : await geocodeLocationClient(queryText);
      if (data.ok && typeof data.lat === 'number' && typeof data.lng === 'number') {
        setCenterLat(data.lat);
        setCenterLng(data.lng);
        setLocationLabel(data.label || queryText);
        setGpsAccuracyMeters(null);
        setGpsStatus('idle');
        setGpsMessage(null);
        return {
          ok: true,
          message: `"${data.fullAddress || data.label || queryText}" 위치로 이동해 실제 주변 편의점을 조회합니다.`,
        };
      }
    } catch {
      const clientData = await geocodeLocationClient(queryText);
      if (clientData.ok && typeof clientData.lat === 'number' && typeof clientData.lng === 'number') {
        setCenterLat(clientData.lat);
        setCenterLng(clientData.lng);
        setLocationLabel(clientData.label || queryText);
        setGpsAccuracyMeters(null);
        setGpsStatus('idle');
        setGpsMessage(null);
        return {
          ok: true,
          message: `"${clientData.fullAddress || clientData.label || queryText}" 위치로 이동해 주변 편의점을 조회합니다.`,
        };
      }
    }

    const matched = AREA_PRESETS.find(
      (preset) =>
        preset.label.includes(queryText) ||
        preset.description.includes(queryText) ||
        (queryText.includes('서경') && preset.id === 'seokyeong') ||
        (queryText.includes('강남') && preset.id === 'gangnam') ||
        (queryText.includes('홍대') && preset.id === 'hongdae') ||
        (queryText.includes('신촌') && preset.id === 'sinchon'),
    );
    if (matched) {
      setCenterLat(matched.lat);
      setCenterLng(matched.lng);
      setLocationLabel(matched.label);
      setGpsAccuracyMeters(null);
      setGpsStatus('idle');
      setGpsMessage(null);
      return {
        ok: true,
        message: `"${matched.label}" 기준 위치로 설정되었습니다.`,
      };
    }

    return {
      ok: false,
      message: '입력한 지역을 찾지 못했습니다. 도로명·역명(예: 잠실역, 정릉동)으로 다시 검색해 보세요.',
    };
  };

  const handleSelectPresetArea = (lat: number, lng: number, label: string) => {
    setCenterLat(lat);
    setCenterLng(lng);
    setLocationLabel(label);
    setGpsAccuracyMeters(null);
    setGpsStatus('idle');
    setGpsMessage(null);
  };

  const handleToggleFlavor = (flavor: FlavorTheme) => {
    setSelectedFlavors((prev) =>
      prev.includes(flavor) ? prev.filter((f) => f !== flavor) : [...prev, flavor],
    );
  };

  const handleTogglePreference = (pref: PreferenceOption) => {
    setSelectedPreferences((prev) => {
      const exists = prev.includes(pref);
      if (exists) return prev.filter((p) => p !== pref);
      if (pref === '행사 상품 제외') {
        return [
          ...prev.filter((p) => p !== '1+1 행사 상품 우선' && p !== '2+1 행사 상품 우선'),
          pref,
        ];
      }
      if (pref === '1+1 행사 상품 우선' || pref === '2+1 행사 상품 우선') {
        return [...prev.filter((p) => p !== '행사 상품 제외'), pref];
      }
      return [...prev, pref];
    });
  };

  const executeRecommendation = async (
    endpoint: '/api/recommendations' | '/api/recommendations/fallback',
  ) => {
    const store = selectedStore;
    const budget = Math.floor(Number(budgetInput.replaceAll(',', '').trim()) || 5000);
    if (!store) return;

    const payload: RecommendationRequest = {
      budget,
      flavors: selectedFlavors,
      mealSituation: selectedSituation,
      preferences: selectedPreferences,
      brand: store.brand,
      storeName: store.name,
      storeId: store.storeId,
    };

    setLastRequest(payload);
    setActiveRecipeCombo(null);
    setActiveTab('recommend');
    setIsGenerating(true);

    try {
      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const rawText = await res.text();
      let data: RecommendationResponse | null = null;
      try {
        data = JSON.parse(rawText) as RecommendationResponse;
      } catch {
        data = null;
      }

      if (!data && endpoint === '/api/recommendations/fallback') {
        data = buildClientFallbackRecommendationResponse(payload);
      }

      if (!data) {
        const isStaticMissingBackend = !getApiBaseUrl() && (res.status === 404 || res.status === 405);
        setRecommendationResponse({
          status: 'AI_ERROR',
          recommendations: [],
          excludedOverBudgetCount: 0,
          errorCode: isStaticMissingBackend ? 'STATIC_HOST_NO_BACKEND' : `HTTP_${res.status}`,
          message: isStaticMissingBackend
            ? '현재 정적 웹(GitHub Pages) 환경에서는 Gemini API 서버가 연결되어 있지 않습니다. 별도 백엔드(VITE_API_BASE_URL)를 연결하거나, 아래 「샘플 데이터 기반 기본 조합 보기」 버튼을 눌러 예산 검증된 꿀조합을 바로 이용해 주세요.'
            : `서버 응답을 해석하지 못했습니다(HTTP ${res.status}). 잠시 후 다시 시도하거나 아래 「샘플 데이터 기반 기본 조합 보기」를 이용해 주세요.`,
          generatedAt: new Date().toISOString(),
        });
        return;
      }

      setRecommendationResponse(data);
      if (data.recommendations && data.recommendations.length > 0) {
        if (useCloudPersistence && firebaseUser) {
          for (const combo of data.recommendations) {
            saveRecommendationHistoryToFirestore(
              firebaseUser,
              payload.brand,
              payload.storeName,
              combo,
            ).catch((err) => console.error('Failed to save history:', err));
          }
        } else {
          setLocalHistory((prev) => [...data.recommendations, ...prev].slice(0, 12));
        }
      }
    } catch {
      if (endpoint === '/api/recommendations/fallback') {
        const fallbackData = buildClientFallbackRecommendationResponse(payload);
        setRecommendationResponse(fallbackData);
        if (fallbackData.recommendations.length > 0) {
          if (useCloudPersistence && firebaseUser) {
            for (const combo of fallbackData.recommendations) {
              saveRecommendationHistoryToFirestore(
                firebaseUser,
                payload.brand,
                payload.storeName,
                combo,
              ).catch((err) => console.error('Failed to save history:', err));
            }
          } else {
            setLocalHistory((prev) => [...fallbackData.recommendations, ...prev].slice(0, 12));
          }
        }
      } else {
        setRecommendationResponse({
          status: 'AI_ERROR',
          recommendations: [],
          excludedOverBudgetCount: 0,
          errorCode: 'NETWORK_ERROR',
          message:
            '백엔드 서버와 연결되지 않았습니다. GitHub Pages 단독 배포 중이라면 아래 「샘플 데이터 기반 기본 조합 보기」 버튼을 눌러 바로 조합을 추천받으실 수 있습니다.',
          generatedAt: new Date().toISOString(),
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);

  const handleToggleFavorite = async (combo: VerifiedRecommendation) => {
    const exists = favorites.some((f) => f.id === combo.id);
    if (useCloudPersistence && firebaseUser) {
      if (exists) {
        await deleteFavoriteFromFirestore(firebaseUser, combo.id);
      } else {
        await saveFavoriteToFirestore(firebaseUser, {
          id: combo.id,
          savedAt: new Date().toISOString(),
          storeName: selectedStore?.name || lastRequest?.storeName || 'GS25 샘플 매장',
          brand: lastRequest?.brand || selectedStore?.brand || 'GS25',
          recommendation: combo,
        });
      }
      return;
    }

    setLocalFavorites((prev) => {
      if (prev.some((f) => f.id === combo.id)) {
        return prev.filter((f) => f.id !== combo.id);
      }
      return [
        {
          id: combo.id,
          savedAt: new Date().toISOString(),
          storeName: selectedStore?.name || lastRequest?.storeName || 'GS25 샘플 매장',
          brand: lastRequest?.brand || selectedStore?.brand || 'GS25',
          recommendation: combo,
        },
        ...prev,
      ];
    });
  };

  const handleRemoveFavorite = async (id: string) => {
    if (useCloudPersistence && firebaseUser) {
      await deleteFavoriteFromFirestore(firebaseUser, id);
      return;
    }
    setLocalFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpdateProfile = async (updates: {
    nickname: string;
    preferredBrand: BrandId;
    defaultBudget: number;
  }) => {
    if (!firebaseUser) return;
    await updateUserProfileInFirestore(firebaseUser, updates);
    setFirestoreSyncError(null);
    setBudgetInput(String(updates.defaultBudget));
  };

  const handleEnterVirtualStore = (store: StoreWithDistance) => {
    setSelectedStoreId(store.storeId);
    setActiveRecipeCombo(null);
    setEnteredVirtualStore(store);
  };

  const handleSignOut = async () => {
    setEnteredVirtualStore(null);
    setActiveRecipeCombo(null);
    setActiveTab('home');
    setGuestMode(false);
    setPreviewNickname(null);
    setFirestoreSyncError(null);
    if (firebaseUser) {
      await signOut(auth);
    }
  };

  if (sharedMobileReceipt) {
    return (
      <MobileReceiptView
        payload={sharedMobileReceipt}
        onEnterApp={() => {
          setSharedMobileReceipt(null);
          if (typeof window !== 'undefined' && window.history?.replaceState) {
            const url = new URL(window.location.href);
            url.searchParams.delete('mobileReceipt');
            window.history.replaceState({}, '', url.pathname + url.search + url.hash);
          }
        }}
      />
    );
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#FFF9EF] text-[#252525] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#319447] text-white flex items-center justify-center mx-auto">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-[#5C5549]">로그인 상태 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser && !guestMode) {
    return (
      <LoginScreen
        onEnterPreview={(nickname) => {
          setPreviewNickname(nickname || null);
          setGuestMode(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9EF] text-[#252525] flex flex-col">
      {/* Compact Top App Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EAE0CC]">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => {
              setEnteredVirtualStore(null);
              setActiveRecipeCombo(null);
              setActiveTab('home');
            }}
            className="flex items-center gap-2 text-left cursor-pointer min-w-0"
          >
            <div className="w-8 h-8 rounded-lg bg-[#319447] text-white flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-base font-extrabold tracking-tight text-[#252525] truncate">
              AI 편의점 꿀조합 큐레이터
            </span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3 text-xs text-[#6B6355] shrink-0 min-w-0">
            <span className="hidden md:inline truncate max-w-[220px]">
              {selectedStore
                ? `${BRAND_METADATA[selectedStore.brand].label} · ${selectedStore.name}`
                : '매장 미선택'}
            </span>
            {firebaseUser ? (
              <span className="font-semibold text-[#319447] truncate max-w-[100px] sm:max-w-[180px]">
                {userProfile?.nickname || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '회원'}
              </span>
            ) : (
              <span className="font-semibold text-[#F49A24] truncate max-w-[110px] sm:max-w-[180px]">
                {previewNickname ? `${previewNickname} · 체험` : '체험 모드'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Firestore Permission Notice Banner */}
      {firebaseUser && firestoreSyncError && (
        <div className="bg-red-50 border-b border-red-200 px-4 sm:px-6 py-2.5 text-xs text-red-900">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{firestoreSyncError}</span>
            </div>
            <a
              href={`https://console.firebase.google.com/project/${firebaseProjectId}/firestore/rules`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline text-red-900 shrink-0"
            >
              Firestore 규칙 설정 열기 →
            </a>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {enteredVirtualStore ? (
          <VirtualStoreShell
            selectedRealStore={enteredVirtualStore}
            budgetInput={budgetInput}
            onChangeBudgetInput={setBudgetInput}
            selectedFlavors={selectedFlavors}
            onToggleFlavor={handleToggleFlavor}
            selectedSituation={selectedSituation}
            onSelectSituation={setSelectedSituation}
            selectedPreferences={selectedPreferences}
            onTogglePreference={handleTogglePreference}
            onExitVirtualStore={() => setEnteredVirtualStore(null)}
          />
        ) : activeRecipeCombo ? (
          <RecipeChecklistScreen
            combo={activeRecipeCombo}
            storeName={selectedStore?.name || lastRequest?.storeName || null}
            budget={activeRecipeCombo.budget}
            isFavorite={favoriteIds.has(activeRecipeCombo.id)}
            onToggleFavorite={() => handleToggleFavorite(activeRecipeCombo)}
            onBack={() => setActiveRecipeCombo(null)}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeScreen
                centerLat={centerLat}
                centerLng={centerLng}
                locationLabel={locationLabel}
                gpsStatus={gpsStatus}
                gpsMessage={gpsMessage}
                gpsAccuracyMeters={gpsAccuracyMeters}
                isLoadingStores={isLoadingStores}
                onRequestGps={handleRequestGps}
                onSearchLocation={handleSearchLocation}
                onSelectPresetArea={handleSelectPresetArea}
                radiusMeters={radiusMeters}
                onChangeRadius={setRadiusMeters}
                brandFilter={brandFilter}
                onChangeBrandFilter={setBrandFilter}
                nearbyStores={nearbyStores}
                closestOutsideStores={closestOutsideStores}
                selectedStore={selectedStore}
                onSelectStore={(store) => setSelectedStoreId(store.storeId)}
                onEnterVirtualStore={handleEnterVirtualStore}
                budgetInput={budgetInput}
                onChangeBudgetInput={setBudgetInput}
                selectedFlavors={selectedFlavors}
                onToggleFlavor={handleToggleFlavor}
                selectedSituation={selectedSituation}
                onSelectSituation={setSelectedSituation}
                selectedPreferences={selectedPreferences}
                onTogglePreference={handleTogglePreference}
                isGenerating={isGenerating}
                onRunRecommendation={() => executeRecommendation('/api/recommendations')}
              />
            )}

            {activeTab === 'recommend' && (
              <RecommendationsScreen
                lastRequest={lastRequest}
                response={recommendationResponse}
                isLoading={isGenerating}
                favoriteIds={favoriteIds}
                onBackToHome={() => setActiveTab('home')}
                onRetry={() => executeRecommendation('/api/recommendations')}
                onLoadFallback={() => executeRecommendation('/api/recommendations/fallback')}
                onSelectRecipe={(combo) => setActiveRecipeCombo(combo)}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {(activeTab === 'stores' || activeTab === 'promotions') && (
              <ExploreScreen
                key={activeTab}
                initialSection={activeTab === 'stores' ? 'stores' : 'promotions'}
                centerLat={centerLat}
                centerLng={centerLng}
                locationLabel={locationLabel}
                radiusMeters={radiusMeters}
                onChangeRadius={setRadiusMeters}
                brandFilter={brandFilter}
                onChangeBrandFilter={setBrandFilter}
                nearbyStores={nearbyStores}
                selectedStore={selectedStore}
                onSelectStore={(store) => setSelectedStoreId(store.storeId)}
                onEnterVirtualStore={handleEnterVirtualStore}
              />
            )}

            {activeTab === 'mypage' && (
              <MyPageScreen
                firebaseUser={firebaseUser}
                userProfile={userProfile}
                firestoreSyncError={firestoreSyncError}
                previewNickname={previewNickname}
                favorites={favorites}
                history={history}
                onOpenRecipe={(combo) => setActiveRecipeCombo(combo)}
                onRemoveFavorite={handleRemoveFavorite}
                onUpdateProfile={handleUpdateProfile}
                onSignOut={handleSignOut}
              />
            )}
          </>
        )}
      </main>

      {!enteredVirtualStore && (
        <BottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveRecipeCombo(null);
            setActiveTab(tab);
          }}
          recommendationCount={recommendationResponse?.recommendations.length ?? 0}
        />
      )}
    </div>
  );
}
