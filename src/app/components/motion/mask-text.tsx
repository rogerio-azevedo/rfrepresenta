"use client";

import { m, useInView } from "motion/react";
import { useRef, type ElementType } from "react";
import { DURATION, EASE_OUT_EXPO, STAGGER } from "../../motion";

type MaskTextProps = {
  children: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  once?: boolean;
};

export function MaskText({
  children,
  as: Tag = "span",
  className = "",
  delay = 0,
  once = true,
}: MaskTextProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once, margin: "-8% 0px" });
  const lines = children.split("\n").filter(Boolean);

  return (
    <Tag
      ref={ref}
      className={`mask-text ${className}`.trim()}
      aria-label={children.replace(/\n/g, " ")}
    >
      {lines.map((line, index) => (
        <span className="mask-line" key={`${line}-${index}`}>
          <m.span
            className="mask-line-inner"
            initial={{ y: "110%" }}
            animate={isInView ? { y: "0%" } : { y: "110%" }}
            transition={{
              duration: DURATION.slow,
              delay: delay + index * STAGGER.base,
              ease: EASE_OUT_EXPO,
            }}
          >
            {line}
          </m.span>
        </span>
      ))}
    </Tag>
  );
}
