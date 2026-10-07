// react-pdf twin of preview/signature-block.tsx. Same PaperModel.signature, same tokens,
// so the PDF says exactly what the live preview says.

import { Image, Text, View } from "@react-pdf/renderer";
import type { PaperModel } from "@/lib/invoice/paper-model";
import { templateTokens as t } from "@/lib/invoice/template-tokens";
import type { PaperAssets } from "../preview/invoice-paper";

const mm = (n: number) => n * 2.8346; // mm → pt

/**
 * Signature ON  → "For {business}" + the image (or a space to sign) + the signatory line.
 * Signature OFF → the electronic-document notice, bottom-left, with no reserved blank space.
 */
export function SignatureBlock({ model: m, assets }: { model: PaperModel; assets: PaperAssets }) {
  const s = m.signature;

  if (!s.enabled) {
    return (
      <View style={{ marginTop: "auto", paddingTop: mm(10) }}>
        <Text style={{ fontSize: t.small, color: t.ink3 }}>{s.notice}</Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: "auto", paddingTop: mm(10), alignItems: "flex-end" }} wrap={false}>
      <View style={{ width: mm(55), alignItems: "center" }}>
        <Text style={{ fontSize: t.small, color: t.ink2 }}>{s.forLine}</Text>
        <View style={{ height: mm(16), justifyContent: "center" }}>
          {assets.signatureUrl && (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
            <Image src={assets.signatureUrl} style={{ maxHeight: mm(14), maxWidth: mm(45), objectFit: "contain" }} />
          )}
        </View>
        <Text style={{ width: "100%", textAlign: "center", borderTopWidth: 1, borderColor: t.rule, paddingTop: mm(1), fontSize: t.small, color: t.ink2 }}>
          Authorised signatory
        </Text>
      </View>
    </View>
  );
}
