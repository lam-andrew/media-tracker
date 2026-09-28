import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="world">
        <section className="feature-panel">
          <h1>Something interrupted your room.</h1>
          <p>Your saved library is safe. Reload to try again.</p>
          <button className="primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </section>
      </main>
    ) : (
      this.props.children
    );
  }
}
