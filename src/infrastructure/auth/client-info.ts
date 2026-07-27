export function parseUserAgent(userAgent: string | null | undefined): {
  browser: string;
  os: string;
  deviceLabel: string;
} {
  if (!userAgent) {
    return { browser: "Unknown", os: "Unknown", deviceLabel: "Unknown device" };
  }

  let browser = "Unknown Browser";
  if (userAgent.includes("Edg/")) browser = "Microsoft Edge";
  else if (userAgent.includes("Chrome/")) browser = "Google Chrome";
  else if (userAgent.includes("Firefox/")) browser = "Mozilla Firefox";
  else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome")) browser = "Safari";

  let os = "Unknown OS";
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac OS")) os = "macOS";
  else if (userAgent.includes("Linux")) os = "Linux";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";

  return { browser, os, deviceLabel: `${browser} on ${os}` };
}

export function getClientIp(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    undefined
  );
}
