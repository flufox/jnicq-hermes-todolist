import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramIdentity = {
  telegramUserId: string;
  displayName: string;
  languageCode?: string;
};

type TelegramUser = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export class TelegramAuthError extends Error {}

const MAX_AGE_SECONDS = 86_400;
const MAX_FUTURE_SKEW_SECONDS = 300;

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): TelegramIdentity {
  if (!initData || !botToken) throw new TelegramAuthError("Telegram authentication is unavailable");
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash")?.toLowerCase();
  if (!receivedHash || !/^[a-f0-9]{64}$/.test(receivedHash)) {
    throw new TelegramAuthError("Invalid Telegram signature");
  }
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = createHmac("sha256", secret).update(dataCheckString).digest();
  const suppliedHash = Buffer.from(receivedHash, "hex");
  if (suppliedHash.length !== expectedHash.length || !timingSafeEqual(suppliedHash, expectedHash)) {
    throw new TelegramAuthError("Invalid Telegram signature");
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isSafeInteger(authDate)) throw new TelegramAuthError("Invalid Telegram auth date");
  if (authDate > nowSeconds + MAX_FUTURE_SKEW_SECONDS) {
    throw new TelegramAuthError("Telegram auth date is in the future");
  }
  if (nowSeconds - authDate > MAX_AGE_SECONDS) throw new TelegramAuthError("Telegram authentication expired");

  const rawUser = params.get("user");
  if (!rawUser) throw new TelegramAuthError("Telegram user is missing");
  let user: TelegramUser;
  try {
    user = JSON.parse(rawUser) as TelegramUser;
  } catch {
    throw new TelegramAuthError("Telegram user is invalid");
  }
  const telegramUserId = String(user.id ?? "");
  if (!/^\d+$/.test(telegramUserId)) throw new TelegramAuthError("Telegram user ID is invalid");
  const displayName = [user.first_name, user.last_name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .trim();
  return {
    telegramUserId,
    displayName: displayName || user.username?.trim() || `Telegram ${telegramUserId}`,
    ...(user.language_code ? { languageCode: user.language_code } : {}),
  };
}
