"use client";

import { LazyMotion, domAnimation } from "motion/react";
import type { ReactNode } from "react";
import { SmoothScrollProvider } from "./smooth-scroll";

type MotionProviderProps = {
  children: ReactNode;
};

export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      <SmoothScrollProvider>{children}</SmoothScrollProvider>
    </LazyMotion>
  );
}
