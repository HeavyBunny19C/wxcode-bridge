import { describe, it, expect } from "vitest";
import { parseCommand, COMMANDS } from "../src/commands";

describe("parseCommand", () => {
  it("parses /new", () => {
    const cmd = parseCommand("/new");
    expect(cmd).toEqual({ command: "new", args: [] });
  });

  it("parses /switch with arg", () => {
    const cmd = parseCommand("/switch ses_123");
    expect(cmd).toEqual({ command: "switch", args: ["ses_123"] });
  });

  it("parses /help", () => {
    const cmd = parseCommand("/help");
    expect(cmd).toEqual({ command: "help", args: [] });
  });

  it("returns null for non-commands", () => {
    expect(parseCommand("hello")).toBeNull();
    expect(parseCommand("fix the /bug")).toBeNull();
  });

  it("parses /sessions", () => {
    const cmd = parseCommand("/sessions");
    expect(cmd).toEqual({ command: "sessions", args: [] });
  });
});
