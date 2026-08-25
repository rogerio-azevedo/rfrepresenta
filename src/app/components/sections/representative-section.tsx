"use client";

import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { m, useInView } from "motion/react";
import { useRef } from "react";
import { ClipReveal } from "../motion/clip-reveal";
import { FadeIn } from "../motion/fade-in";
import { Magnetic } from "../motion/magnetic";
import { MaskText } from "../motion/mask-text";
import { DURATION, EASE_OUT_EXPO, STAGGER } from "../../motion";
import { siteConfig } from "../../site-config";

type RepresentativeSectionProps = {
  whatsappUrl: string;
};

export function RepresentativeSection({ whatsappUrl }: RepresentativeSectionProps) {
  const quoteRef = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(quoteRef, { once: true, margin: "-10% 0px" });
  const words = siteConfig.contact.teamQuote.split(" ");

  return (
    <section className="representative-section">
      <div className="page-shell representative-grid">
        <ClipReveal className="representative-mark">
          <Image
            src="/images/brand/rf-symbol.png"
            alt="Símbolo RF Representa"
            width={260}
            height={171}
            className="representative-symbol"
          />
        </ClipReveal>

        <div className="representative-copy">
          <FadeIn>
            <p className="eyebrow eyebrow-dark">Atendimento comercial</p>
            <h2>
              <MaskText as="span">{siteConfig.contact.teamHeadline}</MaskText>
            </h2>
          </FadeIn>

          <p className="representative-quote" ref={quoteRef}>
            {words.map((word, index) => (
              <m.span
                className="quote-word"
                key={`${word}-${index}`}
                initial={{ opacity: 0.2, y: 8 }}
                animate={
                  isInView ? { opacity: 1, y: 0 } : { opacity: 0.2, y: 8 }
                }
                transition={{
                  duration: DURATION.base,
                  delay: index * STAGGER.tight,
                  ease: EASE_OUT_EXPO,
                }}
              >
                {word}
              </m.span>
            ))}
          </p>

          <FadeIn delay={0.25}>
            <Magnetic>
              <a
                className="button button-dark"
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle aria-hidden="true" size={20} strokeWidth={1.8} />
                {siteConfig.contact.cta}
              </a>
            </Magnetic>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
