import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ThemeToggle({ 
  className, 
  variant = 'ghost',
  size = 'icon' 
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={cn(
        'relative transition-all duration-300',
        className
      )}
      aria-label="Toggle theme"
    >
      <Sun className={cn(
        'h-5 w-5 transition-all duration-300',
        theme === 'dark' 
          ? 'rotate-0 scale-100' 
          : 'rotate-90 scale-0 absolute'
      )} />
      <Moon className={cn(
        'h-5 w-5 transition-all duration-300',
        theme === 'light' 
          ? 'rotate-0 scale-100' 
          : '-rotate-90 scale-0 absolute'
      )} />
    </Button>
  );
}
