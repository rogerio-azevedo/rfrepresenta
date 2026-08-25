"use client";

import { m, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { DURATION, EASE_OUT_EXPO } from "../../motion";

type FadeInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

export function FadeIn({
  children,
  className = "",
  delay = 0,
  y = 24,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-8% 0px" });
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: DURATION.base, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </m.div>
  );
}
