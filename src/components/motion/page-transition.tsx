"use client";

import { useEffect } from "react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { booted, markBooted } from "./boot";

/**
 * Route enter: fade + rise 8px, 400ms ease-out-quint (02 §8).
 * Only for navigations inside the app. The first page load is left fully visible: starting it at
 * opacity 0 would hide the server-rendered page until JavaScript has run (slow Largest Contentful Paint).
 * Reduced motion: no animation at all.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const animate = booted() && !reduce;
  useEffect(markBooted, []);
  return (
    <m.div
      initial={animate ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}
