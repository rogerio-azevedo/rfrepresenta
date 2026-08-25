"use client";

import Image from "next/image";
import {
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { showcaseProducts } from "../../showcase-products";
import { FadeIn } from "../motion/fade-in";
import { MaskText } from "../motion/mask-text";

export function ShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [maxScroll, setMaxScroll] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const x = useTransform(scrollYProgress, [0, 1], [0, -maxScroll]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const update = () => {
      const styles = getComputedStyle(track);
      const paddingInline =
        parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const endGap = Math.max(window.innerWidth * 0.12, 48);
      const scroll =
        track.scrollWidth - window.innerWidth + paddingInline + endGap;
      setMaxScroll(Math.max(0, scroll));
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const sectionHeight =
    maxScroll > 0 ? `calc(100vh + ${maxScroll}px)` : "100vh";

  return (
    <section
      className="showcase-section"
      ref={sectionRef}
      style={{ height: prefersReducedMotion ? "auto" : sectionHeight }}
      aria-label="Seleção de produtos Altenburg"
    >
      <div className="showcase-sticky">
        <div className="page-shell showcase-heading">
          <FadeIn>
            <p className="eyebrow eyebrow-dark">Seleção editorial</p>
            <h2>
              <MaskText as="span">
                {"Peças que contam\nhistórias de conforto."}
              </MaskText>
            </h2>
          </FadeIn>
        </div>

        <div className="showcase-track-shell">
          <div className="showcase-track-fade" aria-hidden="true" />

          {prefersReducedMotion ? (
            <div className="showcase-track showcase-track-mobile">
              {showcaseProducts.map((product) => (
                <article className="showcase-card" key={product.id}>
                  <div className="showcase-card-media">
                    <Image
                      src={product.image}
                      alt={product.imageAlt}
                      fill
                      sizes="(max-width: 680px) 85vw, 420px"
                    />
                  </div>
                  <div className="showcase-card-copy">
                    <span>{product.type}</span>
                    <h3>{product.name}</h3>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <>
              <m.div
                ref={trackRef}
                className="showcase-track showcase-track-desktop"
                style={{ x }}
              >
                {showcaseProducts.map((product) => (
                  <article className="showcase-card" key={product.id}>
                    <div className="showcase-card-media">
                      <Image
                        src={product.image}
                        alt={product.imageAlt}
                        fill
                        sizes="420px"
                      />
                    </div>
                    <div className="showcase-card-copy">
                      <span>{product.type}</span>
                      <h3>{product.name}</h3>
                    </div>
                  </article>
                ))}
                <div className="showcase-track-end" aria-hidden="true" />
              </m.div>

              <div className="showcase-track showcase-track-mobile">
                {showcaseProducts.map((product) => (
                  <article className="showcase-card" key={`mobile-${product.id}`}>
                    <div className="showcase-card-media">
                      <Image
                        src={product.image}
                        alt={product.imageAlt}
                        fill
                        sizes="85vw"
                      />
                    </div>
                    <div className="showcase-card-copy">
                      <span>{product.type}</span>
                      <h3>{product.name}</h3>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
