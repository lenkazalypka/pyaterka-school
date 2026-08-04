import { configured, supabase } from "@/lib/supabase";
import { safeHttpsUrl } from "@/lib/safe-url";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  if (!configured()) return new Response("Supabase is not configured", { status: 503 });
  const { materialId } = await params;
  const db = await supabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: material } = await db
    .from("materials")
    .select("id,storage_bucket,storage_path,external_url")
    .eq("id", materialId)
    .maybeSingle();
  if (!material) return new Response("Not found", { status: 404 });

  const externalUrl = safeHttpsUrl(material.external_url);
  if (externalUrl) return Response.redirect(externalUrl, 302);
  if (!material.storage_path) return new Response("File is unavailable", { status: 404 });

  const { data, error } = await db.storage
    .from(material.storage_bucket)
    .createSignedUrl(material.storage_path, 60);
  if (error || !data?.signedUrl) return new Response("File is unavailable", { status: 404 });
  return Response.redirect(data.signedUrl, 302);
}
