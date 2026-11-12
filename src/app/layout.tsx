import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agri Agent",
  description: "Can I spray my field today? A weather-aware AI chat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk">
      <body className="antialiased">{children}</body>
    </html>
  );
}
