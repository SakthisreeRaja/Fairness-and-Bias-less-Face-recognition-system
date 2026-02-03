import { type ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-sm px-4 lg:px-6">
            <SidebarTrigger className="md:hidden" />
            {title && (
              <>
                <Separator orientation="vertical" className="h-6 md:hidden" />
                <h1 className="text-lg font-semibold gradient-text">{title}</h1>
              </>
            )}
          </header>
          
          {/* Main content */}
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
