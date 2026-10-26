import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Briefcase,
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Search,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { homeRouteFor, useAuth } from "@/context/auth-context";
import { useUnreadNotifications } from "@/hooks/use-notifications";
import { cn, initials } from "@/lib/utils";
import type { Role } from "@/types";

/** Maps internal role value to user-facing display label — never changes the code value. */
function roleDisplayLabel(role: Role): string {
  if (role === "employer") return "Company";
  if (role === "job_seeker") return "Job Seeker";
  if (role === "admin") return "Admin";
  return role;
}

const PUBLIC_LINKS = [
  { to: "/jobs", label: "Browse jobs", icon: Search },
  { to: "/companies", label: "Companies", icon: Building2 },
];

export function PublicNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadNotifications(Boolean(user));

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="container flex h-14 items-center justify-between gap-4">
        {/* Brand + nav links */}
        <div className="flex items-center gap-5">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="rounded bg-primary p-1.5 text-primary-foreground">
              <Briefcase className="h-4 w-4" />
            </span>
            <span className="hidden text-sm font-semibold sm:inline">Online Job Portal</span>
          </Link>

          <nav className="flex items-center gap-0.5">
            {PUBLIC_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "rounded px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-foreground bg-muted"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Notification bell */}
              <Button variant="ghost" size="icon" className="relative h-8 w-8" asChild>
                <Link to="/notifications" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                  {unread.data ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                      {unread.data > 9 ? "9+" : unread.data}
                    </span>
                  ) : null}
                </Link>
              </Button>

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2 h-8">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">{initials(user.fullName)}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium sm:inline">{user.fullName}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="space-y-1">
                    <p className="text-sm font-medium">{user.fullName}</p>
                    <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
                    <Badge variant="secondary" className="mt-1 text-[11px]">
                      {roleDisplayLabel(user.role)}
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(homeRouteFor(user.role))}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserIcon className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-sm" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button size="sm" className="text-sm" asChild>
                <Link to="/register">Get started</Link>
              </Button>
              <Button variant="outline" size="sm" className="hidden text-sm sm:inline-flex" asChild>
                <Link to="/register?role=employer">Post a job</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="container flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        {/* Brand */}
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Online Job Portal
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Search roles, track applications and hire faster.
          </p>
        </div>

        {/* Links */}
        <div className="flex gap-12 text-sm">
          <div className="space-y-2">
            <p className="font-medium text-foreground">Job Seekers</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><Link to="/jobs" className="hover:text-foreground transition-colors">Browse jobs</Link></li>
              <li><Link to="/companies" className="hover:text-foreground transition-colors">Companies</Link></li>
              <li><Link to="/register" className="hover:text-foreground transition-colors">Create account</Link></li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Companies</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><Link to="/register?role=employer" className="hover:text-foreground transition-colors">Post a job</Link></li>
              <li><Link to="/login" className="hover:text-foreground transition-colors">Company login</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t">
        <div className="container flex h-10 items-center justify-between text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Online Job Portal</span>
          <span>All rights reserved</span>
        </div>
      </div>
    </footer>
  );
}
