import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Prathamesh admin", template: "%s | Prathamesh admin" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN">
      <body>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster theme="light" position="top-right" richColors={false} />
      </body>
    </html>
  );
}
