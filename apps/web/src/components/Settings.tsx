import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
export const palettes: Record<
  string,
  { accent: string; paper: string; panel: string; ink: string }
> = {
  Terracotta: {
    accent: "#a65b43",
    paper: "#f6f2ed",
    panel: "#e9e0d4",
    ink: "#453d36",
  },
  Sage: {
    accent: "#4c7663",
    paper: "#f1f5ef",
    panel: "#dce8dc",
    ink: "#303e34",
  },
  Ocean: {
    accent: "#366888",
    paper: "#f0f5f7",
    panel: "#dce8ef",
    ink: "#293b48",
  },
  Plum: {
    accent: "#815274",
    paper: "#f7f0f5",
    panel: "#eadce7",
    ink: "#463341",
  },
  Slate: {
    accent: "#566879",
    paper: "#f1f3f5",
    panel: "#dee3e9",
    ink: "#303a43",
  },
};
export function Settings({
  palette,
  setPalette,
  onDeleted,
}: {
  palette: string;
  setPalette: (s: string) => void;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const config = useQuery({
    queryKey: ["config"],
    queryFn: () => api<{ email: boolean }>("/config"),
  });
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () =>
      api<{ email: string; displayName: string; verified: boolean }>(
        "/profile",
      ),
  });
  const [name, setName] = useState<string | null>(null),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      setMessage(message);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="feature-panel settings-panel">
      <h2>Make yourself at home.</h2>
      <h3>Color palette</h3>
      <div className="palette-options">
        {Object.entries(palettes).map(([name, p]) => (
          <button
            key={name}
            aria-pressed={palette === name}
            onClick={() => setPalette(name)}
          >
            <span style={{ background: p.accent }} />
            {name}
          </button>
        ))}
      </div>
      <h3>Your profile</h3>
      <p>{profile.data?.email}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await api("/profile", {
              method: "PATCH",
              body: JSON.stringify({
                displayName: name ?? profile.data?.displayName ?? "",
              }),
            });
            await qc.invalidateQueries({ queryKey: ["profile"] });
          }, "Profile saved.");
        }}
      >
        <label className="form-field">
          Display name
          <input
            maxLength={100}
            value={name ?? profile.data?.displayName ?? ""}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button className="primary" disabled={busy}>
          Save profile
        </button>
      </form>
      <h3>Your data</h3>
      <p>
        Export your complete library and goals. Imports never replace existing
        entries.
      </p>
      <a className="primary" href="/api/export" download>
        Download library backup
      </a>
      <h3>Password and email</h3>
      {!config.data?.email && (
        <p>
          Email recovery and confirmation will be available when SMTP is
          configured on the server.
        </p>
      )}
      <button
        className="primary"
        disabled={busy || !profile.data || !config.data?.email}
        onClick={() =>
          run(
            () =>
              api("/auth/request-reset", {
                method: "POST",
                body: JSON.stringify({ email: profile.data?.email }),
              }),
            "Check your email for a password reset link.",
          )
        }
      >
        Email a password reset link
      </button>
      {!profile.data?.verified && config.data?.email && (
        <button
          disabled={busy}
          onClick={() =>
            run(
              () =>
                api("/auth/request-verify", {
                  method: "POST",
                  body: JSON.stringify({ email: profile.data?.email }),
                }),
              "Check your email for confirmation.",
            )
          }
        >
          Confirm my email
        </button>
      )}
      <details className="danger-zone">
        <summary>Delete my account</summary>
        <p>
          This permanently deletes your library, goals, and account. Export a
          backup first if you want to keep them.
        </p>
        <label className="form-field">
          Current password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <label className="form-field">
          Type DELETE to confirm
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
        <button
          disabled={busy || confirmation !== "DELETE" || !password}
          onClick={() =>
            run(async () => {
              await api("/account", {
                method: "DELETE",
                body: JSON.stringify({ password, confirmation }),
              });
              onDeleted();
            }, "Account deleted.")
          }
        >
          Permanently delete my account
        </button>
      </details>
      {message && <p role="status">{message}</p>}
      <aside className="attribution">
        <a href="https://www.themoviedb.org/">Movie and TV data: TMDB</a>
        <p>
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
        <a href="https://rawg.io/">Game data: RAWG</a> ·{" "}
        <a href="https://openlibrary.org/">Books: Open Library</a>
      </aside>
    </section>
  );
}
