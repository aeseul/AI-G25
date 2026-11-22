import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Info,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  UtensilsCrossed,
} from 'lucide-react';
import { auth, firebaseProjectId, googleProvider } from '../firebase.ts';
import { ensureUserProfile } from '../services/firestoreService.ts';
import { resolveAssetPath } from '../utils/assetPath.ts';

interface LoginScreenProps {
  onEnterPreview: (nickname?: string) => void;
}

type AuthMode = 'login' | 'signup' | 'reset';

function mapFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code)
      : '';

  switch (code) {
    case 'auth/operation-not-allowed':
      return `이메일/비밀번호 로그인이 Firebase 콘솔에서 아직 활성화되지 않았습니다. Firebase Console(${firebaseProjectId}) → Authentication → Sign-in method에서 '이메일/비밀번호'를 사용 설정해 주세요. (Google 로그인은 바로 사용 가능합니다.)`;
    case 'auth/email-already-in-use':
      return '이미 가입된 이메일 주소입니다. 로그인 탭에서 로그인해 주세요.';
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않습니다.';
    case 'auth/weak-password':
      return '비밀번호는 6자 이상으로 설정해 주세요.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 'auth/popup-closed-by-user':
      return 'Google 로그인 창이 닫혔습니다. 다시 시도해 주세요.';
    case 'auth/popup-blocked':
      return '브라우저에서 로그인 팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.';
    case 'auth/too-many-requests':
      return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    default: {
      const msg = error instanceof Error ? error.message : String(error);
      return `인증 처리 중 오류가 발생했습니다. (${code || msg})`;
    }
  }
}

