"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DebugPage() {
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [cookies, setCookies] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const checkAuth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/status", {
        credentials: "include",
      });
      const data = await res.json();
      setAuthStatus({ status: res.status, data });
    } catch (error: any) {
      setAuthStatus({ error: error?.message || "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  const getCookies = () => {
    setCookies(document.cookie);
  };

  const testLogin = async () => {
    try {
      // First send code
      await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // Then verify with a test code (you might need to check your telegram for real code)
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "123456" }), // Replace with real code
      });

      const data = await res.json();
      console.log("Test login result:", data);
    } catch (error) {
      console.error("Test login error:", error);
    }
  };

  useEffect(() => {
    getCookies();
    checkAuth();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Current Cookies:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {cookies || "No cookies found"}
            </pre>
            <Button
              onClick={getCookies}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Refresh Cookies
            </Button>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Auth Status:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {authStatus
                ? JSON.stringify(authStatus, null, 2)
                : "Not checked yet"}
            </pre>
            <Button
              onClick={checkAuth}
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={loading}
            >
              {loading ? "Checking..." : "Check Auth Status"}
            </Button>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Test Actions:</h3>
            <div className="space-x-2">
              <Button onClick={testLogin} variant="outline" size="sm">
                Test Login Flow
              </Button>
              <Button
                onClick={() => (window.location.href = "/login")}
                variant="outline"
                size="sm"
              >
                Go to Login
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
                size="sm"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Environment Info:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(
                {
                  userAgent: navigator.userAgent,
                  location: window.location.href,
                  protocol: window.location.protocol,
                  host: window.location.host,
                },
                null,
                2
              )}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
