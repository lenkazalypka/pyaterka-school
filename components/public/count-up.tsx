"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  duration?: number;
  to: number;
};

function cubicBezierEaseOut(progress: number) {
  const x1 = 0.16;
  const y1 = 1;
  const x2 = 0.3;
  const y2 = 1;
  let parameter = progress;

  for (let iteration = 0; iteration < 5; iteration += 1) {
    const inverse = 1 - parameter;
    const x = 3 * inverse * inverse * parameter * x1
      + 3 * inverse * parameter * parameter * x2
      + parameter * parameter * parameter;
    const derivative = 3 * inverse * inverse * x1
      + 6 * inverse * parameter * (x2 - x1)
      + 3 * parameter * parameter * (1 - x2);

    if (Math.abs(derivative) < 0.0001) break;
    parameter -= (x - progress) / derivative;
  }

  const clamped = Math.min(1, Math.max(0, parameter));
  const inverse = 1 - clamped;

  return 3 * inverse * inverse * clamped * y1
    + 3 * inverse * clamped * clamped * y2
    + clamped * clamped * clamped;
}

export function CountUp({ duration = 1000, to }: CountUpProps) {
  const elementRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      frameRef.current = requestAnimationFrame(() => setValue(to));
      return () => {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        const startedAt = performance.now();
        const update = (now: number) => {
          const progress = Math.min(1, (now - startedAt) / duration);
          setValue(Math.round(to * cubicBezierEaseOut(progress)));

          if (progress < 1) frameRef.current = requestAnimationFrame(update);
        };

        frameRef.current = requestAnimationFrame(update);
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

  return <strong ref={elementRef} aria-label={String(to)}><span aria-hidden="true">{value}</span></strong>;
}
