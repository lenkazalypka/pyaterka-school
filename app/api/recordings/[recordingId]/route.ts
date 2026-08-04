import { configured, supabase } from "@/lib/supabase";
import { safeHttpsUrl } from "@/lib/safe-url";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ recordingId: string }> }) {
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
  return Response.redirect(data.signedUrl, 302);
}
