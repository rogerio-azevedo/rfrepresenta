"use client";

import Image from "next/image";
import {
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { showcaseProducts } from "../../showcase-products";
import { FadeIn } from "../motion/fade-in";
import { MaskText } from "../motion/mask-text";

export function ShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [maxScroll, setMaxScroll] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const x = useTransform(scrollYProgress, [0, 1], [0, -maxScroll]);
  const fadeOpacity = useTransform(scrollYProgress, [0.82, 1], [1, 0]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const shell = shellRef.current;
    if (!track || !shell) return;

    const measureTrackWidth = () => {
      const cards = track.querySelectorAll<HTMLElement>(".showcase-card");
      if (cards.length === 0) return 0;

      const styles = getComputedStyle(track);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "0");

      return Array.from(cards).reduce((total, card, index) => {
        const width = card.getBoundingClientRect().width;
        return total + width + (index < cards.length - 1 ? gap : 0);
      }, 0);
    };

    const update = () => {
      if (getComputedStyle(track).display === "none" || shell.clientWidth === 0) {
        setMaxScroll(0);
        return;
      }

      const trackWidth = Math.max(measureTrackWidth(), track.scrollWidth);
      setMaxScroll(Math.max(0, trackWidth - shell.clientWidth));
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(track);
    observer.observe(shell);
    track.querySelectorAll(".showcase-card").forEach((card) => {
      observer.observe(card);
    });

    track.querySelectorAll("img").forEach((img) => {
      if (!img.complete) {
        img.addEventListener("load", update, { once: true });
      }
    });

    const ultrawideQuery = window.matchMedia(
      "(min-width: 1600px) and (min-height: 900px)",
    );
    ultrawideQuery.addEventListener("change", update);
    window.addEventListener("resize", update);
    document.fonts?.ready.then(update).catch(() => undefined);

    return () => {
      observer.disconnect();
      ultrawideQuery.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const sectionHeight =
    maxScroll > 0 ? `calc(100dvh + ${maxScroll}px)` : "100dvh";

  return (
    <section
      className="showcase-section"
      ref={sectionRef}
      style={{ height: prefersReducedMotion ? "auto" : sectionHeight }}
      aria-label="Seleção de produtos Altenburg"
    >
      <div className="showcase-sticky">
        <div className="showcase-frame">
        <div className="showcase-heading">
          <FadeIn>
            <p className="eyebrow eyebrow-dark">Seleção editorial</p>
            <h2>
              <MaskText as="span">
                {"Peças que contam\nhistórias de conforto."}
              </MaskText>
            </h2>
          </FadeIn>
        </div>

        <div className="showcase-track-shell" ref={shellRef}>
          <m.div
            className="showcase-track-fade"
            aria-hidden="true"
            style={{ opacity: prefersReducedMotion ? 1 : fadeOpacity }}
          />

          {prefersReducedMotion ? (
            <div className="showcase-track showcase-track-mobile">
              {showcaseProducts.map((product) => (
                <article className="showcase-card" key={product.id}>
                  <div className="showcase-card-media">
                    <Image
                      src={product.image}
                      alt={product.imageAlt}
                      fill
                      sizes="(max-width: 680px) 78vw, 300px"
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
                        sizes="(min-width: 1600px) 480px, 300px"
                      />
                    </div>
                    <div className="showcase-card-copy">
                      <span>{product.type}</span>
                      <h3>{product.name}</h3>
                    </div>
                  </article>
                ))}
              </m.div>

              <div className="showcase-track showcase-track-mobile">
                {showcaseProducts.map((product) => (
                  <article className="showcase-card" key={`mobile-${product.id}`}>
                    <div className="showcase-card-media">
                      <Image
                        src={product.image}
                        alt={product.imageAlt}
                        fill
                        sizes="78vw"
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
      </div>
    </section>
  );
}
