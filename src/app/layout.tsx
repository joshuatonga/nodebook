import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Nodebook — map the work with your agent";
const description =
  "A local-first infinite workspace where people and their agents research, scope, trace, and learn together.";

export const metadata: Metadata = {
  metadataBase: new URL("https://nodebook.tinyinternet.dev"),
  title: {
    default: title,
    template: "%s — Nodebook",
  },
  description,
  applicationName: "Nodebook",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "visual workspace",
    "infinite canvas",
    "AI agents",
    "product planning",
    "research maps",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Nodebook",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#242428" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
