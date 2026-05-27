import React from 'react';
import clsx from 'clsx';

interface PigLogoProps {
  className?: string;
  animate?: boolean;
}

export default function PigLogo({ className, animate = false }: PigLogoProps) {
  return (
    <div className={clsx(animate && "animate-pig-bounce", "origin-bottom")}>
      <svg 
        viewBox="0 0 100 100" 
        className={className} 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left Ear */}
        <path d="M 30 40 L 12 18 L 45 25 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        
        {/* Right Ear */}
        <path d="M 70 40 L 88 18 L 55 25 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        
        {/* Head */}
        <circle cx="50" cy="55" r="35" fill="currentColor" />
        
        {/* Snout */}
        <ellipse cx="50" cy="65" rx="16" ry="11" fill="#0a2e36" />
        
        {/* Nostrils */}
        <circle cx="44" cy="65" r="2.5" fill="currentColor" />
        <circle cx="56" cy="65" r="2.5" fill="currentColor" />
        
        {/* Eyes */}
        <circle cx="34" cy="45" r="4.5" fill="#0a2e36" />
        <circle cx="66" cy="45" r="4.5" fill="#0a2e36" />
        
        {/* Eye sparkles for cuteness */}
        <circle cx="32" cy="43" r="1.5" fill="currentColor" />
        <circle cx="64" cy="43" r="1.5" fill="currentColor" />
        
        {/* Blush */}
        <ellipse cx="23" cy="55" rx="4" ry="2" fill="#0a2e36" opacity="0.3" />
        <ellipse cx="77" cy="55" rx="4" ry="2" fill="#0a2e36" opacity="0.3" />
      </svg>
    </div>
  );
}
