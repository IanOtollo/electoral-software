"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setSessionToken } from "../../lib/session";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginWithEmail = useMutation(api.auth_functions.loginWithEmail);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await loginWithEmail({ email, password });
      setSessionToken(result.token);

      if (result.user.role === "platform_super_admin") {
        router.push("/admin");
      } else if (result.user.role === "polling_agent") {
        router.push("/agent");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-heading text-3xl font-semibold text-accent">
            Electoral Software
          </Link>
          <p className="mt-2 text-sm text-(--muted)">Sign in to your account</p>
        </div>

        <div className="bg-panel border border-(--panel-border) rounded-xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 text-red-300 text-sm rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-2.5 border border-(--panel-border) rounded-md bg-background focus:ring-1 focus:ring-accent outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="w-full px-4 py-2.5 border border-(--panel-border) rounded-md bg-background focus:ring-1 focus:ring-accent outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-accent text-accent-foreground font-semibold rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isLoading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-(--muted) mt-6">
          <Link href="/" className="hover:text-accent transition-colors">
            &larr; Back to homepage
          </Link>
        </p>
      </div>
    </div>
  );
}
