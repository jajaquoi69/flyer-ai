import React from "react";
import AnimatedBackground from "@/components/AnimatedBackground";
import { SiteHeader } from "@/components/SiteHeader";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="glow-bg min-h-screen text-white">
      <AnimatedBackground variant="app" />
      <SiteHeader variant="app" />
      <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">{children}</main>
    </div>
  );
}
