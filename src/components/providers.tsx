"use client";

import { ThemeProvider } from "next-themes";
import { LazyMotion, MotionConfig } from "motion/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={() => import("./motion/features").then((f) => f.default)}>
        {children}
        </LazyMotion>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className:
              "!bg-surface !text-ink !border-border !rounded-xl !shadow-float !font-sans !text-sm",
          }}
        />
      </MotionConfig>
    </ThemeProvider>
  );
}
