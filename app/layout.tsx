import type { Metadata } from "next";
import { Geist, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { PublicBackground } from "@/components/public-background";
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
        <div className="relative min-h-screen overflow-x-hidden">
          <PublicBackground />
          <div className="relative z-10">
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
