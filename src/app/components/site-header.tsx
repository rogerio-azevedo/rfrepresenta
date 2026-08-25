"use client";

import Image from "next/image";
import Link from "next/link";
import { LockKeyhole, Menu, MessageCircle, X } from "lucide-react";
import { m, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useState, type MouseEvent } from "react";
import { siteConfig } from "../site-config";
import { useLenis } from "./motion/smooth-scroll";

type SiteHeaderProps = {
  whatsappUrl: string;
};

export function SiteHeader({ whatsappUrl }: SiteHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const lenis = useLenis();
  const { scrollY } = useScroll();

  useEffect(() => {
    document.body.classList.toggle("menu-open", isOpen);
    return () => document.body.classList.remove("menu-open");
  }, [isOpen]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setSolid(latest > 72);
    if (latest <= 96) {
      setHidden(false);
      return;
    }
    setHidden(latest > previous);
  });

  function closeMenu() {
    setIsOpen(false);
  }

  function handleAnchorClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!href.startsWith("#")) return;
    event.preventDefault();
    closeMenu();
    const target = document.querySelector(href);
    if (!target) return;

    if (lenis) {
      lenis.scrollTo(target as HTMLElement, { offset: -82 });
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <m.header
      className={`site-header ${solid ? "is-solid" : ""} ${hidden ? "is-hidden" : ""}`}
      initial={false}
      animate={{ y: hidden ? "-102%" : "0%" }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <a
        className="site-logo-link"
        href="#inicio"
        aria-label="RF Representa - início"
        onClick={(event) => handleAnchorClick(event, "#inicio")}
      >
        <Image
          src="/images/brand/rf-logo-white.png"
          alt="RF Representa"
          width={182}
          height={36}
          priority
          className="site-logo"
        />
      </a>

      <nav className="desktop-nav" aria-label="Navegação principal">
        {siteConfig.navigation.map((item) => (
          <a
            href={item.href}
            key={item.href}
            onClick={(event) => handleAnchorClick(event, item.href)}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="header-actions">
        <Link className="header-login" href="/login" aria-label="Área do cliente">
          <LockKeyhole aria-hidden="true" size={17} strokeWidth={1.8} />
          <span>Área do cliente</span>
        </Link>
        <a className="header-contact" href={whatsappUrl} target="_blank" rel="noreferrer">
          <MessageCircle aria-hidden="true" size={18} strokeWidth={1.8} />
          <span>{siteConfig.contact.cta}</span>
        </a>
      </div>

      <button
        className="menu-toggle"
        type="button"
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? (
          <X aria-hidden="true" size={22} strokeWidth={1.8} />
        ) : (
          <Menu aria-hidden="true" size={22} strokeWidth={1.8} />
        )}
      </button>

      <nav
        className={`mobile-nav ${isOpen ? "is-open" : ""}`}
        id="mobile-navigation"
        aria-label="Navegação móvel"
      >
        {siteConfig.navigation.map((item) => (
          <a
            href={item.href}
            key={item.href}
            onClick={(event) => handleAnchorClick(event, item.href)}
          >
            {item.label}
          </a>
        ))}
        <Link className="mobile-login" href="/login" onClick={closeMenu}>
          <LockKeyhole aria-hidden="true" size={18} /> Área do cliente
        </Link>
        <a
          className="button button-primary"
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          onClick={closeMenu}
        >
          <MessageCircle aria-hidden="true" size={19} strokeWidth={1.8} />
          {siteConfig.contact.cta}
        </a>
      </nav>
    </m.header>
  );
}
