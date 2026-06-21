import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Royal Chess 3D",
  description: "Play 3D chess against local players, online opponents, or advanced AI.",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
