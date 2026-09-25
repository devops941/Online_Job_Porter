import { Navigate, Outlet, useLocation } from "react-router-dom";
import { homeRouteFor, useAuth } from "@/context/auth-context";
import type { Role } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

/** Blocks unauthenticated access and bounces users away from roles they do not hold. */
export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={homeRouteFor(user.role)} replace />;
  }

  return <Outlet />;
}

/** Keeps signed-in users off the login/register screens. */
export function RedirectIfAuthed() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to={homeRouteFor(user.role)} replace />;
  return <Outlet />;
}
