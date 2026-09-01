"use client";

import { useState } from "react";
import { deleteAccount } from "@/lib/auth-actions";

export function DeleteAccount() {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (
      !window.confirm(
        "Delete your account and all of your library data? This cannot be undone.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await deleteAccount();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-md border border-border px-3 py-2 text-sm text-accent-strong transition-colors hover:border-accent-strong disabled:opacity-70"
    >
      {busy ? "Deleting…" : "Delete account"}
    </button>
  );
}
