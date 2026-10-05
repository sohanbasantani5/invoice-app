"use client";

import { useLayoutEffect, useRef, useState } from "react";

const A4_WIDTH_PX = 793.7; // 210mm at 96dpi

/** Scales the A4 paper to the container width with CSS transform (no reflow of the paper). */
export function ScaledPaper({ children, maxScale = 1 }: { children: React.ReactNode; maxScale?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [height, setHeight] = useState(1123);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const ro = new ResizeObserver(() => {
      setScale(Math.min(maxScale, o.clientWidth / A4_WIDTH_PX));
      setHeight(i.offsetHeight);
    });
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [maxScale]);

  return (
    <div ref={outer} className="w-full">
      <div style={{ height: height * scale }} className="relative">
        <div
          ref={inner}
          className="absolute top-0 left-1/2 origin-top overflow-hidden rounded-[2px] shadow-float"
          style={{ width: A4_WIDTH_PX, transform: `translateX(-50%) scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
