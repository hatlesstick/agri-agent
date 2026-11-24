import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import noRawPalette from "../../../eslint-rules/no-raw-palette.mjs";

const linter = new Linter({ configType: "flat" });
const config: Linter.Config[] = [
  {
    files: ["**/*.tsx"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { agri: { rules: { "no-raw-palette": noRawPalette as never } } },
    rules: { "agri/no-raw-palette": "error" },
  },
];

function messages(code: string): string[] {
  return linter.verify(code, config, "component.tsx").map((message) => message.message);
}

describe("no-raw-palette", () => {
  it("flags a raw palette class", () => {
    expect(messages('export const A = () => <div className="bg-blue-600 text-white" />;')).toHaveLength(1);
  });

  it("flags a raw palette class inside a template literal", () => {
    expect(messages("export const A = ({ on }: { on: boolean }) => <div className={`p-2 ${on ? 'text-zinc-500' : ''}`} />;")).toHaveLength(1);
  });

  it("flags a hex colour in className", () => {
    expect(messages('export const A = () => <div className="bg-[#1d6b40]" />;')).toHaveLength(1);
  });

  it("allows semantic tokens", () => {
    expect(messages('export const A = () => <div className="bg-surface text-ink border-rule text-go" />;')).toEqual([]);
  });
});
