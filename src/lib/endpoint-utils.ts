export const DEFAULT_CALLBACK_PATH = "/api/webhooks/brightpay";

export function normalizeSiteUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return url.origin;
  } catch {
    return "";
  }
}

export function buildCallbackUrl(siteUrl: string, callbackPath: string = DEFAULT_CALLBACK_PATH) {
  const origin = normalizeSiteUrl(siteUrl);
  if (!origin) return "";

  const normalizedPath = callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`;
  return `${origin}${normalizedPath}`;
}

export function getSiteFromCallbackUrl(callbackUrl: string) {
  try {
    return new URL(callbackUrl).origin;
  } catch {
    return callbackUrl;
  }
}

export function getEndpointLimit(accountStatus?: "idle" | "beginner" | "active") {
  if (accountStatus === "idle") return 0;
  if (accountStatus === "beginner") return 3;
  return Infinity;
}
