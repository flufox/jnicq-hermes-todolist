import { describe, expect, test } from "vitest";

import { validateSetupValues } from "../cli/setup-values";

describe("setup input validation", () => {
  test("normalizes safe setup answers", () => {
    expect(
      validateSetupValues({
        domain: "https://todo.example.com/",
        acmeEmail: "admin@example.com",
        timeZone: "Europe/Moscow",
        locale: "ru",
        homeName: "Мой дом",
      }),
    ).toEqual({
      domain: "todo.example.com",
      acmeEmail: "admin@example.com",
      timeZone: "Europe/Moscow",
      locale: "ru",
      homeName: "Мой дом",
    });
  });

  test("rejects values that could inject extra dotenv settings", () => {
    expect(() =>
      validateSetupValues({
        domain: "todo.example.com\nCOMPOSE_FILE=attacker.yml",
        acmeEmail: "admin@example.com",
        timeZone: "UTC",
        locale: "en",
        homeName: "My Home",
      }),
    ).toThrow(/domain/i);
    expect(() =>
      validateSetupValues({
        domain: "todo.example.com",
        acmeEmail: "admin@example.com",
        timeZone: "UTC",
        locale: "en",
        homeName: "My Home\nCOMPOSE_PROFILES=external-proxy",
      }),
    ).toThrow(/Home name/i);
  });

  test("rejects invalid public hosts, email addresses, and timezones", () => {
    const valid = { domain: "todo.example.com", acmeEmail: "admin@example.com", timeZone: "UTC", locale: "en", homeName: "My Home" };
    expect(() => validateSetupValues({ ...valid, domain: "https://todo.example.com/path" })).toThrow(/domain/i);
    expect(() => validateSetupValues({ ...valid, acmeEmail: "not-an-email" })).toThrow(/email/i);
    expect(() => validateSetupValues({ ...valid, timeZone: "Mars/Olympus" })).toThrow(/timezone/i);
  });
});
