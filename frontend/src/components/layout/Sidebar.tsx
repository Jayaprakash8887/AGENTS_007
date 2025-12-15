import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  CheckSquare,
  BarChart3,
  Users,
  FolderKanban,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getNavigationForRole } from '@/config/navigation';
import { usePendingApprovals } from '@/hooks/useDashboard';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Receipt,
  Plus,
  CheckSquare,
  BarChart3,
  Users,
  FolderKanban,
  Wallet,
  Settings,
  Coins: Wallet,
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navItems = user ? getNavigationForRole(user.role) : [];
  
  // Fetch pending approvals count dynamically
  const { data: pendingApprovals } = usePendingApprovals();
  
  // Get dynamic badge count based on user role
  const getDynamicBadge = (href: string): number | undefined => {
    if (href !== '/approvals' || !pendingApprovals) return undefined;
    
    switch (user?.role) {
      case 'manager':
        return pendingApprovals.manager_pending || 0;
      case 'hr':
        return pendingApprovals.hr_pending || 0;
      case 'finance':
        return pendingApprovals.finance_pending || 0;
      case 'admin':
        return pendingApprovals.total_pending || 0;
      default:
        return undefined;
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r border-border bg-card transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              const isActive = location.pathname === item.href;
              // Use dynamic badge for approvals, fall back to static badge
              const badgeCount = getDynamicBadge(item.href) ?? item.badge;

              const linkContent = (
                <NavLink
                  to={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {badgeCount !== undefined && badgeCount > 0 && (
                        <Badge
                          variant={isActive ? 'secondary' : 'default'}
                          className="h-5 min-w-[20px] justify-center px-1.5"
                        >
                          {badgeCount}
                        </Badge>
                      )}
                    </>
                  )}
                </NavLink>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-2">
                      {item.label}
                      {badgeCount !== undefined && badgeCount > 0 && (
                        <Badge variant="default" className="h-5 px-1.5">
                          {badgeCount}
                        </Badge>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.href}>{linkContent}</div>;
            })}
          </nav>

          {/* Toggle Button */}
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="w-full justify-center"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
