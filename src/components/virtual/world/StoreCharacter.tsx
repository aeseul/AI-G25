import React from 'react';

interface StoreCharacterProps {
  x: number;
  y: number;
  tipText: string | null;
  onClickCharacter: () => void;
}

export default function StoreCharacter({
  x,
  y,
  tipText,
  onClickCharacter,
}: StoreCharacterProps) {
  // Clamp speech bubble horizontally inside SVG viewport (0..900)
  const bubbleWidth = 250;
  const bubbleX = -bubbleWidth / 2;
  const clampedOffset =
    x < 145 ? 145 - x : x > 755 ? 755 - x : 0;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label="매장 안내 캐릭터 클릭하여 팁 보기"
      onClick={(e) => {
        e.stopPropagation();
        onClickCharacter();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onClickCharacter();
        }
      }}
      className="cursor-pointer focus:outline-none motion-safe-transition"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Ground shadow */}
      <ellipse cx="0" cy="14" rx="18" ry="7" fill="#252525" opacity="0.16" />

      {/* Animated Chibi Avatar */}
      <g className="character-bob">
        {/* Shoes */}
        <ellipse cx="-6" cy="11" rx="5.5" ry="3.2" fill="#252525" />
        <ellipse cx="6" cy="11" rx="5.5" ry="3.2" fill="#252525" />

        {/* Pants / Lower body */}
        <rect x="-10" y="-4" width="20" height="14" rx="5" fill="#3B4D63" />

        {/* GS25-style Green Vest / Apron Body */}
        <rect
          x="-13"
          y="-26"
          width="26"
          height="24"
          rx="8"
          fill="#319447"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
        {/* Apron Pocket Accent */}
        <rect x="-6" y="-14" width="12" height="7" rx="2.5" fill="#FFD65A" />

        {/* Small Green Shopping Basket held on side */}
        <rect x="11" y="-13" width="12" height="10" rx="3" fill="#F49A24" stroke="#FFFFFF" strokeWidth="1" />

        {/* Head */}
        <circle cx="0" cy="-39" r="14" fill="#FFE0C2" stroke="#D9A882" strokeWidth="1.2" />

        {/* Cute Retro Cap */}
        <path d="M -14 -42 C -14 -56, 14 -56, 14 -42 Z" fill="#007CFF" />
        <rect x="-16" y="-44" width="24" height="5" rx="2.5" fill="#319447" />
        <circle cx="0" cy="-49" r="3" fill="#FFD65A" />

        {/* Friendly Eyes & Blush */}
        <circle cx="-4.5" cy="-37" r="1.8" fill="#252525" />
        <circle cx="4.5" cy="-37" r="1.8" fill="#252525" />
        <circle cx="-8" cy="-34" r="2.2" fill="#FF9B85" opacity="0.55" />
        <circle cx="8" cy="-34" r="2.2" fill="#FF9B85" opacity="0.55" />
        <path
          d="M -3 -33 Q 0 -30 3 -33"
          fill="none"
          stroke="#252525"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>

      {/* Speech Bubble */}
      {tipText && (
        <g transform={`translate(${clampedOffset}, -66)`}>
          <rect
            x={bubbleX}
            y="-52"
            width={bubbleWidth}
            height="48"
            rx="14"
            fill="#FFFFFF"
            stroke="#319447"
            strokeWidth="2.2"
          />
          <polygon
            points={`${-clampedOffset - 6},-4 ${-clampedOffset + 6},-4 ${-clampedOffset},4`}
            fill="#FFFFFF"
            stroke="#319447"
            strokeWidth="2"
          />
          <rect x={bubbleX + 2} y="-8" width={bubbleWidth - 4} height="5" fill="#FFFFFF" />
          <foreignObject x={bubbleX + 10} y="-48" width={bubbleWidth - 20} height="40">
            <div className="w-full h-full flex items-center justify-center text-center text-[11.5px] leading-tight font-bold text-[#252525]">
              {tipText}
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
}
