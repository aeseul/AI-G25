import React from 'react';
import { Home, MapPin, Sparkles, Tag, User } from 'lucide-react';
import type { AppTab } from '../types.ts';

interface BottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  recommendationCount: number;
}

const NAV_ITEMS: Array<{
  id: AppTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'stores', label: '주변 매장', icon: MapPin },
  { id: 'recommend', label: 'AI 추천', icon: Sparkles },
  { id: 'promotions', label: '행사 상품', icon: Tag },
  { id: 'mypage', label: '마이페이지', icon: User },
];

export default function BottomNav({
  activeTab,
  onSelectTab,
  recommendationCount,
}: BottomNavProps) {
  return (
    <nav
      aria-label="하단 주요 메뉴"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EAE0CC] pb-safe"
    >
      <div className="max-w-3xl mx-auto grid grid-cols-5 items-center h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                isActive ? 'text-[#319447]' : 'text-[#756D60] hover:text-[#252525]'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.id === 'recommend' && recommendationCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#F49A24] text-white text-[10px] font-bold font-num flex items-center justify-center">
                    {recommendationCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] whitespace-nowrap ${
                  isActive ? 'font-bold text-[#319447]' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
