import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ניהול פרויקטים | Jeen AI",
  description: "לוח ניהול פרויקטים לצוות Jeen",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
