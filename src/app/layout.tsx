import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "אפיון סוכן AI | מערכת לאיסוף דרישות",
  description: "מערכת מובנית לאפיון תהליכים עסקיים לבניית סוכני AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
