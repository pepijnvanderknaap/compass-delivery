'use client';

import { useEffect, useRef, useState } from 'react';

interface HoverNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export default function HoverNumberInput({
  value,
  onChange,
  min = 0,
  max = 9999,
  className = ''
}: HoverNumberInputProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [hoverY, setHoverY] = useState(0);
  const [tempValue, setTempValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const startCounter = (direction: 'up' | 'down', speed: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setTempValue(prev => {
        const step = Math.max(1, Math.floor(speed / 50));
        const newValue = direction === 'up' ? prev + step : prev - step;
        return Math.max(min, Math.min(max, newValue));
      });
    }, 50);
  };

  const stopCounter = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const mouseY = e.clientY;
    const distance = centerY - mouseY; // Positive = above center, Negative = below center

    setHoverY(distance);

    // Only count if mouse is significantly away from center (dead zone in middle)
    const threshold = 10;
    if (Math.abs(distance) < threshold) {
      stopCounter();
      return;
    }

    // Calculate speed based on distance from center
    const speed = Math.abs(distance);

    if (distance > threshold) {
      // Mouse above center - count up
      startCounter('up', speed);
    } else if (distance < -threshold) {
      // Mouse below center - count down
      startCounter('down', speed);
    }
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    stopCounter();
    onChange(tempValue);
  };

  const handleClick = () => {
    onChange(tempValue);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`relative w-20 h-10 flex items-center justify-center cursor-pointer select-none transition-all ${
        isHovering ? 'bg-blue-50 border-2 border-blue-300' : 'bg-white border border-black/10'
      } rounded-lg ${className}`}
    >
      <span className={`text-sm font-medium ${isHovering ? 'text-blue-900' : 'text-black/60'}`}>
        {tempValue}
      </span>

      {isHovering && (
        <>
          {/* Up indicator */}
          {hoverY > 10 && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-blue-600 text-xs font-medium animate-pulse">
              ↑
            </div>
          )}

          {/* Down indicator */}
          {hoverY < -10 && (
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-blue-600 text-xs font-medium animate-pulse">
              ↓
            </div>
          )}
        </>
      )}
    </div>
  );
}
