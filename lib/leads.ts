import "server-only";

export function leadCaptureEnabled() {
  return process.env.LEAD_CAPTURE_ENABLED === "true";
}
