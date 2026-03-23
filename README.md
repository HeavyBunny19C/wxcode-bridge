<h1 align="center">wxcode-bridge</h1>

<p align="center">
  <strong>让你的 OpenCode 助手住进微信，随时随地，指尖编码。</strong>
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
  <em>你的 AI 助手，现在只需扫码，即可在微信里随叫随到。</em>
</p>

## 🤔 这是什么？

想象一下，凌晨两点你正躺在床上，突然想起那个跑了半天的 AI 任务需要确认一下进度。或者你正在通勤的地铁上，想让 AI 帮你预审一段刚提交的代码。

`wxcode-bridge` 就是为了这种时刻诞生的。它像是一座桥梁，把你本地运行的 OpenCode 助手接入到微信里。不需要复杂的 SSH，不需要打开电脑，只要打开那个你每天都在用的微信，就能和你的 AI 助手对话。

**划重点：** 这不是云服务。你的代码依然稳稳地留在你的机器上。`wxcode-bridge` 只是负责搬运聊天消息，让沟通更顺畅。

## 🏗️ 架构

`wxcode-bridge` 的设计非常轻量，主要分为三个层次：

```
   ┌──────────────┐                          ┌──────────────────┐                        ┌──────────────┐
   │   📱 微信     │   iLink HTTP API         │  🌉 wxcode-bridge │   OpenCode SDK        │   🤖 OpenCode │
   │  (ClawBot)   │◄───────────────────────► │                  │◄────────────────────►  │  (AI Agent)  │
   │              │  Long-poll + Send        │  桥接进程         │  Session + Prompt      │              │
   └──────────────┘                          └──────────────────┘                        └──────────────┘
         ▲                                          │                                          │
         │                                          ▼                                          ▼
    iOS 微信                                 ~/.wxcode-bridge/                            localhost:4096
    8.0.70+                                 ├── account.json                             opencode serve
    ClawBot 插件                             ├── session.json
                                            └── sync_buf.txt
```

1.  **微信端 (ClawBot)**：作为用户界面，负责消息的收发。
2.  **桥接层 (wxcode-bridge)**：核心逻辑所在，负责维护与微信服务器的长轮询，解析消息，并转发给 OpenCode。
3.  **助手端 (OpenCode)**：真正的 AI 大脑，处理任务并生成回复。

## ⚡ 工作原理

### 消息流转

1.  你在微信里发条消息 → ClawBot 插件捕获它 → 发送到 iLink 服务器暂存。
2.  `wxcode-bridge` 每 35 秒进行一次长轮询 (Long-poll) → 抓取新消息。
3.  提取文本内容（支持纯文本、语音转文字、引用回复）。
4.  **指令判断**：是斜杠命令（如 `/new`）？本地处理。是权限申请？解析同意或拒绝。否则，转发给 OpenCode。
5.  OpenCode 给出回复 → 剥离 Markdown 格式 → 按 2048 字节切片 → 发回微信。

### 扫码登录

登录过程是一个严谨的状态机：
- 获取登录二维码 → 在终端显示。
- 轮询状态：等待扫码 → 已扫码 → 已确认（或过期）。
- 成功后保存凭据到 `account.json`，并设置 `chmod 600` 权限保护隐私。

整个登录过程有 480 秒的总限时，每 35 秒轮询一次，重试间隔 2 秒。

### 韧性设计

- **AbortError 处理**：长轮询超时被视为正常现象，而非错误。
- **故障退避**：连续 3 次失败后，会自动进入 30 秒的冷却期，避免频繁请求。
- **持久化**：会话状态保存到磁盘，重启后可自动恢复。
- **防重机制**：通过 `sync_buf.txt` 记录游标，确保消息不重不漏。

## 🔗 iLink 协议

