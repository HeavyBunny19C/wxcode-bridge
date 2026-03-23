export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\w]*\n([\s\S]*?)```/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export function splitMessage(text: string, maxBytes: number): string[] {
  const parts: string[] = [];
  let remaining = text;

  while (Buffer.byteLength(remaining, "utf-8") > maxBytes) {
    let splitIdx = 0;
    let byteCount = 0;
    for (const char of remaining) {
      const charBytes = Buffer.byteLength(char, "utf-8");
      if (byteCount + charBytes > maxBytes) break;
      byteCount += charBytes;
      splitIdx += char.length;
    }
    parts.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx);
  }

  if (remaining.length > 0) {
    parts.push(remaining);
  }
  return parts;
}

export function formatForWechat(text: string): string {
  return stripMarkdown(text);
}
