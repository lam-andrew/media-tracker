"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { updatePassword, type AuthState } from "@/lib/auth-actions";

const initial: AuthState = {};

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(updatePassword, initial);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-medium text-ink">
            {BRAND.name}
          </h1>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-serif text-xl text-ink">Set a new password</h2>
          <p className="mt-1 text-sm text-muted">
            Enter a new password for your account.
          </p>
          <form action={formAction} className="mt-5 flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">
                New password
              </span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
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
            <button
              type="submit"
              disabled={pending}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-accent-strong disabled:opacity-70"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : null}
              Update password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
