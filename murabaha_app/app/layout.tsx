import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Murabaha",
  description: "Лендинг и калькулятор рассрочки Murabaha",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