本项目使用了逆向工程实现的 iLink 协议（目前尚无官方文档）：
- 采用类似 Telegram Bot API 的 HTTP 长轮询模式。
- `message_type`: 1 代表用户，2 代表机器人。
- `item type`: 1 代表文本，3 代表语音。
- 使用 `syncBuf` 进行增量同步（游标式分页）。
- **鉴权**：通过 `Authorization: Bearer <token>` 和 `AuthorizationType: ilink_bot_token` 请求头完成。
- **请求结构**：消息字段需包装在 `msg` 对象内，包含 `base_info` 字段。
- **致谢**：协议实现参考并移植自 [Johnixr/claude-code-wechat-channel](https://github.com/Johnixr/claude-code-wechat-channel) (MIT)。

## 📝 更新日志

### v0.1.1 (2026-03-24)
- **修复**: 修正 iLink API 请求体结构（字段需包装在 `msg` 对象内）
- **修复**: 添加 `message_state: MSG_STATE_FINISH` 字段
- **修复**: 添加 API 响应 `ret` 字段检查，正确报告发送失败
- **修复**: 修正 `bridge.ts` 中缺失的 `log` 导入
- **改进**: 增强错误处理和日志记录

### v0.1.0 (2026-03-23)

**🎉 新特性**
- 初始版本发布。
- 完整的 iLink 协议客户端（支持二维码登录、长轮询、消息发送）。
- 深度集成 OpenCode SDK（支持会话管理、提示词交互）。
- 核心桥接逻辑，支持消息路由与斜杠命令。
- 完善的权限审批流（可在微信端直接同意或拒绝 AI 的操作）。
- 自动剥离 Markdown 格式并支持长消息自动切片。
- 会话持久化与自动恢复功能。

**🐛 修复**
- 修复：SDK 缺少 `global.health()` 方法，现改用 `session.list()` 进行连通性检查。
- 修复：`TextPart.content` 属性不存在的问题，已修正为 `TextPart.text`。
- 修复：npm bin 路径配置错误导致无法全局调用的问题。

**🧪 测试**
- 包含 39 个单元测试，覆盖所有核心模块。
- 包含 4 个端到端测试，确保与真实 OpenCode 服务协作正常。

## 🚀 快速开始

只需三步，开启你的微信编程之旅：

1.  **启动 OpenCode 服务**：
    ```bash
    opencode serve
    ```

2.  **安装并启动桥接器**：
    ```bash
    npx wxcode-bridge start
    ```

3.  **扫码登录**：
    终端会显示二维码，拿出手机扫一扫，确认登录即可。

## 💬 命令

在微信对话框输入以下命令即可操控：

| 命令 | 说明 |
| :--- | :--- |
| `/new` | 开启一个新的对话会话 |
| `/switch` | 切换到其他已有的会话 |
| `/help` | 显示帮助信息和可用命令列表 |
| `/status` | 查看当前连接状态和 OpenCode 运行情况 |

## ⚙️ 配置

所有的配置和数据都存放在 `~/.wxcode-bridge/` 目录下：
- `account.json`: 微信登录凭据（请妥善保管）。
- `session.json`: 当前 OpenCode 会话信息。
- `sync_buf.txt`: 消息同步游标。

### 核心常量

| 常量 | 默认值 | 用途 |
| :--- | :--- | :--- |
| `LONG_POLL_TIMEOUT_MS` | 35,000 | iLink 长轮询超时时间 |
| `MAX_CONSECUTIVE_FAILURES` | 3 | 触发退避机制前的最大连续失败次数 |
| `BACKOFF_DELAY_MS` | 30,000 | 触发退避后的冷却时间 |
| `RETRY_DELAY_MS` | 2,000 | 轮询重试间隔 |
| `WECHAT_TEXT_BYTE_LIMIT` | 2,048 | 微信单条消息最大字节数 |

## ⚠️ 已知限制

- ⚠️ **Markdown 支持**：微信原生不支持 Markdown，因此回复会被剥离格式，以纯文本显示。
- ⚠️ **文件传输**：目前仅支持文本和语音（转文字），暂不支持直接通过微信发送文件给 AI。
- ⚠️ **网络要求**：运行桥接器的机器需要能够访问外网（连接微信服务器）以及本地的 OpenCode 服务。

## 🛠️ 开发

项目结构清晰，方便二次开发：

```
wxcode-bridge/
├── cli.ts                    # CLI 入口 (安装 / 启动 / 帮助)
├── src/
│   ├── ilink/
│   │   ├── types.ts          # iLink 消息类型定义与文本提取
│   │   ├── auth.ts           # 二维码扫码登录流程
│   │   └── client.ts         # 长轮询 getUpdates 与 sendMessage
│   ├── opencode/
│   │   ├── client.ts         # OpenCode SDK 封装 (会话管理)
│   │   ├── formatter.ts      # Markdown 转微信纯文本
│   │   └── permissions.ts    # 权限审批流程 (同意/拒绝)
│   ├── bridge.ts             # 核心消息路由逻辑
│   ├── commands.ts           # 斜杠命令处理 (/new /switch /help)
│   └── config.ts             # 常量定义、凭据 I/O、日志记录
├── tests/                    # 单元测试 (39 个测试用例, 使用 vitest)
└── tests/e2e/                # 端到端测试 (4 个测试用例, 针对真实 OpenCode)
```

## 🙏 致谢

- [Johnixr/claude-code-wechat-channel](https://github.com/Johnixr/claude-code-wechat-channel) (MIT) — iLink 协议实现的先行者。
- [sst/opencode](https://github.com/sst/opencode) — 强大的 AI 编程助手。
- 微信 ClawBot — 优秀的机器人平台。

## 许可证

MIT
