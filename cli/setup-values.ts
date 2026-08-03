export type SetupValues = {
  domain: string;
  acmeEmail: string;
  timeZone: string;
  locale: "en" | "ru";
  homeName: string;
};

function safeLine(label: string, value: string, maxLength: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error(`${label} is not valid`);
  }
  return normalized;
}

function publicDomain(value: string): string {
  const raw = safeLine("Domain", value, 253);
  let parsed: URL;
  try {
    parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("Domain is not valid");
  }
  if (
    !new Set(["http:", "https:"]).has(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("Domain must be a public hostname without a path, port, query, or credentials");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    !hostname.includes(".") ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(hostname)
  ) {
    throw new Error("Domain must be a valid public hostname");
  }
  return hostname;
}

export function validateSetupValues(input: {
  domain: string;
  acmeEmail: string;
  timeZone: string;
  locale: string;
  homeName: string;
}): SetupValues {
  const acmeEmail = safeLine("ACME email", input.acmeEmail, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acmeEmail)) throw new Error("ACME email is not valid");
  const timeZone = safeLine("Home timezone", input.timeZone, 100);
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(new Date(0));
  } catch {
    throw new Error("Home timezone must be a valid IANA timezone");
  }
  if (input.locale !== "en" && input.locale !== "ru") throw new Error("Language must be en or ru");
  const homeName = safeLine("Home name", input.homeName, 80);
  return { domain: publicDomain(input.domain), acmeEmail, timeZone, locale: input.locale, homeName };
}
