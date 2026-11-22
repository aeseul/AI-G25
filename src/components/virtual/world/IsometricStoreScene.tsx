import React from 'react';
import {
  VIRTUAL_STORE_ZONES,
  type StoreZoneId,
} from '../../../data/virtualStoreWorldData.ts';
import StoreHotspot from './StoreHotspot.tsx';
import StoreCharacter from './StoreCharacter.tsx';

interface IsometricStoreSceneProps {
  storeName: string;
  selectedZone: StoreZoneId | null;
  cartItemCount: number;
  characterPos: { x: number; y: number };
  characterTip: string | null;
  onSelectZone: (zone: StoreZoneId) => void;
  onClickCharacter: () => void;
  onClearSelection: () => void;
}

export default function IsometricStoreScene({
  storeName,
  selectedZone,
  cartItemCount,
  characterPos,
  characterTip,
  onSelectZone,
  onClickCharacter,
  onClearSelection,
}: IsometricStoreSceneProps) {
  const isFridgeOpen = selectedZone === 'fridge';

  return (
    <div className="relative bg-white border border-[#EAE0CC] rounded-3xl p-2 sm:p-4 shadow-xs overflow-hidden">
      {/* Subtle World Watermark Header inside Scene */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2 text-[11px] text-[#6B6355]">
        <span className="font-bold text-[#319447]">
          2.5D 가상 편의점 내부 · 진열대와 오브젝트를 직접 클릭해 보세요
        </span>
        <span className="hidden sm:inline">
          GS25 (가상) · {storeName} · DEMO
        </span>
      </div>

      <svg
        viewBox="0 0 900 545"
        className="w-full h-auto select-none block rounded-2xl bg-[#FFF9EF]"
        role="group"
        aria-label="가상 GS25 편의점 아이소메트릭 내부 지도"
        onClick={onClearSelection}
      >
        <defs>
          <pattern id="isoTilePattern" width="44" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M 22 0 L 44 12 L 22 24 L 0 12 Z"
              fill="#FFFDF9"
              stroke="#EFE5D2"
              strokeWidth="1"
            />
          </pattern>
          <linearGradient id="fridgeGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D7F4FF" />
            <stop offset="100%" stopColor="#AEE6FA" />
          </linearGradient>
        </defs>

        {/* Soft Pastel Room Backdrop */}
        <rect x="0" y="0" width="900" height="545" fill="#FBF5E9" rx="18" />

        {/* Diorama Floor Slab Base (2.5D thickness) */}
        <polygon points="96,302 450,504 450,522 96,320" fill="#E3D5BC" />
        <polygon points="450,504 804,302 804,320 450,522" fill="#D5C4A6" />

        {/* Main Isometric Floor */}
        <polygon
          points="450,124 804,302 450,504 96,302"
          fill="url(#isoTilePattern)"
          stroke="#DDD0B8"
          strokeWidth="2"
        />

        {/* Subtle Mint Center Aisle Carpet */}
        <polygon
          points="450,210 618,302 450,398 282,302"
          fill="#EBF8EF"
          fillOpacity="0.65"
          stroke="#CBEAD4"
          strokeWidth="1.5"
        />

        {/* Back-Left Wall */}
        <polygon
          points="96,204 450,26 450,124 96,302"
          fill="#FFFDF9"
          stroke="#DDD0B8"
          strokeWidth="2"
        />
        {/* Back-Left GS25 Green & Blue Trim */}
        <polygon points="96,204 450,26 450,42 96,220" fill="#319447" />
        <polygon points="96,220 450,42 450,49 96,227" fill="#007CFF" />

        {/* Back-Right Wall */}
        <polygon
          points="450,26 804,204 804,302 450,124"
          fill="#F9F3E6"
          stroke="#DDD0B8"
          strokeWidth="2"
        />
        {/* Back-Right GS25 Green & Blue Trim */}
        <polygon points="450,26 804,204 804,220 450,42" fill="#28803C" />
        <polygon points="450,42 804,220 804,227 450,49" fill="#006CE0" />

        {/* Cute Wall Clock & Signboard near Apex */}
        <g transform="translate(495, 76)">
          <circle cx="0" cy="0" r="14" fill="#FFFFFF" stroke="#319447" strokeWidth="2.5" />
          <line x1="0" y1="0" x2="0" y2="-7" stroke="#252525" strokeWidth="2" strokeLinecap="round" />
          <line x1="0" y1="0" x2="6" y2="2" stroke="#F49A24" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* 1. Beverage Fridge (Back-Left Wall) */}
        <StoreHotspot
          ariaLabel={VIRTUAL_STORE_ZONES.fridge.ariaLabel}
          label="음료 냉장고"
          badgeText="1+1"
          badgeColor="#007CFF"
          labelPos={{ x: 240, y: 108 }}
          hitPoints="170,136 300,72 320,174 190,242"
          isSelected={selectedZone === 'fridge'}
          onSelect={() => onSelectZone('fridge')}
        >
          {/* Cooler Side & Frame */}
          <polygon points="175,142 296,81 312,89 191,150" fill="#2E86DE" />
          <polygon points="175,142 191,150 191,238 175,230" fill="#1F6AB8" />
          {/* Front Glass Box */}
          <polygon
            points="191,150 312,89 312,179 191,238"
            fill="url(#fridgeGlow)"
            stroke="#2E86DE"
            strokeWidth="2.5"
          />
          {/* Shelves inside Cooler */}
          <line x1="196" y1="176" x2="306" y2="121" stroke="#7CC6E8" strokeWidth="2" />
          <line x1="196" y1="206" x2="306" y2="151" stroke="#7CC6E8" strokeWidth="2" />
          {/* Banana Milk (Yellow) & Water (Blue) Bottles */}
          <rect x="206" y="152" width="11" height="15" rx="3" fill="#FFD65A" />
          <rect x="224" y="143" width="11" height="15" rx="3" fill="#FFD65A" />
          <rect x="242" y="134" width="11" height="15" rx="3" fill="#FFD65A" />
          <rect x="266" y="120" width="10" height="17" rx="3" fill="#4BA3FF" />
          <rect x="284" y="111" width="10" height="17" rx="3" fill="#4BA3FF" />
          <rect x="206" y="182" width="11" height="15" rx="3" fill="#FF9E44" />
          <rect x="226" y="172" width="11" height="15" rx="3" fill="#6BCB77" />
          <rect x="246" y="162" width="11" height="15" rx="3" fill="#4BA3FF" />
          <rect x="268" y="151" width="11" height="15" rx="3" fill="#FFD65A" />
          {/* Door Center Divider (slides slightly when selected) */}
          <line
            x1={isFridgeOpen ? 266 : 252}
            y1={isFridgeOpen ? 112 : 119}
            x2={isFridgeOpen ? 266 : 252}
            y2={isFridgeOpen ? 202 : 208}
            stroke="#FFFFFF"
            strokeWidth="3"
          />
        </StoreHotspot>

        {/* 2. Chilled Dairy & Eggs (Back Center-Left) */}
        <StoreHotspot
          ariaLabel={VIRTUAL_STORE_ZONES.dairy.ariaLabel}
          label="유제품·계란"
          labelPos={{ x: 400, y: 74 }}
          hitPoints="332,68 446,112 446,184 332,148"
          isSelected={selectedZone === 'dairy'}
          onSelect={() => onSelectZone('dairy')}
        >
          {/* Open Refrigerated Case */}
          <polygon points="336,78 442,118 442,158 336,118" fill="#E3F7F0" stroke="#319447" strokeWidth="2" />
          <polygon points="336,118 442,158 442,178 336,138" fill="#319447" />
          <polygon points="336,78 358,68 448,104 442,118" fill="#B9EBD6" />
          {/* String Cheese & Eggs */}
          <rect x="352" y="102" width="16" height="10" rx="3" fill="#FFF4B8" stroke="#EAB82D" />
          <rect x="374" y="110" width="16" height="10" rx="3" fill="#FFF4B8" stroke="#EAB82D" />
          <ellipse cx="406" cy="126" rx="8" ry="6" fill="#D99B66" />
          <ellipse cx="424" cy="133" rx="8" ry="6" fill="#D99B66" />
        </StoreHotspot>

        {/* 3. Promo Corner 1+1 / 2+1 (Back-Right Wall) */}
        <StoreHotspot
          ariaLabel={VIRTUAL_STORE_ZONES.promo.ariaLabel}
          label="1+1 행사"
          badgeText="SALE"
          badgeColor="#F49A24"
          labelPos={{ x: 598, y: 108 }}
          hitPoints="526,88 660,148 660,238 526,180"
          isSelected={selectedZone === 'promo'}
          onSelect={() => onSelectZone('promo')}
        >
          {/* Yellow & Orange Promo Display Rack */}
          <polygon points="534,104 650,162 650,224 534,166" fill="#FFF3CE" stroke="#F49A24" strokeWidth="2.5" />
          <polygon points="534,88 650,146 650,166 534,108" fill="#F49A24" />
          <text
            x="592"
            y="132"
            textAnchor="middle"
            fontSize="11"
            fontWeight="900"
            fill="#FFFFFF"
            transform="rotate(26, 592, 132)"
          >
            1+1 · 2+1
          </text>
          {/* Promo Products */}
          <rect x="550" y="138" width="14" height="18" rx="3" fill="#FFD65A" stroke="#D98218" />
          <rect x="572" y="148" width="14" height="18" rx="3" fill="#FFD65A" stroke="#D98218" />
          <rect x="598" y="160" width="18" height="14" rx="3" fill="#6D4C41" />
          <rect x="622" y="172" width="18" height="14" rx="3" fill="#6D4C41" />
          <rect x="552" y="172" width="18" height="13" rx="3" fill="#FF8A3D" />
          <rect x="582" y="186" width="18" height="13" rx="3" fill="#319447" />
        </StoreHotspot>

        {/* 4. Ramen & Ready-Meal Shelf (Mid-Left) */}
        <StoreHotspot
          ariaLabel={VIRTUAL_STORE_ZONES.ramen.ariaLabel}
          label="라면·간편식"
          badgeText="인기"
          badgeColor="#E85D2C"
          labelPos={{ x: 185, y: 214 }}
          hitPoints="118,228 242,174 282,250 156,312"
          isSelected={selectedZone === 'ramen'}
          onSelect={() => onSelectZone('ramen')}
        >
          {/* Ramen Gondola Body */}
          <polygon points="128,236 240,180 264,192 152,248" fill="#FFE6C7" stroke="#E85D2C" strokeWidth="2" />
          <polygon points="152,248 264,192 264,256 152,312" fill="#FFFDF9" stroke="#E85D2C" strokeWidth="2" />
          <polygon points="128,236 152,248 152,312 128,300" fill="#E85D2C" />
          {/* Shelf Lines & Cup Noodles / Kimbap */}
          <line x1="154" y1="274" x2="262" y2="220" stroke="#F49A24" strokeWidth="2" />
          {/* Cup Noodles */}
          <polygon points="164,244 178,237 176,256 166,261" fill="#D9381E" />
          <polygon points="186,233 200,226 198,245 188,250" fill="#E85D2C" />
          <polygon points="208,222 222,215 220,234 210,239" fill="#FF9E44" />
          {/* Triangle Kimbaps */}
          <polygon points="170,286 180,270 188,280" fill="#252525" />
          <polygon points="194,274 204,258 212,268" fill="#319447" />
          <polygon points="218,262 228,246 236,256" fill="#E85D2C" />
        </StoreHotspot>

        {/* 5. Central Gondola Shelves A & B (Snacks & Quick Items) */}
        <StoreHotspot
          ariaLabel={VIRTUAL_STORE_ZONES.snacks.ariaLabel}
          label="중앙 진열대"
          labelPos={{ x: 438, y: 196 }}
          hitPoints="332,258 456,204 552,256 428,316"
          isSelected={selectedZone === 'snacks'}
          onSelect={() => onSelectZone('snacks')}
        >
          {/* Gondola A */}
          <polygon points="348,248 430,206 456,220 374,262" fill="#FFF4D1" stroke="#D98218" strokeWidth="2" />
          <polygon points="374,262 456,220 456,268 374,310" fill="#FFFDF9" stroke="#D98218" strokeWidth="2" />
          <polygon points="348,248 374,262 374,310 348,296" fill="#F49A24" />
          {/* Snack Packages on Gondola A */}
          <rect x="386" y="252" width="14" height="12" rx="3" fill="#6D4C41" />
          <rect x="408" y="241" width="14" height="12" rx="3" fill="#FFD65A" />
          <rect x="430" y="230" width="14" height="12" rx="3" fill="#319447" />

          {/* Gondola B */}
          <polygon points="432,276 514,234 540,248 458,290" fill="#E9F8EE" stroke="#319447" strokeWidth="2" />
          <polygon points="458,290 540,248 540,296 458,338" fill="#FFFDF9" stroke="#319447" strokeWidth="2" />
          <polygon points="432,276 458,290 458,338 432,324" fill="#319447" />
          {/* Items on Gondola B */}
          <rect x="470" y="280" width="14" height="12" rx="3" fill="#FF9E44" />
          <rect x="492" y="269" width="14" height="12" rx="3" fill="#007CFF" />
          <rect x="514" y="258" width="14" height="12" rx="3" fill="#FFD65A" />
        </StoreHotspot>

        {/* 6. Microwave & Hot Water Corner (Mid-Right Wall) */}
        <StoreHotspot
          ariaLabel={VIRTUAL_STORE_ZONES.microwave.ariaLabel}
          label="전자레인지·온수"
          labelPos={{ x: 702, y: 196 }}
          hitPoints="632,216 762,218 762,312 632,302"
          isSelected={selectedZone === 'microwave'}
          onSelect={() => onSelectZone('microwave')}
        >
          {/* Prep Counter */}
          <polygon points="642,248 744,296 744,328 642,280" fill="#F2E7D3" stroke="#CBB99B" strokeWidth="2" />
          <polygon points="642,248 674,232 776,280 744,296" fill="#FFFDF9" stroke="#CBB99B" strokeWidth="2" />
          {/* Microwave Box */}
          <polygon points="656,222 702,244 702,272 656,250" fill="#FFFFFF" stroke="#756D60" strokeWidth="2" />
          <polygon points="656,222 674,213 720,235 702,244" fill="#EFE8DA" stroke="#756D60" strokeWidth="1.5" />
          {/* Glowing Microwave Window */}
          <polygon points="662,230 688,242 688,260 662,248" fill="#FFD65A" stroke="#F49A24" strokeWidth="1.5" />
          {/* Hot Water Dispenser */}
          <polygon points="714,242 742,256 742,286 714,272" fill="#D5DEE5" stroke="#5C6B78" strokeWidth="2" />
          <circle cx="728" cy="264" r="4" fill="#E85D2C" />
        </StoreHotspot>

        {/* 7. Entrance & Automatic Sliding Doors (Front-Left) */}
        <StoreHotspot
          ariaLabel={VIRTUAL_STORE_ZONES.entrance.ariaLabel}
          label="입구 · 자동문"
          labelPos={{ x: 204, y: 446 }}
          hitPoints="134,326 286,396 286,440 134,370"
          isSelected={selectedZone === 'entrance'}
          onSelect={() => onSelectZone('entrance')}
        >
          {/* Welcome Mat */}
          <polygon points="184,334 268,378 232,398 148,354" fill="#319447" />
          <text
            x="208"
            y="372"
            textAnchor="middle"
            fontSize="10"
            fontWeight="900"
            fill="#FFFFFF"
            transform="rotate(27, 208, 372)"
          >
            GS25 OPEN
          </text>
          {/* Sliding Glass Door Frame */}
          <polygon
            points="154,300 264,358 264,380 154,322"
            fill="#BEE8F5"
            fillOpacity="0.65"
            stroke="#319447"
            strokeWidth="2.5"
          />
          <line x1="209" y1="329" x2="209" y2="351" stroke="#319447" strokeWidth="2.5" />
        </StoreHotspot>

        {/* 8. Shopping Basket (Front-Center) */}
        <StoreHotspot
          ariaLabel={VIRTUAL_STORE_ZONES.basket.ariaLabel}
          label="내 바구니"
          badgeText={cartItemCount > 0 ? `${cartItemCount}개` : undefined}
          badgeColor="#F49A24"
          labelPos={{ x: 432, y: 468 }}
          hitPoints="382,398 482,398 482,452 382,452"
          isSelected={selectedZone === 'basket'}
          onSelect={() => onSelectZone('basket')}
        >
          <ellipse cx="432" cy="434" rx="28" ry="12" fill="#252525" opacity="0.12" />
          {/* Cute Basket */}
          <polygon points="406,408 458,408 450,434 414,434" fill="#319447" stroke="#257336" strokeWidth="2" />
          <rect x="403" y="402" width="58" height="8" rx="4" fill="#F49A24" />
          {/* Mini items visible inside basket when non-empty */}
          {cartItemCount > 0 && (
            <g>
              <rect x="415" y="392" width="11" height="12" rx="2" fill="#FFD65A" stroke="#252525" strokeWidth="1" />
              <rect x="431" y="390" width="12" height="14" rx="2" fill="#E85D2C" stroke="#252525" strokeWidth="1" />
            </g>
          )}
        </StoreHotspot>

        {/* 9. Checkout Counter (Front-Right) */}
        <StoreHotspot
          ariaLabel={VIRTUAL_STORE_ZONES.checkout.ariaLabel}
          label="계산대"
          badgeText="정산"
          badgeColor="#319447"
          labelPos={{ x: 650, y: 448 }}
          hitPoints="546,356 692,306 724,384 578,434"
          isSelected={selectedZone === 'checkout'}
          onSelect={() => onSelectZone('checkout')}
        >
          {/* L-Counter */}
          <polygon points="554,368 666,312 698,328 586,384" fill="#FFFDF9" stroke="#319447" strokeWidth="2.5" />
          <polygon points="586,384 698,328 698,368 586,424" fill="#319447" />
          <polygon points="554,368 586,384 586,424 554,408" fill="#257336" />
          {/* POS Monitor */}
          <polygon points="616,324 646,310 646,336 616,350" fill="#252525" stroke="#FFFFFF" strokeWidth="1.5" />
          <polygon points="620,327 642,316 642,333 620,344" fill="#5CE1E6" />
          {/* Scanner & Card Pad */}
          <rect x="590" y="352" width="14" height="10" rx="2" fill="#FFD65A" />
          <rect x="660" y="324" width="14" height="9" rx="2" fill="#007CFF" />
        </StoreHotspot>

        {/* 10. Original Mini Explorer Character */}
        <StoreCharacter
          x={characterPos.x}
          y={characterPos.y}
          tipText={characterTip}
          onClickCharacter={onClickCharacter}
        />
      </svg>

      {/* Accessible Quick Zone Jump Strip (Mobile 4x2 Grid & Tablet/Desktop Row) */}
      <div className="pt-2.5 px-1 grid grid-cols-4 sm:flex sm:flex-wrap items-center gap-1.5">
        {(
          [
            'ramen',
            'fridge',
            'dairy',
            'promo',
            'snacks',
            'microwave',
            'basket',
            'checkout',
          ] as StoreZoneId[]
        ).map((zoneId) => {
          const meta = VIRTUAL_STORE_ZONES[zoneId];
          const active = selectedZone === zoneId;
          return (
            <button
              key={zoneId}
              type="button"
              onClick={() => onSelectZone(zoneId)}
              className={`min-h-[36px] px-2 sm:px-3 py-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer truncate ${
                active
                  ? 'bg-[#319447] border-[#319447] text-white'
                  : 'bg-[#FFFDF9] border-[#E5DAC4] text-[#4C453B] hover:border-[#319447]'
              }`}
            >
              {meta.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
