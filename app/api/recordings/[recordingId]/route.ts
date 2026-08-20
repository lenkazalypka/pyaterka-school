import { configured, supabase } from "@/lib/supabase";
import { safeHttpsUrl } from "@/lib/safe-url";

export const dynamic = "force-dynamic";

function trustedStorageUrl(value: string | null | undefined) {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value || !configuredUrl) return null;
  try {
    const candidate = new URL(value);
    const project = new URL(configuredUrl);
    return candidate.origin === project.origin && candidate.pathname.startsWith("/storage/v1/") ? candidate.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ recordingId: string }> }) {
  if (!configured()) return new Response("Supabase is not configured", { status: 503 });
  const { recordingId } = await params;
  const db = await supabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: recording } = await db
    .from("lesson_recordings")
    .select("id,storage_path,external_url")
    .eq("id", recordingId)
    .eq("status", "published")
    .maybeSingle();
  if (!recording) return new Response("Not found", { status: 404 });

  const externalUrl = safeHttpsUrl(recording.external_url);
  if (externalUrl) return Response.redirect(externalUrl, 302);
  if (!recording.storage_path) return new Response("Recording is unavailable", { status: 404 });

  const { data, error } = await db.storage
    .from("lesson-recordings")
    .createSignedUrl(recording.storage_path, 60);
  if (error || !data?.signedUrl) return new Response("Recording is unavailable", { status: 404 });
  const signedUrl = trustedStorageUrl(data.signedUrl);
  if (!signedUrl) return new Response("Recording is unavailable", { status: 404 });

  const range = request.headers.get("range");
  const upstream = await fetch(signedUrl, {
    cache: "no-store",
    headers: range ? { Range: range } : undefined,
    signal: request.signal,
  });
  if (!upstream.ok) return new Response("Recording is unavailable", { status: upstream.status === 416 ? 416 : 502 });

  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["accept-ranges", "content-length", "content-range", "content-type", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
