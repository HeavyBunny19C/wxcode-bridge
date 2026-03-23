# wxcode-bridge

[![npm version](https://img.shields.io/npm/v/wxcode-bridge)](https://www.npmjs.com/package/wxcode-bridge)
[![License: MIT](https://img.shields.io/github/license/HeavyBunny19C/wxcode-bridge)](https://github.com/HeavyBunny19C/wxcode-bridge/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-blue)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![GitHub stars](https://img.shields.io/github/stars/HeavyBunny19C/wxcode-bridge)](https://github.com/HeavyBunny19C/wxcode-bridge/stargazers)

Open-source bridge connecting WeChat to OpenCode, enabling full remote control of your local AI coding agent from your phone.

开源的微信与 OpenCode 桥接器，让你能通过手机微信远程控制本地 AI 编程助手。

## Overview / 概述

wxcode-bridge acts as a secure gateway between your personal WeChat account and the OpenCode AI agent running on your local machine. By leveraging the iLink (ClawBot) protocol, it allows you to prompt, review, and approve code changes directly from a WeChat chat interface, effectively giving you a mobile IDE experience for your AI agent.

This project is designed for developers who use OpenCode and want the flexibility to monitor long-running tasks or trigger quick fixes while away from their workstations.

<details>
<summary>🇨🇳 中文</summary>

wxcode-bridge 是连接个人微信与本地运行的 OpenCode AI 助手之间的安全网关。通过利用 iLink (爪哥/ClawBot) 协议，它允许你直接在微信聊天界面中进行提示、审查和批准代码更改，为你提供移动端的 AI 编程体验。

该项目专为使用 OpenCode 的开发者设计，方便他们在离开工位时监控耗时任务或触发快速修复。

</details>

## Architecture / 架构设计

The bridge operates as a stateless middleware (with local persistence for session tracking) that translates between WeChat's long-polling HTTP protocol and OpenCode's SDK-based session management.

```
   ┌──────────────┐                          ┌──────────────────┐                        ┌──────────────┐
   │   WeChat     │   iLink HTTP API         │  wxcode-bridge   │   OpenCode SDK         │   OpenCode   │
   │  (ClawBot)   │◄───────────────────────► │                  │◄─────────────────────►  │  (AI Agent)  │
   │              │  Long-poll + Send        │  Bridge Process  │  Session + Prompt      │              │
   └──────────────┘                          └──────────────────┘                        └──────────────┘
         ▲                                          │                                          │
         │                                          ▼                                          ▼
    iOS WeChat                              ~/.wxcode-bridge/                            localhost:4096
    8.0.70+                                 ├── account.json                             opencode serve
    ClawBot plugin                          ├── session.json
                                            └── sync_buf.txt
```

The system is divided into three distinct layers:
1.  **iLink Layer**: Handles the low-level HTTP long-polling protocol, QR code authentication, and message deduplication.
2.  **Bridge Layer**: The core logic that routes messages, parses slash commands, manages session state, and handles permission approvals.
3.  **OpenCode Layer**: Communicates with the local OpenCode server via the official SDK to manage sessions and prompts.

<details>
<summary>🇨🇳 中文</summary>

该桥接器作为一个无状态中间件运行（带有用于会话跟踪的本地持久化），在微信的长轮询 HTTP 协议和 OpenCode 基于 SDK 的会话管理之间进行转换。

系统分为三个不同的层级：
1.  **iLink 层**：处理底层的 HTTP 长轮询协议、二维码身份验证和消息去重。
2.  **桥接层**：核心逻辑，负责路由消息、解析斜杠命令、管理会话状态以及处理权限审批。
3.  **OpenCode 层**：通过官方 SDK 与本地 OpenCode 服务器通信，管理会话和提示词。

</details>

## How It Works / 工作原理

### Message Flow / 消息流转

1.  **Ingress**: When you send a message in WeChat, the ClawBot plugin forwards it to the iLink server.
2.  **Polling**: The bridge process maintains a long-poll connection via `POST /ilink/bot/get_updates` (35s timeout). It uses a `syncBuf` mechanism to ensure no messages are missed or processed twice.
3.  **Extraction**: Text is extracted from the incoming payload. The bridge supports standard text, voice-to-text transcriptions, and quoted replies.
4.  **Routing**:
    *   **Commands**: If the message starts with `/`, it's handled by the local command dispatcher (e.g., `/new`, `/switch`).
    *   **Approvals**: If OpenCode is waiting for permission (e.g., to run a command), the bridge parses the response for keywords like "允许" (allow) or "拒绝" (deny).
    *   **Prompts**: Standard text is forwarded to the active OpenCode session via `session.prompt()`.
5.  **Egress**: The response from OpenCode is cleaned (markdown stripped), split into 2048-byte chunks (WeChat's limit), and sent back via `POST /ilink/bot/send_message`.

### Authentication / 身份验证

The bridge uses a QR-based authentication flow:
1.  Request a bot QR code from iLink.
2.  Render the QR code in the terminal using `qrcode-terminal`.
3.  Poll the status endpoint until the user scans and confirms on their iOS device.
4.  Save the resulting credentials to `~/.wxcode-bridge/account.json` with restricted permissions (chmod 600).

### Resilience / 容错机制

*   **Network**: Long-poll timeouts (AbortError) are handled gracefully as part of the normal protocol cycle.
*   **Backoff**: Consecutive failures trigger an exponential backoff strategy to prevent spamming the iLink API during outages.
*   **Persistence**: Current session IDs and sync buffers are persisted to disk, allowing the bridge to resume exactly where it left off after a restart.

<details>
<summary>🇨🇳 中文</summary>

### 消息流转
1.  **进入**：当你在微信中发送消息时，爪哥 (ClawBot) 插件将其转发到 iLink 服务器。
2.  **轮询**：桥接进程通过 `POST /ilink/bot/get_updates`（35秒超时）维持长轮询连接。它使用 `syncBuf` 机制确保消息不遗漏且不重复处理。
3.  **提取**：从传入的负载中提取文本。桥接器支持标准文本、语音转文字结果以及引用回复。
4.  **路由**：
    *   **命令**：如果消息以 `/` 开头，则由本地命令调度程序处理（如 `/new`, `/switch`）。
    *   **审批**：如果 OpenCode 正在等待权限（例如运行命令），桥接器会解析响应中的关键词，如“允许”或“拒绝”。
    *   **提示**：标准文本通过 `session.prompt()` 转发到活动的 OpenCode 会话。
5.  **发出**：OpenCode 的响应经过清理（去除 Markdown）、按 2048 字节拆分（微信限制），然后通过 `POST /ilink/bot/send_message` 发回。

### 身份验证
桥接器使用基于二维码的验证流程：
1.  从 iLink 请求机器人二维码。
2.  使用 `qrcode-terminal` 在终端渲染二维码。
3.  轮询状态接口，直到用户在 iOS 设备上扫码并确认。
4.  将生成的凭据保存到 `~/.wxcode-bridge/account.json`，并设置严格权限 (chmod 600)。

### 容错机制
*   **网络**：长轮询超时 (AbortError) 被视为正常协议循环的一部分妥善处理。
*   **退避**：连续失败会触发指数退避策略，防止在服务中断期间过度请求 iLink API。
*   **持久化**：当前的会话 ID 和同步缓冲被持久化到磁盘，允许桥接器在重启后恢复到之前的状态。

</details>

## iLink Protocol / iLink 协议

The iLink protocol is a reverse-engineered interface used by WeChat's internal bot platform. It is primarily accessed through the ClawBot plugin on iOS.

*   **Pattern**: HTTP-based long-polling, similar in design to the Telegram Bot API.
*   **Message Types**: `message_type=1` for user messages, `message_type=2` for bot responses.
*   **Item Types**: `type=1` for plain text, `type=3` for voice transcriptions.
*   **Deduplication**: Uses a `sync_buf` (cursor) to track the last seen message.
*   **Security**: Requires an `X-SIGNATURE-TOKEN` and a consistent `X-WECHAT-UIN` for all requests.

*Special thanks to the [Johnixr/claude-code-wechat-channel](https://github.com/Johnixr/claude-code-wechat-channel) project for the initial protocol implementation reference.*

<details>
<summary>🇨🇳 中文</summary>

iLink 协议是微信内部机器人平台使用的逆向工程接口。它主要通过 iOS 上的爪哥 (ClawBot) 插件访问。

*   **模式**：基于 HTTP 的长轮询，设计上类似于 Telegram Bot API。
*   **消息类型**：`message_type=1` 为用户消息，`message_type=2` 为机器人响应。
*   **项类型**：`type=1` 为纯文本，`type=3` 为语音转文字。
*   **去重**：使用 `sync_buf`（游标）跟踪最后看到的消息。
*   **安全**：所有请求都需要 `X-SIGNATURE-TOKEN` 和一致的 `X-WECHAT-UIN`。

*特别感谢 [Johnixr/claude-code-wechat-channel](https://github.com/Johnixr/claude-code-wechat-channel) 项目提供的初始协议实现参考。*

</details>

## Quick Start / 快速开始

1.  **Start OpenCode**: Ensure your OpenCode server is running locally.
    ```bash
    opencode serve --port 4096
    ```

2.  **Setup Bridge**: Initialize the bridge and scan the QR code with your WeChat (iOS only).
    ```bash
    npx wxcode-bridge setup
    ```

3.  **Start Bridge**: Launch the background process.
    ```bash
    npx wxcode-bridge start
    ```

<details>
<summary>🇨🇳 中文</summary>

1.  **启动 OpenCode**：确保你的 OpenCode 服务器在本地运行。
    ```bash
    opencode serve --port 4096
    ```

2.  **设置桥接器**：初始化桥接器并用微信扫码（仅限 iOS）。
    ```bash
    npx wxcode-bridge setup
    ```

3.  **启动桥接器**：启动后台进程。
    ```bash
    npx wxcode-bridge start
    ```

</details>

## Commands / 命令列表

| Command | Description | 描述 |
| :--- | :--- | :--- |
| `/new` | Create a new OpenCode session | 创建新的 OpenCode 会话 |
| `/sessions` | List all active sessions | 列出所有活动会话 |
| `/switch <id>` | Switch to a specific session by ID | 通过 ID 切换到特定会话 |
| `/help` | Show the help message | 显示帮助信息 |

<details>
<summary>🇨🇳 中文</summary>

在微信聊天框中输入上述斜杠命令即可直接控制桥接器行为。

</details>

## Configuration / 配置说明

All configuration and state files are stored in `~/.wxcode-bridge/`:

*   `account.json`: iLink authentication tokens and UIN.
*   `session.json`: The ID of the currently active OpenCode session.
*   `sync_buf.txt`: The cursor for the iLink message stream.

**Environment Variables**:
*   `OPENCODE_BASE_URL`: The URL of your OpenCode server (default: `http://localhost:4096`).

<details>
<summary>🇨🇳 中文</summary>

所有配置和状态文件都存储在 `~/.wxcode-bridge/` 目录下：
*   `account.json`：iLink 身份验证令牌和 UIN。
*   `session.json`：当前活动的 OpenCode 会话 ID。
*   `sync_buf.txt`：iLink 消息流的游标。

**环境变量**：
*   `OPENCODE_BASE_URL`：OpenCode 服务器的 URL（默认：`http://localhost:4096`）。

</details>

## Limitations / 已知限制

*   **iOS Only**: The ClawBot plugin is currently exclusive to iOS WeChat.
*   **Token Expiry**: Tokens typically expire every 24 hours, requiring a fresh `setup` (QR scan).
*   **Message Size**: WeChat limits messages to 2048 bytes. The bridge automatically splits long responses, but very large outputs may be truncated or delayed.
*   **Media**: Only text and voice transcriptions are supported. Images, files, and location sharing are not implemented.
*   **Single User**: The bridge is designed for personal use and does not support multiple concurrent WeChat users.

<details>
<summary>🇨🇳 中文</summary>

*   **仅限 iOS**：爪哥插件目前仅在 iOS 版微信中可用。
*   **令牌过期**：令牌通常每 24 小时过期一次，需要重新运行 `setup` 扫码。
*   **消息大小**：微信限制单条消息为 2048 字节。桥接器会自动拆分长响应，但极大的输出可能会被截断或延迟。
*   **媒体支持**：仅支持文本和语音转文字。尚未实现图片、文件和位置共享。
*   **单用户**：桥接器专为个人使用设计，不支持多个微信用户同时使用。

</details>

## Development / 开发指南

### Scripts / 脚本
*   `npm run build`: Compile TypeScript to JavaScript.
*   `npm run typecheck`: Run static type analysis.
*   `npm test`: Execute unit tests (39 tests).
*   `npm run test:e2e`: Run end-to-end tests (requires a live OpenCode server).

### Project Structure / 项目结构
```text
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
├── tests/                    # Unit tests (vitest)
├── tests/e2e/                # E2E tests (requires live OpenCode)
├── vitest.config.ts
└── vitest.e2e.config.ts
```

<details>
<summary>🇨🇳 中文</summary>

### 脚本
*   `npm run build`：将 TypeScript 编译为 JavaScript。
*   `npm run typecheck`：运行静态类型分析。
*   `npm test`：执行单元测试（共 39 个测试）。
*   `npm run test:e2e`：运行端到端测试（需要运行中的 OpenCode 服务器）。

### 项目结构
*   `cli.ts`：命令行入口（setup / start / help）。
*   `src/ilink/`：iLink 协议客户端（类型、认证、长轮询）。
*   `src/opencode/`：OpenCode SDK 封装（会话、格式化、权限）。
*   `src/bridge.ts`：核心消息路由。
*   `src/commands.ts`：斜杠命令解析。
*   `src/config.ts`：常量、凭据读写、日志。

</details>

## Changelog / 更新日志

### v0.1.0 (2026-03-23)

**Features**
*   Initial release of the WeChat-to-OpenCode bridge.
*   Full iLink protocol support (QR login, long-polling, message sending).
*   Seamless OpenCode SDK integration for session and prompt management.
*   Intelligent message routing with slash command support.
*   WeChat-based permission approval flow (Allow/Deny).
*   Automatic markdown stripping and message splitting for WeChat compatibility.
*   Persistent session state and sync buffer recovery.

**Bug Fixes**
*   Resolved issue where `global.health()` was called on the SDK (switched to `session.list()`).
*   Fixed mapping of `TextPart.content` to the correct `TextPart.text` field.
*   Corrected binary path configuration for npm distribution.

**Testing**
*   39 unit tests covering protocol, routing, and utility modules.
*   4 end-to-end tests verifying live integration with OpenCode.

<details>
<summary>🇨🇳 中文</summary>

### v0.1.0 (2026-03-23)

**特性**
*   微信-OpenCode 桥接器初始版本发布。
*   完整的 iLink 协议支持（扫码登录、长轮询、消息发送）。
*   无缝集成 OpenCode SDK，用于会话和提示词管理。
*   支持斜杠命令的智能消息路由。
*   基于微信的权限审批流程（允许/拒绝）。
*   自动去除 Markdown 并拆分消息，以兼容微信限制。
*   持久化的会话状态和同步缓冲恢复。

**修复**
*   解决了 SDK 上调用不存在的 `global.health()` 的问题（改为使用 `session.list()`）。
*   修复了 `TextPart.content` 到 `TextPart.text` 字段的映射。
*   修正了 npm 分发的二进制路径配置。

**测试**
*   39 个单元测试，覆盖协议、路由和工具模块。
*   4 个端到端测试，验证与 OpenCode 的实时集成。

</details>

## Credits / 致谢

*   [Johnixr/claude-code-wechat-channel](https://github.com/Johnixr/claude-code-wechat-channel) — For the excellent iLink protocol reference.
*   [sst/opencode](https://github.com/sst/opencode) — For the powerful AI coding agent.
*   **WeChat ClawBot** — For providing the bot platform.

## License

MIT © HeavyBunny19C
