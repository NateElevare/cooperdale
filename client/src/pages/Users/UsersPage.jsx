import { useEffect, useState } from "react";
import { UsersApi } from "../../api/users";

const ROLES = ["editor", "admin"];

const RESOURCES = [
  { key: "members", label: "Attendees" },
  { key: "events", label: "Events" },
  { key: "attendance", label: "Attendance" },
  { key: "followup", label: "Follow Up" },
  { key: "messages", label: "Messages" },
  { key: "reports", label: "Reports" },
];

const DEFAULT_PERMISSIONS = Object.fromEntries(
  RESOURCES.map((r) => [r.key, { read: true, write: true }])
);

function ResetPasswordModal({ displayName, onSave, onCancel }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState("");

  async function handleSave() {
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setLocalError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await onSave(password);
    } catch (e) {
      setLocalError(e.message || "Failed to reset password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-lg bg-zinc-900 p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Reset Password — {displayName}</h3>

        {localError && (
          <div className="rounded border border-red-700/50 bg-red-950/30 px-3 py-2 text-sm text-red-200 mb-3">
            {localError}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLocalError(""); }}
              className="w-full px-3 py-2 rounded border border-zinc-700 bg-zinc-800 text-zinc-100"
              placeholder="Min. 8 characters"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setLocalError(""); }}
              className="w-full px-3 py-2 rounded border border-zinc-700 bg-zinc-800 text-zinc-100"
              placeholder="Repeat password"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={saving || !password || !confirm}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Reset Password"}
          </button>
          <button
            onClick={onCancel}
            className="rounded border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function PermissionsEditor({ userId, displayName, initial, onSave, onCancel }) {
  const [perms, setPerms] = useState(() => {
    if (!initial) return DEFAULT_PERMISSIONS;
    // merge with defaults so all keys are present
    return Object.fromEntries(
      RESOURCES.map((r) => [r.key, { read: true, write: true, ...(initial[r.key] || {}) }])
    );
  });
  const [saving, setSaving] = useState(false);

  function toggle(resource, action) {
    setPerms((prev) => {
      const next = { ...prev, [resource]: { ...prev[resource], [action]: !prev[resource][action] } };
      // read is required for write — if disabling read, also disable write
      if (action === "read" && !next[resource].read) {
        next[resource].write = false;
      }
      // if enabling write, also enable read
      if (action === "write" && next[resource].write) {
        next[resource].read = true;
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(perms);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-lg bg-zinc-900 p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-zinc-100 mb-1">Permissions — {displayName}</h3>
        <p className="text-xs text-zinc-400 mb-4">Ignored for admin users.</p>
        <table className="text-sm w-full">
          <thead>
            <tr>
              <th className="text-left py-1 pr-4 text-zinc-400 font-normal">Tab</th>
              <th className="text-center py-1 px-3 text-zinc-400 font-normal">Read</th>
              <th className="text-center py-1 px-3 text-zinc-400 font-normal">Write</th>
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map((r) => (
              <tr key={r.key} className="border-t border-zinc-800">
                <td className="py-1.5 pr-4 text-zinc-200">{r.label}</td>
                <td className="py-1.5 px-3 text-center">
                  <input
                    type="checkbox"
                    checked={!!perms[r.key]?.read}
                    onChange={() => toggle(r.key, "read")}
                    className="accent-blue-500"
                  />
                </td>
                <td className="py-1.5 px-3 text-center">
                  <input
                    type="checkbox"
                    checked={!!perms[r.key]?.write}
                    onChange={() => toggle(r.key, "write")}
                    disabled={!perms[r.key]?.read}
                    className="accent-blue-500 disabled:opacity-40"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onCancel}
            className="rounded border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedPermissions, setExpandedPermissions] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: "",
    displayName: "",
    password: "",
    role: "editor",
    isActive: true,
  });

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");
      const rows = await UsersApi.list();
      setUsers(rows);
    } catch (e) {
      setError(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const createUser = async (e) => {
    e.preventDefault();
    try {
      setError("");
      await UsersApi.create(newUser);
      setNewUser({
        username: "",
        displayName: "",
        password: "",
        role: "editor",
        isActive: true,
      });
      await loadUsers();
    } catch (e2) {
      setError(e2.message || "Failed to create user");
    }
  };

  const updateUser = async (id, updates) => {
    try {
      setError("");
      await UsersApi.update(id, updates);
      await loadUsers();
    } catch (e) {
      setError(e.message || "Failed to update user");
    }
  };

  const savePermissions = async (userId, perms) => {
    await updateUser(userId, { permissions: perms });
    setExpandedPermissions(null);
  };

  const resetPassword = async (id, password) => {
    await UsersApi.resetPassword(id, password);
    setResetPasswordUser(null);
  };

  if (loading) {
    return <div className="text-sm text-zinc-400">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">User Management</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Create users, set roles, and control account access.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-700/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <form onSubmit={createUser} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <h3 className="font-semibold">Add User</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="Username"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            required
          />
          <input
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="Display name"
            value={newUser.displayName}
            onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
            required
          />
          <input
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            type="password"
            placeholder="Temporary password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            required
          />
          <select
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white">
          Create User
        </button>
      </form>

      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-zinc-100">{u.displayName}</div>
                <div className="text-xs text-zinc-400">{u.username}</div>
              </div>

              <select
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
                value={u.role}
                onChange={(e) => updateUser(u.id, { role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <span className={`text-xs px-2 py-0.5 rounded-full border ${u.isActive ? "border-green-700 text-green-400" : "border-zinc-700 text-zinc-500"}`}>
                {u.isActive ? "Active" : "Inactive"}
              </span>

              <div className="flex gap-2">
                <button
                  className="rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800"
                  onClick={() => setExpandedPermissions(u.id)}
                >
                  Permissions
                </button>
                <button
                  className="rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800"
                  onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                  disabled={u.id === currentUser.id && u.isActive}
                  title={u.id === currentUser.id && u.isActive ? "You cannot deactivate yourself" : ""}
                >
                  {u.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  className="rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800"
                  onClick={() => setResetPasswordUser(u)}
                >
                  Reset PW
                </button>
              </div>
            </div>

            {u.lastLoginAt && (
              <div className="text-xs text-zinc-500 mt-1">
                Last login: {new Date(u.lastLoginAt).toLocaleString()}
              </div>
            )}

          </div>
        ))}
      </div>

      {resetPasswordUser && (
        <ResetPasswordModal
          displayName={resetPasswordUser.displayName}
          onSave={(pw) => resetPassword(resetPasswordUser.id, pw)}
          onCancel={() => setResetPasswordUser(null)}
        />
      )}

      {expandedPermissions !== null && (() => {
        const u = users.find((x) => x.id === expandedPermissions);
        if (!u) return null;
        return (
          <PermissionsEditor
            key={u.id}
            userId={u.id}
            displayName={u.displayName}
            initial={u.permissions}
            onSave={(perms) => savePermissions(u.id, perms)}
            onCancel={() => setExpandedPermissions(null)}
          />
        );
      })()}
    </div>
  );
}
