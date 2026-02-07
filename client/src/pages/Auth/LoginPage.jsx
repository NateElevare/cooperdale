import { useState } from "react";

export default function LoginPage({ onLogin, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onLogin(username, password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-400">Church Attendance Tracker</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
              autoComplete="current-password"
              required
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-700/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            disabled={submitting}
            className="w-full rounded-lg bg-zinc-100 px-4 py-2 font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
