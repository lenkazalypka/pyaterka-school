"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type CountUpProps = {
  duration?: number;
  to: number;
};

type CountStyle = CSSProperties & { "--count-duration": string };

export function CountUp({ duration = 1000, to }: CountUpProps) {
  const elementRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = () => {
      setIsActive(true);
      if (prefersReducedMotion) {
        setValue(to);
        return;
      }

      const startedAt = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(to * eased));
        if (progress < 1) frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    };

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      frameRef.current = requestAnimationFrame(start);
      return () => {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        start();
        observer.disconnect();
      },
      { threshold: 0.4 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [duration, to]);

  const style: CountStyle = { "--count-duration": `${duration}ms` };
  return <strong ref={elementRef} data-count-up className={isActive ? "is-active" : undefined} aria-label={String(to)} style={style}><span aria-hidden="true">{value}</span></strong>;
}
