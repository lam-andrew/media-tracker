import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { BRAND, type User } from "../types";
export function Auth({ onSuccess }: { onSuccess: (u: User) => void }) {
  const [link] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)),
  );
  const purpose = link.has("reset")
    ? "reset"
    : link.has("verify")
      ? "verify"
      : null;
  const [mode, setMode] = useState("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(link.get("auth-error") ?? ""),
    [message, setMessage] = useState(""),
    [complete, setComplete] = useState(false);
  const config = useQuery({
    queryKey: ["config"],
    queryFn: () =>
      api<{ google: boolean; email: boolean; registration: boolean }>(
        "/config",
      ),
  });
  return (
    <section className="auth-panel glass">
      <span className="eyebrow">A SPACE THAT’S ONLY YOURS</span>
      <h2>
        {purpose && !complete
          ? purpose === "reset"
            ? "A fresh start."
            : "Confirm your email."
          : mode === "signup"
            ? "Make yourself at home."
            : "Welcome back."}
      </h2>
      <p>Your private {BRAND.name} collection.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setMessage("");
          try {
            if (purpose && !complete) {
              const r = await api<{ message: string }>("/auth/complete", {
                method: "POST",
                body: JSON.stringify({
                  purpose,
                  token: link.get(purpose),
                  password: purpose === "reset" ? password : undefined,
                }),
              });
              setMessage(r.message);
              setComplete(true);
              window.history.replaceState({}, "", window.location.pathname);
            } else if (mode === "forgot" || mode === "verify") {
              const r = await api<{ message: string }>(
                "/auth/request-" + (mode === "forgot" ? "reset" : "verify"),
                { method: "POST", body: JSON.stringify({ email }) },
              );
              setMessage(r.message);
            } else {
              const r = await api<{ user?: User; message?: string }>(
                mode === "signup" ? "/register" : "/login",
                { method: "POST", body: JSON.stringify({ email, password }) },
              );
              if (r.user) onSuccess(r.user);
              else setMessage(r.message ?? "Check your email.");
            }
            setPassword("");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {(!purpose || complete) && (
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        )}
        {((purpose === "reset" && !complete) ||
          ((!purpose || complete) && ["signin", "signup"].includes(mode))) && (
          <label>
            Password
            <input
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete={
                mode === "signup" || purpose === "reset"
                  ? "new-password"
                  : "current-password"
              }
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {mode === "signup" && (
          <small>
            At least 12 characters. This account is separate from your original{" "}
            {BRAND.name} account.
          </small>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <button className="primary" disabled={busy}>
          {busy
            ? "One moment…"
            : purpose && !complete
              ? purpose === "reset"
                ? "Set new password"
                : "Confirm email"
              : mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : mode === "verify"
                    ? "Send confirmation"
                    : "Sign in"}
        </button>
      </form>
      {(!purpose || complete) && (
        <div className="auth-actions">
          {config.data?.google && (
            <a className="primary google-button" href="/api/auth/google">
              Continue with Google
            </a>
          )}
          {[
            "signin",
            ...(config.data?.registration ? ["signup"] : []),
            ...(config.data?.email ? ["forgot", "verify"] : []),
          ]
            .filter((m) => m !== mode)
            .map((m) => (
              <button
                key={m}
                disabled={busy}
                onClick={() => {
                  setMode(m);
                  setError("");
                  setMessage("");
                }}
              >
                {m === "signin"
                  ? "Sign in"
                  : m === "signup"
                    ? "Create an account"
                    : m === "forgot"
                      ? "Forgot password?"
                      : "Resend confirmation"}
              </button>
            ))}
        </div>
      )}
    </section>
  );
}
