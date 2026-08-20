import Link from "next/link";
import { BrandMark } from "@/components/icons/brand-mark";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`brand ${inverse ? "brand-inverse" : ""}`} aria-label="elio — на главную">
    <BrandMark className="brand-mark" />
    <span>elio</span>
  </Link>;
}
