import React, { useState } from "react";
import { authClient } from "../lib/auth-client";

type State = "idle" | "loading" | "sent" | "error";

export function LoginView() {
  const [email, setEmail] = useState("");
  const [uiState, setUiState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUiState("loading");
    setError("");

    const result = await authClient.signIn.magicLink({
      email,
      callbackURL: `${window.location.origin}/app`,
    });

    if (result.error) {
      setError(result.error.message ?? "Something went wrong");
      setUiState("error");
    } else {
      setUiState("sent");
    }
  }

  if (uiState === "sent") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-sm text-center">
          <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm mb-4">
            We sent a magic link to <strong>{email}</strong>. Click it to sign in.
          </p>
          <button
            onClick={() => setUiState("idle")}
            className="text-sm text-brand-500 hover:underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in to budnet</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a magic link.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              placeholder="you@example.com"
              required
              disabled={uiState === "loading"}
            />
          </div>
          {uiState === "error" && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={uiState === "loading"}
            className="w-full px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {uiState === "loading" ? "Sending…" : "Send magic link"}
          </button>
        </form>
      </div>
    </div>
  );
}
