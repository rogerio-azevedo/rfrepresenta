"use client";

import {
  m,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef, type ReactNode } from "react";
import { SPRING } from "../../motion";

type ParallaxProps = {
  children: ReactNode;
  className?: string;
  speed?: number;
  scale?: [number, number];
};

export function Parallax({
  children,
  className = "",
  speed = 0.15,
  scale = [1, 1],
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rawY = useTransform(scrollYProgress, [0, 1], [`-${speed * 100}%`, `${speed * 100}%`]);
  const y = useSpring(rawY, SPRING.smooth);
  const rawScale = useTransform(scrollYProgress, [0, 1], scale);
  const scaleValue = useSpring(rawScale, SPRING.smooth);

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
      style={{ y, scale: scaleValue }}
    >
      {children}
    </m.div>
  );
}
