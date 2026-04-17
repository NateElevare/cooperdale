import { http } from "./http";

export const FollowupsApi = {
  list: () => http("/api/followups"),
  create: (data) => http("/api/followups", { method: "POST", body: JSON.stringify(data) }),
  remove: (id) => http(`/api/followups/${id}`, { method: "DELETE" }),
};
