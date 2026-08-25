"use client";

import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { FadeIn } from "../motion/fade-in";
import { Magnetic } from "../motion/magnetic";
import { MaskText } from "../motion/mask-text";

type FinalCtaSectionProps = {
  whatsappUrl: string;
};

export function FinalCtaSection({ whatsappUrl }: FinalCtaSectionProps) {
  return (
    <section className="final-cta">
      <div className="final-cta-media">
        <Image
          src="/images/altenburg/edredom-moment.jpg"
          alt="Ambiente de quarto com edredom Altenburg"
          fill
          sizes="100vw"
        />
      </div>
      <div className="final-cta-shade" aria-hidden="true" />

      <FadeIn className="final-cta-content page-shell">
        <p className="eyebrow">Vamos conversar?</p>
        <h2>
          <MaskText as="span">
            {"Leve conforto e qualidade\npara o mix da sua loja."}
          </MaskText>
        </h2>
        <Magnetic className="final-cta-button-wrap">
          <a
            className="button button-primary"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle aria-hidden="true" size={20} strokeWidth={1.8} />
            Falar com Rodrigo no WhatsApp
          </a>
        </Magnetic>
      </FadeIn>
    </section>
  );
}
