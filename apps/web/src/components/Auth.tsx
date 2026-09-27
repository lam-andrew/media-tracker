import { useState } from "react";
import { api } from "../api";
import { BRAND, type User } from "../types";
export function Auth({ onSuccess }: { onSuccess: (u: User) => void }) {
  const [signup, setSignup] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="auth-panel glass">
      <span className="eyebrow">A SPACE THAT’S ONLY YOURS</span>
      <h2>{signup ? "Make yourself at home." : "Welcome back."}</h2>
      <p>
        {signup
          ? `Create a separate ${BRAND.name} v2 development account.`
          : "Sign in to your v2 library."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const r = await api<{ user: User }>(
              signup ? "/register" : "/login",
              { method: "POST", body: JSON.stringify({ email, password }) },
            );
            setPassword("");
            onSuccess(r.user);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
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
        <label>
          Password
          <input
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete={signup ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {signup && (
          <small>
            At least 12 characters. This account is separate from your current
            Marqd account.
          </small>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button disabled={busy} className="primary">
          {busy ? "One moment…" : signup ? "Create account" : "Sign in"}
        </button>
      </form>
      <button
        className="auth-switch"
        disabled={busy}
        onClick={() => {
          setSignup(!signup);
          setError("");
        }}
      >
        {signup
          ? "Already have a v2 account? Sign in"
          : "New here? Create a v2 account"}
      </button>
    </section>
  );
}
