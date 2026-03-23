<h1 align="center">wxcode-bridge</h1>

<p align="center">
  <strong>Bring your OpenCode agent into WeChat. Code anywhere, anytime.</strong>
</p>

<p align="center">
  <a href="./README.en.md">English</a> · <a href="./README.md">中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/wxcode-bridge?style=flat-square&logo=npm" alt="npm" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/license-MIT-purple?style=flat-square" alt="MIT License" />
</p>

<p align="center">
  <em>Your AI coding assistant, now just a QR scan away from your favorite chat app.</em>
</p>

## 🤔 What Is This?

Picture this: It's 2 AM, you're cozy in bed, and you suddenly remember a long-running AI task that needs checking. Or you're commuting and want to kick off a quick code review. 

`wxcode-bridge` is built for these moments. It acts as a bridge between your local OpenCode agent and WeChat—the app that's already on your phone 24/7. It's like having a remote control for your AI assistant right in your pocket.

**Important Note:** This is NOT a cloud service. Your code stays on your machine. `wxcode-bridge` simply bridges the chat protocol so you can talk to your agent from anywhere.

## 🏗️ Architecture

The design is lightweight and focused on reliability, consisting of three main layers:

```
   ┌──────────────┐                          ┌──────────────────┐                        ┌──────────────┐
   │   📱 WeChat   │   iLink HTTP API         │  🌉 wxcode-bridge │   OpenCode SDK        │   🤖 OpenCode │
   │  (ClawBot)   │◄───────────────────────► │                  │◄────────────────────►  │  (AI Agent)  │
   │              │  Long-poll + Send        │  Bridge Process  │  Session + Prompt      │              │
   └──────────────┘                          └──────────────────┘                        └──────────────┘
         ▲                                          │                                          │
         │                                          ▼                                          ▼
    iOS WeChat                              ~/.wxcode-bridge/                            localhost:4096
    8.0.70+                                 ├── account.json                             opencode serve
    ClawBot plugin                          ├── session.json
                                            └── sync_buf.txt
```

1.  **WeChat (ClawBot)**: The user interface where you send and receive messages.
2.  **Bridge (wxcode-bridge)**: The core logic that maintains a long-poll connection with WeChat servers, parses messages, and routes them to OpenCode.
3.  **Agent (OpenCode)**: The AI brain that processes your requests and generates code or answers.

## ⚡ How It Works

### Message Flow

1.  You type a message in WeChat → ClawBot catches it → iLink server holds it.
2.  `wxcode-bridge` long-polls every 35s → grabs new messages.
3.  Text is extracted (supports plain text, voice transcriptions, and quoted replies).
4.  **Routing**: Is it a slash command (like `/new`)? Handle it locally. Is it a permission request? Parse the allow/deny response. Otherwise, forward it to OpenCode.
5.  OpenCode responds → Markdown is stripped → Message is split into 2048-byte chunks → Sent back to WeChat.

### QR Authentication

The login process is a robust state machine:
- Fetch a login QR code → Display it in your terminal.
- Poll status: Wait → Scanned → Confirmed (or Expired).
- Save credentials to `account.json` with `chmod 600` for security.

The total deadline is 480s, with 35s per poll and a 2s delay between retries.

### Resilience

- **AbortError Handling**: Long-poll timeouts are treated as normal behavior, not errors.
- **Backoff Strategy**: 3 consecutive failures trigger a 30s cooldown to prevent API spamming.
- **Persistence**: Session state is saved to disk, allowing the bridge to survive restarts.
- **Deduplication**: `sync_buf.txt` acts as a cursor to ensure no message is processed twice.

## 🔗 iLink Protocol

