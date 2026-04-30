import type { Metadata } from "next";
import { PortalIdleTimeout } from "@/components/portal-idle-timeout";

export const metadata: Metadata = {
  title: "Lab Portal",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <PortalIdleTimeout />
      {children}
    </>
  );
}
