"use client";

import Image from "next/image";
import { FadeIn } from "../motion/fade-in";
import { ClipReveal } from "../motion/clip-reveal";
import { MaskText } from "../motion/mask-text";
import type { ProductCategory } from "../../site-config";

type PortfolioSectionProps = {
  categories: readonly ProductCategory[];
};

export function PortfolioSection({ categories }: PortfolioSectionProps) {
  return (
    <section className="portfolio-section section-pad" id="portfolio">
      <div className="page-shell">
        <FadeIn className="section-heading heading-split">
          <div>
            <p className="eyebrow eyebrow-dark">Conforto que vende</p>
            <h2>
              <MaskText as="span">{"Um portfólio completo\npara a sua loja."}</MaskText>
            </h2>
          </div>
          <p>
            Produtos que unem presença no ponto de venda, variedade e a
            experiência de uma marca reconhecida pelo cuidado com o bem-estar.
          </p>
        </FadeIn>

        <div className="category-grid" id="categorias">
          {categories.map((category, index) => (
            <ClipReveal
              className={`category-card category-card-${index + 1}`}
              delay={index * 0.08}
              key={category.id}
            >
              <div className="category-card-inner">
                <Image
                  src={category.image}
                  alt={category.imageAlt}
                  fill
                  sizes="(max-width: 720px) 100vw, 50vw"
                />
                <div className="category-copy">
                  <span>0{index + 1}</span>
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                </div>
              </div>
            </ClipReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
