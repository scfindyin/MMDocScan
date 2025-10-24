import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "MMDocScan",
  description: "Document scanning and data extraction tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
