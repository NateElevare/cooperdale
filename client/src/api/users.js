import { http } from "./http";

export const UsersApi = {
  list: () => http("/api/users"),
  create: (data) => http("/api/users", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => http(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  resetPassword: (id, password) =>
    http(`/api/users/${id}/password`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    }),
};
