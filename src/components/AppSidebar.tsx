import { useLocation } from 'react-router-dom';
import {
  Home,
  ScanFace,
  BarChart3,
  Users,
  GitCompare,
  History,
  ChevronLeft,
  User,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

const navigationItems = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Face Analysis', url: '/analysis', icon: ScanFace },
  { title: 'Fairness Audit', url: '/audit', icon: BarChart3 },
  { title: 'Demographic Affinity', url: '/affinity', icon: Users },
  { title: 'Comparison', url: '/comparison', icon: GitCompare },
  { title: 'History', url: '/history', icon: History },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border glass-strong"
    >
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={cn(
          'flex items-center gap-3 px-2 py-3 transition-all',
          isCollapsed && 'justify-center'
        )}>
          <div className="relative">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <ScanFace className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg gradient-text">FaceFair</span>
              <span className="text-xs text-muted-foreground">AI Analysis</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={cn(isCollapsed && 'sr-only')}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 transition-all duration-200',
                          isActive && 'glow-border'
                        )}
                      >
                        <item.icon className={cn(
                          'w-5 h-5',
                          isActive && 'text-primary'
                        )} />
                        <span className={cn(isCollapsed && 'sr-only')}>
                          {item.title}
                        </span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className={cn(
          'flex items-center gap-2 p-2',
          isCollapsed ? 'flex-col' : 'justify-between'
        )}>
          <div className={cn(
            'flex items-center gap-2',
            isCollapsed && 'flex-col'
          )}>
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            {!isCollapsed && (
              <span className="text-sm text-muted-foreground">Guest User</span>
            )}
          </div>
          <ThemeToggle />
        </div>
        
        <SidebarTrigger className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className={cn(
            'w-4 h-4 transition-transform',
            isCollapsed && 'rotate-180'
          )} />
          {!isCollapsed && <span>Collapse</span>}
        </SidebarTrigger>
      </SidebarFooter>
    </Sidebar>
  );
}
