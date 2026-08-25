"use client";

import { m, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { DURATION, EASE_OUT_EXPO } from "../../motion";

type ClipRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
};

const clipFrom = {
  up: "inset(100% 0% 0% 0%)",
  down: "inset(0% 0% 100% 0%)",
  left: "inset(0% 100% 0% 0%)",
  right: "inset(0% 0% 0% 100%)",
} as const;

export function ClipReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: ClipRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
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
      className={`clip-reveal ${className}`.trim()}
      initial={{ clipPath: clipFrom[direction], opacity: 0.4 }}
      animate={
        isInView
          ? { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }
          : { clipPath: clipFrom[direction], opacity: 0.4 }
      }
      transition={{ duration: DURATION.hero, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </m.div>
  );
}
