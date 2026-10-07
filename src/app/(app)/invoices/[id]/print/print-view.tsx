"use client";

import { useEffect } from "react";
import { type PaperAssets } from "@/components/invoice/preview/invoice-paper";
import { getTemplate } from "@/components/invoice/templates/registry";
import { useQr } from "@/components/invoice/preview/use-assets";
import type { PaperModel } from "@/lib/invoice/paper-model";
import { Button } from "@/components/ui/button";

export function PrintView({ model, assets }: { model: PaperModel; assets: PaperAssets }) {
  const qr = useQr(model.payment.upiText);
  const ready = !model.payment.upiText || !!qr;
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [ready]);
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-surface-2 print:static print:overflow-visible print:bg-white" data-lenis-prevent>
      <div className="no-print flex justify-center gap-2 p-4">
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
        <Button variant="secondary" onClick={() => window.close()}>
          Close
        </Button>
      </div>
      <div className="print-root mx-auto mb-8 w-fit shadow-float print:m-0 print:shadow-none">
        
        {(() => {
          const TemplateComponent = getTemplate(model.template_id || "default").preview;
          return <TemplateComponent model={model} assets={{ ...assets, qrDataUrl: qr }} />;
        })()}

      </div>
    </div>
  );
}
