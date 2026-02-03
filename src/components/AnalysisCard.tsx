import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalysisCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  description?: string;
  className?: string;
  glowing?: boolean;
}

const statusColors = {
  success: 'text-status-success',
  warning: 'text-status-warning',
  danger: 'text-status-danger',
  neutral: 'text-foreground',
};

const statusBgColors = {
  success: 'bg-status-success/10',
  warning: 'bg-status-warning/10',
  danger: 'bg-status-danger/10',
  neutral: 'gradient-primary-soft',
};

export function AnalysisCard({
  title,
  value,
  icon,
  status = 'neutral',
  description,
  className,
  glowing = false,
}: AnalysisCardProps) {
  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-300',
      'glass card-glow',
      glowing && 'animate-pulse-glow',
      className
    )}>
      <div className="absolute inset-0 gradient-primary opacity-5" />
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        {icon && (
          <div className={cn(
            'p-3 rounded-xl',
            statusBgColors[status]
          )}>
            <div className={statusColors[status]}>
              {icon}
            </div>
          </div>
        )}
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', statusColors[status])}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
