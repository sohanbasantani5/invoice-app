"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const LINES = [
  { name: "Podcast edit · Ep 12", amt: "₹4,000.00" },
  { name: "Reel cut-downs × 3", amt: "₹3,600.00" },
  { name: "Thumbnail design", amt: "₹1,200.00" },
];

/**
 * The login page's one richer moment (02 §8): an invoice outline draws in and the
 * line items appear one by one. Plays once, under 1.5s, skipped for reduced motion.
 */
export function IntroArt() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from("[data-draw]", { strokeDashoffset: (_i, el: SVGGeometryElement) => el.getTotalLength(), duration: 0.7, stagger: 0.05 })
          .from("[data-fade]", { opacity: 0, y: 6, duration: 0.3, stagger: 0.06 }, 0.35)
          .from("[data-line]", { opacity: 0, x: -10, duration: 0.3, stagger: 0.12 }, 0.6)
          .from("[data-total]", { opacity: 0, duration: 0.3 }, 1.05);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} aria-hidden className="relative mx-auto w-full max-w-[360px] select-none">
      <svg viewBox="0 0 210 297" className="w-full drop-shadow-[0_8px_24px_rgba(23,24,27,0.06)]">
        <rect data-draw x="0.5" y="0.5" width="209" height="296" rx="3" fill="#fff" stroke="#CFCAC0" strokeDasharray="1012" />
        <line data-draw x1="16" y1="44" x2="194" y2="44" stroke="#17181B" strokeWidth="0.6" strokeDasharray="178" />
        <line data-draw x1="16" y1="53" x2="194" y2="53" stroke="#17181B" strokeWidth="0.6" strokeDasharray="178" />
        <line data-draw x1="120" y1="232" x2="194" y2="232" stroke="#17181B" strokeWidth="0.9" strokeDasharray="74" />
      </svg>
      <div className="absolute inset-0 flex flex-col px-[7.6%] pt-[5.4%] font-sans text-[#17181B]">
        <div className="flex items-start justify-between">
          <div data-fade>
            <div className="font-heading text-[13px] font-semibold">Sample Business</div>
            <div className="text-[8px] text-[#8A8D94]">Mumbai, Maharashtra</div>
          </div>
          <div data-fade className="text-right">
            <div className="text-[7px] tracking-[0.18em] text-[#1F5C4B]">INVOICE</div>
            <div className="font-heading text-[11px] font-semibold">SB/2026-27/014</div>
          </div>
        </div>
        <div data-fade className="mt-[9%] text-[7px] tracking-wider text-[#8A8D94]">
          DESCRIPTION
        </div>
        <div className="mt-[6%] flex flex-col gap-[7px]">
          {LINES.map((l) => (
            <div key={l.name} data-line className="flex justify-between border-b border-[#E4E1D9] pb-[5px] text-[9px]">
              <span>{l.name}</span>
              <span className="tnum">{l.amt}</span>
            </div>
          ))}
        </div>
        <div data-total className="mt-auto mb-[19%] ml-auto w-[42%] text-right">
          <div className="flex justify-between text-[10px] font-semibold">
            <span>Total</span>
            <span className="tnum">₹8,800.00</span>
          </div>
          <div className="mt-1 text-[7px] text-[#1F5C4B]">Scan to pay via UPI</div>
        </div>
      </div>
    </div>
  );
}
