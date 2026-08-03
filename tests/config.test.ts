import { describe, expect, test } from "vitest";
import { isDockerSecretMountPath, loadConfig } from "../server-src/config.js";

describe("loadConfig", () => {
  test("production defaults to loopback and never enables demo authentication", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      HERMES_TODO_TELEGRAM_BOT_TOKEN: "123456:test",
      HERMES_TODO_PUBLIC_URL: "https://todo.example.com",
    });
    expect(config).toMatchObject({ host: "127.0.0.1", port: 3000, demoAuth: false });
  });

  test("demo authentication fails closed outside an explicit loopback development process", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        HERMES_TODO_HOST: "0.0.0.0",
        HERMES_TODO_DEMO_AUTH: "true",
        HERMES_TODO_TELEGRAM_BOT_TOKEN: "123456:test",
        HERMES_TODO_PUBLIC_URL: "https://todo.example.com",
      }),
    ).toThrow(/demo authentication/i);
    expect(() =>
      loadConfig({
        NODE_ENV: "development",
        HERMES_TODO_HOST: "0.0.0.0",
        HERMES_TODO_DEMO_AUTH: "true",
      }),
    ).toThrow(/loopback/i);
  });

  test("only canonical Linux Docker secret mounts bypass host file mode checks", () => {
    expect(isDockerSecretMountPath("/run/secrets/telegram_bot_token", "linux")).toBe(true);
    expect(isDockerSecretMountPath("/run/secrets/../telegram_bot_token", "linux")).toBe(false);
    expect(isDockerSecretMountPath("/tmp/telegram_bot_token", "linux")).toBe(false);
    expect(isDockerSecretMountPath("/run/secrets/telegram_bot_token", "win32")).toBe(false);
  });
});
