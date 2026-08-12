import Link from "next/link";
import { z } from "zod";
import { Brand } from "@/components/brand";
import { requireStudent } from "@/lib/auth";

const labels: Record<string, { title: string; text: string }> = {
  succeeded: { title: "Оплата подтверждена", text: "Подписка активирована. Можно переходить к занятиям." },
  pending: { title: "Платёж обрабатывается", text: "Обычно подтверждение занимает несколько секунд. Статус обновится после уведомления ЮKassa." },
  canceled: { title: "Оплата отменена", text: "Деньги не списаны. Вернитесь в кабинет и попробуйте ещё раз." },
  failed: { title: "Оплата не создана", text: "Платёжный сервис не принял запрос. Попробуйте ещё раз позже." },
};

export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<{ payment_id?: string }> }) {
  const params = await searchParams;
  const paymentId = z.uuid().safeParse(params.payment_id);
  const { db } = await requireStudent();
  const { data: payment } = paymentId.success
    ? await db.from("payments").select("status").eq("id", paymentId.data).maybeSingle()
    : { data: null };
  const content = labels[payment?.status ?? "pending"] ?? labels.pending;
  return <main className="grid min-h-screen place-items-center px-6"><section className="card max-w-xl p-8"><Brand /><p className="student-eyebrow mt-10">Оплата тарифа</p><h1 className="mt-3 text-3xl font-extrabold">{content.title}</h1><p className="mt-3 text-[var(--text-muted)]">{content.text}</p><Link className="button button-primary mt-7" href="/student">Вернуться в кабинет</Link></section></main>;
}
