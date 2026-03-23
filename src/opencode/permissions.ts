interface PermissionRequest {
  permissionId: string;
  description: string;
  type: string;
}

interface PendingPermission {
  permissionId: string;
  sessionId: string;
}

export class PermissionHandler {
  private pending = new Map<string, PendingPermission>();

  formatPermissionRequest(req: PermissionRequest): string {
    return [
      `⚠️ OpenCode 请求权限:`,
      `类型: ${req.type}`,
      `操作: ${req.description}`,
      ``,
      `回复 "允许" 或 "拒绝"`,
    ].join("\n");
  }

  parseApprovalResponse(text: string): "allow" | "deny" | null {
    const t = text.trim().toLowerCase();
    if (["允许", "allow", "yes", "y", "ok"].includes(t)) return "allow";
    if (["拒绝", "deny", "no", "n", "reject"].includes(t)) return "deny";
    return null;
  }

  setPending(senderId: string, perm: PendingPermission): void {
    this.pending.set(senderId, perm);
  }

  getPending(senderId: string): PendingPermission | null {
    return this.pending.get(senderId) ?? null;
  }

  clearPending(senderId: string): void {
    this.pending.delete(senderId);
  }
}
