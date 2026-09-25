import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "./auth-layout";
import { homeRouteFor, useAuth } from "@/context/auth-context";
import { apiErrorMessage } from "@/lib/api";

const DEMO_ACCOUNTS = [
  { label: "Job seeker", email: "aarav@example.com" },
  { label: "Employer", email: "meera@novatech.example.com" },
  { label: "Admin", email: "admin@jobportal.com" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("expired")) {
      toast.info("Your session expired. Please sign in again.");
    }
  }, [params]);

  const from = (location.state as { from?: string } | null)?.from;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.fullName.split(" ")[0]}`);
      navigate(from ?? homeRouteFor(user.role), { replace: true });
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not sign in"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your dashboard, applications and interviews."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          <LogIn /> {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Seeded demo accounts
        </p>
        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              onClick={() => {
                setEmail(account.email);
                setPassword("Password123");
              }}
            >
              <span className="font-medium">{account.label}</span>
              <span className="text-xs text-muted-foreground">{account.email}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Password for all demo accounts: Password123</p>
      </div>
    </AuthLayout>
  );
}
