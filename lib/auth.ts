import { redirect } from "next/navigation";
import type { RoleCode } from "@/types/domain";
import { configured, supabase } from "./supabase";

export function roleHomePath(roles: RoleCode[]) {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("teacher")) return "/teacher";
  if (roles.includes("curator")) return "/curator";
  if (roles.includes("parent")) return "/parent";
  return "/student";
}

export async function getAuthenticatedContext() {
  if (!configured()) redirect("/login");
  const db = await supabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await db.from("user_roles").select("roles(code)").eq("user_id", user.id);
  const roles = ((data ?? []) as unknown as { roles: { code: RoleCode } | null }[])
    .flatMap((row) => row.roles ? [row.roles.code] : []);
  return { db, user, roles };
}

export async function requireRole(role: RoleCode) {
  const context = await getAuthenticatedContext();
  if (!context.roles.includes(role) && !context.roles.includes("admin")) redirect("/unauthorized");
  return context;
}

export async function requireAnyRole(roles: RoleCode[]) {
  const context = await getAuthenticatedContext();
  if (!roles.some((role) => context.roles.includes(role)) && !context.roles.includes("admin")) redirect("/unauthorized");
  return context;
}

export async function requireStudent() {
  const context = await getAuthenticatedContext();
  if (!context.roles.includes("student")) redirect("/unauthorized");
  return context;
}
