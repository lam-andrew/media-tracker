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

// Every surface derives from the same palette in both lighting modes.
export function themeStyle(
  name: string,
  dark: boolean,
): Record<string, string> {
  const p = palettes[name] ?? palettes.Terracotta;
  const mix = (a: string, b: string, amount: number) => {
    const rgb = [1, 3, 5].map((i) =>
      Math.round(
        parseInt(a.slice(i, i + 2), 16) * amount +
          parseInt(b.slice(i, i + 2), 16) * (1 - amount),
      ),
    );
    return "#" + rgb.map((n) => n.toString(16).padStart(2, "0")).join("");
  };
  const paper = dark ? mix(p.ink, "#101315", 0.42) : p.paper;
  const panel = dark ? mix(p.accent, "#191c20", 0.24) : p.panel;
  const accent = dark ? mix(p.accent, "#ffffff", 0.48) : p.accent;
  return {
    "--paper": paper,
    "--panel": panel,
    "--accent": accent,
    "--ink": dark ? mix(p.paper, "#ffffff", 0.85) : p.ink,
    "--muted": dark ? mix(p.panel, "#ffffff", 0.75) : mix(p.ink, p.paper, 0.78),
    "--line": mix(p.accent, paper, dark ? 0.33 : 0.2),
    "--glass": dark ? panel + "df" : "#ffffffb8",
    "--on-accent": dark ? paper : "#ffffff",
    "--scene-start": dark
      ? mix(p.accent, paper, 0.32)
      : mix(p.accent, p.paper, 0.12),
    "--scene-end": dark
      ? mix(p.accent, paper, 0.12)
      : mix(p.accent, p.panel, 0.2),
    "--shelf-top": mix(p.accent, panel, 0.4),
    "--shelf-edge": mix(p.accent, p.ink, 0.5),
    "--jacket-0": mix(p.accent, p.ink, 0.8),
    "--jacket-1": mix(p.accent, "#526b6b", 0.55),
    "--jacket-2": mix(p.accent, "#6b6045", 0.5),
    "--jacket-3": mix(p.accent, p.ink, 0.55),
    "--jacket-4": mix(p.accent, "#53647b", 0.45),
    colorScheme: dark ? "dark" : "light",
  };
}
