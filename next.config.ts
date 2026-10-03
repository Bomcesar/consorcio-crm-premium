import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      // A sala de live precisa de microfone, câmera e captura de tela.
      // A regra global abaixo bloqueia esses recursos; por isso a live
      // recebe um Permissions-Policy próprio, liberado apenas para a
      // própria origem (self) e somente nas rotas do módulo.
      {
        source: "/live-voz/:path*",
        headers: [
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self), autoplay=(self)" },
        ],
      },
      {
        source: "/live/:path*",
        headers: [
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self), autoplay=(self)" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        source: "/api/live/:path*",
        headers: [
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self)" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Content-Type", value: "application/javascript" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/_next/static/css/:path*",
        headers: [
          { key: "Content-Type", value: "text/css" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
