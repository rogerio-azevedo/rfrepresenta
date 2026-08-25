"use client";

import { ArrowRight, MapPin } from "lucide-react";
import { m, useInView } from "motion/react";
import { useRef } from "react";
import { DURATION, EASE_OUT_EXPO } from "../../motion";

type TerritorySectionProps = {
  whatsappUrl: string;
};

export function TerritorySection({ whatsappUrl }: TerritorySectionProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20% 0px" });

  return (
    <section className="territory-band" ref={ref}>
      <div className="page-shell territory-inner">
        <MapPin aria-hidden="true" size={32} strokeWidth={1.5} />
        <div>
          <p>Presença comercial</p>
          <h2>Atendimento em todo Mato Grosso.</h2>
        </div>
        <a
          className="text-link text-link-light"
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          Consultar atendimento
          <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
        </a>
      </div>

      <svg
        className="territory-outline"
        viewBox="0 0 420 180"
        aria-hidden="true"
      >
        <m.path
          d="M40 120 C80 40, 140 30, 190 50 C240 70, 280 40, 340 60 C380 75, 400 95, 390 120 C370 150, 300 160, 220 150 C140 140, 70 150, 40 120 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0.3 }}
          animate={
            isInView
              ? { pathLength: 1, opacity: 0.55 }
              : { pathLength: 0, opacity: 0.3 }
          }
          transition={{ duration: DURATION.hero, ease: EASE_OUT_EXPO }}
        />
      </svg>
    </section>
  );
}
