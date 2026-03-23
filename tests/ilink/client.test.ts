import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUpdates, sendTextMessage } from "../../src/ilink/client";

describe("getUpdates", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("returns messages on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({
        ret: 0,
        msgs: [{ message_type: 1, from_user_id: "user1", item_list: [{ type: 1, text_item: { text: "hi" } }], context_token: "ctx1" }],
        get_updates_buf: "buf2",
      })),
    }));

    const resp = await getUpdates("https://base.url", "token", "buf1");
    expect(resp.msgs).toHaveLength(1);
    expect(resp.get_updates_buf).toBe("buf2");
  });

  it("returns empty on timeout (AbortError)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" })));

    const resp = await getUpdates("https://base.url", "token", "buf1");
    expect(resp.msgs).toEqual([]);
    expect(resp.get_updates_buf).toBe("buf1");
  });
});

describe("sendTextMessage", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("sends message and returns client_id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("{}"),
    }));

    const clientId = await sendTextMessage("https://base.url", "token", "user1", "hello", "ctx1");
    expect(clientId).toMatch(/^wechat-opencode:/);
  });
});
