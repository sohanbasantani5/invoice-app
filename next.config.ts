import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Put the (small) stylesheet inside the HTML so the first paint does not wait for a CSS request.
  experimental: { inlineCss: true },
  // Bundle react-pdf instead of treating it as a server external. Externals need a
  // symlink in .next, which fails on non-NTFS drives (the project lives on E:).
  transpilePackages: ["@react-pdf/renderer"],
};

export default nextConfig;
