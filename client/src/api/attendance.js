import { http } from "./http";

export const AttendanceApi = {
  list: () => http("/api/attendance"),
  create: (data) => http("/api/attendance", { method: "POST", body: JSON.stringify(data) }),
  remove: (id) => http(`/api/attendance/${id}`, { method: "DELETE" }),
};
