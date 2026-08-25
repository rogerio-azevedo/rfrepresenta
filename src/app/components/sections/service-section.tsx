"use client";

import {
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { Handshake, PackageCheck, ShoppingBag } from "lucide-react";
import { useRef } from "react";
import { FadeIn } from "../motion/fade-in";
import { MaskText } from "../motion/mask-text";

const serviceSteps = [
  {
    number: "01",
    title: "Conheça as coleções",
    description:
      "Converse diretamente com um consultor e descubra as linhas que fazem sentido para o perfil da sua loja.",
    icon: ShoppingBag,
  },
  {
    number: "02",
    title: "Monte o seu mix",
    description:
      "Selecione categorias, estilos e faixas de produto com uma orientação comercial próxima.",
    icon: Handshake,
  },
  {
    number: "03",
    title: "Acompanhe o pedido",
    description:
      "Tenha um contato de referência para apoiar o pedido e manter a conversa comercial em andamento.",
    icon: PackageCheck,
  },
];

export function ServiceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 80%", "end 40%"],
  });

  const dashOffset = useTransform(scrollYProgress, [0, 1], [1000, 0]);

  return (
    <section className="service-section section-pad" id="atendimento" ref={sectionRef}>
      <div className="page-shell service-layout">
        <FadeIn className="section-heading service-heading">
          <p className="eyebrow eyebrow-dark">Atendimento comercial</p>
          <h2>
            <MaskText as="span">{"Próximo, simples\ne direto."}</MaskText>
          </h2>
          <p>
            Da primeira conversa ao acompanhamento, você fala com quem conhece
            a sua região e o portfólio representado.
          </p>
        </FadeIn>

        <div className="service-steps">
          <svg className="service-line" viewBox="0 0 1000 2" preserveAspectRatio="none" aria-hidden="true">
            <line x1="0" y1="1" x2="1000" y2="1" className="service-line-base" />
            <m.line
              x1="0"
              y1="1"
              x2="1000"
              y2="1"
              className="service-line-active"
              strokeDasharray="1000"
              style={
                prefersReducedMotion
                  ? { strokeDashoffset: 0 }
                  : { strokeDashoffset: dashOffset }
              }
            />
          </svg>

          {serviceSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <FadeIn className="service-step" delay={index * 0.12} key={step.number}>
                <div className="service-step-head">
                  <div className="service-step-icon">
                    <Icon aria-hidden="true" size={22} strokeWidth={1.6} />
                  </div>
                  <span className="service-step-number">{step.number}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