export default function LoginScreen({ onEnterPreview }: LoginScreenProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'info' | 'error' | 'success';
    message: string;
    showConsoleLink?: boolean;
  } | null>(null);
  const [showFirebaseGuide, setShowFirebaseGuide] = useState(false);

  const handleSelectMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFeedback(null);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (authMode === 'signup' && nickname.trim().length < 2) {
      setFeedback({ type: 'error', message: '닉네임은 2자 이상 입력해 주세요.' });
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setFeedback({ type: 'error', message: '올바른 이메일 주소를 입력해 주세요.' });
      return;
    }

    if (authMode !== 'reset' && password.length < 6) {
      setFeedback({ type: 'error', message: '비밀번호는 6자 이상 입력해 주세요.' });
      return;
    }

    if (authMode === 'signup' && password !== confirmPassword) {
      setFeedback({ type: 'error', message: '비밀번호 확인이 일치하지 않습니다.' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const trimmedNickname = nickname.trim().slice(0, 40);
        if (trimmedNickname) {
          await updateProfile(credential.user, { displayName: trimmedNickname });
        }
        try {
          await ensureUserProfile(credential.user, trimmedNickname);
        } catch (profileErr) {
          console.error('Failed to initialize Firestore profile on signup:', profileErr);
        }
        try {
          await sendEmailVerification(credential.user);
        } catch {
          // Non-fatal if verification email fails to send immediately
        }
        // onAuthStateChanged in App.tsx transitions into the app automatically
        return;
      }

      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        return;
      }

      await sendPasswordResetEmail(auth, email.trim());
      setFeedback({
        type: 'success',
        message: '비밀번호 재설정 안내 메일을 발송했습니다. 받은 편지함을 확인해 주세요.',
      });
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: string }).code)
          : '';
      setFeedback({
        type: 'error',
        message: mapFirebaseAuthError(error),
        showConsoleLink: code === 'auth/operation-not-allowed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setFeedback(null);
    setIsSubmitting(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged in App.tsx will navigate into the app
    } catch (error) {
      setFeedback({
        type: 'error',
        message: mapFirebaseAuthError(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitButtonText =
    authMode === 'login'
      ? isSubmitting
        ? '로그인 중...'
        : '이메일로 로그인'
      : authMode === 'signup'
        ? isSubmitting
          ? '회원가입 처리 중...'
          : '이메일로 회원가입'
        : isSubmitting
          ? '메일 전송 중...'
          : '비밀번호 재설정 메일 보내기';

  const modeHeading =
    authMode === 'login'
      ? '계정 로그인'
      : authMode === 'signup'
        ? '새 계정 회원가입'
        : '비밀번호 재설정';

  return (
    <div className="min-h-screen bg-[#FFF9EF] text-[#252525] flex flex-col">
      {/* Firebase Connection Status Bar */}
      <div className="w-full border-b border-[#E8DEC8] bg-[#FFFDF8]">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 text-[11px] sm:text-xs text-[#595246]">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#319447] shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">Firebase Auth · Firestore 연결됨</span>
              <span className="hidden sm:inline">
                Firebase Authentication · Firestore 연결됨 ({firebaseProjectId})
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowFirebaseGuide((prev) => !prev)}
            className="text-[#319447] font-semibold hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{showFirebaseGuide ? '닫기' : '연결 안내'}</span>
          </button>
        </div>
        {showFirebaseGuide && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-3 text-xs text-[#4B453A] leading-relaxed space-y-1">
            <p>
              Google 로그인은 즉시 사용 가능하며, 로그인 시 Firebase Console → Authentication → 사용자 목록에 계정이 등록됩니다. 이메일/비밀번호 회원가입을 사용하려면 Firebase Console({firebaseProjectId}) → Authentication → Sign-in method에서 &lsquo;이메일/비밀번호&rsquo; 제공업체를 사용 설정해 주세요.
            </p>
            <a
              href={`https://console.firebase.google.com/project/${firebaseProjectId}/authentication/providers`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-semibold text-[#319447] underline"
            >
              Firebase Console Sign-in method 바로가기
            </a>
          </div>
        )}
      </div>

      {/* Compact Smartphone Brand Header (shows immediately above login on mobile) */}
      <div className="md:hidden max-w-6xl w-full mx-auto px-3.5 pt-4 pb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#319447] text-white flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold tracking-tight text-[#252525] truncate">
              AI 편의점 꿀조합 큐레이터
            </h1>
            <p className="text-[11px] font-semibold text-[#319447] truncate">
              5,000원으로 즐기는 최고의 한 끼
            </p>
          </div>
        </div>
      </div>

      {/* Main Split Content (Mobile: Auth first; Tablet/Desktop: Hero + Auth side by side) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-3 sm:py-6 md:py-8 lg:py-10 grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 lg:gap-8 items-stretch">
        {/* Left Editorial Hero */}
        <section className="order-2 md:order-1 md:col-span-5 lg:col-span-6 flex flex-col justify-between bg-white border border-[#EAE0CC] rounded-3xl overflow-hidden shadow-sm">
          <div className="p-5 sm:p-6 lg:p-8 space-y-4">
            <div className="hidden md:flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#319447] text-white flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#319447]">GS25 우선 지원 · 1차 MVP</p>
                <h1 className="text-lg font-extrabold tracking-tight text-[#252525] truncate">
                  AI 편의점 꿀조합 큐레이터
                </h1>
              </div>
            </div>

            <div className="md:pt-2 space-y-2.5">
              <h2 className="text-[1.45rem] sm:text-3xl lg:text-[2.1rem] font-extrabold tracking-tight leading-[1.28] text-[#252525] break-keep">
                <span className="block">5,000원으로 즐기는</span>
                <span className="block text-[#0074CC]">최고의 한 끼</span>
              </h2>
              <div className="text-xs sm:text-sm lg:text-[15px] text-[#5C5549] leading-relaxed break-keep space-y-0.5">
                <p>내 주변 GS25에서 찾는 나만의 꿀조합.</p>
                <p>예산 계산부터 행사 검증, 3분 컷 레시피까지 한 번에 확인하세요.</p>
              </div>
            </div>

            <div className="pt-1 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3 gap-2.5 text-xs text-[#453F36] break-keep">
              <div className="bg-[#FFFDF8] border border-[#EAE0CC] rounded-xl p-3.5 space-y-1.5">
                <p className="font-bold text-[#319447] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>예산 100% 준수</span>
                </p>
                <p className="text-[11.5px] text-[#5C5549] leading-relaxed">
                  <span className="block">가격·할인 자동 검증</span>
                  <span className="block">예산 초과 조합 제외</span>
                </p>
              </div>
              <div className="bg-[#FFFDF8] border border-[#EAE0CC] rounded-xl p-3.5 space-y-1.5">
                <p className="font-bold text-[#F49A24] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>100m 주변 탐색</span>
                </p>
                <p className="text-[11.5px] text-[#5C5549] leading-relaxed">
                  <span className="block">GPS 위치 거리 계산</span>
                  <span className="block">반경 내 매장 바로 탐색</span>
                </p>
              </div>
              <div className="bg-[#FFFDF8] border border-[#EAE0CC] rounded-xl p-3.5 space-y-1.5">
                <p className="font-bold text-[#252525] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>3분 컷 레시피</span>
                </p>
                <p className="text-[11.5px] text-[#5C5549] leading-relaxed">
                  <span className="block">전자레인지·온수 기준</span>
                  <span className="block">단계별 조리 가이드</span>
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#EAE0CC] bg-white px-6 py-7 sm:py-8 lg:py-10 flex flex-col items-center justify-center text-center space-y-4">
            <img
              src={resolveAssetPath('/assets/aistudio/image_596359bd.png')}
              alt="GS25 공식 로고"
              className="h-16 sm:h-20 lg:h-24 w-auto object-contain select-none"
            />
            <div className="space-y-1 break-keep">
              <p className="text-xs sm:text-sm font-bold text-[#0074CC]">
                5,000원의 선택을 더 쉽고, 맛있게
              </p>
              <p className="text-xs sm:text-sm font-medium text-[#5C5549]">
                GS25 실제 상품 데이터 기반 AI 큐레이션
              </p>
            </div>
          </div>
        </section>

        {/* Right Auth & Preview Card */}
        <section className="order-1 md:order-2 md:col-span-7 lg:col-span-6 bg-white border border-[#EAE0CC] rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm flex flex-col justify-between">
          <div>
            {/* Mode Switcher */}
            <div
              role="tablist"
              aria-label="인증 방식 선택"
              className="grid grid-cols-3 gap-1 p-1 bg-[#F7F1E3] rounded-xl mb-4 sm:mb-5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'login'}
                onClick={() => handleSelectMode('login')}
                className={`min-h-[42px] px-1 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap truncate ${
                  authMode === 'login'
                    ? 'bg-white text-[#252525] shadow-sm'
                    : 'text-[#6A6256] hover:text-[#252525]'
                }`}
              >
                <span>로그인</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signup'}
                onClick={() => handleSelectMode('signup')}
                className={`min-h-[42px] px-1 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap truncate ${
                  authMode === 'signup'
                    ? 'bg-white text-[#252525] shadow-sm'
                    : 'text-[#6A6256] hover:text-[#252525]'
                }`}
              >
                <span>회원가입</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'reset'}
                onClick={() => handleSelectMode('reset')}
                className={`min-h-[42px] px-1 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap truncate ${
                  authMode === 'reset'
                    ? 'bg-white text-[#252525] shadow-sm'
                    : 'text-[#6A6256] hover:text-[#252525]'
                }`}
              >
                <span>비밀번호 찾기</span>
              </button>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-extrabold text-[#252525]">{modeHeading}</h3>
              <p className="text-xs text-[#6B6355] mt-0.5">
                {authMode === 'signup'
                  ? '새 계정을 만들면 Firebase Authentication 사용자에 등록됩니다.'
                  : authMode === 'reset'
                    ? '가입하신 이메일 주소를 입력하면 비밀번호 재설정 메일을 보내드립니다.'
                    : 'Google 계정 또는 이메일로 로그인해 찜한 꿀조합을 동기화하세요.'}
              </p>
            </div>

            {/* Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-[#DDD2BE] bg-white hover:bg-[#FAF6EC] disabled:opacity-60 text-sm font-semibold text-[#252525] flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              <span>Google 계정으로 계속하기</span>
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-[#887F70]">
              <div className="h-px flex-1 bg-[#EAE0CC]" />
              <span>또는 이메일로 계속하기</span>
              <div className="h-px flex-1 bg-[#EAE0CC]" />
            </div>

            {/* Keyed per-mode Form */}
            <form key={authMode} onSubmit={handleAuthSubmit} className="space-y-3.5" noValidate>
              {authMode === 'signup' && (
                <div>
                  <label
                    htmlFor="auth-nickname"
                    className="block text-xs font-semibold text-[#4E483E] mb-1.5"
                  >
                    닉네임
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-[#8A8070] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-nickname"
                      name="nickname"
                      type="text"
                      autoComplete="nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="예: 편의점미식가"
                      className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#319447]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor={`auth-email-${authMode}`}
                  className="block text-xs font-semibold text-[#4E483E] mb-1.5"
                >
                  이메일 주소
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8A8070] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id={`auth-email-${authMode}`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@university.ac.kr"
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#319447]"
                  />
                </div>
              </div>

              {authMode !== 'reset' && (
                <div>
                  <label
                    htmlFor={`auth-password-${authMode}`}
                    className="block text-xs font-semibold text-[#4E483E] mb-1.5"
                  >
                    비밀번호
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8A8070] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id={`auth-password-${authMode}`}
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6자 이상 입력"
                      className="w-full min-h-[46px] pl-10 pr-12 py-2.5 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#319447]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                      aria-pressed={showPassword}
                      title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-[#7D7465] hover:text-[#252525] hover:bg-[#F3ECE0] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'signup' && (
                <div>
                  <label
                    htmlFor="auth-password-confirm"
                    className="block text-xs font-semibold text-[#4E483E] mb-1.5"
                  >
                    비밀번호 확인
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8A8070] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-password-confirm"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="비밀번호 재입력"
                      className="w-full min-h-[46px] pl-10 pr-12 py-2.5 rounded-xl border border-[#DDD2BE] bg-[#FFFDF9] text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#319447]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
                      aria-pressed={showConfirmPassword}
                      title={showConfirmPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-[#7D7465] hover:text-[#252525] hover:bg-[#F3ECE0] transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {feedback && (
                <div
                  role="alert"
                  className={`p-3.5 rounded-xl text-xs leading-relaxed border space-y-2 ${
                    feedback.type === 'error'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : feedback.type === 'success'
                        ? 'bg-[#F2FBF4] border-[#319447]/40 text-[#226631]'
                        : 'bg-[#FFF7E8] border-[#F49A24]/40 text-[#66410B]'
                  }`}
                >
                  <p>{feedback.message}</p>
                  {feedback.showConsoleLink && (
                    <a
                      href={`https://console.firebase.google.com/project/${firebaseProjectId}/authentication/providers`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block font-bold underline text-[#991B1B]"
                    >
                      Firebase Console에서 이메일/비밀번호 사용 설정하기 →
                    </a>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#252525] hover:bg-[#3A3A3A] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <span>{submitButtonText}</span>
              </button>
            </form>
          </div>

          {/* Primary Preview Mode CTA */}
          <div className="mt-6 pt-6 border-t border-[#EFE5D2] space-y-3">
            <div className="flex items-start gap-2 text-xs text-[#5B5449]">
              <CheckCircle2 className="w-4 h-4 text-[#319447] shrink-0 mt-0.5" />
              <span>
                로그인 없이도 비회원 체험 모드로 위치 탐색, 5,000원 예산 검증, Gemini AI 꿀조합 추천을 바로 테스트할 수 있습니다.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onEnterPreview(nickname.trim() || undefined)}
              className="w-full min-h-[52px] px-5 py-3.5 rounded-xl bg-[#319447] hover:bg-[#257336] text-white text-base font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>비회원 체험 모드로 시작하기</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
