# wechat-opencode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An open-source bridge connecting WeChat (微信) to OpenCode (sst/opencode). This project enables you to remotely control your local AI coding agent directly from your personal WeChat via the iLink/ClawBot (爪哥) protocol.

## Architecture

```
┌─────────────┐     iLink API      ┌──────────────────┐     SDK       ┌─────────────┐
│  微信 WeChat │ ◄──────────────── │  wechat-opencode  │ ────────────► │  OpenCode   │
│  (ClawBot)   │  HTTP long-poll   │  (bridge process) │  localhost    │  (AI agent) │
└─────────────┘                    └──────────────────┘               └─────────────┘
```

## Quick Start

1. **Start OpenCode**: Run the OpenCode server on your local machine.
   ```bash
   opencode serve --port 4096
   ```

2. **Setup WeChat**: Initialize the bridge and scan the QR code (扫码) with your WeChat.
   ```bash
   npx wechat-opencode setup
   ```

3. **Start Bridge**: Launch the bridge process to start routing messages.
   ```bash
   npx wechat-opencode start
   ```

Once started, you can send messages to the ClawBot in WeChat to interact with OpenCode.

## Prerequisites

- **Node.js**: Version 18 or higher.
- **OpenCode CLI**: Installed and running (`opencode serve --port 4096`).
- **iOS WeChat**: Version 8.0.70+ with the ClawBot (爪哥) plugin enabled.
  - To enable: iOS 微信 → 设置 → 插件 → 启用 ClawBot.
- **Note**: Currently, the ClawBot plugin is exclusive to iOS.

## Configuration

The project uses a local configuration file to store credentials and session information. By default, these are managed via the `setup` command. Ensure your `opencode` instance is accessible at the configured port (default 4096).

## Slash Commands

Use these commands in your WeChat chat with ClawBot to manage OpenCode sessions:

| Command | Description |
| :--- | :--- |
| `/new` | Create a new OpenCode session |
| `/sessions` | List all active sessions |
| `/switch <id>` | Switch to a specific session by ID |
| `/help` | Show the help message |

## Limitations

- **iOS Only**: ClawBot is currently only available on iOS devices.
- **24h Keepalive**: The iLink token may expire after 24 hours, requiring a re-scan of the QR code.
- **Message Limit**: WeChat has a 2048-byte limit per message. Large responses are automatically split.
- **Text Only**: Only plain text messages are supported. Images and file transfers are not yet implemented.

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request or open an issue for bugs and feature requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Credits and Prior Art

- [Johnixr/claude-code-wechat-channel](https://github.com/Johnixr/claude-code-wechat-channel) — Original iLink protocol implementation, from which the iLink client was ported.
- [sst/opencode](https://github.com/sst/opencode) — The OpenCode AI coding agent.
- **iLink/ClawBot by WeChat** — The WeChat bot platform.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
