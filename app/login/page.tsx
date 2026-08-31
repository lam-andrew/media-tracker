"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { signIn, signUp, type AuthState } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/client";

const initial: AuthState = {};

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [googlePending, setGooglePending] = useState(false);
  const [state, formAction, pending] = useActionState(
    mode === "signup" ? signUp : signIn,
    initial,
  );

  async function signInWithGoogle() {
    setGooglePending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setGooglePending(false); // otherwise the browser is redirecting away
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-medium text-ink">
            {BRAND.name}
          </h1>
          <p className="mt-1 text-sm text-muted">{BRAND.tagline}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-serif text-xl text-ink">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {mode === "signin"
              ? "Sign in to your library."
              : "Start your personal catalog."}
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={googlePending}
            className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-border-strong disabled:opacity-70"
          >
            {googlePending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form action={formAction} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-border-strong focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">Password</span>
              <input
                type="password"
                name="password"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
                minLength={6}
                placeholder="••••••••"
                className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-border-strong focus:outline-none"
              />
            </label>

            {state.error ? (
              <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-accent-strong">
                {state.error}
              </p>
            ) : null}
            {state.message ? (
              <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-ink">
                {state.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-accent-strong disabled:opacity-70"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-muted">
          {mode === "signin" ? "New to Marqd?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-accent underline-offset-2 hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
