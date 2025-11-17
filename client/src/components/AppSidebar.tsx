import { LayoutDashboard, Upload, Share2, BarChart3, LogOut, Box, User } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
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
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { UserProfile } from '@/types';
import { profileService } from '@/services/profile.service';

interface AppSidebarProps {
  user?: UserProfile | null;
  onSignOut?: () => void;
}

const menuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Upload',
    url: '/upload',
    icon: Upload,
  },
  {
    title: 'Shared Links',
    url: '/share',
    icon: Share2,
  },
  {
    title: 'Analytics',
    url: '/analytics',
    icon: BarChart3,
  },
  {
    title: 'Profile',
    url: '/profile',
    icon: User,
  },
];

export function AppSidebar({ user, onSignOut }: AppSidebarProps) {
  const [location] = useLocation();

  // Fetch user details for extended profile information
  const { data: userDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/user-details', user?.uid],
    queryFn: () => profileService.getUserDetails(user!.uid),
    enabled: !!user,
  });

  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Determine display values (prefer user_details over user profile)
  // While loading details, use existing user data; only show 'User' if nothing is available after loading
  let displayName = 'User';
  if (userDetails?.displayName) {
    displayName = userDetails.displayName;
  } else if (user?.displayName) {
    displayName = user.displayName;
  } else if (isLoadingDetails && user?.email) {
    // While loading, don't show 'User', wait for data or use email as fallback
    displayName = user.email.split('@')[0];
  }

  const avatarUrl = userDetails?.userLogo || user?.photoURL;

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Box className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg">
              AR Models{' '}
              <span className="text-xs text-gray-400 font-normal">(version 2.0.0)</span>
            </h2>
            <p className="text-xs text-muted-foreground">Share in 3D</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        {user && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback>
                  {getInitials(displayName, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            {onSignOut && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onSignOut}
                data-testid="button-signout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
