// Suggestions only — confirm with your CA. docs/04-INDIA-COMPLIANCE.md §9
export const SAC_PRESETS = [
  { code: "999613", label: "Audiovisual post-production (video editing, colour, sound, VFX, subtitling)", gst: 18 },
  { code: "999612", label: "Video / film / programme production", gst: 18 },
  { code: "998383", label: "Photography & videography", gst: 18 },
  { code: "998391", label: "Specialty design services (incl. graphic design)", gst: 18 },
  { code: "998361", label: "Advertising services", gst: 18 },
  { code: "998314", label: "IT design & development (websites, apps)", gst: 18 },
  { code: "998399", label: "Other professional, technical & business services", gst: 18 },
  { code: "998596", label: "Event management", gst: 18 },
] as const;

export const UNITS = ["nos", "hrs", "days", "videos", "reels", "pcs", "project"] as const;
