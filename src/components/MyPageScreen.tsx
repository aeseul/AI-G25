import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Clock,
  Database,
  LogOut,
  MapPin,
  Save,
  ShieldCheck,
  Trash2,
  UserCog,
} from 'lucide-react';
import type { BrandId, SavedFavorite, UserProfile, VerifiedRecommendation } from '../types.ts';
import { firebaseProjectId } from '../firebase.ts';
import { formatKRW } from '../utils/pricing.ts';

interface MyPageScreenProps {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  firestoreSyncError: string | null;
  previewNickname: string | null;
  favorites: SavedFavorite[];
  history: VerifiedRecommendation[];
  onOpenRecipe: (combo: VerifiedRecommendation) => void;
  onRemoveFavorite: (id: string) => void;
  onUpdateProfile: (updates: {
    nickname: string;
    preferredBrand: BrandId;
    defaultBudget: number;
  }) => Promise<void>;
  onSignOut: () => void;
}

const BRAND_OPTIONS: { value: BrandId; label: string }[] = [
  { value: 'GS25', label: 'GS25 (1차 메인 지원)' },
  { value: 'CU', label: 'CU (확장 예정)' },
  { value: 'SEVEN_ELEVEN', label: '세븐일레븐 (확장 예정)' },
  { value: 'EMART24', label: '이마트24 (확장 예정)' },
];

