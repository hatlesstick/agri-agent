import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/ui/atoms/Markdown";

function render(text: string): string {
  return renderToStaticMarkup(createElement(Markdown, { text }));
}

describe("assistant markdown (deterministic)", () => {
  it("renders bold text and lists", () => {
    const html = render("**Today:** rain\n\n* morning: dry\n* evening: wet");
    expect(html).toContain("<strong");
    expect(html).toContain("<ul");
    expect(html).not.toContain("**");
  });

  it("drops links and images but keeps their text", () => {
    const html = render("Check [the label](https://evil.example) ![tracker](https://evil.example/a.png)");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("evil.example");
    expect(html).toContain("the label");
  });

  it("never renders raw HTML", () => {
    const html = render("<script>alert(1)</script><b onclick=\"x()\">hi</b>");
    expect(html).not.toContain("<script");
    expect(html).not.toMatch(/<[^>]*onclick/);
    expect(html).not.toContain("<b ");
  });
});
