import { Brand } from "@/components/brand";
import { configured, supabase } from "@/lib/supabase";
import { InviteForm } from "./invite-form";

export const dynamic="force-dynamic";
export default async function ParentInvitePage({searchParams}:{searchParams:Promise<{token?:string}>}){
  const{token=""}=await searchParams;let authenticated=false;
  if(configured()){const db=await supabase();const{data:{user}}=await db.auth.getUser();authenticated=!!user;}
  return <main className="grid min-h-screen place-items-center px-4 py-10"><section className="card w-full max-w-md p-6 sm:p-8"><Brand/><h1 className="mt-8 text-3xl font-extrabold">Приглашение родителя</h1><p className="mt-3 text-[var(--text-muted)]">Создайте отдельный аккаунт или подтвердите связь из уже открытого родительского аккаунта.</p>{token?<InviteForm token={token} authenticated={authenticated}/>:<p role="alert" className="mt-6 rounded-xl bg-[var(--surface-rose)] p-4 text-[var(--brand-primary)]">В ссылке нет токена приглашения.</p>}</section></main>;
}
