import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchQRCode, pollQRStatus } from "../../src/ilink/auth";

describe("fetchQRCode", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("returns qrcode data on success", async () => {
    const mockResponse = { qrcode: "abc123", qrcode_img_content: "https://example.com/qr" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const result = await fetchQRCode("https://ilinkai.weixin.qq.com");
    expect(result.qrcode).toBe("abc123");
    expect(result.qrcode_img_content).toBe("https://example.com/qr");
  });

  it("throws on HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchQRCode("https://ilinkai.weixin.qq.com")).rejects.toThrow("QR fetch failed");
  });
});

describe("pollQRStatus", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("returns confirmed with token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: "confirmed",
        bot_token: "tok_123",
        ilink_bot_id: "bot_456",
        baseurl: "https://ilinkai.weixin.qq.com",
      }),
    }));

    const result = await pollQRStatus("https://ilinkai.weixin.qq.com", "qr123");
    expect(result.status).toBe("confirmed");
    expect(result.bot_token).toBe("tok_123");
  });

  it("returns wait when pending", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "wait" }),
    }));

    const result = await pollQRStatus("https://ilinkai.weixin.qq.com", "qr123");
    expect(result.status).toBe("wait");
  });
});
