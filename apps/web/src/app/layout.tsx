import type { Metadata } from "next";
import { Onest, Unbounded } from "next/font/google";
import "./globals.css";

const unbounded = Unbounded({ subsets: ["cyrillic", "latin"], weight: "variable", variable: "--font-unbounded", display: "swap" });
const onest = Onest({ subsets: ["cyrillic", "latin"], weight: "variable", variable: "--font-onest", display: "swap" });

const THEME_BOOTSTRAP = `(function(){try{var m=document.cookie.match(/(?:^|; )agri-theme=(light|dark)/);if(m){document.documentElement.setAttribute('data-theme',m[1]);}}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Agri Agent",
  description: "Can I spray my field today? A weather-aware AI chat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" className={`${unbounded.variable} ${onest.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
