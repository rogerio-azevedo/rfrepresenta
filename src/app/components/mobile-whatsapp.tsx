"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { siteConfig } from "../site-config";

type MobileWhatsAppProps = {
  href: string;
};

export function MobileWhatsApp({ href }: MobileWhatsAppProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("#inicio");

    if (!hero) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(!entry.isIntersecting),
      { threshold: 0.08 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <a
      className={`mobile-whatsapp ${isVisible ? "is-visible" : ""}`}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={siteConfig.contact.ariaWhatsapp}
    >
      <MessageCircle aria-hidden="true" size={22} strokeWidth={1.8} />
      <span>WhatsApp</span>
    </a>
  );
}
