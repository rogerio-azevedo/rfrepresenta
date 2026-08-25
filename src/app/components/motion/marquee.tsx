"use client";

import { m } from "motion/react";

type MarqueeProps = {
  items: string[];
  className?: string;
};

export function Marquee({ items, className = "" }: MarqueeProps) {
  const content = [...items, ...items];

  return (
    <div className={`marquee ${className}`.trim()}>
      <m.div
        className="marquee-track"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 28,
            ease: "linear",
          },
        }}
      >
        {content.map((item, index) => (
          <span className="marquee-item" key={`${item}-${index}`}>
            {item}
            <span aria-hidden="true">·</span>
          </span>
        ))}
      </m.div>
    </div>
  );
}
