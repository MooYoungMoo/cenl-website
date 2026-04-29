import type { Metadata } from "next";
import { Geist, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buildSiteMetadata, fallbackSiteSettings } from "@/lib/site-settings";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-kr",
  display: "swap",
});

export const metadata: Metadata = buildSiteMetadata(fallbackSiteSettings);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${notoSansKr.variable}`}>
        <div className="relative">
          <div className="absolute inset-x-0 top-0 -z-10 h-[24rem] border-b border-line/50 bg-[linear-gradient(135deg,rgba(9,107,114,0.1),rgba(255,255,255,0.2)_45%,rgba(183,65,75,0.08))]" />
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
