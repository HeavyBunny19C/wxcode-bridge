import type { QRCodeResponse, QRStatusResponse, AccountData } from "./types";
import { BOT_TYPE, log, logError, saveCredentials } from "../config";

export function randomWechatUin(): string {
  return Math.floor(Math.random() * 1e15).toString();
}

export function buildHeaders(token?: string, body?: any): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-WECHAT-UIN": randomWechatUin(),
  };
  if (token) {
    headers["X-SIGNATURE-TOKEN"] = token;
  }
  if (body) {
    headers["X-SIGNATURE-VERSION"] = "1";
    headers["X-SIGNATURE-METHOD"] = "hmacsha256";
  }
  return headers;
}

export async function fetchQRCode(baseUrl: string): Promise<QRCodeResponse> {
  const url = `${baseUrl}/ilink/bot/get_bot_qrcode?bot_type=${BOT_TYPE}`;
  const response = await fetch(url, {
    method: "GET",
    headers: buildHeaders(),
  });
  if (!response.ok) {
    throw new Error(`QR fetch failed: ${response.status}`);
  }
  return response.json();
}

export async function pollQRStatus(baseUrl: string, qrcode: string): Promise<QRStatusResponse> {
  const url = `${baseUrl}/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: buildHeaders(),
    signal: AbortSignal.timeout(35000),
  });
  if (!response.ok) {
    throw new Error(`QR status poll failed: ${response.status}`);
  }
  return response.json();
}

export async function doQRLogin(baseUrl: string): Promise<AccountData | null> {
  try {
    log("获取登录二维码...");
    const qrData = await fetchQRCode(baseUrl);
    
    const qrcode = await import("qrcode-terminal" as string);
    log("请用微信扫描二维码登录:");
    (qrcode as any).generate(qrData.qrcode_img_content, { small: true });
    
    const deadline = Date.now() + 480_000;
    while (Date.now() < deadline) {
      const status = await pollQRStatus(baseUrl, qrData.qrcode);
      
      if (status.status === "confirmed") {
        if (!status.bot_token || !status.ilink_bot_id) {
          logError("登录成功但缺少凭据");
          return null;
        }
        
        const account: AccountData = {
          token: status.bot_token,
          baseUrl: status.baseurl || baseUrl,
          accountId: status.ilink_bot_id,
          userId: status.ilink_user_id,
          savedAt: new Date().toISOString(),
        };
        
        saveCredentials(account);
        log(`✅ 登录成功: ${account.accountId}`);
        return account;
      }
      
      if (status.status === "expired") {
        logError("二维码已过期");
        return null;
      }
      
      if (status.status === "scaned") {
        log("已扫描，等待确认...");
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    logError("登录超时");
    return null;
  } catch (error) {
    logError(`登录失败: ${String(error)}`);
    return null;
  }
}
