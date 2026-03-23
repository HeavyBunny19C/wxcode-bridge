import { createOpencodeClient } from "@opencode-ai/sdk";
import { log, logError } from "../config";

export class OpenCodeClient {
  private client;

  constructor(baseUrl: string) {
    this.client = createOpencodeClient({ baseUrl });
  }

  async isHealthy(): Promise<boolean> {
    try {
      // SDK has no dedicated health endpoint; listing sessions validates connectivity
      const result = await this.client.session.list();
      return Array.isArray(result.data);
    } catch {
      return false;
    }
  }

  async createSession(): Promise<string> {
    const session = await this.client.session.create();
    const data = session.data as any;
    log(`新建 session: ${data.id}`);
    return data.id;
  }

  async listSessions(): Promise<Array<{ id: string; title?: string }>> {
    const result = await this.client.session.list();
    return (result.data as any[]) ?? [];
  }

  async sendPrompt(sessionId: string, text: string): Promise<string> {
    log(`发送 prompt 到 session ${sessionId}: ${text.slice(0, 50)}...`);
    const result = await this.client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text" as const, text }],
      },
    });

    const data = result.data as any;
    const parts: any[] = data?.parts ?? [];
    const textParts = parts
      .filter((p) => p.type === "text")
      .map((p) => p.text ?? "");
    return textParts.join("\n");
  }
}
