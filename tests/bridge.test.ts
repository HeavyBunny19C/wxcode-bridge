import { describe, it, expect, vi, beforeEach } from "vitest";
import { Bridge } from "../src/bridge";

describe("Bridge message routing", () => {
  it("routes user message to OpenCode and sends reply", async () => {
    const mockSendText = vi.fn().mockResolvedValue("client_1");
    const mockSendPrompt = vi.fn().mockResolvedValue("Here is the fix.");
    const mockIsHealthy = vi.fn().mockResolvedValue(true);
    const mockCreateSession = vi.fn().mockResolvedValue("ses_1");

    const bridge = new Bridge({
      sendText: mockSendText,
      sendPrompt: mockSendPrompt,
      isHealthy: mockIsHealthy,
      createSession: mockCreateSession,
    });

    // Set a session before handling message
    bridge.setSessionId("ses_1");

    await bridge.handleIncomingMessage({
      from_user_id: "user1",
      message_type: 1,
      item_list: [{ type: 1, text_item: { text: "fix the bug" } }],
      context_token: "ctx1",
    });

    expect(mockSendPrompt).toHaveBeenCalledWith("ses_1", "fix the bug");
    expect(mockSendText).toHaveBeenCalledWith("user1", "Here is the fix.", "ctx1");
  });

  it("routes /help command without calling OpenCode", async () => {
    const mockSendText = vi.fn().mockResolvedValue("c1");
    const mockSendPrompt = vi.fn();

    const bridge = new Bridge({
      sendText: mockSendText,
      sendPrompt: mockSendPrompt,
      isHealthy: vi.fn().mockResolvedValue(true),
      createSession: vi.fn().mockResolvedValue("ses_1"),
    });

    await bridge.handleIncomingMessage({
      from_user_id: "user1",
      message_type: 1,
      item_list: [{ type: 1, text_item: { text: "/help" } }],
      context_token: "ctx1",
    });

    expect(mockSendPrompt).not.toHaveBeenCalled();
    expect(mockSendText).toHaveBeenCalled();
  });

  it("creates session on /new command", async () => {
    const mockSendText = vi.fn().mockResolvedValue("c1");
    const mockCreateSession = vi.fn().mockResolvedValue("ses_new");

    const bridge = new Bridge({
      sendText: mockSendText,
      sendPrompt: vi.fn(),
      isHealthy: vi.fn().mockResolvedValue(true),
      createSession: mockCreateSession,
    });

    bridge.setSessionId("ses_old");

    await bridge.handleIncomingMessage({
      from_user_id: "user1",
      message_type: 1,
      item_list: [{ type: 1, text_item: { text: "/new" } }],
      context_token: "ctx1",
    });

    expect(mockCreateSession).toHaveBeenCalled();
    expect(mockSendText).toHaveBeenCalledWith("user1", expect.stringContaining("ses_new"), "ctx1");
  });

  it("auto-creates session if none exists", async () => {
    const mockSendText = vi.fn().mockResolvedValue("c1");
    const mockSendPrompt = vi.fn().mockResolvedValue("answer");
    const mockCreateSession = vi.fn().mockResolvedValue("auto_ses");

    const bridge = new Bridge({
      sendText: mockSendText,
      sendPrompt: mockSendPrompt,
      isHealthy: vi.fn().mockResolvedValue(true),
      createSession: mockCreateSession,
    });
    // Don't set sessionId — bridge should auto-create

    await bridge.handleIncomingMessage({
      from_user_id: "user1",
      message_type: 1,
      item_list: [{ type: 1, text_item: { text: "hello" } }],
      context_token: "ctx1",
    });

    expect(mockCreateSession).toHaveBeenCalled();
    expect(mockSendPrompt).toHaveBeenCalledWith("auto_ses", "hello");
  });

  it("ignores bot messages (message_type 2)", async () => {
    const mockSendPrompt = vi.fn();

    const bridge = new Bridge({
      sendText: vi.fn().mockResolvedValue("c1"),
      sendPrompt: mockSendPrompt,
      isHealthy: vi.fn().mockResolvedValue(true),
      createSession: vi.fn().mockResolvedValue("ses_1"),
    });

    await bridge.handleIncomingMessage({
      from_user_id: "bot1",
      message_type: 2,  // bot message
      item_list: [{ type: 1, text_item: { text: "bot reply" } }],
      context_token: "ctx1",
    });

    expect(mockSendPrompt).not.toHaveBeenCalled();
  });
});
