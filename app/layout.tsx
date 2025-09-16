import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Trade Admin Panel",
  description: "Indicator dashboard for Binance pairs",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-montserrat">
        <div className="min-h-screen">
          <header className="border-b sticky top-0 z-10 bg-background/80 backdrop-blur">
            <div className="container flex h-14 items-center justify-between">
              <div className="font-semibold">Trade Admin</div>
            </div>
          </header>
          <main className="container py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
