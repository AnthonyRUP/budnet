import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trpc } from "@budnet/api";
import { authClient } from "../lib/auth-client";

export function InviteView() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const { data: invite, isLoading } = trpc.invite.get.useQuery(
    { token: token! },
    { enabled: !!token },
  );

  const accept = trpc.invite.accept.useMutation({
    onSuccess: () => navigate("/app", { replace: true }),
  });

  // Auto-accept once authenticated if they came from the email link
  useEffect(() => {
    if (session && invite?.valid && !accept.isPending && !accept.isSuccess) {
      const autoAccept = sessionStorage.getItem("invite_auto_accept");
      if (autoAccept === token) {
        sessionStorage.removeItem("invite_auto_accept");
        accept.mutate({ token: token! });
      }
    }
  }, [session, invite]);

  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSendingEmail(true);
    setEmailError("");
    // Remember to auto-accept after login
    sessionStorage.setItem("invite_auto_accept", token!);
    const result = await authClient.signIn.magicLink({
      email,
      callbackURL: `${window.location.origin}/invite/${token}`,
    });
    if (result.error) {
      setEmailError(result.error.message ?? "Something went wrong");
      setSendingEmail(false);
    } else {
      setEmailSent(true);
    }
  }

  if (isLoading || sessionPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!invite || !invite.workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border text-center max-w-sm w-full mx-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid invite</h2>
          <p className="text-sm text-gray-500">This invite link is invalid or has been revoked.</p>
        </div>
      </div>
    );
  }

  if (invite.isExpired || invite.isExhausted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border text-center max-w-sm w-full mx-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invite expired</h2>
          <p className="text-sm text-gray-500">
            {invite.isExpired ? "This invite link has expired." : "This invite link has reached its use limit."}
            {" "}Ask the workspace admin for a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-sm mx-4">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-brand-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold">
              {invite.workspace.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{invite.workspace.name}</h1>
          {invite.creatorName && (
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-medium">{invite.creatorName}</span> invited you to join
            </p>
          )}
        </div>

        {session ? (
          <div className="space-y-3">
            {accept.error && (
              <p className="text-sm text-red-500 text-center">{accept.error.message}</p>
            )}
            <button
              onClick={() => accept.mutate({ token: token! })}
              disabled={accept.isPending}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {accept.isPending ? "Joining…" : `Join ${invite.workspace.name}`}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Signed in as <span className="font-medium">{session.user.email}</span>
            </p>
          </div>
        ) : emailSent ? (
          <div className="text-center space-y-3">
            <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">
              We sent a magic link to <span className="font-medium">{email}</span>. Click it to join the workspace.
            </p>
            <button onClick={() => setEmailSent(false)} className="text-sm text-brand-500 hover:underline">
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendMagicLink} className="space-y-3">
            <p className="text-sm text-gray-600 text-center">Enter your email to join</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
              disabled={sendingEmail}
            />
            {emailError && <p className="text-sm text-red-500">{emailError}</p>}
            <button
              type="submit"
              disabled={sendingEmail}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {sendingEmail ? "Sending…" : "Continue with magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
