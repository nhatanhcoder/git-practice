import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tài khoản | HSK Learning Platform",
  description: "Quản trị tài khoản HSK Learning Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
