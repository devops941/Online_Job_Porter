import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Two-column auth layout: marketing panel on the left, form on the right. */
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between border-r bg-muted/30 p-10 lg:flex">
        <div className="surface-grid absolute inset-0 opacity-50" aria-hidden />
        <Link to="/" className="relative flex items-center gap-2 font-semibold">
          <span className="rounded-md bg-primary p-1.5 text-primary-foreground">
            <Briefcase className="h-4 w-4" />
          </span>
          Online Job Portal
        </Link>

        <div className="relative space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">
            One portal for the whole hiring journey
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>• Skill-based match scores on every application</li>
            <li>• Resume parsing that fills your profile automatically</li>
            <li>• Interview scheduling and status notifications built in</li>
            <li>• Employer moderation and exportable reports for admins</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">React + shadcn/ui</Badge>
            <Badge variant="secondary">FastAPI</Badge>
            <Badge variant="secondary">Prisma + MongoDB</Badge>
          </div>
        </div>

        <p className="relative text-xs text-muted-foreground">
          Demo accounts are seeded with the password <code>Password123</code>.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1.5">
            <Link to="/" className="mb-4 flex items-center gap-2 font-semibold lg:hidden">
              <span className="rounded-md bg-primary p-1.5 text-primary-foreground">
                <Briefcase className="h-4 w-4" />
              </span>
              Online Job Portal
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
          {footer ? <div className="text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
