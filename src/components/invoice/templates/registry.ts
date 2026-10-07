import type React from "react";
import type { PaperModel } from "@/lib/invoice/paper-model";
import type { PaperAssets } from "../preview/invoice-paper";

export type TemplateComponentProps = {
  model: PaperModel;
  assets?: PaperAssets;
  highlight?: boolean;
};

export type TemplateDef = {
  id: string;
  name: string;
  preview: React.ComponentType<TemplateComponentProps>;
  pdf: React.ComponentType<TemplateComponentProps>;
  thumbnail?: string; // We can use CSS to make a thumbnail or a small image
};

// We will import templates here
import { InvoicePaper as DefaultPaper } from "../preview/invoice-paper";
import { InvoicePdf as DefaultPdf } from "../pdf/invoice-pdf";

import { RosePaper } from "./rose-paper";
import { RosePdf } from "./rose-pdf";
import { StudioPaper } from "./studio-paper";
import { StudioPdf } from "./studio-pdf";
import { CreativePaper } from "./creative-paper";
import { CreativePdf } from "./creative-pdf";
import { BakeryPaper } from "./bakery-paper";
import { BakeryPdf } from "./bakery-pdf";
import { PinkModernPaper } from "./pink_modern-paper";
import { PinkModernPdf } from "./pink_modern-pdf";
import { ElegantPaper } from "./elegant-paper";
import { ElegantPdf } from "./elegant-pdf";
import { LimePaper } from "./lime-paper";
import { LimePdf } from "./lime-pdf";
import { DynamicPaper } from "./dynamic-paper";
import { DynamicPdf } from "./dynamic-pdf";

export const TEMPLATES: TemplateDef[] = [
  { id: "default", name: "Classic", preview: DefaultPaper, pdf: DefaultPdf },
  { id: "rose", name: "Soft Beauty", preview: RosePaper, pdf: RosePdf },
  { id: "studio", name: "Modern Studio", preview: StudioPaper, pdf: StudioPdf },
  { id: "creative", name: "Minimal Creative", preview: CreativePaper, pdf: CreativePdf },
  { id: "bakery", name: "Friendly Bakery", preview: BakeryPaper, pdf: BakeryPdf },
  { id: "pink_modern", name: "Soft Pink", preview: PinkModernPaper, pdf: PinkModernPdf },
  { id: "elegant", name: "Elegant Classic", preview: ElegantPaper, pdf: ElegantPdf },
  { id: "lime", name: "Editorial Lime", preview: LimePaper, pdf: LimePdf },
  { id: "dynamic", name: "Dynamic Bold", preview: DynamicPaper, pdf: DynamicPdf },
];

export function getTemplate(id: string): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}
