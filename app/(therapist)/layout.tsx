import React from "react";
import AnimatedBackground from "@/components/AnimatedBackground";
import { SiteHeader } from "@/components/SiteHeader";

export default function TherapistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden text-white" style={{ background: "#02030a" }}>
      <AnimatedBackground variant="app" />
      <SiteHeader variant="app" />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
