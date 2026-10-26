import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";

/** Centered single-column auth panel with a slim brand header. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top brand bar */}
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center">
          <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="rounded-md bg-primary p-1.5 text-primary-foreground">
              <Briefcase className="h-4 w-4" />
            </span>
            Online Job Portal
          </Link>
        </div>
      </header>

      {/* Centered form */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-border bg-card px-8 py-8 shadow-sm">
            {/* Heading */}
            <div className="mb-6 space-y-1">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {children}

            {footer ? (
              <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
