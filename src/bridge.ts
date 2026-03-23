import { type WeixinMessage, extractTextFromMessage, MSG_TYPE_USER } from "./ilink/types";
import { parseCommand, getHelpText } from "./commands";
import { formatForWechat, splitMessage } from "./opencode/formatter";
import { PermissionHandler } from "./opencode/permissions";
import { WECHAT_TEXT_BYTE_LIMIT, logError } from "./config";

interface BridgeDeps {
  sendText: (toUserId: string, text: string, contextToken?: string) => Promise<string>;
  sendPrompt: (sessionId: string, text: string) => Promise<string>;
  isHealthy: () => Promise<boolean>;
  createSession: () => Promise<string>;
}

export class Bridge {
  private deps: BridgeDeps;
  private sessionId: string | null = null;
  readonly permissionHandler = new PermissionHandler();

  constructor(deps: BridgeDeps) {
    this.deps = deps;
  }

  setSessionId(id: string): void {
    this.sessionId = id;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  async handleIncomingMessage(msg: WeixinMessage): Promise<void> {
    if (msg.message_type !== MSG_TYPE_USER) return;

    const text = extractTextFromMessage(msg);
    if (!text) return;

    const fromUserId = msg.from_user_id ?? "";
    const contextToken = msg.context_token;

    try {
      const pending = this.permissionHandler.getPending(fromUserId);
      if (pending) {
        const decision = this.permissionHandler.parseApprovalResponse(text);
        if (decision !== null) {
          this.permissionHandler.clearPending(fromUserId);
          await this.deps.sendText(fromUserId, decision === "allow" ? "已允许操作" : "已拒绝操作", contextToken);
          return;
        }
      }

      const cmd = parseCommand(text);
      if (cmd) {
        await this.handleCommand(cmd.command, cmd.args, fromUserId, contextToken);
        return;
      }

      await this.ensureSession();
      const sessionId = this.sessionId!;

      const rawResponse = await this.deps.sendPrompt(sessionId, text);
      const formatted = formatForWechat(rawResponse);
      const parts = splitMessage(formatted, WECHAT_TEXT_BYTE_LIMIT);

      for (const part of parts) {
        await this.deps.sendText(fromUserId, part, contextToken);
      }
    } catch (err: any) {
      logError(`handleIncomingMessage: ${err?.message ?? err}`);
      try {
        await this.deps.sendText(fromUserId, `错误: ${err?.message ?? "未知错误"}`, contextToken);
      } catch {
      }
    }
  }

  private async handleCommand(
    command: string,
    args: string[],
    fromUserId: string,
    contextToken?: string,
  ): Promise<void> {
    switch (command) {
      case "help": {
        await this.deps.sendText(fromUserId, getHelpText(), contextToken);
        break;
      }
      case "new": {
        const newId = await this.deps.createSession();
        this.sessionId = newId;
        await this.deps.sendText(fromUserId, `新会话已创建: ${newId}`, contextToken);
        break;
      }
      case "sessions": {
        await this.deps.sendText(fromUserId, "（会话列表功能即将推出）", contextToken);
        break;
      }
      case "switch": {
        const targetId = args[0];
        if (!targetId) {
          await this.deps.sendText(fromUserId, "用法: /switch <session-id>", contextToken);
        } else {
          this.sessionId = targetId;
          await this.deps.sendText(fromUserId, `已切换到会话: ${targetId}`, contextToken);
        }
        break;
      }
    }
  }

  private async ensureSession(): Promise<void> {
    if (!this.sessionId) {
      this.sessionId = await this.deps.createSession();
    }
  }

  setPermissionPending(senderId: string, permissionId: string, sessionId: string): void {
    this.permissionHandler.setPending(senderId, { permissionId, sessionId });
  }
}
