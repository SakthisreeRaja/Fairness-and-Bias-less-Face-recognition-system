import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ConfidenceRingProps {
  value: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  label?: string;
}

export function ConfidenceRing({
  value,
  size = 120,
  strokeWidth = 8,
  className,
  showLabel = true,
  label = 'Confidence',
}: ConfidenceRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedValue * circumference);

  useEffect(() => {
    // Animate the value
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const getColorClass = () => {
    if (value >= 0.8) return 'text-status-success';
    if (value >= 0.6) return 'text-primary';
    if (value >= 0.4) return 'text-status-warning';
    return 'text-status-danger';
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            'transition-all duration-1000 ease-out',
            getColorClass()
          )}
          style={{
            filter: 'drop-shadow(0 0 6px currentColor)',
          }}
        />
        
        {/* Gradient definition for glow effect */}
        <defs>
          <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--gradient-start))" />
            <stop offset="100%" stopColor="hsl(var(--gradient-end))" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-2xl font-bold', getColorClass())}>
          {Math.round(animatedValue * 100)}%
        </span>
        {showLabel && (
          <span className="text-xs text-muted-foreground mt-1">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
