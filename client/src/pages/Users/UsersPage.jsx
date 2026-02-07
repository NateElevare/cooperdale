import { useEffect, useState } from "react";
import { UsersApi } from "../../api/users";

const ROLES = ["editor", "admin"];

export default function UsersPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const resetPassword = async (id) => {
    const password = window.prompt("Enter a new password (minimum 8 characters):");
    if (!password) return;
    try {
      setError("");
      await UsersApi.resetPassword(id, password);
      alert("Password reset successfully.");
    } catch (e) {
      setError(e.message || "Failed to reset password");
    }
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

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-3 py-2 text-left">Username</th>
              <th className="px-3 py-2 text-left">Display Name</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Last Login</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-zinc-800">
                <td className="px-3 py-2">{u.username}</td>
                <td className="px-3 py-2">{u.displayName}</td>
                <td className="px-3 py-2">
                  <select
                    className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
                    value={u.role}
                    onChange={(e) => updateUser(u.id, { role: e.target.value })}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">{u.isActive ? "Active" : "Inactive"}</td>
                <td className="px-3 py-2">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}
                </td>
                <td className="px-3 py-2 space-x-2">
                  <button
                    className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
                    onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                    disabled={u.id === currentUser.id && u.isActive}
                    title={
                      u.id === currentUser.id && u.isActive
                        ? "You cannot deactivate yourself"
                        : ""
                    }
                  >
                    {u.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
                    onClick={() => resetPassword(u.id)}
                  >
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
