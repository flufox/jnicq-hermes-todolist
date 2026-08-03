import { createHmac } from "node:crypto";
import { describe, expect, test } from "vitest";
import { verifyTelegramInitData } from "../server-src/telegram-auth.js";

const BOT_TOKEN = "123456:TEST_BOT_TOKEN";

function signedInitData(userId: string, authDate: number): string {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
    user: JSON.stringify({ id: Number(userId), first_name: "Alex", language_code: "en" }),
  });
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  params.set("hash", createHmac("sha256", secret).update(dataCheckString).digest("hex"));
  return params.toString();
}

describe("verifyTelegramInitData", () => {
  test("accepts a current Telegram-signed identity", () => {
    const nowSeconds = 1_800_000_000;
    expect(verifyTelegramInitData(signedInitData("10001", nowSeconds - 30), BOT_TOKEN, nowSeconds)).toMatchObject({
      telegramUserId: "10001",
      displayName: "Alex",
      languageCode: "en",
    });
  });

  test("rejects stale, future, and tampered initData", () => {
    const nowSeconds = 1_800_000_000;
    expect(() =>
      verifyTelegramInitData(signedInitData("10001", nowSeconds - 86_401), BOT_TOKEN, nowSeconds),
    ).toThrow(/expired/i);
    expect(() =>
      verifyTelegramInitData(signedInitData("10001", nowSeconds + 301), BOT_TOKEN, nowSeconds),
    ).toThrow(/future/i);
    expect(() =>
      verifyTelegramInitData(signedInitData("10001", nowSeconds).replace("Alex", "Mallory"), BOT_TOKEN, nowSeconds),
    ).toThrow(/signature/i);
  });
});
