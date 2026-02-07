import { http } from "./http";

export const MembersApi = {
  list: () => http("/api/members"),
  create: (data) => http("/api/members", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => http(`/api/members/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id) => http(`/api/members/${id}`, { method: "DELETE" }),
  listRelationships: (id) => http(`/api/members/${id}/relationships`),
  addRelationship: (id, data) =>
    http(`/api/members/${id}/relationships`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removeRelationship: (id, relationshipId) =>
    http(`/api/members/${id}/relationships/${relationshipId}`, { method: "DELETE" }),
};
