import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini CRM One Price",
  description: "Telegram Mini App CRM for one client"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
