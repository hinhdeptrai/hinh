"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const LogoutButton = dynamic(() => import("@/components/logout-button"), {
  ssr: false,
});

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Ẩn navbar ở trang login
  const hideNavbar = pathname === "/login";

  if (hideNavbar) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b sticky top-0 z-10 bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="4" y="8" width="2" height="8" fill="#22c55e" />
                  <rect x="8" y="6" width="2" height="12" fill="#ef4444" />
                  <rect x="12" y="4" width="2" height="16" fill="#22c55e" />
                  <rect x="16" y="10" width="2" height="8" fill="#ef4444" />
                  <rect x="20" y="7" width="2" height="10" fill="#22c55e" />
                </svg>
              </div>
              <div className="font-bold text-black text-2xl">
                <span className="text-red-700">KENSINE</span>
                <span className="text-green-700">CMS</span>
              </div>
            </Link>

            {/* Navigation Menu */}
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  pathname === "/"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                📈 BTC Trend
              </Link>
              <Link
                href="/signals"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  pathname === "/signals"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                📶 Signals
              </Link>
              <Link
                href="/symbol-trend"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  pathname === "/symbol-trend"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                🎯 Symbol Trend
              </Link>
              <Link
                href="/tracking"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  pathname === "/tracking"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                📈 Tracking
              </Link>
              <Link
                href="/bot-admin"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  pathname === "/bot-admin"
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:bg-green-50 hover:text-green-700"
                }`}
              >
                🤖 Bot Admin
              </Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
}
