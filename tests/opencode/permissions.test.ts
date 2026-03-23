import { describe, it, expect } from "vitest";
import { PermissionHandler } from "../../src/opencode/permissions";

describe("PermissionHandler", () => {
  it("formats permission request for WeChat", () => {
    const handler = new PermissionHandler();
    const msg = handler.formatPermissionRequest({
      permissionId: "perm_1",
      description: "Run command: rm -rf dist/",
      type: "bash",
    });
    expect(msg).toContain("⚠️");
    expect(msg).toContain("rm -rf dist/");
    expect(msg).toContain("允许");
    expect(msg).toContain("拒绝");
  });

  it("parses user approval response", () => {
    const handler = new PermissionHandler();
    expect(handler.parseApprovalResponse("允许")).toBe("allow");
    expect(handler.parseApprovalResponse("拒绝")).toBe("deny");
    expect(handler.parseApprovalResponse("yes")).toBe("allow");
    expect(handler.parseApprovalResponse("no")).toBe("deny");
    expect(handler.parseApprovalResponse("random text")).toBeNull();
  });

  it("tracks pending permission by sender", () => {
    const handler = new PermissionHandler();
    handler.setPending("user1", { permissionId: "perm_1", sessionId: "ses_1" });
    expect(handler.getPending("user1")).toEqual({ permissionId: "perm_1", sessionId: "ses_1" });
    handler.clearPending("user1");
    expect(handler.getPending("user1")).toBeNull();
  });
});
