import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  ClipboardList,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { homeRouteFor, useAuth } from "@/context/auth-context";
import { useUnreadNotifications } from "@/hooks/use-notifications";
import { cn, initials, titleCase } from "@/lib/utils";
import type { Role } from "@/types";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV: Record<Role, NavItem[]> = {
  job_seeker: [
    { to: "/job-seeker", label: "Dashboard", icon: Gauge },
    { to: "/jobs", label: "Find jobs", icon: Search },
    { to: "/job-seeker/applications", label: "My applications", icon: ClipboardList },
    { to: "/job-seeker/saved", label: "Saved jobs", icon: Briefcase },
    { to: "/job-seeker/interviews", label: "Interviews", icon: Building2 },
    { to: "/job-seeker/resumes", label: "Resumes", icon: FileText },
    { to: "/job-seeker/alerts", label: "Job alerts", icon: Bell },
    { to: "/profile", label: "Profile", icon: UserIcon },
  ],
  employer: [
    { to: "/employer", label: "Dashboard", icon: Gauge },
    { to: "/employer/jobs", label: "My job posts", icon: Briefcase },
    { to: "/employer/applicants", label: "Applicants", icon: Users },
    { to: "/employer/interviews", label: "Interviews", icon: Building2 },
    { to: "/employer/reports", label: "Reports", icon: BarChart3 },
    { to: "/profile", label: "Company profile", icon: Settings },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: Gauge },
    { to: "/admin/moderation", label: "Job moderation", icon: ShieldCheck },
    { to: "/admin/employers", label: "Employer approvals", icon: Building2 },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/taxonomy", label: "Categories & skills", icon: Tags },
    { to: "/admin/reports", label: "Reports", icon: BarChart3 },
    { to: "/profile", label: "Profile", icon: UserIcon },
  ],
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const items = NAV[user.role] ?? [];

  return (
    <div className="flex h-full flex-col gap-4">
      <Link
        to={homeRouteFor(user.role)}
        onClick={onNavigate}
        className="flex items-center gap-2 px-2 font-semibold"
      >
        <span className="rounded-md bg-primary p-1.5 text-primary-foreground">
          <Briefcase className="h-4 w-4" />
        </span>
        <span className="text-sm">Online Job Portal</span>
      </Link>

      <div className="rounded-lg border bg-muted/40 p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <Badge variant="secondary" className="mt-0.5">
              {titleCase(user.role)}
            </Badge>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === homeRouteFor(user.role)}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Separator />
      <Button
        variant="ghost"
        className="justify-start gap-3 text-muted-foreground"
        onClick={() => {
          logout();
          onNavigate?.();
          navigate("/login");
        }}
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}

export function AppShell({ children }: { children?: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadNotifications(Boolean(user));

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-64 shrink-0 border-r bg-background p-4 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 h-full w-72 border-r bg-background p-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </Button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex flex-1 items-center justify-end gap-3">
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link to="/notifications" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                {unread.data ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {unread.data > 9 ? "9+" : unread.data}
                  </span>
                ) : null}
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild aria-label="Dashboard">
              <Link to={homeRouteFor(user?.role)}>
                <LayoutDashboard className="h-4 w-4" />
              </Link>
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="space-y-1">
                    <p className="text-sm font-medium">{user.fullName}</p>
                    <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
                    <Badge variant="secondary" className="mt-1">
                      {titleCase(user.role)}
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(homeRouteFor(user.role))}>
                    <Gauge className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserIcon className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
