import { useCallback, useEffect, useMemo, useState } from "react";
import { MessagesApi } from "../../api/messages";

function formatTimestamp(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

export default function MessagesPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      setError("");
      const rows = await MessagesApi.listUsers();
      setUsers(rows);
      if (!selectedUserId && rows.length > 0) {
        setSelectedUserId(rows[0].id);
      }
      if (selectedUserId && !rows.some((u) => u.id === selectedUserId)) {
        setSelectedUserId(rows.length > 0 ? rows[0].id : null);
      }
    } catch (e) {
      setError(e.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedUserId]);

  const loadThread = useCallback(async (options = {}) => {
    const { showLoading = false } = options;
    if (!selectedUserId) {
      setThread([]);
      return;
    }
    try {
      if (showLoading) {
        setLoadingThread(true);
      }
      setError("");
      const rows = await MessagesApi.getThread(selectedUserId, 150);
      setThread(rows);
    } catch (e) {
      setError(e.message || "Failed to load messages");
    } finally {
      if (showLoading) {
        setLoadingThread(false);
      }
    }
  }, [selectedUserId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadThread({ showLoading: true });
  }, [loadThread]);

  useEffect(() => {
    if (!selectedUserId) return undefined;
    const timer = window.setInterval(() => {
      loadThread();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selectedUserId, loadThread]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!selectedUserId || !body) return;

    try {
      setSending(true);
      setError("");
      const created = await MessagesApi.send(selectedUserId, body);
      setThread((prev) => [...prev, created]);
      setDraft("");
    } catch (err) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Messages</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Send direct messages to other users in this app.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-700/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Users</h3>
            <button
              type="button"
              className="rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800"
              onClick={loadUsers}
            >
              Refresh
            </button>
          </div>

          {loadingUsers ? (
            <p className="text-sm text-zinc-400">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-zinc-400">No active users available.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const isActive = u.id === selectedUserId;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={[
                      "w-full rounded-lg border px-3 py-2 text-left transition",
                      isActive
                        ? "border-zinc-200 bg-zinc-100 text-zinc-900"
                        : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    <div className="font-medium">{u.displayName}</div>
                    <div className={isActive ? "text-xs text-zinc-700" : "text-xs text-zinc-400"}>
                      @{u.username}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="border-b border-zinc-800 px-4 py-3">
            <h3 className="font-semibold">
              {selectedUser ? `Conversation with ${selectedUser.displayName}` : "Select a user"}
            </h3>
          </div>

          <div className="h-[420px] overflow-y-auto px-4 py-4">
            {!selectedUser ? (
              <p className="text-sm text-zinc-400">Choose a user to start messaging.</p>
            ) : loadingThread ? (
              <p className="text-sm text-zinc-400">Loading messages...</p>
            ) : thread.length === 0 ? (
              <p className="text-sm text-zinc-400">No messages yet.</p>
            ) : (
              <div className="space-y-3">
                {thread.map((message) => {
                  const mine = message.senderUserId === currentUser.id;
                  return (
                    <div key={message.id} className={mine ? "text-right" : "text-left"}>
                      <div
                        className={[
                          "inline-block max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                          mine ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-100",
                        ].join(" ")}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {formatTimestamp(message.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="border-t border-zinc-800 p-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[44px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                placeholder={selectedUser ? "Type your message..." : "Select a user first"}
                maxLength={2000}
                disabled={!selectedUser || sending}
              />
              <button
                type="submit"
                disabled={!selectedUser || sending || !draft.trim()}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
