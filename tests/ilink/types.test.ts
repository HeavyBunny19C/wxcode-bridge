import { describe, it, expect } from "vitest";
import { extractTextFromMessage } from "../../src/ilink/types";

describe("extractTextFromMessage", () => {
  it("extracts plain text", () => {
    const msg = {
      message_type: 1,
      item_list: [{ type: 1, text_item: { text: "hello" } }],
    };
    expect(extractTextFromMessage(msg)).toBe("hello");
  });

  it("extracts voice transcription", () => {
    const msg = {
      message_type: 1,
      item_list: [{ type: 3, voice_item: { text: "voice text" } }],
    };
    expect(extractTextFromMessage(msg)).toBe("voice text");
  });

  it("extracts text with reference", () => {
    const msg = {
      message_type: 1,
      item_list: [{
        type: 1,
        text_item: { text: "reply" },
        ref_msg: { title: "original" },
      }],
    };
    expect(extractTextFromMessage(msg)).toBe("[引用: original]\nreply");
  });

  it("returns empty for no items", () => {
    expect(extractTextFromMessage({ message_type: 1 })).toBe("");
    expect(extractTextFromMessage({ message_type: 1, item_list: [] })).toBe("");
  });

  it("ignores bot messages", () => {
    const msg = {
      message_type: 2,
      item_list: [{ type: 1, text_item: { text: "bot reply" } }],
    };
    expect(extractTextFromMessage(msg)).toBe("bot reply");
  });
});
