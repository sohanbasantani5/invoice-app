"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { OPEN_COMMAND_MENU } from "./command-menu-events";

const CommandMenu = dynamic(() => import("./command-menu").then((m) => m.CommandMenu), { ssr: false });

/**
 * The command menu (cmdk, search) is not needed to read a page, so it loads once the browser is idle.
 * If Ctrl+K or the Search button is used before that, it loads right away and opens as soon as it is ready.
 */
export function LazyCommandMenu() {
  const [load, setLoad] = useState(false);
  const [openOnLoad, setOpenOnLoad] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    const early = () => {
      if (loaded.current) return;
      loaded.current = true;
      setOpenOnLoad(true);
      setLoad(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        early();
      }
    };
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2000));
    const id = idle(() => {
      if (loaded.current) return;
      loaded.current = true;
      setLoad(true);
    });
    window.addEventListener(OPEN_COMMAND_MENU, early);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_COMMAND_MENU, early);
      window.removeEventListener("keydown", onKey);
      if (window.cancelIdleCallback) window.cancelIdleCallback(id as number);
    };
  }, []);

  return load ? <CommandMenu defaultOpen={openOnLoad} /> : null;
}
