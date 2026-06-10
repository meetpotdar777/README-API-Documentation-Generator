import React from "react";

export function BrandLogo({ className = "w-10 h-10" }: { className?: string }) {
  const code = 101; // Deterministic gradient code
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 128 128" 
      className={`${className} select-none`}
      aria-label="DocuCraft Logo"
    >
      <defs>
        {/* Dynamic gradient matching tech themes */}
        <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" /> {/* Indigo */}
          <stop offset="40%" stopColor="#4f46e5" /> {/* Deep Indigo */}
          <stop offset="100%" stopColor="#06b6d4" /> {/* Cyan */}
        </linearGradient>

        {/* Accent Glow gradient for the code slash */}
        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" /> {/* Purple */}
          <stop offset="100%" stopColor="#ec4899" /> {/* Pink */}
        </linearGradient>

        {/* Metallic glass fold gradient */}
        <linearGradient id="foldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.3" />
        </linearGradient>

        <filter id="glowShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
          <feOffset dx="0" dy="3" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* 1. Base squircle with smooth professional curvature and tech gradient */}
      <rect width="128" height="128" rx="28" fill="url(#brandGrad)" />
      
      {/* 2. Abstract background circuit nodes representing integration and generation */}
      <circle cx="28" cy="28" r="16" fill="#ffffff" fillOpacity="0.05" />
      <line x1="28" y1="28" x2="48" y2="48" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="2" />
      <circle cx="100" cy="100" r="22" fill="#000000" fillOpacity="0.1" />
      <circle cx="110" cy="40" r="12" fill="#ffffff" fillOpacity="0.04" />
      
      {/* 3. The Documentation Sheet (Docu) */}
      {/* Main sheet container with rounded corners and clean off-white fill */}
      <path 
        d="M38 34 H78 L94 50 V94 C94 97.3 91.3 100 88 100 H38 C34.7 100 32 97.3 32 94 V40 C32 36.7 34.7 34 38 34 Z" 
        fill="#f8fafc" 
        filter="url(#glowShadow)" 
      />
      
      {/* Top right folded corner */}
      <path 
        d="M78 34 V46 C78 48.2 79.8 50 82 50 H94 Z" 
        fill="url(#foldGrad)" 
      />
      
      {/* 4. Structured Document Details (Representing README sections) */}
      {/* Title block indicator */}
      <rect x="42" y="44" width="24" height="5" rx="1.5" fill="#a5b4fc" />
      
      {/* Regular text lines */}
      <rect x="42" y="55" width="44" height="2.5" rx="1" fill="#cbd5e1" />
      <rect x="42" y="62" width="44" height="2.5" rx="1" fill="#cbd5e1" />
      <rect x="42" y="69" width="34" height="2.5" rx="1" fill="#cbd5e1" />
      
      {/* 5. Glowing Interactive Crafting Emblem - overlapping code brackets (API/Docs Craft) */}
      <circle 
        cx="82" 
        cy="82" 
        r="24" 
        fill="#0f172a" 
        stroke="#ffffff" 
        strokeWidth="1.8" 
        filter="url(#glowShadow)" 
      />
      
      {/* Inner coding brackets & slash indicator </ > */}
      <g stroke="url(#accentGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Left bracket < */}
        <path d="M72 82 L77 78 M72 82 L77 86" />
        
        {/* Right bracket > */}
        <path d="M92 82 L87 78 M92 82 L87 86" />
        
        {/* Center slash / */}
        <path d="M84 76 L80 88" stroke="#38bdf8" />
      </g>
      
      {/* Miniature green status dot indicator to show 100% successful generation / online api */}
      <circle cx="94" cy="70" r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
    </svg>
  );
}
