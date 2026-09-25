import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicNavbar, PublicFooter } from "@/components/layout/public-navbar";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-full bg-muted p-4">
          <Compass className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="max-w-md text-muted-foreground">
          The page you are looking for does not exist or may have been moved.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/jobs">Browse jobs</Link>
          </Button>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
