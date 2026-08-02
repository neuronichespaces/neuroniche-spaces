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
        <A11yProvider>
          <div className="flex-1">{children}</div>
          <footer className="border-t border-[var(--a11y-border)] p-4 text-sm flex flex-wrap gap-x-4 gap-y-2 justify-center">
            <a className="underline" href="/privacy">Privacy</a>
            <a className="underline" href="/terms">Terms</a>
            <a className="underline" href="/dpa">Data Processing Agreement</a>
            <a className="underline" href="/subprocessors">Subprocessors</a>
            <a className="underline" href="/aup">Acceptable use</a>
            <a className="underline" href="/child-safety">Child safety</a>
            <a className="underline" href="/complaints">Complaints</a>
            <a className="underline" href="/accessibility">Accessibility</a>
          </footer>
        </A11yProvider>
      </body>
    </html>
  );
}
