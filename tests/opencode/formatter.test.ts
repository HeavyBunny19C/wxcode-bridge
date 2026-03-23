import { describe, it, expect } from "vitest";
import { formatForWechat, splitMessage, stripMarkdown } from "../../src/opencode/formatter";

describe("stripMarkdown", () => {
  it("strips bold", () => {
    expect(stripMarkdown("**bold** text")).toBe("bold text");
  });
  it("strips inline code backticks but keeps content", () => {
    expect(stripMarkdown("use `console.log`")).toBe("use console.log");
  });
  it("strips headers", () => {
    expect(stripMarkdown("## Title\ncontent")).toBe("Title\ncontent");
  });
  it("preserves code block content", () => {
    expect(stripMarkdown("```js\nconst x = 1;\n```")).toBe("const x = 1;");
  });
});

describe("splitMessage", () => {
  it("returns single part for short text", () => {
    const parts = splitMessage("hello", 2048);
    expect(parts).toEqual(["hello"]);
  });
  it("splits at byte boundary", () => {
    const long = "a".repeat(3000);
    const parts = splitMessage(long, 2048);
    expect(parts.length).toBe(2);
    expect(Buffer.byteLength(parts[0], "utf-8")).toBeLessThanOrEqual(2048);
  });
  it("handles multibyte chars correctly", () => {
    const chinese = "中".repeat(1000); // 3 bytes each = 3000 bytes
    const parts = splitMessage(chinese, 2048);
    expect(parts.length).toBe(2);
    for (const part of parts) {
      expect(part).not.toContain("\uFFFD");
    }
  });
});

describe("formatForWechat", () => {
  it("formats simple text response", () => {
    const result = formatForWechat("Here is the answer.");
    expect(result).toBe("Here is the answer.");
  });
  it("strips markdown from response", () => {
    const result = formatForWechat("**Important**: use `fetch()`");
    expect(result).toBe("Important: use fetch()");
  });
});
