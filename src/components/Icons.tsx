import React from 'react';
import type { WeaponId } from '../game/types';

export function WeaponSvg({ id, className = 'w-6 h-6' }: { id: WeaponId; className?: string }) {
  if (id === 'rod') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path
          d="M4 20L19 5M19 5L20 4M17.5 6.5L19.5 8.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M6.5 17.5L9.5 14.5"
          stroke="#f59e0b"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (id === 'chain') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <rect
          x="3"
          y="13"
          width="7"
          height="4.5"
          rx="2.2"
          transform="rotate(-45 3 13)"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect
          x="8.5"
          y="7.5"
          width="7"
          height="4.5"
          rx="2.2"
          transform="rotate(-45 8.5 7.5)"
          stroke="#f59e0b"
          strokeWidth="2"
        />
        <rect
          x="14"
          y="2"
          width="7"
          height="4.5"
          rx="2.2"
          transform="rotate(-45 14 2)"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }
  if (id === 'ball') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path
          d="M4 20L11 13"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="2.5 2.5"
        />
        <circle cx="15.5" cy="8.5" r="5" fill="#52525b" stroke="currentColor" strokeWidth="2" />
        <path d="M15.5 2V3.8M22 8.5H20.2M19.8 4.2L18.5 5.5" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  // Brick
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M3 9L12 5L21 9V15L12 19L3 15V9Z"
        fill="#b45309"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M3 9L12 13L21 9M12 13V19" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function RoadRushLogoSvg({ className = 'w-80' }: { className?: string }) {
  return (
    <svg viewBox="0 0 460 112" className={className} fill="none" aria-label="Road Rush">
      <defs>
        <linearGradient id="rr-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e4e4e7" />
          <stop offset="100%" stopColor="#a1a1aa" />
        </linearGradient>
      </defs>
      {/* Asphalt speed bars */}
      <path d="M12 24H82L70 36H4L12 24Z" fill="#f59e0b" />
      <path d="M22 44H68L58 54H14L22 44Z" fill="#ef4444" />
      <path d="M8 64H52L44 72H2L8 64Z" fill="#f59e0b" opacity="0.7" />
      {/* Bold italicized emblem lettering */}
      <text
        x="86"
        y="62"
        fill="url(#rr-metal)"
        fontFamily="Chakra Petch, sans-serif"
        fontWeight="700"
        fontStyle="italic"
        fontSize="54"
        letterSpacing="2"
      >
        ROAD
      </text>
      <text
        x="246"
        y="62"
        fill="#f59e0b"
        fontFamily="Chakra Petch, sans-serif"
        fontWeight="700"
        fontStyle="italic"
        fontSize="54"
        letterSpacing="2"
      >
        RUSH
      </text>
      <path d="M82 74H430L422 82H74L82 74Z" fill="#ef4444" />
      <text
        x="84"
        y="100"
        fill="#d4d4d8"
        fontFamily="Plus Jakarta Sans, sans-serif"
        fontWeight="600"
        fontSize="12"
        letterSpacing="2.2"
      >
        FIVE CITIES · FIVE SEASONS · ELEVEN RIDERS
      </text>
    </svg>
  );
}
