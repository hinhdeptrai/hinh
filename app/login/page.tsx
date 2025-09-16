"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/status", {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            // User is already authenticated, redirect to dashboard
            console.log("User already authenticated, redirecting...");
            window.location.href = "/";
            return;
          }
        }
      } catch (error) {
        console.log("Not authenticated, staying on login page", error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Show loading spinner while checking auth
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Checking authentication...</span>
      </div>
    );
  }

  const sendCode = async () => {
    setSendingCode(true);
    setError("");

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send code");
      }

      setCodeSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid code");
      }

      console.log("Login successful, data:", data);
      console.log("Attempting redirect to dashboard...");

      // Wait a bit for cookie to be set before redirecting
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Redirect to dashboard
      window.location.href = "/";

      // Fallback redirect if window.location doesn't work
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-bold">
          🔐 Trade Admin Login
        </CardTitle>
        <p className="text-muted-foreground">
          Đăng nhập bằng mã xác thực qua Telegram
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!codeSent ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Nhấn nút bên dưới để nhận mã xác thực qua Telegram
              </p>

              <Button
                onClick={sendCode}
                disabled={sendingCode}
                className="w-full"
                size="lg"
              >
                {sendingCode ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Gửi mã về Telegram
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-green-700 dark:text-green-400 text-sm">
                ✅ Mã đã được gửi về Telegram! Kiểm tra tin nhắn và nhập mã bên
                dưới.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Mã xác thực (6 chữ số)</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                className="text-center text-lg font-mono tracking-wider"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCodeSent(false);
                  setCode("");
                  setError("");
                }}
                className="flex-1"
              >
                Gửi lại
              </Button>

              <Button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xác thực...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </Button>
            </div>
          </form>
        )}

        <div className="text-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Mã xác thực có hiệu lực trong 15 phút
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
