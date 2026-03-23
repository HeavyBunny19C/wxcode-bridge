import fs from "node:fs";
import path from "node:path";
import type { AccountData } from "./ilink/types";

export const ILINK_BASE_URL = "https://ilinkai.weixin.qq.com";
export const CHANNEL_VERSION = "0.1.0";
export const BOT_TYPE = "3";
export const LONG_POLL_TIMEOUT_MS = 35_000;
export const MAX_CONSECUTIVE_FAILURES = 3;
export const BACKOFF_DELAY_MS = 30_000;
export const RETRY_DELAY_MS = 2_000;
export const OPENCODE_BASE_URL = "http://localhost:4096";
export const WECHAT_TEXT_BYTE_LIMIT = 2048;

const CONFIG_DIR = path.join(
  process.env.HOME || "~",
  ".wxcode-bridge",
);
const CREDENTIALS_FILE = path.join(CONFIG_DIR, "account.json");
const SESSION_FILE = path.join(CONFIG_DIR, "session.json");
const SYNC_BUF_FILE = path.join(CONFIG_DIR, "sync_buf.txt");

export function getConfigDir(): string { return CONFIG_DIR; }
export function getSyncBufFile(): string { return SYNC_BUF_FILE; }

export function loadCredentials(): AccountData | null {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) return null;
    return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf-8"));
  } catch {
    return null;
  }
}

export function saveCredentials(data: AccountData): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2), "utf-8");
  try { fs.chmodSync(CREDENTIALS_FILE, 0o600); } catch { /* best-effort */ }
}

export function loadSessionId(): string | null {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
    return data.sessionId ?? null;
  } catch {
    return null;
  }
}

export function saveSessionId(sessionId: string): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify({ sessionId, savedAt: new Date().toISOString() }, null, 2), "utf-8");
}

export function loadSyncBuf(): string {
  try {
    if (!fs.existsSync(SYNC_BUF_FILE)) return "";
    return fs.readFileSync(SYNC_BUF_FILE, "utf-8");
  } catch {
    return "";
  }
}

export function saveSyncBuf(buf: string): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(SYNC_BUF_FILE, buf, "utf-8");
}

export function log(msg: string): void {
  process.stderr.write(`[wxcode-bridge] ${msg}\n`);
}

export function logError(msg: string): void {
  process.stderr.write(`[wxcode-bridge] ERROR: ${msg}\n`);
}
