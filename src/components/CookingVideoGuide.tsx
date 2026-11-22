import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Flame,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  SkipBack,
  SkipForward,
  Timer,
  Video,
} from 'lucide-react';
import type { RecipeStep } from '../types.ts';
import {
  buildCookingYouTubeSearchUrl,
  resolveStepVideo,
  type ProductMediaHint,
} from '../utils/recipeVideo.ts';

interface CookingVideoGuideProps {
  title: string;
  steps: RecipeStep[];
  products: ProductMediaHint[];
  prepNote: string;
  safetyNote: string;
  fallbackPoster?: string;
}

function playDoneChime() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.14);
      gain.gain.setValueAtTime(0.08, now + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.36);
    });
  } catch {
    // Audio playback optional if blocked by browser policy
  }
}

function formatSecondsMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function CookingVideoGuide({
  title,
  steps,
  products,
  prepNote,
  safetyNote,
  fallbackPoster,
}: CookingVideoGuideProps) {
  const resolvedSteps = useMemo(
    () => steps.map((s) => resolveStepVideo(s, products, fallbackPoster)),
    [steps, products, fallbackPoster],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => new Set());
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const safeIndex = Math.min(activeIndex, Math.max(0, resolvedSteps.length - 1));
  const currentStep = resolvedSteps[safeIndex];

  useEffect(() => {
    setActiveIndex(0);
    setCompletedSteps(new Set());
    setIsPlaying(false);
    setTimerRemaining(null);
    setTimerRunning(false);
    setTimerFinished(false);
  }, [title, steps.length]);

  useEffect(() => {
    if (!timerRunning || timerRemaining === null) return;
    if (timerRemaining <= 0) {
      setTimerRunning(false);
      setTimerFinished(true);
      playDoneChime();
      return;
    }
    const id = window.setTimeout(() => {
      setTimerRemaining((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [timerRunning, timerRemaining]);

  const selectStep = (index: number, shouldPlay = true) => {
    const bounded = Math.max(0, Math.min(resolvedSteps.length - 1, index));
    setActiveIndex(bounded);
    setTimerRemaining(null);
    setTimerRunning(false);
    setTimerFinished(false);
    if (shouldPlay) {
      setIsPlaying(true);
      window.setTimeout(() => {
        videoRef.current?.play().catch(() => {});
      }, 60);
    }
  };

  const handleTogglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const handleVideoEnded = () => {
    if (!currentStep) return;
    setCompletedSteps((prev) => new Set(prev).add(currentStep.step));
    if (autoAdvance && safeIndex < resolvedSteps.length - 1) {
      selectStep(safeIndex + 1, true);
    } else {
      setIsPlaying(false);
    }
  };

  const startStepTimer = (seconds: number) => {
    setTimerFinished(false);
    setTimerRemaining(seconds);
    setTimerRunning(true);
  };

  const youtubeSearchUrl = useMemo(
    () => buildCookingYouTubeSearchUrl(products.map((p) => p.name), title),
    [products, title],
  );

  if (!currentStep) return null;

  return (
    <div className="space-y-4">
      {/* Prep note */}
      <p className="text-xs text-[#4C453B] bg-[#FFF9EF] border border-[#EFE5D2] rounded-xl p-3">
        {prepNote}
      </p>

      {/* Main Step Video Stage */}
      <div className="rounded-2xl overflow-hidden border border-[#2D3831] bg-[#141A16] shadow-sm">
        {/* Video Top Toolbar */}
        <div className="px-3.5 py-2.5 bg-[#1B231E] border-b border-[#2C3730] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Video className="w-4 h-4 text-[#F49A24] shrink-0" />
            <span className="text-xs font-extrabold text-white whitespace-nowrap">
              STEP {currentStep.step} / {resolvedSteps.length}
            </span>
            <span className="text-xs text-[#D5CFC2] truncate">{currentStep.shortTitle}</span>
          </div>

          <button
            type="button"
            onClick={() => setAutoAdvance((prev) => !prev)}
            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors border ${
              autoAdvance
                ? 'bg-[#319447] border-[#3FA956] text-white'
                : 'bg-[#253029] border-[#3A483F] text-[#CFC8BA] hover:text-white'
            }`}
          >
            {autoAdvance ? '전체 연속 재생 ON' : '한 단계씩 재생'}
          </button>
        </div>

        {/* HTML5 Video Player */}
        <div className="relative aspect-video bg-[#111713]">
          <video
            ref={videoRef}
            key={currentStep.videoUrl}
            src={currentStep.videoUrl}
            poster={currentStep.posterUrl}
            controls
            playsInline
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain bg-[#111713]"
          >
            브라우저가 동영상 재생을 지원하지 않습니다.
          </video>
        </div>

        {/* Synchronized Caption & Quick Player Controls */}
        <div className="p-3.5 sm:p-4 bg-[#18201B] border-t border-[#2B362E] space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#319447] text-white font-num font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              {currentStep.step}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#B7B0A2]">
                <span className="font-bold text-[#8BE29C]">
                  {currentStep.matchedProductName
                    ? `${currentStep.matchedProductName} 조리 가이드`
                    : `STEP ${currentStep.step} 조리 안내`}
                </span>
                <span className="font-num">
                  {currentStep.minutes > 0 ? `예상 약 ${currentStep.minutes}분` : '마무리 단계'}
                </span>
              </div>
              <p className="text-sm font-medium text-white leading-relaxed">
                {currentStep.instruction}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => selectStep(safeIndex - 1, true)}
                disabled={safeIndex === 0}
                className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#253029] hover:bg-[#303E35] disabled:opacity-40 text-xs font-bold text-white inline-flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
              >
                <SkipBack className="w-3.5 h-3.5" />
                <span>이전</span>
              </button>

              <button
                type="button"
                onClick={handleTogglePlay}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#319447] hover:bg-[#287D3B] text-xs font-bold text-white inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? '일시정지' : '영상 재생'}</span>
              </button>

              <button
                type="button"
                onClick={() => selectStep(safeIndex + 1, true)}
                disabled={safeIndex >= resolvedSteps.length - 1}
                className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#253029] hover:bg-[#303E35] disabled:opacity-40 text-xs font-bold text-white inline-flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
              >
                <span>다음</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {currentStep.timerSeconds && (
              <div className="flex items-center gap-1.5">
                {timerRemaining === null ? (
                  <button
                    type="button"
                    onClick={() => startStepTimer(currentStep.timerSeconds!)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#F49A24] hover:bg-[#DF8816] text-[#1D1508] text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Timer className="w-3.5 h-3.5" />
                    <span>{currentStep.timerLabel || '조리 타이머 시작'}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-[#253029] border border-[#F49A24]/60 rounded-xl px-2.5 py-1">
                    <Timer className="w-3.5 h-3.5 text-[#FFD65A]" />
                    <span
                      className={`font-num text-xs font-extrabold tabular-nums ${
                        timerFinished ? 'text-[#8BE29C]' : 'text-[#FFD65A]'
                      }`}
                    >
                      {timerFinished ? '완료!' : formatSecondsMMSS(timerRemaining)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTimerRunning((prev) => !prev)}
                      disabled={timerFinished}
                      className="text-[11px] font-bold text-white/90 hover:text-white px-1.5 py-0.5 rounded bg-white/10 disabled:opacity-40 cursor-pointer"
                    >
                      {timerRunning ? '멈춤' : '계속'}
                    </button>
                    <button
                      type="button"
                      aria-label="타이머 초기화"
                      onClick={() => {
                        setTimerRemaining(null);
                        setTimerRunning(false);
                        setTimerFinished(false);
                      }}
                      className="text-white/75 hover:text-white p-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Synchronized Step Selector List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#6B6355]">
          <span className="font-bold text-[#252525] inline-flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-[#F49A24]" />
            <span>단계를 누르면 해당 조리 영상으로 바로 이동합니다</span>
          </span>
          <a
            href={youtubeSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-[#319447] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>유튜브 레시피 더보기</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <ol className="space-y-2">
          {resolvedSteps.map((step, idx) => {
            const isActive = idx === safeIndex;
            const isDone = completedSteps.has(step.step);
            return (
              <li key={step.step}>
                <button
                  type="button"
                  onClick={() => selectStep(idx, true)}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#F2FBF4] border-[#319447] shadow-xs'
                      : 'bg-[#FFFDF9] border-[#EAE0CC] hover:border-[#CBBFA8]'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg font-num font-bold text-xs flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-[#319447] text-white'
                        : isDone
                          ? 'bg-[#DFF3E3] text-[#226631]'
                          : 'bg-[#EFE5D2] text-[#5C5549]'
                    }`}
                  >
                    {isDone && !isActive ? <CheckCircle2 className="w-4 h-4" /> : step.step}
                  </div>

                  <img
                    src={step.posterUrl}
                    alt={step.shortTitle}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-xl object-contain bg-white p-0.5 border border-[#EFE5D2] shrink-0"
                  />

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`font-bold truncate ${
                          isActive ? 'text-[#226631]' : 'text-[#252525]'
                        }`}
                      >
                        STEP {step.step} · {step.shortTitle}
                      </span>
                      <span className="text-[11px] font-num text-[#6B6355] shrink-0">
                        {step.minutes > 0 ? `약 ${step.minutes}분` : '마무리'}
                      </span>
                    </div>
                    <p className="text-xs text-[#5C5549] line-clamp-2 leading-relaxed">
                      {step.instruction}
                    </p>
                  </div>

                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-[#319447] text-white'
                        : 'bg-[#F4EEE1] text-[#5C5549]'
                    }`}
                    aria-hidden="true"
                  >
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Safety Note */}
      <div className="p-3.5 rounded-2xl bg-[#FFF6E8] border border-[#F49A24]/40 flex items-start gap-2.5 text-xs text-[#66410B] leading-relaxed">
        <ShieldAlert className="w-4 h-4 text-[#F49A24] shrink-0 mt-0.5" />
        <p>{safetyNote}</p>
      </div>
    </div>
  );
}
