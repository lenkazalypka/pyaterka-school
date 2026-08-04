"use client";

import { useState } from "react";
import { saveParentStep } from "@/app/onboarding/actions";
import type { ParentDraft } from "@/types/onboarding";
import { FormShell, fieldClass } from "./form-shell";

export function ParentForm({ initial }: { initial: ParentDraft }) {
  const [invite, setInvite] = useState(initial.inviteRequested);
  return <FormShell action={saveParentStep} hidden={<input type="hidden" name="inviteRequested" value={String(invite)}/>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={()=>setInvite(true)} aria-pressed={invite} className={`rounded-2xl border p-5 text-left ${invite?"border-[var(--brand-primary)] bg-[var(--brand-soft)]":"border-[var(--border-soft)] bg-white"}`}><b>Пригласить сейчас</b><span className="mt-2 block text-sm text-[var(--text-muted)]">Родитель получит отдельный аккаунт и подтвердит связь.</span></button>
      <button type="button" onClick={()=>setInvite(false)} aria-pressed={!invite} className={`rounded-2xl border p-5 text-left ${!invite?"border-[var(--brand-primary)] bg-[var(--brand-soft)]":"border-[var(--border-soft)] bg-white"}`}><b>Сделать позже</b><span className="mt-2 block text-sm text-[var(--text-muted)]">Приглашение можно будет отправить из профиля.</span></button>
    </div>
    {invite&&<div className="grid gap-5 rounded-2xl border border-[var(--border-soft)] bg-white p-5 sm:grid-cols-2">
      <label className="text-sm font-bold">Имя родителя<input className={fieldClass} name="parentName" defaultValue={initial.parentName} required/></label>
      <label className="text-sm font-bold">Степень родства<input className={fieldClass} name="relation" defaultValue={initial.relation} placeholder="Мама, папа, опекун" required/></label>
      <label className="text-sm font-bold">Email<input className={fieldClass} name="email" type="email" defaultValue={initial.email} required/></label>
      <label className="text-sm font-bold">Телефон<input className={fieldClass} name="phone" type="tel" defaultValue={initial.phone}/></label>
      <p className="text-sm text-[var(--text-muted)] sm:col-span-2">Доступ к данным появится только после принятия защищённого приглашения. Совпадения email недостаточно.</p>
    </div>}
  </FormShell>;
}
