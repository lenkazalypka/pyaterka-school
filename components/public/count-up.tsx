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

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      frameRef.current = requestAnimationFrame(() => setIsActive(true));
      return () => {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        frameRef.current = requestAnimationFrame(() => setIsActive(true));
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
  return <strong ref={elementRef} data-count-up className={isActive ? "is-active" : undefined} aria-label={String(to)} style={style}><span aria-hidden="true">{to}</span></strong>;
}
