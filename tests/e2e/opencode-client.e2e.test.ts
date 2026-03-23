import { describe, it, expect, afterAll } from "vitest";
import { OpenCodeClient } from "../../src/opencode/client";

const OPENCODE_URL = process.env.OPENCODE_URL ?? "http://localhost:4096";

describe("OpenCode Client E2E", () => {
  const client = new OpenCodeClient(OPENCODE_URL);
  const sessionsToCleanup: string[] = [];

  afterAll(async () => {
    const { createOpencodeClient } = await import("@opencode-ai/sdk");
    const rawClient = createOpencodeClient({ baseUrl: OPENCODE_URL });
    for (const id of sessionsToCleanup) {
      try {
        await rawClient.session.delete({ path: { id } });
      } catch { /* best-effort cleanup */ }
    }
  });

  it("connects to running OpenCode server", async () => {
    const healthy = await client.isHealthy();
    expect(healthy).toBe(true);
  }, 10_000);

  it("lists existing sessions", async () => {
    const sessions = await client.listSessions();
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThan(0);
  }, 10_000);

  it("creates a new session", async () => {
    const sessionId = await client.createSession();
    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe("string");
    sessionsToCleanup.push(sessionId);
  }, 15_000);

  it("sends prompt and receives text response", async () => {
    const sessionId = await client.createSession();
    sessionsToCleanup.push(sessionId);

    const response = await client.sendPrompt(sessionId, 'Respond with exactly one word: pong');
    expect(response).toBeTruthy();
    expect(typeof response).toBe("string");
    expect(response.toLowerCase()).toContain("pong");
  }, 120_000);
});
