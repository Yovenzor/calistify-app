import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail, UserX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);
  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);

      console.log("signed in");

      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);

      setError("The verification code you entered is incorrect.");
      setIsLoading(false);

      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Attempting anonymous sign in...");
      await signIn("anonymous");
      console.log("Anonymous sign in successful");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      setError(
        `Failed to sign in as guest: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="fade-in mx-auto flex min-h-dvh w-full max-w-[440px] flex-col border-x border-border/70 bg-background px-6 pt-8 pb-10">
      <img
        src="/assets/logo-transparent.png"
        alt="Calistify"
        width={399}
        height={169}
        className="block h-8 w-auto self-start cursor-pointer select-none"
        onClick={() => navigate("/")}
      />

      <div className="flex flex-1 flex-col justify-center py-10">
        {step === "signIn" ? (
          <>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
              Welcome back
            </p>
            <h1 className="mt-4 text-[34px] leading-[1.08] font-bold tracking-tight">
              Sign in to <span className="text-primary">Calistify</span>
            </h1>
            <p className="mt-4 max-w-[300px] text-[15px] leading-6 text-muted-foreground">
              Enter your email to log in or sign up — or keep going as a guest.
            </p>

            <form onSubmit={handleEmailSubmit} className="mt-9">
              <label
                htmlFor="auth-email"
                className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
              >
                Email
              </label>
              <Input
                id="auth-email"
                name="email"
                placeholder="name@example.com"
                type="email"
                className="mt-3 h-12 border-border bg-[#0d0d0d] text-base focus-visible:ring-primary/30"
                disabled={isLoading}
                required
              />
              {error && (
                <p className="mt-2 text-xs text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-5 h-12 w-full rounded-xl text-[15px] font-semibold shadow-[0_8px_24px_-8px_rgba(182,255,0,0.45)]"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 size-4" />
                )}
                Continue with email
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Or
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="secondary"
              className="h-12 w-full rounded-xl text-[15px] font-semibold"
              onClick={handleGuestLogin}
              disabled={isLoading}
            >
              <UserX className="mr-2 size-4" />
              Continue as Guest
            </Button>
          </>
        ) : (
          <>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
              Check your email
            </p>
            <h1 className="mt-4 text-[34px] leading-[1.08] font-bold tracking-tight">
              Enter your <span className="text-primary">code</span>
            </h1>
            <p className="mt-4 max-w-[320px] break-words text-[15px] leading-6 text-muted-foreground">
              We&apos;ve sent a 6-digit code to {step.email}.
            </p>

            <form onSubmit={handleOtpSubmit} className="mt-9">
              <input type="hidden" name="email" value={step.email} />
              <input type="hidden" name="code" value={otp} />

              <div className="flex justify-center">
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                      const form = (e.target as HTMLElement).closest("form");
                      if (form) {
                        form.requestSubmit();
                      }
                    }
                  }}
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && (
                <p className="mt-3 text-center text-xs text-destructive">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="mt-6 h-12 w-full rounded-xl text-[15px] font-semibold shadow-[0_8px_24px_-8px_rgba(182,255,0,0.45)]"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    Verify code
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>

              <p className="mt-4 text-center text-[13px] text-muted-foreground">
                Didn&apos;t receive a code?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 font-semibold text-primary"
                  onClick={() => setStep("signIn")}
                >
                  Try again
                </Button>
              </p>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("signIn")}
                disabled={isLoading}
                className="mt-2 h-11 w-full rounded-xl text-[14px] font-semibold"
              >
                Use different email
              </Button>
            </form>
          </>
        )}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Secured by{" "}
        <a
          href="https://freebuff.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline transition-colors hover:text-primary"
        >
          freebuff.com
        </a>
      </p>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
