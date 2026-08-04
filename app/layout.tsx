import type { Metadata } from "next";
import "./globals.css";
import "./public-v2.css";

export const metadata: Metadata = {
  title: { default: "Пятёрка — подготовка к ЕГЭ и ОГЭ", template: "%s · Пятёрка" },
  description: "Подготовка к ЕГЭ и ОГЭ без хаоса: живые занятия, практика, записи и понятный план до цели.",
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
