"use client";

import { useEffect, useRef } from "react";
import { saveProfileStep } from "@/app/onboarding/actions";
import { contactMethods, supportedTimezones } from "@/lib/onboarding-config";
import type { ProfileDraft } from "@/types/onboarding";
import { FormShell, fieldClass } from "./form-shell";

export function ProfileForm({ initial, autoTimezone }: { initial: ProfileDraft; autoTimezone: boolean }) {
  const timezoneRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (!autoTimezone) return;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezoneRef.current && supportedTimezones.some((zone) => zone.value === detected)) timezoneRef.current.value = detected;
  }, [autoTimezone]);
  return <FormShell action={saveProfileStep}>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-bold">Имя<input className={fieldClass} name="firstName" defaultValue={initial.firstName} required/></label>
      <label className="text-sm font-bold">Фамилия<input className={fieldClass} name="lastName" defaultValue={initial.lastName} required/></label>
      <label className="text-sm font-bold">Дата рождения<input className={fieldClass} name="birthDate" type="date" defaultValue={initial.birthDate} required/></label>
      <label className="text-sm font-bold">Телефон<input className={fieldClass} name="phone" type="tel" autoComplete="tel" defaultValue={initial.phone} required/></label>
      <label className="text-sm font-bold">Город<input className={fieldClass} name="city" defaultValue={initial.city} required/></label>
      <label className="text-sm font-bold">Часовой пояс<select ref={timezoneRef} className={fieldClass} name="timezone" defaultValue={initial.timezone}>{supportedTimezones.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}</select></label>
      <label className="text-sm font-bold">Класс<select className={fieldClass} name="grade" defaultValue={initial.grade}>{[5,6,7,8,9,10,11].map((grade) => <option key={grade} value={grade}>{grade} класс</option>)}</select></label>
      <label className="text-sm font-bold">Школа<input className={fieldClass} name="school" defaultValue={initial.school} required/></label>
      <label className="text-sm font-bold sm:col-span-2">Как удобнее связаться<select className={fieldClass} name="contactMethod" defaultValue={initial.contactMethod}>{contactMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>
    </div>
  </FormShell>;
}
