/**
 * AuthGate — Firebase-backed authentication gate
 * Contract: AURA.CONTRACT.AUTH.FIREBASE_HARDENING_V1.001_REVISED
 *
 * Replaces manual cookie-check auth wall. Wraps protected routes.
 * If loading → spinner. If !user → sign-in prompt. If user → children.
 */

import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";

interface AuthGateProps {
  children: React.ReactNode;
  /** Optional fallback shown when not authenticated. Defaults to a sign-in button. */
  fallback?: React.ReactNode;
}

export function AuthGate({ children, fallback }: AuthGateProps) {
  const { user, loading, signIn } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signIn();
    } catch (err: any) {
      setError(err?.message || "Sign-in failed. Please try again.");
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-[#030303]">
        <div className="animate-pulse text-sm text-white/50 font-medium tracking-wide">
          Initializing…
        </div>
      </div>
    );
  }

  if (!user) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex items-center justify-center h-[100dvh] bg-[#030303]">
        <div className="flex flex-col items-center gap-8 text-center px-8 py-12 max-w-[420px] w-full bg-white/[0.02] border border-white/[0.04] shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-[40px] rounded-[32px]">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full border-[7px] border-white box-border shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
            <span className="text-[28px] font-bold tracking-[-0.04em] text-white ml-2">
              AURA
            </span>
          </div>

          <p className="text-[15px] font-light text-white/50 leading-relaxed px-4">
            Sign in with your Google account to access your workspace, connected
            apps, and AI assistant.
          </p>

          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full h-14 px-8 bg-white text-black rounded-full text-[13px] font-bold uppercase tracking-[0.1em] hover:bg-[#F5F5F7] transition-all duration-300 flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-[0.98] mt-2"
          >
            {signingIn ? (
              <span className="animate-pulse">Signing in…</span>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="currentColor"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

          <button
            onClick={() => {
              window.history.pushState({}, "", "/");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            className="text-xs text-white/50 hover:text-white transition-colors font-medium"
          >
            ← Back to home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
