import React from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="glow-bg flex min-h-screen flex-col text-white">
      <AnimatedBackground variant="marketing" />
      <SiteHeader variant="marketing" />
      <main className="relative flex-1 pb-16">{children}</main>
      <SiteFooter />
    </div>
  );
}
