import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { PRODUCT_DESCRIPTION, PRODUCT_PAGE_TITLE } from "@/lib/product-brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: PRODUCT_PAGE_TITLE,
  description: PRODUCT_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
