"use client";

import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { FadeIn } from "../motion/fade-in";
import { MaskText } from "../motion/mask-text";
import { DURATION, EASE_OUT_EXPO } from "../../motion";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqSectionProps = {
  items: FaqItem[];
};

export function FaqSection({ items }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="faq-section section-pad" id="duvidas">
      <div className="page-shell faq-grid">
        <FadeIn className="faq-heading">
          <p className="eyebrow eyebrow-dark">Dúvidas frequentes</p>
          <h2>
            <MaskText as="span">{"Antes da primeira\nconversa."}</MaskText>
          </h2>
          <p>
            O essencial para você entender como funciona o atendimento da RF
            Representa.
          </p>
        </FadeIn>

        <FadeIn className="faq-list" delay={0.1}>
          {items.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div className="faq-item" key={faq.question}>
                <button
                  type="button"
                  className="faq-trigger"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                >
                  <span>{faq.question}</span>
                  <span className={`faq-toggle ${isOpen ? "is-open" : ""}`}>
                    +
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <m.div
                      className="faq-panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
                    >
                      <p>{faq.answer}</p>
                    </m.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </FadeIn>
      </div>
    </section>
  );
}
