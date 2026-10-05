import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import { useConvex } from "convex/react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

type Step =
  | { kind: "signIn" }
  | { kind: "otp"; email: string }
  | { kind: "totp"; email: string; password: string }
  | { kind: "forgot"; email: string }
  | { kind: "reset"; email: string };

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const convex = useConvex();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [step, setStep] = useState<Step>({ kind: "signIn" });
  const [method, setMethod] = useState<"password" | "code">("password");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [otp, setOtp] = useState("");
  const [totp, setTotp] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const currentEmailValue = () =>
    (document.getElementById("auth-email") as HTMLInputElement | null)?.value.trim() ??
    "";

  const switchTo = (next: Step) => {
    setError(null);
    setStep(next);
  };

  const switchMethod = (next: "password" | "code") => {
    setError(null);
    setMethod(next);
  };

  const switchMode = (next: "in" | "up") => {
    setError(null);
    setMode(next);
  };

  /** Password path: sign up, or sign in (asking for TOTP first if enabled). */
  const handlePasswordSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setIsLoading(true);
    setError(null);
    try {
      if (mode === "up") {
        await signIn("password", { email, password, flow: "signUp" });
        navigate(redirect);
        return;
      }
      const { required } = await convex.query(api.twoFactor.isTotpRequired, {
        email,
      });
      if (required) {
        // Two-factor account — verify the authenticator code next.
        setStep({ kind: "totp", email, password });
        setIsLoading(false);
        return;
      }
      await signIn("password", { email, password, flow: "signIn" });
      navigate(redirect);
    } catch (error) {
      console.error("Password sign-in error:", error);
      const msg = messageOf(error);
      if (msg.includes("Invalid credentials")) {
        setError("Wrong email or password.");
      } else if (msg.includes("Invalid authenticator code")) {
        setError(
          "That authenticator code isn't valid. Wait for a fresh code and try again.",
        );
      } else if (msg.includes("already exists")) {
        setError("This email already has an account — sign in instead.");
        setMode("in");
      } else if (msg.includes("Invalid password")) {
        setError("Password must be at least 8 characters.");
      } else {
        setError(msg || "Could not sign you in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /** One-time code path — step 1: send the code (existing behavior). */
  const handleEmailCodeSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({
        kind: "otp",
        email: String(formData.get("email") ?? "").trim(),
      });
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        messageOf(error) || "Failed to send verification code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /** One-time code path — step 2: verify the code (existing behavior). */
  const handleOtpSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("The verification code you entered is incorrect.");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  /** Google Authenticator code for a two-factor account. */
  const handleTotpSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (step.kind !== "totp" || totp.length !== 6) return;
    setIsLoading(true);
    setError(null);
    try {
      await signIn("password", {
        email: step.email,
        password: step.password,
        flow: "signIn",
        totp,
      });
      navigate(redirect);
    } catch (error) {
      console.error("Authenticator verification error:", error);
      const msg = messageOf(error);
      if (msg.includes("Invalid credentials")) {
        setError("Wrong email or password.");
        setStep({ kind: "signIn" });
      } else if (msg.includes("Invalid authenticator code")) {
        setError(
          "That authenticator code isn't valid. Wait for a fresh code and try again.",
        );
        setTotp("");
      } else {
        setError(msg || "Could not verify the code. Please try again.");
        setTotp("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /** Forgot password — email us a 6-digit reset code. */
  const handleResetRequest = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    setIsLoading(true);
    setError(null);
    try {
      await signIn("password", { flow: "reset", email });
      setStep({ kind: "reset", email });
    } catch (error) {
      console.error("Password reset request error:", error);
      setError(
        "We couldn't send a reset code for this email. Make sure you've already set a password for it.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetResend = async () => {
    if (step.kind !== "reset") return;
    setIsLoading(true);
    setError(null);
    try {
      await signIn("password", { flow: "reset", email: step.email });
      setResetCode("");
      setError(null);
    } catch {
      setError("Couldn't resend the code. Try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  };

  /** Forgot password — verify the code and choose a new password. */
  const handleResetSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (step.kind !== "reset" || resetCode.length !== 6) return;
    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword") ?? "");
    setIsLoading(true);
    setError(null);
    try {
      await signIn("password", {
        flow: "reset-verification",
        email: step.email,
        code: resetCode,
        newPassword,
      });
      navigate(redirect);
    } catch (error) {
      console.error("Password reset error:", error);
      const msg = messageOf(error);
      if (msg.includes("Could not verify code") || msg.includes("Invalid code")) {
        setError("That reset code is incorrect or has expired.");
        setResetCode("");
      } else if (msg.includes("Invalid password")) {
        setError("Password must be at least 8 characters.");
      } else {
        setError(msg || "Could not reset the password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      setError(
        `Failed to sign in as guest: ${messageOf(error) || "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const backToSignIn = () => {
    setOtp("");
    setTotp("");
    setResetCode("");
    setStep({ kind: "signIn" });
    setError(null);
  };

  const otpInput = (
    value: string,
    onChange: (v: string) => void,
    label: string,
  ) => (
    <div className="flex justify-center">
      <InputOTP
        value={value}
        onChange={onChange}
        maxLength={6}
        disabled={isLoading}
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.length === 6 && !isLoading) {
            const form = (e.target as HTMLElement).closest("form");
            if (form) form.requestSubmit();
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
  );

  const isUp =
    step.kind === "signIn" && method === "password" && mode === "up";

  return (
    <div className="fade-in mx-auto flex min-h-dvh w-full max-w-[440px] flex-col border-x border-border/70 bg-background px-6 pt-8 pb-10">
      <img
        src="/assets/logo-transparent.png"
        alt="Calistify"
        width={399}
        height={169}
        className="block h-8 w-auto self-start cursor-pointer select-none"
        onClick={() => navigate("/app")}
      />

      <div className="flex flex-1 flex-col justify-center py-10">
        {step.kind === "signIn" && (
          <>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
              {isUp ? "Create your account" : "Welcome back"}
            </p>
            <h1 className="mt-4 text-[34px] leading-[1.08] font-bold tracking-tight">
              Train Smarter.
              <br />
              Build <span className="text-primary">Stronger.</span>
            </h1>
            <p className="mt-4 max-w-[320px] text-[15px] leading-6 text-muted-foreground">
              {isUp
                ? "Create your password to sync workouts, records and progress."
                : "Sign in to pick up where you left off — or keep going as a guest."}
            </p>

            <form
              onSubmit={
                method === "password"
                  ? handlePasswordSubmit
                  : handleEmailCodeSubmit
              }
              className="mt-9"
            >
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

              {/* sign-in method: password or emailed one-time code */}
              <div className="mt-4 flex rounded-xl border border-border bg-secondary p-1">
                <button
                  type="button"
                  onClick={() => switchMethod("password")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold tracking-wider uppercase transition-all",
                    method === "password"
                      ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-6px_rgba(182,255,0,0.5)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <KeyRound className="size-3.5" />
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => switchMethod("code")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold tracking-wider uppercase transition-all",
                    method === "code"
                      ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-6px_rgba(182,255,0,0.5)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Mail className="size-3.5" />
                  Email code
                </button>
              </div>

              {method === "password" && (
                <div className="mt-4">
                  <label
                    htmlFor="auth-password"
                    className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
                  >
                    Password
                  </label>
                  <div className="relative mt-3">
                    <Input
                      id="auth-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-12 border-border bg-[#0d0d0d] pr-12 text-base focus-visible:ring-primary/30"
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {mode === "up" && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Use at least 8 characters.
                    </p>
                  )}
                </div>
              )}

              {error && (
                <p className="mt-3 text-xs text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-5 h-12 w-full rounded-xl text-[15px] font-semibold shadow-[0_8px_24px_-8px_rgba(182,255,0,0.45)]"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : method === "password" ? (
                  mode === "up" ? (
                    <UserPlus className="mr-2 size-4" />
                  ) : (
                    <KeyRound className="mr-2 size-4" />
                  )
                ) : (
                  <Mail className="mr-2 size-4" />
                )}
                {method === "password"
                  ? mode === "up"
                    ? "Create account"
                    : "Sign in with password"
                  : "Email me a one-time code"}
              </Button>
            </form>

            {method === "password" ? (
              <div className="mt-3 flex items-center justify-between text-[13px]">
                {mode === "in" ? (
                  <>
                    <button
                      type="button"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() =>
                        switchTo({ kind: "forgot", email: currentEmailValue() })
                      }
                    >
                      Forgot password?
                    </button>
                    <button
                      type="button"
                      className="font-semibold text-primary hover:underline"
                      onClick={() => switchMode("up")}
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">
                      Already have an account?
                    </span>
                    <button
                      type="button"
                      className="font-semibold text-primary hover:underline"
                      onClick={() => switchMode("in")}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            ) : (
              <p className="mt-3 text-center text-[13px] text-muted-foreground">
                Prefer a password?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => switchMethod("password")}
                >
                  Use your password
                </button>
              </p>
            )}

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
        )}

        {step.kind === "otp" && (
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

              {otpInput(otp, setOtp, "Verification code")}

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
                  onClick={backToSignIn}
                >
                  Try again
                </Button>
              </p>

              <Button
                type="button"
                variant="ghost"
                onClick={backToSignIn}
                disabled={isLoading}
                className="mt-2 h-11 w-full rounded-xl text-[14px] font-semibold"
              >
                Use different email
              </Button>
            </form>
          </>
        )}

        {step.kind === "totp" && (
          <>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
              Two-factor authentication
            </p>
            <h1 className="mt-4 text-[34px] leading-[1.08] font-bold tracking-tight">
              Enter your <span className="text-primary">code</span>
            </h1>
            <p className="mt-4 max-w-[330px] break-words text-[15px] leading-6 text-muted-foreground">
              Open Google Authenticator and enter the 6-digit code for
              CALISTIFY.
            </p>

            <form onSubmit={handleTotpSubmit} className="mt-9">
              {otpInput(totp, setTotp, "Authenticator code")}

              {error && (
                <p className="mt-3 text-center text-xs text-destructive">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="mt-6 h-12 w-full rounded-xl text-[15px] font-semibold shadow-[0_8px_24px_-8px_rgba(182,255,0,0.45)]"
                disabled={isLoading || totp.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 size-4" />
                    Verify &amp; continue
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={backToSignIn}
                disabled={isLoading}
                className="mt-2 h-11 w-full rounded-xl text-[14px] font-semibold"
              >
                Back to sign in
              </Button>
            </form>
          </>
        )}

        {step.kind === "forgot" && (
          <>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
              Reset password
            </p>
            <h1 className="mt-4 text-[34px] leading-[1.08] font-bold tracking-tight">
              Forgot your <span className="text-primary">password?</span>
            </h1>
            <p className="mt-4 max-w-[320px] text-[15px] leading-6 text-muted-foreground">
              Enter your email and we&apos;ll send you a 6-digit reset code.
            </p>

            <form onSubmit={handleResetRequest} className="mt-9">
              <label
                htmlFor="reset-email"
                className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
              >
                Email
              </label>
              <Input
                id="reset-email"
                name="email"
                placeholder="name@example.com"
                type="email"
                className="mt-3 h-12 border-border bg-[#0d0d0d] text-base focus-visible:ring-primary/30"
                defaultValue={step.email}
                disabled={isLoading}
                required
              />

              {error && (
                <p className="mt-3 text-xs text-destructive">{error}</p>
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
                Send reset code
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={backToSignIn}
                disabled={isLoading}
                className="mt-2 h-11 w-full rounded-xl text-[14px] font-semibold"
              >
                Back to sign in
              </Button>
            </form>
          </>
        )}

        {step.kind === "reset" && (
          <>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
              Reset password
            </p>
            <h1 className="mt-4 text-[34px] leading-[1.08] font-bold tracking-tight">
              Choose a new <span className="text-primary">password</span>
            </h1>
            <p className="mt-4 max-w-[330px] break-words text-[15px] leading-6 text-muted-foreground">
              Enter the code we sent to {step.email} and pick a new password.
            </p>

            <form onSubmit={handleResetSubmit} className="mt-9">
              {otpInput(resetCode, setResetCode, "Reset code")}

              <label
                htmlFor="new-password"
                className="mt-6 block text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
              >
                New password
              </label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                placeholder="••••••••"
                className="mt-3 h-12 border-border bg-[#0d0d0d] text-base focus-visible:ring-primary/30"
                disabled={isLoading}
                minLength={8}
                required
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Use at least 8 characters.
              </p>

              {error && (
                <p className="mt-3 text-xs text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                className="mt-5 h-12 w-full rounded-xl text-[15px] font-semibold shadow-[0_8px_24px_-8px_rgba(182,255,0,0.45)]"
                disabled={isLoading || resetCode.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Resetting…
                  </>
                ) : (
                  <>
                    Reset password
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>

              <p className="mt-4 text-center text-[13px] text-muted-foreground">
                Code expired?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 font-semibold text-primary"
                  onClick={handleResetResend}
                  disabled={isLoading}
                >
                  Send a new code
                </Button>
              </p>

              <Button
                type="button"
                variant="ghost"
                onClick={backToSignIn}
                disabled={isLoading}
                className="mt-2 h-11 w-full rounded-xl text-[14px] font-semibold"
              >
                Back to sign in
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
