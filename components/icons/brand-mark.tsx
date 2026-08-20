type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect className="brand-mark-field" x="4" y="4" width="56" height="56" rx="18" />
      <path className="brand-mark-route" d="M18 34c0-9.2 6.7-15.7 15.5-15.7 8.2 0 13.8 5.2 13.8 12.4 0 2.2-.4 3.8-.8 5H25.8c.9 4.8 4.7 7.6 9.7 7.6 3.4 0 6.3-1 9.2-3.1" />
      <circle className="brand-mark-point" cx="47.5" cy="16.5" r="4.5" />
    </svg>
  );
}
