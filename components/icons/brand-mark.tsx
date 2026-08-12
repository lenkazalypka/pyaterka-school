type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path
        className="brand-mark-five"
        d="M20.5 8.5h31.2v8.3H27.8l-2.1 13.4c4.1-3.7 9.2-5.7 14.9-5.7 11.3 0 19.4 7.6 19.4 18.5 0 11.9-9.1 19.8-22.4 19.8-11.2 0-19.6-6.1-21.6-15.6h10.1c1.7 4.6 5.8 7.3 11.6 7.3 7.5 0 12.2-4.4 12.2-11.4 0-6.6-4.7-10.9-11.8-10.9-5.2 0-9.2 2-12.7 6.2H15.2L20.5 8.5Z"
      />
      <path className="brand-mark-bar" d="M21.1 7h32.2a4.7 4.7 0 0 1 0 9.4H19.5L21.1 7Z" />
      <path className="brand-mark-spark" d="M37.4 36.6c.7 3.8 2.8 5.9 6.7 6.6-3.9.7-6 2.8-6.7 6.7-.7-3.9-2.8-6-6.7-6.7 3.9-.7 6-2.8 6.7-6.6Z" />
    </svg>
  );
}
