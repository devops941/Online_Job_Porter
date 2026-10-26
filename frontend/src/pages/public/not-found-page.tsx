import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicNavbar, PublicFooter } from "@/components/layout/public-navbar";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="rounded-lg border border-border bg-card px-12 py-12 shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted">
            <Compass className="h-6 w-6 text-muted-foreground" />
          </div>

          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            404
          </p>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
            Page not found
          </h1>
          <p className="mb-8 max-w-xs text-sm text-muted-foreground">
            The page you are looking for does not exist or may have been moved.
          </p>

          <div className="flex justify-center gap-3">
            <Button asChild>
              <Link to="/">Go home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/jobs">Browse jobs</Link>
            </Button>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
