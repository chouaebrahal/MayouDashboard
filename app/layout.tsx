// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "./components/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MayouDashboard - Système de gestion médicale",
  description: "Plateforme de gestion pour professionnels de santé",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MayouDashboard",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}