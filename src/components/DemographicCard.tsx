import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DemographicCardProps {
  group: 'African' | 'Asian' | 'Caucasian' | 'Indian';
  distance: number;
  isHighlighted?: boolean;
  threshold?: number;
  className?: string;
}

const groupColors = {
  African: {
    bg: 'bg-demographic-african/10',
    border: 'border-demographic-african/30',
    text: 'text-demographic-african',
    glow: 'shadow-[0_0_20px_hsl(var(--demographic-african)/0.3)]',
  },
  Asian: {
    bg: 'bg-demographic-asian/10',
    border: 'border-demographic-asian/30',
    text: 'text-demographic-asian',
    glow: 'shadow-[0_0_20px_hsl(var(--demographic-asian)/0.3)]',
  },
  Caucasian: {
    bg: 'bg-demographic-caucasian/10',
    border: 'border-demographic-caucasian/30',
    text: 'text-demographic-caucasian',
    glow: 'shadow-[0_0_20px_hsl(var(--demographic-caucasian)/0.3)]',
  },
  Indian: {
    bg: 'bg-demographic-indian/10',
    border: 'border-demographic-indian/30',
    text: 'text-demographic-indian',
    glow: 'shadow-[0_0_20px_hsl(var(--demographic-indian)/0.3)]',
  },
};

export function DemographicCard({
  group,
  distance,
  isHighlighted = false,
  threshold = 0.68,
  className,
}: DemographicCardProps) {
  const colors = groupColors[group];
  const isAboveThreshold = distance >= threshold;

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-300 border-2',
      colors.bg,
      colors.border,
      isHighlighted && [colors.glow, 'scale-105'],
      'hover:scale-[1.02]',
      className
    )}>
      <CardHeader className="pb-2">
        <CardTitle className={cn('text-lg font-semibold', colors.text)}>
          {group}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-3xl font-bold text-foreground">
              {distance.toFixed(3)}
            </p>
            <p className="text-xs text-muted-foreground">
              Cosine Distance
            </p>
          </div>
          
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isAboveThreshold ? 'bg-status-success' : 'bg-status-warning'
              )}
              style={{ width: `${Math.min(distance * 100, 100)}%` }}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              isAboveThreshold ? 'bg-status-success' : 'bg-status-warning'
            )} />
            <span className="text-xs text-muted-foreground">
              {isAboveThreshold ? 'Above' : 'Below'} threshold ({threshold})
            </span>
          </div>
        </div>
      </CardContent>
      
      {isHighlighted && (
        <div className="absolute top-2 right-2">
          <span className={cn(
            'px-2 py-1 text-xs font-medium rounded-full',
            colors.bg,
            colors.text
          )}>
            Closest Match
          </span>
        </div>
      )}
    </Card>
  );
}
