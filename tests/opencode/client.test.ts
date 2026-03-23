import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenCodeClient } from "../../src/opencode/client";

vi.mock("@opencode-ai/sdk", () => ({
  createOpencodeClient: vi.fn(() => ({
    session: {
      create: vi.fn().mockResolvedValue({ data: { id: "ses_123" } }),
      list: vi.fn().mockResolvedValue({ data: [{ id: "ses_123", title: "test" }] }),
      promptAsync: vi.fn().mockResolvedValue({ data: undefined }),
      status: vi.fn().mockResolvedValue({ data: { ses_123: { type: "idle" } } }),
      messages: vi.fn().mockResolvedValue({
        data: [
          { role: "user", parts: [{ type: "text", text: "fix the bug" }] },
          { role: "assistant", parts: [{ type: "text", text: "Here is the code fix." }] },
        ],
      }),
    },
  })),
}));

describe("OpenCodeClient", () => {
  let client: OpenCodeClient;

  beforeEach(() => {
    client = new OpenCodeClient("http://localhost:4096");
  });

  it("checks server health", async () => {
    const healthy = await client.isHealthy();
    expect(healthy).toBe(true);
  });

  it("creates a new session", async () => {
    const sessionId = await client.createSession();
    expect(sessionId).toBe("ses_123");
  });

  it("sends prompt and returns text", async () => {
    const response = await client.sendPrompt("ses_123", "fix the bug");
    expect(response).toContain("code fix");
  });

  it("lists sessions", async () => {
    const sessions = await client.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe("ses_123");
  });
});
