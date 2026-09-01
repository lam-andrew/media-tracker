import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { getUser } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";
import { DeleteAccount } from "@/components/settings/delete-account";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getUser();
  const email = user?.email ?? "";
  const initial = email ? email[0].toUpperCase() : "?";
  const joined = user?.created_at
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(user.created_at))
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-serif text-3xl font-medium text-ink sm:text-4xl">
        Settings
      </h1>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
          Account
        </h2>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent font-serif text-lg text-surface">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-ink">{email}</p>
              {joined ? (
                <p className="text-sm text-muted">Member since {joined}</p>
              ) : null}
            </div>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink transition-colors hover:border-border-strong"
              >
                <LogOut size={15} className="text-muted" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
          Appearance
        </h2>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-ink">Theme</p>
          <p className="mt-1 text-sm text-muted">
            Switch between Literary light and Warm dark using the sun/moon
            toggle in the top bar. Your choice is remembered on this device.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
          Danger zone
        </h2>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-ink">Delete account</p>
          <p className="mb-4 mt-1 max-w-md text-sm text-muted">
            Permanently removes your account and everything in your library.
            This can&rsquo;t be undone.
          </p>
          <DeleteAccount />
        </div>
      </section>
    </div>
  );
}
