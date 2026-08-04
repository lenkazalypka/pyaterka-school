import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";

const documents = {
  privacy: { title: "Политика конфиденциальности", paragraphs: ["Это рабочий черновик страницы. До запуска приёма реальных заявок владелец школы должен добавить реквизиты оператора персональных данных, сроки хранения и утверждённую редакцию документа.", "Платформа проектируется по принципу минимизации данных: доступ к профилю ограничен ролью и подтверждёнными связями, а чувствительные операции выполняются на сервере.", "По вопросам обработки данных контакт школы будет опубликован вместе с юридическими реквизитами."] },
  consent: { title: "Согласие на обработку персональных данных", paragraphs: ["Это рабочий черновик согласия, а не финальная юридическая редакция.", "При регистрации пользователь передаёт имя, email и технические данные, необходимые для создания аккаунта. В онбординге дополнительно запрашиваются учебные цели, предметы и предпочтения расписания.", "Для несовершеннолетних до production-запуска должна быть утверждена отдельная процедура получения необходимых согласий законного представителя."] },
  offer: { title: "Публичная оферта", paragraphs: ["Это рабочий черновик. Он не содержит вымышленных реквизитов, цен или номера договора и не заменяет утверждённую оферту школы.", "В текущем MVP подписка создаётся со статусом pending и активируется администратором вручную. Онлайн-платёж на сайте не выполняется.", "Условия обучения, возврата, рассрочки и применения материнского капитала должны быть опубликованы после юридического согласования."] },
} as const;

type DocumentSlug = keyof typeof documents;
const isDocument = (value: string): value is DocumentSlug => value in documents;

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }): Promise<Metadata> {
  const { document } = await params;
  return { title: isDocument(document) ? documents[document].title : "Документ" };
}

export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (!isDocument(document)) notFound();
  const content = documents[document];
  return <main className="legal-page"><header><Brand /><Link className="button button-secondary button-small" href="/">На главную</Link></header><article><span className="legal-draft">Черновик · требует юридического утверждения</span><h1>{content.title}</h1><p className="legal-date">Версия от 1 августа 2026 года</p>{content.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</article></main>;
}
