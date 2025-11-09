"use client";

import { useEffect, useRef, useState } from 'react';

interface LightBeamsProps {
  variant?: 'top' | 'bottom' | 'both';
  intensity?: 'subtle' | 'medium' | 'strong';
}

export function LightBeams({ variant = 'both', intensity = 'medium' }: LightBeamsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  const opacityMap = {
    subtle: 0.15,
    medium: 0.3,
    strong: 0.5,
  };

  const opacity = opacityMap[intensity];

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-32 md:h-48 lg:h-64 overflow-hidden pointer-events-none bg-black"
    >
      {/* Animated light beams radiating from center */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Central light source */}
        <div 
          className="absolute w-2 h-2 rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(236, 72, 153, 0.8) 50%, transparent 100%)',
            boxShadow: '0 0 40px rgba(236, 72, 153, 0.6), 0 0 80px rgba(251, 146, 60, 0.4)',
          }}
        />
        
        {/* Radiating beams - 12 beams in a circle */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30) - 90; // Start from top (gate opening)
          const beamIndex = i % 3;
          
          return (
            <div
              key={i}
              className="absolute origin-center"
              style={{
                transform: `rotate(${angle}deg)`,
                transformOrigin: 'center center',
                width: '2px',
                height: '400px',
                opacity: opacity,
                animation: `beam-glow-${beamIndex} ${3 + beamIndex * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `linear-gradient(to bottom, 
                    transparent 0%, 
                    rgba(236, 72, 153, 0.6) 20%,
                    rgba(251, 146, 60, 0.8) 50%,
                    rgba(236, 72, 153, 0.6) 80%,
                    transparent 100%
                  )`,
                  filter: 'blur(1px)',
                  boxShadow: '0 0 4px rgba(236, 72, 153, 0.5)',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Flowing light streams - horizontal waves */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => {
          const streamIndex = i % 2;
          return (
            <div
              key={i}
              className="absolute w-full h-px"
              style={{
                top: `${20 + i * 15}%`,
                opacity: opacity * 0.6,
                backgroundImage: `linear-gradient(to right,
                  transparent 0%,
                  rgba(236, 72, 153, 0.3) ${10 + i * 5}%,
                  rgba(251, 146, 60, 0.5) 50%,
                  rgba(236, 72, 153, 0.3) ${90 - i * 5}%,
                  transparent 100%
                )`,
                filter: 'blur(2px)',
                animation: `stream-flow-${streamIndex} ${4 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          );
        })}
      </div>

      {/* Gradient fade overlays */}
      {variant === 'both' || variant === 'top' ? (
        <div 
          className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.3) 100%)',
          }}
        />
      ) : null}
      {variant === 'both' || variant === 'bottom' ? (
        <div 
          className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, transparent 0%, rgba(0, 0, 0, 0.3) 100%)',
          }}
        />
      ) : null}
    </div>
  );
}
