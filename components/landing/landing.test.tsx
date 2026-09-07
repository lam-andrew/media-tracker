import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WelcomePage from "@/app/welcome/page";

// next/image needs a configured loader in jsdom; a plain <img> is enough here.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // Drop next/image-only props so React doesn't warn about unknown attributes.
    const rest = Object.fromEntries(
      Object.entries(props).filter(([k]) => k !== "fill" && k !== "priority"),
    );
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

describe("landing page", () => {
  it("leads with the promise and two clear ways in", () => {
    render(<WelcomePage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /read, watched, and played/i,
      }),
    ).toBeInTheDocument();
    const signups = screen.getAllByRole("link", {
      name: /create your free account/i,
    });
    expect(signups.length).toBeGreaterThanOrEqual(2);
    expect(signups[0]).toHaveAttribute("href", "/login?mode=signup");
    expect(
      screen.getAllByRole("link", { name: /^sign in$/i })[0],
    ).toHaveAttribute("href", "/login");
  });

  it("covers every medium, the six pillars, and the data attribution", () => {
    render(<WelcomePage />);
    for (const t of ["Books", "Movies", "TV", "Games"]) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    }
    for (const h of [
      "One shelf for every medium",
      "Track it your way",
      "Recommendations with a reason",
      "Your year in numbers",
      "Bring your history",
      "Private by design",
    ]) {
      expect(screen.getByRole("heading", { name: h })).toBeInTheDocument();
    }
    expect(
      screen.getByText(/not endorsed or certified by TMDB/),
    ).toBeInTheDocument();
  });
});
