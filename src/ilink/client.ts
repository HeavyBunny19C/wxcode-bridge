import type { GetUpdatesResponse, SendMessageResponse } from "./types";
import { MSG_STATE_FINISH } from "./types";
import { buildHeaders } from "./auth";
import { LONG_POLL_TIMEOUT_MS, CHANNEL_VERSION, log } from "../config";

export function generateClientId(): string {
  return `wxcode-bridge:${Date.now()}:${Math.random().toString(36).slice(2, 11)}`;
}

export async function getUpdates(
  baseUrl: string,
  token: string,
  syncBuf: string
): Promise<GetUpdatesResponse> {
  try {
    const url = `${baseUrl}/ilink/bot/getupdates`;
    const body = JSON.stringify({
      get_updates_buf: syncBuf,
      longpolling_timeout_ms: LONG_POLL_TIMEOUT_MS,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(token, body),
      body,
      signal: AbortSignal.timeout(LONG_POLL_TIMEOUT_MS + 5000),
    });

    if (!response.ok) {
      throw new Error(`getUpdates failed: ${response.status}`);
    }

    const text = await response.text();
    return JSON.parse(text);
  } catch (error: any) {
    // Timeout is normal for long-polling
    if (error.name === "AbortError") {
      return { msgs: [], get_updates_buf: syncBuf };
    }
    throw error;
  }
}

export async function sendTextMessage(
  baseUrl: string,
  token: string,
  toUserId: string,
  text: string,
  contextToken?: string
): Promise<string> {
  const clientId = generateClientId();
  const url = `${baseUrl}/ilink/bot/sendmessage`;
  
  const body = JSON.stringify({
    base_info: {
      channel_version: CHANNEL_VERSION,
    },
    msg: {
      to_user_id: toUserId,
      client_id: clientId,
      message_type: 2,
      message_state: MSG_STATE_FINISH,
      context_token: contextToken,
      item_list: [{
        type: 1,
        text_item: { text },
      }],
    },
  });


  const response = await fetch(url, {
    method: "POST",
    headers: buildHeaders(token, body),
    body,
  });

  log(`sendmessage response: ${response.status}`);
  const respText = await response.text();
  log(`sendmessage body: ${respText.slice(0, 200)}`);

  if (!response.ok) {
    throw new Error(`sendTextMessage HTTP failed: ${response.status} ${respText}`);
  }

  const data = JSON.parse(respText) as SendMessageResponse;
  if (data.ret !== 0) {
    throw new Error(`sendTextMessage API error: ret=${data.ret} errcode=${data.errcode} errmsg=${data.errmsg}`);
  }

  return clientId;
}
