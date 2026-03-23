#!/usr/bin/env node
import { doQRLogin } from "./src/ilink/auth";
import { getUpdates, sendTextMessage } from "./src/ilink/client";
import { OpenCodeClient } from "./src/opencode/client";
import { Bridge } from "./src/bridge";
import {
  loadCredentials,
  ILINK_BASE_URL,
  OPENCODE_BASE_URL,
  log,
  logError,
  loadSessionId,
  saveSessionId,
  loadSyncBuf,
  saveSyncBuf,
  RETRY_DELAY_MS,
  MAX_CONSECUTIVE_FAILURES,
  BACKOFF_DELAY_MS,
} from "./src/config";
import { MSG_TYPE_USER } from "./src/ilink/types";

const args = process.argv.slice(2);
const command = args[0] ?? "start";

async function main() {
  switch (command) {
    case "setup": {
      const account = await doQRLogin(ILINK_BASE_URL);
      if (!account) {
        logError("登录失败");
        process.exit(1);
      }
      log("✅ 设置完成！运行 wechat-opencode start 启动桥接");
      break;
    }
    case "start": {
      const oc = new OpenCodeClient(OPENCODE_BASE_URL);
      if (!(await oc.isHealthy())) {
        logError("OpenCode 未运行。请先执行: opencode serve --port 4096");
        process.exit(1);
      }
      log("✅ OpenCode 已连接");

      let account = loadCredentials();
      if (!account) {
        log("未找到微信凭据，启动扫码登录...");
        account = await doQRLogin(ILINK_BASE_URL);
        if (!account) {
          logError("登录失败");
          process.exit(1);
        }
      }
      log(`✅ 微信已连接 (${account.accountId})`);

      const bridge = new Bridge({
        sendText: (toUserId, text, contextToken) =>
          sendTextMessage(account!.baseUrl, account!.token, toUserId, text, contextToken),
        sendPrompt: (sessionId, text) => oc.sendPrompt(sessionId, text),
        isHealthy: () => oc.isHealthy(),
        createSession: async () => {
          const id = await oc.createSession();
          saveSessionId(id);
          return id;
        },
      });

      const savedSessionId = loadSessionId();
      if (savedSessionId) {
        bridge.setSessionId(savedSessionId);
        log(`📎 恢复会话: ${savedSessionId}`);
      }

      log("🚀 桥接已启动，在微信中发消息开始对话");
      let syncBuf = loadSyncBuf();
      let consecutiveFailures = 0;

      while (true) {
        try {
          const response = await getUpdates(account.baseUrl, account.token, syncBuf);

          if (response.get_updates_buf) {
            syncBuf = response.get_updates_buf;
            saveSyncBuf(syncBuf);
          }

          consecutiveFailures = 0;

          const msgs = response.msgs ?? [];
          for (const msg of msgs) {
            if (msg.message_type === MSG_TYPE_USER) {
              await bridge.handleIncomingMessage(msg);
            }
          }
        } catch (error: any) {
          consecutiveFailures++;
          logError(`轮询失败 (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${error?.message ?? error}`);

          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            logError(`连续失败 ${MAX_CONSECUTIVE_FAILURES} 次，等待 ${BACKOFF_DELAY_MS / 1000}s 后重试`);
            await new Promise((r) => setTimeout(r, BACKOFF_DELAY_MS));
            consecutiveFailures = 0;
          } else {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          }
        }
      }
      break;
    }
    case "help":
    default:
      console.log(`
wechat-opencode — 微信 ↔ OpenCode 桥接

用法:
  wechat-opencode setup    微信扫码登录
  wechat-opencode start    启动桥接（默认）
  wechat-opencode help     显示帮助

前提:
  1. opencode serve --port 4096  (先启动 OpenCode)
  2. iOS 微信 8.0.70+ 已开启 ClawBot 插件
`);
  }
}

main().catch((err) => {
  logError(`Fatal: ${String(err)}`);
  process.exit(1);
});
