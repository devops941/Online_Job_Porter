import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BadgeCheck, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "./auth-layout";
import { apiErrorMessage } from "@/lib/api";
import { authApi } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

type State = "verifying" | "verified" | "failed";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { user, refresh } = useAuth();
  const [state, setState] = useState<State>(token ? "verifying" : "failed");
  const [message, setMessage] = useState("");
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    authApi
      .verifyEmail(token)
      .then((result) => {
        setState("verified");
        setMessage(result.detail);
        void refresh();
      })
      .catch((error) => {
        setState("failed");
        setMessage(apiErrorMessage(error, "This verification link is invalid or has expired."));
      });
  }, [token, refresh]);

  return (
    <AuthLayout
      title="Email verification"
      subtitle="Confirming your address keeps your account secure."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Go to sign in
        </Link>
      }
    >
      <div className="space-y-4">
        {state === "verifying" ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Verifying your email…
          </p>
        ) : state === "verified" ? (
          <div className="flex items-start gap-3 rounded-lg border bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{message || "Your email address is verified."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border bg-destructive/10 p-4 text-sm text-destructive">
              <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{message || "We could not verify this link."}</p>
            </div>
            {user ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  authApi
                    .resendVerification()
                    .then(() => setMessage("A fresh verification email is on its way."))
                    .catch((error) => setMessage(apiErrorMessage(error)))
                }
              >
                Resend verification email
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