export default function MyPageScreen({
  firebaseUser,
  userProfile,
  firestoreSyncError,
  previewNickname,
  favorites,
  history,
  onOpenRecipe,
  onRemoveFavorite,
  onUpdateProfile,
  onSignOut,
}: MyPageScreenProps) {
  const [nicknameInput, setNicknameInput] = useState(
    userProfile?.nickname || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || '',
  );
  const [preferredBrandInput, setPreferredBrandInput] = useState<BrandId>(
    userProfile?.preferredBrand || 'GS25',
  );
  const [budgetInput, setBudgetInput] = useState<string>(
    String(userProfile?.defaultBudget || 5000),
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (userProfile) {
      setNicknameInput(userProfile.nickname);
      setPreferredBrandInput(userProfile.preferredBrand);
      setBudgetInput(String(userProfile.defaultBudget));
    } else if (firebaseUser) {
      setNicknameInput(
        firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '편의점미식가',
      );
    }
  }, [userProfile, firebaseUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    const trimmedNickname = nicknameInput.trim();
    if (!trimmedNickname) {
      setProfileMessage({ type: 'error', text: '닉네임을 1자 이상 입력해 주세요.' });
      return;
    }
    const parsedBudget = Math.floor(Number(budgetInput.replaceAll(',', '').trim()) || 5000);
    if (parsedBudget < 1000 || parsedBudget > 1000000) {
      setProfileMessage({
        type: 'error',
        text: '기본 예산은 1,000원 ~ 1,000,000원 사이로 입력해 주세요.',
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      await onUpdateProfile({
        nickname: trimmedNickname.slice(0, 40),
        preferredBrand: preferredBrandInput,
        defaultBudget: parsedBudget,
      });
      setProfileMessage({
        type: 'success',
        text: '내 회원 정보가 Cloud Firestore에 저장되었습니다.',
      });
    } catch {
      setProfileMessage({
        type: 'error',
        text: 'Firestore에 저장하지 못했습니다. Firebase Console의 Firestore 보안 규칙을 확인해 주세요.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-5 pb-28 space-y-5 sm:space-y-6">
      {/* Profile / Session Card */}
      <section className="bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          {firebaseUser ? (
            <>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#319447]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Firebase 로그인됨 · Cloud Firestore 동기화 활성
                  {firebaseUser.emailVerified ? ' (이메일 인증됨)' : ''}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-[#252525] truncate">
                {userProfile?.nickname || firebaseUser.displayName || firebaseUser.email || '로그인 사용자'}
              </h1>
              <p className="text-xs text-[#6B6355] break-all">
                {firebaseUser.email ? `${firebaseUser.email} · ` : ''}
                UID: <span className="font-mono break-all">{firebaseUser.uid}</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-[#F49A24]">
                {previewNickname ? `${previewNickname} · ` : ''}비회원 체험 모드 (개발용 미리보기)
              </p>
              <h1 className="text-xl font-extrabold text-[#252525]">마이페이지 및 연동 상태</h1>
              <p className="text-xs text-[#6B6355]">
                비회원 상태에서는 찜한 조합과 기록이 현재 브라우저(localStorage)에 임시 저장됩니다.
              </p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="min-h-[44px] px-4 py-2 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF5EA] text-xs font-bold text-[#252525] inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{firebaseUser ? '로그아웃' : '로그인 화면으로 나가기'}</span>
        </button>
      </section>

      {/* Firestore Sync Error Notice (if manual project rules block writes) */}
      {firebaseUser && firestoreSyncError && (
        <section className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Firestore 권한 또는 연결 확인 필요 ({firebaseProjectId})</span>
          </div>
          <p className="leading-relaxed">{firestoreSyncError}</p>
          <a
            href={`https://console.firebase.google.com/project/${firebaseProjectId}/firestore/rules`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-bold underline text-red-900"
          >
            Firebase Console Firestore 규칙 설정 열기 →
          </a>
        </section>
      )}

      {/* Member's Own Profile Editor (Cloud Firestore users/{uid}) */}
      {firebaseUser && (
        <section className="bg-white border border-[#EAE0CC] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-[#319447]" />
              <div>
                <h2 className="text-base font-bold text-[#252525]">
                  내 회원 정보 (본인 전용 Cloud Firestore 문서)
                </h2>
                <p className="text-xs text-[#6B6355] break-all">
                  저장 경로: <span className="font-mono break-all">users/{firebaseUser.uid}</span>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="profile-nickname"
                className="block text-xs font-semibold text-[#4E483E] mb-1"
              >
                닉네임
              </label>
              <input
                id="profile-nickname"
                type="text"
                maxLength={40}
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#319447]"
              />
            </div>

            <div>
              <label
                htmlFor="profile-brand"
                className="block text-xs font-semibold text-[#4E483E] mb-1"
              >
                선호 편의점 브랜드
              </label>
              <select
                id="profile-brand"
                value={preferredBrandInput}
                onChange={(e) => setPreferredBrandInput(e.target.value as BrandId)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#319447]"
              >
                {BRAND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="profile-budget"
                className="block text-xs font-semibold text-[#4E483E] mb-1"
              >
                기본 한 끼 예산 (원)
              </label>
              <input
                id="profile-budget"
                type="number"
                min={1000}
                max={1000000}
                step={500}
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] text-sm font-num text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#319447]"
              />
            </div>

            <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-1">
              {profileMessage ? (
                <p
                  className={`text-xs font-semibold ${
                    profileMessage.type === 'success' ? 'text-[#319447]' : 'text-red-700'
                  }`}
                >
                  {profileMessage.text}
                </p>
              ) : (
                <span className="text-xs text-[#6B6355]">
                  로그인한 회원 본인만 자신의 문서를 조회·수정할 수 있습니다.
                </span>
              )}

              <button
                type="submit"
                disabled={isSavingProfile}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#319447] hover:bg-[#257336] disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingProfile ? '저장 중...' : '내 정보 저장'}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Integration Status Summary */}
      <section className="bg-white border border-[#EAE0CC] rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-[#252525]">외부 서비스 연동 현황</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#F2FBF4] border border-[#B7DEC0] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#319447]">
              <Database className="w-4 h-4" />
              <span>Firebase Auth & Firestore</span>
            </div>
            <p className="text-[#4B453A]">
              연결 완료 (프로젝트: {firebaseProjectId}). 회원 프로필과 찜·추천 기록을 본인 소유 보안 규칙으로 관리합니다.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#FFF9EF] border border-[#EFE5D2] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#252525]">
              <MapPin className="w-4 h-4 text-[#F49A24]" />
              <span>Google Maps Platform</span>
            </div>
            <p className="text-[#6B6355]">
              Google Maps 미연결 · 브라우저 실제 GPS 좌표 및 OpenStreetMap 주변 매장 거리 계산을 사용합니다.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#F2FBF4] border border-[#B7DEC0] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#319447]">
              <ShieldCheck className="w-4 h-4" />
              <span>Gemini AI & 예산 검증 엔진</span>
            </div>
            <p className="text-[#4B453A]">
              서버 API(`/api/recommendations`)에서 호출 및 애플리케이션 코드 기반 가격·예산 초과 검증을 수행합니다.
            </p>
          </div>
        </div>
      </section>

      {/* Favorites */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-[#319447]" />
          <h2 className="text-lg font-bold text-[#252525]">저장한 꿀조합 ({favorites.length})</h2>
        </div>

        {favorites.length === 0 ? (
          <div className="bg-white border border-dashed border-[#D8CCB4] rounded-2xl p-6 text-center text-sm text-[#6B6355]">
            아직 찜한 조합이 없습니다. AI 추천 결과 카드에서 북마크 아이콘을 눌러 저장해 보세요.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="bg-white border border-[#EAE0CC] rounded-2xl p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#6B6355]">
                    <span>
                      {fav.brand} · {fav.storeName}
                    </span>
                    <span className="font-num font-bold text-[#F49A24]">
                      {formatKRW(fav.recommendation.totalPrice)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#252525]">
                    {fav.recommendation.title}
                  </h3>
                  <p className="text-xs text-[#5C5549]">{fav.recommendation.description}</p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F0E7D6]">
                  <button
                    type="button"
                    onClick={() => onOpenRecipe(fav.recommendation)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#319447] text-white text-xs font-bold cursor-pointer"
                  >
                    레시피 · 체크리스트 열기
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveFavorite(fav.id)}
                    aria-label="저장 삭제"
                    className="min-w-[40px] min-h-[40px] rounded-xl text-[#8A8070] hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Recommendations */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#F49A24]" />
          <h2 className="text-lg font-bold text-[#252525]">최근 추천 기록 ({history.length})</h2>
        </div>

        {history.length === 0 ? (
          <div className="bg-white border border-dashed border-[#D8CCB4] rounded-2xl p-6 text-center text-sm text-[#6B6355]">
            최근 추천받은 조합 기록이 없습니다.
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenRecipe(item)}
                className="w-full text-left bg-white border border-[#EAE0CC] hover:border-[#319447] rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#252525] truncate">{item.title}</p>
                  <p className="text-xs text-[#6B6355] truncate">{item.description}</p>
                </div>
                <span className="font-num text-sm font-extrabold text-[#319447] shrink-0">
                  {formatKRW(item.totalPrice)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
