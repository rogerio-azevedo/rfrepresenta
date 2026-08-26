"use client";

import Image from "next/image";
import { ArrowDown, MessageCircle } from "lucide-react";
import {
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef } from "react";
import { FadeIn } from "../motion/fade-in";
import { MaskText } from "../motion/mask-text";
import { Parallax } from "../motion/parallax";
import { DURATION, EASE_OUT_EXPO, STAGGER } from "../../motion";
import { siteConfig } from "../../site-config";

type HeroSectionProps = {
  whatsappUrl: string;
  heroImageUrl?: string;
};

const heroFacts = [
  { strong: "Todo Mato Grosso", span: "Atendimento comercial" },
  { strong: "Cama, banho e conforto", span: "Portfólio Altenburg" },
  { strong: "Contato direto", span: siteConfig.contact.heroFactLabel },
];

export function HeroSection({ whatsappUrl, heroImageUrl = "/images/altenburg/hero-edredom.jpg" }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const overlayOpacity = useTransform(scrollYProgress, [0, 0.75], [0.36, 0.82]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section className="hero" id="inicio" ref={sectionRef}>
      <Parallax className="hero-image-wrap" speed={0.12} scale={[1.06, 1]}>
        <Image
          className="hero-image"
          src={heroImageUrl}
          alt="Quarto com roupa de cama e edredom Altenburg"
          fill
          priority
          sizes="100vw"
        />
      </Parallax>

      <div className="hero-grain" aria-hidden="true" />
      <div className="hero-shade" aria-hidden="true" />
      <m.div
        className="hero-scroll-shade"
        aria-hidden="true"
        style={{ opacity: overlayOpacity }}
      />

      <m.div
        className="hero-content page-shell"
        style={
          prefersReducedMotion
            ? undefined
            : { y: contentY, opacity: contentOpacity }
        }
      >
        <FadeIn delay={0.1}>
          <p className="eyebrow">Representação comercial em Mato Grosso</p>
        </FadeIn>

        <h1 className="hero-title">
          <MaskText as="span" className="hero-title-line" delay={0.15}>
            RF Representa
          </MaskText>
        </h1>

        <FadeIn delay={0.35}>
          <p className="hero-lead">
            Coleções Altenburg para lojistas que querem oferecer mais conforto,
            qualidade e design aos seus clientes.
          </p>
        </FadeIn>

        <FadeIn delay={0.45}>
          <p className="hero-support">{siteConfig.contact.heroSupport}</p>
        </FadeIn>

        <FadeIn className="hero-actions" delay={0.55}>
          <a
            className="button button-primary"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle aria-hidden="true" size={20} strokeWidth={1.8} />
            {siteConfig.contact.cta}
          </a>
          <a className="text-link text-link-light" href="#portfolio">
            Conhecer o portfólio
            <ArrowDown aria-hidden="true" size={18} strokeWidth={1.8} />
          </a>
        </FadeIn>
      </m.div>

      <div className="hero-facts">
        {heroFacts.map((fact, index) => (
          <m.div
            key={fact.strong}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: DURATION.base,
              delay: 0.7 + index * STAGGER.relaxed,
              ease: EASE_OUT_EXPO,
            }}
          >
            <strong>{fact.strong}</strong>
            <span>{fact.span}</span>
          </m.div>
        ))}
      </div>

      <m.div
        className="hero-scroll-indicator"
        aria-hidden="true"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <span />
      </m.div>
    </section>
  );
}
