"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { hashInvitationToken } from "@/lib/invitations";
import { configured, supabase } from "@/lib/supabase";

export type InviteState = { error: string | null; success?: string | null };
const tokenSchema = z.string().min(64).max(200);

export async function acceptParentInvitation(_: InviteState, formData: FormData): Promise<InviteState> {
  if (!configured()) return { error: "Подключите Supabase" };
  const token = tokenSchema.safeParse(formData.get("token"));
  if (!token.success) return { error: "Ссылка приглашения повреждена" };
  const db = await supabase();
  let { data: { user } } = await db.auth.getUser();
  if (!user) {
    const parsed = z.object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(254),
      password: z.string().min(8).max(128),
    }).safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: "Укажите имя, email из приглашения и пароль от 8 символов" };
    const origin = appUrl();
    const {data,error}=await db.auth.signUp({email:parsed.data.email,password:parsed.data.password,options:{data:{first_name:parsed.data.name,intended_role:"parent"},emailRedirectTo:`${origin}/invite/parent?token=${encodeURIComponent(token.data)}`}});
    if(error)return{error:"Не удалось продолжить регистрацию. Проверьте данные или попробуйте войти."};
    if(!data.session)return{error:null,success:"Подтвердите email и снова откройте ссылку приглашения."};
    user=data.user;
  }
  if(!user)return{error:"Не удалось подтвердить аккаунт"};
  let tokenHash:string;
  try{tokenHash=await hashInvitationToken(token.data);}catch{return{error:"Сервис приглашений не настроен"};}
  const {data,error}=await db.rpc("accept_parent_invitation",{p_token_hash:tokenHash});
  if(error||!data)return{error:"Приглашение недействительно, истекло или предназначено для другого email"};
  redirect("/parent");
}
