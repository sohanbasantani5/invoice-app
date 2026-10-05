"use client";

import { useEffect } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Lenis on the window scroll, desktop pointers only. Phones scroll natively (smooth scrolling there fights the
 * browser and costs JavaScript), and nobody with reduced motion gets it. It loads after the page is interactive and
 * wraps nothing, so turning it on never remounts the page. Inner scroll areas must carry `data-lenis-prevent`.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let dead = false;
    let raf = 0;
    let destroy = () => {};
    void import("lenis").then(({ default: Lenis }) => {
      if (dead) return;
      const lenis = new Lenis({ lerp: 0.12, prevent: (node) => node.closest("[data-lenis-prevent]") !== null });
      const loop = (t: number) => {
        lenis.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      destroy = () => lenis.destroy();
    });
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      destroy();
    };
  }, [reduce]);
  return <>{children}</>;
}
