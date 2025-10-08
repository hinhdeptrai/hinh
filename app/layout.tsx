import "./globals.css";
import { ReactNode, Suspense } from "react";
import MainLayout from "@/components/main-layout";
import ProgressBar from "@/components/progress-bar";

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
        <Suspense fallback={null}>
          <ProgressBar />
        </Suspense>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
