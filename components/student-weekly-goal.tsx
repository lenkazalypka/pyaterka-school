"use client";

import { useActionState } from "react";
import { saveWeeklyGoal, type WeeklyGoalState } from "@/app/student/actions";

export function StudentWeeklyGoal({ points, target }: { points: number; target: number | null }) {
  const [state, action, pending] = useActionState(saveWeeklyGoal, { error: null } satisfies WeeklyGoalState);
  return <form action={action} className="student-weekly-goal">
    <div><small>Цель недели</small><b>{target ? `${points} из ${target} баллов` : `${points} баллов набрано`}</b></div>
    <label><span className="sr-only">Цель в баллах</span><input name="targetPoints" type="number" min={1} max={10000} defaultValue={target ?? undefined} placeholder="Например, 50" required /></label>
    <button className="button button-light button-small" disabled={pending}>{pending ? "Сохраняем…" : target ? "Изменить" : "Задать цель"}</button>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="form-success" role="status">{state.success}</p>}
  </form>;
}
