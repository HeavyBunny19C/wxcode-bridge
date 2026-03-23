export interface ParsedCommand {
  command: string;
  args: string[];
}

export const COMMANDS = ["new", "sessions", "switch", "help"] as const;

export function parseCommand(text: string): ParsedCommand | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;

  const parts = trimmed.slice(1).split(/\s+/);
  const command = parts[0].toLowerCase();

  if (!COMMANDS.includes(command as any)) return null;

  return { command, args: parts.slice(1) };
}

export function getHelpText(): string {
  return [
    "wechat-opencode 命令:",
    "/new — 创建新的 OpenCode 会话",
    "/sessions — 列出所有会话",
    "/switch <id> — 切换到指定会话",
    "/help — 显示帮助",
  ].join("\n");
}
