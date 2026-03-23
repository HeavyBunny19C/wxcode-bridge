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

    await this.client.session.promptAsync({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text" as const, text }],
      },
    });

    const response = await this.waitForResponse(sessionId);
    return response;
  }

  private async waitForResponse(sessionId: string, timeoutMs = 300_000): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    const pollInterval = 2_000;

    await new Promise((r) => setTimeout(r, 1_000));

    while (Date.now() < deadline) {
      try {
        const status = await this.client.session.status();
        const allStatus = status.data as any;
        const sessionStatus = allStatus?.[sessionId];
        log(`session status: ${JSON.stringify(sessionStatus)}`);

        if (!sessionStatus || sessionStatus.type === "idle") {
          return await this.getLatestAssistantMessage(sessionId);
        }
      } catch (err: any) {
        log(`status check error: ${err?.message}`);
      }

      await new Promise((r) => setTimeout(r, pollInterval));
    }

    log("waitForResponse timeout, fetching latest message anyway");
    return await this.getLatestAssistantMessage(sessionId);
  }

  private async getLatestAssistantMessage(sessionId: string): Promise<string> {
    log(`fetching messages for session ${sessionId}`);
    const msgs = await this.client.session.messages({ path: { id: sessionId } });
    const messageList = (msgs.data as any[]) ?? [];
    log(`got ${messageList.length} messages`);

    for (let i = messageList.length - 1; i >= 0; i--) {
      const msg = messageList[i];
      const role = msg.role ?? msg.info?.role;
      if (role === "assistant") {
        const parts: any[] = msg.parts ?? [];
        const textParts = parts
          .filter((p) => p.type === "text")
          .map((p) => p.text ?? "");
        const result = textParts.join("\n").trim();
        if (result) {
          log(`found reply: ${result.slice(0, 100)}...`);
          return result;
        }
      }
    }

    log("no assistant text found");
    return "(OpenCode 未返回文本回复)";
  }
}
