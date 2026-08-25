"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { MotionConfig } from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type SmoothScrollContextValue = {
  lenis: Lenis | null;
};

const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  lenis: null,
});

export function useLenis() {
  return useContext(SmoothScrollContext).lenis;
}

type SmoothScrollProviderProps = {
  children: ReactNode;
};

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const instance = new Lenis({
      lerp: 0.1,
      duration: 1.1,
      smoothWheel: true,
    });

    setLenis(instance);

    let frameId = 0;
    const raf = (time: number) => {
      instance.raf(time);
      frameId = requestAnimationFrame(raf);
    };

    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return (
    <SmoothScrollContext.Provider value={{ lenis }}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </SmoothScrollContext.Provider>
  );
}
