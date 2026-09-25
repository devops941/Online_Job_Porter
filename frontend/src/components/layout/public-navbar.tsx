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
import { cn, initials, titleCase } from "@/lib/utils";

const PUBLIC_LINKS = [
  { to: "/jobs", label: "Browse jobs", icon: Search },
  { to: "/companies", label: "Companies", icon: Building2 },
];

export function PublicNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadNotifications(Boolean(user));

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="rounded-md bg-primary p-1.5 text-primary-foreground">
              <Briefcase className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Online Job Portal</span>
          </Link>
          <nav className="flex items-center gap-1">
            {PUBLIC_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium sm:inline">{user.fullName}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
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
                    <LayoutDashboard /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserIcon /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                  >
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Get started</Link>
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
    <footer className="border-t bg-muted/30">
      <div className="container flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Online Job Portal
          </p>
          <p className="text-sm text-muted-foreground">
            Search roles, track applications and hire faster.
          </p>
        </div>

      </div>
    </footer>
  );
}
