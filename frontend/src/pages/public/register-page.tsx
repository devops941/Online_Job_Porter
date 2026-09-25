import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AuthLayout } from "./auth-layout";
import { homeRouteFor, useAuth } from "@/context/auth-context";
import { apiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const ROLE_OPTIONS: { value: Role; label: string; description: string; icon: typeof Users }[] = [
  {
    value: "job_seeker",
    label: "Job seeker",
    description: "Search roles, apply and track applications.",
    icon: Users,
  },
  {
    value: "employer",
    label: "Employer",
    description: "Register a company and post openings.",
    icon: Building2,
  },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("job_seeker");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        companyName: role === "employer" ? companyName.trim() : undefined,
      });
      toast.success("Account created");
      if (user.role === "employer") {
        toast.info("An administrator must approve your company before you can post jobs.");
      } else {
        toast.info("Check your email to verify your address.");
      }
      navigate(homeRouteFor(user.role), { replace: true });
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not create your account"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Choose how you want to use the portal."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRole(option.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                role === option.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:bg-accent",
              )}
            >
              <option.icon className="mb-2 h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            required
            minLength={2}
            placeholder="Jane Doe"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Use 8+ characters with at least one letter and one number.
          </p>
        </div>

        {role === "employer" ? (
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              required
              placeholder="Acme Corporation"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          <UserPlus /> {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      {role === "employer" ? (
        <Card className="border-amber-300/60 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4 text-xs text-amber-900 dark:text-amber-200">
            Employer accounts are reviewed by an administrator. You will be able to post jobs once
            your company is approved.
          </CardContent>
        </Card>
      ) : null}
    </AuthLayout>
  );
}
