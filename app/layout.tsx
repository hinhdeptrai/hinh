import "./globals.css"
import { ReactNode } from "react"

export const metadata = {
  title: "Trade Admin Panel",
  description: "Indicator dashboard for Binance pairs",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
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
  )
}

