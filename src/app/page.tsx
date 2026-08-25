import Image from "next/image";
import { OpeningCurtain } from "./components/opening-curtain";
import { Marquee } from "./components/motion/marquee";
import { ScrollProgress } from "./components/scroll-progress";
import { AltenburgSection } from "./components/sections/altenburg-section";
import { FaqSection } from "./components/sections/faq-section";
import { FinalCtaSection } from "./components/sections/final-cta-section";
import { HeroSection } from "./components/sections/hero-section";
import { PortfolioSection } from "./components/sections/portfolio-section";
import { RepresentativeSection } from "./components/sections/representative-section";
import { ServiceSection } from "./components/sections/service-section";
import { ShowcaseSection } from "./components/sections/showcase-section";
import { TerritorySection } from "./components/sections/territory-section";
import { SiteHeader } from "./components/site-header";
import { MobileWhatsApp } from "./components/mobile-whatsapp";
import { buildMapsUrl, buildWhatsAppUrl, siteConfig } from "./site-config";

const faqs = [
  {
    question: "Quem é atendido pela RF Representa?",
    answer:
      "O atendimento é voltado a lojistas e compradores profissionais localizados em todo o estado de Mato Grosso.",
  },
  {
    question: "Quais categorias Altenburg estão disponíveis?",
    answer:
      "O portfólio contempla produtos de cama, colchas e edredons, travesseiros e banho, com diferentes linhas e propostas para compor o mix da loja.",
  },
  {
    question: "Como posso conhecer coleções e solicitar um orçamento?",
    answer:
      "Basta chamar Rodrigo pelo WhatsApp. A mensagem já identifica que o contato veio pelo site e inicia o atendimento comercial.",
  },
  {
    question: "O atendimento cobre quais cidades?",
    answer:
      "A RF Representa atende lojistas em todo o estado de Mato Grosso. A melhor forma de alinhar sua região e necessidade é pelo contato direto.",
  },
];

const marqueeItems = [
  "Altenburg",
  "Cama",
  "Banho",
  "Travesseiros",
  "Colchas",
  "Mato Grosso",
  "Conforto",
  "Design",
];

export default function Home() {
  const whatsappUrl = buildWhatsAppUrl();
  const mapsUrl = buildMapsUrl();

  return (
    <main>
      <OpeningCurtain />
      <ScrollProgress />
      <SiteHeader whatsappUrl={whatsappUrl} />

      <HeroSection whatsappUrl={whatsappUrl} />

      <Marquee items={marqueeItems} className="hero-marquee" />

      <PortfolioSection categories={siteConfig.categories} />

      <ShowcaseSection />

      <AltenburgSection whatsappUrl={whatsappUrl} />

      <ServiceSection />

      <RepresentativeSection
        whatsappUrl={whatsappUrl}
        whatsappDisplay={siteConfig.whatsappDisplay}
        quote="Atendimento próximo para ajudar cada lojista a encontrar o mix certo para o seu negócio."
      />

      <TerritorySection whatsappUrl={whatsappUrl} />

      <FaqSection items={faqs} />

      <FinalCtaSection whatsappUrl={whatsappUrl} />

      <footer className="site-footer">
        <div className="page-shell footer-main">
          <a
            className="site-logo-link footer-logo-link"
            href="#inicio"
            aria-label="RF Representa - início"
          >
            <Image
              src="/images/brand/rf-logo-white.png"
              alt="RF Representa"
              width={182}
              height={36}
              className="site-logo footer-logo"
            />
          </a>
          <p>
            Representação comercial para lojistas em todo o estado de Mato
            Grosso.
          </p>
          <a
            className="footer-phone"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            {siteConfig.whatsappDisplay}
          </a>
        </div>
        <div className="page-shell footer-legal">
          <div className="footer-legal-company">
            <span>
              © {new Date().getFullYear()} {siteConfig.company.legalName} ·
              CNPJ {siteConfig.company.cnpj}
            </span>
            <a
              className="footer-address"
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
            >
              {siteConfig.company.address}
            </a>
          </div>
          <span>
            Altenburg é uma marca de seu respectivo titular. A RF Representa
            atua como representante comercial.
          </span>
        </div>
      </footer>

      <MobileWhatsApp href={whatsappUrl} />
    </main>
  );
}
