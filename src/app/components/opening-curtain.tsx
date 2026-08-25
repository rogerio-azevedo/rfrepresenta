"use client";

import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";
import { DURATION, EASE_OUT_EXPO } from "../motion";

export function OpeningCurtain() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (navigator.webdriver) {
      return;
    }

    const seen = sessionStorage.getItem("rf-opening-seen");
    if (seen) return;
    setVisible(true);
    sessionStorage.setItem("rf-opening-seen", "1");
    const timer = window.setTimeout(() => setVisible(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <m.div
          className="opening-curtain"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
        >
          <m.div
            className="opening-curtain-panel opening-curtain-panel-left"
            initial={{ x: "0%" }}
            animate={{ x: "-102%" }}
            transition={{ duration: 0.82, delay: 0.18, ease: EASE_OUT_EXPO }}
          />
          <m.div
            className="opening-curtain-panel opening-curtain-panel-right"
            initial={{ x: "0%" }}
            animate={{ x: "102%" }}
            transition={{ duration: 0.82, delay: 0.18, ease: EASE_OUT_EXPO }}
          />
          <m.div
            className="opening-curtain-mark"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
          >
            <Image
              src="/images/brand/rf-symbol-white.png"
              alt=""
              width={120}
              height={79}
              priority
            />
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
