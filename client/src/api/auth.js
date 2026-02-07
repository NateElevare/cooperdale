import { http } from "./http";

export const AuthApi = {
  login: (username, password) =>
    http("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => http("/api/auth/me"),
};
