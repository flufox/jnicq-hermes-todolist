type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: { user?: { language_code?: string } };
  colorScheme?: "light" | "dark";
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  enableClosingConfirmation?: () => void;
  HapticFeedback?: {
    impactOccurred?: (style: "light" | "medium" | "heavy") => void;
    notificationOccurred?: (type: "error" | "success" | "warning") => void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function initializeTelegram(): void {
  const webApp = window.Telegram?.WebApp;
  webApp?.ready?.();
  webApp?.expand?.();
  webApp?.setHeaderColor?.("#f5f4ef");
  webApp?.setBackgroundColor?.("#f5f4ef");
  webApp?.enableClosingConfirmation?.();
}

export function telegramInitData(): string {
  return window.Telegram?.WebApp?.initData ?? "";
}

export function telegramLanguage(): string | undefined {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
}

export function haptic(kind: "light" | "medium" | "success" | "error" = "light"): void {
  const feedback = window.Telegram?.WebApp?.HapticFeedback;
  if (kind === "success" || kind === "error") feedback?.notificationOccurred?.(kind);
  else feedback?.impactOccurred?.(kind);
}