This project uses a reverse-engineered iLink protocol (no official documentation available):
- HTTP long-polling pattern (similar to Telegram Bot API).
- `message_type`: 1 for user, 2 for bot.
- `item type`: 1 for text, 3 for voice.
- `syncBuf` for cursor-style pagination and deduplication.
- Auth: Handled via `X-SIGNATURE-TOKEN` and `X-WECHAT-UIN` headers.
- **Credit**: Ported from [Johnixr/claude-code-wechat-channel](https://github.com/Johnixr/claude-code-wechat-channel) (MIT).

## 🚀 Quick Start

Get up and running in three simple steps:

1.  **Start OpenCode Service**:
    ```bash
    opencode serve
    ```

2.  **Install and Start the Bridge**:
    ```bash
    npx wxcode-bridge start
    ```

3.  **Scan to Login**:
    A QR code will appear in your terminal. Scan it with your WeChat app and confirm the login.

## 💬 Commands

Control the bridge directly from your chat window:

| Command | Purpose |
| :--- | :--- |
| `/new` | Start a brand new OpenCode session |
| `/switch` | Switch between existing sessions |
| `/help` | Show help and available commands |
| `/status` | Check connection and OpenCode status |

## ⚙️ Configuration

All data is stored in `~/.wxcode-bridge/`:
- `account.json`: Your WeChat credentials (keep this safe!).
- `session.json`: Current OpenCode session info.
- `sync_buf.txt`: Message sync cursor.

### Key Constants

| Constant | Value | Purpose |
| :--- | :--- | :--- |
| `LONG_POLL_TIMEOUT_MS` | 35,000 | iLink long-poll timeout |
| `MAX_CONSECUTIVE_FAILURES` | 3 | Failures before backoff cooldown |
| `BACKOFF_DELAY_MS` | 30,000 | Cooldown duration |
| `RETRY_DELAY_MS` | 2,000 | Delay between poll retries |
| `WECHAT_TEXT_BYTE_LIMIT` | 2,048 | Max WeChat message size |

## ⚠️ Limitations

- ⚠️ **Markdown**: WeChat doesn't support Markdown natively, so formatting is stripped for readability.
- ⚠️ **Files**: Currently supports text and voice (transcribed). Direct file transfers are not yet implemented.
- ⚠️ **Network**: The machine running the bridge needs internet access to reach WeChat servers and local access to OpenCode.

## 🛠️ Development

The project is structured for easy exploration and contribution:

```
wxcode-bridge/
├── cli.ts                    # CLI entry point (setup / start / help)
├── src/
│   ├── ilink/
│   │   ├── types.ts          # iLink message types and text extraction
│   │   ├── auth.ts           # QR scan login flow
│   │   └── client.ts         # Long-poll getUpdates + sendMessage
│   ├── opencode/
│   │   ├── client.ts         # OpenCode SDK wrapper (session mgmt)
│   │   ├── formatter.ts      # Markdown → WeChat plain text
│   │   └── permissions.ts    # Permission approval flow
│   ├── bridge.ts             # Core message routing
│   ├── commands.ts           # Slash commands (/new /switch /help)
│   └── config.ts             # Constants, credential I/O, logging
├── tests/                    # Unit tests (39 tests, powered by vitest)
└── tests/e2e/                # E2E tests (4 tests, against live OpenCode)
```

## 📋 Changelog

### v0.1.0 (2026-03-23)

**🎉 Features**
- Initial release.
- iLink protocol client (QR login, long-poll, send).
- OpenCode SDK integration (session management, prompting).
- Core bridge with message routing and slash commands.
- Permission approval flow (Allow/Deny directly from WeChat).
- Markdown stripping and automatic message splitting.
- Session persistence and auto-recovery.

**🐛 Bug Fixes**
- Fix: SDK missing `global.health()` → switched to `session.list()` for health checks.
- Fix: `TextPart.content` was undefined → corrected to `TextPart.text`.
- Fix: Invalid npm bin path configuration.

**🧪 Testing**
- 39 unit tests covering all core modules.
- 4 e2e tests verifying integration with a live OpenCode server.

## 🙏 Credits

- [Johnixr/claude-code-wechat-channel](https://github.com/Johnixr/claude-code-wechat-channel) (MIT) — iLink protocol pioneer.
- [sst/opencode](https://github.com/sst/opencode) — The powerful AI coding agent.
- WeChat ClawBot — The bot platform.

## License

MIT
