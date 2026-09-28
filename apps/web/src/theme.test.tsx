import { expect, test } from "vitest";
import { palettes, themeStyle } from "./theme";
function luminance(hex: string) {
  return [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
for (const name of Object.keys(palettes))
  for (const dark of [false, true]) {
    test(`${name} ${dark ? "evening" : "daylight"} keeps readable shared surfaces`, () => {
      const t = themeStyle(name, dark);
      for (const surface of [
        "--paper",
        "--panel",
        "--scene-start",
        "--scene-end",
      ])
        expect(contrast(t["--ink"], t[surface])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t["--accent"], t["--on-accent"])).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrast(t["--muted"], t["--paper"])).toBeGreaterThanOrEqual(4.5);
      expect(t["--scene-start"]).not.toBe(
        themeStyle(name, !dark)["--scene-start"],
      );
    });
  }
test("every palette changes the scene in both modes; unknown preferences fall back", () => {
  for (const dark of [false, true]) {
    expect(
      new Set(
        Object.keys(palettes).map((n) => themeStyle(n, dark)["--scene-start"]),
      ).size,
    ).toBe(5);
    expect(themeStyle("old-palette", dark)).toEqual(
      themeStyle("Terracotta", dark),
    );
  }
});
