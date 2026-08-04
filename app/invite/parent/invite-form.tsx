"use client";

import { useActionState } from "react";
import { acceptParentInvitation, type InviteState } from "./actions";

const input="h-12 w-full rounded-xl border border-[var(--border-soft)] bg-white px-4";
export function InviteForm({token,authenticated}:{token:string;authenticated:boolean}){
  const[state,action,pending]=useActionState(acceptParentInvitation,{error:null} satisfies InviteState);
  return <form action={action} className="mt-7 space-y-4"><input type="hidden" name="token" value={token}/>{!authenticated&&<><label className="block text-sm font-bold">Имя<input className={`${input} mt-2`} name="name" required/></label><label className="block text-sm font-bold">Email из приглашения<input className={`${input} mt-2`} name="email" type="email" required/></label><label className="block text-sm font-bold">Пароль<input className={`${input} mt-2`} name="password" type="password" minLength={8} required/></label></>}{state.error&&<p role="alert" className="rounded-xl bg-[var(--surface-rose)] p-3 text-sm text-[var(--brand-primary)]">{state.error}</p>}{state.success&&<p role="status" className="rounded-xl bg-[var(--brand-soft)] p-3 text-sm text-[var(--brand-burgundy)]">{state.success}</p>}<button disabled={pending} className="h-12 w-full rounded-xl bg-[var(--brand-primary)] font-bold text-white disabled:opacity-60">{pending?"Проверяем…":"Подтвердить связь"}</button></form>;
}
