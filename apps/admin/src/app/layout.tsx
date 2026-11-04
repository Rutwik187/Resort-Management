import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Prathamesh admin", template: "%s | Prathamesh admin" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
