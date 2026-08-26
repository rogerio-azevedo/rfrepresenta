"use client";

import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import { FadeIn } from "../motion/fade-in";
import { Counter } from "../motion/counter";
import { MaskText } from "../motion/mask-text";
import { siteConfig } from "../../site-config";

type AltenburgSectionProps = {
  whatsappUrl: string;
  mediaImageUrl?: string;
};

export function AltenburgSection({ whatsappUrl, mediaImageUrl = "/images/altenburg/cama-serenity.jpg" }: AltenburgSectionProps) {
  return (
    <section className="altenburg-section" id="altenburg">
      <div className="altenburg-frame">
        <div className="altenburg-media">
          <Image
            src={mediaImageUrl}
            alt="Cama Altenburg com estampa botânica em ambiente acolhedor"
            fill
            sizes="(max-width: 1080px) 100vw, 590px"
          />
        </div>

        <div className="altenburg-copy">
        <FadeIn className="altenburg-intro">
          <p className="eyebrow eyebrow-brand">Marca principal representada</p>
          <Image
            className="altenburg-logo"
            src={siteConfig.brands[0].logo}
            alt="Altenburg"
            width={248}
            height={40}
          />
          <h2>
            <MaskText as="span">
              {"Mais de um século ampliando o bem-estar dentro de casa."}
            </MaskText>
          </h2>
          <p className="body-large">
            A Altenburg combina tradição, inovação, design e tecnologia em um
            portfólio amplo de cama, travesseiros e banho.
          </p>
        </FadeIn>

        <FadeIn className="altenburg-points-wrap" delay={0.1}>
          <ul className="brand-points">
            <li>
              <Check aria-hidden="true" size={18} strokeWidth={2} />
              Qualidade e conforto em diferentes linhas
            </li>
            <li>
              <Check aria-hidden="true" size={18} strokeWidth={2} />
              Mix para diversos perfis de loja e consumidor
            </li>
            <li>
              <Check aria-hidden="true" size={18} strokeWidth={2} />
              Presença de marca com tradição no segmento
            </li>
          </ul>
        </FadeIn>

        <FadeIn className="altenburg-stats" delay={0.18}>
          {siteConfig.stats.map((stat) => (
            <div className="altenburg-stat" key={stat.label}>
              <Counter
                className="altenburg-stat-value"
                value={stat.value}
                suffix={stat.suffix}
              />
              <p className="altenburg-stat-label">{stat.label}</p>
            </div>
          ))}
        </FadeIn>

        <FadeIn delay={0.24}>
          <a
            className="text-link text-link-light brand-link"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            Conversar sobre a Altenburg
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
          </a>
        </FadeIn>
        </div>
      </div>
    </section>
  );
}
