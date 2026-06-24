import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Publish | Social Campaigns by Cliposts",
  description:
    "Turn one core idea into a 14-day social campaign. Draft, edit, connect accounts, and schedule from one Publish workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
