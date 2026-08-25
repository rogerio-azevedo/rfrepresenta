"use client";

import { m, useScroll, useSpring, useTransform } from "motion/react";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  return (
    <m.div
      className="scroll-progress"
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
}
