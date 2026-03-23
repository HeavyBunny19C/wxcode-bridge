import { createOpencodeClient } from "@opencode-ai/sdk";
import { log, logError } from "../config";

export class OpenCodeClient {
  private client;

  constructor(baseUrl: string) {
    this.client = createOpencodeClient({ baseUrl });
  }

  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.client.global.health();
      return health.data?.healthy === true;
    } catch {
      return false;
    }
  }

  async createSession(): Promise<string> {
    const session = await this.client.session.create({ body: {} });
    log(`新建 session: ${session.data.id}`);
    return session.data.id;
  }

  async listSessions(): Promise<Array<{ id: string; title?: string }>> {
    const result = await this.client.session.list();
    return result.data ?? [];
  }

  async sendPrompt(sessionId: string, text: string): Promise<string> {
    log(`发送 prompt 到 session ${sessionId}: ${text.slice(0, 50)}...`);
    const result = await this.client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text", text }],
      },
    });

    const parts = result.data?.parts ?? [];
    const textParts = parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.content ?? p.text ?? "");
    return textParts.join("\n");
  }
}
