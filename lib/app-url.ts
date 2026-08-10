export function appUrl(): string {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!value) {
    if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
    throw new Error("NEXT_PUBLIC_APP_URL is required in production");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be an absolute URL");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS in production");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_APP_URL must be an origin without a path, query, or fragment");
  }
  return url.origin;
}
