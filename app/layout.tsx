import type { Metadata } from "next";
import "./globals.css";
import "./public-v2.css";
import "./public-v9-base.css";
import "./public-v9-components.css";
import "./public-v9-responsive.css";
import "./diagnostic-test.css";

export const metadata: Metadata = {
  title: { default: "elio — подготовка к ЕГЭ и ОГЭ", template: "%s · elio" },
  description: "Подготовка к ЕГЭ и ОГЭ с понятным планом, живыми занятиями и следующим шагом на каждый день.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><a className="skip-link" href="#main-content">Перейти к содержанию</a><div id="main-content">{children}</div></body></html>;
}
