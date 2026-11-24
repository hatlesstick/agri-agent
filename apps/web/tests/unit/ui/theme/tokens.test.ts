import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "../../../../src/app/globals.css"), "utf8");

const TOKENS: Record<string, { light: string; dark: string }> = {
  paper: { light: "#f3f4ee", dark: "#1b1611" },
  surface: { light: "#fbfbf7", dark: "#241e18" },
  ink: { light: "#241d16", dark: "#f0ebdf" },
  "ink-soft": { light: "#5b5248", dark: "#b3a999" },
  rule: { light: "#d9d9cd", dark: "#3a3229" },
  brand: { light: "#8fbf4d", dark: "#8fbf4d" },
  "brand-ink": { light: "#1b2410", dark: "#1b2410" },
  "brand-wash": { light: "#e6f0d5", dark: "#283619" },
  go: { light: "#1d6b40", dark: "#5cc68a" },
  "go-strong": { light: "#1d6b40", dark: "#1d6b40" },
  warn: { light: "#c9701f", dark: "#eb9a4c" },
  stop: { light: "#b8402e", dark: "#ec7b67" },
  sky: { light: "#2f76b5", dark: "#7db3e6" },
};

function block(selector: string): string {
  const match = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? "";
}

describe("design tokens", () => {
  const light = block(":root");
  const systemDark = block(':root:not\\(\\[data-theme="light"\\]\\)');
  const explicitDark = block(':root\\[data-theme="dark"\\]');

  it("guards the system dark theme so an explicit light choice wins", () => {
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)/);
  });

  it.each(Object.keys(TOKENS))("defines %s with the design-system values in light, system dark and explicit dark", (name) => {
    expect(light).toContain(`--${name}: ${TOKENS[name].light};`);
    expect(systemDark).toContain(`--${name}: ${TOKENS[name].dark};`);
    expect(explicitDark).toContain(`--${name}: ${TOKENS[name].dark};`);
  });

  it.each(Object.keys(TOKENS))("exposes %s as a Tailwind colour utility", (name) => {
    expect(css).toContain(`--color-${name}: var(--${name});`);
  });

  it("maps the display and text fonts to the next/font variables", () => {
    expect(css).toContain("--font-display: var(--font-unbounded)");
    expect(css).toContain("--font-text: var(--font-onest)");
  });

  it("gives body an explicit paper background", () => {
    expect(css).toMatch(/body\s*\{[^}]*background(-color)?:\s*var\(--paper\)/);
  });
});
