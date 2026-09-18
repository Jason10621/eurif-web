import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Pwa } from "@/components/pwa";

const notoSansKR = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-kr",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "ULIF · 팀 워크스페이스",
    template: "%s · ULIF",
  },
  description:
    "다학제 융합 연구 동아리 ULIF — 수면 위상 지연 다중변수 예측 모형 프로젝트 협업 공간",
  applicationName: "ULIF",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ULIF",
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <Pwa />
      </body>
    </html>
  );
}
