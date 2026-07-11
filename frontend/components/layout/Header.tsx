'use client';

import { useState, useEffect } from 'react';
import { Menu, Bell, LogOut, User, Settings, Trash2, CheckCheck, Inbox } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationsStore } from '@/store/notifications';
import { PageTitle } from './PageTitle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Header() {
  const { toggleSidebar } = useUIStore();
  const { user, logout, updateUser } = useAuth();

  // Notifications State
  const notifications = useNotificationsStore((s) => s.notifications);
  const markAsRead = useNotificationsStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationsStore((s) => s.markAllAsRead);
  const clearAll = useNotificationsStore((s) => s.clearAll);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  // Sync state with user when dialog opens
  useEffect(() => {
    if (user) {
      setProfileName(user.full_name);
      setProfileEmail(user.email);
    }
  }, [user, isProfileOpen]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) {
      toast.error('Name and Email cannot be empty');
      return;
    }
    updateUser({
      full_name: profileName.trim(),
      email: profileEmail.trim(),
    });
    toast.success('Profile settings updated successfully!');
    setIsProfileOpen(false);
  };

  return (
    <>
      <header className="flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
        {/* ── Hamburger (mobile only) ──────────────────────────────────── */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleSidebar}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* ── Page Title ──────────────────────────────────────────────── */}
        <div className="flex-1">
          <PageTitle />
        </div>

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-md"
                aria-label="Open notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive animate-pulse" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-card border border-border p-0">
              <div className="flex items-center justify-between px-4 py-2.5 border-b">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notifications ({unreadCount})
                </span>
                {notifications.length > 0 && (
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                    >
                      <CheckCheck className="h-3 w-3" /> Read all
                    </button>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-[10px] font-semibold text-destructive hover:underline flex items-center gap-0.5"
                    >
                      <Trash2 className="h-3 w-3" /> Clear
                    </button>
                  </div>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={cn(
                        "p-3 text-left transition-colors cursor-pointer hover:bg-muted/40",
                        !n.read && "bg-muted/10 font-medium"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-xs",
                          n.type === 'success' && "text-green-600 dark:text-green-400 font-semibold",
                          n.type === 'error' && "text-destructive font-semibold",
                          n.type === 'warning' && "text-yellow-600 dark:text-yellow-400 font-semibold",
                          n.type === 'info' && "text-foreground font-semibold"
                        )}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                        {n.message}
                      </p>
                      <p className="text-[9px] text-muted-foreground/60 mt-1">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {user ? getInitials(user.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 bg-card border border-border">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.full_name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={() => setIsProfileOpen(true)}
                className="gap-2 rounded-md cursor-pointer"
              >
                <User className="h-4 w-4" />
                <span>Profile settings</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={logout}
                className="gap-2 text-destructive focus:text-destructive rounded-md cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Profile Settings Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" /> Profile Settings
            </DialogTitle>
            <DialogDescription>
              Update your account details below. Click save when you are finished.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsProfileOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
