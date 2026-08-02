import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import A11yProvider from "@/components/A11yProvider";
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
  title: "NeuroNiche Spaces",
  description:
    "Plan, cost and fund a sensory-friendly space for your school or organisation.",
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
      <body className="min-h-full flex flex-col">
        <A11yProvider>{children}</A11yProvider>
      </body>
    </html>
  );
}
