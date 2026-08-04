import { Check } from "lucide-react";
import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`brand ${inverse ? "brand-inverse" : ""}`} aria-label="Пятёрка — на главную">
    <span className="brand-mark" aria-hidden="true"><b>5</b><Check /></span>
    <span>Пятёрка</span>
  </Link>;
}
